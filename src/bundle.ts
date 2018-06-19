import { isValidFormat, getFilenameSuffix } from './format';
import { convertOnWorker } from './convertworker';

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const fileReader = new FileReader();
  const promise = new Promise<Uint8Array>((resolve, reject) => {
    fileReader.addEventListener('load', () => {
      resolve(new Uint8Array(fileReader.result));
    });
    fileReader.addEventListener('error', e => reject(e));
  });
  fileReader.readAsArrayBuffer(file);
  return promise;
}

function createDownloadLink(data: Uint8Array): HTMLAnchorElement {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  return link;
}

function getBasename(filename: string): string {
  const suffixPos = filename.lastIndexOf('.');
  if (suffixPos === -1) return filename;
  return filename.substr(0, suffixPos);
}

const BYTE_SUFFIXES = [' B', ' kB', ' MB'];
const BYTE_MARGIN = 1024;

function formatFilesize(amount: number): string {
  let index = 0;
  while (amount > 1000 + BYTE_MARGIN && index < BYTE_SUFFIXES.length) {
    amount /= 1000;
    index += 1;
  }
  const suffix = BYTE_SUFFIXES[index];
  if (amount > 100) {
    return amount.toFixed(0) + suffix;
  } else {
    return amount.toFixed(1) + suffix;
  }
}

function formatProcessTime(t: number): string {
  if (t < 1000) {
    return t.toFixed(0) + 'ms';
  }
  const sec = t / 1000;
  return sec.toFixed(1) + 's';
}

function formatConversionRatio(before: number, after: number): string {
  const ratio = (after / before) * 100;
  return ratio.toFixed(1) + '%';
}

document.addEventListener('DOMContentLoaded', async () => {
  const inputFile = document.querySelector('#input-file');
  if (!(inputFile instanceof HTMLInputElement)) {
    throw new Error('No input-file element');
  }
  const selectFileButton = document.querySelector('#select-file-button');
  if (!selectFileButton) {
    throw new Error('No select-file-button element');
  }
  const convertResultEl = document.querySelector('#convert-result-container');
  if (!convertResultEl) {
    throw new Error('No convert result container');
  }
  const selectedFontInfo = document.querySelector('#selected-font-info');
  if (!selectedFontInfo) {
    throw new Error('No selected font info element');
  }

  selectFileButton.addEventListener('click', () => {
    inputFile.click();
  });

  const convertButton = document.querySelector('#convert-button');
  if (!(convertButton instanceof HTMLButtonElement)) {
    throw new Error('No convert button element');
  }
  convertButton.addEventListener('click', () => {
    if (selectedFile !== null) {
      convertFile(selectedFile);
    }
  });
  convertButton.disabled = true;

  let selectedFile: File | null = null;
  const fileSelected = (file: File) => {
    const fileSize = formatFilesize(file.size);
    selectedFontInfo.innerHTML = `${file.name} (${fileSize})`;
    selectedFile = file;
    convertButton.disabled = false;
  };

  const spinner = document.querySelector('#spinner');
  if (!spinner) {
    throw new Error('No spinner element');
  }

  const errorMessageEl = document.querySelector('#error-message-container');
  if (!errorMessageEl) {
    throw new Error('No error message container');
  }

  const convertFile = async (file: File) => {
    convertButton.disabled = true;
    errorMessageEl.classList.add('error-message-off');
    try {
      const output = await convertFileInternal(file);
      return output;
    } catch (exception) {
      errorMessageEl.classList.remove('error-message-off');
      errorMessageEl.innerHTML = exception.message;
      spinner.classList.add('spinner-off');
      convertResultEl.innerHTML = '';
    } finally {
      convertButton.disabled = false;
    }
  };

  const convertFileInternal = async (file: File) => {
    const data = await fileToUint8Array(file);
    const originalByteLength = data.byteLength;

    const outputFormatEl = document.querySelector('input[name=output-format]:checked');
    if (!(outputFormatEl instanceof HTMLInputElement)) {
      throw new Error('No output format element');
    }

    const format = outputFormatEl.value;
    if (!isValidFormat(format)) {
      throw new Error(`Invalid font format: ${format}`);
    }

    convertResultEl.innerHTML = '';
    spinner.classList.remove('spinner-off');

    const result = await convertOnWorker(data, format);
    const output = result.output;

    const originalFileSize = formatFilesize(originalByteLength);
    const convertedFileSize = formatFilesize(output.byteLength);
    const processTime = formatProcessTime(result.processTime);
    const ratio = formatConversionRatio(originalByteLength, output.byteLength);

    const summaryEl = document.createElement('div');
    summaryEl.innerHTML = `
    <div>Size comparison: ${originalFileSize} → ${convertedFileSize} (${ratio})</div>
    <div>Process time: ${processTime}</div>
    `;
    convertResultEl.appendChild(summaryEl);

    const link = createDownloadLink(output);
    const basename = getBasename(file.name);

    const suffix = getFilenameSuffix(output);
    link.download = `${basename}.${suffix}`;
    link.innerHTML = `Download ${basename}.${suffix}`;

    convertResultEl.appendChild(link);
    spinner.classList.add('spinner-off');
  };

  const inputSelectZone = document.querySelector('#input-select-zone');
  if (!inputSelectZone) {
    throw new Error('No input-select-zone element');
  }
  inputSelectZone.addEventListener('drop', e => {
    if (!(e instanceof DragEvent)) return;
    e.preventDefault();
    if (!e.dataTransfer.files || e.dataTransfer.files.length !== 1) return;
    const file = e.dataTransfer.files[0];
    fileSelected(file);
  });

  inputSelectZone.addEventListener('dragover', e => {
    e.preventDefault();
  });

  inputFile.addEventListener('change', e => {
    const el = inputFile as HTMLInputElement;
    if (el.files === null || el.files.length !== 1) return;
    const file = el.files[0];
    fileSelected(file);
  });
});

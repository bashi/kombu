import { isValidFormat, getFilenameSuffix } from './format';
import { convertOnWorker } from './convertworker';

async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const fileReader = new FileReader();
  const promise = new Promise<Uint8Array>((resolve, reject) => {
    fileReader.addEventListener('load', () => {
      const result = fileReader.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        throw new Error('readAsArrayBuffer() returns non ArrayBuffer result');
      }
    });
    fileReader.addEventListener('error', (e) => reject(e));
  });
  fileReader.readAsArrayBuffer(file);
  return promise;
}

function createDownloadLink(basename: string, data: Uint8Array): HTMLAnchorElement {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const suffix = getFilenameSuffix(data);
  link.download = `${basename}.${suffix}`;
  link.innerHTML = `Download ${basename}.${suffix}`;
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
  const el = document.createElement('span');
  const ratio = (after / before) * 100;
  el.innerText = ratio.toFixed(1);
  if (ratio < 100) {
    el.style.color = 'green';
    el.style.fontWeight = 'bold';
  } else if (ratio > 100) {
    el.style.color = 'red';
    el.style.fontWeight = 'bold';
  }
  return el.outerHTML;
}

// TODO: Avoid a god object.
class App {
  inputFileEl: HTMLInputElement;
  selectFileButton: HTMLButtonElement;
  convertResultEl: Element;
  selectedFontInfoEl: Element;
  convertButton: HTMLButtonElement;
  spinnerEl: Element;
  errorMessageEl: Element;

  selectedFile: File | undefined;

  constructor() {
    const inputFileEl = document.querySelector('#input-file');
    if (!(inputFileEl instanceof HTMLInputElement)) {
      throw new Error('No input-file element');
    }
    const selectFileButton = document.querySelector('#select-file-button');
    if (!(selectFileButton instanceof HTMLButtonElement)) {
      throw new Error('No select-file-button element');
    }
    const convertResultEl = document.querySelector('#convert-result-container');
    if (!convertResultEl) {
      throw new Error('No convert result container');
    }
    const selectedFontInfoEl = document.querySelector('#selected-font-info');
    if (!selectedFontInfoEl) {
      throw new Error('No selected font info element');
    }
    const convertButton = document.querySelector('#convert-button');
    if (!(convertButton instanceof HTMLButtonElement)) {
      throw new Error('No convert button element');
    }
    const spinnerEl = document.querySelector('#spinner');
    if (!spinnerEl) {
      throw new Error('No spinner element');
    }
    const errorMessageEl = document.querySelector('#error-message-container');
    if (!errorMessageEl) {
      throw new Error('No error message container');
    }

    this.inputFileEl = inputFileEl;
    this.selectFileButton = selectFileButton;
    this.convertResultEl = convertResultEl;
    this.selectedFontInfoEl = selectedFontInfoEl;
    this.convertButton = convertButton;
    this.spinnerEl = spinnerEl;
    this.errorMessageEl = errorMessageEl;

    this.convertButton.disabled = true;

    this.selectedFile = undefined;

    this.selectFileButton.addEventListener('click', async () => {
      const file = await this.chooseFile();
      this.onFileSelected(file);
    });

    this.convertButton.addEventListener('click', () => {
      this.convertSelectedFile();
    });
  }

  private async chooseFile(): Promise<File> {
    return new Promise((resolve, reject) => {
      const listener = () => {
        this.inputFileEl.removeEventListener('change', listener);
        if (this.inputFileEl.files === null) {
          reject('No file specified');
          return;
        }
        if (this.inputFileEl.files.length !== 1) {
          reject('Multiple input files not supported');
          return;
        }
        resolve(this.inputFileEl.files[0]);
      };
      this.inputFileEl.addEventListener('change', listener);
      this.inputFileEl.click();
    });
  }

  private onFileSelected(file: File) {
    const fileSize = formatFilesize(file.size);
    this.selectedFontInfoEl.innerHTML = `${file.name} (${fileSize})`;
    this.selectedFile = file;
    this.convertButton.disabled = false;
  }

  private async convertSelectedFile() {
    this.convertButton.disabled = true;
    this.errorMessageEl.classList.add('error-message-off');
    try {
      await this.convertFileInternal();
    } catch (exception) {
      console.error(exception);
      this.errorMessageEl.classList.remove('error-message-off');
      this.errorMessageEl.innerHTML = exception.message;
      this.spinnerEl.classList.add('spinner-off');
      this.convertResultEl.innerHTML = '';
    } finally {
      this.convertButton.disabled = false;
    }
  }

  private async convertFileInternal() {
    if (this.selectedFile === undefined) return;

    const data = await fileToUint8Array(this.selectedFile);
    const originalByteLength = data.byteLength;

    const outputFormatEl = document.querySelector('input[name=output-format]:checked');
    if (!(outputFormatEl instanceof HTMLInputElement)) {
      throw new Error('No output format element');
    }

    const format = outputFormatEl.value;
    if (!isValidFormat(format)) {
      throw new Error(`Invalid font format: ${format}`);
    }

    this.convertResultEl.innerHTML = '';
    this.spinnerEl.classList.remove('spinner-off');

    const result = await convertOnWorker(data, format);
    const output = result.output;

    const originalFileSize = formatFilesize(originalByteLength);
    const convertedFileSize = formatFilesize(output.byteLength);
    const processTime = formatProcessTime(result.processTime);
    const ratio = formatConversionRatio(originalByteLength, output.byteLength);

    const summaryEl = document.createElement('div');
    summaryEl.classList.add('convert-summary');

    summaryEl.innerHTML = `
    <div>Size comparison: ${originalFileSize} → ${convertedFileSize} (${ratio}%)</div>
    <div>Process time: ${processTime}</div>
    `;
    this.convertResultEl.appendChild(summaryEl);

    const basename = getBasename(this.selectedFile.name);
    const link = createDownloadLink(basename, output);
    this.convertResultEl.appendChild(link);

    this.spinnerEl.classList.add('spinner-off');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

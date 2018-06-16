import { Format, isValidFormat, getFilenameSuffix } from './format';

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

const WORKER_INIT_TIMEOUT_MS = 5000;

function createConvertWorker(): Promise<ConvertWorker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('worker.js');
    const timeout = setTimeout(() => reject(new Error('Worker time out')), WORKER_INIT_TIMEOUT_MS);
    worker.postMessage('init');
    const listener = (e: MessageEvent) => {
      if (e.data === 'initialized') {
        clearTimeout(timeout);
        worker.removeEventListener('message', listener);
        resolve(new ConvertWorker(worker));
      } else if (e.data.name === 'error') {
        reject(new Error(e.data.message));
      }
    };
    worker.addEventListener('message', listener);
  });
}

interface Pending {
  resolve: (res: any) => void;
  reject: (res: any) => void;
}

class ConvertWorker {
  private worker: Worker;
  private messageId: number;
  private pendings: Map<number, Pending>;
  private timeouts: Map<number, number>;

  constructor(worker: Worker) {
    this.worker = worker;
    this.messageId = 0;
    this.pendings = new Map();
    this.timeouts = new Map();

    this.worker.addEventListener('message', e => {
      const messageId = e.data.messageId;
      if (typeof messageId !== 'number') {
        console.warn(`Received invalid message from worker: ${e}`);
        return;
      }
      const timeout = this.timeouts.get(messageId);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(messageId);
      }

      const pending = this.pendings.get(messageId);
      if (pending) {
        if (e.data.error) {
          pending.reject(new Error(e.data.error));
        } else {
          pending.resolve(e.data.response);
        }
        this.pendings.delete(messageId);
        return;
      }

      if (e.data.error) {
        this.terminate();
        throw new Error(e.data.error);
      }
    });
  }

  // TODO: Define the return type
  async convert(data: Uint8Array, format: Format, timeout?: number): Promise<any> {
    const promise = new Promise<Uint8Array>((resolve, reject) => {
      this.worker.postMessage(
        {
          messageId: this.messageId,
          action: 'convert',
          input: data,
          format: format
        },
        [data.buffer]
      );
      this.pendings.set(this.messageId, { resolve: resolve, reject: reject });
      if (timeout) {
        this.timeouts.set(
          this.messageId,
          setTimeout(() => {
            this.pendings.delete(this.messageId);
            reject(new Error('Convert time out'));
          }, timeout)
        );
      }
      this.messageId += 1;
    });

    return promise;
  }

  terminate() {
    this.worker.terminate();
  }
}

interface ConvertResult {
  output: Uint8Array;
  processTime: number;
}

// |data| will be transferred to worker.
async function convert(data: Uint8Array, format: Format): Promise<ConvertResult> {
  const t0 = performance.now();
  const worker = await createConvertWorker();
  const res = await worker.convert(data, format);
  worker.terminate();
  const t1 = performance.now();
  return {
    output: res.output,
    processTime: t1 - t0
  };
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

  selectFileButton.addEventListener('click', () => {
    inputFile.click();
  });

  const spinner = document.querySelector('#spinner');
  if (!spinner) {
    throw new Error('No spinner element');
  }

  const errorMessageEl = document.querySelector('#error-message-container');
  if (!errorMessageEl) {
    throw new Error('No error message container');
  }

  const convertFile = async (file: File) => {
    errorMessageEl.classList.add('error-message-off');
    try {
      const output = await convertFileInternal(file);
      return output;
    } catch (exception) {
      errorMessageEl.classList.remove('error-message-off');
      errorMessageEl.innerHTML = exception.message;
      spinner.classList.add('spinner-off');
      convertResultEl.innerHTML = '';
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

    const result = await convert(data, format);
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
    convertFile(file);
  });

  inputSelectZone.addEventListener('dragover', e => {
    e.preventDefault();
  });

  inputFile.addEventListener('change', e => {
    const el = inputFile as HTMLInputElement;
    if (el.files === null || el.files.length !== 1) return;
    const file = el.files[0];
    convertFile(file);
  });
});

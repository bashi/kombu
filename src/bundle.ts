import { Format, isValidFormat, getFilenameSuffix } from './format';

async function onFileSelected(file: File): Promise<Uint8Array> {
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
      if (e.data.name === 'initialized') {
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

class ConvertWorker {
  private worker: Worker;
  private messageId: number;
  private pendings: Map<number, (res: any) => void>;
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

      const resolve = this.pendings.get(messageId);
      if (resolve) {
        resolve(e.data);
        this.pendings.delete(messageId);
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
      this.pendings.set(this.messageId, resolve);
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

async function convert(data: Uint8Array, format: Format): Promise<Uint8Array> {
  const worker = await createConvertWorker();
  const res = await worker.convert(data, format);
  worker.terminate();
  return res.output as Uint8Array;
}

document.addEventListener('DOMContentLoaded', async () => {
  const inputFile = document.querySelector('#input-file');
  if (!inputFile) {
    throw new Error('No input-file element');
  }
  inputFile.addEventListener('change', async e => {
    const el = inputFile as HTMLInputElement;
    if (el.files === null || el.files.length !== 1) return;
    const file = el.files[0];
    const data = await onFileSelected(file);

    const outputFormatEl = document.querySelector('input[name=output-format]:checked');
    if (!(outputFormatEl instanceof HTMLInputElement)) {
      throw new Error('No output format element');
    }

    const format = outputFormatEl.value;
    if (!isValidFormat(format)) {
      throw new Error(`Invalid font format: ${format}`);
    }

    const output = await convert(data, format);
    const link = createDownloadLink(output);
    const basename = getBasename(file.name);

    const suffix = getFilenameSuffix(output);
    link.download = `${basename}.${suffix}`;
    link.innerHTML = `Download ${basename}.${suffix}`;

    const downloadEl = document.querySelector('#download-container');
    if (!downloadEl) {
      throw new Error('No download container');
    }
    downloadEl.innerHTML = '';
    downloadEl.appendChild(link);
  });
});

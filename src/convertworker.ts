import { Format } from './format';

interface Pending {
  resolve: (res: Uint8Array) => void;
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
          // TODO: Make sure response has |output|.
          pending.resolve(e.data.response.output);
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

  async convert(data: Uint8Array, format: Format, timeout?: number): Promise<Uint8Array> {
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

const WORKER_INIT_TIMEOUT_MS = 15000;

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

export interface ConvertResult {
  output: Uint8Array;
  processTime: number;
}

let defaultWorker: ConvertWorker | null = null;
async function getDefaultWorker(): Promise<ConvertWorker> {
  if (defaultWorker) return defaultWorker;
  defaultWorker = await createConvertWorker();
  return defaultWorker;
}

/**
 * Convert a font on a worker.
 * @param data font data. This will be transferred to worker.
 * @param format output format.
 */
export async function convertOnWorker(data: Uint8Array, format: Format): Promise<ConvertResult> {
  const t0 = performance.now();
  const worker = await getDefaultWorker();
  const output = await worker.convert(data, format);
  const t1 = performance.now();
  return {
    output: output,
    processTime: t1 - t0
  };
}

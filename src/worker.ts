import { Format, isValidFormat } from './format';
import { Converter } from './convert';
import { Woff2, createWoff2 } from './woff2';

async function loadWoff2Wasm(): Promise<Woff2> {
  return fetch('ffi.wasm')
    .then(response => response.arrayBuffer())
    .then(buffer => {
      const wasmBinary = new Uint8Array(buffer);
      return createWoff2(wasmBinary);
    });
}

function convert(converter: Converter, data: Uint8Array, format: Format): Uint8Array {
  if (format === Format.OTF) {
    return converter.toOtf(data);
  } else if (format === Format.WOFF) {
    return converter.toWoff(data);
  } else if (format === Format.WOFF2) {
    return converter.toWoff2(data);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
}

let converter: Converter | null = null;

function handleMessage(e: MessageEvent) {
  if (!converter) {
    throw new Error('Worker not initialized');
  }

  const messageId = e.data.messageId;
  if (typeof messageId !== 'number') {
    throw new Error('Received a message without messageId');
  }

  const action = e.data.action;
  if (action === 'convert') {
    const format = e.data.format;
    if (!isValidFormat(format)) {
      throw new Error(`Invalid font format: ${format}`);
    }
    const input = e.data.input;
    const output = convert(converter, input, format);
    // TODO: Figure out why transferring doesn't work other than Chrome.
    // Transferring doesn't work only when converting to woff2, so emscripten's
    // memory system may be related.
    // @ts-ignore: self is DedicatedWorkerGlobalScope
    self.postMessage({ messageId: messageId, output: output });
  }
}

self.addEventListener('message', async e => {
  // Special case for initialization.
  if (e.data === 'init') {
    const wasmBinary = await loadWoff2Wasm();
    converter = new Converter(wasmBinary);
    // @ts-ignore: self is DedicatedWorkerGlobalScope
    self.postMessage('initialized');
    return;
  }

  try {
    handleMessage(e);
  } catch (exception) {
    // @ts-ignore: self is DedicatedWorkerGlobalScope
    self.postMessage(exception);
  }
});

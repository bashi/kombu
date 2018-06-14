import { Converter, Format } from './convert';
import { Woff2, createWoff2 } from './woff2';

async function loadWoff2Wasm(): Promise<Woff2> {
  return fetch('ffi.wasm')
    .then(response => response.arrayBuffer())
    .then(buffer => {
      const wasmBinary = new Uint8Array(buffer);
      return createWoff2(wasmBinary);
    });
}

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

function convert(converter: Converter, data: Uint8Array, outFormat: Format): Uint8Array {
  if (outFormat === Format.OTF) {
    return converter.toOtf(data)!;
  } else if (outFormat === Format.WOFF) {
    return converter.toWoff(data)!;
  } else if (outFormat === Format.WOFF2) {
    return converter.toWoff2(data)!;
  } else {
    throw new Error(`Unsupported format: ${outFormat}`);
  }
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

document.addEventListener('DOMContentLoaded', async () => {
  const woff2Wasm = await loadWoff2Wasm();
  const converter = new Converter(woff2Wasm);

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
    // TODO: Don't use type assertion.
    const format = outputFormatEl.value as Format;

    // TODO: Use worker to avoid busy loop in the main thread.
    const output = convert(converter, data, format);

    const link = createDownloadLink(output);
    const basename = getBasename(file.name);
    link.download = `${basename}.${format}`;
    link.innerHTML = `Download ${basename}.${format}`;

    const downloadEl = document.querySelector('#download-container');
    if (!downloadEl) {
      throw new Error('No download container');
    }
    downloadEl.innerHTML = '';
    downloadEl.appendChild(link);
  });
});

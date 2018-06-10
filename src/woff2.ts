// @ts-ignore
import * as Module from './ffi';

export class Woff2 {
  private mod: any;

  constructor(mod: any) {
    this.mod = mod;
  }

  compress(data: Uint8Array): Uint8Array {
    const inSize = data.byteLength;
    const inOffset = this.mod._malloc(inSize);
    this.mod.HEAPU8.set(data, inOffset);

    const maxOutSize = this.mod.ccall(
      'get_max_compressed_size',
      'number',
      ['number, number'],
      [inOffset, inSize]
    );

    const output = new Uint8Array(maxOutSize);
    const outOffset = this.mod._malloc(maxOutSize);
    this.mod.HEAPU8.set(output, outOffset);
    const outSize = this.mod.ccall(
      'ttf_to_woff2',
      'number',
      ['number', 'number', 'number', 'number'],
      [inOffset, inSize, outOffset, maxOutSize]
    );

    const res = outSize > 0 ? this.mod.HEAPU8.subarray(outOffset, outOffset + outSize) : null;

    this.mod._free(inOffset);
    this.mod._free(outOffset);
    return res;
  }

  uncompress(data: Uint8Array): Uint8Array {
    const inSize = data.byteLength;
    const inOffset = this.mod._malloc(inSize);
    this.mod.HEAPU8.set(data, inOffset);

    const uncompressSize = this.mod.ccall(
      'get_uncompressed_size',
      'number',
      ['number, number'],
      [inOffset, inSize]
    );
    const output = new Uint8Array(uncompressSize);
    const outOffset = this.mod._malloc(uncompressSize);
    this.mod.HEAPU8.set(output, outOffset);
    const outSize = this.mod.ccall(
      'woff2_to_ttf',
      'number',
      ['number', 'number', 'number', 'number'],
      [outOffset, uncompressSize, inOffset, inSize]
    );

    const res = outSize > 0 ? this.mod.HEAPU8.subarray(outOffset, outOffset + outSize) : null;

    this.mod._free(inOffset);
    this.mod._free(outOffset);
    return res;
  }
}

export function create(wasmBinary: Uint8Array): Promise<Woff2> {
  return new Promise((resolve, reject) => {
    let mod: any = null;
    const args = {
      wasmBinary: wasmBinary,
      onRuntimeInitialized: () => {
        resolve(new Woff2(mod));
      }
    };
    mod = new Module(args);
  });
}

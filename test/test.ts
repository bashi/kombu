import * as fs from 'fs';
import * as path from 'path';
import * as mocha from 'mocha';
import { assert } from 'chai';

import { getFontFormat } from '../src/format';
import { Converter } from '../src/convert';
import { createWoff2 } from '../src/woff2';

function readAsUint8Array(pathname: string): Uint8Array {
  const buffer = fs.readFileSync(pathname);
  return new Uint8Array(buffer);
}

describe('Converter', () => {
  let converter: Converter;

  before(async () => {
    const wasmPath = path.resolve(__dirname, '..', 'dist', 'ffi.wasm');
    const arr = readAsUint8Array(wasmPath);
    const woff2Obj = await createWoff2(arr);
    converter = new Converter(woff2Obj);
  });

  it('otf to woff', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toWoff(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'woff');
  });

  it('otf to woff2', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toWoff2(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'woff2');
  });

  it('woff to otf', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toOtf(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'otf');
  });

  it('woff to woff2', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toWoff2(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'woff2');
  });

  it('woff2 to otf', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toOtf(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'otf');
  });

  it('woff2 to woff', async () => {
    const inputPath = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2');
    const inputData = readAsUint8Array(inputPath);
    const output = converter.toWoff(inputData);
    assert(output instanceof Uint8Array);
    assert.equal(getFontFormat(output), 'woff');
  });
});

import * as fs from 'fs';
import * as path from 'path';
import test from 'ava';

import * as tag from '../dist/tag';
import { Reader } from '../dist/reader';
import { OtfBuilder } from '../dist/otf';
import { WoffReader, WoffBuilder, WOFF_SIGNATURE } from '../dist/woff';
import { createWoff2 } from '../dist/woff2';
import { readAsSfnt, Converter } from '../dist/convert';
import { getFontFormat } from '../dist/format';

function readFileAsUint8Array(pathname) {
  const buffer = fs.readFileSync(pathname);
  return new Uint8Array(buffer);
}

function readFontFileAsSfnt(filename) {
  const pathname = path.resolve(__dirname, 'data', 'ahem', filename);
  const buffer = fs.readFileSync(pathname);
  const data = new Uint8Array(buffer);
  return readAsSfnt(data);
}

function ahemFontTTF() {
  return readFontFileAsSfnt('AHEM____.TTF');
}

test('Read TTF', t => {
  const sfnt = ahemFontTTF();
  t.deepEqual(sfnt.numTables(), 11);
});

test('Read WOFF', t => {
  const sfnt = readFontFileAsSfnt('AHEM____.woff');
  t.deepEqual(sfnt.numTables(), 17);
});

test('OtfBuilder', t => {
  const sfnt = ahemFontTTF();
  const builder = new OtfBuilder(sfnt);
  const out = builder.build();
  const outSfnt = readAsSfnt(out);
  t.deepEqual(sfnt.numTables(), outSfnt.numTables());
});

function createWoffReader() {
  const pathname = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff');
  const buffer = fs.readFileSync(pathname);
  const data = new Uint8Array(buffer);
  const dataReader = new Reader(data);
  return new WoffReader(dataReader);
}

test('WoffReader', t => {
  const reader = createWoffReader();
  const header = reader.readHeader();
  const expected = {
    signature: WOFF_SIGNATURE,
    flavor: 65536,
    length: 3220,
    numTables: 17,
    totalSfntSize: 16652
  };
  t.deepEqual(header, expected);
});

test('WoffReader readTableEntries', t => {
  const reader = createWoffReader();
  const header = reader.readHeader();
  const entries = reader.readTableEntries(header.numTables);
  t.deepEqual(entries.length, header.numTables);

  const firstEntryTag = tag.tagToString(entries[0].tag);
  t.deepEqual(firstEntryTag, 'FFTM');
});

test('WoffReader readTable', t => {
  const reader = createWoffReader();
  const header = reader.readHeader();
  const entries = reader.readTableEntries(header.numTables);
  t.deepEqual(entries.length, header.numTables);

  for (let entry of entries) {
    const data = reader.readTable(entry);
    t.deepEqual(data.byteLength, entry.origLength);
  }
});

test('WoffReader read', t => {
  const reader = createWoffReader();
  const sfnt = reader.read();
  t.deepEqual(sfnt.numTables(), 17);
});

test('WoffBuilder', t => {
  const sfnt = ahemFontTTF();
  const builder = new WoffBuilder(sfnt);
  const out = builder.build();
  t.true(out instanceof Uint8Array);
  t.deepEqual(getFontFormat(out), 'woff');
});

// These are global objects to make tests faster
let woff2Obj = null;
let converter = null;

test.before(async t => {
  const wasmPath = path.resolve(__dirname, '..', 'dist', 'ffi.wasm');
  const wasmBinary = readFileAsUint8Array(wasmPath);
  woff2Obj = await createWoff2(wasmBinary);
  converter = new Converter(woff2Obj);
});

test('woff2 compress', async t => {
  const data = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF'));
  const compressed = woff2Obj.compress(data);
  t.true(compressed.byteLength > 0);
});

test('woff2 uncompress', async t => {
  const data = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2'));
  const uncompressed = woff2Obj.uncompress(data);
  t.true(uncompressed.byteLength > 0);
});

test('getFontFormat', t => {
  const data = new Uint8Array([0x4f, 0x54, 0x54, 0x4f]);
  const format = getFontFormat(data);
  t.deepEqual(format, 'otf');

  const data2 = new Uint8Array([0x77, 0x4f, 0x46, 0x46]);
  const format2 = getFontFormat(data2);
  t.deepEqual(format2, 'woff');

  const data3 = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);
  const format3 = getFontFormat(data3);
  t.deepEqual(format3, 'woff2');

  const data4 = new Uint8Array([]);
  const format4 = getFontFormat(data4);
  t.deepEqual(format4, 'unsupported');
});

test('Converter.toOtf', async t => {
  const inputWoff2 = readFileAsUint8Array(
    path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2')
  );
  const outputWoff2 = converter.toOtf(inputWoff2);
  t.true(outputWoff2 instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff2), 'otf');

  const inputWoff = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff'));
  const outputWoff = converter.toOtf(inputWoff);
  t.true(outputWoff instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff), 'otf');

  const inputTTF = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF'));
  const outputTTF = converter.toOtf(inputTTF);
  t.true(outputTTF instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputTTF), 'otf');

  const inputEmpty = new Uint8Array();
  const outputEmpty = converter.toOtf(inputEmpty);
  t.deepEqual(outputEmpty, null);

  const inputInvalid = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
  const outputInvalid = converter.toOtf(inputInvalid);
  t.deepEqual(outputInvalid, null);
});

test('Converter.toWoff', async t => {
  const inputWoff2 = readFileAsUint8Array(
    path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2')
  );
  const outputWoff2 = converter.toWoff(inputWoff2);
  t.true(outputWoff2 instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff2), 'woff');

  const inputWoff = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff'));
  const outputWoff = converter.toWoff(inputWoff);
  t.true(outputWoff instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff), 'woff');

  const inputTTF = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF'));
  const outputTTF = converter.toWoff(inputTTF);
  t.true(outputTTF instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputTTF), 'woff');

  const inputEmpty = new Uint8Array();
  const outputEmpty = converter.toWoff(inputEmpty);
  t.deepEqual(outputEmpty, null);

  const inputInvalid = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
  const outputInvalid = converter.toWoff(inputInvalid);
  t.deepEqual(outputInvalid, null);
});

test('Converter.toWoff2', async t => {
  const inputWoff2 = readFileAsUint8Array(
    path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2')
  );
  const outputWoff2 = converter.toWoff2(inputWoff2);
  t.true(outputWoff2 instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff2), 'woff2');

  const inputWoff = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff'));
  const outputWoff = converter.toWoff2(inputWoff);
  t.true(outputWoff instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputWoff), 'woff2');

  const inputTTF = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF'));
  const outputTTF = converter.toWoff2(inputTTF);
  t.true(outputTTF instanceof Uint8Array);
  t.deepEqual(getFontFormat(outputTTF), 'woff2');

  const inputEmpty = new Uint8Array();
  const outputEmpty = converter.toWoff2(inputEmpty);
  t.deepEqual(outputEmpty, null);

  const inputInvalid = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
  const outputInvalid = converter.toWoff2(inputInvalid);
  t.deepEqual(outputInvalid, null);
});

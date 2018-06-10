import * as fs from 'fs';
import * as path from 'path';
import test from 'ava';

import * as tag from '../dist/tag';
import { readFont } from '../dist/font-reader';
import { OtfBuilder } from '../dist/otf-builder';
import { DataViewReader } from '../dist/dataview-reader';
import { WoffReader, WOFF_SIGNATURE } from '../dist/woff';
import * as woff2 from '../dist/woff2';

function readFileAsUint8Array(pathname) {
  const buffer = fs.readFileSync(pathname);
  return new Uint8Array(buffer);
}

function readFontFile(filename) {
  const pathname = path.resolve(__dirname, 'data', 'ahem', filename);
  const buffer = fs.readFileSync(pathname);
  const data = new Uint8Array(buffer).buffer;
  return readFont(data);
}

function ahemFontTTF() {
  return readFontFile('AHEM____.TTF');
}

test('Read TTF', t => {
  const sfnt = ahemFontTTF();
  t.deepEqual(sfnt.numTables(), 11);
});

test('Read WOFF', t => {
  const sfnt = readFontFile('AHEM____.woff');
  t.deepEqual(sfnt.numTables(), 17);
});

test('OtfBuilder', t => {
  const sfnt = ahemFontTTF();
  const builder = new OtfBuilder(sfnt);
  const out = builder.build();
  const outSfnt = readFont(out.buffer);
  t.deepEqual(sfnt.numTables(), outSfnt.numTables());
});

function createWoffReader() {
  const pathname = path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff');
  const buffer = fs.readFileSync(pathname);
  const data = new Uint8Array(buffer).buffer;
  const dataReader = DataViewReader.createFromArrayBuffer(data);
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

test('woff2 compress', async t => {
  const wasmPath = path.resolve(__dirname, '..', 'dist', 'ffi.wasm');
  const wasmBinary = readFileAsUint8Array(wasmPath);
  const w = await woff2.create(wasmBinary);
  const data = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.TTF'));
  const compressed = w.compress(data);
  t.true(compressed.byteLength > 0);
});

test('woff2 uncompress', async t => {
  const wasmPath = path.resolve(__dirname, '..', 'dist', 'ffi.wasm');
  const wasmBinary = readFileAsUint8Array(wasmPath);
  const w = await woff2.create(wasmBinary);
  const data = readFileAsUint8Array(path.resolve(__dirname, 'data', 'ahem', 'AHEM____.woff2'));
  const uncompressed = w.uncompress(data);
  t.true(uncompressed.byteLength > 0);
});

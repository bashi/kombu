import { Sfnt } from './sfnt';
import { Reader } from './reader';
import { Writer } from './writer';
import { stringToTag, calculateTableChecksum } from './tag';
import { SFNT_HEADER_SIZE, SFNT_TABLE_ENTRY_SIZE } from './otf';
import { WOFF_SIGNATURE, isOtfFont } from './format';

// @ts-ignore
import * as Zlib from 'zlibjs';

export const WOFF_HEADER_SIZE = 44;
export const WOFF_TABLE_ENTRY_SIZE = 20;

const TAG_HEAD = stringToTag('head');

function compressTable(data: Uint8Array): Uint8Array {
  const res = Zlib.deflateSync(data);
  return res;
}

function uncompressTable(data: Uint8Array): Uint8Array {
  const res = Zlib.inflateSync(data);
  return res;
}

interface Header {
  signature: number;
  flavor: number;
  length: number;
  numTables: number;
  totalSfntSize: number;
}

interface TableEntry {
  tag: number;
  offset: number;
  compLength: number;
  origLength: number;
  origChecksum: number;
}

export class WoffReader {
  private reader: Reader;

  constructor(reader: Reader) {
    this.reader = reader;
  }

  read(): Sfnt {
    const header = this.readHeader();
    const entries = this.readTableEntries(header.numTables);
    const sfnt = new Sfnt(header.flavor);
    for (let entry of entries) {
      const table = this.readTable(entry);
      sfnt.addTable(entry.tag, table, entry.origChecksum);
    }
    return sfnt;
  }

  readHeader(): Header {
    const signature = this.reader.readULong();
    if (signature !== WOFF_SIGNATURE) {
      throw new Error('Invalid WOFF signature: ' + signature);
    }
    const flavor = this.reader.readULong();
    if (!isOtfFont(flavor)) {
      throw new Error('Unknown flavor: ' + flavor);
    }
    const length = this.reader.readULong();
    if (this.reader.length() !== length) {
      throw new Error('Invalid length in header: ' + length);
    }
    const numTables = this.reader.readUShort();
    this.reader.skip(2); // reserved
    const totalSfntSize = this.reader.readULong();
    this.reader.skip(24); // skip version, metadata and private fields
    return {
      signature: signature,
      flavor: flavor,
      length: length,
      numTables: numTables,
      totalSfntSize: totalSfntSize
    };
  }

  readTableEntries(numTables: number): Array<TableEntry> {
    const entries = [];
    for (let i = 0; i < numTables; i++) {
      const tag = this.reader.readULong();
      const offset = this.reader.readULong();
      const compLength = this.reader.readULong();
      const origLength = this.reader.readULong();
      const origChecksum = this.reader.readULong();
      entries.push({
        tag: tag,
        offset: offset,
        compLength: compLength,
        origLength: origLength,
        origChecksum: origChecksum
      });
    }
    return entries;
  }

  private readTableData(entry: TableEntry): Uint8Array {
    const tableData = this.reader.uint8ArrayFor(entry.offset, entry.compLength);
    if (entry.compLength === entry.origLength) {
      return tableData;
    }
    const uncompressed = uncompressTable(tableData);
    if (uncompressed.byteLength !== entry.origLength) {
      throw new Error(
        'uncompressed size mismatch: ' + tableData.byteLength + ' != ' + entry.origLength
      );
    }
    return uncompressed;
  }

  private readTable(entry: TableEntry): Uint8Array {
    const tableData = this.readTableData(entry);
    if (entry.tag !== TAG_HEAD) {
      const checksum = calculateTableChecksum(tableData);
      if (checksum !== entry.origChecksum) {
        throw new Error(`checksum mismatch: ${checksum} != ${entry.origChecksum}`);
      }
    }
    return tableData;
  }
}

interface WoffTableEntry {
  tag: number;
  offset: number;
  compLength: number;
  origTableLength: number;
  origChecksum: number;
}

interface WriteTablesResult {
  totalSize: number;
  entries: Array<WoffTableEntry>;
}

export class WoffBuilder {
  private sfnt: Sfnt;
  private writer: Writer;

  constructor(sfnt: Sfnt) {
    this.sfnt = sfnt;
    this.writer = new Writer();
  }

  private writeHeader(numTables: number, totalLength: number, totalSfntSize: number) {
    this.writer.writeULong(WOFF_SIGNATURE);
    this.writer.writeULong(this.sfnt.getSfntVersion());
    this.writer.writeULong(totalLength);
    this.writer.writeUShort(numTables);
    this.writer.writeUShort(0); // reserved
    this.writer.writeULong(totalSfntSize);
    this.writer.writeULong(0); // major and minor version (don't care)
    this.writer.writeULong(0); // metaOffset
    this.writer.writeULong(0); // metaLength
    this.writer.writeULong(0); // metaOrigLength
    this.writer.writeULong(0); // privOffset
    this.writer.writeULong(0); // privLength
  }

  private writeTablesAndBuildEntries(): WriteTablesResult {
    let totalSize = 0;
    const entries = [];
    const tags = this.sfnt.getTags();
    for (var i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const offset = this.writer.getPosition();
      const origTable = this.sfnt.getTableByTag(tag)!;
      const table = this.maybeCompressTable(origTable.data);
      const compLength =
        table.byteLength < origTable.length() ? table.byteLength : origTable.length();
      var entry = {
        tag: tag,
        offset: offset,
        compLength: compLength,
        origTableLength: origTable.length(),
        origChecksum: origTable.checksum
      };
      entries.push(entry);
      totalSize += origTable.paddedLength();
      this.writeTable(table);
    }
    return {
      totalSize: totalSize,
      entries: entries
    };
  }

  private maybeCompressTable(orig: Uint8Array): Uint8Array {
    const compressed = compressTable(orig);
    if (compressed.byteLength < orig.byteLength) {
      return compressed;
    }
    return orig;
  }

  private writeTable(table: Uint8Array) {
    this.writer.writeBytes(table);
    const padLength = 4 - (table.byteLength & 3);
    if (padLength > 0) {
      this.writer.pad(padLength);
    }
  }

  build(): Uint8Array {
    const numTables = this.sfnt.numTables();
    const totalSfntSize = SFNT_HEADER_SIZE + SFNT_TABLE_ENTRY_SIZE * numTables;
    const tableStartPosition = WOFF_HEADER_SIZE + WOFF_TABLE_ENTRY_SIZE * numTables;
    this.writer.seek(tableStartPosition);
    const res = this.writeTablesAndBuildEntries();

    // TODO: Support metadata and private data.

    this.writer.seek(0);
    this.writeHeader(numTables, res.totalSize, totalSfntSize);
    this.writeTablesAndBuildEntries();
    return this.writer.result();
  }
}

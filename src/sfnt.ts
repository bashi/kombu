import { DataViewReader } from './dataview-reader';
import { calculateTableChecksum, stringToTag, tagToString } from './tag';

const SFNT_VERSION_OTTO = 0x4f54544f; // OTTO
const SFNT_VERSION_TYP1 = 0x74797031; // typ1
const SFNT_VERSION_TRUE = 0x74727565; // true
const SFNT_VERSION_V1 = 0x00010000;

export function isSfntLikeFont(version: number): boolean {
  return (
    version === SFNT_VERSION_OTTO ||
    version === SFNT_VERSION_TYP1 ||
    version === SFNT_VERSION_TRUE ||
    version === SFNT_VERSION_V1
  );
}

class Table {
  data: Uint8Array;
  checksum: number;

  constructor(data: Uint8Array, checksum: number) {
    this.data = data;
    this.checksum = checksum;
  }

  length(): number {
    return this.data.byteLength;
  }

  paddedLength(): number {
    return (this.data.byteLength + 3) & ~3;
  }
}

export class Sfnt {
  private sfntVersion: number;
  private tables: Map<number, Table>;
  private tableTags: Array<number>;

  constructor(sfntVersion: number) {
    this.sfntVersion = sfntVersion;
    this.tables = new Map();
    this.tableTags = [];
  }

  getSfntVersion() {
    return this.sfntVersion;
  }

  numTables(): number {
    return this.tableTags.length;
  }

  addTable(tag: number, data: Uint8Array, checksum: number) {
    const tagExists = tag in this.tables;
    this.tables.set(tag, new Table(data, checksum));
    if (tagExists) return;

    let index = 0;
    while (index < this.tableTags.length && tag > this.tableTags[index]) index++;
    this.tableTags.splice(index, 0, tag);
  }

  getTableByTag(tag: number): Table | undefined {
    return this.tables.get(tag);
  }

  getTags(): Array<number> {
    return this.tableTags.slice(0);
  }
}

// Sfnt-like (TrueType, OpenType) font reader.
// https://docs.microsoft.com/en-us/typography/opentype/spec/font-file
export class SfntLikeReader {
  private reader: DataViewReader;

  constructor(reader: DataViewReader) {
    this.reader = reader;
  }

  read(): Sfnt {
    const offsetTable = this.readOffsetTable();
    const records = this.readTableRecords(offsetTable.numTables);
    const sfnt = new Sfnt(offsetTable.sfntVersion);
    this.readTables(sfnt, records);
    return sfnt;
  }

  private readOffsetTable(): any {
    const offsetTable = {
      sfntVersion: this.reader.readULong(),
      numTables: this.reader.readUShort(),
      searchRange: this.reader.readUShort(),
      entrySelector: this.reader.readUShort(),
      rangeShift: this.reader.readUShort()
    };
    return offsetTable;
  }

  private readTableRecords(numTables: number): Array<any> {
    const records = [];
    for (let i = 0; i < numTables; i++) {
      const r = {
        tag: this.reader.readULong(),
        checksum: this.reader.readULong(),
        offset: this.reader.readULong(),
        length: this.reader.readULong()
      };
      records.push(r);
    }
    return records;
  }

  private readTables(sfnt: Sfnt, records: Array<any>) {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const tagStr = tagToString(r.tag);
      if (r.offset % 4 !== 0)
        throw new Error('Offset must be four-bytes aligned: ' + tagStr + ' ' + r.offset);

      const data = this.reader.uint8ArrayFor(r.offset, r.length);
      const head = stringToTag('head');
      if (r.tag !== head) {
        var checksum = calculateTableChecksum(data);
        if (r.checksum !== checksum)
          throw new Error('Checksum mismatch: ' + tagStr + ' ' + checksum + ' != ' + r.checksum);
      }
      sfnt.addTable(r.tag, data, r.checksum);
    }
  }
}

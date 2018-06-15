import { Sfnt } from './sfnt';
import { Reader } from './reader';
import { Writer } from './writer';
import { tagToString, stringToTag, calculateTableChecksum } from './tag';

export const SFNT_HEADER_SIZE = 12;
export const SFNT_TABLE_ENTRY_SIZE = 16;

const SFNT_VERSION_OTTO = 0x4f54544f; // OTTO
const SFNT_VERSION_TYP1 = 0x74797031; // typ1
const SFNT_VERSION_TRUE = 0x74727565; // true
const SFNT_VERSION_V1 = 0x00010000;

export function isOtfFont(version: number): boolean {
  return (
    version === SFNT_VERSION_OTTO ||
    version === SFNT_VERSION_TYP1 ||
    version === SFNT_VERSION_TRUE ||
    version === SFNT_VERSION_V1
  );
}

export function getOtfFilenameSuffix(version: number): string {
  if (version === SFNT_VERSION_OTTO) return 'otf';
  if (version === SFNT_VERSION_TYP1 || version === SFNT_VERSION_TRUE || SFNT_VERSION_V1)
    return 'ttf';
  throw new Error(`Invalid font version: ${version}`);
}

export class OtfReader {
  private reader: Reader;

  constructor(reader: Reader) {
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

export class OtfBuilder {
  private sfnt: Sfnt;
  private writer: Writer;

  constructor(sfnt: Sfnt) {
    this.sfnt = sfnt;
    this.writer = new Writer();
  }

  private writeHeader() {
    const numTables = this.sfnt.numTables();
    let entrySelector = 0;
    while (1 << (1 + entrySelector) <= numTables) {
      entrySelector += 1;
    }
    const searchRange = 1 << (entrySelector + 4);
    const rangeShift = numTables * 16 - searchRange;
    this.writer.writeULong(this.sfnt.getSfntVersion());
    this.writer.writeUShort(numTables);
    this.writer.writeUShort(searchRange);
    this.writer.writeUShort(entrySelector);
    this.writer.writeUShort(rangeShift);
  }

  private writeTableRecords() {
    const tags = this.sfnt.getTags();
    let tableOffset = SFNT_HEADER_SIZE + SFNT_TABLE_ENTRY_SIZE * this.sfnt.numTables();
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const table = this.sfnt.getTableByTag(tag)!;
      this.writer.writeULong(tag);
      this.writer.writeULong(table.checksum);
      this.writer.writeULong(tableOffset);
      this.writer.writeULong(table.length());
      tableOffset += table.paddedLength();
    }
  }

  private writeTables() {
    const tags = this.sfnt.getTags();
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const table = this.sfnt.getTableByTag(tag)!;
      this.writer.writeBytes(table.data);
      const padLen = table.paddedLength() - table.length();
      this.writer.pad(padLen);
    }
  }

  build(): Uint8Array {
    this.writeHeader();
    this.writeTableRecords();
    this.writeTables();
    return this.writer.result();
  }
}

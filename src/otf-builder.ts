import { Sfnt } from './sfnt';
import { Writer } from './writer';

export const SFNT_HEADER_SIZE = 12;
export const SFNT_TABLE_ENTRY_SIZE = 16;

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

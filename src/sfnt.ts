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

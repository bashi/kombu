import { getFontFormat, Format } from './font-reader';
import { Woff2 } from './woff2';
import { Sfnt, SfntLikeReader } from './sfnt';
import { DataViewReader } from './dataview-reader';
import { WoffReader, WoffBuilder } from './woff';
import { OtfBuilder } from './otf-builder';

export class Converter {
  private woff2: Woff2;

  constructor(woff2: Woff2) {
    this.woff2 = woff2;
  }

  toTtf(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.TTF) return data;
    if (format === Format.WOFF2) {
      return this.woff2.uncompress(data);
    }
    if (format === Format.WOFF) {
      const dataReader = DataViewReader.createFromArrayBuffer(data.buffer);
      const reader = new WoffReader(dataReader);
      const sfnt = reader.read();
      const builder = new OtfBuilder(sfnt);
      return builder.build();
    }
    return null;
  }

  toWoff(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.WOFF) return data;
    if (format === Format.TTF) {
      const dataReader = DataViewReader.createFromArrayBuffer(data.buffer);
      const reader = new SfntLikeReader(dataReader);
      const sfnt = reader.read();
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    if (format === Format.WOFF2) {
      const uncompressed = this.woff2.uncompress(data);
      if (uncompressed === null) return null;
      const dataReader = DataViewReader.createFromArrayBuffer(uncompressed.buffer);
      const reader = new SfntLikeReader(dataReader);
      const sfnt = reader.read(); // Should read() return null?
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    return null;
  }

  toWoff2(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.WOFF2) return data;
    if (format === Format.TTF) {
      return this.woff2.compress(data);
    }
    if (format === Format.WOFF) {
      const dataReader = DataViewReader.createFromArrayBuffer(data.buffer);
      const reader = new WoffReader(dataReader);
      const sfnt = reader.read();
      const builder = new OtfBuilder(sfnt);
      const ttf = builder.build();
      return this.woff2.compress(ttf);
    }
    return null;
  }
}

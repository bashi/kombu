import { Sfnt } from './sfnt';
import { Reader } from './reader';
import { isOtfFont, OtfBuilder, OtfReader } from './otf';
import { isWoffFont, WoffBuilder, WoffReader } from './woff';
import { isWoff2Font, Woff2 } from './woff2';

export const enum Format {
  OTF = 'otf',
  WOFF = 'woff',
  WOFF2 = 'woff2',
  UNSUPPORTED = 'unsupported'
}

export function getFontFormat(data: Uint8Array): Format {
  if (data.byteLength < 4) return Format.UNSUPPORTED;

  const version = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  if (isOtfFont(version)) return Format.OTF;
  if (isWoffFont(version)) return Format.WOFF;
  if (isWoff2Font(version)) return Format.WOFF2;
  return Format.UNSUPPORTED;
}

interface FontReader {
  read(): Sfnt;
}

function createReader(dataReader: Reader, format: Format): FontReader {
  if (format === Format.OTF) {
    return new OtfReader(dataReader);
  } else if (format === Format.WOFF) {
    return new WoffReader(dataReader);
  }
  throw new Error(`Unsupported format: ${format}`);
}

export function readAsSfnt(data: Uint8Array): Sfnt {
  const format = getFontFormat(data);
  const reader = new Reader(data);
  const fontReader = createReader(reader, format);
  return fontReader.read();
}

export class Converter {
  private woff2: Woff2;

  constructor(woff2: Woff2) {
    this.woff2 = woff2;
  }

  toOtf(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.OTF) return data;
    if (format === Format.WOFF2) {
      return this.woff2.uncompress(data);
    }
    if (format === Format.WOFF) {
      const sfnt = readAsSfnt(data);
      const builder = new OtfBuilder(sfnt);
      return builder.build();
    }
    return null;
  }

  toWoff(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.WOFF) return data;
    if (format === Format.OTF) {
      const sfnt = readAsSfnt(data);
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    if (format === Format.WOFF2) {
      const uncompressed = this.woff2.uncompress(data);
      if (uncompressed === null) return null;
      const sfnt = readAsSfnt(uncompressed);
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    return null;
  }

  toWoff2(data: Uint8Array): Uint8Array | null {
    const format = getFontFormat(data);
    if (format === Format.WOFF2) return data;
    if (format === Format.OTF) {
      return this.woff2.compress(data);
    }
    if (format === Format.WOFF) {
      const sfnt = readAsSfnt(data);
      const builder = new OtfBuilder(sfnt);
      const ttf = builder.build();
      return this.woff2.compress(ttf);
    }
    return null;
  }
}

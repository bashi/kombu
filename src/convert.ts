import { Sfnt } from './sfnt';
import { Reader } from './reader';
import { OtfBuilder, OtfReader } from './otf';
import { WoffBuilder, WoffReader } from './woff';
import { Woff2 } from './woff2';
import { Format, getFontFormat } from './format';

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

  toOtf(data: Uint8Array): Uint8Array {
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
    throw new Error(`Unsupported format: ${format}`);
  }

  toWoff(data: Uint8Array): Uint8Array {
    const format = getFontFormat(data);
    if (format === Format.WOFF) return data;
    if (format === Format.OTF) {
      const sfnt = readAsSfnt(data);
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    if (format === Format.WOFF2) {
      const uncompressed = this.woff2.uncompress(data);
      const sfnt = readAsSfnt(uncompressed);
      const builder = new WoffBuilder(sfnt);
      return builder.build();
    }
    throw new Error(`Unsupported format: ${format}`);
  }

  toWoff2(data: Uint8Array): Uint8Array {
    const format = getFontFormat(data);
    if (format === Format.WOFF2) return data;
    if (format === Format.OTF) {
      return this.woff2.compress(data);
    }
    if (format === Format.WOFF) {
      const sfnt = readAsSfnt(data);
      const builder = new OtfBuilder(sfnt);
      const otf = builder.build();
      return this.woff2.compress(otf);
    }
    throw new Error(`Unsupported format: ${format}`);
  }
}

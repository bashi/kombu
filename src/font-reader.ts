import { DataViewReader } from './dataview-reader';
import { isSfntLikeFont, SfntLikeReader, Sfnt } from './sfnt';
import { isWoffFont, isWoff2Font, WoffReader } from './woff';

interface FontReader {
  read(): Sfnt;
}

function createFontReader(dataReader: DataViewReader, version: number): FontReader {
  if (isSfntLikeFont(version)) {
    return new SfntLikeReader(dataReader);
  } else if (isWoffFont(version)) {
    return new WoffReader(dataReader);
  }
  throw new Error(`Unsupported font, version: ${version}`);
}

export function readFont(buffer: ArrayBuffer): Sfnt {
  const dataReader = DataViewReader.createFromArrayBuffer(buffer);
  dataReader.seek(0);
  const version = dataReader.readULong();
  dataReader.seek(0);
  const fontReader = createFontReader(dataReader, version);
  return fontReader.read();
}

export const enum Format {
  TTF = 'ttf',
  WOFF = 'woff',
  WOFF2 = 'woff2',
  UNSUPPORTED = 'unsupported'
}

export function getFontFormat(data: Uint8Array): Format {
  if (data.byteLength < 4) return Format.UNSUPPORTED;

  const version = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  if (isSfntLikeFont(version)) return Format.TTF;
  if (isWoffFont(version)) return Format.WOFF;
  if (isWoff2Font(version)) return Format.WOFF2;
  return Format.UNSUPPORTED;
}

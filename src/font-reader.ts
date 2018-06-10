import { DataViewReader } from './dataview-reader';
import { isSfntLikeFont, SfntLikeReader, Sfnt } from './sfnt';
import { isWoffFont, WoffReader } from './woff';

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

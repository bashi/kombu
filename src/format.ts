import { isOtfFont, getOtfFilenameSuffix } from './otf';
import { isWoffFont } from './woff';
import { isWoff2Font } from './woff2';

export const enum Format {
  OTF = 'otf',
  WOFF = 'woff',
  WOFF2 = 'woff2',
  UNSUPPORTED = 'unsupported'
}

function getVersion(data: Uint8Array): number {
  if (data.byteLength < 4) return 0; // invalid
  const version = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  return version;
}

export function getFontFormat(data: Uint8Array): Format {
  const version = getVersion(data);
  if (isOtfFont(version)) return Format.OTF;
  if (isWoffFont(version)) return Format.WOFF;
  if (isWoff2Font(version)) return Format.WOFF2;
  return Format.UNSUPPORTED;
}

export function isValidFormat(s: string): s is Format {
  return s === 'otf' || s === 'woff' || s === 'woff2';
}

export function getFilenameSuffix(data: Uint8Array): string {
  const version = getVersion(data);
  if (isWoffFont(version)) return 'woff';
  if (isWoff2Font(version)) return 'woff2';
  if (isOtfFont(version)) return getOtfFilenameSuffix(version);
  throw new Error(`Invalid font version: ${version}`);
}

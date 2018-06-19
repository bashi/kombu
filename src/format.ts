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

export const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'

export function isWoffFont(version: number): boolean {
  return version === WOFF_SIGNATURE;
}

const WOFF2_SIGNATURE = 0x774f4632; // wOF2

export function isWoff2Font(version: number): boolean {
  return version === WOFF2_SIGNATURE;
}

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

import { readFont } from './font-reader';
import { OtfBuilder } from './otf-builder';

// TODO: Add woff and woff2.
export type Format = 'ttf';

export function convert(buffer: ArrayBuffer, format: Format = 'ttf') {
  const sfnt = readFont(buffer);
  return new OtfBuilder(sfnt).build();
}

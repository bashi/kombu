export function stringToTag(s: string): number {
  if (s.length !== 4) {
    throw new Error(`Invalid tag: ${s}`);
  }
  return (
    (((s.charCodeAt(0) & 0xff) << 24) |
      ((s.charCodeAt(1) & 0xff) << 16) |
      ((s.charCodeAt(2) & 0xff) << 8) |
      (s.charCodeAt(3) & 0xff)) >>>
    0
  );
}

export function tagToString(tag: number): string {
  return String.fromCharCode(
    (tag >>> 24) & 0xff,
    (tag >>> 16) & 0xff,
    (tag >>> 8) & 0xff,
    tag & 0xff
  );
}

export function calculateTableChecksum(table: Uint8Array): number {
  let sum = 0;
  let value;
  let i;
  for (i = 0; i < table.byteLength - 4; i += 4) {
    value = ((table[i] << 24) | (table[i + 1] << 16) | (table[i + 2] << 8) | table[i + 3]) >>> 0;
    sum = ((sum + value) & 0xffffffff) >>> 0;
  }
  value = 0;
  const remaining = table.byteLength - i;
  for (let j = 0; j < remaining; j++) value = ((value << 8) >>> 0) | table[i + j];
  value = (value << (8 * (4 - remaining))) >>> 0;
  return ((sum + value) & 0xffffffff) >>> 0;
}

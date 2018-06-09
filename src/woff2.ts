declare var Module: any;

function compress(data: Uint8Array): Uint8Array {
  const inSize = data.byteLength;
  const inOffset = Module._malloc(inSize);
  Module.HEAPU8.set(data, inOffset);

  const maxOutSize = Module.ccall(
    "get_max_compressed_size",
    "number",
    ["number, number"],
    [inOffset, inSize]
  );

  const output = new Uint8Array(maxOutSize);
  const outOffset = Module._malloc(maxOutSize);
  Module.HEAPU8.set(output, outOffset);
  const outSize = Module.ccall(
    "ttf_to_woff2",
    "number",
    ["number", "number", "number", "number"],
    [inOffset, inSize, outOffset, maxOutSize]
  );

  const res =
    outSize > 0 ? Module.HEAPU8.subarray(outOffset, outOffset + outSize) : null;

  Module._free(inOffset);
  Module._free(outOffset);
  return res;
}

function uncompress(data: Uint8Array): Uint8Array {
  const inSize = data.byteLength;
  const inOffset = Module._malloc(inSize);
  Module.HEAPU8.set(data, inOffset);

  const uncompressSize = Module.ccall(
    "get_uncompressed_size",
    "number",
    ["number, number"],
    [inOffset, inSize]
  );
  const output = new Uint8Array(uncompressSize);
  const outOffset = Module._malloc(uncompressSize);
  Module.HEAPU8.set(output, outOffset);
  const outSize = Module.ccall(
    "woff2_to_ttf",
    "number",
    ["number", "number", "number", "number"],
    [outOffset, uncompressSize, inOffset, inSize]
  );

  const res =
    outSize > 0 ? Module.HEAPU8.subarray(outOffset, outOffset + outSize) : null;

  Module._free(inOffset);
  Module._free(outOffset);
  return res;
}

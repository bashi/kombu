#include <emscripten.h>

#include "woff2/decode.h"
#include "woff2/encode.h"

extern "C" {

EMSCRIPTEN_KEEPALIVE
size_t get_max_compressed_size(const uint8_t* data, size_t length) {
  return woff2::MaxWOFF2CompressedSize(data, length);
}

EMSCRIPTEN_KEEPALIVE
int32_t ttf_to_woff2(const uint8_t* data, size_t length, uint8_t* result, size_t result_length) {
  size_t out_length = result_length;
  if (!woff2::ConvertTTFToWOFF2(data, length, result, &out_length))
    return -1;
  return out_length;
}

EMSCRIPTEN_KEEPALIVE
size_t get_uncompressed_size(const uint8_t* data, size_t length) {
  return woff2::ComputeWOFF2FinalSize(data, length);
}

EMSCRIPTEN_KEEPALIVE
int32_t woff2_to_ttf(uint8_t* result, size_t result_length, const uint8_t* data, size_t length) {
  if (!woff2::ConvertWOFF2ToTTF(result, result_length, data, length))
    return -1;
  return result_length;
}

}

#include <emscripten.h>

#include "woff2/encode.h"

extern "C" {

EMSCRIPTEN_KEEPALIVE
size_t get_max_compressed_size(const uint8_t* data, size_t length) {
  return woff2::MaxWOFF2CompressedSize(data, length);
}

EMSCRIPTEN_KEEPALIVE
int ttf_to_woff2(const uint8_t* data, size_t length, uint8_t* result, size_t result_length) {
  size_t out_length = result_length;
  if (!woff2::ConvertTTFToWOFF2(data, length, result, &out_length))
    return -1;
  return out_length;
}

}

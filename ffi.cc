#include "woff2/encode.h"

extern "C" {

size_t get_max_compressed_size(const uint8_t* data, size_t length) {
  return woff2::MaxWOFF2CompressedSize(data, length);
}

}

CXXFLAGS += -std=c++11

OUTDIR := out

WOFF2_DIR := woff2

OBJDIR := $(OUTDIR)/obj
DISTDIR := dist/

.DEFAULT_GOAL := $(FFI_JS)

# brotli

BROTLI_DIR := $(WOFF2_DIR)/brotli
BROTLI_LIB_A := $(BROTLI_DIR)/libbrotli.a

$(BROTLI_LIB_A):
	$(MAKE) -C $(BROTLI_DIR) lib

# woff2

WOFF2_SRC_DIR = $(WOFF2_DIR)/src
WOFF2_SRC_FILES := font.cc \
  glyph.cc \
	normalize.cc \
	table_tags.cc \
	transform.cc \
	variable_length.cc \
	woff2_common.cc \
	woff2_dec.cc \
	woff2_enc.cc \
	woff2_out.cc

WOFF2_SRCS := $(addprefix $(WOFF2_SRC_DIR)/, $(WOFF2_SRC_FILES))
WOFF2_OBJS := $(addprefix $(OBJDIR)/, $(notdir $(WOFF2_SRCS:%.cc=%.o)))
WOFF2_DEPS := $(WOFF2_OBJS:%.o=%.d)
WOFF2_LIB_A := $(OBJDIR)/libwoff2.a

-include $(WOFF2_DEPS)

$(WOFF2_LIB_A): dirs $(WOFF2_OBJS)
	emar crs $(WOFF2_LIB_A) $(WOFF2_OBJS)

$(OBJDIR)/%.o: $(WOFF2_DIR)/src/%.cc
	$(CXX) -c -MMD $(CXXFLAGS) -I$(BROTLI_DIR)/c/include -I$(WOFF2_DIR)/include -o $@ $<

# ffi

FFI_JS := $(DISTDIR)/ffi.js
FFI_OBJS := $(FFI_SRCS:%.cc=%.o)

$(FFI_JS): $(WOFF2_LIB_A) $(BROTLI_LIB_A) ffi.cc
	emcc $(CXXFLAGS) -I$(WOFF2_DIR)/include ffi.cc -o $(FFI_JS) $(WOFF2_LIB_A) $(BROTLI_LIB_A) \
	  -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 \
	  -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]'

$(OBJDIR)/%.o: %.cc
	$(CXX) -c -MMD $(CXXFLAGS) -I$(BROTLI_DIR)/c/include -I$(WOFF2_DIR)/include -o $@ $<

# others

.PHONY: clean

dirs:
	@mkdir -p $(OBJDIR)

clean:
	$(MAKE) -C $(BROTLI_DIR) clean
	@rm -rf $(OUTDIR)

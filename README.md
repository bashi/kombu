# Kombu

A web app that converts a font from/to ttf, otf, woff and woff2.

https://kombu.kanejaku.org/

The whole process of conversion happens only on browsers. Once the app is loaded, no server interaction occurs.

This app uses WebAssembly and Web Workers. You need a modern browser to run this app. Major browsers like Firefox, Google Chrome, Safari and Edge support them.

## Build

You need [emscripten](https://emscripten.org/docs/getting_started) to build.

```sh
$ git clone --recursive https://github.com/bashi/kombu.git
# Install dependencies
$ yarn
# Build wasm for woff2 support
$ yarn make-wasm
# Build web app
$ yarn build
# optional: Launch http server for local development
$ http-server -p 4001 -c-0
```

The webapp will be generated under `public` directory. Copy `public` directory to your server.

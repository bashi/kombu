const DEFAULT_INITIAL_BUFSIZE = 128 * 1024;

export class Writer {
  private position: number;
  private length: number;
  private array: Uint8Array;
  private view: DataView;

  constructor(bufsize: number = DEFAULT_INITIAL_BUFSIZE) {
    this.position = 0;
    this.length = 0;
    this.array = new Uint8Array(bufsize);
    this.view = new DataView(this.array.buffer);
  }

  private expandBufferIfNeeded(addingSize: number) {
    while (this.array.byteLength < addingSize + this.position) {
      const newArray = new Uint8Array(this.array.byteLength * 2);
      newArray.set(this.array);
      this.array = newArray;
      this.view = new DataView(newArray.buffer);
    }
  }

  private advanceLengthIfNeeded() {
    if (this.length < this.position) {
      this.length = this.position;
    }
  }

  writeByte(value: number) {
    this.expandBufferIfNeeded(1);
    this.view.setUint8(this.position, value);
    this.position += 1;
    this.advanceLengthIfNeeded();
  }

  writeBytes(uint8values: Uint8Array) {
    this.expandBufferIfNeeded(uint8values.byteLength);
    this.array.set(uint8values, this.position);
    this.position += uint8values.byteLength;
    this.advanceLengthIfNeeded();
  }

  writeUShort(value: number) {
    this.expandBufferIfNeeded(2);
    this.view.setUint16(this.position, value, false);
    this.position += 2;
    this.advanceLengthIfNeeded();
  }

  writeShort(value: number) {
    this.expandBufferIfNeeded(2);
    this.view.setInt16(this.position, value, false);
    this.position += 2;
    this.advanceLengthIfNeeded();
  }

  writeULong(value: number) {
    this.expandBufferIfNeeded(4);
    this.view.setUint32(this.position, value, false);
    this.position += 4;
    this.advanceLengthIfNeeded();
  }

  writeLong(value: number) {
    this.expandBufferIfNeeded(4);
    this.view.setInt32(this.position, value, false);
    this.position += 4;
    this.advanceLengthIfNeeded();
  }

  pad(length: number) {
    this.expandBufferIfNeeded(length);
    for (let i = 0; i < length; i++) this.view.setUint8(this.position++, 0);
    this.advanceLengthIfNeeded();
  }

  seek(position: number) {
    this.position = position;
  }

  getPosition(): number {
    return this.position;
  }

  dataView(): DataView {
    return new DataView(this.array.buffer, 0, this.length);
  }

  result(): Uint8Array {
    const data = this.array.subarray(0, this.length);
    return data;
  }
}

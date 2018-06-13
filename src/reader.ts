export class Reader {
  private view: DataView;
  private position: number;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer);
    this.position = 0;
  }

  private checkBoundary() {
    if (this.position < 0 || this.position > this.view.byteLength)
      throw new Error('Out of position: ' + this.position);
  }

  length(): number {
    return this.view.byteLength;
  }

  readByte(): number {
    const value = this.view.getUint8(this.position);
    this.position += 1;
    this.checkBoundary();
    return value;
  }

  readShort(): number {
    const value = this.view.getInt16(this.position, false);
    this.position += 2;
    this.checkBoundary();
    return value;
  }

  readUShort(): number {
    const value = this.view.getUint16(this.position, false);
    this.position += 2;
    this.checkBoundary();
    return value;
  }

  readLong(): number {
    const value = this.view.getInt32(this.position, false);
    this.position += 4;
    this.checkBoundary();
    return value;
  }

  readULong(): number {
    const value = this.view.getUint32(this.position, false);
    this.position += 4;
    this.checkBoundary();
    return value;
  }

  uint8ArrayFor(offset: number, length: number): Uint8Array {
    if (offset + length > this.view.byteLength) {
      throw new Error('Out of buffer: ' + offset + length);
    }
    return new Uint8Array(this.view.buffer, this.view.byteOffset + offset, length);
  }

  seek(position: number) {
    this.position = position;
    this.checkBoundary();
  }

  skip(amount: number) {
    this.position += amount;
    this.checkBoundary();
  }

  getPosition(): number {
    return this.position;
  }
}

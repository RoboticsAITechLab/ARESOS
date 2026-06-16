export interface ZipItem {
  path: string;
  type: "file" | "directory";
  content: string;
  size: number;
}

const strToUint8Array = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
};

class BufferReader {
  private data: Uint8Array;
  private offset = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  getOffset() {
    return this.offset;
  }

  setOffset(o: number) {
    this.offset = o;
  }

  readUint16(): number {
    if (this.offset + 2 > this.data.length) throw new Error("EOF");
    const val = this.data[this.offset] | (this.data[this.offset + 1] << 8);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    if (this.offset + 4 > this.data.length) throw new Error("EOF");
    const val = (this.data[this.offset] |
                 (this.data[this.offset + 1] << 8) |
                 (this.data[this.offset + 2] << 16) |
                 (this.data[this.offset + 3] << 24)) >>> 0;
    this.offset += 4;
    return val;
  }

  readBytes(length: number): Uint8Array {
    if (this.offset + length > this.data.length) throw new Error("EOF");
    const bytes = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  readString(length: number): string {
    const bytes = this.readBytes(length);
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }
}

async function decompressDeflateRaw(compressedBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    try {
      // Dynamic require to prevent bundler issues in browser
      const req = eval("require");
      const zlib = req("zlib");
      const buf = Buffer.from(compressedBytes);
      const decompressed = zlib.inflateRawSync(buf);
      return new Uint8Array(decompressed);
    } catch (e) {
      throw new Error("DecompressionStream is not available and zlib fallback failed");
    }
  }

  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes as any);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function detectArchiveType(data: string | Uint8Array | ArrayBuffer): "ARESOS" | "STANDARD" | "UNKNOWN" {
  let bytes: Uint8Array;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (typeof data === "string") {
    bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i) & 0xff;
    }
  } else {
    return "UNKNOWN";
  }

  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "STANDARD";
  }

  // Convert first 1000 bytes/chars to string for checking ARESOS JSON content
  let text = "";
  const len = Math.min(bytes.length, 1000);
  for (let i = 0; i < len; i++) {
    text += String.fromCharCode(bytes[i]);
  }

  if (text.startsWith("ARESOS_ARCHIVE") || text.includes('"isZipArchive":true') || text.includes('"isZipArchive": true')) {
    return "ARESOS";
  }

  return "UNKNOWN";
}

export async function parseStandardZip(data: string | Uint8Array | ArrayBuffer): Promise<ZipItem[]> {
  let bytes: Uint8Array;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (typeof data === "string") {
    bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i) & 0xff;
    }
  } else {
    throw new Error("Invalid input data type");
  }

  const reader = new BufferReader(bytes);
  const items: ZipItem[] = [];

  while (reader.getOffset() < bytes.length) {
    const startOffset = reader.getOffset();
    if (startOffset + 4 > bytes.length) break;

    const signature = reader.readUint32();
    if (signature !== 0x04034b50) {
      break;
    }

    reader.readUint16(); // versionNeeded
    reader.readUint16(); // bitFlag
    const compressionMethod = reader.readUint16();
    reader.readUint16(); // lastModTime
    reader.readUint16(); // lastModDate
    reader.readUint32(); // crc32
    const compressedSize = reader.readUint32();
    const uncompressedSize = reader.readUint32();
    const fileNameLength = reader.readUint16();
    const extraFieldLength = reader.readUint16();

    const fileName = reader.readString(fileNameLength);
    reader.readBytes(extraFieldLength);

    const compressedData = reader.readBytes(compressedSize);

    let uncompressedData: Uint8Array;
    if (compressionMethod === 0) {
      uncompressedData = compressedData;
    } else if (compressionMethod === 8) {
      uncompressedData = await decompressDeflateRaw(compressedData);
    } else {
      throw new Error(`unsupported compression method: ${compressionMethod}`);
    }

    const isDirectory = fileName.endsWith("/");
    
    let fileContent = "";
    for (let i = 0; i < uncompressedData.length; i++) {
      fileContent += String.fromCharCode(uncompressedData[i]);
    }

    items.push({
      path: fileName,
      type: isDirectory ? "directory" : "file",
      content: fileContent,
      size: uncompressedSize
    });
  }

  return items;
}

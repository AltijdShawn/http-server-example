import * as net from "node:net";
import * as zlib from 'zlib';
import { performance } from 'perf_hooks';

import { status2CodeNStr, EHTTPStatus } from "../shared/httpStatus";
export { EHTTPStatus, status2CodeNStr }

import { registerRoute, getRoute, Routes } from "./Methods";

const preciseTiming = true;

const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB limit
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];


const confHeaders = [
  'custom-logger',
  'serverside-force-content-length'
];

// Add HTTP/2 specific constants
const HTTP2_PREFACE = 'PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n';
const DEFAULT_WINDOW_SIZE = 65535;
const DEFAULT_MAX_FRAME_SIZE = 16384;

// Add these constants at the top with other constants
const STATIC_TABLE = [
  [':authority', ''],
  [':method', 'GET'],
  [':method', 'POST'],
  [':path', '/'],
  [':path', '/index.html'],
  [':scheme', 'http'],
  [':scheme', 'https'],
  [':status', '200'],
  [':status', '204'],
  [':status', '206'],
  [':status', '304'],
  [':status', '400'],
  [':status', '404'],
  [':status', '500'],
  ['accept-charset', ''],
  ['accept-encoding', 'gzip, deflate'],
  ['accept-language', ''],
  ['accept-ranges', ''],
  ['accept', ''],
  ['access-control-allow-origin', ''],
  ['age', ''],
  ['allow', ''],
  ['authorization', ''],
  ['cache-control', ''],
  ['content-disposition', ''],
  ['content-encoding', ''],
  ['content-language', ''],
  ['content-length', ''],
  ['content-location', ''],
  ['content-range', ''],
  ['content-type', ''],
  ['cookie', ''],
  ['date', ''],
  ['etag', ''],
  ['expect', ''],
  ['expires', ''],
  ['from', ''],
  ['host', ''],
  ['if-match', ''],
  ['if-modified-since', ''],
  ['if-none-match', ''],
  ['if-range', ''],
  ['if-unmodified-since', ''],
  ['last-modified', ''],
  ['link', ''],
  ['location', ''],
  ['max-forwards', ''],
  ['proxy-authenticate', ''],
  ['proxy-authorization', ''],
  ['range', ''],
  ['referer', ''],
  ['refresh', ''],
  ['retry-after', ''],
  ['server', ''],
  ['set-cookie', ''],
  ['strict-transport-security', ''],
  ['transfer-encoding', ''],
  ['user-agent', ''],
  ['vary', ''],
  ['via', ''],
  ['www-authenticate', '']
];

// Add these constants for Huffman coding
const HUFFMAN_CODES = new Uint32Array([
  0x1ff8, 0x7fffd8, 0xfffffe2, 0xfffffe3, 0xfffffe4, 0xfffffe5, 0xfffffe6, 0xfffffe7,
  0xfffffe8, 0xffffea, 0x3ffffffc, 0xfffffe9, 0xfffffea, 0x3ffffffd, 0xfffffeb, 0xfffffec,
  0xfffffed, 0xfffffee, 0xfffffef, 0xffffff0, 0xffffff1, 0xffffff2, 0x3ffffffe, 0xffffff3,
  0xffffff4, 0xffffff5, 0xffffff6, 0xffffff7, 0xffffff8, 0xffffff9, 0xffffffa, 0xffffffb,
  0x14, 0x3f8, 0x3f9, 0xffa, 0x1ff9, 0x15, 0xf8, 0x7fa,
  0x3fa, 0x3fb, 0xf9, 0x7fb, 0xfa, 0x16, 0x17, 0x18,
  0x0, 0x1, 0x2, 0x19, 0x1a, 0x1b, 0x1c, 0x1d,
  0x1e, 0x1f, 0x5c, 0xfb, 0x7ffc, 0x20, 0xffb, 0x3fc,
  0x1ffa, 0x21, 0x5d, 0x5e, 0x5f, 0x60, 0x61, 0x62,
  0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a,
  0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0xfc, 0x73, 0xfd, 0x1ffb, 0x7fff0, 0x1ffc, 0x3ffc, 0x22,
  0x7ffd, 0x3, 0x23, 0x4, 0x24, 0x5, 0x25, 0x26,
  0x27, 0x6, 0x74, 0x75, 0x28, 0x29, 0x2a, 0x7,
  0x2b, 0x76, 0x2c, 0x8, 0x9, 0x2d, 0x77, 0x78,
  0x79, 0x7a, 0x7b, 0x7ffe, 0x7fc, 0x3ffd, 0x1ffd, 0xffffffc,
  0xfffe6, 0x3fffd2, 0xfffe7, 0xfffe8, 0x3fffd3, 0x3fffd4, 0x3fffd5, 0x7fffd9,
  0x3fffd6, 0x7fffda, 0x7fffdb, 0x7fffdc, 0x7fffdd, 0x7fffde, 0xffffeb, 0x7fffdf,
  0xffffec, 0xffffed, 0x3fffd7, 0x7fffe0, 0xffffee, 0x7fffe1, 0x7fffe2, 0x7fffe3,
  0x7fffe4, 0x1fffdc, 0x3fffd8, 0x7fffe5, 0x3fffd9, 0x7fffe6, 0x7fffe7, 0xffffef,
  0x3fffda, 0x1fffdd, 0xfffe9, 0x3fffdb, 0x3fffdc, 0x7fffe8, 0x7fffe9, 0x1fffde,
  0x7fffea, 0x3fffdd, 0x3fffde, 0xfffff0, 0x1fffdf, 0x3fffdf, 0x7fffeb, 0x7fffec,
  0x1fffe0, 0x1fffe1, 0x3fffe0, 0x1fffe2, 0x7fffed, 0x3fffe1, 0x7fffee, 0x7fffef,
  0xfffea, 0x3fffe2, 0x3fffe3, 0x3fffe4, 0x7ffff0, 0x3fffe5, 0x3fffe6, 0x7ffff1,
  0x3ffffe0, 0x3ffffe1, 0xfffeb, 0x7fff1, 0x3fffe7, 0x7ffff2, 0x3fffe8, 0x1ffffec,
  0x3ffffe2, 0x3ffffe3, 0x3ffffe4, 0x7ffffde, 0x7ffffdf, 0x3ffffe5, 0xfffff1, 0x1ffffed,
  0x7fff2, 0x1fffe3, 0x3ffffe6, 0x7ffffe0, 0x7ffffe1, 0x3ffffe7, 0x7ffffe2, 0xfffff2,
  0x1fffe4, 0x1fffe5, 0x3ffffe8, 0x3ffffe9, 0xffffffd, 0x7ffffe3, 0x7ffffe4, 0x7ffffe5,
  0xfffec, 0xfffff3, 0xfffed, 0x1fffe6, 0x3fffe9, 0x1fffe7, 0x1fffe8, 0x7ffff3,
  0x3fffea, 0x3fffeb, 0x1ffffee, 0x1ffffef, 0xfffff4, 0xfffff5, 0x3ffffea, 0x7ffff4,
  0x3ffffeb, 0x7ffffe6, 0x3ffffec, 0x3ffffed, 0x7ffffe7, 0x7ffffe8, 0x7ffffe9, 0x7ffffea,
  0x7ffffeb, 0xffffffe, 0x7ffffec, 0x7ffffed, 0x7ffffee, 0x7ffffef, 0x7fffff0, 0x3ffffee
]);

const HUFFMAN_CODE_LENGTHS = new Uint8Array([
  13, 23, 28, 28, 28, 28, 28, 28, 28, 24, 30, 28, 28, 30, 28, 28,
  28, 28, 28, 28, 28, 28, 30, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  6, 10, 10, 12, 13, 6, 8, 11, 10, 10, 8, 11, 8, 6, 6, 6,
  5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 7, 8, 15, 6, 12, 10,
  13, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 8, 7, 8, 13, 19, 13, 14, 6,
  15, 5, 6, 5, 6, 5, 6, 6, 6, 5, 7, 7, 6, 6, 6, 5,
  6, 7, 6, 5, 5, 6, 7, 7, 7, 7, 7, 15, 11, 14, 13, 28,
  20, 22, 20, 20, 22, 22, 22, 23, 22, 23, 23, 23, 23, 23, 24, 23,
  24, 24, 22, 23, 24, 23, 23, 23, 23, 21, 22, 23, 22, 23, 23, 24,
  22, 21, 20, 22, 22, 23, 23, 21, 23, 22, 22, 24, 21, 22, 23, 23,
  21, 21, 22, 21, 23, 22, 23, 23, 20, 22, 22, 22, 23, 22, 22, 23,
  26, 26, 20, 19, 22, 23, 22, 25, 26, 26, 26, 27, 27, 26, 24, 25,
  19, 21, 26, 27, 27, 26, 27, 24, 21, 21, 26, 26, 28, 27, 27, 27,
  20, 24, 20, 21, 22, 21, 21, 23, 22, 22, 25, 25, 24, 24, 26, 23,
  26, 27, 26, 26, 27, 27, 27, 27, 27, 28, 27, 27, 27, 27, 27, 26
]);

// Add this class to handle bit writing
class BitWriter {
  private buffer: number[] = [];
  private current = 0;
  private count = 0;

  write(bits: number, length: number) {
    this.current = (this.current << length) | bits;
    this.count += length;

    while (this.count >= 8) {
      this.buffer.push((this.current >> (this.count - 8)) & 0xff);
      this.count -= 8;
    }
  }

  finish() {
    if (this.count > 0) {
      this.current <<= (8 - this.count);
      this.buffer.push(this.current & 0xff);
    }
    return Buffer.from(this.buffer);
  }
}

// Add this class to handle bit reading
class BitReader {
  private buffer: Buffer;
  private pos = 0;
  private bits = 0;
  private bitsLeft = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  read(length: number): number {
    while (this.bitsLeft < length) {
      if (this.pos >= this.buffer.length) {
        throw new Error('Unexpected end of buffer');
      }
      this.bits = (this.bits << 8) | this.buffer[this.pos++];
      this.bitsLeft += 8;
    }

    const mask = (1 << length) - 1;
    const value = (this.bits >> (this.bitsLeft - length)) & mask;
    this.bitsLeft -= length;
    return value;
  }
}

// Add new HPACK class
class HPACK {
  private dynamicTable: Array<[string, string]>;
  private dynamicTableSize: number;
  private maxTableSize: number;

  constructor(maxTableSize: number = 4096) {
    this.dynamicTable = [];
    this.dynamicTableSize = 0;
    this.maxTableSize = maxTableSize;
  }

  private getIndexedHeader(index: number): [string, string] | null | string[] {
    if (index <= STATIC_TABLE.length) {
      return STATIC_TABLE[index - 1];
    }
    
    const dynamicIndex = index - STATIC_TABLE.length - 1;
    return this.dynamicTable[dynamicIndex] || null;
  }

  private addToDynamicTable(name: string, value: string) {
    const entrySize = name.length + value.length + 32; // 32 bytes overhead per RFC 7541
    
    // Evict entries if necessary
    while (this.dynamicTableSize + entrySize > this.maxTableSize && this.dynamicTable.length > 0) {
      const [oldName, oldValue] = this.dynamicTable.pop()!;
      this.dynamicTableSize -= oldName.length + oldValue.length + 32;
    }

    // Add new entry if it fits
    if (entrySize <= this.maxTableSize) {
      this.dynamicTable.unshift([name, value]);
      this.dynamicTableSize += entrySize;
    }
  }

  encode(headers: Map<string, string>): Buffer {
    const chunks: Buffer[] = [];

    headers.forEach((value, name) => {
      // Look for exact match in static and dynamic tables
      let index = STATIC_TABLE.findIndex(([n, v]) => n === name && v === value);
      if (index !== -1) {
        // Indexed Header Field
        chunks.push(this.encodeInteger(index + 1, 7, 0x80));
        return;
      }

      // Look for name match
      index = STATIC_TABLE.findIndex(([n]) => n === name);
      if (index !== -1) {
        // Literal Header Field with Indexing
        chunks.push(this.encodeInteger(index + 1, 6, 0x40));
        chunks.push(this.encodeString(value));
        this.addToDynamicTable(name, value);
        return;
      }

      // New header field
      chunks.push(Buffer.from([0x40])); // Literal Header Field with Indexing
      chunks.push(this.encodeString(name));
      chunks.push(this.encodeString(value));
      this.addToDynamicTable(name, value);
    });

    return Buffer.concat(chunks);
  }

  decode(buf: Buffer): Map<string, string> {
    const headers = new Map<string, string>();
    let pos = 0;

    while (pos < buf.length) {
      const firstByte = buf[pos];

      if ((firstByte & 0x80) !== 0) {
        // Indexed Header Field
        const { value: index, bytesRead } = this.decodeInteger(buf.slice(pos), 7);
        pos += bytesRead;

        const header = this.getIndexedHeader(index);
        if (header) {
          headers.set(header[0], header[1]);
        }
      } else if ((firstByte & 0x40) !== 0) {
        // Literal Header Field with Incremental Indexing
        const { value: nameIndex, bytesRead } = this.decodeInteger(buf.slice(pos), 6);
        pos += bytesRead;

        let name: string;
        if (nameIndex > 0) {
          const header = this.getIndexedHeader(nameIndex);
          name = header![0];
        } else {
          const { value: nameStr, bytesRead: nameBytes } = this.decodeString(buf.slice(pos));
          pos += nameBytes;
          name = nameStr;
        }

        const { value: valueStr, bytesRead: valueBytes } = this.decodeString(buf.slice(pos));
        pos += valueBytes;

        headers.set(name, valueStr);
        this.addToDynamicTable(name, valueStr);
      }
      // Add other cases as needed
    }

    return headers;
  }

  private encodeInteger(value: number, prefixBits: number, prefix: number): Buffer {
    const mask = (1 << prefixBits) - 1;
    if (value < mask) {
      return Buffer.from([prefix | value]);
    }

    const chunks: number[] = [prefix | mask];
    value -= mask;
    while (value >= 128) {
      chunks.push((value & 127) | 128);
      value >>>= 7;
    }
    chunks.push(value);
    return Buffer.from(chunks);
  }

  private encodeString(str: string): Buffer {
    const strBuf = Buffer.from(str);
    if (this.shouldUseHuffman(str)) {
      const huffmanEncoded = this.huffmanEncode(strBuf);
      const lenBuf = this.encodeInteger(huffmanEncoded.length, 7, 0x80);
      return Buffer.concat([lenBuf, huffmanEncoded]);
    } else {
      const lenBuf = this.encodeInteger(strBuf.length, 7, 0x00);
      return Buffer.concat([lenBuf, strBuf]);
    }
  }

  private decodeInteger(buf: Buffer, prefixBits: number): { value: number, bytesRead: number } {
    const mask = (1 << prefixBits) - 1;
    let value = buf[0] & mask;
    let bytesRead = 1;

    if (value === mask) {
      let shift = 0;
      do {
        value += (buf[bytesRead] & 127) << shift;
        shift += 7;
        bytesRead++;
      } while ((buf[bytesRead - 1] & 128) !== 0);
    }

    return { value, bytesRead };
  }

  private decodeString(buf: Buffer): { value: string, bytesRead: number } {
    const isHuffman = (buf[0] & 0x80) !== 0;
    const { value: length, bytesRead: lenBytes } = this.decodeInteger(buf, 7);
    const encoded = buf.slice(lenBytes, lenBytes + length);

    return {
      value: isHuffman ? this.huffmanDecode(encoded) : encoded.toString(),
      bytesRead: lenBytes + length
    };
  }

  // Implement Huffman encoding/decoding (simplified version)
  private huffmanEncode(buf: Buffer): Buffer {
    const writer = new BitWriter();
    
    for (let i = 0; i < buf.length; i++) {
      const chr = buf[i];
      const code = HUFFMAN_CODES[chr];
      const length = HUFFMAN_CODE_LENGTHS[chr];
      writer.write(code, length);
    }

    return writer.finish();
  }

  private huffmanDecode(buf: Buffer): string {
    const reader = new BitReader(buf);
    const result: number[] = [];
    let current = 0;
    let bitsLeft = 8;

    try {
      while (true) {
        current = reader.read(bitsLeft);
        
        // Find matching symbol
        let found = false;
        for (let i = 0; i < HUFFMAN_CODES.length; i++) {
          const length = HUFFMAN_CODE_LENGTHS[i];
          if (length <= bitsLeft) {
            const mask = (1 << length) - 1;
            const code = HUFFMAN_CODES[i] & mask;
            
            if (code === (current >> (bitsLeft - length))) {
              result.push(i);
              bitsLeft -= length;
              found = true;
              break;
            }
          }
        }

        if (!found) {
          bitsLeft--;
        }

        if (bitsLeft <= 0) {
          bitsLeft = 8;
        }
      }
    } catch (error) {
      // End of buffer reached
    }

    return Buffer.from(result).toString();
  }

  // Helper method to determine if a string should use Huffman encoding
  private shouldUseHuffman(str: string): boolean {
    let normalSize = str.length;
    let huffmanSize = 0;

    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      huffmanSize += Math.ceil(HUFFMAN_CODE_LENGTHS[chr] / 8);
    }

    return huffmanSize < normalSize;
  }
}

// Frame handling classes
class HTTP2Frame {
  static readonly FRAME_HEADER_SIZE = 9;
  static readonly TYPES = {
    DATA: 0x0,
    HEADERS: 0x1,
    PRIORITY: 0x2,
    RST_STREAM: 0x3,
    SETTINGS: 0x4,
    PUSH_PROMISE: 0x5,
    PING: 0x6,
    GOAWAY: 0x7,
    WINDOW_UPDATE: 0x8,
    CONTINUATION: 0x9
  };

  static readonly FLAGS = {
    NONE: 0x0,
    END_STREAM: 0x1,
    END_HEADERS: 0x4,
    PADDED: 0x8,
    PRIORITY: 0x20
  };

  static createFrame(type: number, flags: number, streamId: number, payload: Buffer): Buffer {
    const header = Buffer.alloc(HTTP2Frame.FRAME_HEADER_SIZE);
    header.writeUIntBE(payload.length, 0, 3);
    header.writeUInt8(type, 3);
    header.writeUInt8(flags, 4);
    header.writeUInt32BE(streamId & 0x7FFFFFFF, 5);
    return Buffer.concat([header, payload]);
  }
}

// Add these constants
const DEFAULT_INITIAL_WINDOW_SIZE = 65535;
const MAX_WINDOW_SIZE = 2147483647; // 2^31 - 1
const MIN_FRAME_SIZE = 16384;

// Add these types
enum StreamState {
  IDLE = 'idle',
  RESERVED_LOCAL = 'reserved-local',
  RESERVED_REMOTE = 'reserved-remote',
  OPEN = 'open',
  HALF_CLOSED_LOCAL = 'half-closed-local',
  HALF_CLOSED_REMOTE = 'half-closed-remote',
  CLOSED = 'closed'
}

type StreamPriority = {
  exclusive: boolean;
  dependencyId: number;
  weight: number;
};

// Rename the enum to avoid conflict
enum HTTP2ErrorCode {
  NO_ERROR = 0x0,
  PROTOCOL_ERROR = 0x1,
  INTERNAL_ERROR = 0x2,
  FLOW_CONTROL_ERROR = 0x3,
  SETTINGS_TIMEOUT = 0x4,
  STREAM_CLOSED = 0x5,
  FRAME_SIZE_ERROR = 0x6,
  REFUSED_STREAM = 0x7,
  CANCEL = 0x8,
  COMPRESSION_ERROR = 0x9,
  CONNECT_ERROR = 0xa,
  ENHANCE_YOUR_CALM = 0xb,
  INADEQUATE_SECURITY = 0xc,
  HTTP_1_1_REQUIRED = 0xd
}

// Update the class to use the new enum name
class HTTP2Error extends Error {
  code: number;
  constructor(message: string, code: HTTP2ErrorCode) {
    super(message);
    this.code = code;
    this.name = 'HTTP2Error';
  }
}

class StreamError extends HTTP2Error {
  streamId: number;
  constructor(message: string, code: number, streamId: number) {
    super(message, code);
    this.streamId = streamId;
    this.name = 'StreamError';
  }
}

// Update HTTP2Stream with error handling
class HTTP2Stream {
  id: number;
  private _state: StreamState;
  windowSize: number;
  remoteWindowSize: number;
  priority: StreamPriority;
  headers: Map<string, string>;
  body: Buffer[];
  pendingData: Buffer[];
  
  constructor(id: number, initialWindowSize: number = DEFAULT_INITIAL_WINDOW_SIZE) {
    this.id = id;
    this._state = StreamState.IDLE;
    this.windowSize = initialWindowSize;
    this.remoteWindowSize = initialWindowSize;
    this.priority = {
      exclusive: false,
      dependencyId: 0,
      weight: 16
    };
    this.headers = new Map();
    this.body = [];
    this.pendingData = [];
  }

  get state(): StreamState {
    return this._state;
  }

  setState(newState: StreamState): void {
    try {
      const validTransitions: Record<StreamState, StreamState[]> = {
        [StreamState.IDLE]: [
          StreamState.RESERVED_LOCAL,
          StreamState.RESERVED_REMOTE,
          StreamState.OPEN,
          StreamState.CLOSED
        ],
        [StreamState.RESERVED_LOCAL]: [
          StreamState.HALF_CLOSED_REMOTE,
          StreamState.CLOSED
        ],
        [StreamState.RESERVED_REMOTE]: [
          StreamState.HALF_CLOSED_LOCAL,
          StreamState.CLOSED
        ],
        [StreamState.OPEN]: [
          StreamState.HALF_CLOSED_LOCAL,
          StreamState.HALF_CLOSED_REMOTE,
          StreamState.CLOSED
        ],
        [StreamState.HALF_CLOSED_LOCAL]: [
          StreamState.CLOSED
        ],
        [StreamState.HALF_CLOSED_REMOTE]: [
          StreamState.CLOSED
        ],
        [StreamState.CLOSED]: []
      };

      if (!validTransitions[this._state].includes(newState)) {
        throw new Error(
          `Invalid state transition from ${this._state} to ${newState}`
        );
      }

      this._state = newState;
    } catch (error) {
      throw new StreamError(
        error.message,
        HTTP2ErrorCode.PROTOCOL_ERROR,
        this.id
      );
    }
  }

  canSendData(): boolean {
    return this.remoteWindowSize > 0 && 
           [StreamState.OPEN, StreamState.HALF_CLOSED_REMOTE].includes(this._state);
  }

  canReceiveData(): boolean {
    return this.windowSize > 0 && 
           [StreamState.OPEN, StreamState.HALF_CLOSED_LOCAL].includes(this._state);
  }

  close(error?: number): void {
    this.setState(StreamState.CLOSED);
    // Clear any pending data
    this.pendingData = [];
    this.body = [];
  }

  updateWindow(increment: number): void {
    const newWindowSize = this.remoteWindowSize + increment;
    if (newWindowSize > MAX_WINDOW_SIZE) {
      throw new Error('Flow control window exceeded maximum size');
    }
    this.remoteWindowSize = newWindowSize;
  }
}

// Add FlowController class
class FlowController {
  private connectionWindowSize: number;
  private streams: Map<number, HTTP2Stream>;
  private priorityTree: Map<number, Set<number>>;
  private readonly maxFrameSize: number;

  constructor(initialWindowSize: number = DEFAULT_INITIAL_WINDOW_SIZE, maxFrameSize: number = MIN_FRAME_SIZE) {
    this.connectionWindowSize = initialWindowSize;
    this.streams = new Map();
    this.priorityTree = new Map();
    this.maxFrameSize = maxFrameSize;
  }

  addStream(stream: HTTP2Stream): void {
    this.streams.set(stream.id, stream);
    this.updatePriorityTree(stream);
  }

  removeStream(streamId: number): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      // Reassign children of removed stream to its parent
      const children = this.priorityTree.get(streamId) || new Set();
      const parent = stream.priority.dependencyId;
      const parentChildren = this.priorityTree.get(parent) || new Set();
      children.forEach(childId => parentChildren.add(childId));
      this.priorityTree.set(parent, parentChildren);
      this.priorityTree.delete(streamId);
      this.streams.delete(streamId);
    }
  }

  updatePriorityTree(stream: HTTP2Stream): void {
    const oldParentChildren = this.priorityTree.get(stream.priority.dependencyId) || new Set();
    oldParentChildren.add(stream.id);
    this.priorityTree.set(stream.priority.dependencyId, oldParentChildren);
  }

  updateConnectionWindow(increment: number): void {
    const newWindowSize = this.connectionWindowSize + increment;
    if (newWindowSize > MAX_WINDOW_SIZE) {
      throw new Error('Flow control window exceeded maximum size');
    }
    this.connectionWindowSize = newWindowSize;
  }

  async sendData(stream: HTTP2Stream, data: Buffer, callback: (frame: Buffer) => Promise<void>): Promise<void> {
    if (!stream.canSendData()) {
      stream.pendingData.push(data);
      return;
    }

    let offset = 0;
    while (offset < data.length) {
      const availableWindow = Math.min(
        stream.remoteWindowSize,
        this.connectionWindowSize,
        this.maxFrameSize
      );

      if (availableWindow <= 0) {
        stream.pendingData.push(data.slice(offset));
        break;
      }

      const chunk = data.slice(offset, offset + availableWindow);
      const frame = HTTP2Frame.createFrame(
        HTTP2Frame.TYPES.DATA,
        offset + availableWindow >= data.length ? HTTP2Frame.FLAGS.END_STREAM : 0,
        stream.id,
        chunk
      );

      await callback(frame);

      offset += chunk.length;
      stream.remoteWindowSize -= chunk.length;
      this.connectionWindowSize -= chunk.length;
    }
  }

  async processPendingData(callback: (frame: Buffer) => Promise<void>): Promise<void> {
    for (const stream of this.streams.values()) {
      while (stream.pendingData.length > 0 && stream.canSendData()) {
        const data = stream.pendingData.shift()!;
        await this.sendData(stream, data, callback);
      }
    }
  }

  getNextStreamToProcess(): HTTP2Stream | null {
    // Implement stream prioritization logic
    const readyStreams = Array.from(this.streams.values())
      .filter(stream => stream.canSendData() && stream.pendingData.length > 0);

    if (readyStreams.length === 0) {
      return null;
    }

    // Sort by weight and dependency
    return this.prioritizeStreams(readyStreams)[0] || null;
  }

  private prioritizeStreams(streams: HTTP2Stream[]): HTTP2Stream[] {
    return streams.sort((a, b) => {
      // Higher weight = higher priority
      if (a.priority.weight !== b.priority.weight) {
        return b.priority.weight - a.priority.weight;
      }

      // Lower stream ID = higher priority
      return a.id - b.id;
    });
  }
}

// Add these interfaces
interface HTTP2Request {
  method: string;
  url: string;
  headers: Map<string, string>;
  body: Buffer;
  stream: HTTP2Stream;
  priority?: StreamPriority;
}

interface HTTP2Response {
  stream: HTTP2Stream;
  headers: Map<string, string>;
  statusCode: number;
  
  // Methods
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
  getHeader(name: string): string | undefined;
  getHeaders(): Map<string, string>;
  setStatus(code: number): void;
  write(chunk: Buffer | string): Promise<void>;
  end(data?: Buffer | string): Promise<void>;
  push(path: string, headers?: Map<string, string>): Promise<HTTP2Stream>;
}

// Add these helper functions at an appropriate location in the file
function normalizeHeaders(headers: Map<string, string>): Map<string, string> {
  const normalized = new Map<string, string>();
  headers.forEach((value, key) => normalized.set(key.toLowerCase(), value));
  return normalized;
}

// Update HTTP2ResponseImpl class
class HTTP2ResponseImpl implements HTTP2Response {
  stream: HTTP2Stream;
  headers: Map<string, string>;
  statusCode: number;
  private connection: HTTP2Connection;
  private headersSent: boolean;
  private ended: boolean;
  private body: Buffer[] = [];
  private contentLength: number = 0;

  constructor(stream: HTTP2Stream, connection: HTTP2Connection) {
    this.stream = stream;
    this.connection = connection;
    this.headers = new Map();
    this.statusCode = 200;
    this.headersSent = false;
    this.ended = false;
  }

  setHeader(name: string, value: string): void {
    if (this.headersSent) {
      throw new Error('Cannot set headers after they are sent');
    }
    this.headers.set(name.toLowerCase(), value);
  }

  removeHeader(name: string): void {
    if (this.headersSent) {
      throw new Error('Cannot remove headers after they are sent');
    }
    this.headers.delete(name.toLowerCase());
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  getHeaders(): Map<string, string> {
    return new Map(this.headers);
  }

  setStatus(code: number): void {
    if (this.headersSent) {
      throw new Error('Cannot set status after headers are sent');
    }
    this.statusCode = code;
  }

  async write(chunk: Buffer | string): Promise<void> {
    if (this.ended) {
      throw new Error('Cannot write after end');
    }

    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.body.push(data);
    this.contentLength += data.length;

    if (!this.headersSent) {
      this.setHeader('content-length', this.contentLength.toString());
    } else {
      await this.connection.sendData(this.stream, data);
    }
  }

  async end(data?: Buffer | string): Promise<void> {
    if (this.ended) {
      return;
    }

    if (data) {
      await this.write(data);
    }

    // Set default headers if not already set
    if (!this.headers.has('content-type')) {
      this.setHeader('content-type', 'text/plain');
    }
    if (!this.headers.has('date')) {
      this.setHeader('date', new Date().toUTCString());
    }

    // Send headers if not sent yet
    if (!this.headersSent) {
      this.setHeader('content-length', this.contentLength.toString());
      await this.sendHeaders(this.body.length === 0);
    }

    // Send accumulated body if any
    if (this.body.length > 0) {
      const fullBody = Buffer.concat(this.body);
      await this.connection.sendData(this.stream, fullBody, true);
    } else if (!this.headersSent) {
      // If no body and headers not sent, send headers with END_STREAM
      await this.sendHeaders(true);
    }

    this.ended = true;
    this.updateStreamState();
  }

  private updateStreamState(): void {
    if (this.stream.state === StreamState.OPEN) {
      this.stream.setState(StreamState.HALF_CLOSED_LOCAL);
    } else if (this.stream.state === StreamState.HALF_CLOSED_REMOTE) {
      this.stream.setState(StreamState.CLOSED);
    }
  }

  private async sendHeaders(endStream: boolean = false): Promise<void> {
    if (this.headersSent) {
      return;
    }

    const headersList = new Map([
      [':status', this.statusCode.toString()],
      ...normalizeHeaders(this.headers)
    ]);

    await this.connection.sendHeaders(this.stream, headersList, endStream);
    this.headersSent = true;
  }

  async push(path: string, headers?: Map<string, string>): Promise<HTTP2Stream> {
    if (this.stream.state !== 'open' && this.stream.state !== 'half-closed-remote') {
      throw new Error('Cannot push on this stream');
    }

    return await this.connection.pushStream(this.stream.id, path, headers);
  }
}

// Update HTTP2Connection with error handling
class HTTP2Connection {
  private socket: net.Socket;
  private streams: Map<number, HTTP2Stream>;
  private nextStreamId: number;
  private hpack: HPACK;
  private flowController: FlowController;
  
  constructor(socket: net.Socket, fallback: IRespObj) {
    this.socket = socket;
    this.streams = new Map();
    this.nextStreamId = 1;
    this.hpack = new HPACK();
    this.flowController = new FlowController();
    this.setupConnection(fallback);
  }

  private setupConnection(fallback: IRespObj): void {
    let buffer = Buffer.alloc(0);
    
    this.socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      this.processFrames(buffer, fallback);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.socket.destroy();
    });
  }

  private processFrames(buffer: Buffer, fallback: IRespObj): void {
    while (buffer.length >= HTTP2Frame.FRAME_HEADER_SIZE) {
      const length = buffer.readUIntBE(0, 3);
      const frameSize = HTTP2Frame.FRAME_HEADER_SIZE + length;
      
      if (buffer.length < frameSize) break;

      const frame = buffer.slice(0, frameSize);
      buffer = buffer.slice(frameSize);

      const type = frame[3];
      const flags = frame[4];
      const streamId = frame.readUInt32BE(5) & 0x7FFFFFFF;
      const payload = frame.slice(HTTP2Frame.FRAME_HEADER_SIZE);

      this.handleFrame(type, flags, streamId, payload, fallback);
    }
  }

  private handleFrame(type: number, flags: number, streamId: number, payload: Buffer, fallback: IRespObj): void {
    let stream = this.streams.get(streamId);
    if (!stream && type !== HTTP2Frame.TYPES.SETTINGS) {
      stream = new HTTP2Stream(streamId);
      this.streams.set(streamId, stream);
      this.flowController.addStream(stream);
    }

    switch (type) {
      case HTTP2Frame.TYPES.HEADERS:
        this.handleHeaders(stream!, payload, flags, fallback);
        break;
      // Add other frame type handlers as needed
    }
  }

  async sendHeaders(stream: HTTP2Stream, headers: Map<string, string>, endStream: boolean = false): Promise<void> {
    const encodedHeaders = this.hpack.encode(headers);
    const flags = HTTP2Frame.FLAGS.END_HEADERS | (endStream ? HTTP2Frame.FLAGS.END_STREAM : 0);
    
    const frame = HTTP2Frame.createFrame(
      HTTP2Frame.TYPES.HEADERS,
      flags,
      stream.id,
      encodedHeaders
    );

    await this.socket.write(frame);
  }

  async sendData(stream: HTTP2Stream, data: Buffer, endStream: boolean = false): Promise<void> {
    await this.flowController.sendData(stream, data, async (frame: Buffer) => {
      if (endStream) {
        const flags = frame.readUInt8(4) | HTTP2Frame.FLAGS.END_STREAM;
        frame.writeUInt8(flags, 4);
      }
      await this.socket.write(frame);
    });
  }

  async pushStream(parentStreamId: number, path: string, headers?: Map<string, string>): Promise<HTTP2Stream> {
    const newStreamId = this.nextStreamId;
    this.nextStreamId += 2;

    const stream = new HTTP2Stream(newStreamId);
    this.streams.set(newStreamId, stream);
    this.flowController.addStream(stream);

    // Send PUSH_PROMISE frame
    const promiseHeaders = new Map([
      [':path', path],
      ...(headers || new Map())
    ]);

    const encodedHeaders = this.hpack.encode(promiseHeaders);
    const streamIdBuffer = Buffer.alloc(4);
    streamIdBuffer.writeUInt32BE(newStreamId, 0);

    const pushPromiseFrame = HTTP2Frame.createFrame(
      HTTP2Frame.TYPES.PUSH_PROMISE,
      HTTP2Frame.FLAGS.END_HEADERS,
      parentStreamId,
      Buffer.concat([
        streamIdBuffer,
        encodedHeaders
      ])
    );

    await this.socket.write(pushPromiseFrame);
    return stream;
  }

  private async handleHeaders(stream: HTTP2Stream, payload: Buffer, flags: number, fallback: IRespObj) {
    try {
      const headers = this.hpack.decode(payload);
      stream.headers = headers;
      
      if (stream.state === StreamState.IDLE) {
        stream.setState(StreamState.OPEN);
      }

      if (flags & HTTP2Frame.FLAGS.END_STREAM) {
        if (stream.state === StreamState.OPEN) {
          stream.setState(StreamState.HALF_CLOSED_REMOTE);
        } else if (stream.state === StreamState.HALF_CLOSED_LOCAL) {
          stream.setState(StreamState.CLOSED);
        }
      }

      if (flags & HTTP2Frame.FLAGS.END_HEADERS) {
        const request: HTTP2Request = {
          method: headers.get(':method') || 'GET',
          url: headers.get(':path') || '/',
          headers,
          body: Buffer.concat(stream.body),
          stream,
          priority: stream.priority
        };

        const response = new HTTP2ResponseImpl(stream, this);
        await this.handleRequest(request, response, fallback);
      }
    } catch (error) {
      console.error('Error processing headers:', error);
      stream.close(0x2); // PROTOCOL_ERROR
      await this.sendGoaway(stream.id, 0x2);
    }
  }

  private async handleRequest(request: HTTP2Request, response: HTTP2Response, fallback: IRespObj): Promise<void> {
    try {
      // Your existing request handling logic
      const handler = await getRoute(request.method, request.url) || fallback;
      await handler.handler(request, response);
    } catch (error) {
      console.error('Error handling request:', error);
      response.setStatus(500);
      await response.end('Internal Server Error');
    }
  }

  private async sendGoaway(lastStreamId: number, errorCode: number): Promise<void> {
    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(lastStreamId, 0);
    payload.writeUInt32BE(errorCode, 4);
    
    await this.socket.write(HTTP2Frame.createFrame(
      HTTP2Frame.TYPES.GOAWAY,
      HTTP2Frame.FLAGS.NONE,
      0,
      payload
    ));
  }

  private async handleError(error: Error | HTTP2Error | StreamError) {
    console.error('HTTP/2 connection error:', error);

    if (error instanceof StreamError) {
      // Send RST_STREAM frame for stream-specific errors
      await this.sendRstStream(error.streamId, error.code);
    } else if (error instanceof HTTP2Error) {
      // Send GOAWAY frame for connection-level errors
      await this.sendGoaway(this.getLastProcessedStreamId(), error.code);
      this.socket.destroy();
    } else {
      // Unknown error - send GOAWAY with internal error
      await this.sendGoaway(this.getLastProcessedStreamId(), HTTP2ErrorCode.INTERNAL_ERROR);
      this.socket.destroy();
    }
  }

  private async sendRstStream(streamId: number, errorCode: number): Promise<void> {
    const payload = Buffer.alloc(4);
    payload.writeUInt32BE(errorCode, 0);
    
    const frame = HTTP2Frame.createFrame(
      HTTP2Frame.TYPES.RST_STREAM,
      HTTP2Frame.FLAGS.NONE,
      streamId,
      payload
    );

    try {
      await this.socket.write(frame);
    } catch (error) {
      console.error('Failed to send RST_STREAM:', error);
    }
  }

  private getLastProcessedStreamId(): number {
    return Math.max(...Array.from(this.streams.keys()), 0);
  }
}

function matchRoute(requestPath: string, routePath: string): {matches: boolean, params?: {[key: string]: string}} {
  const requestParts = requestPath.split('/');
  const routeParts = routePath.split('/');

  if (requestParts.length !== routeParts.length) {
    return { matches: false };
  }

  const params: {[key: string]: string} = {};

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      // This is a parameter
      const paramName = routeParts[i].slice(1);
      params[paramName] = requestParts[i];
    } else if (routeParts[i] !== requestParts[i]) {
      return { matches: false };
    }
  }

  return { matches: true, params };
}

interface CORSOptions {
  origin?: string;
  methods?: string;
  credentials?: boolean;
  maxAge?: number;
  allowHeaders?: string;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly window: number;

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.limit = limit;
    this.window = windowMs;
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(time => now - time < this.window);
    
    if (validTimestamps.length >= this.limit) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return true;
  }
}

// const rateLimiter = new RateLimiter();

export async function createWebServer(requestHandlers: IRequestHandler[], middlewares: any[] = [], dontPreserveConfigHeaders = false) {
  const DPCH = dontPreserveConfigHeaders;
  
  const server = net.createServer();
  server.on("connection", (socket) => {
    socket.once("readable", async () => {
      const firstChunk = socket.read(24);
      
      if (firstChunk && firstChunk.toString() === HTTP2_PREFACE) {
        // HTTP/2 connection
        new HTTP2Connection(socket, fallback);
      } else {
        // Your existing HTTP/1.1 handling
        socket.unshift(firstChunk);
        handleConnection(socket);
      }
    });
  });

  if (!Array.isArray(requestHandlers)) {
    throw new Error("[Failed to register requestHandlers]\n-----------\nthe parameter is not an array type\n-----------");
  }

  for (const ReqHandler_ of requestHandlers) {
    if (ReqHandler_.route == undefined || ReqHandler_.handler == undefined) {
      throw new Error(`[Failed to register requestHandler]\n-----------\nHandler of: ${ReqHandler_} is missing some parameters!\n-----------`);
    }
    const { route, status, handler, method } = ReqHandler_;
    const RespObj: IRespObj = status == undefined ? { status: false, handler, method } : { status, handler, method };
    registerRoute(method, route, RespObj);
  }

  let fallback: IRespObj;

  if (!Routes.has("*") && !Routes.has("fallback")) {
    registerRoute('ALL', '*', {
      status: EHTTPStatus.NOT_FOUND,
      handler: function (req, res) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("serverside-force-content-length", "true");
        res.setStatus(404);
        res.end(`CANNOT GET '${req.url}', RETURNED 404`);
      },
      method: "ALL"
    });
  }

  const test_star = Routes.has("*");
  const test_fallback = Routes.has("fallback");

  if (test_star) {
    fallback = await getRoute('ALL', '*');
  } else if (test_fallback) {
    fallback = await getRoute('ALL', 'fallback');
  } else {
    console.log("testing fallback routes, failed, starting get-process");
    throw new Error("Failed to auto assign fallback, please contact the developer");
  }

  return {
    listen: (port: number, cb: (port: number, _: net.Server) => void) =>
      cb(port, server.listen(port)),
  };
}

export interface IRequestHandler extends IRespObj {
  route: string;
}

export interface IRespObj {
  status?: EHTTPStatus | boolean;
  handler: (req, res) => any;
  method: string;
}

interface IPrefKeys {
  get: string;
  post: string;
  all: string;
}

async function handleConnection(socket: net.Socket) {
  // Basic HTTP/1.1 handling
  let data = '';
  socket.on('data', chunk => {
    data += chunk;
    if (data.includes('\r\n\r\n')) {
      // Process HTTP/1.1 request
      // This is just a placeholder - you'll need to implement your HTTP/1.1 logic
      socket.end('HTTP/1.1 200 OK\r\n\r\nHello World');
    }
  });
}
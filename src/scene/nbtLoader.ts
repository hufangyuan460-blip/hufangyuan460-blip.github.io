/**
 * Lightweight browser-native Minecraft Java Edition .nbt Structure Loader
 * Supports gzip-compressed NBT via native DecompressionStream('gzip').
 */

export interface NbtPaletteEntry {
  name: string;
  properties: Record<string, string>;
}

export interface NbtBlockEntry {
  pos: [number, number, number];
  state: number;
}

export interface ParsedNbtStructure {
  size: [number, number, number];
  dataVersion: number;
  palette: NbtPaletteEntry[];
  blocks: NbtBlockEntry[];
}

class NbtReader {
  private view: DataView;
  private bytes: Uint8Array;
  private offset = 0;
  private decoder = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  private readByte(): number {
    return this.view.getInt8(this.offset++);
  }

  private readUByte(): number {
    return this.view.getUint8(this.offset++);
  }

  private readShort(): number {
    const val = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return val;
  }

  private readUShort(): number {
    const val = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return val;
  }

  private readInt(): number {
    const val = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return val;
  }

  private readLong(): bigint {
    const hi = BigInt(this.view.getInt32(this.offset, false));
    const lo = BigInt(this.view.getUint32(this.offset + 4, false));
    this.offset += 8;
    return (hi << 32n) | lo;
  }

  private readFloat(): number {
    const val = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return val;
  }

  private readDouble(): number {
    const val = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return val;
  }

  private readString(): string {
    const len = this.readUShort();
    const slice = this.bytes.subarray(this.offset, this.offset + len);
    this.offset += len;
    return this.decoder.decode(slice);
  }

  private readPayload(tagType: number): unknown {
    switch (tagType) {
      case 1:
        return this.readByte();
      case 2:
        return this.readShort();
      case 3:
        return this.readInt();
      case 4:
        return this.readLong();
      case 5:
        return this.readFloat();
      case 6:
        return this.readDouble();
      case 7: {
        const len = this.readInt();
        const arr = this.bytes.slice(this.offset, this.offset + len);
        this.offset += len;
        return arr;
      }
      case 8:
        return this.readString();
      case 9: {
        const elemType = this.readUByte();
        const len = this.readInt();
        const list: unknown[] = new Array(Math.max(0, len));
        for (let i = 0; i < len; i++) {
          list[i] = this.readPayload(elemType);
        }
        return list;
      }
      case 10: {
        const obj: Record<string, unknown> = {};
        while (true) {
          const childType = this.readUByte();
          if (childType === 0) break;
          const key = this.readString();
          obj[key] = this.readPayload(childType);
        }
        return obj;
      }
      case 11: {
        const len = this.readInt();
        const ints = new Int32Array(len);
        for (let i = 0; i < len; i++) ints[i] = this.readInt();
        return ints;
      }
      case 12: {
        const len = this.readInt();
        const longs: bigint[] = new Array(len);
        for (let i = 0; i < len; i++) longs[i] = this.readLong();
        return longs;
      }
      default:
        throw new Error(`Unsupported NBT tag type: ${tagType}`);
    }
  }

  parseRoot(): Record<string, unknown> {
    const rootType = this.readUByte();
    if (rootType !== 10) {
      throw new Error(`Expected NBT root Compound (10), got ${rootType}`);
    }
    this.readString(); // root name
    return this.readPayload(10) as Record<string, unknown>;
  }
}

async function maybeGunzip(rawBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(rawBuffer);
  // Check standard gzip magic bytes 0x1f 0x8b
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser does not support DecompressionStream("gzip")');
    }
    const ds = new DecompressionStream('gzip');
    const stream = new Response(rawBuffer).body!.pipeThrough(ds);
    return await new Response(stream).arrayBuffer();
  }
  return rawBuffer;
}

export function parseNbtBuffer(uncompressedBuffer: ArrayBuffer): ParsedNbtStructure {
  const reader = new NbtReader(uncompressedBuffer);
  const root = reader.parseRoot();

  const rawSize = (root.size as number[] | undefined) ?? [0, 0, 0];
  const size: [number, number, number] = [
    Number(rawSize[0] ?? 0),
    Number(rawSize[1] ?? 0),
    Number(rawSize[2] ?? 0),
  ];
  const dataVersion = Number(root.DataVersion ?? 0);

  const rawPalette = (root.palette as Array<Record<string, unknown>> | undefined) ?? [];
  const palette: NbtPaletteEntry[] = rawPalette.map((entry) => {
    const name = String(entry.Name ?? 'minecraft:air');
    const rawProps = (entry.Properties as Record<string, unknown> | undefined) ?? {};
    const properties: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawProps)) {
      properties[k] = String(v);
    }
    return { name, properties };
  });

  const rawBlocks = (root.blocks as Array<Record<string, unknown>> | undefined) ?? [];
  const blocks: NbtBlockEntry[] = rawBlocks.map((b) => {
    const p = b.pos as number[];
    return {
      pos: [Number(p[0]), Number(p[1]), Number(p[2])],
      state: Number(b.state),
    };
  });

  return { size, dataVersion, palette, blocks };
}

export async function fetchNbtStructure(url: string): Promise<ParsedNbtStructure> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch NBT structure (${res.status}): ${url}`);
  }
  const raw = await res.arrayBuffer();
  const uncompressed = await maybeGunzip(raw);
  return parseNbtBuffer(uncompressed);
}

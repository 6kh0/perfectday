/**
 * Export the player cat from src/game/sprites.ts as PNG.
 *
 *   bun scripts/export-cat.ts                  # cat.png + cat-sheet.png, 1:1
 *   bun scripts/export-cat.ts --scale 10       # same, 10x bigger
 *   bun scripts/export-cat.ts --out art        # write somewhere else
 *
 * The sprites are imported, not parsed, so this always matches the game.
 */
import { deflateSync } from "node:zlib";
import {
  PLAYER_DOWN,
  PLAYER_PALETTE,
  PLAYER_SIDE,
  PLAYER_UP,
  type Bitmap,
  type Palette,
} from "../src/game/sprites";

type RGBA = [number, number, number, number];

const CLEAR: RGBA = [0, 0, 0, 0];

function parseColor(hex: string): RGBA {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

/** lay bitmaps out left to right, each padded to the tallest */
function compose(sprites: Bitmap[], palette: Palette, scale: number): RGBA[][] {
  const colors = Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [k, parseColor(v)]),
  ) as Record<string, RGBA>;
  const height = Math.max(...sprites.map(s => s.length));
  const width = sprites.reduce((n, s) => n + s[0]!.length, 0);
  const pixels: RGBA[][] = Array.from({ length: height * scale }, () =>
    Array.from({ length: width * scale }, () => CLEAR),
  );
  let offset = 0;
  for (const sprite of sprites) {
    sprite.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = colors[ch];
        if (!color) return; // "." is transparent
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            pixels[y * scale + dy]![(offset + x) * scale + dx] = color;
          }
        }
      });
    });
    offset += sprite[0]!.length;
  }
  return pixels;
}

function encodePng(pixels: RGBA[][]): Uint8Array {
  const height = pixels.length;
  const width = pixels[0]!.length;
  const raw = new Uint8Array(height * (width * 4 + 1));
  let i = 0;
  for (const row of pixels) {
    raw[i++] = 0; // filter: none
    for (const [r, g, b, a] of row) {
      raw[i++] = r;
      raw[i++] = g;
      raw[i++] = b;
      raw[i++] = a;
    }
  }

  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(data.length + 12);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(data.length + 8, crc32(out.subarray(4, data.length + 8)));
    return out;
  };

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    png.set(part, at);
    at += part.length;
  }
  return png;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---------- run ---------- */

const args = Bun.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const scale = Math.max(1, Number(flag("scale", "1")));
const outDir = flag("out", ".");

const files: [string, Bitmap[]][] = [
  ["cat.png", [PLAYER_DOWN]],
  ["cat-sheet.png", [PLAYER_DOWN, PLAYER_UP, PLAYER_SIDE]],
];

for (const [name, sprites] of files) {
  const pixels = compose(sprites, PLAYER_PALETTE, scale);
  const path = `${outDir}/${name}`;
  await Bun.write(path, encodePng(pixels));
  console.log(`${path}  ${pixels[0]!.length}x${pixels.length}px` + (scale > 1 ? ` (${scale}x)` : ""));
}

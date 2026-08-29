/** Pixel art: every sprite is an array of equal-length strings, one char per pixel. */

export type Bitmap = string[];
export type Palette = Record<string, string>;


export const CHAR_DOWN: Bitmap = [
  "..oooo..",
  ".ohhhho.",
  "ohhhhhho",
  "ohhhhhho",
  "ohssssho",
  "osesseso",
  "okssssko",
  ".osssso.",
  ".obbbbo.",
  "sbbbbbbs",
  "sbbbbbbs",
  ".obbbbo.",
  ".oppppo.",
  ".op..po.",
  ".oo..oo.",
];

export const CHAR_UP: Bitmap = [
  "..oooo..",
  ".ohhhho.",
  "ohhhhhho",
  "ohhhhhho",
  "ohhhhhho",
  "ohhhhhho",
  "ohhhhhho",
  ".ohhhho.",
  ".obbbbo.",
  "sbbbbbbs",
  "sbbbbbbs",
  ".obbbbo.",
  ".oppppo.",
  ".op..po.",
  ".oo..oo.",
];

export const CHAR_SIDE: Bitmap = [
  "..oooo..",
  ".ohhhho.",
  ".ohhhhho",
  ".ohhhhho",
  ".ohhssho",
  ".ohsesho",
  ".ohsssho",
  "..ossso.",
  "..obbbo.",
  "..obbbbs",
  "..obbbbs",
  "..obbbo.",
  "..opppo.",
  "..op.po.",
  "..oo.oo.",
];

/** Palette keys: o outline, h hair, s skin, e eye, k blush, b shirt, p pants */
export function charPalette(hair: string, shirt: string, pants: string, skin = "#ffcf9e"): Palette {
  return {
    o: "#4a3524",
    h: hair,
    s: skin,
    e: "#3b2a1c",
    k: "#ff9fb0",
    b: shirt,
    p: pants,
  };
}

export const PLAYER_PALETTE = charPalette("#6b4a8f", "#ff8fa3", "#4a6fd4");

/* ---------- cat: 8 wide x 8 tall ---------- */

export const CAT: Bitmap = [
  "oo....oo",
  "ofo..ofo",
  ".offffo.",
  ".ofefeo.",
  ".offnfo.",
  ".offffo.",
  "offffffo",
  ".o.oo.o.",
];

export function catPalette(fur: string): Palette {
  return { o: "#4a3524", f: fur, e: "#3b2a1c", n: "#ff9fb0" };
}

/* ---------- duck: 8 wide x 6 tall ---------- */

export const DUCK: Bitmap = [
  "...ooo..",
  "..obeo..",
  "..obbo..",
  "obbbbbo.",
  "obbbbbbo",
  ".oo..oo.",
];

export const DUCK_PALETTE: Palette = {
  o: "#4a3524",
  b: "#f5f0e2",
  e: "#3b2a1c",
};

/* ---------- 8x8 sign icons: 1/2/3/4 are palette slots ---------- */

export const ICONS: Record<string, { bmp: Bitmap; pal: Palette }> = {
  home: {
    bmp: [
      "........",
      "...11...",
      "..1111..",
      ".111111.",
      "11111111",
      ".222222.",
      ".223322.",
      ".223322.",
    ],
    pal: { "1": "#e2705f", "2": "#fbe6c8", "3": "#8a5a3b" },
  },
  diner: {
    bmp: [
      "........",
      "..2222..",
      ".222222.",
      ".333333.",
      ".111111.",
      ".222222.",
      "..2222..",
      "........",
    ],
    pal: { "1": "#a05a2c", "2": "#f0b96b", "3": "#7bd06b" },
  },
  arcade: {
    bmp: [
      "........",
      "...11...",
      "...22...",
      "...22...",
      ".333333.",
      "33333333",
      ".333333.",
      "........",
    ],
    pal: { "1": "#ff5d73", "2": "#cfd6e6", "3": "#4a6fd4" },
  },
  catcafe: {
    bmp: [
      "........",
      ".1....1.",
      ".11..11.",
      ".111111.",
      ".121121.",
      ".111111.",
      "..1331..",
      "........",
    ],
    pal: { "1": "#f0a860", "2": "#3b2a1c", "3": "#ff9fb0" },
  },
  cinema: {
    bmp: [
      "........",
      ".111111.",
      ".212121.",
      ".121212.",
      ".333333.",
      ".333333.",
      ".333333.",
      "........",
    ],
    pal: { "1": "#3b3350", "2": "#f4f1ff", "3": "#8f7de8" },
  },
  park: {
    bmp: [
      "........",
      "..3333..",
      ".333333.",
      "33333333",
      ".333333.",
      "...44...",
      "...44...",
      "........",
    ],
    pal: { "3": "#5eb356", "4": "#8a5a3b" },
  },
};

/* ---------- drawing ---------- */

export function drawBitmap(
  ctx: CanvasRenderingContext2D,
  bmp: Bitmap,
  pal: Palette,
  px: number,
  py: number,
  flip = false,
) {
  for (let r = 0; r < bmp.length; r++) {
    const row = bmp[r]!;
    for (let c = 0; c < row.length; c++) {
      const color = pal[row[c]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px + (flip ? row.length - 1 - c : c), py + r, 1, 1);
    }
  }
}

/** Pixel art: every sprite is an array of equal-length strings, one char per pixel. */

export type Bitmap = string[];
export type Palette = Record<string, string>;


/* ---------- the player: a strawberry cat, 15 wide x 21 tall ----------
   Redrawn from the reference art (44x61) down to world scale; palette taken
   from it verbatim. */

export const PLAYER_DOWN: Bitmap = [
  ".......o.......",
  ".oo..ogggo..oo.",
  ".olo.ogdgo.olo.",
  ".olpoooooooplo.",
  ".olprrrrrrrplo.",
  ".orrrrryrrrrro.",
  ".orrlllllllrro.",
  ".orrlelllelrro.",
  ".orrlllllllrro.",
  ".orrpllpllprro.",
  ".orrllelellrro.",
  "..orlllllllro..",
  "..oorlllllrooo.",
  "..orrrrrrrroro.",
  ".orrryrrrrrorro",
  "orryrrrrrrrorro",
  "orrrrryrrrrokko",
  "orryrrrrryroko.",
  "orrlllrlllrroo.",
  ".orlllrlllro...",
  "..ooooooooo....",
];

export const PLAYER_UP: Bitmap = [
  ".......o.......",
  ".oo..ogggo..oo.",
  ".olo.ogdgo.olo.",
  ".ollooooooollo.",
  ".ollrrrrrrrllo.",
  ".orrrrryrrrrro.",
  ".orrrrrrrrrrro.",
  ".orrrryrrrrrro.",
  ".orrrrrrrryrro.",
  ".orryrrrrrrrro.",
  ".orrrrrryrrrro.",
  "..orrrrrrrrro..",
  "..oorrrrrrrooo.",
  "..orrrrrrrroro.",
  ".orrryrrrrrorro",
  "orryrrrrrrrorro",
  "orrrrryrrrrokko",
  "orryrrrrryroko.",
  "orrlllrlllrroo.",
  ".orlllrlllro...",
  "..ooooooooo....",
];

export const PLAYER_SIDE: Bitmap = [
  ".......o.......",
  ".oo..ogggo..oo.",
  ".olo.ogdgo.olo.",
  ".olpoooooooplo.",
  ".olprrrrrrrplo.",
  ".orrrrryrrrrro.",
  ".orrrlllllllro.",
  ".orrrlelllllo..",
  ".orrrllllllplo.",
  ".orrrlllleello.",
  ".orrrllllllllo.",
  "..orrllllllro..",
  "oooorrllllroo..",
  "okkrrrrrrrro...",
  "orkrryrrrrro...",
  "orryrrrrrrro...",
  "orrrrryrrrro...",
  "okryrrrrryro...",
  "orrlllrlllrro..",
  ".orlllrlllro...",
  "..ooooooooo....",
];

/** Same sprite, different fruit: body/shade/dot colour the hat and coat, fur the face. */
export function fruitPalette(body: string, shade: string, dot: string, fur: string): Palette {
  return {
    o: "#0f0f0f",
    r: body,
    k: shade,
    y: dot,
    l: fur,
    p: "#ff9a9a",
    g: "#4c8241",
    d: "#345e2a",
    e: "#000000",
  };
}

/** Palette keys: o outline, r strawberry, k shadow, y seed, l fur, p blush, g leaf, d leaf shadow, e eye */
export const PLAYER_PALETTE: Palette = {
  o: "#0f0f0f",
  r: "#ff3014",
  k: "#cf2711",
  y: "#ffd014",
  l: "#fffde3",
  p: "#ff9a9a",
  g: "#4c8241",
  d: "#345e2a",
  e: "#000000",
};

/* ---------- cat: 8 wide x 8 tall ---------- */

export const CAT: Bitmap = [
  "oo......oo",
  "ofo....ofo",
  ".offffffo.",
  ".ofeffefo.",
  ".offnnffo.",
  ".offffffo.",
  "offffffffo",
  "offffffffo",
  ".oo.oo.oo.",
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

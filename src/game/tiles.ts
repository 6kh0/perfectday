/** Tile painting. Every scene is a grid of chars; each char knows how to paint itself. */

export const T = 16; // tile size in game pixels

/** chars the player cannot walk through */
export const SOLID = new Set("TB~flnHmVKC#-tbvASEpX".split(""));

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type Ctx = CanvasRenderingContext2D;
type Neighbor = (dx: number, dy: number) => string;

const px = (ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/* ---------- shared bits ---------- */

function grass(ctx: Ctx, x: number, y: number, r: number) {
  px(ctx, r < 0.5 ? "#7ec850" : "#79c34b", x, y, T, T);
  const n = Math.floor(r * 4);
  for (let i = 0; i < n; i++) {
    const bx = x + Math.floor(hash(x + i * 7, y) * (T - 3));
    const by = y + Math.floor(hash(x, y + i * 11) * (T - 2));
    px(ctx, "#6bb544", bx, by + 1, 3, 1);
    px(ctx, "#6bb544", bx + 1, by, 1, 1);
  }
}

function woodFloor(ctx: Ctx, x: number, y: number, tx: number, ty: number) {
  px(ctx, "#c9a06a", x, y, T, T);
  px(ctx, "#bf9159", x, y + 7, T, 1);
  px(ctx, "#bf9159", x, y + 15, T, 1);
  const off = ty % 2 === 0 ? 0 : 8;
  px(ctx, "#b0864f", x + ((off + 4) % 16), y, 1, 8);
  px(ctx, "#b0864f", x + ((off + 12) % 16), y + 8, 1, 8);
  if (hash(tx, ty) < 0.3) px(ctx, "#d3ac78", x + 2, y + 3, 6, 1);
}

/* ---------- painters ---------- */

const painters: Record<string, (c: Ctx, x: number, y: number, r: number, n: Neighbor, tx: number, ty: number) => void> = {
  // --- outdoor ---
  ".": (c, x, y, r) => grass(c, x, y, r),
  ",": (c, x, y, r) => {
    grass(c, x, y, r);
    const colors = ["#ff7ab8", "#fff27a", "#8fd3ff", "#ffffff", "#c99bff"];
    const col = colors[Math.floor(r * colors.length)]!;
    const fx = x + 3 + Math.floor(r * 8);
    const fy = y + 4 + Math.floor(r * 7);
    px(c, col, fx, fy - 1);
    px(c, col, fx - 1, fy, 3, 1);
    px(c, col, fx, fy + 1);
    px(c, "#ffd93d", fx, fy);
  },
  "=": (c, x, y, r, n) => {
    px(c, "#e3c795", x, y, T, T);
    for (let i = 0; i < 5; i++) {
      const sx = x + Math.floor(hash(x + i, y * 3) * T);
      const sy = y + Math.floor(hash(x * 3, y + i) * T);
      px(c, hash(sx, sy) < 0.5 ? "#d5b57f" : "#eed6ab", sx, sy);
    }
    if (n(0, -1) !== "=") px(c, "#d5b57f", x, y, T, 1);
    if (n(0, 1) !== "=") px(c, "#d5b57f", x, y + 15, T, 1);
    if (n(-1, 0) !== "=") px(c, "#d5b57f", x, y, 1, T);
    if (n(1, 0) !== "=") px(c, "#d5b57f", x + 15, y, 1, T);
  },
  T: (c, x, y, r) => {
    grass(c, x, y, r);
    px(c, "#8a5a3b", x + 6, y + 9, 4, 7);
    px(c, "#6f462d", x + 6, y + 9, 1, 7);
    px(c, "#3d7c37", x + 2, y + 1, 12, 10);
    px(c, "#4f9e46", x + 3, y + 1, 10, 8);
    px(c, "#62b855", x + 4, y + 2, 6, 4);
    px(c, "#3d7c37", x + 1, y + 4, 1, 4);
    px(c, "#3d7c37", x + 14, y + 4, 1, 4);
  },
  B: (c, x, y, r) => {
    grass(c, x, y, r);
    px(c, "#3d7c37", x + 2, y + 5, 12, 9);
    px(c, "#56a94c", x + 3, y + 5, 10, 7);
    px(c, "#6cc25f", x + 4, y + 6, 4, 3);
    if (r < 0.4) px(c, "#ff7ab8", x + 9, y + 8);
  },
  "~": (c, x, y, r, n) => {
    px(c, "#5bbde0", x, y, T, T);
    px(c, "#6fcbe9", x + 2, y + 3, 6, 1);
    px(c, "#6fcbe9", x + 8, y + 9, 5, 1);
    if (r < 0.4) px(c, "#a7e6f7", x + 4, y + 11, 4, 1);
    if (n(0, -1) !== "~") px(c, "#cdf1fb", x, y, T, 2);
    if (n(0, 1) !== "~") px(c, "#4aa8cc", x, y + 14, T, 2);
    if (n(-1, 0) !== "~") px(c, "#cdf1fb", x, y, 2, T);
    if (n(1, 0) !== "~") px(c, "#4aa8cc", x + 14, y, 2, T);
  },
  f: (c, x, y, r) => {
    grass(c, x, y, r);
    px(c, "#c08a52", x + 1, y + 4, T - 2, 2);
    px(c, "#c08a52", x + 1, y + 9, T - 2, 2);
    px(c, "#8a5a3b", x + 6, y + 2, 3, 12);
    px(c, "#d9ab78", x + 6, y + 2, 1, 12);
  },
  l: (c, x, y, r) => {
    grass(c, x, y, r);
    px(c, "#5b5470", x + 7, y + 5, 2, 11);
    px(c, "#3b3350", x + 5, y + 1, 6, 5);
    px(c, "#ffe9a8", x + 6, y + 2, 4, 3);
  },
  n: (c, x, y, r, n2) => {
    grass(c, x, y, r);
    px(c, "#8a5a3b", x, y + 6, T, 3);
    px(c, "#c08a52", x, y + 4, T, 2);
    px(c, "#c08a52", x, y + 9, T, 2);
    px(c, "#6f462d", x + 1, y + 11, 2, 4);
    px(c, "#6f462d", x + 13, y + 11, 2, 4);
  },
  g: (c, x, y, r, n2) => {
    px(c, "#e3c795", x, y, T, T);
    px(c, "#b9b2c9", x, y, 3, T);
    px(c, "#d3cee0", x, y, 1, T);
    px(c, "#b9b2c9", x + 13, y, 3, T);
    px(c, "#d3cee0", x + 13, y, 1, T);
  },
  H: () => {}, // building footprint, painted by the building renderer

  // --- indoor ---
  X: (c, x, y) => px(c, "#241f33", x, y, T, T),
  "#": (c, x, y, r, n) => {
    px(c, "#efdcb8", x, y, T, T);
    px(c, "#e2caa0", x + 3, y, 1, T);
    px(c, "#e2caa0", x + 11, y, 1, T);
    if (n(0, -1) !== "#" && n(0, -1) !== "X") px(c, "#c2a077", x, y, T, 2);
    if (n(0, 1) !== "#" && n(0, 1) !== "X") {
      px(c, "#b3906a", x, y + 11, T, 5);
      px(c, "#8a6c4c", x, y + 11, T, 1);
    }
  },
  w: (c, x, y, r, n, tx, ty) => woodFloor(c, x, y, tx, ty),
  s: (c, x, y, r, n, tx, ty) => {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const light = (tx * 2 + i + (ty * 2 + j)) % 2 === 0;
        px(c, light ? "#f4eee2" : "#e0d5c1", x + i * 8, y + j * 8, 8, 8);
      }
  },
  c: (c, x, y, r, n, tx, ty) => {
    px(c, "#f0a3c2", x, y, T, T);
    px(c, "#f7b9d2", x + ((tx + ty) % 2) * 8, y, 8, 8);
    px(c, "#f7b9d2", x + (((tx + ty) % 2) ^ 1) * 8, y + 8, 8, 8);
    if (n(0, -1) !== "c") px(c, "#d97fa5", x, y, T, 1);
    if (n(0, 1) !== "c") px(c, "#d97fa5", x, y + 15, T, 1);
    if (n(-1, 0) !== "c") px(c, "#d97fa5", x, y, 1, T);
    if (n(1, 0) !== "c") px(c, "#d97fa5", x + 15, y, 1, T);
  },
  o: (c, x, y, r, n, tx, ty) => {
    px(c, "#ffd166", x, y, T, T);
    px(c, "#ffe09a", x + 2, y + 2, 12, 12);
    px(c, "#f2b13d", x + 6, y + 6, 4, 4);
  },
  "-": (c, x, y, r, n) => {
    px(c, "#a86f3c", x, y, T, T);
    px(c, "#d6a06a", x, y, T, 5);
    px(c, "#f0c592", x, y, T, 2);
    px(c, "#8a5a3b", x + 3, y + 7, 1, 9);
    px(c, "#8a5a3b", x + 12, y + 7, 1, 9);
  },
  t: (c, x, y, r, n) => {
    px(c, "#d3ac78", x, y + 1, T, 13);
    px(c, "#8a5a3b", x, y + 13, T, 3);
    px(c, "#e8ceA4".toLowerCase(), x + 1, y + 2, T - 2, 2);
    if (n(0, -1) !== "t" && n(-1, 0) !== "t" && r < 0.7) {
      px(c, "#f4f1ff", x + 5, y + 5, 6, 5);
      px(c, "#cfd6e6", x + 5, y + 9, 6, 1);
    }
  },
  b: (c, x, y, r, n) => {
    px(c, "#e2705f", x, y + 2, T, 14);
    px(c, "#f08a76", x, y + 2, T, 4);
    px(c, "#c25547", x, y + 13, T, 3);
    if (n(-1, 0) !== "b") px(c, "#c25547", x, y + 2, 2, 14);
    if (n(1, 0) !== "b") px(c, "#c25547", x + 14, y + 2, 2, 14);
  },
  v: (c, x, y, r, n) => {
    px(c, "#8f7de8", x, y + 2, T, 14);
    px(c, "#a798f0", x + 1, y + 4, T - 2, 7);
    px(c, "#7263c4", x, y + 13, T, 3);
    if (n(-1, 0) !== "v") px(c, "#7263c4", x, y + 2, 2, 14);
    if (n(1, 0) !== "v") px(c, "#7263c4", x + 14, y + 2, 2, 14);
  },
  A: (c, x, y, r) => {
    px(c, "#3b3350", x + 1, y, 14, T);
    px(c, "#2a2438", x + 1, y + 13, 14, 3);
    const screens = ["#ff5d73", "#4a6fd4", "#5eb356", "#ffd166", "#c99bff"];
    px(c, "#0f0d18", x + 3, y + 3, 10, 7);
    px(c, screens[Math.floor(r * screens.length)]!, x + 4, y + 4, 8, 5);
    px(c, "#f4f1ff", x + 5 + Math.floor(r * 4), y + 5, 2, 2);
    px(c, "#ff5d73", x + 1, y, 14, 2);
    px(c, "#ffd166", x + 4, y + 11, 3, 2);
    px(c, "#4a6fd4", x + 9, y + 11, 3, 2);
  },
  S: (c, x, y, r, n) => {
    px(c, "#2a2438", x, y, T, T);
    px(c, "#f4f1ff", x, y + 2, T, 12);
    if (n(-1, 0) !== "S") px(c, "#2a2438", x, y, 2, T);
    if (n(1, 0) !== "S") px(c, "#2a2438", x + 14, y, 2, T);
  },
  E: (c, x, y, r, n) => {
    px(c, "#8a2f45", x + 1, y + 4, 14, 12);
    px(c, "#a13b52", x + 2, y + 5, 12, 8);
    px(c, "#c04b64", x + 3, y + 6, 10, 3);
  },
  p: (c, x, y, r) => {
    px(c, "#c07a4a", x + 4, y + 9, 8, 7);
    px(c, "#a8663b", x + 4, y + 9, 8, 2);
    px(c, "#3d7c37", x + 3, y + 2, 10, 8);
    px(c, "#56a94c", x + 4, y + 3, 7, 5);
    px(c, "#6cc25f", x + 5, y + 4, 3, 2);
  },
  D: (c, x, y) => {
    px(c, "#8a6c4c", x, y, T, T);
    px(c, "#8a5a3b", x + 1, y + 1, 14, 15);
    px(c, "#c08a52", x + 2, y + 3, 12, 13);
    px(c, "#a8763f", x + 3, y + 5, 10, 9);
    px(c, "#ffd166", x + 11, y + 9, 2, 2);
  },
  V: (c, x, y) => {
    px(c, "#5b5470", x + 6, y + 12, 4, 3);
    px(c, "#3b3350", x + 1, y + 2, 14, 11);
    px(c, "#8fd3ff", x + 3, y + 4, 10, 7);
    px(c, "#f4f1ff", x + 4, y + 5, 3, 2);
  },
  K: (c, x, y, r, n) => {
    px(c, "#a86f3c", x, y, T, T);
    px(c, "#e0d5c1", x, y, T, 5);
    px(c, "#f4eee2", x, y, T, 2);
    if (r < 0.4) {
      px(c, "#b9b2c9", x + 5, y + 5, 6, 4);
      px(c, "#8f8aa0", x + 7, y + 2, 2, 3);
    } else if (r < 0.7) {
      px(c, "#ff8fa3", x + 4, y + 6, 5, 4);
      px(c, "#ffd166", x + 10, y + 7, 3, 3);
    }
    px(c, "#8a5a3b", x + 3, y + 8, 1, 8);
    px(c, "#8a5a3b", x + 12, y + 8, 1, 8);
  },
  C: (c, x, y, r, n) => {
    px(c, "#c08a52", x + 6, y, 4, T);
    px(c, "#f0a3c2", x + 1, y + 1, 14, 5);
    px(c, "#f7b9d2", x + 2, y + 2, 12, 2);
    px(c, "#f0a3c2", x + 2, y + 11, 12, 5);
    px(c, "#d97fa5", x + 2, y + 15, 12, 1);
  },
  m: (c, x, y, r, n) => {
    const head = n(0, -1) !== "m";
    px(c, "#c08a52", x, y, T, T);
    px(c, "#f4f1ff", x + 1, y, 14, T);
    if (head) {
      px(c, "#ffe9a8", x + 2, y + 2, 12, 6);
      px(c, "#fff6d6", x + 3, y + 3, 10, 3);
    } else {
      px(c, "#8fd3ff", x + 1, y, 14, T);
      px(c, "#a7e0ff", x + 1, y + 2, 14, 2);
      px(c, "#6fbde8", x + 1, y + 12, 14, 2);
    }
  },
};

export function paintTile(
  ctx: Ctx,
  ch: string,
  tx: number,
  ty: number,
  neighbor: Neighbor,
) {
  const painter = painters[ch];
  const x = tx * T;
  const y = ty * T;
  if (!painter) {
    px(ctx, "#ff00ff", x, y, T, T);
    return;
  }
  painter(ctx, x, y, hash(tx, ty), neighbor, tx, ty);
}

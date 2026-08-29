import { useEffect, useRef, useState } from "react";
import "./game.css";

/* ---------- world: one flat, open field ---------- */

const W = 176; // game pixels
const H = 144;
const EDGE = 6; // grass margin the player can't walk past

const PW = 6; // player hitbox
const PH = 6;
const SPEED = 52; // game pixels / second
const COIN_COUNT = 10;

/* ---------- happy palette ---------- */

const C = {
  grass: "#8ede6b",
  grassAlt: "#84d763",
  tuft: "#6bc551",
  edge: "#68c14f",
  flower: ["#ff7ab8", "#fff27a", "#8fd3ff", "#ffffff"],
  flowerCore: "#ffd93d",
  coin: "#ffd93d",
  coinHi: "#fff8c9",
  coinShadow: "#e8a52c",
  outline: "#4a3524",
  skin: "#ffd6a5",
  shirt: "#ff6b6b",
  eye: "#4a3524",
  shadow: "rgba(74, 53, 36, 0.22)",
};

/* ---------- 8x8 sprites: . clear, o outline, s skin, b shirt, e eye ---------- */

const SPR_DOWN = [
  "..oooo..",
  ".ossso..",
  ".oseseo.",
  ".ossso..",
  "..obbo..",
  ".obbbbo.",
  ".obbbbo.",
  "..o..o..",
];
const SPR_UP = [
  "..oooo..",
  ".osssso.",
  ".osssso.",
  ".osssso.",
  "..obbo..",
  ".obbbbo.",
  ".obbbbo.",
  "..o..o..",
];
const SPR_SIDE = [
  "..oooo..",
  ".ossseo.",
  ".ossseo.",
  ".ossso..",
  "..obbo..",
  "..obbbo.",
  ".obbbbo.",
  "..o.oo..",
];

const SPRITE_COLORS: Record<string, string> = {
  o: C.outline,
  s: C.skin,
  b: C.shirt,
  e: C.eye,
};

function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  px: number,
  py: number,
  flip: boolean,
) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    for (let c = 0; c < row.length; c++) {
      const color = SPRITE_COLORS[row[c]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px + (flip ? row.length - 1 - c : c), py + r, 1, 1);
    }
  }
}

/* ---------- decoration: fixed layout, purely cosmetic ---------- */

type Decor = { x: number; y: number; kind: "tuft" | "flower"; color: string };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DECOR: Decor[] = (() => {
  const rand = mulberry32(20260829);
  const out: Decor[] = [];
  for (let i = 0; i < 64; i++) {
    const flower = rand() < 0.45;
    out.push({
      x: Math.floor(rand() * (W - 8)) + 4,
      y: Math.floor(rand() * (H - 8)) + 4,
      kind: flower ? "flower" : "tuft",
      color: C.flower[Math.floor(rand() * C.flower.length)]!,
    });
  }
  return out;
})();

/* ---------- coins ---------- */

type Coin = { x: number; y: number; taken: boolean };

function makeCoins(): Coin[] {
  const out: Coin[] = [];
  while (out.length < COIN_COUNT) {
    const x = EDGE + 6 + Math.random() * (W - 2 * EDGE - 12);
    const y = EDGE + 6 + Math.random() * (H - 2 * EDGE - 12);
    const nearCenter = Math.hypot(x - W / 2, y - H / 2) < 22;
    const crowded = out.some(c => Math.hypot(c.x - x, c.y - y) < 20);
    if (!nearCenter && !crowded) out.push({ x, y, taken: false });
  }
  return out;
}

/* ---------- component ---------- */

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(4);
  const [hud, setHud] = useState({ score: 0, total: COIN_COUNT, time: 0, won: false });
  const restartRef = useRef<() => void>(() => {});

  // integer-scale the canvas to the window
  useEffect(() => {
    const fit = () => {
      const s = Math.max(
        2,
        Math.floor(Math.min((window.innerWidth - 48) / W, (window.innerHeight - 180) / H)),
      );
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const keys = new Set<string>();
    const spawn = () => ({ x: (W - PW) / 2, y: (H - PH) / 2 });
    let player = spawn();
    let coins = makeCoins();
    let facing: "down" | "up" | "side" = "down";
    let flip = false;
    let walkPhase = 0;
    let elapsed = 0;
    let won = false;

    const reset = () => {
      player = spawn();
      coins = makeCoins();
      facing = "down";
      flip = false;
      walkPhase = 0;
      elapsed = 0;
      won = false;
      setHud({ score: 0, total: COIN_COUNT, time: 0, won: false });
    };
    restartRef.current = reset;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      if (k === "r") reset();
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

    const update = (dt: number) => {
      let ix = 0;
      let iy = 0;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iy += 1;

      if (!won && (ix || iy)) {
        const len = Math.hypot(ix, iy);
        player.x = clamp(player.x + (ix / len) * SPEED * dt, EDGE, W - EDGE - PW);
        player.y = clamp(player.y + (iy / len) * SPEED * dt, EDGE, H - EDGE - PH);
        walkPhase += dt * 9;
        if (ix !== 0) {
          facing = "side";
          flip = ix < 0;
        } else {
          facing = iy < 0 ? "up" : "down";
        }
      } else {
        walkPhase = 0;
      }

      if (!won) elapsed += dt;

      const cx = player.x + PW / 2;
      const cy = player.y + PH / 2;
      let score = 0;
      for (const coin of coins) {
        if (!coin.taken && Math.abs(coin.x - cx) < 6 && Math.abs(coin.y - cy) < 6) coin.taken = true;
        if (coin.taken) score++;
      }
      if (score === coins.length) won = true;

      setHud(prev => {
        const time = Math.floor(elapsed);
        if (prev.score === score && prev.time === time && prev.won === won) return prev;
        return { score, total: coins.length, time, won };
      });
    };

    const draw = (t: number) => {
      // the field: wide, soft stripes so movement reads without a grid
      for (let y = 0; y < H; y += 8) {
        ctx.fillStyle = (y / 8) % 2 === 0 ? C.grass : C.grassAlt;
        ctx.fillRect(0, y, W, 8);
      }
      // a gentle border of taller grass
      ctx.fillStyle = C.edge;
      ctx.fillRect(0, 0, W, 3);
      ctx.fillRect(0, H - 3, W, 3);
      ctx.fillRect(0, 0, 3, H);
      ctx.fillRect(W - 3, 0, 3, H);

      for (const d of DECOR) {
        if (d.kind === "tuft") {
          ctx.fillStyle = C.tuft;
          ctx.fillRect(d.x, d.y + 1, 3, 1);
          ctx.fillRect(d.x + 1, d.y, 1, 1);
        } else {
          ctx.fillStyle = d.color;
          ctx.fillRect(d.x, d.y - 1, 1, 1);
          ctx.fillRect(d.x - 1, d.y, 3, 1);
          ctx.fillRect(d.x, d.y + 1, 1, 1);
          ctx.fillStyle = C.flowerCore;
          ctx.fillRect(d.x, d.y, 1, 1);
        }
      }

      for (let i = 0; i < coins.length; i++) {
        const coin = coins[i]!;
        if (coin.taken) continue;
        const bob = Math.round(Math.sin(t / 300 + i) * 1);
        const x = Math.round(coin.x) - 2;
        const y = Math.round(coin.y) - 2 + bob;
        ctx.fillStyle = C.shadow;
        ctx.fillRect(x, Math.round(coin.y) + 3, 4, 1);
        ctx.fillStyle = C.coinShadow;
        ctx.fillRect(x, y + 1, 4, 3);
        ctx.fillStyle = C.coin;
        ctx.fillRect(x, y, 4, 3);
        ctx.fillStyle = C.coinHi;
        ctx.fillRect(x + 1, y, 1, 1);
      }

      const bob = walkPhase > 0 && Math.floor(walkPhase) % 2 === 0 ? 1 : 0;
      const sx = Math.round(player.x) - 1;
      const sy = Math.round(player.y) - 2 - bob;
      ctx.fillStyle = C.shadow;
      ctx.fillRect(sx + 2, Math.round(player.y) + PH - 1, 4, 1);
      const rows = facing === "up" ? SPR_UP : facing === "side" ? SPR_SIDE : SPR_DOWN;
      drawSprite(ctx, rows, sx, sy, flip);
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="game">
      <header className="game-hud">
        <span className="stat">
          <b>{hud.score}</b>/{hud.total} coins
        </span>
        <span className="title">SUNNY FIELD</span>
        <span className="stat">
          {String(Math.floor(hud.time / 60)).padStart(2, "0")}:
          {String(hud.time % 60).padStart(2, "0")}
        </span>
      </header>

      <div className="screen" style={{ width: W * scale, height: H * scale }}>
        <canvas ref={canvasRef} width={W} height={H} />
        {hud.won && (
          <div className="overlay">
            <p className="big">ALL COINS!</p>
            <p className="sub">
              {hud.total} in {hud.time}s
            </p>
            <button onClick={() => restartRef.current()}>play again (R)</button>
          </div>
        )}
      </div>

      <footer className="game-help">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> to move · <kbd>R</kbd> for a new field
      </footer>
    </div>
  );
}

export default Game;

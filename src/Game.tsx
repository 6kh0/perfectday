import { useEffect, useRef, useState } from "react";
import "./game.css";

/* ---------- world ---------- */

const T = 8; // tile size in game pixels
const MAP: string[] = [
  "####################",
  "#@...*........*....#",
  "#.###.####.###.###.#",
  "#.#......*.......#.#",
  "#.#.####.##.####.#.#",
  "#...#..........#...#",
  "###.#.########.#.###",
  "#...*.#*....*#.....#",
  "#.#####.####.#####.#",
  "#.....#......#.....#",
  "###.#.#.####.#.#.###",
  "#*..#........*..#..#",
  "#.#.######.#####.#.#",
  "#.#......#.....#.#.#",
  "#.####.#.#.###.#.#.#",
  "#......#...#...*.#.#",
  "#.####.#####.###...#",
  "####################",
];
const MAP_W = MAP[0]!.length;
const MAP_H = MAP.length;
const W = MAP_W * T; // 160
const H = MAP_H * T; // 144

const PW = 6; // player hitbox
const PH = 6;
const SPEED = 46; // game pixels / second
const CORNER = 3; // corner-correction slack in pixels

/* ---------- palette ---------- */

const C = {
  floor: "#191828",
  floorAlt: "#1e1d30",
  wall: "#39365e",
  wallTop: "#524e86",
  wallShade: "#26243f",
  coin: "#ffd166",
  coinHi: "#fff3c4",
  coinShadow: "#c98b2a",
  outline: "#0d0c16",
  skin: "#ffd6a5",
  shirt: "#4cc9f0",
  shirtDark: "#2a9dc4",
  eye: "#0d0c16",
};

/* ---------- 8x8 sprites: . = clear, o = outline, s = skin, b = shirt, d = shirt shadow, e = eye ---------- */

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
  d: C.shirtDark,
  e: C.eye,
};

/* ---------- helpers ---------- */

const solidAt = (tx: number, ty: number) =>
  tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || MAP[ty]![tx] === "#";

/** true if a PW x PH box with top-left (x, y) overlaps no wall */
function free(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + PW) - 1;
  const y1 = Math.ceil(y + PH) - 1;
  for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) {
    for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
      if (solidAt(tx, ty)) return false;
    }
  }
  return true;
}

type Coin = { x: number; y: number; taken: boolean };

function spawnPoint() {
  for (let ty = 0; ty < MAP_H; ty++) {
    const tx = MAP[ty]!.indexOf("@");
    if (tx >= 0) return { x: tx * T + (T - PW) / 2, y: ty * T + (T - PH) / 2 };
  }
  return { x: T, y: T };
}

function makeCoins(): Coin[] {
  const out: Coin[] = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (MAP[ty]![tx] === "*") out.push({ x: tx * T + T / 2, y: ty * T + T / 2, taken: false });
    }
  }
  return out;
}

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

/* ---------- component ---------- */

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(4);
  const [hud, setHud] = useState({ score: 0, total: 0, time: 0, won: false });
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
    let player = spawnPoint();
    let coins = makeCoins();
    let facing: "down" | "up" | "side" = "down";
    let flip = false;
    let walkPhase = 0;
    let elapsed = 0;
    let won = false;

    const reset = () => {
      player = spawnPoint();
      coins = makeCoins();
      facing = "down";
      flip = false;
      walkPhase = 0;
      elapsed = 0;
      won = false;
      setHud({ score: 0, total: coins.length, time: 0, won: false });
    };
    restartRef.current = reset;
    setHud({ score: 0, total: coins.length, time: 0, won: false });

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

    /** one sub-pixel step on a single axis, with corner correction */
    const step = (dx: number, dy: number) => {
      if (free(player.x + dx, player.y + dy)) {
        player.x += dx;
        player.y += dy;
        return;
      }
      for (let off = 1; off <= CORNER; off++) {
        if (dx !== 0) {
          if (free(player.x + dx, player.y - off) && free(player.x, player.y - off)) {
            player.y -= off;
            player.x += dx;
            return;
          }
          if (free(player.x + dx, player.y + off) && free(player.x, player.y + off)) {
            player.y += off;
            player.x += dx;
            return;
          }
        } else {
          if (free(player.x - off, player.y + dy) && free(player.x - off, player.y)) {
            player.x -= off;
            player.y += dy;
            return;
          }
          if (free(player.x + off, player.y + dy) && free(player.x + off, player.y)) {
            player.x += off;
            player.y += dy;
            return;
          }
        }
      }
    };

    const move = (dist: number, axis: "x" | "y") => {
      const sign = Math.sign(dist);
      let left = Math.abs(dist);
      while (left > 0) {
        const s = Math.min(left, 1) * sign;
        step(axis === "x" ? s : 0, axis === "y" ? s : 0);
        left -= 1;
      }
    };

    const update = (dt: number) => {
      let ix = 0;
      let iy = 0;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iy += 1;

      if (!won && (ix || iy)) {
        const len = Math.hypot(ix, iy);
        move((ix / len) * SPEED * dt, "x");
        move((iy / len) * SPEED * dt, "y");
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

      // pick up coins
      const cx = player.x + PW / 2;
      const cy = player.y + PH / 2;
      let score = 0;
      for (const coin of coins) {
        if (!coin.taken && Math.abs(coin.x - cx) < 5 && Math.abs(coin.y - cy) < 5) coin.taken = true;
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
      // floor
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          if (solidAt(tx, ty)) continue;
          ctx.fillStyle = (tx + ty) % 2 === 0 ? C.floor : C.floorAlt;
          ctx.fillRect(tx * T, ty * T, T, T);
        }
      }
      // walls
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          if (!solidAt(tx, ty)) continue;
          ctx.fillStyle = C.wall;
          ctx.fillRect(tx * T, ty * T, T, T);
          if (!solidAt(tx, ty - 1)) {
            ctx.fillStyle = C.wallTop;
            ctx.fillRect(tx * T, ty * T, T, 2);
          }
          if (!solidAt(tx, ty + 1)) {
            ctx.fillStyle = C.wallShade;
            ctx.fillRect(tx * T, ty * T + T - 1, T, 1);
          }
        }
      }
      // coins
      for (let i = 0; i < coins.length; i++) {
        const coin = coins[i]!;
        if (coin.taken) continue;
        const bob = Math.round(Math.sin(t / 320 + i) * 1);
        const x = Math.round(coin.x) - 2;
        const y = Math.round(coin.y) - 2 + bob;
        ctx.fillStyle = C.coinShadow;
        ctx.fillRect(x, y + 1, 4, 3);
        ctx.fillStyle = C.coin;
        ctx.fillRect(x, y, 4, 3);
        ctx.fillStyle = C.coinHi;
        ctx.fillRect(x + 1, y, 1, 1);
      }
      // player
      const bob = walkPhase > 0 && Math.floor(walkPhase) % 2 === 0 ? 1 : 0;
      const sx = Math.round(player.x) - 1;
      const sy = Math.round(player.y) - 2 - bob;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
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
        <span className="title">PIXEL RUN</span>
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
        <kbd>D</kbd> to move · <kbd>R</kbd> to restart
      </footer>
    </div>
  );
}

export default Game;

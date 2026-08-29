import { ACTIVITIES, DAY_END, DAY_START, SCENES, TOTAL_COINS, type Building, type Person, type Scene, type SceneId } from "./data";
import { SOLID, T, paintTile } from "./tiles";
import { CAT, DUCK, DUCK_PALETTE, ICONS, PLAYER_DOWN, PLAYER_PALETTE, PLAYER_SIDE, PLAYER_UP, drawBitmap } from "./sprites";

export const MIN_VIEW_W = 20 * T;
export const MIN_VIEW_H = 12 * T;
export const MAX_VIEW_W = 40 * T;
export const MAX_VIEW_H = 24 * T;

const PW = 8;
const PH = 6;
const WALK = 62;
const RUN = 100;
const FACE = { down: PLAYER_DOWN, up: PLAYER_UP, side: PLAYER_SIDE } as const;

type Ctx = CanvasRenderingContext2D;
const fill = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

export type Snapshot = {
  sceneName: string;
  clock: number;
  wallet: number;
  found: number;
  totalCoins: number;
  joy: number;
  prompt: string | null;
  dialogue: string[] | null;
  ended: boolean;
  memories: string[];
  places: string[];
};

export type Game = { destroy: () => void; restart: () => void; press: () => void };

export function formatClock(min: number) {
  const t = DAY_START + min;
  const h24 = Math.floor(t / 60);
  return `${h24 % 12 || 12}:${String(t % 60).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

export function formatSpan(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

/* ---------- static scene layer ---------- */

const layerCache = new Map<SceneId, HTMLCanvasElement>();

function drawBuilding(ctx: Ctx, b: Building) {
  const bx = b.x * T;
  const by = b.y * T;
  const bw = b.w * T;
  const wallTop = by + (b.h - 2) * T;
  const bottom = by + b.h * T;

  fill(ctx, "rgba(60, 45, 30, 0.18)", bx, bottom, bw, 3);
  fill(ctx, b.wall, bx, wallTop, bw, bottom - wallTop);
  fill(ctx, "rgba(120, 95, 70, 0.18)", bx, bottom - 4, bw, 4);
  fill(ctx, b.roof, bx - 3, by, bw + 6, wallTop - by);
  ctx.fillStyle = b.roofDark;
  for (let y = by + 4; y < wallTop; y += 4) ctx.fillRect(bx - 3, y, bw + 6, 1);
  fill(ctx, "rgba(255,255,255,0.35)", bx - 3, by, bw + 6, 2);
  fill(ctx, b.roofDark, bx - 3, wallTop - 3, bw + 6, 3);

  for (let i = 0; i < b.w; i++) {
    const tx = b.x + i;
    if (tx === b.doorX || tx === b.doorX - 1 || tx === b.doorX + 1 || i % 2 === 0) continue;
    const wx = tx * T + 4;
    const wy = wallTop + 6;
    fill(ctx, "#8a6c4c", wx - 1, wy - 1, 10, 12);
    fill(ctx, "#bfe6ff", wx, wy, 8, 10);
    fill(ctx, "#ffffff", wx, wy, 3, 4);
    fill(ctx, "#8a6c4c", wx + 3, wy, 1, 10);
    fill(ctx, "#8a6c4c", wx, wy + 4, 8, 1);
  }

  const dx = b.doorX * T;
  const dTop = wallTop + 6;
  fill(ctx, "#6f462d", dx + 1, dTop, 14, bottom - dTop);
  fill(ctx, "#c08a52", dx + 2, dTop + 1, 12, bottom - dTop - 1);
  fill(ctx, "#a8763f", dx + 4, dTop + 3, 8, bottom - dTop - 4);
  fill(ctx, "#ffd166", dx + 11, dTop + 8, 2, 2);

  const icon = ICONS[b.icon];
  if (!icon) return;
  const sx = dx + 4;
  const sy = wallTop - 12;
  fill(ctx, "#6f462d", sx - 2, sy - 2, 12, 12);
  fill(ctx, "#fff6d6", sx - 1, sy - 1, 10, 10);
  drawBitmap(ctx, icon.bmp, icon.pal, sx, sy);
}

function sceneLayer(scene: Scene) {
  const cached = layerCache.get(scene.id);
  if (cached) return cached;
  const w = scene.tiles[0]!.length;
  const h = scene.tiles.length;
  const canvas = document.createElement("canvas");
  canvas.width = w * T;
  canvas.height = h * T;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const at = (x: number, y: number) => scene.tiles[y]?.[x] ?? "#";
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const raw = at(tx, ty);
      const ch = raw === "H" ? scene.floor : raw;
      const n = (dx: number, dy: number) => at(tx + dx, ty + dy);
      if (ch !== scene.floor && ch !== "#" && ch !== "X") paintTile(ctx, scene.floor, tx, ty, n);
      paintTile(ctx, ch, tx, ty, n);
    }
  }
  for (const b of scene.buildings) drawBuilding(ctx, b);
  layerCache.set(scene.id, canvas);
  return canvas;
}

/* ---------- the game ---------- */

export function createGame(canvas: HTMLCanvasElement, publish: (s: Snapshot) => void): Game {
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const f = (c: string, x: number, y: number, w: number, h: number) => fill(ctx, c, x, y, w, h);

  const keys = new Set<string>();
  const held = (...ks: string[]) => ks.some(k => keys.has(k));
  let scene!: Scene;
  let px = 0;
  let py = 0;
  let facing: keyof typeof FACE = "down";
  let flip = false;
  let walk = 0;
  let clock = 0;
  let wallet = 0;
  let found = 0;
  let joy = 0;
  let memories: string[] = [];
  let places: string[] = [];
  let done = new Set<string>();
  let taken = new Set<string>();
  let dialogue: string[] | null = null;
  let line = 0;
  let endAfter = false;
  let ended = false;
  let lock = true;
  let prompt: { label: string; act: () => void } | null = null;
  let fade = 0;

  const enter = (id: SceneId, spawn: [number, number]) => {
    scene = SCENES[id];
    px = spawn[0] * T + (T - PW) / 2;
    py = spawn[1] * T + T - PH - 1;
    lock = true;
    fade = 1;
    sceneLayer(scene);
    if (!places.includes(scene.name) && id !== "town") places.push(scene.name);
  };

  const talk = (lines: string[]) => {
    dialogue = lines;
    line = 0;
  };

  const reset = () => {
    clock = wallet = found = joy = 0;
    memories = [];
    places = [];
    done = new Set();
    taken = new Set();
    ended = endAfter = false;
    enter("town", SCENES.town.spawn);
    talk(["Today is your day off, do stuff", "and have a perfect day."]);
  };

  const solidAt = (tx: number, ty: number) => {
    const ch = scene.tiles[ty]?.[tx];
    return ch === undefined || SOLID.has(ch);
  };

  const free = (x: number, y: number) => {
    const x0 = Math.floor(x / T);
    const x1 = Math.floor((x + PW - 1) / T);
    const y0 = Math.floor(y / T);
    const y1 = Math.floor((y + PH - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) return false;
    return true;
  };

  const moveAxis = (dist: number, axis: "x" | "y") => {
    const sign = Math.sign(dist);
    let left = Math.abs(dist);
    while (left > 0) {
      const s = Math.min(left, 1) * sign;
      const nx = axis === "x" ? px + s : px;
      const ny = axis === "y" ? py + s : py;
      if (!free(nx, ny)) break;
      px = nx;
      py = ny;
      left -= 1;
    }
  };

  const centre = () => ({ cx: px + PW / 2, cy: py + PH / 2 });

  const activityHint = (id: string) => {
    const a = ACTIVITIES[id]!;
    const bits = [a.cost && `${a.cost} coin${a.cost > 1 ? "s" : ""}`, a.minutes && formatSpan(a.minutes)].filter(Boolean);
    return bits.length ? `${a.title} — ${bits.join(", ")}` : a.title;
  };

  const runActivity = (id: string, thingId: string) => {
    const a = ACTIVITIES[id]!;
    if (a.ends) {
      ended = true;
      dialogue = null;
      return;
    }
    const key = id === "pet" ? `pet:${thingId}` : id;
    if (done.has(key)) return talk(["You already did that today — and it was good. Try something else."]);
    if (a.requires && !done.has(a.requires)) return talk([`BARISTA: Grab a table first — ${ACTIVITIES[a.requires]!.title.toLowerCase()}.`]);
    if (a.cost > wallet) {
      return talk([
        `That costs ${a.cost} coins and you have ${wallet}.`,
        "There are coins all over town — behind the buildings, out in the park.",
      ]);
    }
    wallet -= a.cost;
    clock = Math.min(clock + a.minutes, DAY_END - DAY_START);
    joy += a.joy;
    done.add(key);
    if (a.memory && !memories.includes(a.memory)) memories.push(a.memory);
    talk([...a.lines]);
    if (clock >= DAY_END - DAY_START) {
      dialogue!.push("The light goes orange, then blue. That's the day.");
      endAfter = true;
    }
  };

  const findPrompt = () => {
    const { cx, cy } = centre();
    type Best = { label: string; act: () => void; d: number };
    let best: Best | null = null;
    const consider = (tx: number, ty: number, label: string, act: () => void) => {
      const d = Math.hypot(tx * T + T / 2 - cx, ty * T + T / 2 - cy);
      if (d <= 26 && (!best || d < best.d)) best = { label, act, d };
    };
    for (const thing of scene.things) {
      const label = thing.activity
        ? done.has(thing.activity) && thing.activity !== "sleep"
          ? `${ACTIVITIES[thing.activity]!.title} — done today`
          : activityHint(thing.activity)
        : thing.label;
      consider(thing.tx, thing.ty, label, () => (thing.activity ? runActivity(thing.activity, thing.id) : talk([...(thing.lines ?? [])])));
    }
    for (const p of scene.people) {
      if (!p.label) continue;
      const pet = p.kind === "cat";
      const label = pet ? (done.has(`pet:${p.id}`) ? "This one has had quite enough attention" : "Pet the cat") : p.label;
      consider(p.tx, p.ty, label, () => (pet ? runActivity("pet", p.id) : talk([...(p.lines ?? [])])));
    }
    for (const p of scene.portals) consider(p.tx, p.ty, `Enter ${p.label}`, () => enter(p.to, p.spawn));
    prompt = best;
  };

  const press = () => {
    if (ended) return;
    if (dialogue) {
      if (++line >= dialogue.length) {
        dialogue = null;
        line = 0;
        if (endAfter) {
          ended = true;
          endAfter = false;
        }
      }
      return;
    }
    prompt?.act();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (k === "e" || k === " " || k === "enter") press();
    if (k === "r" && ended) reset();
    keys.add(k);
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const update = (dt: number) => {
    fade = Math.max(0, fade - dt * 2.5);
    const frozen = !!dialogue || ended;
    let ix = 0;
    let iy = 0;
    if (!frozen) {
      if (held("a", "arrowleft")) ix--;
      if (held("d", "arrowright")) ix++;
      if (held("w", "arrowup")) iy--;
      if (held("s", "arrowdown")) iy++;
    }
    if (ix || iy) {
      const len = Math.hypot(ix, iy);
      const speed = held("shift") ? RUN : WALK;
      moveAxis((ix / len) * speed * dt, "x");
      moveAxis((iy / len) * speed * dt, "y");
      walk += dt * (speed / 8);
      if (ix) {
        facing = "side";
        flip = ix < 0;
      } else facing = iy < 0 ? "up" : "down";
    } else walk = 0;

    const { cx, cy } = centre();
    scene.coins.forEach(([tx, ty], i) => {
      const key = `${scene.id}:${i}`;
      if (taken.has(key)) return;
      if (Math.hypot(tx * T + T / 2 - cx, ty * T + T / 2 - cy) < 11) {
        taken.add(key);
        wallet++;
        found++;
      }
    });

    const onTile = scene.portals.find(p => Math.floor(cx / T) === p.tx && Math.floor(py / T) === p.ty);
    if (!onTile) lock = false;
    else if (!lock && !frozen) enter(onTile.to, onTile.spawn);
    findPrompt();
  };

  const dayTint = () => {
    const hour = (DAY_START + clock) / 60;
    if (hour < 12) return null;
    if (hour < 16) return "rgba(255, 214, 150, 0.08)";
    if (hour < 18.5) return "rgba(255, 168, 92, 0.16)";
    if (hour < 20) return "rgba(255, 122, 84, 0.24)";
    return "rgba(74, 78, 156, 0.34)";
  };

  const drawCoin = (x: number, y: number, t: number, i: number) => {
    const bob = Math.round(Math.sin(t / 300 + i * 1.7));
    f("rgba(60,45,30,0.2)", x - 2, y + 4, 5, 1);
    f("#e8a52c", x - 3, y - 3 + bob, 6, 6);
    f("#ffd93d", x - 3, y - 3 + bob, 6, 5);
    f("#fff8c9", x - 2, y - 2 + bob, 2, 2);
  };

  const drawPerson = (p: Person, t: number) => {
    const bmp = p.kind === "cat" ? CAT : p.kind === "duck" ? DUCK : FACE[p.facing];
    const pal = p.kind === "duck" ? DUCK_PALETTE : p.palette;
    const w = bmp[0]!.length;
    const x = p.tx * T + Math.round((T - w) / 2);
    const y = p.ty * T + T - 1;
    const bob = Math.round(Math.sin(t / 600 + p.tx)) === 1 ? 1 : 0;
    f("rgba(60,45,30,0.22)", x + 2, y - 1, w - 4, 1);
    drawBitmap(ctx, bmp, pal, x, y - bmp.length - bob, p.flip);
  };

  const drawBubble = (x: number, y: number, t: number) => {
    const bob = Math.round(Math.sin(t / 200)) === 1 ? 1 : 0;
    const bx = x - 4;
    const by = y - 14 - bob;
    f("#4a3524", bx, by, 9, 11);
    f("#fff6d6", bx + 1, by + 1, 7, 9);
    f("#4a3524", bx + 3, by + 10, 3, 2);
    f("#4a3524", bx + 3, by + 3, 3, 1);
    f("#4a3524", bx + 3, by + 5, 2, 1);
    f("#4a3524", bx + 3, by + 7, 3, 1);
    f("#4a3524", bx + 3, by + 3, 1, 5);
  };

  const draw = (t: number) => {
    ctx.imageSmoothingEnabled = false;
    const vw = canvas.width;
    const vh = canvas.height;
    const layer = sceneLayer(scene);
    const { width: sw, height: sh } = layer;
    let camX = Math.round(px + PW / 2 - vw / 2);
    let camY = Math.round(py + PH / 2 - vh / 2);
    camX = sw <= vw ? Math.round((sw - vw) / 2) : Math.max(0, Math.min(camX, sw - vw));
    camY = sh <= vh ? Math.round((sh - vh) / 2) : Math.max(0, Math.min(camY, sh - vh));

    f(scene.outdoor ? "#7ec850" : "#241f33", 0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.drawImage(layer, 0, 0);

    scene.coins.forEach(([tx, ty], i) => {
      if (!taken.has(`${scene.id}:${i}`)) drawCoin(tx * T + T / 2, ty * T + T / 2, t, i);
    });

    const actors: { y: number; render: () => void }[] = scene.people.map(p => ({ y: p.ty * T + T, render: () => drawPerson(p, t) }));
    actors.push({
      y: py + PH,
      render: () => {
        const bob = walk > 0 && Math.floor(walk) % 2 === 0 ? 1 : 0;
        f("rgba(60,45,30,0.25)", px - 2, py + PH - 1, 11, 1);
        const bmp = FACE[facing];
        const ox = Math.round((PW - bmp[0]!.length) / 2);
        drawBitmap(ctx, bmp, PLAYER_PALETTE, Math.round(px) + ox, Math.round(py + PH - bmp.length - bob), flip);
      },
    });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.render());
    if (prompt && !dialogue) drawBubble(Math.round(px) + 2, Math.round(py + PH - PLAYER_DOWN.length) - 2, t);
    ctx.restore();

    const tint = scene.outdoor ? dayTint() : scene.dim ?? (clock > 660 ? "rgba(74, 78, 156, 0.18)" : null);
    if (tint) f(tint, 0, 0, vw, vh);
    if (fade > 0) f(`rgba(20, 16, 30, ${fade})`, 0, 0, vw, vh);
  };

  let last = performance.now();
  let raf = 0;
  let prev = "";
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw(now);
    const snap: Snapshot = {
      sceneName: scene.name,
      clock,
      wallet,
      found,
      totalCoins: TOTAL_COINS,
      joy,
      prompt: prompt?.label ?? null,
      dialogue: dialogue ? dialogue.slice(line, line + 1) : null,
      ended,
      memories,
      places,
    };
    const key = JSON.stringify(snap);
    if (key !== prev) {
      prev = key;
      publish(snap);
    }
    raf = requestAnimationFrame(frame);
  };

  reset();
  raf = requestAnimationFrame(frame);
  return {
    destroy: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
    restart: reset,
    press,
  };
}

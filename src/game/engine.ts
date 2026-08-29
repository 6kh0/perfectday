import {
  ACTIVITIES,
  DAY_END,
  DAY_START,
  SCENES,
  TOTAL_COINS,
  type Building,
  type Person,
  type Scene,
  type SceneId,
} from "./data";
import { SOLID, T, paintTile } from "./tiles";
import {
  CAT,
  CHAR_DOWN,
  CHAR_SIDE,
  CHAR_UP,
  DUCK,
  DUCK_PALETTE,
  ICONS,
  PLAYER_DOWN,
  PLAYER_PALETTE,
  PLAYER_SIDE,
  PLAYER_UP,
  drawBitmap,
} from "./sprites";

/** the camera shows whatever the canvas is sized to; these are the floor values */
export const MIN_VIEW_W = 20 * T; // 320
export const MIN_VIEW_H = 12 * T; // 192
export const MAX_VIEW_W = 40 * T;
export const MAX_VIEW_H = 24 * T;

const PW = 8; // player hitbox (feet)
const PH = 6;
const WALK = 62; // px per second
const RUN = 100;

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

export type Game = {
  destroy: () => void;
  restart: () => void;
  press: () => void; // the same thing the E key does
};

export function formatClock(minutes: number) {
  const total = DAY_START + minutes;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

export function formatSpan(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

/* ---------- static scene layer, painted once ---------- */

const layerCache = new Map<SceneId, HTMLCanvasElement>();

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building) {
  const bx = b.x * T;
  const by = b.y * T;
  const bw = b.w * T;
  const wallTop = by + (b.h - 2) * T;
  const bottom = by + b.h * T;

  // ground shadow
  ctx.fillStyle = "rgba(60, 45, 30, 0.18)";
  ctx.fillRect(bx, bottom, bw, 3);

  // wall
  ctx.fillStyle = b.wall;
  ctx.fillRect(bx, wallTop, bw, bottom - wallTop);
  ctx.fillStyle = "rgba(120, 95, 70, 0.18)";
  ctx.fillRect(bx, bottom - 4, bw, 4);

  // roof with a 3px overhang
  ctx.fillStyle = b.roof;
  ctx.fillRect(bx - 3, by, bw + 6, wallTop - by);
  ctx.fillStyle = b.roofDark;
  for (let y = by + 4; y < wallTop; y += 4) ctx.fillRect(bx - 3, y, bw + 6, 1);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(bx - 3, by, bw + 6, 2);
  ctx.fillStyle = b.roofDark;
  ctx.fillRect(bx - 3, wallTop - 3, bw + 6, 3);

  // windows on the wall row, skipping the door
  for (let i = 0; i < b.w; i++) {
    const tx = b.x + i;
    if (tx === b.doorX || tx === b.doorX - 1 || tx === b.doorX + 1) continue;
    if (i % 2 === 0) continue;
    const wx = tx * T + 4;
    const wy = wallTop + 6;
    ctx.fillStyle = "#8a6c4c";
    ctx.fillRect(wx - 1, wy - 1, 10, 12);
    ctx.fillStyle = "#bfe6ff";
    ctx.fillRect(wx, wy, 8, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(wx, wy, 3, 4);
    ctx.fillStyle = "#8a6c4c";
    ctx.fillRect(wx + 3, wy, 1, 10);
    ctx.fillRect(wx, wy + 4, 8, 1);
  }

  // door
  const dx = b.doorX * T;
  const dTop = wallTop + 6;
  ctx.fillStyle = "#6f462d";
  ctx.fillRect(dx + 1, dTop, 14, bottom - dTop);
  ctx.fillStyle = "#c08a52";
  ctx.fillRect(dx + 2, dTop + 1, 12, bottom - dTop - 1);
  ctx.fillStyle = "#a8763f";
  ctx.fillRect(dx + 4, dTop + 3, 8, bottom - dTop - 4);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(dx + 11, dTop + 8, 2, 2);

  // hanging sign with the shop icon
  const icon = ICONS[b.icon];
  if (icon) {
    const sx = dx + 4;
    const sy = wallTop - 12;
    ctx.fillStyle = "#6f462d";
    ctx.fillRect(sx - 2, sy - 2, 12, 12);
    ctx.fillStyle = "#fff6d6";
    ctx.fillRect(sx - 1, sy - 1, 10, 10);
    drawBitmap(ctx, icon.bmp, icon.pal, sx, sy);
  }
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
      // furniture and trees are painted over the floor they stand on, so nothing
      // shows the backdrop through the gaps in a sprite
      const ch = at(tx, ty) === "H" ? scene.floor : at(tx, ty);
      const neighbor = (dx: number, dy: number) => at(tx + dx, ty + dy);
      if (ch !== scene.floor && ch !== "#" && ch !== "X") paintTile(ctx, scene.floor, tx, ty, neighbor);
      paintTile(ctx, ch, tx, ty, neighbor);
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

  const keys = new Set<string>();
  let scene!: Scene;
  let px = 0;
  let py = 0;
  let facing: "down" | "up" | "side" = "down";
  let flip = false;
  let walkPhase = 0;
  let clock = 0; // minutes since 9:00
  let wallet = 0;
  let found = 0;
  let joy = 0;
  let memories: string[] = [];
  let places: string[] = [];
  let done = new Set<string>();
  let taken = new Set<string>();
  let dialogue: string[] | null = null;
  let dialogueIndex = 0;
  let endAfterDialogue = false;
  let ended = false;
  let portalLock = true;
  let prompt: { label: string; act: () => void } | null = null;
  let fade = 0; // 1 = black, fades to 0 after a scene change

  const enter = (id: SceneId, spawn: [number, number]) => {
    scene = SCENES[id];
    px = spawn[0] * T + (T - PW) / 2;
    py = spawn[1] * T + T - PH - 1;
    portalLock = true;
    fade = 1;
    sceneLayer(scene);
    if (!places.includes(scene.name) && id !== "town") places.push(scene.name);
  };

  const reset = () => {
    clock = 0;
    wallet = 0;
    found = 0;
    joy = 0;
    memories = [];
    places = [];
    done = new Set();
    taken = new Set();
    dialogue = null;
    ended = false;
    endAfterDialogue = false;
    enter("town", SCENES.town.spawn);
    dialogue = [
      "Today is your day off, do stuff",
      "and have a perfect day.",
    ];
    dialogueIndex = 0;
  };

  /* ---------- collision ---------- */

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
      if (free(nx, ny)) {
        px = nx;
        py = ny;
      } else break;
      left -= 1;
    }
  };

  /* ---------- interaction ---------- */

  const centre = () => ({ cx: px + PW / 2, cy: py + PH / 2 });

  const activityHint = (id: string) => {
    const a = ACTIVITIES[id]!;
    const bits: string[] = [];
    if (a.cost) bits.push(`${a.cost} coin${a.cost > 1 ? "s" : ""}`);
    if (a.minutes) bits.push(formatSpan(a.minutes));
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
    if (done.has(key)) {
      dialogue = ["You already did that today — and it was good. Try something else."];
      dialogueIndex = 0;
      return;
    }
    if (a.requires && !done.has(a.requires)) {
      dialogue = [`BARISTA: Grab a table first — ${ACTIVITIES[a.requires]!.title.toLowerCase()}.`];
      dialogueIndex = 0;
      return;
    }
    if (a.cost > wallet) {
      dialogue = [
        `That costs ${a.cost} coins and you have ${wallet}.`,
        "There are coins all over town — behind the buildings, out in the park.",
      ];
      dialogueIndex = 0;
      return;
    }
    wallet -= a.cost;
    clock = Math.min(clock + a.minutes, DAY_END - DAY_START);
    joy += a.joy;
    done.add(key);
    if (a.memory && !memories.includes(a.memory)) memories.push(a.memory);
    dialogue = [...a.lines];
    dialogueIndex = 0;
    if (clock >= DAY_END - DAY_START) {
      dialogue.push("The light goes orange, then blue. That's the day.");
      endAfterDialogue = true;
    }
  };

  const findPrompt = () => {
    const { cx, cy } = centre();
    let best: { label: string; act: () => void; d: number } | null = null;
    const consider = (tx: number, ty: number, label: string, act: () => void) => {
      const d = Math.hypot(tx * T + T / 2 - cx, ty * T + T / 2 - cy);
      if (d > 26) return;
      if (!best || d < best.d) best = { label, act, d };
    };
    for (const thing of scene.things) {
      const label = thing.activity
        ? done.has(thing.activity) && thing.activity !== "sleep"
          ? `${ACTIVITIES[thing.activity]!.title} — done today`
          : activityHint(thing.activity)
        : thing.label;
      consider(thing.tx, thing.ty, label, () => {
        if (thing.activity) runActivity(thing.activity, thing.id);
        else {
          dialogue = [...(thing.lines ?? [])];
          dialogueIndex = 0;
        }
      });
    }
    for (const p of scene.people) {
      if (!p.label) continue;
      const isPet = p.kind === "cat";
      const label = isPet
        ? done.has(`pet:${p.id}`)
          ? "This one has had quite enough attention"
          : "Pet the cat"
        : p.label;
      consider(p.tx, p.ty, label, () => {
        if (isPet) runActivity("pet", p.id);
        else {
          dialogue = [...(p.lines ?? [])];
          dialogueIndex = 0;
        }
      });
    }
    for (const portal of scene.portals) {
      consider(portal.tx, portal.ty, `Enter ${portal.label}`, () => enter(portal.to, portal.spawn));
    }
    prompt = best ? { label: (best as any).label, act: (best as any).act } : null;
  };

  const press = () => {
    if (ended) return;
    if (dialogue) {
      dialogueIndex++;
      if (dialogueIndex >= dialogue.length) {
        dialogue = null;
        dialogueIndex = 0;
        if (endAfterDialogue) {
          ended = true;
          endAfterDialogue = false;
        }
      }
      return;
    }
    prompt?.act();
  };

  /* ---------- input ---------- */

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

  /* ---------- update ---------- */

  const update = (dt: number) => {
    fade = Math.max(0, fade - dt * 2.5);
    const frozen = !!dialogue || ended;

    let ix = 0;
    let iy = 0;
    if (!frozen) {
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iy += 1;
    }

    if (ix || iy) {
      const len = Math.hypot(ix, iy);
      const speed = keys.has("shift") ? RUN : WALK;
      moveAxis((ix / len) * speed * dt, "x");
      moveAxis((iy / len) * speed * dt, "y");
      walkPhase += dt * (speed / 8);
      if (ix !== 0) {
        facing = "side";
        flip = ix < 0;
      } else facing = iy < 0 ? "up" : "down";
    } else walkPhase = 0;

    // coins
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

    // portals fire by walking onto the mat
    const onTile = scene.portals.find(
      p => Math.floor(cx / T) === p.tx && Math.floor(py / T) === p.ty,
    );
    if (!onTile) portalLock = false;
    else if (!portalLock && !frozen) enter(onTile.to, onTile.spawn);

    findPrompt();
  };

  /* ---------- draw ---------- */

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
    ctx.fillStyle = "rgba(60,45,30,0.2)";
    ctx.fillRect(x - 2, y + 4, 5, 1);
    ctx.fillStyle = "#e8a52c";
    ctx.fillRect(x - 3, y - 3 + bob, 6, 6);
    ctx.fillStyle = "#ffd93d";
    ctx.fillRect(x - 3, y - 3 + bob, 6, 5);
    ctx.fillStyle = "#fff8c9";
    ctx.fillRect(x - 2, y - 2 + bob, 2, 2);
  };

  const drawPerson = (p: Person, t: number) => {
    const x = p.tx * T + 4;
    const y = p.ty * T + T - 1;
    const bob = Math.round(Math.sin(t / 600 + p.tx)) === 1 ? 1 : 0;
    ctx.fillStyle = "rgba(60,45,30,0.22)";
    if (p.kind === "person") {
      ctx.fillRect(x + 1, y - 1, 6, 1);
      const bmp = p.facing === "up" ? CHAR_UP : p.facing === "side" ? CHAR_SIDE : CHAR_DOWN;
      drawBitmap(ctx, bmp, p.palette, x, y - bmp.length - bob, p.flip);
    } else if (p.kind === "cat") {
      ctx.fillRect(x + 1, y - 1, 6, 1);
      drawBitmap(ctx, CAT, p.palette, x - 1, y - CAT.length - bob, p.flip);
    } else {
      ctx.fillRect(x + 1, y - 1, 6, 1);
      drawBitmap(ctx, DUCK, DUCK_PALETTE, x, y - DUCK.length - bob, p.flip);
    }
  };

  const drawBubble = (x: number, y: number, t: number) => {
    const bob = Math.round(Math.sin(t / 200)) === 1 ? 1 : 0;
    const bx = x - 4;
    const by = y - 14 - bob;
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(bx, by, 9, 11);
    ctx.fillStyle = "#fff6d6";
    ctx.fillRect(bx + 1, by + 1, 7, 9);
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(bx + 3, by + 10, 3, 2);
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(bx + 3, by + 3, 3, 1);
    ctx.fillRect(bx + 3, by + 5, 2, 1);
    ctx.fillRect(bx + 3, by + 7, 3, 1);
    ctx.fillRect(bx + 3, by + 3, 1, 5);
  };

  const draw = (t: number) => {
    // resizing a canvas resets its context, so the pixel settings live here
    ctx.imageSmoothingEnabled = false;
    const vw = canvas.width;
    const vh = canvas.height;
    const layer = sceneLayer(scene);
    const sceneW = layer.width;
    const sceneH = layer.height;
    let camX = Math.round(px + PW / 2 - vw / 2);
    let camY = Math.round(py + PH / 2 - vh / 2);
    camX = sceneW <= vw ? Math.round((sceneW - vw) / 2) : Math.max(0, Math.min(camX, sceneW - vw));
    camY = sceneH <= vh ? Math.round((sceneH - vh) / 2) : Math.max(0, Math.min(camY, sceneH - vh));

    ctx.fillStyle = scene.outdoor ? "#7ec850" : "#241f33";
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.drawImage(layer, 0, 0);

    scene.coins.forEach(([tx, ty], i) => {
      if (taken.has(`${scene.id}:${i}`)) return;
      drawCoin(tx * T + T / 2, ty * T + T / 2, t, i);
    });

    // people and player, sorted so whoever is lower is drawn in front
    const actors: { y: number; render: () => void }[] = scene.people.map(p => ({
      y: p.ty * T + T,
      render: () => drawPerson(p, t),
    }));
    actors.push({
      y: py + PH,
      render: () => {
        const bob = walkPhase > 0 && Math.floor(walkPhase) % 2 === 0 ? 1 : 0;
        ctx.fillStyle = "rgba(60,45,30,0.25)";
        ctx.fillRect(px - 1, py + PH - 1, 10, 1);
        const bmp = facing === "up" ? PLAYER_UP : facing === "side" ? PLAYER_SIDE : PLAYER_DOWN;
        const ox = Math.round((PW - bmp[0]!.length) / 2);
        drawBitmap(ctx, bmp, PLAYER_PALETTE, Math.round(px) + ox, Math.round(py + PH - bmp.length - bob), flip);
      },
    });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.render());

    if (prompt && !dialogue) drawBubble(Math.round(px) + 4, Math.round(py) - 8, t);

    ctx.restore();

    const tint = scene.outdoor ? dayTint() : scene.dim ?? (clock > 660 ? "rgba(74, 78, 156, 0.18)" : null);
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (fade > 0) {
      ctx.fillStyle = `rgba(20, 16, 30, ${fade})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  };

  /* ---------- loop ---------- */

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
      dialogue: dialogue ? dialogue.slice(dialogueIndex, dialogueIndex + 1) : null,
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

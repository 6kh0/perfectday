import { charPalette, catPalette, type Palette } from "./sprites";

export type SceneId = "town" | "home" | "diner" | "arcade" | "catcafe" | "cinema" | "park";

export const DAY_START = 9 * 60; // 9:00 AM
export const DAY_END = 21 * 60; // 9:00 PM

/* ---------- grid helpers (built in code so no ASCII miscounts) ---------- */

type Grid = string[][];

const grid = (w: number, h: number, fill: string): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => fill));

function rect(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j]?.[i] !== undefined) g[j]![i] = ch;
}

const put = (g: Grid, cells: [number, number][], ch: string) => {
  for (const [x, y] of cells) if (g[y]?.[x] !== undefined) g[y]![x] = ch;
};

const rows = (g: Grid) => g.map(r => r.join(""));

/** four walls (2 tiles thick at the top), a floor, and a door in the bottom wall */
function room(w: number, h: number, floor: string, doorX: number): Grid {
  const g = grid(w, h, "#");
  rect(g, 1, 2, w - 2, h - 3, floor);
  g[h - 1]![doorX] = "D";
  g[h - 1]![doorX + 1] = "D";
  return g;
}

/* ---------- activities: the things that make up a day ---------- */

export type Activity = {
  id: string;
  title: string;
  cost: number; // coins
  minutes: number;
  joy: number;
  memory: string;
  lines: string[];
  requires?: string; // another activity id that must be done first
  ends?: boolean; // ends the day
};

export const ACTIVITIES: Record<string, Activity> = {
  lunch: {
    id: "lunch",
    title: "Lunch with friends",
    cost: 3,
    minutes: 120,
    joy: 18,
    memory: "Split a plate of fries and laughed until the waiter checked on us.",
    lines: [
      "MAYA: There you are! We ordered you a lemonade already.",
      "You slide into the booth. Somebody starts a story you've heard four times.",
      "It is somehow funnier every time.",
      "You stay long past the last fry. (+18 joy)",
    ],
  },
  arcade: {
    id: "arcade",
    title: "Play the arcade",
    cost: 4,
    minutes: 150,
    joy: 15,
    memory: "Beat the high score on the dusty racing cabinet. Initials: YOU.",
    lines: [
      "You feed the machine a fistful of tokens.",
      "Neon, buttons, that one song looping forever.",
      "Third try on the racing cabinet — you take the top slot.",
      "You type your initials very slowly, on purpose. (+15 joy)",
    ],
  },
  claw: {
    id: "claw",
    title: "One go on the claw machine",
    cost: 2,
    minutes: 15,
    joy: 6,
    memory: "Won a slightly cross-eyed frog plush on the second try.",
    lines: [
      "The claw wobbles. Descends. Closes on nothing.",
      "Second try: it lifts a frog plush with an unsettling expression.",
      "You love him immediately. (+6 joy)",
    ],
  },
  catcafe: {
    id: "catcafe",
    title: "Afternoon at the cat cafe",
    cost: 3,
    minutes: 120,
    joy: 16,
    memory: "A tabby fell asleep on my lap and I didn't move for an hour.",
    lines: [
      "BARISTA: House rule — if a cat sits on you, you live there now.",
      "You get a warm drink and sit on the floor like everyone else.",
      "A tabby considers you, then commits. (+16 joy)",
      "You can pet the other cats now.",
    ],
  },
  pet: {
    id: "pet",
    title: "Pet a cat",
    cost: 0,
    minutes: 5,
    joy: 3,
    memory: "Made friends with every cat in the building.",
    requires: "catcafe",
    lines: ["Purring. Loud, unearned, complete trust. (+3 joy)"],
  },
  movie: {
    id: "movie",
    title: "Go to the movies",
    cost: 5,
    minutes: 165,
    joy: 18,
    memory: "Front row, too much popcorn, a movie that was better than it needed to be.",
    lines: [
      "USHER: Screen two. It's the good one.",
      "The lights go down. The sound goes up. Somebody's phone buzzes and is silenced.",
      "For two hours you are not thinking about anything else. (+18 joy)",
    ],
  },
  walk: {
    id: "walk",
    title: "Walk the park loop",
    cost: 0,
    minutes: 90,
    joy: 10,
    memory: "Walked the whole park loop with no particular destination.",
    lines: [
      "You take the long way around the pond.",
      "Wind in the big trees, a dog losing its mind about a stick.",
      "Nothing happens. It's perfect. (+10 joy)",
    ],
  },
  ducks: {
    id: "ducks",
    title: "Feed the ducks",
    cost: 1,
    minutes: 20,
    joy: 5,
    memory: "Negotiated with seven ducks. Lost.",
    lines: [
      "You buy a paper cone of duck-safe seed.",
      "Seven ducks arrive with the energy of a small business meeting.",
      "One stands on your shoe. (+5 joy)",
    ],
  },
  nap: {
    id: "nap",
    title: "Nap under the big tree",
    cost: 0,
    minutes: 60,
    joy: 8,
    memory: "Fell asleep under the big tree with sun coming through the leaves.",
    lines: [
      "You lie back in the grass. The leaves do their shifting-light thing.",
      "You wake up with a leaf in your hair and no idea what time it is. (+8 joy)",
    ],
  },
  chill: {
    id: "chill",
    title: "Chill at home",
    cost: 0,
    minutes: 120,
    joy: 12,
    memory: "Blanket, tea, three episodes of something comforting.",
    lines: [
      "Blanket. Tea. The show you've already seen.",
      "The couch does that thing where it becomes impossible to leave.",
      "You don't fight it. (+12 joy)",
    ],
  },
  snack: {
    id: "snack",
    title: "Make a snack",
    cost: 0,
    minutes: 20,
    joy: 4,
    memory: "Made an excellent sandwich and told no one.",
    lines: ["You build a genuinely excellent sandwich.", "Nobody sees it. It still counts. (+4 joy)"],
  },
  sleep: {
    id: "sleep",
    title: "Call it a day",
    cost: 0,
    minutes: 0,
    joy: 0,
    memory: "",
    lines: [],
    ends: true,
  },
};

/* ---------- scene contents ---------- */

export type Thing = {
  id: string;
  tx: number;
  ty: number;
  label: string;
  activity?: string;
  lines?: string[];
};

export type Person = {
  id: string;
  tx: number;
  ty: number;
  kind: "person" | "cat" | "duck";
  palette: Palette;
  facing: "down" | "up" | "side";
  flip?: boolean;
  label?: string;
  lines?: string[];
};

export type Portal = {
  tx: number;
  ty: number;
  to: SceneId;
  spawn: [number, number];
  label: string;
};

export type Building = {
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  roofDark: string;
  wall: string;
  doorX: number;
  icon: string;
  name: string;
};

export type Scene = {
  id: SceneId;
  name: string;
  outdoor: boolean;
  floor: string;
  dim?: string;
  tiles: string[];
  buildings: Building[];
  things: Thing[];
  people: Person[];
  portals: Portal[];
  coins: [number, number][];
  spawn: [number, number];
};

/* ---------- TOWN ---------- */

const townGrid = grid(30, 22, ".");
rect(townGrid, 0, 0, 30, 1, "T");
rect(townGrid, 0, 21, 30, 1, "T");
rect(townGrid, 0, 0, 1, 22, "T");
rect(townGrid, 29, 0, 1, 22, "T");
rect(townGrid, 1, 7, 28, 2, "="); // north street
rect(townGrid, 1, 18, 28, 2, "="); // south street
rect(townGrid, 13, 9, 2, 9, "="); // main street
rect(townGrid, 25, 10, 4, 1, "="); // lane to the park gate
townGrid[10]![29] = "g";
// building footprints
rect(townGrid, 3, 2, 6, 5, "H");
rect(townGrid, 11, 2, 7, 5, "H");
rect(townGrid, 20, 2, 7, 5, "H");
rect(townGrid, 3, 13, 7, 5, "H");
rect(townGrid, 13, 13, 8, 5, "H");
// decoration
rect(townGrid, 2, 10, 4, 3, "~");
put(townGrid, [[9, 10], [10, 12], [22, 12], [24, 11], [6, 20], [21, 20], [2, 15], [11, 15]], "T");
put(townGrid, [[8, 11], [23, 13], [3, 20], [26, 20], [11, 11]], "B");
put(townGrid, [[2, 9], [27, 9], [2, 17], [27, 17]], "l");
put(townGrid, [[16, 10], [17, 10], [11, 16], [12, 16]], "n");
put(
  townGrid,
  [[2, 1], [7, 1], [12, 1], [19, 1], [24, 1], [6, 9], [19, 9], [6, 12], [25, 15], [17, 20], [9, 20], [15, 11], [24, 16]],
  ",",
);

export const TOWN: Scene = {
  id: "town",
  name: "Sunbeam Street",
  outdoor: true,
  floor: ".",
  tiles: rows(townGrid),
  buildings: [
    { x: 3, y: 2, w: 6, h: 5, roof: "#f08a76", roofDark: "#d16a58", wall: "#fff1d6", doorX: 5, icon: "home", name: "Your place" },
    { x: 11, y: 2, w: 7, h: 5, roof: "#ffd166", roofDark: "#e0ac3f", wall: "#fff1d6", doorX: 14, icon: "diner", name: "The Bluebird Diner" },
    { x: 20, y: 2, w: 7, h: 5, roof: "#8f7de8", roofDark: "#7263c4", wall: "#ece7ff", doorX: 23, icon: "arcade", name: "Quarterhouse Arcade" },
    { x: 3, y: 13, w: 7, h: 5, roof: "#ff9fb0", roofDark: "#e0808f", wall: "#fff0f4", doorX: 6, icon: "catcafe", name: "Two Whiskers Cat Cafe" },
    { x: 13, y: 13, w: 8, h: 5, roof: "#6fbde8", roofDark: "#4f9ac4", wall: "#eef6ff", doorX: 16, icon: "cinema", name: "The Roxy" },
  ],
  things: [
    { id: "notice", tx: 15, ty: 8, label: "Read the notice board", lines: [
      "TODAY ON SUNBEAM STREET",
      "• Diner: lunch special, friends already inside",
      "• Arcade: the racing cabinet is fixed (allegedly)",
      "• Cat cafe: nine cats, all of them opinionated",
      "• The Roxy: one showing, and it's the good one",
      "• The park is free. So is the pond. So are the ducks.",
      "Coins are scattered all over town. Find them, afford more of the day.",
    ] },
  ],
  people: [
    { id: "gran", tx: 18, ty: 9, kind: "person", palette: charPalette("#cfc6d8", "#7bd06b", "#8a6c4c"), facing: "down", label: "Say hello", lines: [
      "GRAN: A whole free day, and you're spending it walking past me?",
      "GRAN: Go on. You can't fit it all in — that's the point of a day.",
    ] },
    { id: "kid", tx: 11, ty: 19, kind: "person", palette: charPalette("#3b2a1c", "#8fd3ff", "#e2705f"), facing: "up", label: "Say hello", lines: [
      "KID: I found two coins behind the diner. There's more back there.",
      "KID: Nobody ever looks behind the buildings.",
    ] },
  ],
  portals: [
    { tx: 5, ty: 7, to: "home", spawn: [9, 10], label: "Your place" },
    { tx: 14, ty: 7, to: "diner", spawn: [9, 10], label: "The Bluebird Diner" },
    { tx: 23, ty: 7, to: "arcade", spawn: [9, 10], label: "Quarterhouse Arcade" },
    { tx: 6, ty: 18, to: "catcafe", spawn: [9, 10], label: "Two Whiskers Cat Cafe" },
    { tx: 16, ty: 18, to: "cinema", spawn: [9, 10], label: "The Roxy" },
    { tx: 29, ty: 10, to: "park", spawn: [1, 8], label: "Fernway Park" },
  ],
  coins: [[2, 1], [16, 1], [26, 1], [7, 11], [22, 15], [27, 20]],
  spawn: [5, 8],
};

/* ---------- HOME ---------- */

const homeGrid = room(24, 14, "w", 11);
rect(homeGrid, 2, 2, 2, 3, "m"); // bed: pillow end against the wall
rect(homeGrid, 18, 2, 4, 1, "K"); // kitchen
rect(homeGrid, 10, 7, 4, 1, "v"); // sofa
rect(homeGrid, 10, 8, 4, 2, "c"); // rug
rect(homeGrid, 11, 3, 2, 1, "V"); // tv
rect(homeGrid, 18, 7, 2, 1, "t");
put(homeGrid, [[1, 12], [22, 12], [6, 7]], "p");
put(homeGrid, [[2, 6], [3, 6]], "t");

export const HOME: Scene = {
  id: "home",
  name: "Your place",
  outdoor: false,
  floor: "w",
  tiles: rows(homeGrid),
  buildings: [],
  things: [
    { id: "sofa", tx: 11, ty: 7, label: ACTIVITIES.chill!.title, activity: "chill" },
    { id: "kitchen", tx: 19, ty: 2, label: ACTIVITIES.snack!.title, activity: "snack" },
    { id: "bed", tx: 2, ty: 4, label: "Go to bed (ends the day)", activity: "sleep" },
    { id: "window", tx: 8, ty: 2, label: "Look out of the window", lines: [
      "The street is already warm. Somebody's radio is on somewhere.",
      "A whole day, and nobody expecting you anywhere.",
    ] },
  ],
  people: [],
  portals: [
    { tx: 11, ty: 13, to: "town", spawn: [5, 8], label: "Sunbeam Street" },
    { tx: 12, ty: 13, to: "town", spawn: [5, 8], label: "Sunbeam Street" },
  ],
  coins: [[20, 11]],
  spawn: [11, 12],
};
/* ---------- DINER ---------- */

const dinerGrid = room(24, 14, "s", 11);
rect(dinerGrid, 2, 3, 8, 1, "-"); // counter, the cook stands behind it
rect(dinerGrid, 14, 3, 2, 1, "t"); // the friends' booth
put(dinerGrid, [[13, 3], [16, 3]], "b");
rect(dinerGrid, 14, 8, 2, 1, "t");
put(dinerGrid, [[13, 8], [16, 8]], "b");
rect(dinerGrid, 3, 8, 2, 1, "t");
put(dinerGrid, [[2, 8], [5, 8]], "b");
rect(dinerGrid, 19, 8, 2, 1, "t");
put(dinerGrid, [[18, 8], [21, 8]], "b");
rect(dinerGrid, 19, 3, 2, 1, "t");
put(dinerGrid, [[18, 3], [21, 3]], "b");
put(dinerGrid, [[11, 2], [1, 12], [22, 12]], "p");

export const DINER: Scene = {
  id: "diner",
  name: "The Bluebird Diner",
  outdoor: false,
  floor: "s",
  tiles: rows(dinerGrid),
  buildings: [],
  things: [
    { id: "table", tx: 14, ty: 4, label: ACTIVITIES.lunch!.title, activity: "lunch" },
    { id: "counter", tx: 5, ty: 4, label: "Chat with the cook", lines: [
      "COOK: Your table's the loud one. As usual.",
      "COOK: Fries are on the house if you actually sit down and stay a while.",
    ] },
  ],
  people: [
    { id: "maya", tx: 13, ty: 3, kind: "person", palette: charPalette("#3b2a1c", "#ffd166", "#4a6fd4"), facing: "side", label: "Maya", lines: ["MAYA: Sit! Sit sit sit. We've been holding this booth for an hour."] },
    { id: "theo", tx: 16, ty: 3, kind: "person", palette: charPalette("#a8663b", "#7bd06b", "#3b3350"), facing: "side", flip: true, label: "Theo", lines: ["THEO: I have a story. It's long and it's about a bird. You'll love it."] },
    { id: "cook", tx: 5, ty: 2, kind: "person", palette: charPalette("#cfc6d8", "#f4f1ff", "#8a6c4c"), facing: "down" },
  ],
  portals: [
    { tx: 11, ty: 13, to: "town", spawn: [14, 8], label: "Sunbeam Street" },
    { tx: 12, ty: 13, to: "town", spawn: [14, 8], label: "Sunbeam Street" },
  ],
  coins: [[21, 11]],
  spawn: [11, 12],
};
/* ---------- ARCADE ---------- */

const arcadeGrid = room(24, 14, "k", 11);
rect(arcadeGrid, 2, 2, 8, 1, "A");
rect(arcadeGrid, 14, 2, 8, 1, "A");
rect(arcadeGrid, 6, 6, 12, 1, "A");
rect(arcadeGrid, 2, 11, 3, 1, "-");
put(arcadeGrid, [[22, 11], [1, 6], [12, 2]], "p");

export const ARCADE: Scene = {
  id: "arcade",
  name: "Quarterhouse Arcade",
  outdoor: false,
  floor: "k",
  tiles: rows(arcadeGrid),
  buildings: [],
  things: [
    { id: "cabinets", tx: 11, ty: 6, label: ACTIVITIES.arcade!.title, activity: "arcade" },
    { id: "claw", tx: 21, ty: 2, label: ACTIVITIES.claw!.title, activity: "claw" },
    { id: "prizes", tx: 3, ty: 11, label: "Look at the prize wall", lines: [
      "A wall of plush frogs, sticker sheets and one enormous inflatable banana.",
      "ATTENDANT: The banana is nine thousand tickets. Nobody has ever gotten the banana.",
    ] },
  ],
  people: [
    { id: "attendant", tx: 3, ty: 12, kind: "person", palette: charPalette("#e2705f", "#8f7de8", "#3b3350"), facing: "up" },
    { id: "player2", tx: 15, ty: 7, kind: "person", palette: charPalette("#3b2a1c", "#ff5d73", "#4a6fd4"), facing: "up", label: "Say hello", lines: ["KID: I'm on level nine. Do not talk to me. Respectfully."] },
  ],
  portals: [
    { tx: 11, ty: 13, to: "town", spawn: [23, 8], label: "Sunbeam Street" },
    { tx: 12, ty: 13, to: "town", spawn: [23, 8], label: "Sunbeam Street" },
  ],
  coins: [[21, 4], [2, 8]],
  spawn: [11, 12],
};
/* ---------- CAT CAFE ---------- */

const catGrid = room(24, 14, "w", 11);
rect(catGrid, 2, 3, 6, 1, "-");
put(catGrid, [[19, 2], [19, 7], [2, 9], [14, 2]], "C");
rect(catGrid, 10, 4, 2, 1, "t");
rect(catGrid, 5, 9, 2, 1, "t");
rect(catGrid, 16, 10, 2, 1, "t");
rect(catGrid, 9, 7, 3, 2, "c");
rect(catGrid, 17, 4, 3, 2, "c");
put(catGrid, [[1, 12], [22, 12], [13, 9]], "p");

export const CATCAFE: Scene = {
  id: "catcafe",
  name: "Two Whiskers Cat Cafe",
  outdoor: false,
  floor: "w",
  tiles: rows(catGrid),
  buildings: [],
  things: [
    { id: "counter", tx: 4, ty: 4, label: ACTIVITIES.catcafe!.title, activity: "catcafe" },
  ],
  people: [
    { id: "barista", tx: 4, ty: 2, kind: "person", palette: charPalette("#6b4a8f", "#ff9fb0", "#3b3350"), facing: "down" },
    { id: "cat1", tx: 18, ty: 4, kind: "cat", palette: catPalette("#a9b4c9"), facing: "down", label: ACTIVITIES.pet!.title },
    { id: "cat2", tx: 10, ty: 7, kind: "cat", palette: catPalette("#4a4453"), facing: "down", label: ACTIVITIES.pet!.title },
    { id: "cat3", tx: 6, ty: 11, kind: "cat", palette: catPalette("#f4f1ff"), facing: "down", label: ACTIVITIES.pet!.title },
    { id: "cat4", tx: 20, ty: 9, kind: "cat", palette: catPalette("#c98b5a"), facing: "down", label: ACTIVITIES.pet!.title },
  ],
  portals: [
    { tx: 11, ty: 13, to: "town", spawn: [6, 19], label: "Sunbeam Street" },
    { tx: 12, ty: 13, to: "town", spawn: [6, 19], label: "Sunbeam Street" },
  ],
  coins: [[21, 4]],
  spawn: [11, 12],
};
/* ---------- CINEMA ---------- */

const cineGrid = room(24, 14, "j", 11);
rect(cineGrid, 4, 2, 16, 1, "S");
rect(cineGrid, 5, 5, 14, 1, "E");
rect(cineGrid, 5, 7, 14, 1, "E");
rect(cineGrid, 5, 9, 14, 1, "E");
rect(cineGrid, 2, 11, 3, 1, "-");
put(cineGrid, [[21, 11], [1, 4], [22, 2]], "p");

export const CINEMA: Scene = {
  id: "cinema",
  name: "The Roxy",
  outdoor: false,
  floor: "j",
  dim: "rgba(28, 20, 56, 0.22)",
  tiles: rows(cineGrid),
  buildings: [],
  things: [
    { id: "tickets", tx: 3, ty: 11, label: ACTIVITIES.movie!.title, activity: "movie" },
    { id: "poster", tx: 21, ty: 5, label: "Read the poster", lines: [
      "THE LONG WAY HOME — one showing daily",
      "\"Four stars. I cried at a bus stop.\" — someone in the queue",
    ] },
  ],
  people: [
    { id: "usher", tx: 5, ty: 11, kind: "person", palette: charPalette("#3b2a1c", "#e2705f", "#3b3350"), facing: "down", label: "Usher", lines: ["USHER: Screen two, and no, I won't tell you the ending."] },
  ],
  portals: [
    { tx: 11, ty: 13, to: "town", spawn: [16, 19], label: "Sunbeam Street" },
    { tx: 12, ty: 13, to: "town", spawn: [16, 19], label: "Sunbeam Street" },
  ],
  coins: [[20, 10]],
  spawn: [11, 12],
};
/* ---------- PARK ---------- */

const parkGrid = grid(24, 16, ".");
rect(parkGrid, 0, 0, 24, 1, "T");
rect(parkGrid, 0, 15, 24, 1, "T");
rect(parkGrid, 0, 0, 1, 16, "T");
rect(parkGrid, 23, 0, 1, 16, "T");
parkGrid[8]![0] = "g";
rect(parkGrid, 1, 8, 6, 1, "="); // path in from the gate
rect(parkGrid, 7, 3, 1, 9, "=");
rect(parkGrid, 7, 3, 11, 1, "=");
rect(parkGrid, 17, 3, 1, 9, "=");
rect(parkGrid, 7, 11, 11, 1, "=");
rect(parkGrid, 2, 2, 4, 4, "~"); // pond
put(parkGrid, [[20, 5], [20, 6], [21, 9], [3, 12], [12, 14], [19, 13], [9, 1], [14, 1]], "T");
put(parkGrid, [[5, 10], [11, 8], [15, 8], [2, 7], [21, 2]], "B");
put(parkGrid, [[9, 4], [15, 4], [9, 10], [15, 10]], "n");
put(parkGrid, [[4, 7], [6, 13], [13, 12], [19, 8], [11, 6], [13, 6], [2, 10], [22, 12], [8, 13]], ",");

export const PARK: Scene = {
  id: "park",
  name: "Fernway Park",
  outdoor: true,
  floor: ".",
  tiles: rows(parkGrid),
  buildings: [],
  things: [
    { id: "loop", tx: 12, ty: 3, label: ACTIVITIES.walk!.title, activity: "walk" },
    { id: "pond", tx: 4, ty: 6, label: ACTIVITIES.ducks!.title, activity: "ducks" },
    { id: "bigtree", tx: 20, ty: 6, label: ACTIVITIES.nap!.title, activity: "nap" },
  ],
  people: [
    { id: "duck1", tx: 3, ty: 6, kind: "duck", palette: {}, facing: "down" },
    { id: "duck2", tx: 5, ty: 6, kind: "duck", palette: {}, facing: "down", flip: true },
    { id: "jogger", tx: 12, ty: 11, kind: "person", palette: charPalette("#3b2a1c", "#7bd06b", "#4a6fd4"), facing: "up", label: "Say hello", lines: ["JOGGER: Third loop! ...Okay, second. Okay, first."] },
  ],
  portals: [{ tx: 0, ty: 8, to: "town", spawn: [27, 10], label: "Sunbeam Street" }],
  coins: [[20, 2], [4, 13], [21, 13]],
  spawn: [1, 8],
};

export const SCENES: Record<SceneId, Scene> = {
  town: TOWN,
  home: HOME,
  diner: DINER,
  arcade: ARCADE,
  catcafe: CATCAFE,
  cinema: CINEMA,
  park: PARK,
};

export const TOTAL_COINS = Object.values(SCENES).reduce((n, s) => n + s.coins.length, 0);

/* ---------- end-of-day rating ---------- */

export function rateDay(joy: number, places: number) {
  if (joy >= 55 && places >= 4) return { title: "A PERFECT DAY", note: "You couldn't have fit more in. You didn't try to." };
  if (joy >= 45) return { title: "A REALLY LOVELY DAY", note: "Close. One more stop and you'd have had it." };
  if (joy >= 30) return { title: "A GOOD DAY", note: "Solid. There were doors you walked past, though." };
  if (joy >= 15) return { title: "A QUIET DAY", note: "Small and slow. Some days are meant to be." };
  return { title: "A DAY", note: "You mostly wandered. Tomorrow, try spending some coins." };
}

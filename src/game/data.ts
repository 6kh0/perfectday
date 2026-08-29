import { POTATO_SKIN, catPalette, fruitPalette, type Palette, type Skin } from "./sprites";

export type SceneId = "town" | "home" | "diner" | "arcade" | "catcafe" | "cinema" | "park";

export const DAY_START = 9 * 60;
export const DAY_END = 21 * 60;

type Grid = string[][];
type XY = [number, number];

const grid = (w: number, h: number, fill: string): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => fill));

const rect = (g: Grid, x: number, y: number, w: number, h: number, ch: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j]?.[i] !== undefined) g[j]![i] = ch;
};

const put = (g: Grid, cells: XY[], ch: string) => {
  for (const [x, y] of cells) if (g[y]?.[x] !== undefined) g[y]![x] = ch;
};

const rows = (g: Grid) => g.map(r => r.join(""));

const border = (g: Grid, w: number, h: number, ch = "T") => {
  rect(g, 0, 0, w, 1, ch);
  rect(g, 0, h - 1, w, 1, ch);
  rect(g, 0, 0, 1, h, ch);
  rect(g, w - 1, 0, 1, h, ch);
};

function room(w: number, h: number, floor: string, doorX: number): Grid {
  const g = grid(w, h, "#");
  rect(g, 1, 2, w - 2, h - 3, floor);
  g[h - 1]![doorX] = g[h - 1]![doorX + 1] = "D";
  return g;
}

const booth = (g: Grid, x: number, y: number) => {
  rect(g, x, y, 2, 1, "t");
  put(g, [[x - 1, y], [x + 2, y]], "b");
};

/* ---------- activities ---------- */

export type Activity = {
  title: string;
  cost: number;
  minutes: number;
  joy: number;
  memory: string;
  lines: string[];
  requires?: string;
  ends?: boolean;
};

const act = (
  title: string,
  cost: number,
  minutes: number,
  joy: number,
  memory: string,
  lines: string[],
  extra: Partial<Activity> = {},
): Activity => ({ title, cost, minutes, joy, memory, lines, ...extra });

export const ACTIVITIES: Record<string, Activity> = {
  lunch: act("Lunch with friends", 3, 120, 18, "Split a plate of fries and laughed until the waiter checked on us.", [
    "MAYA: There you are! We ordered you a lemonade already.",
    "You slide into the booth. Somebody starts a story you've heard four times.",
    "It is somehow funnier every time.",
    "You stay long past the last fry. (+18 joy)",
  ]),
  arcade: act("Play the arcade", 4, 150, 15, "Beat the high score on the dusty racing cabinet. Initials: YOU.", [
    "You feed the machine a fistful of tokens.",
    "Neon, buttons, that one song looping forever.",
    "Third try on the racing cabinet — you take the top slot.",
    "You type your initials very slowly, on purpose. (+15 joy)",
  ]),
  claw: act("One go on the claw machine", 2, 15, 6, "Won a slightly cross-eyed frog plush on the second try.", [
    "The claw wobbles. Descends. Closes on nothing.",
    "Second try: it lifts a frog plush with an unsettling expression.",
    "You love him immediately. (+6 joy)",
  ]),
  catcafe: act("Afternoon at the cat cafe", 3, 120, 16, "A tabby fell asleep on my lap and I didn't move for an hour.", [
    "BARISTA: House rule — if a cat sits on you, you live there now.",
    "You get a warm drink and sit on the floor like everyone else.",
    "A tabby considers you, then commits. (+16 joy)",
    "You can pet the other cats now.",
  ]),
  pet: act("Pet a cat", 0, 5, 3, "Made friends with every cat in the building.", ["Purring. Loud, unearned, complete trust. (+3 joy)"], {
    requires: "catcafe",
  }),
  movie: act("Go to the movies", 5, 165, 18, "Front row, too much popcorn, a movie that was better than it needed to be.", [
    "USHER: Screen two. It's the good one.",
    "The lights go down. The sound goes up. Somebody's phone buzzes and is silenced.",
    "For two hours you are not thinking about anything else. (+18 joy)",
  ]),
  walk: act("Walk the park loop", 0, 90, 10, "Walked the whole park loop with no particular destination.", [
    "You take the long way around the pond.",
    "Wind in the big trees, a dog losing its mind about a stick.",
    "Nothing happens. It's perfect. (+10 joy)",
  ]),
  ducks: act("Feed the ducks", 1, 20, 5, "Negotiated with seven ducks. Lost.", [
    "You buy a paper cone of duck-safe seed.",
    "Seven ducks arrive with the energy of a small business meeting.",
    "One stands on your shoe. (+5 joy)",
  ]),
  nap: act("Nap under the big tree", 0, 60, 8, "Fell asleep under the big tree with sun coming through the leaves.", [
    "You lie back in the grass. The leaves do their shifting-light thing.",
    "You wake up with a leaf in your hair and no idea what time it is. (+8 joy)",
  ]),
  chill: act("Chill at home", 0, 120, 12, "Blanket, tea, three episodes of something comforting.", [
    "Blanket. Tea. The show you've already seen.",
    "The couch does that thing where it becomes impossible to leave.",
    "You don't fight it. (+12 joy)",
  ]),
  snack: act("Make a snack", 0, 20, 4, "Made an excellent sandwich and told no one.", [
    "You build a genuinely excellent sandwich.",
    "Nobody sees it. It still counts. (+4 joy)",
  ]),
  sleep: act("Call it a day", 0, 0, 0, "", [], { ends: true }),
};

/* ---------- scene contents ---------- */

export type Thing = { id: string; tx: number; ty: number; label: string; activity?: string; lines?: string[]; skinSwap?: boolean };
export type Person = {
  id: string;
  tx: number;
  ty: number;
  kind: "citizen" | "cat" | "duck";
  palette: Palette;
  facing: "down" | "up" | "side";
  /** citizens normally wear the player art in their own colours; a skin overrides both */
  skin?: Skin;
  flip?: boolean;
  label?: string;
  lines?: string[];
};
export type Portal = { tx: number; ty: number; to: SceneId; spawn: XY; label: string };
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
  coins: XY[];
  spawn: XY;
};

const spot = (id: string, tx: number, ty: number, activity: string, label?: string): Thing => ({
  id,
  tx,
  ty,
  activity,
  label: label ?? ACTIVITIES[activity]!.title,
});

const look = (id: string, tx: number, ty: number, label: string, lines: string[]): Thing => ({ id, tx, ty, label, lines });

const door = (spawn: XY): Portal[] => [
  { tx: 11, ty: 13, to: "town", spawn, label: "Sunbeam Street" },
  { tx: 12, ty: 13, to: "town", spawn, label: "Sunbeam Street" },
];

const indoor = (
  id: SceneId,
  name: string,
  floor: string,
  g: Grid,
  spawn: XY,
  rest: Pick<Scene, "things" | "people" | "coins"> & Partial<Pick<Scene, "dim">>,
): Scene => ({
  id,
  name,
  outdoor: false,
  floor,
  tiles: rows(g),
  buildings: [],
  portals: door(spawn),
  spawn: [11, 12],
  ...rest,
});

const kitty = (id: string, tx: number, ty: number, fur: string): Person => ({
  id,
  tx,
  ty,
  kind: "cat",
  palette: catPalette(fur),
  facing: "down",
  label: ACTIVITIES.pet!.title,
});

const citizen = (
  id: string,
  tx: number,
  ty: number,
  pal: [string, string, string, string],
  facing: Person["facing"],
  extra: Partial<Person> = {},
): Person => ({ id, tx, ty, kind: "citizen", palette: fruitPalette(...pal), facing, ...extra });

/* ---------- TOWN ---------- */

const townGrid = grid(30, 22, ".");
border(townGrid, 30, 22);
rect(townGrid, 1, 7, 28, 2, "=");
rect(townGrid, 1, 18, 28, 2, "=");
rect(townGrid, 13, 9, 2, 9, "=");
rect(townGrid, 25, 10, 4, 1, "=");
townGrid[10]![29] = "g";
rect(townGrid, 3, 2, 6, 5, "H");
rect(townGrid, 11, 2, 7, 5, "H");
rect(townGrid, 20, 2, 7, 5, "H");
rect(townGrid, 3, 13, 7, 5, "H");
rect(townGrid, 13, 13, 8, 5, "H");
rect(townGrid, 2, 10, 4, 3, "~");
put(townGrid, [[9, 10], [10, 12], [24, 14], [24, 11], [6, 20], [21, 20], [2, 15], [11, 15]], "T");
put(townGrid, [[8, 11], [23, 13], [3, 20], [26, 20], [11, 11]], "B");
put(townGrid, [[2, 9], [27, 9], [2, 17], [27, 17]], "l");
put(townGrid, [[11, 16], [12, 16]], "n");
rect(townGrid, 16, 10, 3, 1, "Q");
rect(townGrid, 16, 11, 3, 1, "P");
put(
  townGrid,
  [[2, 1], [7, 1], [12, 1], [19, 1], [24, 1], [6, 9], [19, 9], [6, 12], [25, 15], [17, 20], [9, 20], [15, 11], [24, 16]],
  ",",
);

const bldg = (
  x: number,
  y: number,
  w: number,
  h: number,
  roof: string,
  roofDark: string,
  wall: string,
  doorX: number,
  icon: string,
  name: string,
): Building => ({ x, y, w, h, roof, roofDark, wall, doorX, icon, name });

export const TOWN: Scene = {
  id: "town",
  name: "Sunbeam Street",
  outdoor: true,
  floor: ".",
  tiles: rows(townGrid),
  buildings: [
    bldg(3, 2, 6, 5, "#f08a76", "#d16a58", "#fff1d6", 5, "home", "Your place"),
    bldg(11, 2, 7, 5, "#ffd166", "#e0ac3f", "#fff1d6", 14, "diner", "The Bluebird Diner"),
    bldg(20, 2, 7, 5, "#8f7de8", "#7263c4", "#ece7ff", 23, "arcade", "Quarterhouse Arcade"),
    bldg(3, 13, 7, 5, "#ff9fb0", "#e0808f", "#fff0f4", 6, "catcafe", "Two Whiskers Cat Cafe"),
    bldg(13, 13, 8, 5, "#6fbde8", "#4f9ac4", "#eef6ff", 16, "cinema", "The Roxy"),
  ],
  things: [
    { id: "stall", tx: 17, ty: 11, label: "Become the potato cat", skinSwap: true },
    look("notice", 15, 8, "Read the notice board", [
      "TODAY ON SUNBEAM STREET",
      "• Diner: lunch special, friends already inside",
      "• Arcade: the racing cabinet is fixed (allegedly)",
      "• Cat cafe: nine cats, all of them opinionated",
      "• The Roxy: one showing, and it's the good one",
      "• The park is free. So is the pond. So are the ducks.",
      "• Spud's stall is open. Ask about the other thing he does.",
      "Coins are scattered all over town. Find them, afford more of the day.",
    ]),
  ],
  people: [
    citizen("gran", 10, 9, ["#8f7de8", "#7263c4", "#c4b9f7", "#cfc6d8"], "down", {
      label: "Say hello",
      lines: [
        "GRAN: A whole free day, and you're spending it walking past me?",
        "GRAN: Go on. You can't fit it all in — that's the point of a day.",
      ],
    }),
    {
      id: "spud",
      tx: 20,
      ty: 11,
      kind: "citizen",
      palette: POTATO_SKIN.palette,
      skin: POTATO_SKIN,
      facing: "side",
      flip: true,
      label: "Spud",
      lines: [
        "SPUD: Morning. Potatoes, three for a coin, and I'm not haggling.",
        "SPUD: ...You're looking at me funny. Yes. I used to be a strawberry.",
        "SPUD: Stall does both. Spuds, and the other thing. The other thing is free.",
        "SPUD: Stand at the counter and I'll sort you out. Wears off whenever you like.",
      ],
    },
    citizen("kid", 11, 19, ["#4a6fd4", "#3a58ab", "#8fa8ef", "#fffde3"], "up", {
      label: "Say hello",
      lines: [
        "KID: I found two coins behind the diner. There's more back there.",
        "KID: Nobody ever looks behind the buildings.",
      ],
    }),
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

/* ---------- indoor rooms ---------- */

const homeGrid = room(24, 14, "w", 11);
rect(homeGrid, 2, 2, 2, 3, "m");
rect(homeGrid, 18, 2, 4, 1, "K");
rect(homeGrid, 10, 7, 4, 1, "v");
rect(homeGrid, 10, 8, 4, 2, "c");
rect(homeGrid, 11, 3, 2, 1, "V");
rect(homeGrid, 18, 7, 2, 1, "t");
put(homeGrid, [[1, 12], [22, 12], [6, 7]], "p");
put(homeGrid, [[2, 6], [3, 6]], "t");

export const HOME = indoor("home", "Your place", "w", homeGrid, [5, 8], {
  things: [
    spot("sofa", 11, 7, "chill"),
    spot("kitchen", 19, 2, "snack"),
    spot("bed", 2, 4, "sleep", "Go to bed (ends the day)"),
    look("window", 8, 2, "Look out of the window", [
      "The street is already warm. Somebody's radio is on somewhere.",
      "A whole day, and nobody expecting you anywhere.",
    ]),
  ],
  people: [],
  coins: [[20, 11]],
});

const dinerGrid = room(24, 14, "s", 11);
rect(dinerGrid, 2, 3, 8, 1, "-");
for (const [x, y] of [[14, 3], [14, 8], [3, 8], [19, 8], [19, 3]] as XY[]) booth(dinerGrid, x, y);
put(dinerGrid, [[11, 2], [1, 12], [22, 12]], "p");

export const DINER = indoor("diner", "The Bluebird Diner", "s", dinerGrid, [14, 8], {
  things: [
    spot("table", 14, 4, "lunch"),
    look("counter", 5, 4, "Chat with the cook", [
      "COOK: Your table's the loud one. As usual.",
      "COOK: Fries are on the house if you actually sit down and stay a while.",
    ]),
  ],
  people: [
    citizen("maya", 13, 3, ["#ffd166", "#e0ac3f", "#fff3c4", "#fffde3"], "side", {
      label: "Maya",
      lines: ["MAYA: Sit! Sit sit sit. We've been holding this booth for an hour."],
    }),
    citizen("theo", 16, 3, ["#7bd06b", "#5bab4d", "#c4ecb8", "#f0d6b0"], "side", {
      flip: true,
      label: "Theo",
      lines: ["THEO: I have a story. It's long and it's about a bird. You'll love it."],
    }),
    citizen("cook", 5, 2, ["#ffb38a", "#e0906a", "#ffdcc6", "#fffde3"], "down"),
  ],
  coins: [[21, 11]],
});

const arcadeGrid = room(24, 14, "k", 11);
rect(arcadeGrid, 2, 2, 8, 1, "A");
rect(arcadeGrid, 14, 2, 8, 1, "A");
rect(arcadeGrid, 6, 6, 12, 1, "A");
rect(arcadeGrid, 2, 11, 3, 1, "-");
put(arcadeGrid, [[22, 11], [1, 6], [12, 2]], "p");

export const ARCADE = indoor("arcade", "Quarterhouse Arcade", "k", arcadeGrid, [23, 8], {
  things: [
    spot("cabinets", 11, 6, "arcade"),
    spot("claw", 21, 2, "claw"),
    look("prizes", 3, 11, "Look at the prize wall", [
      "A wall of plush frogs, sticker sheets and one enormous inflatable banana.",
      "ATTENDANT: The banana is nine thousand tickets. Nobody has ever gotten the banana.",
    ]),
  ],
  people: [
    citizen("attendant", 3, 12, ["#6b4a8f", "#553a70", "#a98fc9", "#cfc6d8"], "up"),
    citizen("player2", 15, 7, ["#ff9f4a", "#e0803a", "#ffd2a3", "#fffde3"], "up", {
      label: "Say hello",
      lines: ["KID: I'm on level nine. Do not talk to me. Respectfully."],
    }),
  ],
  coins: [[21, 4], [2, 8]],
});

const catGrid = room(24, 14, "w", 11);
rect(catGrid, 2, 3, 6, 1, "-");
put(catGrid, [[19, 2], [19, 7], [2, 9], [14, 2]], "C");
rect(catGrid, 10, 4, 2, 1, "t");
rect(catGrid, 5, 9, 2, 1, "t");
rect(catGrid, 16, 10, 2, 1, "t");
rect(catGrid, 9, 7, 3, 2, "c");
rect(catGrid, 17, 4, 3, 2, "c");
put(catGrid, [[1, 12], [22, 12], [13, 9]], "p");

export const CATCAFE = indoor("catcafe", "Two Whiskers Cat Cafe", "w", catGrid, [6, 19], {
  things: [spot("counter", 4, 4, "catcafe")],
  people: [
    citizen("barista", 4, 2, ["#ff9fb0", "#e0808f", "#ffd4dc", "#ffffff"], "down"),
    kitty("cat1", 18, 4, "#a9b4c9"),
    kitty("cat2", 10, 7, "#4a4453"),
    kitty("cat3", 6, 11, "#f4f1ff"),
    kitty("cat4", 20, 9, "#c98b5a"),
  ],
  coins: [[21, 4]],
});

const cineGrid = room(24, 14, "j", 11);
rect(cineGrid, 4, 2, 16, 1, "S");
rect(cineGrid, 5, 5, 14, 1, "E");
rect(cineGrid, 5, 7, 14, 1, "E");
rect(cineGrid, 5, 9, 14, 1, "E");
rect(cineGrid, 2, 11, 3, 1, "-");
put(cineGrid, [[21, 11], [1, 4], [22, 2]], "p");

export const CINEMA = indoor("cinema", "The Roxy", "j", cineGrid, [16, 19], {
  dim: "rgba(28, 20, 56, 0.22)",
  things: [
    spot("tickets", 3, 11, "movie"),
    look("poster", 21, 5, "Read the poster", [
      "THE LONG WAY HOME — one showing daily",
      '"Four stars. I cried at a bus stop." — someone in the queue',
    ]),
  ],
  people: [
    citizen("usher", 5, 11, ["#a3c46b", "#86a552", "#e4f0c4", "#e8d9bf"], "down", {
      label: "Usher",
      lines: ["USHER: Screen two, and no, I won't tell you the ending."],
    }),
  ],
  coins: [[20, 10]],
});

/* ---------- PARK ---------- */

const parkGrid = grid(24, 16, ".");
border(parkGrid, 24, 16);
parkGrid[8]![0] = "g";
rect(parkGrid, 1, 8, 6, 1, "=");
rect(parkGrid, 7, 3, 1, 9, "=");
rect(parkGrid, 7, 3, 11, 1, "=");
rect(parkGrid, 17, 3, 1, 9, "=");
rect(parkGrid, 7, 11, 11, 1, "=");
rect(parkGrid, 2, 2, 4, 4, "~");
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
  things: [spot("loop", 12, 3, "walk"), spot("pond", 4, 6, "ducks"), spot("bigtree", 20, 6, "nap")],
  people: [
    { id: "duck1", tx: 3, ty: 6, kind: "duck", palette: {}, facing: "down" },
    { id: "duck2", tx: 5, ty: 6, kind: "duck", palette: {}, facing: "down", flip: true },
    citizen("jogger", 12, 11, ["#5ab4c4", "#4593a1", "#a5dfe8", "#fffde3"], "up", {
      label: "Say hello",
      lines: ["JOGGER: Third loop! ...Okay, second. Okay, first."],
    }),
  ],
  portals: [{ tx: 0, ty: 8, to: "town", spawn: [27, 10], label: "Sunbeam Street" }],
  coins: [[20, 2], [4, 13], [21, 13]],
  spawn: [1, 8],
};

export const SCENES: Record<SceneId, Scene> = { town: TOWN, home: HOME, diner: DINER, arcade: ARCADE, catcafe: CATCAFE, cinema: CINEMA, park: PARK };
export const TOTAL_COINS = Object.values(SCENES).reduce((n, s) => n + s.coins.length, 0);

export function rateDay(joy: number, places: number) {
  if (joy >= 55 && places >= 4) return { title: "A PERFECT DAY", note: "You couldn't have fit more in. You didn't try to." };
  if (joy >= 45) return { title: "A REALLY LOVELY DAY", note: "Close. One more stop and you'd have had it." };
  if (joy >= 30) return { title: "A GOOD DAY", note: "Solid. There were doors you walked past, though." };
  if (joy >= 15) return { title: "A QUIET DAY", note: "Small and slow. Some days are meant to be." };
  return { title: "A DAY", note: "You mostly wandered. Tomorrow, try spending some coins." };
}

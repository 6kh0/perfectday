# perfect day

A small Stardew-flavoured pixel game: you are a cat with one free day on Sunbeam Street,
and there is not enough day to do everything.

Walk the town, find coins, and spend your twelve hours (9:00 AM – 9:00 PM) on some
subset of lunch with friends, the arcade, the cat cafe, a movie, the park, and lying
on your own sofa. The day ends with what you actually did — every playthrough is a
different route.

```bash
bun install
bun dev      # http://localhost:3000
bun start    # production
```

**Controls** — `WASD`/arrows to walk, `shift` to run, `E`/`space` to look, talk and do,
`F` for fullscreen, `R` to live the day again once it's over.

## How it's put together

| file | what's in it |
| --- | --- |
| `src/game/data.ts` | the whole world: activities, scenes, NPCs, coin positions, the end-of-day rating |
| `src/game/tiles.ts` | one painter per tile character (grass, wood floor, arcade carpet, beds, seats…) |
| `src/game/sprites.ts` | bitmaps as arrays of strings — the cat everyone in town is, recoloured per fruit, plus cafe cats, ducks and shop signs |
| `src/game/engine.ts` | camera, collision, interaction, the day clock, the render loop |
| `src/Game.tsx` | the React shell: HUD, dialogue box, end-of-day card |

Scenes are grids of characters built in code (`grid`, `rect`, `put`, `room`) rather than
hand-typed ASCII, so a row can't quietly end up the wrong width. Anything in `SOLID`
blocks movement; anything in a scene's `things` or `people` with a `label` is interactable.

### Adding to the day

1. Add an entry to `ACTIVITIES` in `data.ts` — `cost` in coins, `minutes` off the clock,
   `joy`, a one-line `memory` for the ending, and its dialogue `lines`.
2. Point a `thing` at it: `{ id, tx, ty, label, activity: "yourId" }`.
3. New scene? Build its grid, add it to `SCENES`, and put a `portal` in both directions.

The costs deliberately exceed the coins available (15) and the activities deliberately
exceed the hours available — that's the game.

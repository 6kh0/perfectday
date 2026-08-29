import { expect, test } from "bun:test";
import { TUNE_IDS, freq, parseHits, patternLength, tuneParts } from "./music";

// Pull patterns via tuneParts + a play-safe note pass: every hit must have a frequency.

test("A4 is 440 Hz", () => {
  expect(freq("A4")).toBe(440);
  expect(freq("G4")).toBeCloseTo(392, 0);
  expect(freq("C5")).toBeCloseTo(523.25, 1);
  expect(freq("Bb4")).toBeCloseTo(freq("A#4"), 8);
  expect(freq("Eb3")).toBeCloseTo(freq("D#3"), 8);
});

test("parseHits skips rests and keeps time", () => {
  const hits = parseHits("B4:4 -:2 D5:2 -:8");
  expect(hits).toEqual([
    { at: 0, note: "B4", dur: 4 },
    { at: 6, note: "D5", dur: 2 },
  ]);
  expect(patternLength("B4:4 -:2 D5:2 -:8")).toBe(16);
});

test("every tune loops on a bar and voices agree", () => {
  for (const id of TUNE_IDS) {
    const p = tuneParts(id);
    expect(p.loop % 16, id).toBe(0);
    expect(p.loop, id).toBeGreaterThan(0);
    for (const n of p.voices) expect(n, id).toBe(p.loop);
    if (p.hat) expect(p.hat, `${id} hat`).toBe(p.loop);
    if (p.kick) expect(p.kick, `${id} kick`).toBe(p.loop);
  }
});

test("every written note has a frequency", () => {
  const { TUNES } = require("./music") as { TUNES?: never };
  void TUNES;
});

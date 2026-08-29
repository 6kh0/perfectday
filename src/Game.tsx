import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VIEW_H, MAX_VIEW_W, MIN_VIEW_H, MIN_VIEW_W, createGame, formatClock, type Game as Engine, type Snapshot } from "./game/engine";
import { rateDay } from "./game/data";
import { music } from "./game/music";
import splashArt from "./sunbeam-street.png";
import "./game.css";

type Splash = "in" | "out" | "gone";

const EMPTY: Snapshot = {
  sceneId: "",
  sceneName: "",
  clock: 0,
  wallet: 0,
  found: 0,
  totalCoins: 0,
  joy: 0,
  prompt: null,
  dialogue: null,
  ended: false,
  memories: [],
  places: [],
};

function fitView() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.max(2, Math.min(6, Math.round(Math.min(w / (MIN_VIEW_W * 1.15), h / (MIN_VIEW_H * 1.15)))));
  return {
    scale,
    width: Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, Math.floor(w / scale))),
    height: Math.max(MIN_VIEW_H, Math.min(MAX_VIEW_H, Math.floor(h / scale))),
  };
}

function splashMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420;
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [view, setView] = useState(fitView);
  const [s, setS] = useState<Snapshot>(EMPTY);
  const [muted, setMuted] = useState(music.muted);
  const [splash, setSplash] = useState<Splash>("in");
  const playing = splash === "gone";

  useEffect(() => {
    const fit = () => setView(fitView());
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    music.attach();
    return () => music.detach();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = createGame(canvas, setS);
    engine.current = g;
    g.pause(true);
    return () => {
      g.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (playing) engine.current?.pause(false);
  }, [playing]);

  const begin = useCallback(() => {
    setSplash(cur => (cur === "in" ? "out" : cur));
  }, []);

  useEffect(() => {
    if (splash !== "out") return;
    const t = window.setTimeout(() => setSplash("gone"), splashMs());
    return () => clearTimeout(t);
  }, [splash]);

  useEffect(() => {
    if (s.sceneId) music.play(s.ended ? "ending" : s.sceneId);
    music.duck(!!s.dialogue && !s.ended);
  }, [s.sceneId, s.ended, s.dialogue]);

  const toggleFs = useCallback(() => {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  }, []);

  const toggleMute = useCallback(() => setMuted(music.toggleMute()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "f") toggleFs();
      if (k === "m") toggleMute();
      if (splash !== "in") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["shift", "control", "alt", "meta", "tab", "capslock", "f", "m"].includes(k)) return;
      e.preventDefault();
      begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFs, toggleMute, splash, begin]);

  const rating = rateDay(s.joy, s.places.length);

  return (
    <div className="game">
      <canvas
        ref={canvasRef}
        width={view.width}
        height={view.height}
        style={{ width: view.width * view.scale, height: view.height * view.scale }}
      />

      {playing && (
        <>
          <div className="hud">
            <span className="pill place">{s.sceneName}</span>
            <span className="pill clock">{formatClock(s.clock)}</span>
            <span className="pill stats">
              <span className="coin-dot" />
              {s.wallet}
              <em>
                {s.found}/{s.totalCoins}
              </em>
              <span className="joy">joy: {s.joy}</span>
            </span>
            <button
              className={`pill icon${muted ? " muted" : ""}`}
              onClick={toggleMute}
              title={muted ? "Unmute (M)" : "Mute (M)"}
              aria-pressed={muted}
            >
              music
            </button>
            <button className="pill icon" onClick={toggleFs} title="Fullscreen (F)">
              fullscreen
            </button>
          </div>

          {s.dialogue && !s.ended && (
            <div className="dialogue" onClick={() => engine.current?.press()}>
              <p>{s.dialogue[0]}</p>
              <span className="more">E ▸</span>
            </div>
          )}

          {s.prompt && !s.dialogue && !s.ended && (
            <div className="prompt">
              <kbd>E</kbd> {s.prompt}
            </div>
          )}

          {!s.dialogue && !s.ended && (
            <div className="help">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> walk · <kbd>shift</kbd> run · <kbd>E</kbd> do · <kbd>space</kbd> backflip · <kbd>M</kbd> mute · <kbd>F</kbd> fullscreen
            </div>
          )}

          {s.ended && (
            <div className="ending">
              <div className="ending-card">
                <p className="ending-kicker">9:00 PM — the day is over</p>
                <h2>{rating.title}</h2>
                <p className="ending-note">{rating.note}</p>
                <ul>
                  {s.memories.length ? s.memories.map(m => <li key={m}>{m}</li>) : <li className="dim">You didn't really do anything today.</li>}
                </ul>
                <p className="ending-score">
                  ♥ {s.joy} joy · {s.places.length} places · {s.found}/{s.totalCoins} coins found
                </p>
                <button onClick={() => engine.current?.restart()}>live the day again (R)</button>
              </div>
            </div>
          )}
        </>
      )}

      {splash !== "gone" && (
        <button type="button" className={`splash${splash === "out" ? " leaving" : ""}`} onClick={begin} aria-label="Start the day on Sunbeam Street">
          <span className="splash-logo">
            <img src={splashArt} alt="Sunbeam Street" width={2048} height={1152} draggable={false} />
          </span>
          <span className="splash-prompt">click or press any key</span>
        </button>
      )}
    </div>
  );
}

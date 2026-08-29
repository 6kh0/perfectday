import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VIEW_H, MAX_VIEW_W, MIN_VIEW_H, MIN_VIEW_W, createGame, formatClock, type Game as Engine, type Snapshot } from "./game/engine";
import { rateDay } from "./game/data";
import { T as TILE } from "./game/tiles";
import { music } from "./game/music";
import { Touch } from "./Touch";
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

type View = { scale: number; width: number; height: number };

/**
 * Biggest whole-number pixel scale that still fits a playable slice of the world on screen.
 * A phone gets a smaller minimum slice — 20 tiles across a 390px screen is a world of ants —
 * so it ends up zoomed in rather than shrunk to one CSS pixel per game pixel. Held upright it
 * also keeps a band clear at the bottom, so the thumbs sit beside the world instead of on it.
 */
function fitView(): View {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const handheld = Math.min(w, h) < 560;
  const minW = handheld ? 11 * TILE : MIN_VIEW_W;
  const minH = handheld ? 9 * TILE : MIN_VIEW_H;
  const band = handheld && h > w ? Math.min(220, Math.max(150, h * 0.22)) : 0;
  const room = h - band;
  const scale = Math.max(1, Math.min(6, Math.floor(Math.min(w / minW, room / minH))));
  return {
    scale,
    width: Math.max(minW, Math.min(MAX_VIEW_W, Math.floor(w / scale))),
    height: Math.max(minH, Math.min(MAX_VIEW_H, Math.floor(room / scale))),
  };
}

const sameView = (a: View, b: View) => a.scale === b.scale && a.width === b.width && a.height === b.height;

function isTouch() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

const CAN_FULLSCREEN = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

function splashMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420;
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [view, setView] = useState(fitView);
  const [s, setS] = useState<Snapshot>(EMPTY);
  const [muted, setMuted] = useState(music.muted);
  const [touch, setTouch] = useState(isTouch);
  const [splash, setSplash] = useState<Splash>("in");
  const playing = splash === "gone";

  useEffect(() => {
    const fit = () =>
      setView(cur => {
        const next = fitView();
        return sameView(cur, next) ? cur : next;
      });
    // iOS settles the new size a beat after the orientation event
    const turn = () => {
      fit();
      window.setTimeout(fit, 300);
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", turn);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", turn);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  // a mouse-and-keyboard machine with a touchscreen only shows the pad once a finger lands
  useEffect(() => {
    if (touch) return;
    const on = () => setTouch(true);
    window.addEventListener("touchstart", on, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", on);
  }, [touch]);

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

  const move = useCallback((x: number, y: number, run: boolean) => engine.current?.stick(x, y, run), []);
  const act = useCallback(() => engine.current?.press(), []);
  const trick = useCallback(() => engine.current?.trick(), []);

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
    <div className={`game${touch ? " touch" : ""}`}>
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
              aria-label={muted ? "Unmute" : "Mute"}
              aria-pressed={muted}
            >
              {touch ? "♪" : "music"}
            </button>
            {CAN_FULLSCREEN && (
              <button className="pill icon" onClick={toggleFs} title="Fullscreen (F)" aria-label="Fullscreen">
                {touch ? "⛶" : "fullscreen"}
              </button>
            )}
          </div>

          {s.dialogue && !s.ended && (
            <div className="dialogue" onClick={() => engine.current?.press()}>
              <p>{s.dialogue[0]}</p>
              <span className="more">{touch ? "▸" : "E ▸"}</span>
            </div>
          )}

          {s.prompt && !s.dialogue && !s.ended && (
            <div className="prompt">
              <kbd>{touch ? "do" : "E"}</kbd> {s.prompt}
            </div>
          )}

          {touch && !s.ended && <Touch onMove={move} onAct={act} onTrick={trick} actLabel={s.dialogue ? "next" : "do"} />}

          {!touch && !s.dialogue && !s.ended && (
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
          <span className="splash-prompt">{touch ? "tap to start" : "click or press any key"}</span>
        </button>
      )}
    </div>
  );
}

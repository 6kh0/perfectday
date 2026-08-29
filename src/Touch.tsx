import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** how far the thumb has to travel before the cat moves at all, and before it runs */
const DEAD = 0.18;
const RUN_AT = 0.76;
/** the knob can slide this far from the middle, as a fraction of the pad's width */
const THROW = 0.28;

type Props = {
  onMove: (x: number, y: number, run: boolean) => void;
  onAct: () => void;
  onTrick: () => void;
  /** what the big button does right now — "do" out in the world, "next" mid-conversation */
  actLabel: string;
};

export function Touch({ onMove, onAct, onTrick, actLabel }: Props) {
  const pad = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);

  const aim = useCallback(
    (e: ReactPointerEvent) => {
      const el = pad.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const radius = r.width / 2;
      let dx = (e.clientX - (r.left + radius)) / radius;
      let dy = (e.clientY - (r.top + radius)) / radius;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      setKnob({ x: dx * r.width * THROW, y: dy * r.width * THROW });
      if (len < DEAD) onMove(0, 0, false);
      else onMove(dx, dy, len > RUN_AT);
    },
    [onMove],
  );

  const grab = (e: ReactPointerEvent) => {
    e.preventDefault();
    pointer.current = e.pointerId;
    setHeld(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };

  const drag = (e: ReactPointerEvent) => {
    if (pointer.current === e.pointerId) aim(e);
  };

  const drop = (e: ReactPointerEvent) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setHeld(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0, false);
  };

  // if the pad goes away mid-push (the day ends), the cat shouldn't keep walking
  useEffect(() => () => onMove(0, 0, false), [onMove]);

  const tap = (fn: () => void) => (e: ReactPointerEvent) => {
    e.preventDefault();
    fn();
  };

  return (
    <div className="thumbs">
      <div
        ref={pad}
        className={`stick${held ? " held" : ""}`}
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={drop}
        onPointerCancel={drop}
        onContextMenu={e => e.preventDefault()}
        role="presentation"
      >
        <span className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      <div className="taps">
        <button className="tap trick" onPointerDown={tap(onTrick)} onContextMenu={e => e.preventDefault()} aria-label="Backflip">
          flip
        </button>
        <button className="tap act" onPointerDown={tap(onAct)} onContextMenu={e => e.preventDefault()} aria-label={actLabel}>
          {actLabel}
        </button>
      </div>
    </div>
  );
}

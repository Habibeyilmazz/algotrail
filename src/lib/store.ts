import { useSyncExternalStore } from 'react';
import type { Card } from './srs';

// All progress lives in one localStorage key. Whatever comes back from storage
// is untrusted (older versions, hand edits), so load() rebuilds it field by field.

export interface DrillState {
  solved: boolean;
  hints: number;
  revealed: boolean;
  attempts: number;
  code?: string;
}

export interface Progress {
  drills: Record<string, DrillState>;
  cards: Record<string, Card>;
  theme: 'system' | 'light' | 'dark';
  speed: number;
}

export const KEY = 'algotrail:v1';
export const SPEEDS = [0.25, 0.5, 1, 2, 4];

export const emptyProgress = (): Progress => ({ drills: {}, cards: {}, theme: 'system', speed: 1 });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export function sanitize(raw: unknown): Progress {
  const out = emptyProgress();
  if (!isObj(raw)) return out;
  if (raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  if (typeof raw.speed === 'number' && SPEEDS.includes(raw.speed)) out.speed = raw.speed;
  if (isObj(raw.drills)) {
    for (const [id, d] of Object.entries(raw.drills)) {
      if (!isObj(d) || id.length > 64) continue;
      out.drills[id] = {
        solved: d.solved === true,
        hints: num(d.hints, 0, 10) ? Math.floor(d.hints as number) : 0,
        revealed: d.revealed === true,
        attempts: num(d.attempts, 0, 1e6) ? Math.floor(d.attempts as number) : 0,
        ...(typeof d.code === 'string' && d.code.length < 50_000 ? { code: d.code } : {}),
      };
    }
  }
  if (isObj(raw.cards)) {
    for (const [id, c] of Object.entries(raw.cards)) {
      if (!isObj(c) || !num(c.ease, 1.3, 5) || !num(c.interval, 0, 36500) || !num(c.reps, 0, 1e4) || !num(c.due, 0, 1e14)) continue;
      out.cards[id] = { ease: c.ease as number, interval: c.interval as number, reps: c.reps as number, due: c.due as number };
    }
  }
  return out;
}

function load(): Progress {
  try {
    const text = localStorage.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

let state: Progress = typeof localStorage === 'undefined' ? emptyProgress() : load();
const listeners = new Set<() => void>();

export function update(fn: (draft: Progress) => Progress) {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): progress stays for this tab only.
  }
  listeners.forEach((l) => l());
}

export function updateDrill(id: string, patch: Partial<DrillState>) {
  update((s) => {
    const prev = s.drills[id] ?? { solved: false, hints: 0, revealed: false, attempts: 0 };
    return { ...s, drills: { ...s.drills, [id]: { ...prev, ...patch } } };
  });
}

export function resetProgress() {
  update((s) => ({ ...emptyProgress(), theme: s.theme, speed: s.speed }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useProgress = () => useSyncExternalStore(subscribe, () => state, () => state);

// Keep tabs in sync when another tab saves.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

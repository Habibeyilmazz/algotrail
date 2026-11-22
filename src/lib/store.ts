import { useSyncExternalStore } from 'react';
import { PATTERNS } from '../drills/patterns';
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
/** Drafts this long are neither stored nor loaded: one huge paste could fill localStorage and stop every save. */
export const MAX_CODE = 50_000;

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
        ...(typeof d.code === 'string' && d.code.length < MAX_CODE ? { code: d.code } : {}),
      };
    }
  }
  if (isObj(raw.cards)) {
    for (const [id, c] of Object.entries(raw.cards)) {
      if (!PATTERNS.some((p) => p.id === id)) continue; // a pattern that no longer exists would block the queue
      if (!isObj(c) || !num(c.ease, 1.3, 5) || !Number.isInteger(c.interval) || !num(c.interval, 0, 36500) || !Number.isInteger(c.reps) || !num(c.reps, 0, 1e4) || !num(c.due, 0, 1e14)) continue;
      out.cards[id] = { ease: c.ease as number, interval: c.interval as number, reps: c.reps as number, due: c.due as number };
    }
  }
  return out;
}

// Backup files carry a tag and a version so a random JSON file is refused with a clear message.
export const MAX_BACKUP_CHARS = 5_000_000;

export const backupText = (p: Progress, now = Date.now()) =>
  JSON.stringify({ app: 'algotrail', version: 1, exportedAt: new Date(now).toISOString(), progress: p }, null, 2);

// The local date: toISOString() would name a file made at 01:00 in UTC+3 after the day before.
export const backupFileName = (d: Date) =>
  `algotrail-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;

export function parseBackup(text: string): { progress: Progress; exportedAt: string | null } {
  if (text.length > MAX_BACKUP_CHARS) throw new Error('This file is too large to be an algotrail backup.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isObj(raw) || raw.app !== 'algotrail' || !isObj(raw.progress)) throw new Error('This file is not an algotrail progress backup.');
  if (raw.version !== 1) throw new Error('This backup comes from a different version of algotrail and cannot be read.');
  const at = typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt)) ? raw.exportedAt : null;
  return { progress: sanitize(raw.progress), exportedAt: at };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const summarize = (p: Progress) =>
  `${plural(Object.values(p.drills).filter((d) => d.solved).length, 'solved drill')} and ${plural(Object.keys(p.cards).length, 'pattern')} in review`;

function load(): Progress {
  try {
    // Reading localStorage itself can throw (blocked storage), so it stays inside the try.
    const text = globalThis.localStorage?.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

let state: Progress = load();

export const getProgress = () => state;
/** True while the last save failed, so the page can say progress lives in this tab only. */
export let saveFailed = false;
const listeners = new Set<() => void>();

export function update(fn: (draft: Progress) => Progress) {
  state = fn(state);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch {
    saveFailed = true; // storage full or blocked: progress stays for this tab only
  }
  listeners.forEach((l) => l());
}

export function updateDrill(id: string, patch: Partial<DrillState>) {
  if (patch.code !== undefined && patch.code.length >= MAX_CODE) {
    const { code: _, ...rest } = patch; // keep the last draft that fits
    patch = rest;
  }
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

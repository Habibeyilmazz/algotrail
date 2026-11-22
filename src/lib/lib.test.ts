import { describe, expect, it, vi } from 'vitest';
import { describeDue, newCard, review } from './srs';
import { backupFileName, backupText, emptyProgress, MAX_BACKUP_CHARS, parseBackup, sanitize, summarize, type Progress } from './store';

const DAY = 86_400_000;

describe('SM-2', () => {
  it('grows intervals 1, 6, then by ease', () => {
    let c = newCard(0);
    c = review(c, 'good', 0);
    expect(c).toMatchObject({ reps: 1, interval: 1, due: DAY });
    c = review(c, 'good', DAY);
    expect(c).toMatchObject({ reps: 2, interval: 6 });
    c = review(c, 'good', 7 * DAY);
    expect(c.interval).toBe(15);
    expect(c.ease).toBeCloseTo(2.5);
  });

  it('easy raises ease, hard lowers it, never below 1.3', () => {
    expect(review(newCard(0), 'easy', 0).ease).toBeCloseTo(2.6);
    expect(review(newCard(0), 'hard', 0).ease).toBeCloseTo(2.36);
    let c = newCard(0);
    for (let i = 0; i < 20; i++) c = review(c, 'again', 0);
    expect(c.ease).toBe(1.3);
  });

  it('forgetting resets the streak and brings the card back soon', () => {
    let c = review(review(newCard(0), 'good', 0), 'good', DAY);
    c = review(c, 'again', 10 * DAY);
    expect(c).toMatchObject({ reps: 0, interval: 0 });
    expect(c.due - 10 * DAY).toBe(600_000);
  });

  it('describes due times', () => {
    const c = newCard(0);
    expect(describeDue(c, 0)).toBe('due now');
    expect(describeDue({ ...c, due: 600_000 }, 0)).toBe('in 10 min');
    expect(describeDue({ ...c, due: 3 * DAY }, 0)).toBe('in 3 days');
  });

  it('never says "in 60 min" or "in 24 h"', () => {
    const c = newCard(0);
    expect(describeDue({ ...c, due: 59.6 * 60_000 }, 0)).toBe('in 1 h');
    expect(describeDue({ ...c, due: 23.6 * 3_600_000 }, 0)).toBe('in 1 day');
    expect(describeDue({ ...c, due: 1_000 }, 0)).toBe('in 1 min');
  });
});

describe('progress sanitizer', () => {
  it('keeps valid data', () => {
    const p = sanitize({ theme: 'dark', speed: 2, drills: { 'floor-sqrt': { solved: true, hints: 2, revealed: false, attempts: 3, code: 'x' } }, cards: { heap: { ease: 2.5, interval: 1, reps: 1, due: 5 } } });
    expect(p).toEqual({ theme: 'dark', speed: 2, drills: { 'floor-sqrt': { solved: true, hints: 2, revealed: false, attempts: 3, code: 'x' } }, cards: { heap: { ease: 2.5, interval: 1, reps: 1, due: 5 } } });
  });

  it('drops or repairs junk', () => {
    expect(sanitize('nope')).toEqual({ drills: {}, cards: {}, theme: 'system', speed: 1 });
    const p = sanitize({ theme: 'neon', speed: 3, drills: { 'floor-sqrt': { solved: 'yes', hints: -4, code: 7 }, 'pair-budget': 5 }, cards: { c: { ease: 99 } } });
    expect(p.theme).toBe('system');
    expect(p.speed).toBe(1);
    expect(p.drills).toEqual({ 'floor-sqrt': { solved: false, hints: 0, revealed: false, attempts: 0 } });
    expect(p.cards).toEqual({});
  });

  it('drops cards for unknown patterns and fractional counters', () => {
    const p = sanitize({ cards: { gone: { ease: 2.5, interval: 1, reps: 1, due: 5 }, heap: { ease: 2.5, interval: 0, reps: 0.5, due: 0 }, trie: { ease: 2.5, interval: 1, reps: 1, due: 0 } } });
    expect(Object.keys(p.cards)).toEqual(['trie']);
  });

  it('drops drills that do not exist, so they are not counted as solved', () => {
    const p = sanitize({ drills: { gone: { solved: true }, 'floor-sqrt': { solved: true } } });
    expect(Object.keys(p.drills)).toEqual(['floor-sqrt']);
  });
});

describe('progress backups', () => {
  const p: Progress = {
    theme: 'dark',
    speed: 2,
    drills: { 'floor-sqrt': { solved: true, hints: 1, revealed: false, attempts: 2, code: 'function floorSqrt(n) {}' }, 'pair-budget': { solved: false, hints: 0, revealed: false, attempts: 1 } },
    cards: { heap: { ease: 2.5, interval: 6, reps: 2, due: 1_800_000_000_000 } },
  };

  it('round-trips through a backup file', () => {
    const text = backupText(p, Date.UTC(2026, 10, 22));
    expect(parseBackup(text)).toEqual({ progress: p, exportedAt: '2026-11-22T00:00:00.000Z' });
  });

  it('refuses files that are not algotrail backups', () => {
    expect(() => parseBackup('{oops')).toThrow('not valid JSON');
    expect(() => parseBackup('[]')).toThrow('not an algotrail progress backup');
    expect(() => parseBackup(JSON.stringify({ drills: {}, cards: {} }))).toThrow('not an algotrail progress backup');
    expect(() => parseBackup(JSON.stringify({ app: 'algotrail', version: 1, progress: 'x' }))).toThrow('not an algotrail progress backup');
    expect(() => parseBackup(JSON.stringify({ app: 'algotrail', version: 2, progress: {} }))).toThrow('different version');
    expect(() => parseBackup(' '.repeat(MAX_BACKUP_CHARS + 1))).toThrow('too large');
  });

  it('cleans what is inside a backup like stored progress', () => {
    const text = JSON.stringify({ app: 'algotrail', version: 1, exportedAt: 'whenever', progress: { theme: 'neon', drills: { 'floor-sqrt': { solved: 1 } }, cards: { gone: {} } } });
    expect(parseBackup(text)).toEqual({ progress: { ...emptyProgress(), drills: { 'floor-sqrt': { solved: false, hints: 0, revealed: false, attempts: 0 } } }, exportedAt: null });
  });

  it('names the file by the local date, not the UTC date', () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati'); // UTC+14
    try {
      expect(backupFileName(new Date(Date.UTC(2026, 10, 21, 12)))).toBe('algotrail-backup-2026-11-22.json');
      vi.stubEnv('TZ', 'Pacific/Pago_Pago'); // UTC-11
      expect(backupFileName(new Date(Date.UTC(2026, 0, 1, 5)))).toBe('algotrail-backup-2025-12-31.json');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('summarizes progress for the import prompt', () => {
    expect(summarize(p)).toBe('1 solved drill and 1 pattern in review');
    expect(summarize(emptyProgress())).toBe('0 solved drills and 0 patterns in review');
  });
});

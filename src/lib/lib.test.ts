import { describe, expect, it } from 'vitest';
import { describeDue, newCard, review } from './srs';
import { sanitize } from './store';

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
});

describe('progress sanitizer', () => {
  it('keeps valid data', () => {
    const p = sanitize({ theme: 'dark', speed: 2, drills: { a: { solved: true, hints: 2, revealed: false, attempts: 3, code: 'x' } }, cards: { b: { ease: 2.5, interval: 1, reps: 1, due: 5 } } });
    expect(p).toEqual({ theme: 'dark', speed: 2, drills: { a: { solved: true, hints: 2, revealed: false, attempts: 3, code: 'x' } }, cards: { b: { ease: 2.5, interval: 1, reps: 1, due: 5 } } });
  });

  it('drops or repairs junk', () => {
    expect(sanitize('nope')).toEqual({ drills: {}, cards: {}, theme: 'system', speed: 1 });
    const p = sanitize({ theme: 'neon', speed: 3, drills: { a: { solved: 'yes', hints: -4, code: 7 }, b: 5 }, cards: { c: { ease: 99 } } });
    expect(p.theme).toBe('system');
    expect(p.speed).toBe(1);
    expect(p.drills).toEqual({ a: { solved: false, hints: 0, revealed: false, attempts: 0 } });
    expect(p.cards).toEqual({});
  });
});

// SM-2 spaced repetition, one card per pattern.

export interface Card {
  ease: number;
  /** Days until the next review after a successful recall. */
  interval: number;
  reps: number;
  due: number; // epoch ms
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: 'again', label: 'Forgot', key: '1' },
  { grade: 'hard', label: 'Hard', key: '2' },
  { grade: 'good', label: 'Good', key: '3' },
  { grade: 'easy', label: 'Easy', key: '4' },
];

const DAY = 86_400_000;
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export const newCard = (now: number): Card => ({ ease: 2.5, interval: 0, reps: 0, due: now });

export function review(card: Card, grade: Grade, now: number): Card {
  const q = QUALITY[grade];
  const ease = Math.max(1.3, card.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) return { ease, interval: 0, reps: 0, due: now + 10 * 60_000 }; // see it again this session
  const reps = card.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.ceil(card.interval * ease);
  return { ease, interval, reps, due: now + interval * DAY };
}

export const isDue = (card: Card, now: number) => card.due <= now;

export function describeDue(card: Card, now: number): string {
  const ms = card.due - now;
  if (ms <= 0) return 'due now';
  // Round first, then pick the unit, so 59.6 min reads "in 1 h" rather than "in 60 min".
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `in ${min} min`;
  const h = Math.round(ms / 3_600_000);
  if (h < 24) return `in ${h} h`;
  const days = Math.max(1, Math.round(ms / DAY));
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

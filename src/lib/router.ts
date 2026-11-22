import { useEffect, useState } from 'react';

// Hash routes so the static build works on GitHub Pages without a 404 trick.
export type Route =
  | { page: 'home' }
  | { page: 'viz'; id: string }
  | { page: 'drills' }
  | { page: 'drill'; id: string }
  | { page: 'pattern'; id: string }
  | { page: 'review' };

export function parseHash(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (a === 'visualize') return { page: 'viz', id: b ?? '' };
  if (a === 'drills') return b ? { page: 'drill', id: b } : { page: 'drills' };
  if (a === 'patterns' && b) return { page: 'pattern', id: b };
  if (a === 'review') return { page: 'review' };
  return { page: 'home' };
}

export const href = {
  home: '#/',
  viz: (id: string) => `#/visualize/${id}`,
  drills: '#/drills',
  drill: (id: string) => `#/drills/${id}`,
  pattern: (id: string) => `#/patterns/${id}`,
  review: '#/review',
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

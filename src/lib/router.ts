import { useEffect, useState } from 'react';

// Hash routes so the static build works on GitHub Pages without a 404 trick.
export type Route =
  | { page: 'home' }
  | { page: 'viz'; id: string; query: string }
  | { page: 'drills' }
  | { page: 'drill'; id: string }
  | { page: 'pattern'; id: string }
  | { page: 'review' };

export function parseHash(hash: string): Route {
  // A malformed escape like "%" would make decodeURIComponent throw and blank the page.
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  // Visualizer input rides after "?" (#/visualize/lcs?a=...); other pages ignore it.
  const [path, query = ''] = hash.replace(/^#\/?/, '').split(/\?(.*)/s);
  const [a, b] = path.split('/').map(decode);
  if (a === 'visualize') return { page: 'viz', id: b ?? '', query };
  if (a === 'drills') return b ? { page: 'drill', id: b } : { page: 'drills' };
  if (a === 'patterns' && b) return { page: 'pattern', id: b };
  if (a === 'review') return { page: 'review' };
  return { page: 'home' };
}

export const href = {
  home: '#/',
  viz: (id: string, query = '') => `#/visualize/${id}${query && '?' + query}`,
  drills: '#/drills',
  drill: (id: string) => `#/drills/${id}`,
  pattern: (id: string) => `#/patterns/${id}`,
  review: '#/review',
};

// Like setting location.hash, but routes update before this returns (hashchange is otherwise a later task),
// so a key pressed right after applying visualizer input acts on the new run.
export function navigate(hash: string) {
  history.pushState(null, '', hash);
  dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

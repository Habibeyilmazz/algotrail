import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static hosts like GitHub Pages cannot send headers, so the policy goes in a meta tag.
// 'unsafe-eval' is for the drill worker (new Function): some browsers apply the page's
// policy to its workers. Only in the build, because the dev server injects inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

// Relative base so the build works on GitHub Pages under /algotrail/ and from any folder.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'csp',
      apply: 'build',
      transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `$&\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});

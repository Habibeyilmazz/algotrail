/**
 * True when a keypress should not trigger page shortcuts: it belongs to a text
 * field, or a modal dialog is open over the page.
 */
export function ignoreKey(e: KeyboardEvent) {
  if (document.querySelector('dialog[open]')) return true;
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes((t as HTMLInputElement).type));
}

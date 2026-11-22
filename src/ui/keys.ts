/** True when a keypress belongs to a text field, so global shortcuts stay out of the way. */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes((t as HTMLInputElement).type));
}

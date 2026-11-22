import { useRef } from 'react';

// A textarea with a line gutter. Tab indents; Escape releases focus so Tab can
// leave the editor again (no keyboard trap).

const INDENT = '  ';

export function CodeEditor({ value, onChange, onRun, label }: { value: string; onChange: (v: string) => void; onRun: () => void; label: string }) {
  const gutter = useRef<HTMLDivElement>(null);
  const trapTab = useRef(true);
  const lines = value.split('\n').length;

  const edit = (el: HTMLTextAreaElement, text: string, start: number, end: number, caret: number) => {
    // execCommand keeps the browser undo stack working; fall back to a plain value change.
    el.setSelectionRange(start, end);
    if (!document.execCommand?.('insertText', false, text)) {
      onChange(el.value.slice(0, start) + text + el.value.slice(end));
    }
    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: t, value: v } = el;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Escape') {
      trapTab.current = false;
      return;
    }
    if (e.key === 'Tab' && trapTab.current && !e.shiftKey && s === t) {
      e.preventDefault();
      edit(el, INDENT, s, t, s + INDENT.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && s === t) {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = /^\s*/.exec(v.slice(lineStart, s))![0];
      const extra = /[{[(]\s*$/.test(v.slice(lineStart, s)) ? INDENT : '';
      if (!indent && !extra) return;
      e.preventDefault();
      edit(el, '\n' + indent + extra, s, t, s + 1 + indent.length + extra.length);
    }
  };

  return (
    <div className="editor">
      <div className="editor-gutter" ref={gutter} aria-hidden="true">
        {Array.from({ length: lines }, (_, k) => (
          <span key={k}>{k + 1}</span>
        ))}
      </div>
      <textarea
        aria-label={label}
        aria-describedby="editor-help"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        onFocus={() => (trapTab.current = true)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => gutter.current && (gutter.current.scrollTop = e.currentTarget.scrollTop)}
      />
    </div>
  );
}

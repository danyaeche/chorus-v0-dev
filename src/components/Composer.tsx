import { useRef, useState } from "react";

interface Props {
  onSubmit: (prompt: string) => void;
  onStop: () => void;
  isBusy: boolean;
  canSubmit: boolean;
  /** Reason submit is blocked (e.g. no voices selected), shown as a hint. */
  blockedHint?: string;
}

/** The prompt input. Enter submits; Shift+Enter inserts a newline. */
export function Composer({ onSubmit, onStop, isBusy, canSubmit, blockedHint }: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || !canSubmit) return;
    onSubmit(text);
    setValue("");
    // Reset the autogrow height after sending.
    if (taRef.current) taRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function autogrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800/80 p-2 shadow-lg backdrop-blur">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={value}
          onChange={autogrow}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask the chorus anything…"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
        />
        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-ink-600 px-4 text-sm font-medium text-neutral-200 transition hover:bg-ink-700"
          >
            <span className="h-2.5 w-2.5 rounded-[3px] bg-neutral-300" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || !canSubmit}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-neutral-500"
          >
            Ask
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-3 pb-1 pt-1 text-[11px] text-neutral-500">
        <span>
          {blockedHint ? (
            <span className="text-amber-400/90">{blockedHint}</span>
          ) : (
            <>
              <kbd className="rounded bg-ink-700 px-1 py-0.5 text-neutral-400">Enter</kbd> to send ·{" "}
              <kbd className="rounded bg-ink-700 px-1 py-0.5 text-neutral-400">Shift+Enter</kbd> for newline
            </>
          )}
        </span>
      </div>
    </div>
  );
}

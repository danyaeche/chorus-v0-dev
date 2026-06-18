import { useState } from "react";
import type { Answer, Voice } from "../types";
import { VoiceAvatar } from "./VoiceAvatar";

interface Props {
  voice: Voice;
  answer: Answer;
  onRegenerate: () => void;
}

function StatusPill({ answer }: { answer: Answer }) {
  switch (answer.status) {
    case "thinking":
      return (
        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-neutral-400" />
          thinking
        </span>
      );
    case "streaming":
      return <span className="text-[11px] text-indigo-300">writing…</span>;
    case "done":
      return (
        <span className="text-[11px] text-neutral-500">
          {answer.latencyMs != null ? `${(answer.latencyMs / 1000).toFixed(1)}s` : "done"}
        </span>
      );
    case "error":
      return <span className="text-[11px] text-rose-400">error</span>;
    default:
      return <span className="text-[11px] text-neutral-600">queued</span>;
  }
}

/** A single voice's answer column. */
export function AnswerCard({ voice, answer, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isWorking = answer.status === "thinking" || answer.status === "streaming";

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <div
      className="flex h-full min-h-[180px] flex-col rounded-xl border border-ink-700 bg-ink-800/60 animate-fade-up"
      style={{ borderTopColor: voice.accent, borderTopWidth: 2 }}
    >
      <header className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <VoiceAvatar voice={voice} size={24} />
          <div className="leading-tight">
            <div className="text-sm font-medium text-neutral-100">{voice.name}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">
              {voice.vendor}
            </div>
          </div>
        </div>
        <StatusPill answer={answer} />
      </header>

      <div className="scrollbar-slim flex-1 overflow-y-auto px-3.5 py-3 text-[14px] leading-relaxed text-neutral-200">
        {answer.status === "error" ? (
          <p className="text-rose-300/90">{answer.error}</p>
        ) : answer.text ? (
          <p className="whitespace-pre-wrap">
            {answer.text}
            {answer.status === "streaming" && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-blink bg-indigo-300 align-middle" />
            )}
          </p>
        ) : (
          <p className="text-neutral-500">…</p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-1 border-t border-ink-700 px-2 py-1.5">
        <button
          type="button"
          onClick={copy}
          disabled={!answer.text}
          className="rounded-md px-2 py-1 text-[11px] text-neutral-400 transition hover:bg-ink-700 hover:text-neutral-200 disabled:opacity-40"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isWorking}
          className="rounded-md px-2 py-1 text-[11px] text-neutral-400 transition hover:bg-ink-700 hover:text-neutral-200 disabled:opacity-40"
        >
          Regenerate
        </button>
      </footer>
    </div>
  );
}

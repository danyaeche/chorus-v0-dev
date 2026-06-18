import { useState } from "react";
import type { Answer } from "../types";
import { CONDUCTOR } from "../voices";
import { VoiceAvatar } from "./VoiceAvatar";

interface Props {
  synthesis: Answer;
  /** Names of the voices this synthesis was distilled from. */
  sourceNames: string[];
  onRegenerate: () => void;
}

/** The Conductor's full-width "best answer", distinct from the voice columns. */
export function SynthesisCard({ synthesis, sourceNames, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const working = synthesis.status === "thinking" || synthesis.status === "streaming";

  async function copy() {
    try {
      await navigator.clipboard.writeText(synthesis.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-violet-400/30 bg-gradient-to-b from-violet-500/10 to-ink-800/40 animate-fade-up">
      <header className="flex items-center justify-between gap-2 border-b border-violet-400/15 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <VoiceAvatar voice={CONDUCTOR} size={26} />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-100">
              <span aria-hidden>✦</span> Best answer
            </div>
            <div className="text-[10px] uppercase tracking-wide text-violet-300/70">
              {sourceNames.length > 0
                ? `synthesized from ${sourceNames.join(" · ")}`
                : "Conductor"}
            </div>
          </div>
        </div>
        <span className="text-[11px] text-violet-300/80">
          {synthesis.status === "thinking"
            ? "reading every answer…"
            : synthesis.status === "streaming"
              ? "writing…"
              : synthesis.status === "error"
                ? "error"
                : synthesis.latencyMs != null
                  ? `${(synthesis.latencyMs / 1000).toFixed(1)}s`
                  : ""}
        </span>
      </header>

      <div className="px-4 py-3.5 text-[14px] leading-relaxed text-neutral-100">
        {synthesis.status === "error" ? (
          <p className="text-rose-300/90">{synthesis.error}</p>
        ) : synthesis.text ? (
          <p className="whitespace-pre-wrap">
            {synthesis.text}
            {synthesis.status === "streaming" && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-blink bg-violet-300 align-middle" />
            )}
          </p>
        ) : (
          <p className="text-violet-300/60">…</p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-1 border-t border-violet-400/15 px-2 py-1.5">
        <button
          type="button"
          onClick={copy}
          disabled={!synthesis.text}
          className="rounded-md px-2 py-1 text-[11px] text-violet-200/80 transition hover:bg-violet-500/15 hover:text-violet-100 disabled:opacity-40"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={working}
          className="rounded-md px-2 py-1 text-[11px] text-violet-200/80 transition hover:bg-violet-500/15 hover:text-violet-100 disabled:opacity-40"
        >
          Re-synthesize
        </button>
      </footer>
    </div>
  );
}

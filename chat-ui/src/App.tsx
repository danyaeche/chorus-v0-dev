import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "./components/Composer";
import { TurnView } from "./components/TurnView";
import { VoiceLegend, VoicePicker } from "./components/VoicePicker";
import { mockProvider } from "./mockProvider";
import { useChorus } from "./useChorus";
import { DEFAULT_VOICE_IDS, VOICES, VOICES_BY_ID } from "./voices";

const SUGGESTIONS = [
  "Explain quantum entanglement to a curious 12-year-old.",
  "Draft a friendly out-of-office message for a 2-week trip.",
  "What are the trade-offs between REST and GraphQL?",
  "Give me three plot twists for a heist story.",
];

export default function App() {
  const { turns, isBusy, ask, stop, regenerate, synthesize, clear } =
    useChorus(mockProvider);
  const [selected, setSelected] = useState<string[]>(DEFAULT_VOICE_IDS);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVoices = useMemo(
    () => selected.map((id) => VOICES_BY_ID[id]).filter(Boolean),
    [selected]
  );

  // Keep the latest turn in view as answers stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  function toggleVoice(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function handleSubmit(prompt: string) {
    ask(prompt, selected);
  }

  const hasTurns = turns.length > 0;
  const blockedHint =
    selected.length === 0 ? "Pick at least one voice to ask." : undefined;

  return (
    <div className="flex h-full flex-col bg-ink-950">
      {/* Header */}
      <header className="z-10 flex items-center justify-between border-b border-ink-700/80 bg-ink-900/70 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/chorus.svg" alt="" width={28} height={28} />
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-neutral-100">
              Chorus
            </h1>
            <p className="text-[11px] text-neutral-500">ask once · hear every voice</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <VoiceLegend voices={selectedVoices} />
          {hasTurns && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-ink-800 hover:text-neutral-200"
            >
              New chorus
            </button>
          )}
        </div>
      </header>

      {/* Conversation */}
      <main ref={scrollRef} className="scrollbar-slim flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          {hasTurns ? (
            <div className="space-y-8">
              {turns.map((turn, i) => (
                <TurnView
                  key={turn.id}
                  turn={turn}
                  index={i}
                  onRegenerate={regenerate}
                  onSynthesize={synthesize}
                />
              ))}
            </div>
          ) : (
            <EmptyState onPick={handleSubmit} canSubmit={selected.length > 0} />
          )}
        </div>
      </main>

      {/* Composer dock */}
      <div className="border-t border-ink-700/80 bg-ink-900/70 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-3 sm:px-6">
          <VoicePicker
            voices={VOICES}
            selected={selected}
            onToggle={toggleVoice}
            disabled={isBusy}
          />
          <Composer
            onSubmit={handleSubmit}
            onStop={stop}
            isBusy={isBusy}
            canSubmit={selected.length > 0}
            blockedHint={blockedHint}
            placeholder={hasTurns ? "Ask a follow-up…" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  canSubmit,
}: {
  onPick: (prompt: string) => void;
  canSubmit: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center sm:py-20">
      <div className="mb-5 flex justify-center">
        <img src="/chorus.svg" alt="" width={56} height={56} />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-100">
        Ask once, hear every voice.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-neutral-400">
        Your prompt goes to every selected model at the same time. Compare their
        answers side by side and keep the one that sings.
      </p>

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={!canSubmit}
            onClick={() => onPick(s)}
            className="rounded-xl border border-ink-700 bg-ink-800/50 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-ink-600 hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

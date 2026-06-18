import type { Answer, ChorusTurn, Voice } from "../types";
import { VOICES_BY_ID } from "../voices";
import { AnswerCard } from "./AnswerCard";
import { SynthesisCard } from "./SynthesisCard";

interface Props {
  turn: ChorusTurn;
  /** Position in the conversation; index > 0 renders a "follow-up" label. */
  index: number;
  onRegenerate: (turnId: string, voiceId: string) => void;
  onSynthesize: (turnId: string) => void;
}

/** Renders one prompt, the grid of voice answers, and the synthesis row. */
export function TurnView({ turn, index, onRegenerate, onSynthesize }: Props) {
  // Pair each voice with its answer once, dropping anything unresolved so the
  // rest of the component works with a fully-typed, non-undefined list.
  const cols = turn.voiceIds
    .map((id) => ({ voice: VOICES_BY_ID[id], answer: turn.answers[id] }))
    .filter((c): c is { voice: Voice; answer: Answer } =>
      Boolean(c.voice && c.answer)
    );

  const stillWorking = cols.some(
    ({ answer }) =>
      answer.status === "idle" ||
      answer.status === "thinking" ||
      answer.status === "streaming"
  );
  const usable = cols.filter(
    ({ answer }) => answer.text.trim() && answer.status !== "error"
  );
  const canSynthesize = !stillWorking && usable.length > 0;

  // Label the synthesis from the snapshot it was built with, never the live
  // answers — so the header can't disagree with the synthesized body.
  const synthSourceNames = turn.synthesis
    ? turn.synthesis.sourceVoiceIds
        .map((id) => VOICES_BY_ID[id]?.name)
        .filter((n): n is string => Boolean(n))
    : [];

  return (
    <section className="space-y-3">
      {index > 0 && (
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-600">
          <span className="h-px flex-1 bg-ink-700" />
          follow-up
          <span className="h-px flex-1 bg-ink-700" />
        </div>
      )}

      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-500/15 px-4 py-2.5 text-[15px] text-neutral-100 ring-1 ring-indigo-400/20">
          {turn.prompt}
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))` }}
      >
        {cols.map(({ voice, answer }) => (
          <AnswerCard
            key={voice.id}
            voice={voice}
            answer={answer}
            onRegenerate={() => onRegenerate(turn.id, voice.id)}
          />
        ))}
      </div>

      {turn.synthesis ? (
        <SynthesisCard
          synthesis={turn.synthesis}
          sourceNames={synthSourceNames}
          onRegenerate={() => onSynthesize(turn.id)}
        />
      ) : (
        <div className="flex items-center justify-center gap-3 pt-0.5">
          <button
            type="button"
            disabled={!canSynthesize}
            onClick={() => onSynthesize(turn.id)}
            className="flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden>✦</span> Synthesize best answer
          </button>
          {stillWorking && (
            <span className="text-[11px] text-neutral-500">waiting for voices…</span>
          )}
        </div>
      )}
    </section>
  );
}

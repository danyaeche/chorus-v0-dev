import type { ChorusTurn } from "../types";
import { VOICES_BY_ID } from "../voices";
import { AnswerCard } from "./AnswerCard";

interface Props {
  turn: ChorusTurn;
  onRegenerate: (turnId: string, voiceId: string) => void;
}

/** Renders one prompt and the grid of voice answers beneath it. */
export function TurnView({ turn, onRegenerate }: Props) {
  const voices = turn.voiceIds
    .map((id) => VOICES_BY_ID[id])
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-500/15 px-4 py-2.5 text-[15px] text-neutral-100 ring-1 ring-indigo-400/20">
          {turn.prompt}
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
        }}
      >
        {voices.map((voice) => (
          <AnswerCard
            key={voice.id}
            voice={voice}
            answer={turn.answers[voice.id]}
            onRegenerate={() => onRegenerate(turn.id, voice.id)}
          />
        ))}
      </div>
    </section>
  );
}

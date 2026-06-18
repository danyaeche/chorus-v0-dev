import type { Voice } from "../types";
import { VoiceAvatar } from "./VoiceAvatar";

interface Props {
  voices: Voice[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

/** Chip row for choosing which voices sing in the chorus. */
export function VoicePicker({ voices, selected, onToggle, disabled }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        Voices
      </span>
      {voices.map((voice) => {
        const isOn = selected.includes(voice.id);
        return (
          <button
            key={voice.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(voice.id)}
            aria-pressed={isOn}
            title={voice.blurb}
            className={[
              "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isOn
                ? "border-transparent bg-ink-700 text-neutral-100 shadow-sm"
                : "border-ink-600 bg-transparent text-neutral-400 hover:border-ink-600 hover:bg-ink-800",
            ].join(" ")}
            style={isOn ? { boxShadow: `inset 0 0 0 1px ${voice.accent}55` } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full transition"
              style={{
                backgroundColor: isOn ? voice.accent : "transparent",
                outline: isOn ? "none" : `1px solid ${voice.accent}88`,
              }}
            />
            {voice.name}
          </button>
        );
      })}
    </div>
  );
}

interface LegendProps {
  voices: Voice[];
}

/** Compact avatar legend, used in headers. */
export function VoiceLegend({ voices }: LegendProps) {
  return (
    <div className="flex -space-x-1.5">
      {voices.map((v) => (
        <VoiceAvatar key={v.id} voice={v} size={22} />
      ))}
    </div>
  );
}

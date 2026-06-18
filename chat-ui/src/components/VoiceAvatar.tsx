import type { Voice } from "../types";

interface Props {
  voice: Voice;
  size?: number;
}

/** A small colored disc with the voice's initials. */
export function VoiceAvatar({ voice, size = 28 }: Props) {
  const initials = voice.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-ink-950"
      style={{
        width: size,
        height: size,
        backgroundColor: voice.accent,
        fontSize: size * 0.4,
      }}
      title={`${voice.name} · ${voice.vendor}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

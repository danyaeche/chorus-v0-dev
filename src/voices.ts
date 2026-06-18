import type { Voice } from "./types";

/**
 * The roster of voices available in v0. These are illustrative — wiring a real
 * backend means swapping the mock provider, not editing this list (except to
 * match whatever models the backend exposes).
 */
export const VOICES: Voice[] = [
  {
    id: "opus",
    name: "Claude Opus",
    vendor: "Anthropic",
    accent: "#d97757",
    blurb: "Thoughtful and thorough — the deep thinker of the group.",
  },
  {
    id: "sonnet",
    name: "Claude Sonnet",
    vendor: "Anthropic",
    accent: "#c084fc",
    blurb: "Fast, balanced, and dependable for everyday questions.",
  },
  {
    id: "gpt",
    name: "GPT-4o",
    vendor: "OpenAI",
    accent: "#34d399",
    blurb: "Versatile generalist with a confident voice.",
  },
  {
    id: "gemini",
    name: "Gemini",
    vendor: "Google",
    accent: "#60a5fa",
    blurb: "Crisp and structured, great at laying out the options.",
  },
  {
    id: "llama",
    name: "Llama 3",
    vendor: "Meta",
    accent: "#fbbf24",
    blurb: "Open-weight and to the point.",
  },
];

export const VOICES_BY_ID: Record<string, Voice> = Object.fromEntries(
  VOICES.map((v) => [v.id, v])
);

/** Voices selected by default on first load. */
export const DEFAULT_VOICE_IDS = ["opus", "gpt", "gemini"];

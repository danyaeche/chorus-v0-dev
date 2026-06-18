import type { ChorusProvider, StreamChunk, Voice } from "./types";

/**
 * A deterministic-ish mock provider that simulates per-voice streaming so the
 * UI flow can be exercised end-to-end without API keys. Each voice gets its
 * own "thinking" delay and typing speed so the chorus feels alive and the
 * columns finish at different times — exactly what the real flow must handle.
 *
 * Swap this for a real provider implementing the same `ChorusProvider`
 * contract (e.g. fetch + ReadableStream / SSE) and the UI is unchanged.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

/** Build a plausible, voice-flavored answer for a given prompt. */
function composeAnswer(voice: Voice, prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  const topic =
    trimmed.length > 80 ? trimmed.slice(0, 80).trimEnd() + "…" : trimmed;

  const openers: Record<string, string> = {
    opus: `Let's think this through carefully. On "${topic}", the key tension is between depth and practicality.`,
    sonnet: `Quick take on "${topic}": here's the balanced view, then the nuance.`,
    gpt: `Great question. Here's how I'd approach "${topic}".`,
    gemini: `For "${topic}", it helps to break this into clear parts.`,
    llama: `On "${topic}" — straight answer first, then the why.`,
  };

  const bodies = [
    "First, the core idea is to start from what you actually want as an outcome and work backwards.",
    "There are a few credible options, each with a different trade-off between speed and certainty.",
    "A common pitfall is over-optimizing one dimension while quietly paying for it elsewhere.",
    "In practice, the simplest version that you can ship and learn from usually beats the clever one.",
  ];

  const closers: Record<string, string> = {
    opus: "If you want, I can stress-test the weakest assumption in this reasoning.",
    sonnet: "Happy to go deeper on whichever part matters most to you.",
    gpt: "Want me to turn this into a step-by-step plan?",
    gemini: "I can lay this out as a comparison table if that's clearer.",
    llama: "That's the gist — ask if you want the long version.",
  };

  const seed = hash(voice.id + "|" + trimmed);
  const pick = <T>(arr: T[]): T => arr[seed % arr.length];

  return [
    openers[voice.id] ?? openers.gpt,
    pick(bodies),
    bodies[(seed >> 3) % bodies.length],
    closers[voice.id] ?? closers.gpt,
  ].join("\n\n");
}

export const mockProvider: ChorusProvider = {
  async ask(voice, prompt, onChunk, signal) {
    const seed = hash(voice.id + prompt);

    // Each voice "thinks" for a slightly different beat before answering.
    const thinkMs = 350 + (seed % 900);
    await sleep(thinkMs, signal);

    const full = composeAnswer(voice, prompt);
    // Stream word-by-word so the typing animation reads naturally.
    const tokens = full.match(/\s*\S+/g) ?? [full];
    const perTokenMs = 14 + (seed % 26);

    for (let i = 0; i < tokens.length; i++) {
      const chunk: StreamChunk = {
        delta: tokens[i],
        done: i === tokens.length - 1,
      };
      onChunk(chunk);
      if (i < tokens.length - 1) {
        await sleep(perTokenMs, signal);
      }
    }
  },
};

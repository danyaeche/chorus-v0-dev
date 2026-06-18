import type {
  ChatMessage,
  ChorusProvider,
  StreamChunk,
  SynthesisInput,
  Voice,
} from "./types";

/**
 * A deterministic-ish mock provider that simulates per-voice streaming so the
 * UI flow can be exercised end-to-end without API keys. Each voice gets its
 * own "thinking" delay and typing speed so the chorus feels alive and the
 * columns finish at different times — exactly what the real flow must handle.
 *
 * It is conversation-aware: when a voice already has prior turns in its history
 * the answer explicitly references them, so threading is observable. The
 * Conductor's `synthesize` reads every voice's answer and merges them.
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
    // An already-aborted signal never re-fires "abort"; bail immediately.
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const t = setTimeout(() => {
      // Drop the listener on normal resolve so they don't accumulate across
      // the many sleeps in a single streamed answer.
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function topicOf(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 80 ? trimmed.slice(0, 80).trimEnd() + "…" : trimmed;
}

/** Stream a finished string token-by-token so the typing animation reads well. */
async function streamText(
  full: string,
  perTokenMs: number,
  onChunk: (c: StreamChunk) => void,
  signal: AbortSignal
): Promise<void> {
  const tokens = full.match(/\s*\S+/g) ?? [full];
  for (let i = 0; i < tokens.length; i++) {
    onChunk({ delta: tokens[i]!, done: i === tokens.length - 1 });
    if (i < tokens.length - 1) await sleep(perTokenMs, signal);
  }
}

const BODIES = [
  "First, the core idea is to start from what you actually want as an outcome and work backwards.",
  "There are a few credible options, each with a different trade-off between speed and certainty.",
  "A common pitfall is over-optimizing one dimension while quietly paying for it elsewhere.",
  "In practice, the simplest version that you can ship and learn from usually beats the clever one.",
];

/** Build a plausible, voice-flavored answer from the threaded message history. */
export function composeAnswer(voice: Voice, messages: ChatMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  const prompt = userMsgs[userMsgs.length - 1]?.content ?? "";
  const topic = topicOf(prompt);
  const priorAnswers = messages.filter((m) => m.role === "assistant");
  const isFollowUp = priorAnswers.length > 0;

  const seed = hash(voice.id + "|" + messages.map((m) => m.content).join("|"));
  const pick = <T>(arr: T[]): T => arr[seed % arr.length]!;

  const firstOpeners: Record<string, string> = {
    opus: `Let's think this through carefully. On "${topic}", the key tension is between depth and practicality.`,
    sonnet: `Quick take on "${topic}": here's the balanced view, then the nuance.`,
    gpt: `Great question. Here's how I'd approach "${topic}".`,
    gemini: `For "${topic}", it helps to break this into clear parts.`,
    llama: `On "${topic}" — straight answer first, then the why.`,
  };

  const closers: Record<string, string> = {
    opus: "If you want, I can stress-test the weakest assumption in this reasoning.",
    sonnet: "Happy to go deeper on whichever part matters most to you.",
    gpt: "Want me to turn this into a step-by-step plan?",
    gemini: "I can lay this out as a comparison table if that's clearer.",
    llama: "That's the gist — ask if you want the long version.",
  };

  if (isFollowUp) {
    const prevPrompt = userMsgs[userMsgs.length - 2]?.content ?? "";
    const prevTopic = topicOf(prevPrompt);
    return [
      `Picking up our thread — earlier you asked about "${prevTopic}", and now "${topic}".`,
      `Building on what I said before, the same principle carries over: ${pick(
        BODIES
      ).toLowerCase()}`,
      `What changes here is mostly emphasis — ${BODIES[(seed >> 3) % BODIES.length]!.toLowerCase()}`,
      closers[voice.id] ?? closers.gpt,
    ].join("\n\n");
  }

  return [
    firstOpeners[voice.id] ?? firstOpeners.gpt,
    pick(BODIES),
    BODIES[(seed >> 3) % BODIES.length],
    closers[voice.id] ?? closers.gpt,
  ].join("\n\n");
}

/** Merge every voice's answer into a single best-of response. */
export function composeSynthesis(input: SynthesisInput): string {
  const { prompt, answers } = input;
  const topic = topicOf(prompt);
  const names = answers.map((a) => a.voice.name);
  const list =
    names.length === 1
      ? names[0]
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

  // Treat the longest answer as the most developed; surface a runner-up too.
  const ranked = [...answers].sort((a, b) => b.text.length - a.text.length);
  const lead = ranked[0]?.voice.name ?? "the group";
  const second = ranked.find((a) => a.voice.name !== lead)?.voice.name;

  return [
    `Best answer on "${topic}", synthesized from ${answers.length} voice${
      answers.length > 1 ? "s" : ""
    } (${list}).`,
    "Where they agree: start from the outcome you want and work backwards, ship the simplest version you can learn from, and watch for over-optimizing one dimension at the cost of another.",
    `${lead} made the case most completely${
      second ? `, while ${second} added the sharper caveat about trade-offs` : ""
    }.`,
    "Bottom line: take the smallest next step that moves you forward, then revisit once you've learned something real.",
  ].join("\n\n");
}

export const mockProvider: ChorusProvider = {
  async ask(voice, messages, onChunk, signal) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const seed = hash(voice.id + messages.map((m) => m.content).join("|"));
    // Each voice "thinks" for a slightly different beat before answering.
    await sleep(350 + (seed % 900), signal);
    await streamText(
      composeAnswer(voice, messages),
      14 + (seed % 26),
      onChunk,
      signal
    );
  },

  async synthesize(input, onChunk, signal) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const seed = hash(
      "synth|" + input.prompt + input.answers.map((a) => a.voice.id).join(",")
    );
    // The Conductor takes a moment to "read" every answer before distilling.
    await sleep(500 + (seed % 700), signal);
    await streamText(composeSynthesis(input), 12 + (seed % 18), onChunk, signal);
  },
};

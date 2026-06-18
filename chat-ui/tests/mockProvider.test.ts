import { describe, expect, it } from "vitest";
import {
  composeAnswer,
  composeSynthesis,
  mockProvider,
} from "../src/mockProvider";
import type { ChatMessage, StreamChunk, Voice } from "../src/types";

const opus: Voice = {
  id: "opus",
  name: "Claude Opus",
  vendor: "Anthropic",
  accent: "#d97757",
  blurb: "",
};
const gpt: Voice = {
  id: "gpt",
  name: "GPT-4o",
  vendor: "OpenAI",
  accent: "#34d399",
  blurb: "",
};

async function collect(
  run: (onChunk: (c: StreamChunk) => void, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal
): Promise<string> {
  let out = "";
  await run((c) => (out += c.delta), signal);
  return out;
}

describe("composeAnswer threading", () => {
  it("does not reference a prior thread on the first turn", () => {
    const msgs: ChatMessage[] = [{ role: "user", content: "How do I pick a DB?" }];
    expect(composeAnswer(opus, msgs)).not.toContain("Picking up our thread");
  });

  it("references the earlier prompt on a follow-up", () => {
    const msgs: ChatMessage[] = [
      { role: "user", content: "How do I pick a DB?" },
      { role: "assistant", content: "Earlier answer." },
      { role: "user", content: "What about for a side project?" },
    ];
    const out = composeAnswer(opus, msgs);
    expect(out).toContain("Picking up our thread");
    expect(out).toContain("How do I pick a DB?");
  });
});

describe("composeSynthesis", () => {
  const synth = composeSynthesis({
    prompt: "What about for a side project?",
    answers: [
      { voice: opus, text: "a".repeat(400) },
      { voice: gpt, text: "b".repeat(120) },
    ],
  });

  it("labels the merged result a best answer", () => {
    expect(synth).toContain("Best answer");
  });

  it("names every contributing voice", () => {
    expect(synth).toContain("Claude Opus");
    expect(synth).toContain("GPT-4o");
  });

  it("leads with the most-developed (longest) answer", () => {
    expect(synth).toContain("Claude Opus made the case");
  });
});

describe("mockProvider abort handling", () => {
  it("rejects immediately when given an already-aborted signal", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      mockProvider.ask(opus, [{ role: "user", content: "hi" }], () => {}, ac.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects when aborted mid-stream", async () => {
    const ac = new AbortController();
    const p = collect(
      (onChunk, signal) =>
        mockProvider.ask(opus, [{ role: "user", content: "hi" }], onChunk, signal),
      ac.signal
    );
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects synthesize on an already-aborted signal", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      mockProvider.synthesize(
        { prompt: "q", answers: [{ voice: opus, text: "x" }] },
        () => {},
        ac.signal
      )
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

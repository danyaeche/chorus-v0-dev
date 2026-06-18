import { describe, expect, it } from "vitest";
import { buildVoiceMessages, classifyStreamError } from "../src/useChorus";
import type { Answer, ChorusTurn } from "../src/types";

function answer(voiceId: string, text: string, status: Answer["status"] = "done"): Answer {
  return { voiceId, status, text };
}

function turn(id: string, prompt: string, answers: Record<string, Answer>): ChorusTurn {
  return { id, prompt, voiceIds: Object.keys(answers), answers, createdAt: 0 };
}

describe("buildVoiceMessages", () => {
  it("returns just the new prompt for a first turn", () => {
    expect(buildVoiceMessages([], "opus", "Q1")).toEqual([
      { role: "user", content: "Q1" },
    ]);
  });

  it("threads a prior answered turn into a user/assistant pair", () => {
    const prior = [turn("t1", "Q1", { opus: answer("opus", "A1") })];
    expect(buildVoiceMessages(prior, "opus", "Q2")).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
    ]);
  });

  it("only remembers turns the voice took part in", () => {
    const prior = [
      turn("t1", "Q1", { gpt: answer("gpt", "A1") }), // opus absent
      turn("t2", "Q2", { opus: answer("opus", "A2") }),
    ];
    expect(buildVoiceMessages(prior, "opus", "Q3")).toEqual([
      { role: "user", content: "Q2" },
      { role: "assistant", content: "A2" },
      { role: "user", content: "Q3" },
    ]);
  });

  it("skips errored or empty answers", () => {
    const prior = [
      turn("t1", "Q1", { opus: answer("opus", "boom", "error") }),
      turn("t2", "Q2", { opus: answer("opus", "   ") }),
      turn("t3", "Q3", { opus: answer("opus", "A3") }),
    ];
    expect(buildVoiceMessages(prior, "opus", "Q4")).toEqual([
      { role: "user", content: "Q3" },
      { role: "assistant", content: "A3" },
      { role: "user", content: "Q4" },
    ]);
  });
});

describe("classifyStreamError", () => {
  it("maps an AbortError to a clean done", () => {
    const abort = new DOMException("Aborted", "AbortError");
    expect(classifyStreamError(abort)).toEqual({ status: "done" });
  });

  it("maps any other error to an error status with its message", () => {
    expect(classifyStreamError(new Error("kaboom"))).toEqual({
      status: "error",
      error: "kaboom",
    });
  });

  it("falls back to the provided message when none is present", () => {
    expect(classifyStreamError({}, "Synthesis failed.")).toEqual({
      status: "error",
      error: "Synthesis failed.",
    });
  });
});

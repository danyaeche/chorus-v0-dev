import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Answer,
  ChatMessage,
  ChorusProvider,
  ChorusTurn,
} from "./types";
import { CONDUCTOR, VOICES_BY_ID } from "./voices";

let turnCounter = 0;
function nextTurnId(): string {
  turnCounter += 1;
  return `turn_${turnCounter}_${turnCounter * 2654435761}`;
}

/**
 * Build a voice's threaded history: every prior turn it took part in (and
 * actually answered) becomes a user/assistant pair, ending with the new
 * prompt. A voice only "remembers" turns it was present for, so newly added
 * voices start fresh from the moment they join.
 */
function buildVoiceMessages(
  priorTurns: ChorusTurn[],
  voiceId: string,
  prompt: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const turn of priorTurns) {
    if (!turn.voiceIds.includes(voiceId)) continue;
    const answer = turn.answers[voiceId];
    if (answer && answer.text.trim() && answer.status !== "error") {
      messages.push({ role: "user", content: turn.prompt });
      messages.push({ role: "assistant", content: answer.text });
    }
  }
  messages.push({ role: "user", content: prompt });
  return messages;
}

interface UseChorusResult {
  turns: ChorusTurn[];
  /** True while any voice or synthesis is still in flight. */
  isBusy: boolean;
  /** Fan a prompt out to the given voices, threading in prior context. */
  ask: (prompt: string, voiceIds: string[]) => void;
  /** Cancel any in-flight work. */
  stop: () => void;
  /** Re-run a single voice's answer within an existing turn. */
  regenerate: (turnId: string, voiceId: string) => void;
  /** Distill every voice's answer for a turn into one best-of response. */
  synthesize: (turnId: string) => void;
  clear: () => void;
}

/**
 * Owns the conversation state and the fan-out orchestration. Keeping this in a
 * hook means the view components stay declarative and the streaming mechanics
 * live in one testable place.
 */
export function useChorus(provider: ChorusProvider): UseChorusResult {
  const [turns, setTurns] = useState<ChorusTurn[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Mirror the latest turns into a ref so regenerate/synthesize can read the
  // committed conversation without re-creating their callbacks every render.
  const turnsRef = useRef<ChorusTurn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  /** Reuse the live abort controller, or make a fresh one if none/aborted. */
  const ensureController = useCallback(() => {
    let c = controllerRef.current;
    if (!c || c.signal.aborted) {
      c = new AbortController();
      controllerRef.current = c;
    }
    return c;
  }, []);

  const patchAnswer = useCallback(
    (turnId: string, voiceId: string, patch: Partial<Answer>) => {
      setTurns((prev) =>
        prev.map((turn) => {
          if (turn.id !== turnId) return turn;
          return {
            ...turn,
            answers: {
              ...turn.answers,
              [voiceId]: { ...turn.answers[voiceId], ...patch },
            },
          };
        })
      );
    },
    []
  );

  const runVoice = useCallback(
    async (
      turnId: string,
      voiceId: string,
      messages: ChatMessage[],
      signal: AbortSignal
    ) => {
      const voice = VOICES_BY_ID[voiceId];
      if (!voice) return;

      const startedAt = performance.now();
      setActiveCount((c) => c + 1);
      patchAnswer(turnId, voiceId, { status: "thinking", text: "", error: undefined });

      try {
        await provider.ask(
          voice,
          messages,
          ({ delta }) => {
            setTurns((prev) =>
              prev.map((turn) => {
                if (turn.id !== turnId) return turn;
                const current = turn.answers[voiceId];
                return {
                  ...turn,
                  answers: {
                    ...turn.answers,
                    [voiceId]: {
                      ...current,
                      status: "streaming",
                      text: current.text + delta,
                    },
                  },
                };
              })
            );
          },
          signal
        );
        patchAnswer(turnId, voiceId, {
          status: "done",
          latencyMs: Math.round(performance.now() - startedAt),
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          patchAnswer(turnId, voiceId, { status: "done" });
        } else {
          patchAnswer(turnId, voiceId, {
            status: "error",
            error: (err as Error)?.message ?? "Something went wrong.",
          });
        }
      } finally {
        setActiveCount((c) => Math.max(0, c - 1));
      }
    },
    [patchAnswer, provider]
  );

  const ask = useCallback(
    (prompt: string, voiceIds: string[]) => {
      const text = prompt.trim();
      if (!text || voiceIds.length === 0) return;

      // Starting a new turn cancels any still-streaming previous work.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const priorTurns = turnsRef.current;
      const turnId = nextTurnId();
      const answers: Record<string, Answer> = {};
      for (const id of voiceIds) {
        answers[id] = { voiceId: id, status: "idle", text: "" };
      }

      const turn: ChorusTurn = {
        id: turnId,
        prompt: text,
        voiceIds,
        answers,
        createdAt: Date.now(),
      };
      setTurns((prev) => [...prev, turn]);

      for (const id of voiceIds) {
        const messages = buildVoiceMessages(priorTurns, id, text);
        void runVoice(turnId, id, messages, controller.signal);
      }
    },
    [runVoice]
  );

  const regenerate = useCallback(
    (turnId: string, voiceId: string) => {
      const all = turnsRef.current;
      const index = all.findIndex((t) => t.id === turnId);
      if (index < 0) return;
      const turn = all[index];
      const messages = buildVoiceMessages(all.slice(0, index), voiceId, turn.prompt);
      void runVoice(turnId, voiceId, messages, ensureController().signal);
    },
    [ensureController, runVoice]
  );

  const synthesize = useCallback(
    (turnId: string) => {
      const turn = turnsRef.current.find((t) => t.id === turnId);
      if (!turn) return;

      const sources = turn.voiceIds
        .map((id) => ({ voice: VOICES_BY_ID[id], answer: turn.answers[id] }))
        .filter(
          (x) =>
            x.voice && x.answer && x.answer.text.trim() && x.answer.status !== "error"
        )
        .map((x) => ({ voice: x.voice, text: x.answer.text }));
      if (sources.length === 0) return;

      const signal = ensureController().signal;
      const startedAt = performance.now();

      const patchSynthesis = (patch: Partial<Answer>) => {
        setTurns((prev) =>
          prev.map((t) => {
            if (t.id !== turnId) return t;
            const base: Answer =
              t.synthesis ?? { voiceId: CONDUCTOR.id, status: "idle", text: "" };
            return { ...t, synthesis: { ...base, ...patch } };
          })
        );
      };

      setActiveCount((c) => c + 1);
      patchSynthesis({ status: "thinking", text: "", error: undefined });

      void (async () => {
        try {
          await provider.synthesize(
            { prompt: turn.prompt, answers: sources },
            ({ delta }) => {
              setTurns((prev) =>
                prev.map((t) => {
                  if (t.id !== turnId) return t;
                  const base: Answer =
                    t.synthesis ?? {
                      voiceId: CONDUCTOR.id,
                      status: "streaming",
                      text: "",
                    };
                  return {
                    ...t,
                    synthesis: { ...base, status: "streaming", text: base.text + delta },
                  };
                })
              );
            },
            signal
          );
          patchSynthesis({
            status: "done",
            latencyMs: Math.round(performance.now() - startedAt),
          });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            patchSynthesis({ status: "done" });
          } else {
            patchSynthesis({
              status: "error",
              error: (err as Error)?.message ?? "Synthesis failed.",
            });
          }
        } finally {
          setActiveCount((c) => Math.max(0, c - 1));
        }
      })();
    },
    [ensureController, provider]
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    setTurns([]);
  }, []);

  return {
    turns,
    isBusy: activeCount > 0,
    ask,
    stop,
    regenerate,
    synthesize,
    clear,
  };
}

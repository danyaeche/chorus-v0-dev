import { useCallback, useRef, useState } from "react";
import type { Answer, ChorusProvider, ChorusTurn } from "./types";
import { VOICES_BY_ID } from "./voices";

let turnCounter = 0;
function nextTurnId(): string {
  turnCounter += 1;
  return `turn_${turnCounter}_${turnCounter * 2654435761}`;
}

interface UseChorusResult {
  turns: ChorusTurn[];
  /** True while at least one voice in the latest turn is still answering. */
  isBusy: boolean;
  /** Fan a prompt out to the given voices and stream every answer. */
  ask: (prompt: string, voiceIds: string[]) => void;
  /** Cancel any in-flight answers for the latest turn. */
  stop: () => void;
  /** Re-run a single voice's answer within an existing turn. */
  regenerate: (turnId: string, voiceId: string) => void;
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

  const patchAnswer = useCallback(
    (turnId: string, voiceId: string, patch: Partial<Answer>) => {
      setTurns((prev) =>
        prev.map((turn) => {
          if (turn.id !== turnId) return turn;
          const current = turn.answers[voiceId];
          return {
            ...turn,
            answers: {
              ...turn.answers,
              [voiceId]: { ...current, ...patch },
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
      prompt: string,
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
          prompt,
          ({ delta }) => {
            patchAnswer(turnId, voiceId, { status: "streaming" });
            // Append using the functional updater to avoid stale closures.
            setTurns((prev) =>
              prev.map((turn) => {
                if (turn.id !== turnId) return turn;
                const current = turn.answers[voiceId];
                return {
                  ...turn,
                  answers: {
                    ...turn.answers,
                    [voiceId]: { ...current, text: current.text + delta },
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

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

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
        void runVoice(turnId, id, text, controller.signal);
      }
    },
    [runVoice]
  );

  const regenerate = useCallback(
    (turnId: string, voiceId: string) => {
      const turn = turns.find((t) => t.id === turnId);
      if (!turn) return;
      const controller = controllerRef.current ?? new AbortController();
      controllerRef.current = controller;
      void runVoice(turnId, voiceId, turn.prompt, controller.signal);
    },
    [runVoice, turns]
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    setTurns([]);
  }, []);

  return { turns, isBusy: activeCount > 0, ask, stop, regenerate, clear };
}

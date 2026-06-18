import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Answer,
  ChatMessage,
  ChorusProvider,
  ChorusTurn,
  Synthesis,
  Voice,
} from "./types";
import { VOICES_BY_ID } from "./voices";

let turnCounter = 0;
function nextTurnId(): string {
  turnCounter += 1;
  return `turn_${turnCounter}`;
}

/**
 * Build a voice's threaded history: every prior turn it took part in (and
 * actually answered) becomes a user/assistant pair, ending with the new
 * prompt. A voice only "remembers" turns it was present for, so newly added
 * voices start fresh from the moment they join.
 *
 * Exported for unit testing — this is the core threading rule.
 */
export function buildVoiceMessages(
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

/**
 * Map a thrown streaming error to a status patch: a user-initiated abort ends
 * the answer cleanly as "done"; anything else surfaces as an error. Exported so
 * the mapping can be unit-tested without standing up the hook.
 */
export function classifyStreamError(
  err: unknown,
  fallback = "Something went wrong."
): { status: "done" } | { status: "error"; error: string } {
  if ((err as { name?: string } | null)?.name === "AbortError") {
    return { status: "done" };
  }
  return {
    status: "error",
    error: (err as { message?: string } | null)?.message ?? fallback,
  };
}

interface UseChorusResult {
  turns: ChorusTurn[];
  /** True while any voice or synthesis is still in flight. */
  isBusy: boolean;
  /** Fan a prompt out to the given voices, threading in prior context. */
  ask: (prompt: string, voiceIds: string[]) => void;
  /** Cancel all in-flight work across every turn. */
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

  // One AbortController per turn, so asking a follow-up does NOT cancel work
  // still in flight on earlier turns (e.g. an earlier turn's synthesis). Stop
  // and New-chorus abort every controller; a single turn can be retried after
  // an abort because controllerFor() replaces a spent controller.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const controllerFor = useCallback((turnId: string) => {
    const map = controllersRef.current;
    let c = map.get(turnId);
    if (!c || c.signal.aborted) {
      c = new AbortController();
      map.set(turnId, c);
    }
    return c;
  }, []);
  const abortAll = useCallback(() => {
    for (const c of controllersRef.current.values()) c.abort();
  }, []);

  // Mirror the latest turns into a ref so regenerate/synthesize can read the
  // committed conversation without re-creating their callbacks every render.
  const turnsRef = useRef<ChorusTurn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const patchAnswer = useCallback(
    (turnId: string, voiceId: string, patch: Partial<Answer>) => {
      setTurns((prev) =>
        prev.map((turn) => {
          if (turn.id !== turnId) return turn;
          const current = turn.answers[voiceId];
          if (!current) return turn;
          return {
            ...turn,
            answers: { ...turn.answers, [voiceId]: { ...current, ...patch } },
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
                if (!current) return turn;
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
        patchAnswer(turnId, voiceId, classifyStreamError(err));
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

      const priorTurns = turnsRef.current;
      const turnId = nextTurnId();
      // Fresh turn id → controllerFor mints a new controller; earlier turns are
      // left running.
      const controller = controllerFor(turnId);

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
    [controllerFor, runVoice]
  );

  const regenerate = useCallback(
    (turnId: string, voiceId: string) => {
      const all = turnsRef.current;
      const index = all.findIndex((t) => t.id === turnId);
      if (index < 0) return;
      const turn = all[index];
      if (!turn) return;

      // If this voice fed an existing synthesis, that synthesis no longer
      // reflects its sources — mark it stale.
      if (turn.synthesis?.sourceVoiceIds.includes(voiceId)) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId && t.synthesis
              ? { ...t, synthesis: { ...t.synthesis, stale: true } }
              : t
          )
        );
      }

      const messages = buildVoiceMessages(all.slice(0, index), voiceId, turn.prompt);
      void runVoice(turnId, voiceId, messages, controllerFor(turnId).signal);
    },
    [controllerFor, runVoice]
  );

  const synthesize = useCallback(
    (turnId: string) => {
      const turn = turnsRef.current.find((t) => t.id === turnId);
      if (!turn) return;

      const sources = turn.voiceIds
        .map((id) => ({ voice: VOICES_BY_ID[id], answer: turn.answers[id] }))
        .filter(
          (x): x is { voice: Voice; answer: Answer } =>
            Boolean(
              x.voice && x.answer && x.answer.text.trim() && x.answer.status !== "error"
            )
        )
        .map((x) => ({ voice: x.voice, text: x.answer.text }));
      if (sources.length === 0) return;

      // Snapshot the exact source set so the card label matches the body.
      const sourceVoiceIds = sources.map((s) => s.voice.id);
      const signal = controllerFor(turnId).signal;
      const startedAt = performance.now();

      const patchSynthesis = (patch: Partial<Synthesis>) => {
        setTurns((prev) =>
          prev.map((t) => {
            if (t.id !== turnId) return t;
            const base: Synthesis =
              t.synthesis ?? { status: "idle", text: "", sourceVoiceIds, stale: false };
            return { ...t, synthesis: { ...base, ...patch } };
          })
        );
      };

      setActiveCount((c) => c + 1);
      patchSynthesis({
        status: "thinking",
        text: "",
        error: undefined,
        sourceVoiceIds,
        stale: false,
      });

      void (async () => {
        try {
          await provider.synthesize(
            { prompt: turn.prompt, answers: sources },
            ({ delta }) => {
              setTurns((prev) =>
                prev.map((t) => {
                  if (t.id !== turnId) return t;
                  const base: Synthesis =
                    t.synthesis ?? {
                      status: "streaming",
                      text: "",
                      sourceVoiceIds,
                      stale: false,
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
          patchSynthesis(classifyStreamError(err, "Synthesis failed."));
        } finally {
          setActiveCount((c) => Math.max(0, c - 1));
        }
      })();
    },
    [controllerFor, provider]
  );

  const stop = useCallback(() => {
    abortAll();
  }, [abortAll]);

  const clear = useCallback(() => {
    abortAll();
    controllersRef.current.clear();
    setTurns([]);
  }, [abortAll]);

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

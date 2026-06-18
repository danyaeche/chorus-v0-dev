/**
 * Core domain types for the Chorus UI flow.
 *
 * A "chorus" turn is a single user prompt fanned out to many AI "voices"
 * (models). Each voice produces its own streamed answer; the UI lays them
 * out side by side so they can be compared. Turns are threaded: each voice
 * carries its own conversation history into follow-up turns.
 */

export type VoiceId = string;

/** A configured AI model that can sing in the chorus. */
export interface Voice {
  id: VoiceId;
  /** Display name, e.g. "Claude Opus". */
  name: string;
  /** Short provider/family label, e.g. "Anthropic". */
  vendor: string;
  /** Tailwind-friendly accent color (hex) used for the voice's avatar/badge. */
  accent: string;
  /** One-line personality blurb shown in the picker. */
  blurb: string;
}

export type AnswerStatus = "idle" | "thinking" | "streaming" | "done" | "error";

/** One voice's answer to a single prompt. */
export interface Answer {
  voiceId: VoiceId;
  status: AnswerStatus;
  /** Text accumulated so far (may be partial while streaming). */
  text: string;
  /** Populated when status === "error". */
  error?: string;
  /** ms elapsed from request to completion; undefined until done. */
  latencyMs?: number;
}

export type ChatRole = "user" | "assistant";

/** A single message in a voice's threaded conversation. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A single round: one user prompt + every voice's answer to it. */
export interface ChorusTurn {
  id: string;
  prompt: string;
  /** Voices that were asked, in display order. */
  voiceIds: VoiceId[];
  answers: Record<VoiceId, Answer>;
  createdAt: number;
  /**
   * The Conductor's best-of synthesis for this turn. Undefined until the user
   * requests it; reuses the Answer shape (with voiceId === Conductor's id).
   */
  synthesis?: Answer;
}

/** A streamed chunk emitted by a provider for one voice. */
export interface StreamChunk {
  delta: string;
  done: boolean;
}

/** Everything the Conductor needs to synthesize a turn's best answer. */
export interface SynthesisInput {
  prompt: string;
  answers: { voice: Voice; text: string }[];
}

/**
 * Pluggable provider contract. The mock implementation simulates streaming;
 * a real implementation can call an HTTP/SSE backend with the same shape.
 *
 * `ask` receives the voice's full threaded message history (oldest first,
 * ending with the current user prompt) — exactly the shape a chat-completions
 * API expects.
 */
export interface ChorusProvider {
  ask(
    voice: Voice,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal: AbortSignal
  ): Promise<void>;

  synthesize(
    input: SynthesisInput,
    onChunk: (chunk: StreamChunk) => void,
    signal: AbortSignal
  ): Promise<void>;
}

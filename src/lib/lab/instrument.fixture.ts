/**
 * RESEARCH / PROTOTYPE ONLY — SYNTHETIC FIXTURE.
 *
 * Every string below is invented placeholder text for schema testing.
 * It is NOT production copy, NOT a real doorway, NOT real branch content,
 * and contains NO participant data. Do not paste real wording in here:
 * doing so would turn the lab into a copy of production.
 */

import {
  CAPTURE_CONTRACT_VERSION,
  type CaptureEvent,
  type CaptureRecord,
} from "./capture";

export const FIXTURE_NOTICE =
  "Synthetic instrument fixture. Placeholder wording only, for capture-schema testing.";

export interface FixtureChoice {
  choiceId: string;
  label: string;
}

export interface FixtureQuestion {
  questionId: string;
  promptText: string;
  noteText: string | null;
  choices: FixtureChoice[];
}

export interface FixtureInstrument {
  instrumentId: string;
  instrumentVersion: string;
  sourceRevision: string;
  doorway: string;
  questions: FixtureQuestion[];
}

export const SYNTHETIC_INSTRUMENT: FixtureInstrument = {
  instrumentId: "lab.synthetic.alpha",
  instrumentVersion: "0.1.0-fixture",
  sourceRevision: "fixture-revision-0000000",
  doorway: "SYNTHETIC_DOORWAY_A",
  questions: [
    {
      questionId: "sq-1",
      promptText: "PLACEHOLDER PROMPT 1 — pick the shape that matches the sample.",
      noteText: "PLACEHOLDER NOTE — synthetic helper text.",
      choices: [
        { choiceId: "sq-1-a", label: "PLACEHOLDER CHOICE A" },
        { choiceId: "sq-1-b", label: "PLACEHOLDER CHOICE B" },
        { choiceId: "sq-1-c", label: "PLACEHOLDER CHOICE C" },
      ],
    },
    {
      questionId: "sq-2",
      promptText: "PLACEHOLDER PROMPT 2 — which sample repeated?",
      noteText: null,
      choices: [
        { choiceId: "sq-2-a", label: "PLACEHOLDER CHOICE A" },
        { choiceId: "sq-2-b", label: "PLACEHOLDER CHOICE B" },
      ],
    },
    {
      questionId: "sq-3",
      promptText: "PLACEHOLDER PROMPT 3 — how long did the sample run?",
      noteText: "PLACEHOLDER NOTE — second synthetic helper text.",
      choices: [
        { choiceId: "sq-3-a", label: "PLACEHOLDER CHOICE A" },
        { choiceId: "sq-3-b", label: "PLACEHOLDER CHOICE B" },
        { choiceId: "sq-3-c", label: "PLACEHOLDER CHOICE C" },
      ],
    },
  ],
};

export const QUESTION_BY_FIXTURE_ID = new Map(
  SYNTHETIC_INSTRUMENT.questions.map((q) => [q.questionId, q]),
);

/* ------------------------------------------------------------------ */
/* Deterministic sample record builder (test input only — not a recorder) */
/* ------------------------------------------------------------------ */

/** Script step describing what the synthetic run did. */
export type FixtureStep =
  | { kind: "display"; questionId: string }
  | { kind: "select"; questionId: string; choiceId: string }
  | { kind: "outcome"; questionId: string; state: "skipped" | "unanswered" | "not_observed" }
  | {
      kind: "boundary";
      boundary: "navigate_forward" | "navigate_back" | "answer_changed" | "restart";
      questionId: string | null;
    };

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const stamp = (i: number) => new Date(T0 + i * 1000).toISOString().replace(/\.\d{3}Z$/, ".000Z");

/**
 * Builds a Contract V1 record from a synthetic script. Deterministic, pure,
 * and test-only: this is not the recorder, it takes no live input.
 */
export function buildFixtureRecord(
  steps: FixtureStep[],
  opts: { runId?: string; closed?: boolean; instrument?: Partial<FixtureInstrument> } = {},
): CaptureRecord {
  const inst = { ...SYNTHETIC_INSTRUMENT, ...opts.instrument };
  const events: CaptureEvent[] = steps.map((s, i) => {
    const base = { eventId: `ev-${i}`, sequence: i, at: stamp(i) };
    switch (s.kind) {
      case "display": {
        const q = QUESTION_BY_FIXTURE_ID.get(s.questionId);
        if (!q) throw new Error(`unknown fixture question ${s.questionId}`);
        return {
          ...base,
          type: "question_displayed",
          questionId: q.questionId,
          promptText: q.promptText,
          noteText: q.noteText,
          choices: q.choices.map((c) => ({ choiceId: c.choiceId, label: c.label })),
        };
      }
      case "select": {
        const q = QUESTION_BY_FIXTURE_ID.get(s.questionId);
        const label = q?.choices.find((c) => c.choiceId === s.choiceId)?.label;
        if (!label) throw new Error(`unknown fixture choice ${s.choiceId}`);
        return {
          ...base,
          type: "choice_selected",
          questionId: s.questionId,
          choiceId: s.choiceId,
          choiceLabel: label,
        };
      }
      case "outcome":
        return { ...base, type: "outcome_state", questionId: s.questionId, state: s.state };
      case "boundary":
        return { ...base, type: "boundary", boundary: s.boundary, questionId: s.questionId };
    }
  });

  return {
    contractVersion: CAPTURE_CONTRACT_VERSION,
    runId: opts.runId ?? "fixture-run-0001",
    startedAt: stamp(0),
    endedAt: opts.closed === false ? null : stamp(steps.length),
    instrument: {
      instrumentId: inst.instrumentId,
      instrumentVersion: inst.instrumentVersion,
      sourceRevision: inst.sourceRevision,
      doorway: inst.doorway,
    },
    events,
  };
}

/** A complete, well-formed synthetic run exercising back / change / restart. */
export const FIXTURE_SCRIPT_FULL: FixtureStep[] = [
  { kind: "display", questionId: "sq-1" },
  { kind: "select", questionId: "sq-1", choiceId: "sq-1-b" },
  { kind: "boundary", boundary: "navigate_forward", questionId: "sq-1" },
  { kind: "display", questionId: "sq-2" },
  { kind: "outcome", questionId: "sq-2", state: "skipped" },
  { kind: "boundary", boundary: "navigate_back", questionId: "sq-2" },
  { kind: "display", questionId: "sq-1" },
  { kind: "boundary", boundary: "answer_changed", questionId: "sq-1" },
  { kind: "select", questionId: "sq-1", choiceId: "sq-1-c" },
  { kind: "boundary", boundary: "navigate_forward", questionId: "sq-1" },
  { kind: "display", questionId: "sq-3" },
  { kind: "select", questionId: "sq-3", choiceId: "sq-3-a" },
  { kind: "boundary", boundary: "restart", questionId: null },
];

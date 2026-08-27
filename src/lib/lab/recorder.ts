/**
 * RESEARCH / PROTOTYPE ONLY — Contract V1 append-only recorder + pure replay.
 *
 * Phase 2 scope: pure functions over Contract V1 records. No UI, no
 * persistence, no export/import, no production branch logic, no participant
 * data, no scoring. Nothing here imports the structural engine, taxonomy or
 * spec: a record must be meaningful with no model at all.
 *
 * Recorder shape: every operation takes a record and returns a NEW record with
 * one event appended. Nothing is ever mutated, reordered or removed. Time and
 * identity are injected, so the recorder itself is deterministic.
 */

import {
  CAPTURE_CONTRACT_VERSION,
  type BoundaryKind,
  type CaptureEvent,
  type CaptureRecord,
  type DerivedResultSnapshot,
  type InstrumentMetadata,
  type MissingnessState,
} from "./capture";

export class RecorderError extends Error {
  constructor(
    public readonly code:
      | "run_closed"
      | "restart_terminal"
      | "unknown_question"
      | "unknown_choice"
      | "already_ended"
      | "outcome_already_stated",
    message: string,
  ) {
    super(message);
    this.name = "RecorderError";
  }
}

/** Injected identity/time source. Deterministic in tests, real at a call site. */
export interface RecorderClock {
  /** ISO-8601 UTC timestamp for the next event. */
  now: (sequence: number) => string;
  /** Unique event id for the next event. */
  eventId: (sequence: number) => string;
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                     */
/* ------------------------------------------------------------------ */

const lastEvent = (r: CaptureRecord): CaptureEvent | undefined => r.events[r.events.length - 1];

/** True once a terminal restart boundary has been appended. */
export function isRestarted(record: CaptureRecord): boolean {
  const e = lastEvent(record);
  return !!e && e.type === "boundary" && e.boundary === "restart";
}

/** True once the run has been closed (restart or endRun). */
export function isClosed(record: CaptureRecord): boolean {
  return record.endedAt !== null || isRestarted(record);
}

function assertAppendable(record: CaptureRecord): void {
  if (isRestarted(record)) {
    throw new RecorderError(
      "restart_terminal",
      "restart is terminal: subsequent interaction requires a new runId and a new record",
    );
  }
  if (record.endedAt !== null) {
    throw new RecorderError("run_closed", "the run has ended; no further events may be appended");
  }
}

function append(record: CaptureRecord, make: (base: EventBaseFields) => CaptureEvent, clock: RecorderClock): CaptureRecord {
  assertAppendable(record);
  const sequence = record.events.length;
  const base = { eventId: clock.eventId(sequence), sequence, at: clock.now(sequence) };
  return { ...record, events: [...record.events, make(base)] };
}

interface EventBaseFields {
  eventId: string;
  sequence: number;
  at: string;
}

/** Latest display of a question, as displayed. Used only for reference checks. */
function latestDisplay(record: CaptureRecord, questionId: string) {
  for (let i = record.events.length - 1; i >= 0; i--) {
    const e = record.events[i]!;
    if (e.type === "question_displayed" && e.questionId === questionId) return e;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Recorder API                                                         */
/* ------------------------------------------------------------------ */

export function startRun(args: {
  runId: string;
  startedAt: string;
  instrument: InstrumentMetadata;
}): CaptureRecord {
  return {
    contractVersion: CAPTURE_CONTRACT_VERSION,
    runId: args.runId,
    startedAt: args.startedAt,
    endedAt: null,
    instrument: { ...args.instrument },
    events: [],
  };
}

export function recordDisplayedQuestion(
  record: CaptureRecord,
  q: {
    questionId: string;
    promptText: string;
    noteText: string | null;
    choices: { choiceId: string; label: string }[];
  },
  clock: RecorderClock,
): CaptureRecord {
  return append(
    record,
    (base) => ({
      ...base,
      type: "question_displayed",
      questionId: q.questionId,
      promptText: q.promptText,
      noteText: q.noteText,
      choices: q.choices.map((c) => ({ choiceId: c.choiceId, label: c.label })),
    }),
    clock,
  );
}

export function recordSelection(
  record: CaptureRecord,
  sel: { questionId: string; choiceId: string },
  clock: RecorderClock,
): CaptureRecord {
  const display = latestDisplay(record, sel.questionId);
  if (!display) {
    throw new RecorderError(
      "unknown_question",
      `${sel.questionId} was never displayed; a selection may not be recorded for it`,
    );
  }
  const choice = display.choices.find((c) => c.choiceId === sel.choiceId);
  if (!choice) {
    throw new RecorderError(
      "unknown_choice",
      `${sel.choiceId} was not among the displayed choices for ${sel.questionId}`,
    );
  }
  return append(
    record,
    (base) => ({
      ...base,
      type: "choice_selected",
      questionId: sel.questionId,
      choiceId: choice.choiceId,
      choiceLabel: choice.label,
    }),
    clock,
  );
}

export function recordOutcomeState(
  record: CaptureRecord,
  out: { questionId: string; state: Exclude<MissingnessState, "answered"> },
  clock: RecorderClock,
): CaptureRecord {
  if (!latestDisplay(record, out.questionId)) {
    throw new RecorderError(
      "unknown_question",
      `${out.questionId} was never displayed; an outcome may not be recorded for it`,
    );
  }
  // One terminal outcome per display occurrence: if an outcome_state already
  // follows the latest display of this question, the current occurrence is
  // resolved and a second outcome is a contract violation. A re-display opens
  // a new occurrence and may be resolved again.
  let latestDisplaySeq = -1;
  for (const e of record.events) {
    if (e.type === "question_displayed" && e.questionId === out.questionId) {
      latestDisplaySeq = e.sequence;
    }
  }
  const alreadyStated = record.events.some(
    (e) =>
      e.type === "outcome_state" &&
      e.questionId === out.questionId &&
      e.sequence > latestDisplaySeq,
  );
  if (alreadyStated) {
    throw new RecorderError(
      "outcome_already_stated",
      `${out.questionId} already has a stated outcome for its current display occurrence; a re-display is required before another outcome may be recorded`,
    );
  }
  return append(
    record,
    (base) => ({
      ...base,
      type: "outcome_state",
      questionId: out.questionId,
      state: out.state,
    }),
    clock,
  );
}

export function recordBoundary(
  record: CaptureRecord,
  b: { boundary: BoundaryKind; questionId: string | null },
  clock: RecorderClock,
): CaptureRecord {
  return append(
    record,
    (base) => ({ ...base, type: "boundary", boundary: b.boundary, questionId: b.questionId }),
    clock,
  );
}

/**
 * Closes the run. A restart boundary already closes the record on its own;
 * calling endRun after it stamps `endedAt` without appending anything.
 */
export function endRun(record: CaptureRecord, endedAt: string): CaptureRecord {
  if (record.endedAt !== null) {
    throw new RecorderError("already_ended", "the run has already ended");
  }
  return { ...record, endedAt };
}

/**
 * Attaches a derived snapshot as a separate sibling. The raw event log is
 * copied through untouched, so `stripDerived` returns the original raw record.
 */
export function attachDerived(
  record: CaptureRecord,
  derived: DerivedResultSnapshot,
): CaptureRecord {
  return { ...record, derived };
}

/* ------------------------------------------------------------------ */
/* Reconstruction / replay (pure, raw-only)                             */
/* ------------------------------------------------------------------ */

export interface TranscriptDisplayStep {
  kind: "displayed";
  sequence: number;
  at: string;
  questionId: string;
  promptText: string;
  noteText: string | null;
  choices: { choiceId: string; label: string }[];
}

export interface TranscriptSelectionStep {
  kind: "selected";
  sequence: number;
  at: string;
  questionId: string;
  choiceId: string;
  choiceLabel: string;
}

export interface TranscriptOutcomeStep {
  kind: "outcome";
  sequence: number;
  at: string;
  questionId: string;
  state: Exclude<MissingnessState, "answered">;
}

export interface TranscriptBoundaryStep {
  kind: "boundary";
  sequence: number;
  at: string;
  boundary: BoundaryKind;
  questionId: string | null;
}

export type TranscriptStep =
  | TranscriptDisplayStep
  | TranscriptSelectionStep
  | TranscriptOutcomeStep
  | TranscriptBoundaryStep;

/**
 * One display of a question is one observation occurrence. Missingness is
 * tracked per occurrence: a re-display starts unresolved (`state: null`) and is
 * resolved only by a later selection or explicit outcome for that occurrence.
 */
export interface TranscriptOccurrence {
  /** Sequence of the question_displayed event that opened this occurrence. */
  displaySequence: number;
  /** Selections stated after this display and before the next one. */
  selections: { sequence: number; choiceId: string; choiceLabel: string }[];
  /** Explicitly stated outcome for this occurrence, or null when unstated. */
  state: MissingnessState | null;
}

/**
 * Per-question state as *stated by the log*. `state: null` means the log never
 * stated an outcome — it is reported as unknown and never inferred.
 */
export interface TranscriptQuestionState {
  questionId: string;
  displayCount: number;
  lastPromptText: string;
  lastNoteText: string | null;
  lastChoices: { choiceId: string; label: string }[];
  /** Every selection in log order, including superseded ones. */
  selections: { sequence: number; choiceId: string; choiceLabel: string }[];
  /** One entry per display, in log order. */
  occurrences: TranscriptOccurrence[];
  /** Stated outcome of the LATEST occurrence, or null when the log states none. */
  state: MissingnessState | null;
}


export interface Transcript {
  runId: string;
  startedAt: string;
  endedAt: string | null;
  instrument: InstrumentMetadata;
  steps: TranscriptStep[];
  questions: TranscriptQuestionState[];
  boundaries: TranscriptBoundaryStep[];
  /** True when the log's final event is a restart boundary. */
  terminatedByRestart: boolean;
  /** True when the record is still open (no endedAt, no restart). */
  open: boolean;
  /** Questions displayed with no stated outcome. Reported, never resolved. */
  unstatedOutcomes: string[];
}

/**
 * Reconstructs a transcript from the raw event log alone. Pure: it reads no
 * derived snapshot, no instrument definition and no engine output.
 */
export function reconstructTranscript(record: CaptureRecord): Transcript {
  const steps: TranscriptStep[] = [];
  const byQuestion = new Map<string, TranscriptQuestionState>();

  for (const e of record.events) {
    switch (e.type) {
      case "question_displayed": {
        steps.push({
          kind: "displayed",
          sequence: e.sequence,
          at: e.at,
          questionId: e.questionId,
          promptText: e.promptText,
          noteText: e.noteText,
          choices: e.choices.map((c) => ({ ...c })),
        });
        const prev = byQuestion.get(e.questionId);
        // A re-display opens a NEW observation occurrence: it starts unresolved
        // and never inherits an earlier occurrence's stated outcome.
        const occurrence: TranscriptOccurrence = {
          displaySequence: e.sequence,
          selections: [],
          state: null,
        };
        byQuestion.set(e.questionId, {
          questionId: e.questionId,
          displayCount: (prev?.displayCount ?? 0) + 1,
          lastPromptText: e.promptText,
          lastNoteText: e.noteText,
          lastChoices: e.choices.map((c) => ({ ...c })),
          selections: prev?.selections ?? [],
          occurrences: [...(prev?.occurrences ?? []), occurrence],
          state: null,
        });
        break;
      }
      case "choice_selected": {
        steps.push({
          kind: "selected",
          sequence: e.sequence,
          at: e.at,
          questionId: e.questionId,
          choiceId: e.choiceId,
          choiceLabel: e.choiceLabel,
        });
        const q = byQuestion.get(e.questionId);
        if (q) {
          const entry = { sequence: e.sequence, choiceId: e.choiceId, choiceLabel: e.choiceLabel };
          q.selections = [...q.selections, entry];
          const current = q.occurrences[q.occurrences.length - 1];
          if (current) {
            current.selections = [...current.selections, entry];
            current.state = "answered";
          }
          q.state = "answered";
        }
        break;
      }
      case "outcome_state": {
        steps.push({
          kind: "outcome",
          sequence: e.sequence,
          at: e.at,
          questionId: e.questionId,
          state: e.state,
        });
        const q = byQuestion.get(e.questionId);
        if (q) {
          const current = q.occurrences[q.occurrences.length - 1];
          if (current) current.state = e.state;
          q.state = e.state;
        }
        break;
      }

      case "boundary": {
        steps.push({
          kind: "boundary",
          sequence: e.sequence,
          at: e.at,
          boundary: e.boundary,
          questionId: e.questionId,
        });
        break;
      }
    }
  }

  const questions = [...byQuestion.values()];
  return {
    runId: record.runId,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    instrument: { ...record.instrument },
    steps,
    questions,
    boundaries: steps.filter((s): s is TranscriptBoundaryStep => s.kind === "boundary"),
    terminatedByRestart: isRestarted(record),
    open: !isClosed(record),
    unstatedOutcomes: questions.filter((q) => q.state === null).map((q) => q.questionId),
  };
}

/**
 * Round-trip check: rebuilds the raw event list from a transcript and compares
 * it to the record's own events. Proves the transcript lost nothing.
 */
export function transcriptToEvents(transcript: Transcript, record: CaptureRecord): CaptureEvent[] {
  // Event ids are log identity, not transcript content; they are read back from
  // the record by sequence so the comparison stays about captured content.
  const idAt = (seq: number) => record.events.find((e) => e.sequence === seq)?.eventId ?? "";
  return transcript.steps.map((s): CaptureEvent => {
    const base = { eventId: idAt(s.sequence), sequence: s.sequence, at: s.at };
    switch (s.kind) {
      case "displayed":
        return {
          ...base,
          type: "question_displayed",
          questionId: s.questionId,
          promptText: s.promptText,
          noteText: s.noteText,
          choices: s.choices.map((c) => ({ ...c })),
        };
      case "selected":
        return {
          ...base,
          type: "choice_selected",
          questionId: s.questionId,
          choiceId: s.choiceId,
          choiceLabel: s.choiceLabel,
        };
      case "outcome":
        return { ...base, type: "outcome_state", questionId: s.questionId, state: s.state };
      case "boundary":
        return { ...base, type: "boundary", boundary: s.boundary, questionId: s.questionId };
    }
  });
}

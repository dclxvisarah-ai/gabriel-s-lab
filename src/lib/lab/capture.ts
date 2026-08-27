/**
 * RESEARCH / PROTOTYPE ONLY.
 * Raw-Response Capture Record Contract V1 — schema + validator.
 *
 * Phase 1 scope: types and validation only. No recorder, no persistence,
 * no replay, no UI, no production branch content, no participant data.
 *
 * Invariants encoded here:
 *  - Model-agnostic: this module imports nothing from the resolution engine,
 *    taxonomy, or structural spec. A record must be meaningful with no engine.
 *  - Raw events are append-only and ordered; derived results, if present at
 *    all, live in a separate sibling object and never annotate raw events.
 *  - Missingness is explicit and never inferred or defaulted.
 */

export const CAPTURE_CONTRACT_VERSION = "v1" as const;

/* ------------------------------------------------------------------ */
/* Missingness vocabulary                                              */
/* ------------------------------------------------------------------ */

/**
 * Explicit outcome states. There is no implicit default: a displayed question
 * with no recorded outcome is a validation error, not an "unanswered".
 */
export type MissingnessState =
  /** Question was displayed and a choice was selected. */
  | "answered"
  /** Displayed, participant explicitly skipped. */
  | "skipped"
  /** Displayed, run ended or moved on with no selection and no explicit skip. */
  | "unanswered"
  /** Displayed, capture instrumentation could not observe the outcome. */
  | "not_observed";

export const MISSINGNESS_STATES: MissingnessState[] = [
  "answered",
  "skipped",
  "unanswered",
  "not_observed",
];

/* ------------------------------------------------------------------ */
/* Raw event log                                                        */
/* ------------------------------------------------------------------ */

export type BoundaryKind = "navigate_forward" | "navigate_back" | "answer_changed" | "restart";

interface EventBase {
  /** Unique within the run. */
  eventId: string;
  /** Monotonic, gapless from 0, defines display order. */
  sequence: number;
  /** ISO-8601 UTC timestamp of the observation. */
  at: string;
}

/** A question that was actually displayed to the participant, as displayed. */
export interface DisplayedQuestionEvent extends EventBase {
  type: "question_displayed";
  questionId: string;
  /** Exact prompt text as rendered. Never a paraphrase or a lookup key. */
  promptText: string;
  /** Exact helper/notes text as rendered, or null when none was rendered. */
  noteText: string | null;
  /** Exact choices as rendered, in rendered order. */
  choices: { choiceId: string; label: string }[];
}

/** A selection the participant actually made. */
export interface ChoiceSelectedEvent extends EventBase {
  type: "choice_selected";
  /** Must refer to a question_displayed event earlier in the log. */
  questionId: string;
  choiceId: string;
  /** Exact label as displayed at selection time. */
  choiceLabel: string;
}

/** Explicit non-answer. Distinct from an absent event. */
export interface OutcomeStateEvent extends EventBase {
  type: "outcome_state";
  questionId: string;
  state: Exclude<MissingnessState, "answered">;
}

/** Navigation / restart / back-change boundary. */
export interface BoundaryEvent extends EventBase {
  type: "boundary";
  boundary: BoundaryKind;
  /** Question the boundary applies to, when it applies to one. */
  questionId: string | null;
}

export type CaptureEvent =
  | DisplayedQuestionEvent
  | ChoiceSelectedEvent
  | OutcomeStateEvent
  | BoundaryEvent;

/* ------------------------------------------------------------------ */
/* Record                                                               */
/* ------------------------------------------------------------------ */

export interface InstrumentMetadata {
  /** Stable identifier of the instrument that produced the run. */
  instrumentId: string;
  /** Version of the instrument content/definition. */
  instrumentVersion: string;
  /** Revision of the source that rendered it (commit sha, build id, etc.). */
  sourceRevision: string;
  /** Doorway/entry point the run was started from. */
  doorway: string;
}

/**
 * Optional derived snapshot. Deliberately opaque and separate: removing this
 * property must leave a complete, valid raw record behind.
 */
export interface DerivedResultSnapshot {
  /** Identifier of whatever produced the snapshot. Not validated for meaning. */
  producer: string;
  producerVersion: string;
  computedAt: string;
  /** Free-form payload. The raw log never depends on it. */
  payload: unknown;
}

export interface CaptureRecord {
  contractVersion: typeof CAPTURE_CONTRACT_VERSION;
  runId: string;
  startedAt: string;
  /** Null while a run is open; a timestamp once it closed. */
  endedAt: string | null;
  instrument: InstrumentMetadata;
  /** Append-only, ordered by `sequence`. */
  events: CaptureEvent[];
  /** Never merged into `events`. Absent is normal. */
  derived?: DerivedResultSnapshot;
}

/* ------------------------------------------------------------------ */
/* Validation                                                           */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
  path: string;
  code:
    | "missing_required"
    | "wrong_type"
    | "empty_string"
    | "bad_timestamp"
    | "bad_sequence"
    | "unknown_reference"
    | "duplicate"
    | "contract_violation";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function reqString(
  v: unknown,
  path: string,
  issues: ValidationIssue[],
  { allowEmpty = false } = {},
): v is string {
  if (v === undefined || v === null) {
    issues.push({ path, code: "missing_required", message: `${path} is required` });
    return false;
  }
  if (typeof v !== "string") {
    issues.push({ path, code: "wrong_type", message: `${path} must be a string` });
    return false;
  }
  if (!allowEmpty && v.trim() === "") {
    issues.push({ path, code: "empty_string", message: `${path} must not be empty` });
    return false;
  }
  return true;
}

function reqTimestamp(v: unknown, path: string, issues: ValidationIssue[]): void {
  if (!reqString(v, path, issues)) return;
  if (!ISO.test(v)) {
    issues.push({ path, code: "bad_timestamp", message: `${path} must be ISO-8601 UTC` });
  }
}

function validateEvent(e: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObj(e)) {
    issues.push({ path, code: "wrong_type", message: `${path} must be an object` });
    return;
  }
  reqString(e["eventId"], `${path}.eventId`, issues);
  reqTimestamp(e["at"], `${path}.at`, issues);
  if (typeof e["sequence"] !== "number" || !Number.isInteger(e["sequence"])) {
    issues.push({
      path: `${path}.sequence`,
      code: e["sequence"] === undefined ? "missing_required" : "wrong_type",
      message: `${path}.sequence must be an integer`,
    });
  }

  switch (e["type"]) {
    case "question_displayed": {
      reqString(e["questionId"], `${path}.questionId`, issues);
      reqString(e["promptText"], `${path}.promptText`, issues);
      const note = e["noteText"];
      if (note !== null && typeof note !== "string") {
        issues.push({
          path: `${path}.noteText`,
          code: note === undefined ? "missing_required" : "wrong_type",
          message: `${path}.noteText must be a string or explicit null`,
        });
      }
      const choices = e["choices"];
      if (!Array.isArray(choices)) {
        issues.push({
          path: `${path}.choices`,
          code: choices === undefined ? "missing_required" : "wrong_type",
          message: `${path}.choices must be an array`,
        });
      } else {
        const seen = new Set<string>();
        choices.forEach((c, i) => {
          const cp = `${path}.choices[${i}]`;
          if (!isObj(c)) {
            issues.push({ path: cp, code: "wrong_type", message: `${cp} must be an object` });
            return;
          }
          if (reqString(c["choiceId"], `${cp}.choiceId`, issues)) {
            const id = c["choiceId"] as string;
            if (seen.has(id))
              issues.push({ path: cp, code: "duplicate", message: `duplicate choiceId ${id}` });
            seen.add(id);
          }
          reqString(c["label"], `${cp}.label`, issues);
        });
      }
      break;
    }
    case "choice_selected": {
      reqString(e["questionId"], `${path}.questionId`, issues);
      reqString(e["choiceId"], `${path}.choiceId`, issues);
      reqString(e["choiceLabel"], `${path}.choiceLabel`, issues);
      break;
    }
    case "outcome_state": {
      reqString(e["questionId"], `${path}.questionId`, issues);
      const s = e["state"];
      if (typeof s !== "string" || !MISSINGNESS_STATES.includes(s as MissingnessState) || s === "answered") {
        issues.push({
          path: `${path}.state`,
          code: s === undefined ? "missing_required" : "contract_violation",
          message: `${path}.state must be one of skipped | unanswered | not_observed`,
        });
      }
      break;
    }
    case "boundary": {
      const b = e["boundary"];
      const kinds: BoundaryKind[] = ["navigate_forward", "navigate_back", "answer_changed", "restart"];
      if (typeof b !== "string" || !kinds.includes(b as BoundaryKind)) {
        issues.push({
          path: `${path}.boundary`,
          code: b === undefined ? "missing_required" : "contract_violation",
          message: `${path}.boundary must be one of ${kinds.join(" | ")}`,
        });
      }
      if (e["questionId"] !== null && typeof e["questionId"] !== "string") {
        issues.push({
          path: `${path}.questionId`,
          code: e["questionId"] === undefined ? "missing_required" : "wrong_type",
          message: `${path}.questionId must be a string or explicit null`,
        });
      }
      break;
    }
    default:
      issues.push({
        path: `${path}.type`,
        code: e["type"] === undefined ? "missing_required" : "contract_violation",
        message: `${path}.type is not a Contract V1 event type`,
      });
  }
}

/** Validates an unknown value against Contract V1. Pure; no inference, no repair. */
export function validateCaptureRecord(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isObj(input)) {
    return {
      valid: false,
      issues: [{ path: "$", code: "wrong_type", message: "record must be an object" }],
    };
  }

  if (input["contractVersion"] !== CAPTURE_CONTRACT_VERSION) {
    issues.push({
      path: "$.contractVersion",
      code: input["contractVersion"] === undefined ? "missing_required" : "contract_violation",
      message: `contractVersion must be "${CAPTURE_CONTRACT_VERSION}"`,
    });
  }
  reqString(input["runId"], "$.runId", issues);
  reqTimestamp(input["startedAt"], "$.startedAt", issues);
  if (input["endedAt"] !== null) {
    if (input["endedAt"] === undefined) {
      issues.push({
        path: "$.endedAt",
        code: "missing_required",
        message: "$.endedAt is required (explicit null while the run is open)",
      });
    } else {
      reqTimestamp(input["endedAt"], "$.endedAt", issues);
    }
  }

  const inst = input["instrument"];
  if (!isObj(inst)) {
    issues.push({
      path: "$.instrument",
      code: inst === undefined ? "missing_required" : "wrong_type",
      message: "$.instrument is required",
    });
  } else {
    reqString(inst["instrumentId"], "$.instrument.instrumentId", issues);
    reqString(inst["instrumentVersion"], "$.instrument.instrumentVersion", issues);
    reqString(inst["sourceRevision"], "$.instrument.sourceRevision", issues);
    reqString(inst["doorway"], "$.instrument.doorway", issues);
  }

  const events = input["events"];
  if (!Array.isArray(events)) {
    issues.push({
      path: "$.events",
      code: events === undefined ? "missing_required" : "wrong_type",
      message: "$.events must be an array",
    });
    return { valid: issues.length === 0, issues };
  }

  events.forEach((e, i) => validateEvent(e, `$.events[${i}]`, issues));

  // Ordering: sequence must be gapless from 0 in array order.
  events.forEach((e, i) => {
    if (isObj(e) && typeof e["sequence"] === "number" && e["sequence"] !== i) {
      issues.push({
        path: `$.events[${i}].sequence`,
        code: "bad_sequence",
        message: `sequence ${e["sequence"]} does not match position ${i}`,
      });
    }
  });

  // Restart is terminal: it closes the record. The next interaction belongs to
  // a separate record with a new runId, so nothing may follow it here.
  for (let i = 0; i < events.length - 1; i++) {
    const e = events[i];
    if (isObj(e) && e["type"] === "boundary" && e["boundary"] === "restart") {
      issues.push({
        path: `$.events[${i}]`,
        code: "contract_violation",
        message:
          "a restart boundary must be the final event; subsequent interaction requires a new runId",
      });
      break;
    }
  }

  // Referential integrity + explicit outcome per displayed question.
  const displayed = new Map<string, { choices: Set<string>; labels: Map<string, string> }>();
  const resolved = new Set<string>();
  const eventIds = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!isObj(e)) continue;
    const id = e["eventId"];
    if (typeof id === "string") {
      if (eventIds.has(id))
        issues.push({
          path: `$.events[${i}].eventId`,
          code: "duplicate",
          message: `duplicate eventId ${id}`,
        });
      eventIds.add(id);
    }
    const qid = typeof e["questionId"] === "string" ? (e["questionId"] as string) : null;
    if (e["type"] === "question_displayed" && qid) {
      const rawChoices = Array.isArray(e["choices"])
        ? (e["choices"] as unknown[]).filter(isObj)
        : [];
      const choices = new Set(
        rawChoices
          .map((c) => c["choiceId"])
          .filter((c): c is string => typeof c === "string"),
      );
      const labels = new Map<string, string>();
      for (const c of rawChoices) {
        if (typeof c["choiceId"] === "string" && typeof c["label"] === "string") {
          labels.set(c["choiceId"], c["label"]);
        }
      }
      displayed.set(qid, { choices, labels });
      resolved.delete(qid);
    }
    if ((e["type"] === "choice_selected" || e["type"] === "outcome_state") && qid) {
      const d = displayed.get(qid);
      if (!d) {
        issues.push({
          path: `$.events[${i}].questionId`,
          code: "unknown_reference",
          message: `${qid} was never displayed before this event`,
        });
      } else if (e["type"] === "choice_selected") {
        const cid = e["choiceId"];
        if (typeof cid === "string" && !d.choices.has(cid)) {
          issues.push({
            path: `$.events[${i}].choiceId`,
            code: "unknown_reference",
            message: `${cid} was not among the displayed choices for ${qid}`,
          });
        }
      }
      resolved.add(qid);
    }
  }

  // Missingness without inference: a closed run must state an outcome for
  // every displayed question rather than let absence imply one.
  if (input["endedAt"] !== null && input["endedAt"] !== undefined) {
    for (const qid of displayed.keys()) {
      if (!resolved.has(qid)) {
        issues.push({
          path: "$.events",
          code: "contract_violation",
          message: `displayed question ${qid} has no explicit outcome; missingness must not be inferred`,
        });
      }
    }
  }

  // Derived snapshot stays a separate sibling object.
  const derived = input["derived"];
  if (derived !== undefined) {
    if (!isObj(derived)) {
      issues.push({
        path: "$.derived",
        code: "wrong_type",
        message: "$.derived must be an object when present",
      });
    } else {
      reqString(derived["producer"], "$.derived.producer", issues);
      reqString(derived["producerVersion"], "$.derived.producerVersion", issues);
      reqTimestamp(derived["computedAt"], "$.derived.computedAt", issues);
      if (!("payload" in derived)) {
        issues.push({
          path: "$.derived.payload",
          code: "missing_required",
          message: "$.derived.payload is required when a snapshot is present",
        });
      }
    }
  }
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (isObj(e) && ("derived" in e || "result" in e || "score" in e)) {
      issues.push({
        path: `$.events[${i}]`,
        code: "contract_violation",
        message: "raw events must not carry derived/result/score fields",
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

/** Convenience: the raw record with any derived snapshot removed. */
export function stripDerived(record: CaptureRecord): CaptureRecord {
  const { derived: _derived, ...raw } = record;
  return raw as CaptureRecord;
}

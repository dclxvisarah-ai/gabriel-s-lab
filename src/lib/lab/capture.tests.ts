/**
 * RESEARCH / PROTOTYPE ONLY — Contract V1 schema assertions.
 * Pure, unit-level, synthetic input only. No UI, no persistence, no live capture.
 */

import {
  stripDerived,
  validateCaptureRecord,
  type CaptureRecord,
  type ValidationIssue,
} from "./capture";
import {
  buildFixtureRecord,
  FIXTURE_SCRIPT_FULL,
  SYNTHETIC_INSTRUMENT,
} from "./instrument.fixture";

export interface CaptureTestResult {
  id: string;
  name: string;
  category:
    | "shape"
    | "required"
    | "ordering"
    | "reference"
    | "missingness"
    | "separation"
    | "boundary";
  intent: string;
  passed: boolean;
  observed: string;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const codes = (issues: ValidationIssue[]) => issues.map((i) => `${i.path}:${i.code}`).join(", ");

function withoutPath(record: CaptureRecord, path: string[]): unknown {
  const copy = clone(record) as unknown as Record<string, unknown>;
  let node: Record<string, unknown> = copy;
  for (const seg of path.slice(0, -1)) node = node[seg] as Record<string, unknown>;
  delete node[path[path.length - 1]!];
  return copy;
}

export function runCaptureTests(): CaptureTestResult[] {
  const results: CaptureTestResult[] = [];
  const push = (r: CaptureTestResult) => results.push(r);

  const valid = buildFixtureRecord(FIXTURE_SCRIPT_FULL);

  /* 1. The fixture produces a valid record shape. */
  {
    const r = validateCaptureRecord(valid);
    push({
      id: "cap-1",
      name: "Synthetic fixture produces a Contract V1 valid record",
      category: "shape",
      intent:
        "A full synthetic run with displays, selections, skip, back, answer-change and restart must validate.",
      passed: r.valid,
      observed: r.valid ? `${valid.events.length} events, 0 issues` : codes(r.issues),
    });
  }

  /* 2. Every required top-level field fails validation when absent. */
  {
    const required: string[][] = [
      ["contractVersion"],
      ["runId"],
      ["startedAt"],
      ["endedAt"],
      ["instrument"],
      ["events"],
      ["instrument", "instrumentId"],
      ["instrument", "instrumentVersion"],
      ["instrument", "sourceRevision"],
      ["instrument", "doorway"],
    ];
    const failures = required.filter(
      (p) => validateCaptureRecord(withoutPath(valid, p)).valid,
    );
    push({
      id: "cap-2",
      name: "Missing required fields fail validation",
      category: "required",
      intent: "No required Contract V1 field may be omitted, defaulted, or inferred.",
      passed: failures.length === 0,
      observed:
        failures.length === 0
          ? `${required.length}/${required.length} omissions rejected`
          : `wrongly accepted: ${failures.map((f) => f.join(".")).join(", ")}`,
    });
  }

  /* 3. Required event fields fail when absent. */
  {
    const fields = ["eventId", "sequence", "at", "type", "promptText", "noteText", "choices"];
    const wrongly = fields.filter((f) => {
      const copy = clone(valid);
      delete (copy.events[0] as unknown as Record<string, unknown>)[f];
      return validateCaptureRecord(copy).valid;
    });
    push({
      id: "cap-3",
      name: "Missing displayed-question event fields fail validation",
      category: "required",
      intent:
        "The exact prompt, note (explicit null allowed), choices and ordering metadata are all mandatory.",
      passed: wrongly.length === 0,
      observed:
        wrongly.length === 0
          ? `${fields.length}/${fields.length} omissions rejected`
          : `wrongly accepted: ${wrongly.join(", ")}`,
    });
  }

  /* 4. Ordering integrity. */
  {
    const copy = clone(valid);
    const tmp = copy.events[1]!;
    copy.events[1] = copy.events[2]!;
    copy.events[2] = tmp;
    const r = validateCaptureRecord(copy);
    push({
      id: "cap-4",
      name: "Out-of-order events fail validation",
      category: "ordering",
      intent: "Display order is part of the record; sequence must match position.",
      passed: !r.valid,
      observed: r.valid ? "reordering accepted" : codes(r.issues),
    });
  }

  /* 5. Referential integrity of selections. */
  {
    const unknownChoice = clone(valid);
    (unknownChoice.events[1] as unknown as Record<string, unknown>)["choiceId"] = "sq-1-zzz";
    const undisplayed = clone(valid);
    undisplayed.events.splice(0, 1);
    undisplayed.events.forEach((e, i) => (e.sequence = i));
    const a = validateCaptureRecord(unknownChoice);
    const b = validateCaptureRecord(undisplayed);
    push({
      id: "cap-5",
      name: "Selections must reference displayed questions and displayed choices",
      category: "reference",
      intent: "A record may not assert a selection that was never on screen.",
      passed: !a.valid && !b.valid,
      observed: `unknown choice → ${a.valid ? "accepted" : "rejected"}; undisplayed question → ${b.valid ? "accepted" : "rejected"}`,
    });
  }

  /* 6. Missingness without inference. */
  {
    const open = buildFixtureRecord(
      [{ kind: "display", questionId: "sq-1" }],
      { closed: false },
    );
    const closedNoOutcome = buildFixtureRecord([{ kind: "display", questionId: "sq-1" }]);
    const closedExplicit = buildFixtureRecord([
      { kind: "display", questionId: "sq-1" },
      { kind: "outcome", questionId: "sq-1", state: "unanswered" },
    ]);
    const o = validateCaptureRecord(open);
    const c = validateCaptureRecord(closedNoOutcome);
    const e = validateCaptureRecord(closedExplicit);
    push({
      id: "cap-6",
      name: "Closed runs require an explicit outcome per displayed question",
      category: "missingness",
      intent:
        "Absence of a selection must never be silently read as skipped or unanswered; the state must be stated.",
      passed: o.valid && !c.valid && e.valid,
      observed: `open run ${o.valid ? "valid" : "invalid"}; closed w/o outcome ${c.valid ? "valid" : "invalid"}; closed w/ explicit state ${e.valid ? "valid" : "invalid"}`,
    });
  }

  /* 7. Derived snapshot separation. */
  {
    const withDerived: CaptureRecord = {
      ...clone(valid),
      derived: {
        producer: "synthetic-producer",
        producerVersion: "0.0.0",
        computedAt: "2026-01-01T00:01:00.000Z",
        payload: { placeholder: true },
      },
    };
    const stripped = stripDerived(withDerived);
    const a = validateCaptureRecord(withDerived);
    const b = validateCaptureRecord(stripped);
    const polluted = clone(valid) as unknown as Record<string, unknown>;
    (polluted["events"] as Record<string, unknown>[])[0]!["score"] = 1;
    const c = validateCaptureRecord(polluted);
    const identical =
      JSON.stringify(stripped) === JSON.stringify(clone(valid)) && !("derived" in stripped);
    push({
      id: "cap-7",
      name: "Derived snapshot is a removable sibling; raw events stay clean",
      category: "separation",
      intent:
        "Removing the derived snapshot must leave an unchanged valid raw record, and raw events may carry no result fields.",
      passed: a.valid && b.valid && identical && !c.valid,
      observed: `with snapshot ${a.valid ? "valid" : "invalid"}; stripped ${b.valid ? "valid" : "invalid"}; byte-identical to raw ${identical}; event carrying score → ${c.valid ? "accepted" : "rejected"}`,
    });
  }

  /* 8. Instrument version + source revision are preserved verbatim. */
  {
    const alt = buildFixtureRecord(FIXTURE_SCRIPT_FULL, {
      instrument: { instrumentVersion: "0.2.0-fixture", sourceRevision: "fixture-revision-1111111" },
    });
    const r = validateCaptureRecord(alt);
    const preserved =
      valid.instrument.instrumentVersion === SYNTHETIC_INSTRUMENT.instrumentVersion &&
      alt.instrument.instrumentVersion === "0.2.0-fixture" &&
      alt.instrument.sourceRevision === "fixture-revision-1111111" &&
      alt.instrument.instrumentId === valid.instrument.instrumentId;
    push({
      id: "cap-8",
      name: "Instrument version and source revision are carried as record metadata",
      category: "shape",
      intent:
        "Two runs of the same instrument at different versions/revisions must be distinguishable from the record alone.",
      passed: r.valid && preserved,
      observed: `${valid.instrument.instrumentVersion} @ ${valid.instrument.sourceRevision} vs ${alt.instrument.instrumentVersion} @ ${alt.instrument.sourceRevision}`,
    });
  }

  return results;
}

/**
 * RESEARCH / PROTOTYPE ONLY — Phase 2 recorder + replay assertions.
 * Pure, unit-level, synthetic fixture input only. No UI, no persistence,
 * no live capture, no participant data.
 */

import { stripDerived, validateCaptureRecord, type CaptureRecord, type ValidationIssue } from "./capture";
import {
  QUESTION_BY_FIXTURE_ID,
  SYNTHETIC_INSTRUMENT,
  type FixtureQuestion,
} from "./instrument.fixture";
import {
  RecorderError,
  attachDerived,
  endRun,
  recordBoundary,
  recordDisplayedQuestion,
  recordOutcomeState,
  recordSelection,
  reconstructTranscript,
  startRun,
  transcriptToEvents,
  type RecorderClock,
} from "./recorder";

export interface RecorderTestResult {
  id: string;
  name: string;
  category: "recorder" | "append_only" | "roundtrip" | "boundary" | "missingness" | "separation";
  intent: string;
  passed: boolean;
  observed: string;
}

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const CLOCK: RecorderClock = {
  now: (seq) => new Date(T0 + seq * 1000).toISOString().replace(/\.\d{3}Z$/, ".000Z"),
  eventId: (seq) => `rec-${seq}`,
};
const stamp = CLOCK.now;

const q = (id: string): FixtureQuestion => {
  const found = QUESTION_BY_FIXTURE_ID.get(id);
  if (!found) throw new Error(`unknown fixture question ${id}`);
  return found;
};

const display = (r: CaptureRecord, id: string) =>
  recordDisplayedQuestion(
    r,
    {
      questionId: q(id).questionId,
      promptText: q(id).promptText,
      noteText: q(id).noteText,
      choices: q(id).choices,
    },
    CLOCK,
  );

const codes = (issues: ValidationIssue[]) => issues.map((i) => `${i.path}:${i.code}`).join(", ");

const instrument = {
  instrumentId: SYNTHETIC_INSTRUMENT.instrumentId,
  instrumentVersion: SYNTHETIC_INSTRUMENT.instrumentVersion,
  sourceRevision: SYNTHETIC_INSTRUMENT.sourceRevision,
  doorway: SYNTHETIC_INSTRUMENT.doorway,
};

/** A full synthetic run driven only through the recorder API. */
function recordFullRun(): CaptureRecord {
  let r = startRun({ runId: "recorder-run-0001", startedAt: stamp(0), instrument });
  r = display(r, "sq-1");
  r = recordSelection(r, { questionId: "sq-1", choiceId: "sq-1-b" }, CLOCK);
  r = recordBoundary(r, { boundary: "navigate_forward", questionId: "sq-1" }, CLOCK);
  r = display(r, "sq-2");
  r = recordOutcomeState(r, { questionId: "sq-2", state: "skipped" }, CLOCK);
  r = recordBoundary(r, { boundary: "navigate_back", questionId: "sq-2" }, CLOCK);
  r = display(r, "sq-1");
  r = recordBoundary(r, { boundary: "answer_changed", questionId: "sq-1" }, CLOCK);
  r = recordSelection(r, { questionId: "sq-1", choiceId: "sq-1-c" }, CLOCK);
  r = recordBoundary(r, { boundary: "navigate_forward", questionId: "sq-1" }, CLOCK);
  r = display(r, "sq-3");
  r = recordSelection(r, { questionId: "sq-3", choiceId: "sq-3-a" }, CLOCK);
  return r;
}

export function runRecorderTests(): RecorderTestResult[] {
  const results: RecorderTestResult[] = [];
  const push = (r: RecorderTestResult) => results.push(r);

  const open = recordFullRun();
  const closed = endRun(open, stamp(open.events.length));

  /* 1. The recorder produces a Contract V1 valid record. */
  {
    const v = validateCaptureRecord(closed);
    push({
      id: "rec-1",
      name: "Recorder-produced run validates against Contract V1",
      category: "recorder",
      intent:
        "start / display / select / outcome / boundary / end must compose into a valid record with no repair step.",
      passed: v.valid,
      observed: v.valid ? `${closed.events.length} events, 0 issues` : codes(v.issues),
    });
  }

  /* 2. Append-only, ordered, non-mutating. */
  {
    const before = JSON.stringify(open);
    const after = recordBoundary(open, { boundary: "navigate_forward", questionId: null }, CLOCK);
    const unchanged = JSON.stringify(open) === before;
    const prefix = after.events
      .slice(0, open.events.length)
      .every((e, i) => JSON.stringify(e) === JSON.stringify(open.events[i]));
    const ordered = after.events.every((e, i) => e.sequence === i);
    push({
      id: "rec-2",
      name: "Every operation appends without mutating or reordering prior events",
      category: "append_only",
      intent: "The raw log is append-only: earlier events are byte-identical after any new write.",
      passed: unchanged && prefix && ordered && after.events.length === open.events.length + 1,
      observed: `source unmutated ${unchanged}; prefix preserved ${prefix}; gapless ordering ${ordered}; ${open.events.length} → ${after.events.length}`,
    });
  }

  /* 3. Reconstruction round-trip from the raw log alone. */
  {
    const raw = stripDerived(closed);
    const t = reconstructTranscript(raw);
    const rebuilt = transcriptToEvents(t, raw);
    const identical = JSON.stringify(rebuilt) === JSON.stringify(raw.events);
    const d = t.steps.find((s) => s.kind === "displayed" && s.questionId === "sq-1");
    const exact =
      d?.kind === "displayed" &&
      d.promptText === q("sq-1").promptText &&
      d.noteText === q("sq-1").noteText &&
      JSON.stringify(d.choices) === JSON.stringify(q("sq-1").choices);
    push({
      id: "rec-3",
      name: "Replay reconstructs the transcript from raw events with nothing lost",
      category: "roundtrip",
      intent:
        "Exact prompt, note, choices, labels and order must survive a transcript round trip without derived data.",
      passed: identical && exact,
      observed: `${t.steps.length} steps; event round trip identical ${identical}; displayed wording exact ${exact}`,
    });
  }

  /* 4. Replay needs no derived data. */
  {
    const withDerived = attachDerived(closed, {
      producer: "synthetic-producer",
      producerVersion: "0.0.0",
      computedAt: stamp(99),
      payload: { placeholder: true },
    });
    const a = reconstructTranscript(withDerived);
    const b = reconstructTranscript(stripDerived(withDerived));
    const same = JSON.stringify(a) === JSON.stringify(b);
    const rawClean = withDerived.events.every(
      (e) => !("derived" in e) && !("result" in e) && !("score" in e),
    );
    const v = validateCaptureRecord(withDerived);
    push({
      id: "rec-4",
      name: "Raw events stay separate from the derived snapshot",
      category: "separation",
      intent:
        "Attaching or removing a derived snapshot must not change the raw log or the reconstructed transcript.",
      passed: same && rawClean && v.valid,
      observed: `transcript identical with/without snapshot ${same}; raw events clean ${rawClean}; record valid ${v.valid}`,
    });
  }

  /* 5. Back / change boundaries are preserved as stated events. */
  {
    const t = reconstructTranscript(closed);
    const kinds = t.boundaries.map((b) => b.boundary);
    const sq1 = t.questions.find((x) => x.questionId === "sq-1");
    const passed =
      kinds.includes("navigate_back") &&
      kinds.includes("answer_changed") &&
      sq1?.displayCount === 2 &&
      sq1.selections.length === 2 &&
      sq1.selections[0]!.choiceId === "sq-1-b" &&
      sq1.selections[1]!.choiceId === "sq-1-c";
    push({
      id: "rec-5",
      name: "Back navigation and answer changes are preserved, not collapsed",
      category: "boundary",
      intent:
        "A changed answer keeps both selections and the explicit boundary events; nothing is overwritten in the raw log.",
      passed,
      observed: `boundaries [${kinds.join(", ")}]; sq-1 displayed ${sq1?.displayCount}× with ${sq1?.selections.length} selections`,
    });
  }

  /* 6. Restart is terminal and requires a new runId. */
  {
    let r = recordFullRun();
    r = recordBoundary(r, { boundary: "restart", questionId: null }, CLOCK);
    const v = validateCaptureRecord(endRun(r, stamp(r.events.length)));
    let blocked = false;
    let code = "";
    try {
      display(r, "sq-1");
    } catch (e) {
      blocked = e instanceof RecorderError;
      code = e instanceof RecorderError ? e.code : String(e);
    }
    const next = startRun({ runId: "recorder-run-0002", startedAt: stamp(0), instrument });
    const t = reconstructTranscript(r);
    push({
      id: "rec-6",
      name: "Restart closes the record; the next interaction needs a new runId",
      category: "boundary",
      intent:
        "The recorder must refuse to append after a restart, and replay must report the record as restart-terminated.",
      passed: v.valid && blocked && t.terminatedByRestart && next.runId !== r.runId,
      observed: `record valid ${v.valid}; append after restart rejected (${code}); terminatedByRestart ${t.terminatedByRestart}; new runId ${next.runId}`,
    });
  }

  /* 7. Missingness is never inferred. */
  {
    let r = startRun({ runId: "recorder-run-0003", startedAt: stamp(0), instrument });
    r = display(r, "sq-1");
    const openT = reconstructTranscript(r);
    const silentClose = validateCaptureRecord(endRun(r, stamp(1)));
    const stated = endRun(
      recordOutcomeState(r, { questionId: "sq-1", state: "unanswered" }, CLOCK),
      stamp(2),
    );
    const statedV = validateCaptureRecord(stated);
    const statedT = reconstructTranscript(stated);
    const passed =
      openT.questions[0]!.state === null &&
      openT.unstatedOutcomes.includes("sq-1") &&
      !silentClose.valid &&
      statedV.valid &&
      statedT.questions[0]!.state === "unanswered" &&
      statedT.unstatedOutcomes.length === 0;
    push({
      id: "rec-7",
      name: "An unstated outcome replays as unknown, never as skipped or unanswered",
      category: "missingness",
      intent:
        "Replay reports absence as unstated; only an explicit outcome event yields a state, and a closed run must state one.",
      passed,
      observed: `open state ${String(openT.questions[0]!.state)}; closed w/o outcome valid ${silentClose.valid}; stated → ${statedT.questions[0]!.state}`,
    });
  }

  /* 8. The recorder refuses selections that were never displayed. */
  {
    let r = startRun({ runId: "recorder-run-0004", startedAt: stamp(0), instrument });
    const codesSeen: string[] = [];
    const attempt = (fn: () => void) => {
      try {
        fn();
        codesSeen.push("accepted");
      } catch (e) {
        codesSeen.push(e instanceof RecorderError ? e.code : "other");
      }
    };
    attempt(() => recordSelection(r, { questionId: "sq-1", choiceId: "sq-1-a" }, CLOCK));
    r = display(r, "sq-1");
    attempt(() => recordSelection(r, { questionId: "sq-1", choiceId: "sq-1-zzz" }, CLOCK));
    attempt(() => recordOutcomeState(r, { questionId: "sq-9", state: "skipped" }, CLOCK));
    const ended = endRun(recordOutcomeState(r, { questionId: "sq-1", state: "skipped" }, CLOCK), stamp(3));
    attempt(() => recordBoundary(ended, { boundary: "navigate_forward", questionId: null }, CLOCK));
    push({
      id: "rec-8",
      name: "The recorder cannot fabricate undisplayed questions, choices, or post-close events",
      category: "recorder",
      intent:
        "Every recorded selection must reference something the log says was on screen, and a closed run accepts nothing further.",
      passed: JSON.stringify(codesSeen) ===
        JSON.stringify(["unknown_question", "unknown_choice", "unknown_question", "run_closed"]),
      observed: codesSeen.join(", "),
    });
  }

  return results;
}

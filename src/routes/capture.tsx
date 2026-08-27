/**
 * RESEARCH / PROTOTYPE ONLY — Contract V1 capture sandbox.
 *
 * Drives the existing pure recorder API through real UI interaction using the
 * explicitly synthetic instrument fixture. No production content, no database,
 * no participant data, no scoring. Raw events stay separate from derived data.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import { validateCaptureRecord, type CaptureRecord } from "@/lib/lab/capture";
import {
  SYNTHETIC_INSTRUMENT,
  FIXTURE_NOTICE,
  QUESTION_BY_FIXTURE_ID,
} from "@/lib/lab/instrument.fixture";
import {
  endRun,
  isClosed,
  isRestarted,
  reconstructTranscript,
  recordBoundary,
  recordDisplayedQuestion,
  recordOutcomeState,
  recordSelection,
  startRun,
  type Transcript,
} from "@/lib/lab/recorder";

export const Route = createFileRoute("/capture")({
  component: CapturePage,
  head: () => ({
    meta: [
      { title: "Capture Sandbox — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Research-only sandbox that drives the Contract V1 append-only recorder through synthetic UI interactions, replay and validation.",
      },
      { property: "og:title", content: "Capture Sandbox — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Synthetic Contract V1 capture run: raw event log, reconstructed transcript, JSON export/import and validation.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const QUESTIONS = SYNTHETIC_INSTRUMENT.questions;

/** Live clock/identity source. Injected so the recorder itself stays pure. */
function makeClock(runId: string) {
  return {
    now: () => new Date().toISOString(),
    eventId: (sequence: number) => `${runId}-ev-${sequence}`,
  };
}

function newRun(): { record: CaptureRecord; cursor: number } {
  const runId = `lab-run-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const started = new Date().toISOString();
  let record = startRun({
    runId,
    startedAt: started,
    instrument: {
      instrumentId: SYNTHETIC_INSTRUMENT.instrumentId,
      instrumentVersion: SYNTHETIC_INSTRUMENT.instrumentVersion,
      sourceRevision: SYNTHETIC_INSTRUMENT.sourceRevision,
      doorway: SYNTHETIC_INSTRUMENT.doorway,
    },
  });
  record = recordDisplayedQuestion(record, QUESTIONS[0]!, makeClock(runId));
  return { record, cursor: 0 };
}

function CapturePage() {
  const [state, setState] = useState<{ record: CaptureRecord; cursor: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");

  // Randomness/time must not run at module scope (Worker global-scope rule).
  useEffect(() => {
    setState(newRun());
  }, []);

  const record = state?.record ?? null;
  const transcript: Transcript | null = useMemo(
    () => (record ? reconstructTranscript(record) : null),
    [record],
  );
  const validation = useMemo(() => (record ? validateCaptureRecord(record) : null), [record]);

  if (!state || !record || !transcript || !validation) {
    return (
      <LabPage eyebrow="Capture sandbox" title="Contract V1 capture sandbox">
        <Panel>
          <p className="mono-label">initialising synthetic run…</p>
        </Panel>
      </LabPage>
    );
  }

  const closed = isClosed(record);
  const question = QUESTIONS[state.cursor]!;
  const occurrence = transcript.questions.find((q) => q.questionId === question.questionId);
  const current = occurrence?.occurrences[occurrence.occurrences.length - 1] ?? null;
  const currentAnswered = current?.state === "answered";
  const clock = makeClock(record.runId);

  const apply = (fn: (r: CaptureRecord) => CaptureRecord, cursor = state.cursor) => {
    try {
      setState({ record: fn(record), cursor });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const select = (choiceId: string) => {
    apply((r) => {
      let next = r;
      // An answer change on the same displayed occurrence is an explicit boundary.
      if (currentAnswered) {
        next = recordBoundary(next, { boundary: "answer_changed", questionId: question.questionId }, clock);
      }
      return recordSelection(next, { questionId: question.questionId, choiceId }, clock);
    });
  };

  const skip = () =>
    apply((r) => recordOutcomeState(r, { questionId: question.questionId, state: "skipped" }, clock));

  const move = (dir: 1 | -1) => {
    const nextCursor = state.cursor + dir;
    if (nextCursor < 0 || nextCursor >= QUESTIONS.length) return;
    apply((r) => {
      const boundary = dir === 1 ? "navigate_forward" : "navigate_back";
      const withBoundary = recordBoundary(r, { boundary, questionId: question.questionId }, clock);
      return recordDisplayedQuestion(withBoundary, QUESTIONS[nextCursor]!, clock);
    }, nextCursor);
  };

  const restart = () =>
    apply((r) => recordBoundary(r, { boundary: "restart", questionId: null }, clock));

  const end = () => apply((r) => endRun(r, new Date().toISOString()));

  const exportJson = () => JSON.stringify(record, null, 2);

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText) as unknown;
      const result = validateCaptureRecord(parsed);
      if (!result.valid) {
        setError(
          `imported record is invalid: ${result.issues.map((i) => `${i.path}:${i.code}`).join(", ")}`,
        );
        return;
      }
      const rec = parsed as CaptureRecord;
      const last = [...rec.events].reverse().find((e) => e.type === "question_displayed");
      const idx = last
        ? QUESTIONS.findIndex((q) => q.questionId === last.questionId)
        : 0;
      setState({ record: rec, cursor: idx < 0 ? 0 : idx });
      setError(null);
    } catch (e) {
      setError(`import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const btn =
    "rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-40";

  return (
    <LabPage
      eyebrow="Capture sandbox"
      title="Contract V1 capture sandbox"
      intro="Synthetic instrument only. Each interaction below appends one raw event through the existing append-only recorder; the transcript is reconstructed from the raw log alone and the derived snapshot is never populated here."
    >
      <div className="space-y-6">
        <Panel kicker="fixture">
          <p className="text-sm text-muted-foreground">{FIXTURE_NOTICE}</p>
          <p className="mt-2 font-mono text-xs text-signal">
            {record.runId} · {SYNTHETIC_INSTRUMENT.instrumentId}@
            {SYNTHETIC_INSTRUMENT.instrumentVersion} · rev {SYNTHETIC_INSTRUMENT.sourceRevision} ·{" "}
            {SYNTHETIC_INSTRUMENT.doorway}
          </p>
          <p className="mono-label mt-2">
            {isRestarted(record)
              ? "restart is terminal — start a new run"
              : record.endedAt
                ? "run ended"
                : "run open"}
          </p>
        </Panel>

        {error ? (
          <Panel kicker="recorder refusal">
            <p className="font-mono text-xs text-destructive">{error}</p>
          </Panel>
        ) : null}

        <Panel kicker={`question ${state.cursor + 1} of ${QUESTIONS.length}`} title={question.promptText}>
          {question.noteText ? (
            <p className="text-sm text-muted-foreground">{question.noteText}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {question.choices.map((c) => {
              const chosen = current?.selections[current.selections.length - 1]?.choiceId === c.choiceId;
              return (
                <button
                  key={c.choiceId}
                  className={`${btn} ${chosen ? "border-primary text-primary" : ""}`}
                  disabled={closed}
                  onClick={() => select(c.choiceId)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btn} disabled={closed} onClick={skip}>
              skip (explicit)
            </button>
            <button className={btn} disabled={closed || state.cursor === 0} onClick={() => move(-1)}>
              back
            </button>
            <button
              className={btn}
              disabled={closed || state.cursor === QUESTIONS.length - 1}
              onClick={() => move(1)}
            >
              forward
            </button>
            <button className={btn} disabled={closed} onClick={restart}>
              restart (terminal)
            </button>
            <button className={btn} disabled={closed} onClick={end}>
              end run
            </button>
            <button className={btn} onClick={() => setState(newRun())}>
              new run
            </button>
          </div>
          <p className="mono-label mt-3">
            occurrence state:{" "}
            {current ? (current.state ?? "unstated (never inferred)") : "no display recorded"}
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel kicker="raw event log" title={`${record.events.length} events`}>
            <ol className="space-y-1">
              {record.events.map((e) => (
                <li key={e.eventId} className="font-mono text-xs text-muted-foreground">
                  <span className="text-signal">{String(e.sequence).padStart(2, "0")}</span>{" "}
                  {e.type}
                  {" · "}
                  {e.type === "question_displayed" && e.questionId}
                  {e.type === "choice_selected" && `${e.questionId} → ${e.choiceLabel}`}
                  {e.type === "outcome_state" && `${e.questionId} → ${e.state}`}
                  {e.type === "boundary" && `${e.boundary}${e.questionId ? ` @ ${e.questionId}` : ""}`}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel kicker="reconstructed transcript" title="replayed from raw events only">
            <ul className="space-y-2">
              {transcript.questions.map((q) => (
                <li key={q.questionId} className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="font-mono text-xs text-foreground">
                    {q.questionId} · displays {q.displayCount}
                  </p>
                  <p className="mono-label mt-1 normal-case tracking-normal">
                    {QUESTION_BY_FIXTURE_ID.get(q.questionId)?.promptText}
                  </p>
                  <ol className="mt-2 space-y-0.5">
                    {q.occurrences.map((o) => (
                      <li key={o.displaySequence} className="font-mono text-[11px] text-muted-foreground">
                        display@{o.displaySequence}: {o.state ?? "unstated"}
                        {o.selections.length
                          ? ` · ${o.selections.map((s) => s.choiceLabel).join(" → ")}`
                          : ""}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
            <p className="mono-label mt-3">
              unstated outcomes:{" "}
              {transcript.unstatedOutcomes.length ? transcript.unstatedOutcomes.join(", ") : "none"}
            </p>
          </Panel>
        </div>

        <Panel
          kicker="validation"
          title={validation.valid ? "record satisfies Contract V1" : "record violates Contract V1"}
        >
          {validation.valid ? (
            <p className="text-sm text-muted-foreground">
              Validation of an open run is expected to fail while outcomes are still unstated; that
              is contract behaviour, not a defect.
            </p>
          ) : (
            <ul className="space-y-1">
              {validation.issues.map((i, n) => (
                <li key={n} className="font-mono text-xs text-caution">
                  {i.path} · {i.code} — {i.message}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel kicker="json" title="export / import">
          <textarea
            readOnly
            value={exportJson()}
            className="h-48 w-full rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px]"
          />
          <div className="mt-4 space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="paste a Contract V1 record to validate and load"
              className="h-32 w-full rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px]"
            />
            <button className={btn} onClick={doImport}>
              validate &amp; import
            </button>
          </div>
        </Panel>
      </div>
    </LabPage>
  );
}

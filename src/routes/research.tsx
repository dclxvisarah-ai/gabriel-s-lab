import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import { runResearchLoop } from "@/lib/lab/research/controller";
import { runResearchTests } from "@/lib/lab/research/tests";
import type { HypothesisStatus, Verdict } from "@/lib/lab/research/types";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  head: () => ({
    meta: [
      { title: "Autonomous Research Loop — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Observational view of the bounded research controller: mission, hypothesis states, each iteration's prediction and result, failure analysis, stop reason and pending-approval findings.",
      },
      { property: "og:title", content: "Autonomous Research Loop — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Bounded research iteration over established V2 Addiction research questions. Synthetic fixtures only; no scoring authority.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATUS_STYLE: Record<HypothesisStatus, string> = {
  open: "bg-secondary text-muted-foreground",
  testing: "bg-secondary text-foreground",
  supported: "bg-primary/15 text-primary",
  refuted: "bg-destructive/15 text-destructive",
  inconclusive: "bg-caution/20 text-caution",
  blocked: "bg-caution/25 text-caution",
};

const VERDICT_STYLE: Record<Verdict, string> = {
  supported: "bg-primary/15 text-primary",
  refuted: "bg-destructive/15 text-destructive",
  inconclusive: "bg-caution/20 text-caution",
};

function ResearchPage() {
  const ledger = useMemo(() => runResearchLoop(), []);
  const tests = useMemo(() => runResearchTests(), []);
  const passed = tests.filter((t) => t.passed).length;

  return (
    <LabPage
      eyebrow="Research orchestration"
      title="Bounded autonomous research loop"
      intro="Observational only. The controller selects an established research question, designs an experiment, pre-registers its prediction, runs it through the existing Engine and V2 pipeline, analyses the result, appends to the ledger, and chooses the next justified experiment until a stop condition is reached. It has no scoring authority and cannot change locked V2 material or anything in production."
    >
      <div className="space-y-6">
        <Panel kicker="Mission" title={ledger.mission.objective}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {ledger.mission.successCriteria}
          </p>
          <ul className="mt-3 space-y-1">
            {ledger.mission.outOfScope.map((o) => (
              <li key={o} className="font-mono text-xs text-muted-foreground">
                out of scope · {o}
              </li>
            ))}
          </ul>
          <p className="mono-label mt-4 normal-case tracking-normal text-caution">
            {ledger.summary.note}
          </p>
        </Panel>

        <Panel kicker="Hypotheses" title="Current research question states">
          <ul className="space-y-2">
            {ledger.hypotheses.map((h) => (
              <li key={h.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono-label">{h.id}</span>
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${STATUS_STYLE[h.status]}`}
                  >
                    {h.status}
                  </span>
                  {h.parentId ? (
                    <span className="mono-label normal-case tracking-normal">
                      forked from {h.parentId} · {h.forkedFromExperimentId}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm">{h.statement}</p>
                <p className="mt-1 text-xs text-muted-foreground">Seeded from: {h.derivedFrom}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel kicker="Ledger" title={`${ledger.iterations.length} iteration(s)`}>
          <ol className="space-y-3">
            {ledger.iterations.map((i) => (
              <li key={i.iteration} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-primary">#{i.iteration}</span>
                  <span className="mono-label">
                    {i.hypothesisId} · {i.experimentId} · {i.mechanism}
                  </span>
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${VERDICT_STYLE[i.verdict]}`}
                  >
                    {i.verdict}
                  </span>
                  <span className="mono-label normal-case tracking-normal">
                    {i.statusBefore} → {i.statusAfter}
                  </span>
                </div>
                <p className="mt-2 text-xs">
                  <span className="mono-label">Prediction (pre-registered) </span>
                  {i.prediction}
                </p>
                <p className="mt-1 font-mono text-xs">{i.observed}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="mono-label">Failure class </span>
                  {i.failureClass}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="mono-label">Next step </span>
                  {i.nextStepJustification}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  evidence {i.traceStatementIds.join(", ")} · origin {i.evidenceOrigins.join(", ")} ·
                  empirical finding eligible: {String(i.empiricalFindingEligible)}
                </p>
                {i.flags.length > 0 ? (
                  <p className="mt-1 font-mono text-[11px] text-caution">flags · {i.flags.join(" | ")}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel kicker="Stop" title={`Stop reason: ${ledger.stopReason}`}>
          <p className="font-mono text-xs text-muted-foreground">
            budget · max {ledger.budget.maxIterations} iterations · max{" "}
            {ledger.budget.maxExperimentsPerHypothesis} experiments per hypothesis · halt after{" "}
            {ledger.budget.maxNoNewInformation} iteration(s) without new information
          </p>
        </Panel>

        <Panel kicker="Pending approval" title="Findings the controller may not act on">
          {ledger.pendingApproval.length === 0 ? (
            <p className="text-sm text-muted-foreground">None in this run.</p>
          ) : (
            <ul className="space-y-2">
              {ledger.pendingApproval.map((p) => (
                <li key={p.experimentId} className="rounded-lg border border-caution/40 bg-surface-2 p-4">
                  <p className="mono-label text-caution">
                    {p.hypothesisId} · {p.experimentId} · awaiting {p.requiresApprovalFrom}
                  </p>
                  <p className="mt-2 text-sm">{p.statement}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel kicker="Orchestration harness" title="Machinery assertions">
          <p className="font-mono text-2xl text-primary">
            {passed}/{tests.length}
          </p>
          <ul className="mt-4 space-y-3">
            {tests.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
                      t.passed ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {t.passed ? "hold" : "break"}
                  </span>
                  <h3 className="text-sm font-semibold">{t.name}</h3>
                  <span className="mono-label">{t.id}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t.intent}</p>
                <p className="mt-1 font-mono text-xs">{t.observed}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </LabPage>
  );
}

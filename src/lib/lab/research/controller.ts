/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 *
 * Bounded autonomous research controller.
 *
 *   mission -> hypothesis selection -> experiment design
 *           -> pre-registered prediction -> execution through existing
 *              Engine / V2 mechanisms -> result + failure analysis
 *           -> append-only ledger -> hypothesis status update
 *           -> next justified experiment -> bounded stop
 *
 * Hard rules enforced here:
 *  - No production access and no mutation of locked V2 material.
 *  - Results never feed back into evidence; fixtures are read, never rewritten.
 *  - A conclusion implying a V2/architecture/production change becomes a
 *    pending_approval finding and BLOCKS that line of inquiry.
 *  - Synthetic-fixture evidence can never become an empirical finding.
 *  - Forks come only from an observed verdict, never from an invented direction.
 */

import { EXPERIMENT_BY_ID, SEED_QUEUE } from "./experiments";
import { fixture } from "./fixtures";
import { ADDICTION_MISSION, SEED_HYPOTHESES } from "./registry";
import type {
  Budget,
  EvidenceOrigin,
  FailureClass,
  Hypothesis,
  HypothesisStatus,
  Iteration,
  Mission,
  PendingApprovalFinding,
  ResearchLedger,
  StopReason,
  Verdict,
} from "./types";

export const DEFAULT_BUDGET: Budget = {
  maxIterations: 12,
  maxExperimentsPerHypothesis: 3,
  maxNoNewInformation: 2,
};

const OPEN_STATUSES: HypothesisStatus[] = ["open", "testing"];

function classify(verdict: Verdict, metrics: Record<string, unknown>, architecture: boolean): FailureClass {
  if (architecture) return "unmapped_overlap_flagged";
  if (verdict === "supported") return "none";
  if (Number(metrics["unmapped"] ?? 0) > 0 && Number(metrics["statements"] ?? 0) > 0) {
    return "insufficient_evidence";
  }
  return verdict === "refuted" ? "prediction_mismatch" : "insufficient_evidence";
}

export interface LoopInput {
  mission?: Mission;
  budget?: Partial<Budget>;
  hypotheses?: Hypothesis[];
  /** Override the seeded experiment queue. Research use only. */
  queue?: Record<string, string[]>;
}

export function runResearchLoop(input: LoopInput = {}): ResearchLedger {
  const mission = input.mission ?? ADDICTION_MISSION;
  const budget = { ...DEFAULT_BUDGET, ...(input.budget ?? {}) };

  const hypotheses: Hypothesis[] = (input.hypotheses ?? SEED_HYPOTHESES).map((h) => ({ ...h }));
  const queue = new Map<string, string[]>();
  const seedQueue = input.queue ?? SEED_QUEUE;
  for (const h of hypotheses) queue.set(h.id, [...(seedQueue[h.id] ?? [])]);

  const runCount = new Map<string, number>();
  const iterations: Iteration[] = [];
  const pendingApproval: PendingApprovalFinding[] = [];

  let stopReason: StopReason = "all_hypotheses_closed";
  let noNewInformation = 0;
  let iteration = 0;

  for (;;) {
    const candidates = hypotheses
      .filter((h) => OPEN_STATUSES.includes(h.status) && (queue.get(h.id)?.length ?? 0) > 0)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          (runCount.get(a.id) ?? 0) - (runCount.get(b.id) ?? 0) ||
          a.id.localeCompare(b.id),
      );

    if (candidates.length === 0) {
      const blocked = hypotheses.filter((h) => h.status === "blocked").length;
      const stillOpen = hypotheses.filter((h) => OPEN_STATUSES.includes(h.status));
      for (const h of stillOpen) h.status = "inconclusive";
      stopReason = blocked > 0 && hypotheses.every((h) => !OPEN_STATUSES.includes(h.status)) && blocked === hypotheses.filter((h) => h.status === "blocked").length && blocked === hypotheses.length
        ? "blocked_needs_approval"
        : "all_hypotheses_closed";
      break;
    }

    if (iteration >= budget.maxIterations) {
      stopReason = "budget_exhausted";
      break;
    }
    if (noNewInformation >= budget.maxNoNewInformation) {
      stopReason = "no_new_information";
      break;
    }

    const hypothesis = candidates[0]!;
    const already = runCount.get(hypothesis.id) ?? 0;
    if (already >= budget.maxExperimentsPerHypothesis) {
      hypothesis.status = "inconclusive";
      queue.set(hypothesis.id, []);
      noNewInformation = 0;
      continue;
    }

    const experimentId = queue.get(hypothesis.id)!.shift()!;
    const design = EXPERIMENT_BY_ID.get(experimentId)!;

    /* 1. Prediction is recorded BEFORE anything is executed. */
    const prediction = design.prediction.statement;

    /* 2. Provenance of the evidence about to be used. */
    const sets = design.fixtureIds.map((id) => fixture(id));
    const evidenceOrigins = Array.from(new Set(sets.map((f) => f.origin))) as EvidenceOrigin[];
    const traceStatementIds = sets.flatMap((f) => f.statements.map((s) => s.id));
    const empiricalFindingEligible = evidenceOrigins.every((o) => o === "recorded_run");

    /* 3. Execution through the existing mechanisms. */
    const { metrics, observed, flags } = design.run();

    /* 4. Verdict and failure analysis. */
    const passed = design.prediction.check(metrics);
    const architecture = design.implicatesArchitecture(metrics, flags);
    const verdict: Verdict = passed ? "supported" : "refuted";
    const failureClass = classify(verdict, metrics, architecture);

    const statusBefore = hypothesis.status;
    let statusAfter: HypothesisStatus;
    let justification: string;

    if (architecture) {
      statusAfter = "blocked";
      pendingApproval.push({
        experimentId,
        hypothesisId: hypothesis.id,
        statement: `${hypothesis.statement} — the observed result would imply a change to locked V2 / CrossMap material.`,
        requiresApprovalFrom: "Sarah",
        note: `${observed} The controller records this and stops the line; it cannot implement or promote any architecture change.`,
      });
      queue.set(hypothesis.id, []);
      justification =
        "Line blocked: the conclusion would imply an architecture change, which requires Sarah's approval. No further experiment is selected for this hypothesis.";
    } else {
      const fork = design.forkOn?.[verdict];
      if (fork) {
        if (fork.childHypothesis && !hypotheses.some((h) => h.id === fork.childHypothesis!.id)) {
          hypotheses.push({ ...fork.childHypothesis });
          queue.set(fork.childHypothesis.id, [fork.experimentId]);
        } else {
          queue.get(hypothesis.id)!.push(fork.experimentId);
        }
        statusAfter = fork.childHypothesis ? verdict : "testing";
        justification = `Observed result ${verdict}. Next experiment ${fork.experimentId} is selected directly from this result${fork.childHypothesis ? ` under forked hypothesis ${fork.childHypothesis.id}` : ""}.`;
      } else {
        const remaining = queue.get(hypothesis.id)?.length ?? 0;
        statusAfter = remaining > 0 ? "testing" : verdict;
        justification =
          remaining > 0
            ? "Further queued experiment remains for this hypothesis; the line stays open."
            : "No further experiment is justified by this result; the hypothesis line closes.";
      }
    }

    hypothesis.status = statusAfter;
    runCount.set(hypothesis.id, already + 1);
    iteration += 1;

    const entry: Iteration = {
      iteration,
      hypothesisId: hypothesis.id,
      experimentId,
      mechanism: design.mechanism,
      fixtureIds: design.fixtureIds,
      evidenceOrigins,
      prediction,
      metrics,
      observed,
      flags,
      verdict,
      failureClass,
      statusBefore,
      statusAfter,
      nextStepJustification: justification,
      traceStatementIds,
      empiricalFindingEligible,
    };
    iterations.push(entry);

    const changed = statusBefore !== statusAfter || Boolean(design.forkOn?.[verdict]);
    noNewInformation = changed ? 0 : noNewInformation + 1;
  }

  const byStatus = {
    open: 0,
    testing: 0,
    supported: 0,
    refuted: 0,
    inconclusive: 0,
    blocked: 0,
  } as Record<HypothesisStatus, number>;
  for (const h of hypotheses) byStatus[h.status] += 1;

  return {
    mission,
    budget,
    iterations,
    hypotheses,
    pendingApproval,
    stopReason,
    summary: {
      iterationsRun: iterations.length,
      byStatus,
      empiricalFindings: iterations.filter((i) => i.empiricalFindingEligible).length,
      note: "All evidence in this run came from explicitly labelled synthetic fixtures or candidate constructs. Neither can become an empirical finding; this run validates the research-orchestration machinery only, never the psychological model.",
    },
  };
}

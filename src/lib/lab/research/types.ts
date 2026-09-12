/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 *
 * Types for the autonomous research-orchestration layer. This layer composes
 * the EXISTING Engine / V2 pipeline / capture mechanisms. It never changes
 * locked V2 material, Number meanings or count, CrossMap authority, scoring
 * math or thresholds, and it has no production access.
 */

import type { EvidenceStatement } from "../v2/pipeline";

/** Provenance of every evidence statement entering an experiment. */
export type EvidenceOrigin = "synthetic_fixture" | "recorded_run";

export interface ResearchStatement extends EvidenceStatement {
  origin: EvidenceOrigin;
  /** Human-visible label. Synthetic fixtures must say so, explicitly. */
  fixtureLabel: string;
}

export interface FixtureSet {
  id: string;
  label: string;
  origin: EvidenceOrigin;
  runId: string;
  statements: ResearchStatement[];
}

export type HypothesisStatus =
  | "open"
  | "testing"
  | "supported"
  | "refuted"
  | "inconclusive"
  | "blocked";

export interface Hypothesis {
  id: string;
  statement: string;
  /** Established V2 / Addiction research material this was seeded from. */
  derivedFrom: string;
  priority: number;
  status: HypothesisStatus;
  /** Set only when the controller forked this hypothesis from an observed result. */
  parentId: string | null;
  forkedFromExperimentId: string | null;
}

export interface Mission {
  id: string;
  objective: string;
  successCriteria: string;
  outOfScope: string[];
}

export type Mechanism =
  | "v2.analyzeV2"
  | "engine.resolve"
  | "engine.nextProbe"
  | "capture.validate";

export type MetricValue = string | number | boolean;
export type Metrics = Record<string, MetricValue>;

export interface Prediction {
  /** Stated before execution. Never rewritten afterwards. */
  statement: string;
  check: (m: Metrics) => boolean;
}

export type Verdict = "supported" | "refuted" | "inconclusive";

export type FailureClass =
  | "none"
  | "prediction_mismatch"
  | "insufficient_evidence"
  | "unmapped_overlap_flagged"
  | "synthetic_only_limit";

export interface ExperimentDesign {
  id: string;
  hypothesisId: string;
  mechanism: Mechanism;
  fixtureIds: string[];
  prediction: Prediction;
  /** Pure: builds inputs and derives metrics. Has no access to prior results. */
  run: () => { metrics: Metrics; observed: string; flags: string[] };
  /**
   * Follow-up experiment ids the controller may queue, chosen ONLY from the
   * observed verdict. The controller cannot invent a new research direction.
   */
  forkOn?: Partial<Record<Verdict, { experimentId: string; childHypothesis?: Hypothesis }>>;
  /**
   * True when a conclusion here would imply a V2 / architecture / production
   * change. Such a conclusion becomes pending_approval and blocks the line.
   */
  implicatesArchitecture: (m: Metrics, flags: string[]) => boolean;
}

export interface PendingApprovalFinding {
  experimentId: string;
  hypothesisId: string;
  statement: string;
  requiresApprovalFrom: "Sarah";
  note: string;
}

export interface Iteration {
  iteration: number;
  hypothesisId: string;
  experimentId: string;
  mechanism: Mechanism;
  fixtureIds: string[];
  evidenceOrigins: EvidenceOrigin[];
  /** Recorded before execution. */
  prediction: string;
  metrics: Metrics;
  observed: string;
  flags: string[];
  verdict: Verdict;
  failureClass: FailureClass;
  statusBefore: HypothesisStatus;
  statusAfter: HypothesisStatus;
  nextStepJustification: string;
  /** Ids of evidence statements supporting this iteration's conclusion. */
  traceStatementIds: string[];
  /** Synthetic evidence can never become an empirical finding. */
  empiricalFindingEligible: boolean;
}

export type StopReason =
  | "budget_exhausted"
  | "no_new_information"
  | "all_hypotheses_closed"
  | "blocked_needs_approval";

export interface Budget {
  maxIterations: number;
  maxExperimentsPerHypothesis: number;
  /** Consecutive iterations without a status change or a new fork. */
  maxNoNewInformation: number;
}

export interface ResearchLedger {
  mission: Mission;
  budget: Budget;
  iterations: Iteration[];
  hypotheses: Hypothesis[];
  pendingApproval: PendingApprovalFinding[];
  stopReason: StopReason;
  summary: {
    iterationsRun: number;
    byStatus: Record<HypothesisStatus, number>;
    empiricalFindings: number;
    note: string;
  };
}

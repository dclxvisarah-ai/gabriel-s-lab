/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 * Focused tests for the research-orchestration machinery.
 * These validate the controller only — never the psychological model.
 */

import { analyzeV2 } from "../v2/pipeline";
import { crossMapState, V2_TERRITORIES } from "../v2/territories";
import { runResearchLoop, DEFAULT_BUDGET } from "./controller";
import { EXPERIMENT_BY_ID, EXPERIMENTS } from "./experiments";
import { FIXTURES, fixture } from "./fixtures";
import { SEED_HYPOTHESES } from "./registry";

export interface ResearchTestResult {
  id: string;
  name: string;
  intent: string;
  passed: boolean;
  observed: string;
}

export function runResearchTests(): ResearchTestResult[] {
  const out: ResearchTestResult[] = [];
  const push = (r: ResearchTestResult) => out.push(r);

  const ledger = runResearchLoop();

  /* 1. Determinism ------------------------------------------------- */
  {
    const a = JSON.stringify(runResearchLoop(), (_k, v) => (typeof v === "function" ? null : v));
    const b = JSON.stringify(runResearchLoop(), (_k, v) => (typeof v === "function" ? null : v));
    push({
      id: "res-1",
      name: "The loop is deterministic",
      intent: "Same mission and budget produce an identical ledger, every time.",
      passed: a === b && a.length > 0,
      observed: `two runs identical: ${a === b}; ${ledger.iterations.length} iterations`,
    });
  }

  /* 2. Budget stopping --------------------------------------------- */
  {
    const l = runResearchLoop({ budget: { maxIterations: 2, maxNoNewInformation: 99 } });
    push({
      id: "res-2",
      name: "Iteration budget halts the loop",
      intent: "A bounded run stops at the iteration ceiling with an explicit stop reason.",
      passed: l.stopReason === "budget_exhausted" && l.iterations.length === 2,
      observed: `${l.iterations.length} iterations, stop reason ${l.stopReason}`,
    });
  }

  /* 3. No-new-information stopping ---------------------------------- */
  {
    // Same experiment queued repeatedly: the line stays open but learns nothing new.
    const one = SEED_HYPOTHESES.filter((h) => h.id === "H1");
    const l = runResearchLoop({
      hypotheses: one,
      queue: { H1: ["X1-distinctiveness", "X1-distinctiveness", "X1-distinctiveness"] },
      budget: { maxNoNewInformation: 1, maxExperimentsPerHypothesis: 9 },
    });
    const stalled = l.iterations.some((i) => i.statusBefore === i.statusAfter);
    push({
      id: "res-3",
      name: "Repetition without a status change halts the loop",
      intent: "Recursive re-explanation that produces no new information is not progress.",
      passed: l.stopReason === "no_new_information" && stalled,
      observed: `stop reason ${l.stopReason} after ${l.iterations.length} iterations`,
    });
  }

  /* 4. Hypothesis transitions --------------------------------------- */
  {
    const statuses = new Set(ledger.hypotheses.map((h) => h.status));
    const noneOpen = ledger.hypotheses.every((h) => h.status !== "open" || ledger.stopReason === "budget_exhausted");
    const transitionsLogged = ledger.iterations.every((i) => i.statusBefore !== undefined && i.statusAfter !== undefined);
    push({
      id: "res-4",
      name: "Hypotheses move through explicit statuses",
      intent: "Every hypothesis ends in supported, refuted, inconclusive or blocked, and each move is logged.",
      passed: statuses.size >= 2 && noneOpen && transitionsLogged,
      observed: `final statuses: ${ledger.hypotheses.map((h) => `${h.id}=${h.status}`).join(", ")}`,
    });
  }

  /* 5. Prediction before result -------------------------------------- */
  {
    const design = EXPERIMENT_BY_ID.get("X2-coverage")!;
    const before = design.prediction.statement;
    design.run();
    const after = design.prediction.statement;
    const logged = ledger.iterations.every(
      (i) => i.prediction === EXPERIMENT_BY_ID.get(i.experimentId)!.prediction.statement && i.prediction.length > 0,
    );
    push({
      id: "res-5",
      name: "Predictions are pre-registered and never rewritten",
      intent: "The prediction is fixed by the design and identical before and after execution.",
      passed: before === after && logged,
      observed: `prediction stable: ${before === after}; all ${ledger.iterations.length} ledger entries carry their design's prediction`,
    });
  }

  /* 6. Provenance and synthetic labelling ----------------------------- */
  {
    const allSynthetic = FIXTURES.every(
      (f) => f.origin === "synthetic_fixture" && f.label.includes("SYNTHETIC FIXTURE") &&
        f.statements.every((s) => s.origin === "synthetic_fixture" && s.fixtureLabel.includes("SYNTHETIC")),
    );
    const noFindings =
      ledger.iterations.every((i) => i.empiricalFindingEligible === false) &&
      ledger.summary.empiricalFindings === 0;
    push({
      id: "res-6",
      name: "Synthetic fixtures are labelled and can never become findings",
      intent: "Every statement carries provenance; synthetic origin blocks empirical finding eligibility.",
      passed: allSynthetic && noFindings,
      observed: `all fixtures labelled synthetic: ${allSynthetic}; empirical findings ${ledger.summary.empiricalFindings}`,
    });
  }

  /* 7. No result feedback into evidence -------------------------------- */
  {
    const snapshot = JSON.stringify(FIXTURES);
    runResearchLoop();
    runResearchLoop();
    const unchanged = JSON.stringify(FIXTURES) === snapshot;
    const noResultFields = FIXTURES.every((f) =>
      f.statements.every((s) => !("verdict" in s) && !("possibleNumber" in s) && !("resolution" in s)),
    );
    push({
      id: "res-7",
      name: "Results never feed back into evidence",
      intent: "Running the loop repeatedly leaves the evidence set byte-identical; no result is written into a statement.",
      passed: unchanged && noResultFields,
      observed: `evidence unchanged after repeated runs: ${unchanged}`,
    });
  }

  /* 8. No unauthorized V2 / production mutation ------------------------- */
  {
    const territoriesIntact =
      V2_TERRITORIES.length === 9 &&
      V2_TERRITORIES.every((t) => t.vocabulary.length > 0 && t.distinction.length > 0);
    const crossMapIntact =
      crossMapState(4, 9) === "NO_CURRENT_OVERLAP" &&
      crossMapState(2, 5) === "DIRECT" &&
      crossMapState(5, 7) === "LINGUISTIC_PROXIMITY";
    push({
      id: "res-8",
      name: "The controller mutates no locked V2 material",
      intent: "Territories, Number count and CrossMap authority are unchanged after a full run.",
      passed: territoriesIntact && crossMapIntact,
      observed: `9 territories intact: ${territoriesIntact}; 4↔9 still ${crossMapState(4, 9)}`,
    });
  }

  /* 9. Architecture implications become pending_approval ----------------- */
  {
    const blockedIds = ledger.hypotheses.filter((h) => h.status === "blocked").map((h) => h.id);
    const pending = ledger.pendingApproval;
    const ok =
      pending.length > 0 &&
      pending.every((p) => p.requiresApprovalFrom === "Sarah" && blockedIds.includes(p.hypothesisId));
    push({
      id: "res-9",
      name: "A conclusion implying an architecture change becomes pending_approval and blocks the line",
      intent: "The controller records it and stops; it can never implement a V2 or production change.",
      passed: ok,
      observed: `${pending.length} pending approval finding(s) on hypotheses ${blockedIds.join(", ") || "none"}`,
    });
  }

  /* 10. Existing Engine / V2 behaviour unchanged -------------------------- */
  {
    const f = fixture("fx-drinking-a");
    const direct = analyzeV2({ runId: f.runId, statements: f.statements });
    runResearchLoop();
    const again = analyzeV2({ runId: f.runId, statements: f.statements });
    push({
      id: "res-10",
      name: "Existing Engine and V2 pipeline behaviour is unchanged",
      intent: "The controller composes existing mechanisms and never alters their output.",
      passed: JSON.stringify(direct) === JSON.stringify(again),
      observed: `pipeline output identical before and after a full loop: ${JSON.stringify(direct) === JSON.stringify(again)}`,
    });
  }

  /* 11. Traceable ledger --------------------------------------------------- */
  {
    const traceable = ledger.iterations.every(
      (i) =>
        i.traceStatementIds.length > 0 &&
        i.fixtureIds.length > 0 &&
        i.observed.length > 0 &&
        i.nextStepJustification.length > 0 &&
        i.iteration > 0,
    );
    const ordered = ledger.iterations.every((i, idx) => i.iteration === idx + 1);
    push({
      id: "res-11",
      name: "The ledger is append-only and fully traceable",
      intent: "Each iteration carries its evidence ids, mechanism, result and next-step justification in order.",
      passed: traceable && ordered,
      observed: `${ledger.iterations.length} iterations, all traceable and sequentially numbered: ${traceable && ordered}`,
    });
  }

  /* 12. A subsequent experiment is chosen from the prior result -------------- */
  {
    const forked = ledger.iterations.filter((i) =>
      i.nextStepJustification.includes("selected directly from this result"),
    );
    const followUps = forked
      .map((i) => EXPERIMENT_BY_ID.get(i.experimentId)!.forkOn?.[i.verdict]?.experimentId)
      .filter(Boolean) as string[];
    const ranLater = followUps.every((id) => {
      const parentIdx = ledger.iterations.findIndex((i) => EXPERIMENT_BY_ID.get(i.experimentId)!.forkOn?.supported?.experimentId === id || EXPERIMENT_BY_ID.get(i.experimentId)!.forkOn?.refuted?.experimentId === id);
      const childIdx = ledger.iterations.findIndex((i) => i.experimentId === id);
      return childIdx > parentIdx && parentIdx >= 0;
    });
    push({
      id: "res-12",
      name: "The controller selects a later experiment from an observed result",
      intent: "Multi-iteration run: a fork is queued only after the result that justifies it, and runs afterwards.",
      passed: forked.length > 0 && followUps.length > 0 && ranLater,
      observed: `${forked.length} result-driven fork(s): ${followUps.join(", ") || "none"}`,
    });
  }

  /* 13. Seeded only from established material --------------------------------- */
  {
    const seeded = SEED_HYPOTHESES.every((h) => h.derivedFrom.length > 0 && h.parentId === null);
    const forkedOnly = ledger.hypotheses
      .filter((h) => h.parentId !== null)
      .every((h) => h.forkedFromExperimentId !== null && EXPERIMENT_BY_ID.has(h.forkedFromExperimentId!));
    const allExperimentsBelongToAHypothesis = EXPERIMENTS.every((e) => e.hypothesisId.length > 0);
    push({
      id: "res-13",
      name: "Hypotheses are seeded from established material and forked only from an observed result",
      intent: "The controller cannot invent an unrelated research direction.",
      passed: seeded && forkedOnly && allExperimentsBelongToAHypothesis,
      observed: `${SEED_HYPOTHESES.length} seeded, ${ledger.hypotheses.length - SEED_HYPOTHESES.length} forked from results`,
    });
  }

  /* 14. Bounded by construction ------------------------------------------------ */
  {
    push({
      id: "res-14",
      name: "Every run terminates with an explicit stop reason",
      intent: "Budgets are explicit and the loop always reports why it stopped.",
      passed:
        ["budget_exhausted", "no_new_information", "all_hypotheses_closed", "blocked_needs_approval"].includes(
          ledger.stopReason,
        ) && ledger.iterations.length <= DEFAULT_BUDGET.maxIterations,
      observed: `stop reason ${ledger.stopReason} after ${ledger.iterations.length}/${DEFAULT_BUDGET.maxIterations} iterations`,
    });
  }

  return out;
}

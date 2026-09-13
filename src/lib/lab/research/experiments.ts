/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 *
 * Experiment designs. Each design is pure and states its prediction BEFORE
 * execution; `run()` has no access to any prior result and never writes back
 * into evidence. Execution goes through the EXISTING V2 pipeline (which in
 * turn calls the existing Engine). No mechanism is duplicated here.
 */

import { analyzeV2, type V2Analysis } from "../v2/pipeline";
import { crossMapState, type TerritoryId } from "../v2/territories";
import { fixture } from "./fixtures";
import type { ExperimentDesign, Hypothesis, Metrics } from "./types";

function analyze(fixtureId: string): { analysis: V2Analysis; unmapped: number; total: number } {
  const f = fixture(fixtureId);
  // Statements are passed through unchanged; the pipeline owns all reasoning.
  const analysis = analyzeV2({ runId: f.runId, statements: f.statements });
  const unmapped = f.statements.filter((s) => s.locations.length === 0).length;
  return { analysis, unmapped, total: f.statements.length };
}

function occupied(a: V2Analysis): TerritoryId[] {
  return a.occupancy.filter((o) => o.statementIds.length > 0).map((o) => o.territory);
}

function signature(a: V2Analysis): string {
  return occupied(a).join("-");
}

const never = () => false;

/* ---------------------------------------------------------------- */

const H2_CHILD: Hypothesis = {
  id: "H2.1",
  statement:
    "The constructs that failed to locate (urge/craving, function/motive, self-efficacy) require additional inquiry rather than being captured by existing questions.",
  derivedFrom: "Observed result of experiment X2-coverage",
  priority: 4,
  status: "open",
  parentId: "H2",
  forkedFromExperimentId: "X2-coverage",
};

export const EXPERIMENTS: ExperimentDesign[] = [
  {
    id: "X1-distinctiveness",
    hypothesisId: "H1",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-addiction-core"],
    prediction: {
      statement:
        "Every established-construct statement locates, and the located evidence occupies at least three distinct territories without being collapsed together.",
      check: (m) => Number(m['unmapped']) === 0 && Number(m['territoriesOccupied']) >= 3,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-addiction-core");
      const t = occupied(analysis);
      return {
        metrics: {
          statements: total,
          unmapped,
          territoriesOccupied: t.length,
          signature: signature(analysis),
          outcome: analysis.outcome,
        },
        observed: `${total - unmapped}/${total} statements located across territories ${t.join(", ")}; pipeline outcome ${analysis.outcome}.`,
        flags: analysis.flags,
      };
    },
    implicatesArchitecture: never,
  },

  {
    id: "X2-coverage",
    hypothesisId: "H2",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-unresolved"],
    prediction: {
      statement:
        "All four unresolved-construct statements locate in at least one existing territory, i.e. no statement is left unmapped.",
      check: (m) => Number(m['unmapped']) === 0,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-unresolved");
      return {
        metrics: {
          statements: total,
          unmapped,
          territoriesOccupied: occupied(analysis).length,
          signature: signature(analysis),
        },
        observed: `${unmapped} of ${total} construct statements located nowhere; located evidence occupies ${signature(analysis) || "no territory"}.`,
        flags: analysis.flags,
      };
    },
    forkOn: {
      refuted: { experimentId: "X2-narrowed", childHypothesis: H2_CHILD },
    },
    implicatesArchitecture: never,
  },

  {
    id: "X2-narrowed",
    hypothesisId: "H2.1",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-unresolved-narrowed"],
    prediction: {
      statement:
        "Re-probed with different wording, the previously unmapped constructs still fail to locate, so the gap is in inquiry coverage rather than in the wording of one response.",
      check: (m) => Number(m['unmapped']) === Number(m['statements']),
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-unresolved-narrowed");
      return {
        metrics: { statements: total, unmapped, territoriesOccupied: occupied(analysis).length },
        observed: `${unmapped} of ${total} re-probed construct statements still located nowhere.`,
        flags: analysis.flags,
      };
    },
    implicatesArchitecture: never,
  },

  {
    id: "X3-generalize",
    hypothesisId: "H3",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-drinking-b"],
    prediction: {
      statement:
        "In a different drinking case, shared evidence again earns the 4↔9 intersection.",
      check: (m) => m['earned49'] === true,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-drinking-b");
      const r49 = analysis.relationships.find((r) => r.key === "4-9")!;
      return {
        metrics: {
          statements: total,
          unmapped,
          earned49: r49.earned,
          state49: r49.state,
          crossMap49: crossMapState(4, 9),
          sharedStatements: r49.sharedStatementIds.length,
        },
        observed: `Case B: 4↔9 state ${r49.state}, earned ${r49.earned}, shared evidence ${r49.sharedStatementIds.length}.`,
        flags: analysis.flags,
      };
    },
    forkOn: {
      refuted: { experimentId: "X3-observed-case" },
    },
    implicatesArchitecture: never,
  },

  {
    id: "X3-observed-case",
    hypothesisId: "H3",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-drinking-a"],
    prediction: {
      statement:
        "The originally observed drinking case reproduces an earned 4↔9 intersection, which the locked CrossMap records as NO_CURRENT_OVERLAP.",
      check: (m) => m['earned49'] === true,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-drinking-a");
      const r49 = analysis.relationships.find((r) => r.key === "4-9")!;
      return {
        metrics: {
          statements: total,
          unmapped,
          earned49: r49.earned,
          state49: r49.state,
          crossMap49: crossMapState(4, 9),
          unmappedOverlapFlag: r49.flags.includes("unmapped_evidence_overlap"),
        },
        observed: `Case A: 4↔9 state ${r49.state}, earned ${r49.earned}; locked CrossMap still ${crossMapState(4, 9)}.`,
        flags: analysis.flags,
      };
    },
    implicatesArchitecture: (m, flags) =>
      m["unmappedOverlapFlag"] === true || flags.some((f) => f.includes("Unmapped evidence overlap")),
  },

  {
    id: "X4-nine-meaning",
    hypothesisId: "H4",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-number-nine"],
    prediction: {
      statement:
        "Recognition, pattern-awareness and carry-forward statements all locate at territory 9 under its existing meaning, with no statement left unmapped.",
      check: (m) => Number(m['unmapped']) === 0 && Number(m['atNine']) >= 3,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-number-nine");
      const nine = analysis.occupancy.find((o) => o.territory === 9)!;
      return {
        metrics: {
          statements: total,
          unmapped,
          atNine: nine.statementIds.length,
          signature: signature(analysis),
        },
        observed: `${nine.statementIds.length} of ${total} statements located at territory 9 (${nine.statementIds.join(", ")}); occupied ${signature(analysis)}.`,
        flags: analysis.flags,
      };
    },
    implicatesArchitecture: never,
  },

  {
    id: "X5-cross-behaviour",
    hypothesisId: "H5",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-drinking-a", "fx-gambling-core"],
    prediction: {
      statement:
        "Both behaviours produce located structure in at least two territories, and their occupancy signatures are not identical — structures may recur without being forced to match.",
      check: (m) =>
        Number(m['drinkingTerritories']) >= 2 &&
        Number(m['gamblingTerritories']) >= 2 &&
        m['identicalSignature'] === false,
    },
    run: () => {
      const d = analyze("fx-drinking-a");
      const g = analyze("fx-gambling-core");
      const ds = signature(d.analysis);
      const gs = signature(g.analysis);
      return {
        metrics: {
          drinkingTerritories: occupied(d.analysis).length,
          gamblingTerritories: occupied(g.analysis).length,
          drinkingSignature: ds,
          gamblingSignature: gs,
          identicalSignature: ds === gs,
          sharedTerritories: occupied(d.analysis).filter((t) => occupied(g.analysis).includes(t)).length,
        },
        observed: `Drinking occupies ${ds}; gambling occupies ${gs}; identical ${ds === gs}.`,
        flags: [...d.analysis.flags, ...g.analysis.flags],
      };
    },
    implicatesArchitecture: never,
  },

  {
    id: "X6-pipeline-distinctness",
...
    implicatesArchitecture: never,
  },

  {
    id: "X7-candidate-coverage",
    hypothesisId: "H7",
    mechanism: "v2.analyzeV2",
    fixtureIds: ["fx-drink-candidates"],
    prediction: {
      statement:
        "At least 6 of 8 candidate statements locate to a territory, and the located statements occupy at least 5 distinct territories — i.e. these questions add real distinguishing coverage, not overlap with what already exists.",
      check: (m) => Number(m['located']) >= 6 && Number(m['territoriesOccupied']) >= 5,
    },
    run: () => {
      const { analysis, unmapped, total } = analyze("fx-drink-candidates");
      const t = occupied(analysis);
      return {
        metrics: {
          statements: total,
          unmapped,
          located: total - unmapped,
          territoriesOccupied: t.length,
          signature: signature(analysis),
        },
        observed: `${total - unmapped}/${total} candidate statements located across territories ${t.join(", ")}.`,
        flags: analysis.flags,
      };
    },
    /* If more than 2 of 8 fail to locate, that implicates the architecture itself
       (e.g. the 'body decided' gap) and pauses the line for review. */
    implicatesArchitecture: (m) => Number(m['unmapped']) > 2,
  },
];

export const EXPERIMENT_BY_ID = new Map(EXPERIMENTS.map((e) => [e.id, e]));

/** Experiments queued for a hypothesis at seed time (forks are added later). */
export const SEED_QUEUE: Record<string, string[]> = {
  H1: ["X1-distinctiveness"],
  H2: ["X2-coverage"],
  H3: ["X3-generalize"],
  H4: ["X4-nine-meaning"],
  H5: ["X5-cross-behaviour"],
  H6: ["X6-pipeline-distinctness"],
  H7: ["X7-candidate-coverage"],
};

export function metricsSummary(m: Metrics): string {
  return Object.entries(m)
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ");
}

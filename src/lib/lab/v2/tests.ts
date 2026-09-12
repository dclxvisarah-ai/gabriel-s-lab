/** GABRIEL'S LAB — RESEARCH ONLY. Focused tests for the locked V2 architecture. */

import {
  V2_TERRITORIES,
  TERRITORY_IDS,
  allPairs,
  crossMapState,
  type TerritoryId,
} from "./territories";
import { analyzeV2, vocabularyEchoes, type EvidenceStatement } from "./pipeline";
import type { EvidenceKind } from "../taxonomy";

export interface V2TestResult {
  id: string;
  name: string;
  category:
    | "v2-data"
    | "multi-territory"
    | "redundancy-vs-overlap"
    | "linguistic-proximity"
    | "earned-intersection"
    | "unknown-undetermined"
    | "provenance"
    | "traceability";
  intent: string;
  passed: boolean;
  observed: string;
}

const RUN = "run-a";

function st(
  id: string,
  locations: TerritoryId[],
  probeId: string,
  text: string,
  kind: EvidenceKind = "behavioral_instance",
  strength = 0.9,
  runId = RUN,
): EvidenceStatement {
  return { id, runId, responseId: `resp-${id}`, probeId, text, kind, strength, locations };
}

export function runV2Tests(): V2TestResult[] {
  const out: V2TestResult[] = [];
  const push = (r: V2TestResult) => out.push(r);

  /* ---- Locked V2 data ------------------------------------------- */
  {
    const nine = V2_TERRITORIES.length === 9 && TERRITORY_IDS.join(",") === "1,2,3,4,5,6,7,8,9";
    const complete = V2_TERRITORIES.every(
      (t) => t.vocabulary.length > 0 && t.distinction.length > 0 && t.references.length > 0,
    );
    push({
      id: "v2-data-1",
      name: "Nine territories only, each with locked vocabulary, distinction and comparative references",
      category: "v2-data",
      intent: "V2 expands the semantic architecture of the existing nine and creates no additional Numbers.",
      passed: nine && complete,
      observed: `${V2_TERRITORIES.length} territories; all fields present: ${complete}`,
    });
  }

  {
    const counts = { DIRECT: 0, CANDIDATE: 0, LINGUISTIC_PROXIMITY: 0, NO_CURRENT_OVERLAP: 0 };
    for (const [a, b] of allPairs()) counts[crossMapState(a, b)] += 1;
    const exact =
      counts.DIRECT === 3 &&
      counts.CANDIDATE === 7 &&
      counts.LINGUISTIC_PROXIMITY === 1 &&
      counts.NO_CURRENT_OVERLAP === 25 &&
      crossMapState(2, 5) === "DIRECT" &&
      crossMapState(5, 2) === "DIRECT" &&
      crossMapState(5, 7) === "LINGUISTIC_PROXIMITY" &&
      crossMapState(1, 9) === "NO_CURRENT_OVERLAP";
    push({
      id: "v2-data-2",
      name: "Locked CrossMap is complete and unordered",
      category: "v2-data",
      intent: "3 DIRECT, 7 CANDIDATE, 1 LINGUISTIC_PROXIMITY, all remaining pairs NO_CURRENT_OVERLAP.",
      passed: exact,
      observed: JSON.stringify(counts),
    });
  }

  /* ---- Multi-territory evidence ---------------------------------- */
  {
    const s = st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one");
    const a = analyzeV2({ runId: RUN, statements: [s] });
    const occ2 = a.occupancy.find((o) => o.territory === 2)!;
    const occ5 = a.occupancy.find((o) => o.territory === 5)!;
    const distinct = new Set([...occ2.statementIds, ...occ5.statementIds]).size;
    push({
      id: "v2-multi-1",
      name: "One evidence statement occupies multiple territories without duplication",
      category: "multi-territory",
      intent: "Multi-territory location must not clone the evidence item.",
      passed:
        occ2.statementIds.includes("s1") && occ5.statementIds.includes("s1") && distinct === 1,
      observed: `territory 2 → ${occ2.statementIds.join(",")}; territory 5 → ${occ5.statementIds.join(",")}; distinct statements ${distinct}`,
    });
  }

  /* ---- Redundancy vs overlap ------------------------------------- */
  {
    const base = [
      st("s1", [7], "p1", "stayed with the dying prototype for eleven months"),
      st("s2", [7], "p1", "remained with that dying prototype eleven months"),
    ];
    const a = analyzeV2({ runId: RUN, statements: base });
    const occ7 = a.occupancy.find((o) => o.territory === 7)!;

    const overlap = [st("s3", [3, 6], "p2", "reconciled the two teams into one working rhythm")];
    const b = analyzeV2({ runId: RUN, statements: overlap });
    const o3 = b.occupancy.find((o) => o.territory === 3)!;
    const o6 = b.occupancy.find((o) => o.territory === 6)!;

    push({
      id: "v2-redundancy-1",
      name: "Redundancy collapses; overlap is preserved as information",
      category: "redundancy-vs-overlap",
      intent:
        "Restating one claim collapses to a single semantic key, while one statement in two territories survives in both.",
      passed:
        occ7.distinctSemanticKeys.length === 1 &&
        occ7.redundancyCollapsed === 1 &&
        o3.statementIds.length === 1 &&
        o6.statementIds.length === 1,
      observed: `territory 7 keys ${occ7.distinctSemanticKeys.length}, collapsed ${occ7.redundancyCollapsed}; overlap kept in territories 3 and 6`,
    });
  }

  /* ---- Linguistic proximity --------------------------------------- */
  {
    const located = [
      st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one"),
      st("s2", [2, 5], "p2", "drew a boundary across the split team and kept it"),
    ];
    const withEcho = [
      ...located,
      // Vocabulary of 5 and 7 verbatim, but located nowhere.
      st("s3", [], "p3", "discipline and persistence are words I use about myself", "direct_claim", 1),
    ];
    const a = analyzeV2({ runId: RUN, statements: located });
    const b = analyzeV2({ runId: RUN, statements: withEcho });

    const echoes = vocabularyEchoes("discipline and persistence are words I use about myself");
    const rel57a = a.relationships.find((r) => r.key === "5-7")!;
    const rel57b = b.relationships.find((r) => r.key === "5-7")!;
    const sameRelationships =
      JSON.stringify(a.relationships) === JSON.stringify(b.relationships);
    const sameOutcome =
      a.outcome === b.outcome &&
      a.possibleNumber === b.possibleNumber &&
      (a.resolution?.scores.find((s) => s.question === 5)?.weight ?? 0) ===
        (b.resolution?.scores.find((s) => s.question === 5)?.weight ?? 0);

    push({
      id: "v2-proximity-1",
      name: "Vocabulary similarity never becomes a location, an intersection, or resolution weight",
      category: "linguistic-proximity",
      intent:
        "A statement echoing locked vocabulary but located nowhere must leave relationships and scoring unchanged.",
      passed:
        echoes.includes(5) &&
        echoes.includes(7) &&
        rel57a.state === "linguistic_proximity" &&
        rel57b.state === "linguistic_proximity" &&
        !rel57b.earned &&
        sameRelationships &&
        sameOutcome,
      observed: `echoes ${echoes.join(",")}; 5↔7 state ${rel57b.state}, earned ${rel57b.earned}; outcome unchanged ${sameOutcome}`,
    });
  }

  /* ---- Earned intersections --------------------------------------- */
  {
    const thin = analyzeV2({
      runId: RUN,
      statements: [st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one")],
    });
    const rich = analyzeV2({
      runId: RUN,
      statements: [
        st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one"),
        st("s2", [2, 5], "p2", "drew a boundary across the split team and kept it"),
      ],
    });
    const thin25 = thin.relationships.find((r) => r.key === "2-5")!;
    const rich25 = rich.relationships.find((r) => r.key === "2-5")!;
    push({
      id: "v2-intersection-1",
      name: "One evidence statement located in both territories earns the intersection",
      category: "earned-intersection",
      intent:
        "Locked V2: a response earns an intersection when it demonstrates both meanings. One statement may support multiple territories; independent probes are recorded as corroboration, not required.",
      passed:
        thin25.state === "evidence_supported_intersection" &&
        thin25.earned &&
        thin25.sharedStatementIds.join(",") === "s1" &&
        thin25.sharedProbes.length === 1 &&
        rich25.state === "evidence_supported_intersection" &&
        rich25.earned &&
        rich25.sharedProbes.length === 2,
      observed: `one statement → ${thin25.state} on evidence ${thin25.sharedStatementIds.join(",")}; corroboration recorded: ${rich25.sharedProbes.length} probe(s)`,
    });
  }

  {
    const withNoEvidence = analyzeV2({ runId: RUN, statements: [] });
    const rel25 = withNoEvidence.relationships.find((r) => r.key === "2-5")!;
    push({
      id: "v2-intersection-4",
      name: "A locked DIRECT CrossMap entry alone never earns an intersection",
      category: "earned-intersection",
      intent:
        "Removing the probe gate must not let the CrossMap itself create intersections; with no shared evidence the pair stays candidate.",
      passed: rel25.state === "candidate_relationship" && !rel25.earned && rel25.sharedStatementIds.length === 0,
      observed: `no evidence → state ${rel25.state}, earned ${rel25.earned}`,
    });
  }

  {
    const a = analyzeV2({
      runId: RUN,
      statements: [
        st("s1", [1, 9], "p1", "named the project on the day I delivered the first working copy"),
        st("s2", [1, 9], "p2", "opened the new room by finishing the old one"),
      ],
    });
    const r19 = a.relationships.find((r) => r.key === "1-9")!;
    push({
      id: "v2-intersection-2",
      name: "Evidence on a NO_CURRENT_OVERLAP pair is flagged, never silently mapped",
      category: "earned-intersection",
      intent: "The locked CrossMap is not rewritten by evidence; the discrepancy is surfaced.",
      passed:
        r19.crossMap === "NO_CURRENT_OVERLAP" &&
        r19.flags.includes("unmapped_evidence_overlap") &&
        a.flags.length > 0,
      observed: `crossMap ${r19.crossMap}; flags ${r19.flags.join(",")}; analysis flags ${a.flags.length}`,
    });
  }

  {
    const a = analyzeV2({
      runId: RUN,
      statements: [
        st("s1", [3, 6], "p1", "reconciled the two teams into one working rhythm"),
        st("s2", [3, 6], "p2", "abandoned the joint rhythm the moment it cost me", "contradiction", 0.9),
      ],
    });
    const r36 = a.relationships.find((r) => r.key === "3-6")!;
    push({
      id: "v2-intersection-3",
      name: "Contradicting shared evidence is retained on the relationship",
      category: "earned-intersection",
      intent:
        "Contradictions are information: recorded on the pair, never discarded, even when other supporting evidence earns the intersection.",
      passed:
        r36.contradictingStatementIds.includes("s2") &&
        r36.earned &&
        r36.sharedStatementIds.includes("s1"),
      observed: `state ${r36.state}; contradictions ${r36.contradictingStatementIds.join(",")}; earned ${r36.earned} on ${r36.sharedStatementIds.join(",")}`,
    });
  }

  /* ---- Unknown vs Undetermined ------------------------------------- */
  {
    const none = analyzeV2({ runId: RUN, statements: [] });
    const thin = analyzeV2({
      runId: RUN,
      statements: [st("s1", [9], "p1", "I always finish what I begin", "direct_claim", 1)],
    });
    push({
      id: "v2-unknown-1",
      name: "Unknown and Undetermined are distinct valid outcomes",
      category: "unknown-undetermined",
      intent: "No evidence returns Unknown; insufficient convergence returns Undetermined.",
      passed:
        none.outcome === "unknown" &&
        none.resolution === null &&
        thin.outcome === "undetermined" &&
        thin.possibleNumber === null,
      observed: `no evidence → ${none.outcome}; thin evidence → ${thin.outcome}`,
    });
  }

  /* ---- Provenance --------------------------------------------------- */
  {
    const a = analyzeV2({
      runId: RUN,
      statements: [
        st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one"),
        st("s2", [2, 5], "p2", "drew a boundary across the split team and kept it"),
        st("foreign", [2, 5], "p3", "another run entirely", "behavioral_instance", 0.9, "run-b"),
      ],
    });
    const r25 = a.relationships.find((r) => r.key === "2-5")!;
    push({
      id: "v2-provenance-1",
      name: "Statements from another run are excluded, never merged",
      category: "provenance",
      intent: "Run isolation: only the current run's evidence may reach location or relationship layers.",
      passed:
        a.excludedStatementIds.includes("foreign") &&
        !r25.sharedStatementIds.includes("foreign") &&
        a.occupancy.every((o) => !o.statementIds.includes("foreign")),
      observed: `excluded ${a.excludedStatementIds.join(",")}; 2↔5 evidence ${r25.sharedStatementIds.join(",")}`,
    });
  }

  /* ---- Traceability and feedback protection -------------------------- */
  {
    const statements = [
      st("s1", [2, 5], "p1", "held the line between the two offers and refused the louder one"),
      st("s2", [2, 5], "p2", "drew a boundary across the split team and kept it"),
    ];
    const plain = analyzeV2({ runId: RUN, statements });
    const hinted = analyzeV2({ runId: RUN, statements, hypothesis: 9 });
    const traced =
      Object.keys(plain.traceability).length > 0 &&
      plain.earnedIntersections.every((r) => r.sharedStatementIds.length > 0 && r.trace.length > 0) &&
      plain.venn.cells.every((c) => c.evidenceStatementIds.length > 0) &&
      plain.venn.scoringAuthority === false;
    const noFeedback =
      JSON.stringify(plain.occupancy) === JSON.stringify(hinted.occupancy) &&
      JSON.stringify(plain.relationships) === JSON.stringify(hinted.relationships) &&
      plain.outcome === hinted.outcome &&
      plain.possibleNumber === hinted.possibleNumber;
    push({
      id: "v2-trace-1",
      name: "Every conclusion traces to evidence, and a Number never feeds backward",
      category: "traceability",
      intent:
        "Location, relationship and Venn cells carry evidence ids; a self-reported Number changes none of them.",
      passed: traced && noFeedback,
      observed: `${Object.keys(plain.traceability).length} traced conclusions; hypothesis 9 changed nothing: ${noFeedback}`,
    });
  }

  return out;
}

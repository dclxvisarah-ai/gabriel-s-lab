/**
 * GABRIEL'S LAB — RESEARCH ONLY. Locked V2 reasoning pipeline.
 *
 * Order is architectural and one-directional:
 *   response -> evidence statement -> structural location(s)
 *            -> relationships / intersections -> possible Number
 *
 * A possible Number is computed LAST and is never fed backward into locations
 * or relationships. Vocabulary similarity and comparative references never
 * contribute to resolution or to Earned status.
 *
 * All numeric weights, thresholds, normalization and confidence math are reused
 * unchanged from the existing RESEARCH / UNVALIDATED engine.
 */

import { resolve, type EvidenceInput, type Resolution, type AvailabilityMap } from "../engine";
import { KIND_SPEC, normalizeToSemanticKey, type EvidenceKind } from "../taxonomy";
import type { StructuralQuestionId } from "../spec";
import {
  TERRITORY_BY_ID,
  TERRITORY_IDS,
  allPairs,
  crossMapState,
  pairKey,
  type CrossMapState,
  type PairKey,
  type TerritoryId,
} from "./territories";

/* ------------------------------------------------------------------ */
/* Evidence statements                                                  */
/* ------------------------------------------------------------------ */

/**
 * One evidence statement derived from one response. V2 replacement for the
 * older single-question evidence unit: a statement may legitimately occupy
 * MULTIPLE territories without being duplicated as separate evidence.
 */
export interface EvidenceStatement {
  id: string;
  /** Provenance. Statements from other runs are excluded, never merged. */
  runId: string;
  responseId: string;
  probeId: string;
  text: string;
  kind: EvidenceKind;
  strength: number;
  /** One or more structural locations. Empty means located nowhere yet. */
  locations: TerritoryId[];
}

export type RelationshipState =
  | "evidence_supported_intersection"
  | "candidate_relationship"
  | "linguistic_proximity"
  | "contradiction"
  | "no_current_overlap"
  | "unknown";

export interface PairRelationship {
  key: PairKey;
  a: TerritoryId;
  b: TerritoryId;
  crossMap: CrossMapState;
  state: RelationshipState;
  /** Statement ids located in BOTH territories. The only intersection currency. */
  sharedStatementIds: string[];
  /** Distinct semantic keys among shared qualifying statements. */
  sharedSemanticKeys: string[];
  /** Distinct probes among shared qualifying statements. */
  sharedProbes: string[];
  /** Shared statements whose kind is a contradiction. */
  contradictingStatementIds: string[];
  earned: boolean;
  flags: string[];
  trace: string[];
}

export interface TerritoryOccupancy {
  territory: TerritoryId;
  name: string;
  /** Distinct evidence statements located here (not duplicated per territory). */
  statementIds: string[];
  qualifyingStatementIds: string[];
  distinctSemanticKeys: string[];
  distinctProbes: string[];
  /** Redundant restatements collapsed within this territory. */
  redundancyCollapsed: number;
  /** Vocabulary/reference echoes only. Never contributes to resolution. */
  vocabularyEchoStatementIds: string[];
}

export interface VennCell {
  /** Territory ids forming this cell. Length 1 = own region, 2 = intersection. */
  members: TerritoryId[];
  evidenceStatementIds: string[];
  /** Only earned intersections are drawn as an overlap cell. */
  earned: boolean;
  crossMap: CrossMapState | null;
}

export interface VennModel {
  cells: VennCell[];
  scoringAuthority: false;
  note: string;
}

export type V2Outcome = "resolved" | "undetermined" | "unknown";

export interface V2Analysis {
  runId: string;
  /** Statements rejected for provenance mismatch. Never merged into the run. */
  excludedStatementIds: string[];
  occupancy: TerritoryOccupancy[];
  relationships: PairRelationship[];
  earnedIntersections: PairRelationship[];
  flags: string[];
  venn: VennModel;
  /** Possible Number, computed last from located evidence only. */
  outcome: V2Outcome;
  resolution: Resolution | null;
  possibleNumber: TerritoryId | null;
  /** Evidence ids supporting every reported conclusion. */
  traceability: Record<string, string[]>;
}

export interface V2Config {
  /** Distinct shared semantic keys required before an intersection is earned. */
  MIN_SHARED_SEMANTIC_KEYS: number;
  /** Distinct shared probes required before an intersection is earned. */
  MIN_SHARED_PROBES: number;
}

/** RESEARCH / UNVALIDATED. Intersection gates only; scoring math untouched. */
export const DEFAULT_V2_CONFIG: V2Config = {
  MIN_SHARED_SEMANTIC_KEYS: 1,
  MIN_SHARED_PROBES: 2,
};

/* ------------------------------------------------------------------ */
/* Vocabulary similarity — recorded, never scored                       */
/* ------------------------------------------------------------------ */

/**
 * Territories whose locked vocabulary appears in the statement text.
 * This is LINGUISTIC PROXIMITY ONLY. It never becomes a location, never
 * contributes weight, and never earns an intersection.
 */
export function vocabularyEchoes(text: string): TerritoryId[] {
  const hay = text.toLowerCase();
  return TERRITORY_IDS.filter((id) =>
    TERRITORY_BY_ID.get(id)!.vocabulary.some((v) => hay.includes(v.toLowerCase())),
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                             */
/* ------------------------------------------------------------------ */

function isQualifying(kind: EvidenceKind): boolean {
  return KIND_SPEC.get(kind)!.qualifying;
}

function isContradiction(kind: EvidenceKind): boolean {
  return kind === "contradiction";
}

export interface V2Input {
  runId: string;
  statements: EvidenceStatement[];
  availability?: AvailabilityMap;
  /** Self-report hypothesis. Never scored, never steers location. */
  hypothesis?: TerritoryId | null;
  config?: Partial<V2Config>;
}

export function analyzeV2(input: V2Input): V2Analysis {
  const config = { ...DEFAULT_V2_CONFIG, ...(input.config ?? {}) };

  /* Provenance / run isolation: foreign statements are excluded, not merged. */
  const excludedStatementIds = input.statements
    .filter((s) => s.runId !== input.runId)
    .map((s) => s.id);
  const statements = input.statements.filter((s) => s.runId === input.runId);

  const keyOf = new Map<string, string>();
  for (const s of statements) keyOf.set(s.id, normalizeToSemanticKey(s.text));

  /* ---- Structural location layer -------------------------------- */
  const occupancy: TerritoryOccupancy[] = TERRITORY_IDS.map((territory) => {
    const here = statements.filter((s) => s.locations.includes(territory));
    const qualifying = here.filter((s) => isQualifying(s.kind));
    const semanticKeys = Array.from(new Set(qualifying.map((s) => keyOf.get(s.id)!)));
    const probes = Array.from(new Set(qualifying.map((s) => s.probeId)));
    const collapsedGroups = new Set(here.map((s) => `${s.kind}::${keyOf.get(s.id)!}`)).size;
    const echoes = statements
      .filter((s) => !s.locations.includes(territory) && vocabularyEchoes(s.text).includes(territory))
      .map((s) => s.id);
    return {
      territory,
      name: TERRITORY_BY_ID.get(territory)!.name,
      statementIds: here.map((s) => s.id),
      qualifyingStatementIds: qualifying.map((s) => s.id),
      distinctSemanticKeys: semanticKeys,
      distinctProbes: probes,
      redundancyCollapsed: Math.max(0, here.length - collapsedGroups),
      vocabularyEchoStatementIds: echoes,
    };
  });

  /* ---- Relationship / intersection layer ------------------------- */
  const flags: string[] = [];
  const relationships: PairRelationship[] = allPairs().map(([a, b]) => {
    const cross = crossMapState(a, b);
    const shared = statements.filter(
      (s) => s.locations.includes(a) && s.locations.includes(b),
    );
    const contradicting = shared.filter((s) => isContradiction(s.kind));
    const supporting = shared.filter((s) => isQualifying(s.kind) && !isContradiction(s.kind));
    const sharedSemanticKeys = Array.from(new Set(supporting.map((s) => keyOf.get(s.id)!)));
    const sharedProbes = Array.from(new Set(supporting.map((s) => s.probeId)));

    const trace: string[] = [];
    const pairFlags: string[] = [];

    const meetsEvidenceGate =
      sharedSemanticKeys.length >= config.MIN_SHARED_SEMANTIC_KEYS &&
      sharedProbes.length >= config.MIN_SHARED_PROBES;

    let state: RelationshipState;
    let earned = false;

    if (contradicting.length > 0 && supporting.length === 0) {
      state = "contradiction";
      trace.push(
        `Shared evidence between ${a} and ${b} is contradictory: ${contradicting.map((s) => s.id).join(", ")}.`,
      );
    } else if (meetsEvidenceGate) {
      earned = true;
      state = "evidence_supported_intersection";
      trace.push(
        `Intersection earned by shared evidence ${supporting.map((s) => s.id).join(", ")} across ${sharedProbes.length} independent probe(s) and ${sharedSemanticKeys.length} distinct semantic key(s).`,
      );
      if (cross === "NO_CURRENT_OVERLAP") {
        pairFlags.push("unmapped_evidence_overlap");
        trace.push(
          `Locked CrossMap records NO_CURRENT_OVERLAP for ${a}↔${b}. The evidence is flagged for review; no CrossMap relationship is invented here.`,
        );
        flags.push(`Unmapped evidence overlap observed for ${a}↔${b}.`);
      }
      if (cross === "LINGUISTIC_PROXIMITY") {
        trace.push(
          `CrossMap for ${a}↔${b} is LINGUISTIC_PROXIMITY; the intersection rests on shared evidence, not on vocabulary similarity.`,
        );
      }
    } else if (cross === "DIRECT" || cross === "CANDIDATE") {
      state = "candidate_relationship";
      trace.push(
        shared.length === 0
          ? `CrossMap ${cross} for ${a}↔${b}; no shared evidence yet, so the relationship stays candidate.`
          : `CrossMap ${cross} for ${a}↔${b}; shared evidence ${shared.map((s) => s.id).join(", ")} is below the intersection gate (${config.MIN_SHARED_SEMANTIC_KEYS} semantic key(s), ${config.MIN_SHARED_PROBES} independent probe(s)).`,
      );
    } else if (cross === "LINGUISTIC_PROXIMITY") {
      state = "linguistic_proximity";
      trace.push(
        `Vocabulary of ${a} and ${b} is close. Vocabulary similarity alone establishes no intersection and contributes nothing to resolution.`,
      );
    } else if (shared.length > 0) {
      state = "unknown";
      trace.push(
        `Shared evidence ${shared.map((s) => s.id).join(", ")} exists for an unmapped pair but does not meet the intersection gate. Recorded as unknown, not as an overlap.`,
      );
    } else {
      state = "no_current_overlap";
      trace.push(`No CrossMap entry and no shared evidence for ${a}↔${b}.`);
    }

    return {
      key: pairKey(a, b),
      a,
      b,
      crossMap: cross,
      state,
      sharedStatementIds: shared.map((s) => s.id),
      sharedSemanticKeys,
      sharedProbes,
      contradictingStatementIds: contradicting.map((s) => s.id),
      earned,
      flags: pairFlags,
      trace,
    };
  });

  const earnedIntersections = relationships.filter((r) => r.earned);

  /* ---- Derived Venn / bubble / compass representation ------------- */
  const venn: VennModel = {
    cells: [
      ...occupancy
        .filter((o) => o.statementIds.length > 0)
        .map<VennCell>((o) => ({
          members: [o.territory],
          evidenceStatementIds: o.statementIds,
          earned: false,
          crossMap: null,
        })),
      ...earnedIntersections.map<VennCell>((r) => ({
        members: [r.a, r.b],
        evidenceStatementIds: r.sharedStatementIds,
        earned: true,
        crossMap: r.crossMap,
      })),
    ],
    scoringAuthority: false,
    note: "Derived representation of relationship/cell data only. Visual adjacency, ordering and geometry carry no structural meaning and no scoring authority.",
  };

  /* ---- Possible Number — computed LAST ---------------------------- */
  const engineEvidence: EvidenceInput[] = statements.flatMap((s) =>
    s.locations.map((territory) => ({
      id: `${s.id}@${territory}`,
      responseId: s.responseId,
      probeId: s.probeId,
      question: territory as StructuralQuestionId,
      kind: s.kind,
      strength: s.strength,
      text: s.text,
    })),
  );

  let outcome: V2Outcome;
  let resolution: Resolution | null = null;
  let possibleNumber: TerritoryId | null = null;

  if (engineEvidence.length === 0) {
    outcome = "unknown";
  } else {
    resolution = resolve({
      evidence: engineEvidence,
      availability: input.availability,
      hypothesis: (input.hypothesis ?? null) as StructuralQuestionId | null,
    });
    outcome = resolution.status === "resolved" ? "resolved" : "undetermined";
    possibleNumber = (resolution.primary ?? null) as TerritoryId | null;
  }

  /* ---- Traceability ------------------------------------------------ */
  const traceability: Record<string, string[]> = {};
  for (const o of occupancy) {
    if (o.statementIds.length > 0) traceability[`territory:${o.territory}`] = o.statementIds;
  }
  for (const r of relationships) {
    if (r.sharedStatementIds.length > 0) traceability[`pair:${r.key}`] = r.sharedStatementIds;
  }
  if (possibleNumber !== null) {
    traceability[`possible_number:${possibleNumber}`] =
      occupancy.find((o) => o.territory === possibleNumber)?.statementIds ?? [];
  }

  return {
    runId: input.runId,
    excludedStatementIds,
    occupancy,
    relationships,
    earnedIntersections,
    flags,
    venn,
    outcome,
    resolution,
    possibleNumber,
    traceability,
  };
}

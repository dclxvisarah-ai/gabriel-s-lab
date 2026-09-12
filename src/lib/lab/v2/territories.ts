/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 * LOCKED EXPANDED V2 TERRITORY DATA (transcribed from the verified workbook).
 *
 * V2 creates NO additional Numbers. It expands the semantic architecture of the
 * existing nine. Reference systems below are COMPARATIVE ONLY: they are never
 * empirical proof, never scoring authority, and never establish an intersection.
 */

export type TerritoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Territory {
  id: TerritoryId;
  /** Territory name in locked V2 vocabulary. Not user-facing question copy. */
  name: string;
  /** Locked expanded semantic vocabulary. */
  vocabulary: string[];
  /** Locked semantic distinction — what this territory is NOT. */
  distinction: string;
  /** Comparative references only. No structural or scoring authority. */
  references: string[];
}

export const V2_TERRITORIES: Territory[] = [
  {
    id: 1,
    name: "Beginning",
    vocabulary: ["unity", "source", "origin", "emergence"],
    distinction: "emergence vs later differentiation/recurrence",
    references: ["Monad/One (comparative only)", "Keter (comparative only)"],
  },
  {
    id: 2,
    name: "Duality",
    vocabulary: ["diversity", "duality", "differentiation", "polarity", "two meaningful elements"],
    distinction: "meaningful duality vs mere pair; duality vs pattern",
    references: ["Dyad (comparative only)", "Chokhmah (comparative only)"],
  },
  {
    id: 3,
    name: "Pattern",
    vocabulary: ["relationship", "harmony", "mediation", "reconciliation"],
    distinction: "recognizable relationship/configuration vs mere recurrence",
    references: ["Triad (comparative only)", "Binah (comparative only)"],
  },
  {
    id: 4,
    name: "Structure",
    vocabulary: ["fourness", "organization", "form", "manifestation", "stability", "Tetractys"],
    distinction: "pattern vs organized/stable structure",
    references: ["Tetrad (comparative only)", "Hesed/Chesed (comparative only)"],
  },
  {
    id: 5,
    name: "Discernment",
    vocabulary: [
      "balance",
      "boundary",
      "discrimination",
      "restraint",
      "discipline",
      "strength",
      "judgment",
      "differentiation",
    ],
    distinction: "meaningful discrimination vs mere conflict/pairing",
    references: ["Pentad (comparative only)", "Gevurah (comparative only)"],
  },
  {
    id: 6,
    name: "Integration",
    vocabulary: ["harmony", "wholeness", "coherence", "integration", "Beauty", "perfect number"],
    distinction: "separate elements functioning coherently together",
    references: ["Hexad (comparative only)", "Tiferet (comparative only)"],
  },
  {
    id: 7,
    name: "Staying",
    vocabulary: ["persistence", "endurance"],
    distinction: "persistence vs repetition/compulsion/continuing",
    references: ["Heptad (comparative only)", "Netzach (comparative only)"],
  },
  {
    id: 8,
    name: "Listening",
    vocabulary: ["receptive processing", "listening", "cube", "2^3"],
    distinction: "receiving/processing vs passivity/indecision",
    references: ["Octad (comparative only)", "Hod (comparative only)"],
  },
  {
    id: 9,
    name: "Completion",
    vocabulary: ["completion", "foundation", "integration"],
    distinction: "completion/carry-forward within Gabriel's 1–9 psychological space",
    references: ["Ennead (comparative only)", "Yesod/Malkhut comparison, not identity"],
  },
];

export const TERRITORY_BY_ID = new Map<TerritoryId, Territory>(
  V2_TERRITORIES.map((t) => [t.id, t]),
);

export const TERRITORY_IDS: TerritoryId[] = V2_TERRITORIES.map((t) => t.id);

/* ------------------------------------------------------------------ */
/* Locked CrossMap                                                      */
/* ------------------------------------------------------------------ */

export type CrossMapState =
  | "DIRECT"
  | "CANDIDATE"
  | "LINGUISTIC_PROXIMITY"
  | "NO_CURRENT_OVERLAP";

export type PairKey = `${TerritoryId}-${TerritoryId}`;

export function pairKey(a: TerritoryId, b: TerritoryId): PairKey {
  return (a <= b ? `${a}-${b}` : `${b}-${a}`) as PairKey;
}

const DIRECT_PAIRS: [TerritoryId, TerritoryId][] = [
  [2, 5],
  [3, 6],
  [6, 9],
];

const CANDIDATE_PAIRS: [TerritoryId, TerritoryId][] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 6],
  [5, 6],
  [7, 9],
  [8, 9],
];

const PROXIMITY_PAIRS: [TerritoryId, TerritoryId][] = [[5, 7]];

const CROSS_MAP = new Map<PairKey, CrossMapState>();
for (const [a, b] of DIRECT_PAIRS) CROSS_MAP.set(pairKey(a, b), "DIRECT");
for (const [a, b] of CANDIDATE_PAIRS) CROSS_MAP.set(pairKey(a, b), "CANDIDATE");
for (const [a, b] of PROXIMITY_PAIRS) CROSS_MAP.set(pairKey(a, b), "LINGUISTIC_PROXIMITY");

/** Locked CrossMap lookup. Every unmapped unordered pair is NO_CURRENT_OVERLAP. */
export function crossMapState(a: TerritoryId, b: TerritoryId): CrossMapState {
  if (a === b) return "NO_CURRENT_OVERLAP";
  return CROSS_MAP.get(pairKey(a, b)) ?? "NO_CURRENT_OVERLAP";
}

export function allPairs(): [TerritoryId, TerritoryId][] {
  const out: [TerritoryId, TerritoryId][] = [];
  for (let i = 0; i < TERRITORY_IDS.length; i++) {
    for (let j = i + 1; j < TERRITORY_IDS.length; j++) {
      out.push([TERRITORY_IDS[i]!, TERRITORY_IDS[j]!]);
    }
  }
  return out;
}

export const V2_STATUS = {
  locked: true,
  note: "Expanded V2 territory data and CrossMap are locked architecture. Numeric weights, thresholds, normalization, confidence math and stopping rules remain RESEARCH / UNVALIDATED and are unchanged by V2.",
} as const;

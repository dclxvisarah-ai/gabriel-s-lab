/**
 * RESEARCH / PROTOTYPE ONLY.
 * Gabriel's Number — Structural Research Lab.
 * This module contains research-language definitions. It is NOT production copy,
 * NOT a production formula, and contains no domain/vertical-specific logic.
 */

export const LAB_STATUS = {
  label: "Research / Prototype",
  warning:
    "Research laboratory. Not the production app. Nothing here may be applied to a production branch.",
} as const;

export type StructuralQuestionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StructuralQuestion {
  id: StructuralQuestionId;
  /** Research label. Never user-facing question copy. */
  label: string;
  /** What structural signature the lab is trying to detect. */
  signature: string;
  /** Common confusions this position collides with. */
  collidesWith: StructuralQuestionId[];
}

export const STRUCTURAL_QUESTIONS: StructuralQuestion[] = [
  {
    id: 1,
    label: "Beginning / Identification",
    signature:
      "Initiation of a distinction; naming the thing; the move from undifferentiated field to a first marked point.",
    collidesWith: [5, 7],
  },
  {
    id: 2,
    label: "Duality / Differentiation",
    signature:
      "Holding two poles at once; separating a field into contrasting halves; tension as a working medium.",
    collidesWith: [5, 3],
  },
  {
    id: 3,
    label: "Pattern / Relationship",
    signature:
      "Detecting recurrence across instances; relating elements to each other rather than to a standard.",
    collidesWith: [4, 5],
  },
  {
    id: 4,
    label: "Structure / Organization",
    signature:
      "Building or maintaining containers, order, sequence, and load-bearing arrangement.",
    collidesWith: [3, 7],
  },
  {
    id: 5,
    label: "Discernment",
    signature:
      "Evaluative separation against a criterion; choosing, filtering, judging quality or fit.",
    collidesWith: [2, 3],
  },
  {
    id: 6,
    label: "Integration",
    signature:
      "Bringing disparate parts into a coherent whole; reconciling rather than selecting.",
    collidesWith: [4, 9],
  },
  {
    id: 7,
    label: "Staying / Persistence / Endurance / Sustained attention",
    signature:
      "Remaining present under duration, friction, or boredom; the refusal to leave the field.",
    collidesWith: [4, 9],
  },
  {
    id: 8,
    label: "Listening / Receiving / Recognition",
    signature:
      "Reception before action; letting the other or the material declare itself; being changed by input.",
    collidesWith: [6, 5],
  },
  {
    id: 9,
    label: "Embodiment / Completion",
    signature:
      "Bringing into material form; finishing; the structure becoming the person or the artifact.",
    collidesWith: [6, 7],
  },
];

export const QUESTION_BY_ID = new Map<StructuralQuestionId, StructuralQuestion>(
  STRUCTURAL_QUESTIONS.map((q) => [q.id, q]),
);

export const NON_SEQUENTIAL_NOTE =
  "1–9 are position identifiers, not a sequence, ranking, or developmental ladder. No ordering, adjacency, or magnitude relationship may be inferred from the integers.";

export interface Principle {
  id: string;
  title: string;
  body: string;
}

export const RESEARCH_PRINCIPLES: Principle[] = [
  {
    id: "self-report",
    title: "Self-report is a hypothesis, never a conclusion",
    body: "A stated or suspected number enters the lab as a prior to be tested, and carries zero scoring weight. The engine must be able to contradict it, and must report hypothesis and earned result side by side.",
  },
  {
    id: "no-number-answer",
    title: "The participant never answers a number",
    body: "No item asks which position someone is. Responses are about lived structure. Position assignment is an inference of the engine, not a selection of the participant.",
  },
  {
    id: "responses-generate-evidence",
    title: "Responses generate evidence",
    body: "A response is raw material. It is parsed into zero or more evidence units. A response with no structural content generates nothing, and that is a legitimate outcome.",
  },
  {
    id: "three-layers",
    title: "Evidence, qualification, and confidence are distinct",
    body: "Evidence is what was observed. Qualification is whether the observations are of a kind and breadth that permit an assignment at all. Confidence is how strongly the assignment is held. A high score with failed qualification does not resolve.",
  },
  {
    id: "redundancy",
    title: "Semantic redundancy is one evidence unit",
    body: "Restating the same structural claim in new words does not accumulate. Units collapse on a semantic key; the collapsed unit takes the strongest instance, not the sum.",
  },
  {
    id: "corroboration",
    title: "Independent corroboration is distinct from repetition",
    body: "Corroboration requires a different semantic key reached through a different probe. Only independence widens the base; repetition only deepens one unit.",
  },
  {
    id: "contradiction",
    title: "Contradictions are information",
    body: "A contradiction is recorded as evidence, not discarded as noise. It reduces confidence, can disqualify a position, and can itself be the strongest signal about structure.",
  },
  {
    id: "multi-support",
    title: "One response may support multiple structural questions",
    body: "Evidence is not partitioned exclusively. A single response can produce units for several positions, which is precisely why collision handling and lead thresholds matter.",
  },
  {
    id: "earned",
    title: "Coordinates are earned structurally, not by highest raw score",
    body: "The top-scoring position does not win by default. It must clear an absolute floor, clear a lead over its nearest rival, pass qualification, and survive its collision set.",
  },
  {
    id: "undetermined",
    title: "Undetermined is a valid result",
    body: "Insufficient convergence returns Undetermined. This is a correct answer, not a failure state, and must be presentable as such.",
  },
  {
    id: "adaptive",
    title: "Probing is adaptive and must stop",
    body: "Probe selection targets the current ambiguity. Probing stops when sufficient evidence has been earned, or when further questions are unlikely to add information.",
  },
  {
    id: "scope",
    title: "Scope: smallest useful structural engine",
    body: "The goal is the minimum structural machinery that can later be applied selectively to the branches that need it — especially open-ended branches such as spiraling — not a universal replacement for existing branch logic.",
  },
];

/** Production baseline, recorded here read-only for comparison. Never edited by the lab. */
export const PRODUCTION_BASELINE = {
  note: "Untouched production scoring baseline, mirrored for reference only.",
  formula: "W_n = Raw_n / sqrt(max(Available_n, 1)) * 2",
  MIN_PRIMARY_WEIGHT: 2.4,
  MIN_LEAD: 0.35,
  MIN_SUPPORT_WEIGHT: 1.8,
  fallback: "insufficient convergence -> Undetermined",
} as const;

/**
 * RESEARCH / PROTOTYPE ONLY — structural resolution engine sandbox.
 * Not a production formula. No domain-specific logic. Deterministic and pure.
 */

import {
  KIND_SPEC,
  normalizeToSemanticKey,
  type EvidenceKind,
} from "./taxonomy";
import {
  PRODUCTION_BASELINE,
  QUESTION_BY_ID,
  STRUCTURAL_QUESTIONS,
  type StructuralQuestionId,
} from "./spec";

/** A raw observation extracted from one response. */
export interface EvidenceInput {
  id: string;
  /** Which response produced it. Multiple units may share a response. */
  responseId: string;
  /** Which probe elicited the response. Independence is measured on this. */
  probeId: string;
  question: StructuralQuestionId;
  kind: EvidenceKind;
  /** Observed intensity of the unit before kind weighting, 0..1. */
  strength: number;
  /** Verbatim-ish research text used for semantic normalization. */
  text: string;
}

export interface CollapsedUnit {
  semanticKey: string;
  question: StructuralQuestionId;
  kind: EvidenceKind;
  strength: number;
  probes: string[];
  responses: string[];
  /** How many raw inputs folded into this unit. */
  absorbed: number;
  contribution: number;
}

export interface QuestionScore {
  question: StructuralQuestionId;
  label: string;
  /** Distinct semantic units after redundancy collapse. */
  units: CollapsedUnit[];
  raw: number;
  available: number;
  weight: number;
  /** Independent corroboration: distinct semantic keys reached via distinct probes. */
  corroboration: number;
  contradictionMass: number;
  qualified: boolean;
  qualificationNotes: string[];
  confidence: number;
}

export type ResolutionStatus = "resolved" | "undetermined";

export interface Resolution {
  status: ResolutionStatus;
  primary: StructuralQuestionId | null;
  support: StructuralQuestionId | null;
  lead: number;
  reasons: string[];
  scores: QuestionScore[];
  hypothesis: StructuralQuestionId | null;
  hypothesisAgrees: boolean | null;
  confidence: number;
  redundancyCollapsed: number;
}

export interface EngineConfig {
  MIN_PRIMARY_WEIGHT: number;
  MIN_LEAD: number;
  MIN_SUPPORT_WEIGHT: number;
  /** Distinct qualifying semantic units required before a position may resolve. */
  MIN_QUALIFYING_UNITS: number;
  /** Distinct probes required before a position may resolve. */
  MIN_INDEPENDENT_PROBES: number;
  /** Contradiction mass above which a position is disqualified outright. */
  MAX_CONTRADICTION_MASS: number;
}

/** Mirrors the production baseline thresholds; the extra gates are lab-only. */
export const DEFAULT_CONFIG: EngineConfig = {
  MIN_PRIMARY_WEIGHT: PRODUCTION_BASELINE.MIN_PRIMARY_WEIGHT,
  MIN_LEAD: PRODUCTION_BASELINE.MIN_LEAD,
  MIN_SUPPORT_WEIGHT: PRODUCTION_BASELINE.MIN_SUPPORT_WEIGHT,
  MIN_QUALIFYING_UNITS: 2,
  MIN_INDEPENDENT_PROBES: 2,
  MAX_CONTRADICTION_MASS: 1.2,
};

/** Availability: probes that were actually capable of surfacing this position. */
export type AvailabilityMap = Partial<Record<StructuralQuestionId, number>>;

function collapse(inputs: EvidenceInput[]): CollapsedUnit[] {
  const byKey = new Map<string, CollapsedUnit>();
  for (const e of inputs) {
    const semanticKey = normalizeToSemanticKey(e.text);
    // Redundancy is scoped to position + kind + semantic key.
    const key = `${e.question}::${e.kind}::${semanticKey}`;
    const spec = KIND_SPEC.get(e.kind)!;
    const strength = Math.max(0, Math.min(1, e.strength));
    const existing = byKey.get(key);
    if (existing) {
      // Restatement deepens, never accumulates: take the strongest instance.
      existing.strength = Math.max(existing.strength, strength);
      existing.absorbed += 1;
      if (!existing.probes.includes(e.probeId)) existing.probes.push(e.probeId);
      if (!existing.responses.includes(e.responseId)) existing.responses.push(e.responseId);
      existing.contribution = existing.strength * spec.weight * spec.polarity;
    } else {
      byKey.set(key, {
        semanticKey,
        question: e.question,
        kind: e.kind,
        strength,
        probes: [e.probeId],
        responses: [e.responseId],
        absorbed: 1,
        contribution: strength * spec.weight * spec.polarity,
      });
    }
  }
  return Array.from(byKey.values());
}

function scoreQuestion(
  question: StructuralQuestionId,
  units: CollapsedUnit[],
  availability: AvailabilityMap,
  config: EngineConfig,
): QuestionScore {
  const positive = units.filter((u) => u.contribution > 0);
  const negative = units.filter((u) => u.contribution < 0);

  const rawPositive = positive.reduce((s, u) => s + u.contribution, 0);
  const contradictionMass = negative.reduce((s, u) => s + Math.abs(u.contribution), 0);
  const raw = Math.max(0, rawPositive - contradictionMass);

  const available = Math.max(availability[question] ?? units.length, 1);
  // Production baseline shape, preserved verbatim.
  const weight = (raw / Math.sqrt(Math.max(available, 1))) * 2;

  const qualifyingUnits = positive.filter((u) => KIND_SPEC.get(u.kind)!.qualifying);
  const distinctProbes = new Set(qualifyingUnits.flatMap((u) => u.probes)).size;
  const distinctKeys = new Set(qualifyingUnits.map((u) => u.semanticKey)).size;

  // Corroboration counts only units that are semantically distinct AND probe-distinct.
  const seenProbes = new Set<string>();
  let corroboration = 0;
  for (const u of qualifyingUnits.slice().sort((a, b) => b.strength - a.strength)) {
    const fresh = u.probes.some((p) => !seenProbes.has(p));
    if (fresh) {
      corroboration += 1;
      u.probes.forEach((p) => seenProbes.add(p));
    }
  }

  const notes: string[] = [];
  if (distinctKeys < config.MIN_QUALIFYING_UNITS)
    notes.push(
      `only ${distinctKeys} distinct qualifying unit(s); needs ${config.MIN_QUALIFYING_UNITS}`,
    );
  if (distinctProbes < config.MIN_INDEPENDENT_PROBES)
    notes.push(
      `only ${distinctProbes} independent probe(s); needs ${config.MIN_INDEPENDENT_PROBES}`,
    );
  if (contradictionMass > config.MAX_CONTRADICTION_MASS)
    notes.push(`contradiction mass ${contradictionMass.toFixed(2)} exceeds tolerance`);

  const qualified = notes.length === 0;

  // Confidence is a separate axis: breadth and cleanliness, not magnitude.
  const breadth = 1 - Math.exp(-corroboration / 2);
  const cleanliness = 1 / (1 + contradictionMass);
  const coverage = Math.min(1, qualifyingUnits.length / Math.max(available, 1));
  const confidence = qualified
    ? Math.round(breadth * cleanliness * (0.6 + 0.4 * coverage) * 100) / 100
    : 0;

  return {
    question,
    label: QUESTION_BY_ID.get(question)!.label,
    units,
    raw: Math.round(raw * 1000) / 1000,
    available,
    weight: Math.round(weight * 1000) / 1000,
    corroboration,
    contradictionMass: Math.round(contradictionMass * 1000) / 1000,
    qualified,
    qualificationNotes: notes,
    confidence,
  };
}

export interface EngineInput {
  evidence: EvidenceInput[];
  availability?: AvailabilityMap;
  /** Starting hypothesis from self-report. Never scored. */
  hypothesis?: StructuralQuestionId | null;
  config?: Partial<EngineConfig>;
}

export function resolve(input: EngineInput): Resolution {
  const config = { ...DEFAULT_CONFIG, ...(input.config ?? {}) };
  const all = collapse(input.evidence);
  const redundancyCollapsed = input.evidence.length - all.length;

  const scores = STRUCTURAL_QUESTIONS.map((q) =>
    scoreQuestion(
      q.id,
      all.filter((u) => u.question === q.id),
      input.availability ?? {},
      config,
    ),
  );

  // Order-invariance: rank by weight, tie-break deterministically on
  // corroboration, then contradiction cleanliness, then id — never input order.
  const ranked = scores
    .slice()
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        b.corroboration - a.corroboration ||
        a.contradictionMass - b.contradictionMass ||
        a.question - b.question,
    );

  const top = ranked[0];
  const second = ranked[1];
  const lead = Math.round(((top?.weight ?? 0) - (second?.weight ?? 0)) * 1000) / 1000;
  const reasons: string[] = [];

  if (!top || top.weight === 0) {
    reasons.push("No positive evidence mass on any structural position.");
    return undetermined(scores, lead, reasons, input.hypothesis ?? null, redundancyCollapsed);
  }
  if (top.weight < config.MIN_PRIMARY_WEIGHT) {
    reasons.push(
      `Top position ${top.question} weight ${top.weight} below MIN_PRIMARY_WEIGHT ${config.MIN_PRIMARY_WEIGHT}.`,
    );
  }
  if (lead < config.MIN_LEAD) {
    reasons.push(
      `Lead ${lead} over position ${second?.question} below MIN_LEAD ${config.MIN_LEAD}. Positions are not separated.`,
    );
  }
  if (!top.qualified) {
    reasons.push(`Qualification failed for position ${top.question}: ${top.qualificationNotes.join("; ")}.`);
  }

  // Collision guard: a near-tied member of the top position's collision set
  // means the distinction has not actually been earned.
  const collisions = QUESTION_BY_ID.get(top.question)!.collidesWith;
  const collided = ranked
    .slice(1)
    .filter((s) => collisions.includes(s.question) && top.weight - s.weight < config.MIN_LEAD);
  if (collided.length > 0) {
    reasons.push(
      `Unresolved collision with position(s) ${collided.map((c) => c.question).join(", ")} inside the discrimination margin.`,
    );
  }

  if (reasons.length > 0) {
    return undetermined(scores, lead, reasons, input.hypothesis ?? null, redundancyCollapsed);
  }

  const support =
    second && second.weight >= config.MIN_SUPPORT_WEIGHT ? second.question : null;

  reasons.push(
    `Position ${top.question} earned: weight ${top.weight} ≥ ${config.MIN_PRIMARY_WEIGHT}, lead ${lead} ≥ ${config.MIN_LEAD}, ${top.corroboration} independent corroboration(s), qualification passed.`,
  );
  if (support) reasons.push(`Support position ${support} at weight ${second!.weight}.`);

  const hypothesis = input.hypothesis ?? null;
  return {
    status: "resolved",
    primary: top.question,
    support,
    lead,
    reasons,
    scores,
    hypothesis,
    hypothesisAgrees: hypothesis == null ? null : hypothesis === top.question,
    confidence: top.confidence,
    redundancyCollapsed,
  };
}

function undetermined(
  scores: QuestionScore[],
  lead: number,
  reasons: string[],
  hypothesis: StructuralQuestionId | null,
  redundancyCollapsed: number,
): Resolution {
  return {
    status: "undetermined",
    primary: null,
    support: null,
    lead,
    reasons,
    scores,
    hypothesis,
    hypothesisAgrees: null,
    confidence: 0,
    redundancyCollapsed,
  };
}

/* ------------------------------------------------------------------ */
/* Adaptive probing                                                     */
/* ------------------------------------------------------------------ */

export interface ProbeRecommendation {
  stop: boolean;
  reason: string;
  /** Positions the next probe should try to separate, highest value first. */
  targets: StructuralQuestionId[];
  /** Estimated information gain of continuing, 0..1. */
  expectedGain: number;
}

export interface StoppingConfig {
  /** Below this expected gain, further probing is unlikely to add information. */
  MIN_EXPECTED_GAIN: number;
  /** Hard ceiling on probes regardless of state. */
  MAX_PROBES: number;
}

export const DEFAULT_STOPPING: StoppingConfig = {
  MIN_EXPECTED_GAIN: 0.12,
  MAX_PROBES: 14,
};

export function nextProbe(
  resolution: Resolution,
  probesAsked: number,
  stopping: StoppingConfig = DEFAULT_STOPPING,
): ProbeRecommendation {
  const ranked = resolution.scores
    .slice()
    .sort((a, b) => b.weight - a.weight || a.question - b.question);
  const top = ranked[0];
  const contenders = ranked.filter((s) => s.weight > 0 && top.weight - s.weight < 0.9);

  if (resolution.status === "resolved" && resolution.confidence >= 0.6) {
    return {
      stop: true,
      reason: "Sufficient evidence earned: position resolved with adequate confidence.",
      targets: [],
      expectedGain: 0,
    };
  }
  if (probesAsked >= stopping.MAX_PROBES) {
    return {
      stop: true,
      reason: "Probe ceiling reached. Returning Undetermined is the correct outcome.",
      targets: [],
      expectedGain: 0,
    };
  }

  // Gain is highest when strong contenders are close together and thinly corroborated.
  const ambiguity =
    contenders.length > 1
      ? 1 - Math.min(1, (top.weight - contenders[1].weight) / 0.9)
      : top.weight > 0
        ? 0.4
        : 1;
  const thinness =
    1 - Math.min(1, contenders.reduce((s, c) => s + c.corroboration, 0) / (contenders.length * 3 || 1));
  const saturation = Math.min(1, probesAsked / stopping.MAX_PROBES);
  const expectedGain =
    Math.round(Math.max(0, (0.6 * ambiguity + 0.4 * thinness) * (1 - saturation * 0.7)) * 100) / 100;

  if (expectedGain < stopping.MIN_EXPECTED_GAIN) {
    return {
      stop: true,
      reason:
        "Expected information gain below threshold: further questions are unlikely to change the outcome.",
      targets: [],
      expectedGain,
    };
  }

  const targets = (contenders.length > 1 ? contenders : ranked)
    .slice(0, 3)
    .map((c) => c.question);

  return {
    stop: false,
    reason:
      contenders.length > 1
        ? `Ambiguity between positions ${targets.join(", ")}. Next probe should discriminate, not re-confirm.`
        : "Base is too thin for any position. Next probe should widen coverage.",
    targets,
    expectedGain,
  };
}

/** RESEARCH / PROTOTYPE ONLY — evidence taxonomy under development. */

export type EvidenceKind =
  | "self_report"
  | "direct_claim"
  | "behavioral_instance"
  | "structural_implication"
  | "cost_borne"
  | "contrast_case"
  | "contradiction"
  | "absence";

export interface EvidenceKindSpec {
  kind: EvidenceKind;
  label: string;
  description: string;
  /** Multiplier applied to unit strength. Research values, not production constants. */
  weight: number;
  /** Does this kind count toward the qualification base? */
  qualifying: boolean;
  /** Signed direction of the contribution. */
  polarity: 1 | -1 | 0;
}

export const EVIDENCE_KINDS: EvidenceKindSpec[] = [
  {
    kind: "self_report",
    label: "Self-report",
    description:
      "Participant asserts something about their own type or tendency. Hypothesis-forming only; weight zero by design.",
    weight: 0,
    qualifying: false,
    polarity: 0,
  },
  {
    kind: "direct_claim",
    label: "Direct claim",
    description:
      "An unevidenced statement about how they operate. Cheap to produce, so weighted low and non-qualifying alone.",
    weight: 0.5,
    qualifying: false,
    polarity: 1,
  },
  {
    kind: "behavioral_instance",
    label: "Behavioral instance",
    description:
      "A specific recalled episode with time, place, and action. The primary currency of the engine.",
    weight: 1,
    qualifying: true,
    polarity: 1,
  },
  {
    kind: "structural_implication",
    label: "Structural implication",
    description:
      "The shape of the answer reveals the position even though its content is about something else. Inferred, so discounted.",
    weight: 0.8,
    qualifying: true,
    polarity: 1,
  },
  {
    kind: "cost_borne",
    label: "Cost borne",
    description:
      "They paid something to keep operating this way. Strongest available signal because it is expensive to fake.",
    weight: 1.3,
    qualifying: true,
    polarity: 1,
  },
  {
    kind: "contrast_case",
    label: "Contrast case",
    description:
      "A case where they did not do the thing, sharpening the boundary of the position. Qualifying because it discriminates.",
    weight: 0.7,
    qualifying: true,
    polarity: 1,
  },
  {
    kind: "contradiction",
    label: "Contradiction",
    description:
      "Evidence incompatible with the position. Retained as information: subtracts from the position and reduces confidence.",
    weight: 1.1,
    qualifying: false,
    polarity: -1,
  },
  {
    kind: "absence",
    label: "Structured absence",
    description:
      "A probe designed to elicit the position produced nothing. Counts against, weakly, and only when the probe was well-aimed.",
    weight: 0.4,
    qualifying: false,
    polarity: -1,
  },
];

export const KIND_SPEC = new Map<EvidenceKind, EvidenceKindSpec>(
  EVIDENCE_KINDS.map((k) => [k.kind, k]),
);

/**
 * Semantic normalization (prototype).
 * Collapses surface variation onto a canonical semantic key so that restating a
 * claim does not accumulate. Deliberately crude: the point is to expose where a
 * real normalizer is needed, not to be one.
 */
const STOPWORDS = new Set([
  "the","a","an","and","or","but","i","me","my","we","it","its","is","was","were","be","been",
  "to","of","in","on","at","for","with","that","this","then","just","really","very","kind","sort",
  "like","so","because","about","would","could","had","have","has","did","do","am","are","they",
  "he","she","them","there","here","when","while","also","still","again","from","as","by",
]);

const SYNONYM_ROOTS: Record<string, string> = {
  stayed: "persist", stay: "persist", staying: "persist", remained: "persist",
  remain: "persist", endured: "persist", endure: "persist", kept: "persist",
  keep: "persist", continued: "persist", persisted: "persist", stuck: "persist",
  sorted: "order", sorting: "order", organized: "order", organizing: "order",
  arranged: "order", arrange: "order", structured: "order", filed: "order",
  noticed: "perceive", notice: "perceive", saw: "perceive", spotted: "perceive",
  observed: "perceive", detected: "perceive",
  listened: "receive", listen: "receive", heard: "receive", hearing: "receive",
  received: "receive", absorbed: "receive",
  chose: "select", choose: "select", picked: "select", decided: "select",
  judged: "select", filtered: "select",
  finished: "complete", finish: "complete", completed: "complete",
  shipped: "complete", delivered: "complete", built: "complete", made: "complete",
  combined: "integrate", merged: "integrate", reconciled: "integrate",
  synthesized: "integrate", together: "integrate",
  started: "begin", start: "begin", began: "begin", named: "begin",
  first: "begin", initiated: "begin",
  split: "differentiate", between: "differentiate", both: "differentiate",
  opposite: "differentiate", versus: "differentiate", tension: "differentiate",
  repeated: "recur", repeating: "recur", pattern: "recur", again2: "recur",
  rhythm: "recur", cycle: "recur",
};

export function normalizeToSemanticKey(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .map((t) => SYNONYM_ROOTS[t] ?? t.replace(/(ing|ed|es|s)$/u, ""));

  const unique = Array.from(new Set(tokens)).sort();
  // Keep the densest few roots: near-restatements land on the same key.
  return unique.slice(0, 4).join("|") || "empty";
}

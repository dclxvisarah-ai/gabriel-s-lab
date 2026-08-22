/** RESEARCH / PROTOTYPE ONLY — structural test harness. */

import { resolve, nextProbe, type EvidenceInput, type EngineInput } from "./engine";
import type { StructuralQuestionId } from "./spec";

export interface LabTestResult {
  id: string;
  name: string;
  category: "redundancy" | "corroboration" | "collision" | "order" | "missing" | "stopping" | "contradiction";
  intent: string;
  passed: boolean;
  observed: string;
}

let seq = 0;
function ev(
  question: StructuralQuestionId,
  kind: EvidenceInput["kind"],
  strength: number,
  text: string,
  probeId: string,
  responseId = `r${++seq}`,
): EvidenceInput {
  return { id: `e${++seq}`, responseId, probeId, question, kind, strength, text };
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function base7(): EvidenceInput[] {
  return [
    ev(7, "behavioral_instance", 0.9, "stayed with the dying prototype for eleven months", "p1"),
    ev(7, "cost_borne", 0.85, "lost the contract rather than leave the work unfinished", "p2"),
    ev(7, "contrast_case", 0.6, "walked away from the committee immediately", "p3"),
    ev(4, "behavioral_instance", 0.5, "organized the archive into three shelves", "p4"),
  ];
}

export function runLabTests(): LabTestResult[] {
  seq = 0;
  const results: LabTestResult[] = [];

  const push = (r: LabTestResult) => results.push(r);

  /* Redundancy: restating a claim must not accumulate. */
  {
    const once = base7();
    const restated = [
      ...once,
      ev(7, "behavioral_instance", 0.9, "I remained with that dying prototype eleven months", "p1"),
      ev(7, "behavioral_instance", 0.88, "kept at the dying prototype for eleven months", "p1"),
    ];
    const a = resolve({ evidence: once });
    const b = resolve({ evidence: restated });
    const wa = a.scores.find((s) => s.question === 7)!.weight;
    const wb = b.scores.find((s) => s.question === 7)!.weight;
    push({
      id: "redundancy-1",
      name: "Semantic redundancy collapses to one unit",
      category: "redundancy",
      intent: "Two restatements of the same claim must not raise the weight of position 7.",
      passed: Math.abs(wa - wb) < 1e-9,
      observed: `weight ${wa} vs ${wb} after ${b.redundancyCollapsed} collapse(s)`,
    });
  }

  /* Corroboration: distinct claim via distinct probe must raise breadth. */
  {
    const a = resolve({ evidence: base7() });
    const b = resolve({
      evidence: [
        ...base7(),
        ev(7, "behavioral_instance", 0.8, "sat with the grieving neighbour every evening that winter", "p9"),
      ],
    });
    const ca = a.scores.find((s) => s.question === 7)!.corroboration;
    const cb = b.scores.find((s) => s.question === 7)!.corroboration;
    push({
      id: "corroboration-1",
      name: "Independent corroboration ≠ repetition",
      category: "corroboration",
      intent: "A semantically distinct unit from a new probe must increase corroboration count.",
      passed: cb > ca,
      observed: `corroboration ${ca} → ${cb}`,
    });
  }

  /* Order invariance. */
  {
    const evidence = base7();
    const baseline = resolve({ evidence });
    const permutations = [1, 7, 42, 991].map((s) => resolve({ evidence: shuffle(evidence, s) }));
    const same = permutations.every(
      (p) =>
        p.status === baseline.status &&
        p.primary === baseline.primary &&
        Math.abs(p.lead - baseline.lead) < 1e-9,
    );
    push({
      id: "order-1",
      name: "Order invariance across evidence permutations",
      category: "order",
      intent: "Result must not depend on the order evidence arrives in.",
      passed: same,
      observed: `${permutations.length} permutations → primary ${baseline.primary ?? "Undetermined"}, lead ${baseline.lead}`,
    });
  }

  /* Collision: 7 vs 4 inside the margin must not resolve. */
  {
    const evidence = [
      ev(7, "behavioral_instance", 0.9, "stayed with the failing build for a year", "p1"),
      ev(7, "cost_borne", 0.8, "paid out of pocket to keep the room open", "p2"),
      ev(4, "behavioral_instance", 0.9, "structured the failing build into a year-long schedule", "p3"),
      ev(4, "cost_borne", 0.8, "paid out of pocket to file the room's records", "p4"),
    ];
    const r = resolve({ evidence });
    push({
      id: "collision-1",
      name: "Collision set 7↔4 blocks resolution inside the margin",
      category: "collision",
      intent: "Near-tied colliding positions must return Undetermined rather than pick the higher score.",
      passed: r.status === "undetermined",
      observed: `${r.status}; lead ${r.lead}; ${r.reasons[0] ?? ""}`,
    });
  }

  /* Missing evidence: one thin unit must not resolve. */
  {
    const r = resolve({
      evidence: [ev(9, "direct_claim", 1, "I always finish what I begin", "p1")],
    });
    push({
      id: "missing-1",
      name: "Single unqualified unit returns Undetermined",
      category: "missing",
      intent: "A lone direct claim must fail qualification even at maximum strength.",
      passed: r.status === "undetermined",
      observed: `${r.status}; ${r.scores.find((s) => s.question === 9)!.qualificationNotes.join("; ")}`,
    });
  }

  /* Missing evidence: availability penalizes wide-probe thin returns. */
  {
    const evidence = base7();
    const narrow = resolve({ evidence });
    const wide: EngineInput = { evidence, availability: { 7: 9 } };
    const wideR = resolve(wide);
    const wn = narrow.scores.find((s) => s.question === 7)!.weight;
    const ww = wideR.scores.find((s) => s.question === 7)!.weight;
    push({
      id: "missing-2",
      name: "Availability discounts thin returns from many probes",
      category: "missing",
      intent: "Same evidence across more opportunities must yield a lower weight.",
      passed: ww < wn,
      observed: `weight ${wn} (available 3) → ${ww} (available 9)`,
    });
  }

  /* Contradiction is information, not noise. */
  {
    const clean = resolve({ evidence: base7() });
    const conflicted = resolve({
      evidence: [
        ...base7(),
        ev(7, "contradiction", 0.9, "abandoned every long project before the halfway mark", "p6"),
      ],
    });
    const c1 = clean.scores.find((s) => s.question === 7)!;
    const c2 = conflicted.scores.find((s) => s.question === 7)!;
    push({
      id: "contradiction-1",
      name: "Contradiction lowers weight and confidence, and is retained",
      category: "contradiction",
      intent: "A contradicting unit must be recorded, reduce mass, and reduce confidence.",
      passed: c2.weight < c1.weight && c2.contradictionMass > 0,
      observed: `weight ${c1.weight}→${c2.weight}, confidence ${c1.confidence}→${c2.confidence}, contradiction mass ${c2.contradictionMass}`,
    });
  }

  /* Self-report carries no weight. */
  {
    const withReport = resolve({
      evidence: [...base7(), ev(3, "self_report", 1, "I have always thought of myself as a three", "p0")],
      hypothesis: 3,
    });
    const three = withReport.scores.find((s) => s.question === 3)!;
    push({
      id: "contradiction-2",
      name: "Self-report scores zero and can be overturned",
      category: "contradiction",
      intent: "A stated hypothesis must add no weight and must not steer the result.",
      passed: three.weight === 0 && withReport.hypothesisAgrees !== true,
      observed: `hypothesis 3 weight ${three.weight}; earned ${withReport.primary ?? "Undetermined"}`,
    });
  }

  /* Adaptive stopping. */
  {
    const thin = resolve({ evidence: [ev(1, "direct_claim", 0.4, "I name things early", "p1")] });
    const early = nextProbe(thin, 1);
    const late = nextProbe(thin, 14);
    push({
      id: "stopping-1",
      name: "Probing continues under ambiguity and stops at the ceiling",
      category: "stopping",
      intent: "Adaptive probing must continue while gain is available and stop when it is not.",
      passed: !early.stop && late.stop,
      observed: `early gain ${early.expectedGain} (continue), ceiling → ${late.reason}`,
    });
  }

  {
    const strong = resolve({
      evidence: [
        ev(8, "behavioral_instance", 0.95, "let the client talk for ninety minutes before proposing", "p1"),
        ev(8, "cost_borne", 0.9, "lost the pitch by refusing to interrupt the room", "p2"),
        ev(8, "contrast_case", 0.8, "spoke first in the crisis meeting and regretted it", "p3"),
        ev(8, "structural_implication", 0.7, "answered by describing what the question was really asking", "p4"),
      ],
    });
    const rec = nextProbe(strong, 4);
    push({
      id: "stopping-2",
      name: "Probing stops when evidence is earned",
      category: "stopping",
      intent: "Once a position resolves with adequate confidence, further probing must halt.",
      passed: rec.stop && strong.status === "resolved",
      observed: `${strong.status} on position ${strong.primary}, confidence ${strong.confidence}; ${rec.reason}`,
    });
  }

  return results;
}

/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 *
 * Mission and seeded hypothesis registry. Hypotheses are seeded ONLY from
 * research material that is already established (the existing V2 Addiction
 * research and the locked V2 territory / CrossMap data). Nothing here
 * rebuilds the addiction matrix, and nothing here is an architecture decision.
 */

import type { Hypothesis, Mission } from "./types";

export const ADDICTION_MISSION: Mission = {
  id: "mission-addiction-v2",
  objective:
    "Determine, by bounded research iteration, whether the established Addiction question architecture already produces evidence distinct enough for the locked V2 pipeline, and where further inquiry is required.",
  successCriteria:
    "Every seeded research question reaches supported, refuted, inconclusive or blocked, with each verdict traceable to the evidence statements and mechanism run that produced it.",
  outOfScope: [
    "Any production project, branch or scoring change",
    "Any change to locked V2 territories, Number meanings, Number count or CrossMap authority",
    "Promotion of research thresholds, weights or stopping values to law",
    "Any claim of empirical validity from synthetic fixtures",
  ],
};

function h(
  id: string,
  priority: number,
  statement: string,
  derivedFrom: string,
): Hypothesis {
  return {
    id,
    statement,
    derivedFrom,
    priority,
    status: "open",
    parentId: null,
    forkedFromExperimentId: null,
  };
}

export const SEED_HYPOTHESES: Hypothesis[] = [
  h(
    "H1",
    5,
    "The existing Addiction question architecture adequately distinguishes its established constructs.",
    "Established V2 Addiction question architecture",
  ),
  h(
    "H2",
    4,
    "The unresolved constructs (urge/craving, function/motive, ambivalence, self-efficacy) are already captured by existing questions and evidence.",
    "Established V2 Addiction research — unresolved construct list",
  ),
  h(
    "H3",
    4,
    "The evidence-derived Drinking 4↔9 relationship generalizes beyond the observed cases.",
    "Established Drinking evidence-derived 4↔9 relationship; locked CrossMap records 4↔9 as NO_CURRENT_OVERLAP",
  ),
  h(
    "H4",
    3,
    "The existing Number 9 meaning adequately captures recognition, pattern awareness and carry-forward without being rewritten.",
    "Locked V2 territory 9 (Completion) vocabulary and distinction",
  ),
  h(
    "H5",
    3,
    "The same underlying psychological structures can emerge across different addictive behaviours without forcing identical results.",
    "Established V2 Addiction research across drinking and chase/gambling material",
  ),
  h(
    "H6",
    2,
    "The existing questions produce evidence that enters the V2 pipeline distinctly enough to support those distinctions.",
    "Existing V2 pipeline semantic-key and probe handling",
  ),
  h(
    "H7",
    5,
    "The 5 new DRINK questions (recognition, readiness, actual cost, stop-locus, urge) produce evidence that locates distinctly across territories, closing the coverage gap H2 already flagged as unresolved.",
    "Bubble-overlap reasoning against locked V2 territories + CAGE/SAMHSA/AUDIT-C construct research",
  ),
];

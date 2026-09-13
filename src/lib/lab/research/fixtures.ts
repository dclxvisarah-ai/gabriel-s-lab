/**
 * GABRIEL'S LAB — RESEARCH ONLY.
 *
 * EXPLICITLY SYNTHETIC FIXTURES. Every statement below is invented for
 * machinery testing. None of it is participant data, none of it is empirical
 * evidence, and none of it may become a research finding. The controller
 * refuses to emit empirical findings from `synthetic_fixture` origin.
 */

import type { EvidenceKind } from "../taxonomy";
import type { TerritoryId } from "../v2/territories";
import type { FixtureSet, ResearchStatement } from "./types";

const SYNTHETIC_LABEL = "SYNTHETIC FIXTURE — invented text, not participant data";
const CANDIDATE_LABEL = "CANDIDATE CONSTRUCT — research-reasoned, not yet answered by a real person";

function s(
  runId: string,
  id: string,
  probeId: string,
  locations: TerritoryId[],
  text: string,
  kind: EvidenceKind = "behavioral_instance",
  strength = 0.9,
  origin: "synthetic_fixture" | "candidate_construct" = "synthetic_fixture",
): ResearchStatement {
  return {
    id,
    runId,
    responseId: `resp-${id}`,
    probeId,
    text,
    kind,
    strength,
    locations,
    origin,
    fixtureLabel: origin === "candidate_construct" ? CANDIDATE_LABEL : SYNTHETIC_LABEL,
  };
}

function set(
  id: string,
  label: string,
  statements: ResearchStatement[],
  origin: "synthetic_fixture" | "candidate_construct" = "synthetic_fixture",
): FixtureSet {
  const tag = origin === "candidate_construct" ? CANDIDATE_LABEL : SYNTHETIC_LABEL;
  return { id, label: `${label} — ${tag}`, origin, runId: statements[0]!.runId, statements };
}

/* Addiction architecture, established constructs. */
const ADDICTION_CORE = set("fx-addiction-core", "Addiction question architecture", [
  s("rx-core", "a1", "pq-1", [5], "stopped at the door and turned the glass down that night"),
  s("rx-core", "a2", "pq-2", [7], "kept showing up to the same table for nine straight months"),
  s("rx-core", "a3", "pq-3", [4], "built a weekly rota around when the money came in"),
  s("rx-core", "a4", "pq-4", [9], "closed the ledger and carried the count into the next year"),
]);

/* Unresolved constructs: urge/craving, function/motive, ambivalence, self-efficacy. */
const UNRESOLVED_CONSTRUCTS = set("fx-unresolved", "Unresolved addiction constructs", [
  s("rx-unres", "u1", "pq-5", [], "the wanting arrives before any thought does"),
  s("rx-unres", "u2", "pq-6", [], "it does a job for me that nothing else does"),
  s("rx-unres", "u3", "pq-7", [2, 5], "half of me books the ticket and half of me tears it up"),
  s("rx-unres", "u4", "pq-8", [], "I do not believe I could hold it for a week"),
]);

/* Narrowed follow-up on the constructs that failed to locate. */
const UNRESOLVED_NARROWED = set("fx-unresolved-narrowed", "Narrowed: urge, motive, self-efficacy", [
  s("rx-unres-2", "n1", "pq-9", [], "the wanting shows up on its own schedule"),
  s("rx-unres-2", "n2", "pq-10", [], "it settles something I cannot name"),
  s("rx-unres-2", "n3", "pq-11", [], "asked whether I could stop, I have no answer I trust"),
]);

/* Drinking 4<->9: the originally observed case shape. */
const DRINKING_CASE_A = set("fx-drinking-a", "Drinking case A (4↔9 as observed)", [
  s("rx-drink-a", "da1", "pq-12", [4, 9], "the same fixed order every night until the bottle was finished"),
  s("rx-drink-a", "da2", "pq-13", [4, 9], "the routine only ends when the last of it is gone"),
]);

/* Drinking 4<->9: a different case, testing generalization. */
const DRINKING_CASE_B = set("fx-drinking-b", "Drinking case B (different case)", [
  s("rx-drink-b", "db1", "pq-14", [4], "kept the shelf arranged by size and never moved it"),
  s("rx-drink-b", "db2", "pq-15", [9], "settled the tab and let that be the end of it"),
]);

/* Number 9 meaning: recognition, pattern awareness, carry-forward. */
const NUMBER_NINE = set("fx-number-nine", "Number 9 recognition and carry-forward", [
  s("rx-nine", "k1", "pq-16", [9], "saw the whole shape of it only once it was finished"),
  s("rx-nine", "k2", "pq-17", [3, 9], "recognised the same arrangement turning up again and named it"),
  s("rx-nine", "k3", "pq-18", [9], "took what the last round taught me into the next one"),
]);

/* Gambling / chase behaviour, for cross-behaviour comparison. */
const GAMBLING_CORE = set("fx-gambling-core", "Chase / gambling behaviour", [
  s("rx-gamble", "g1", "pq-19", [7], "sat at the machine past closing to get back to even"),
  s("rx-gamble", "g2", "pq-20", [4], "split the wages into stakes before the week started"),
  s("rx-gamble", "g3", "pq-21", [5], "walked out once, with the card left at home on purpose"),
]);

/* Pipeline distinctness: separate probes, deliberately unlike wording. */
const PIPELINE_DISTINCTNESS = set("fx-distinctness", "Pipeline distinctness at territory 5", [
  s("rx-distinct", "p1", "pq-22", [5], "turned the glass down at the door"),
  s("rx-distinct", "p2", "pq-23", [5], "handed my card to my sister before leaving"),
  s("rx-distinct", "p3", "pq-24", [5], "chose the earlier train so the evening ended sooner"),
]);

export const FIXTURES: FixtureSet[] = [
  ADDICTION_CORE,
  UNRESOLVED_CONSTRUCTS,
  UNRESOLVED_NARROWED,
  DRINKING_CASE_A,
  DRINKING_CASE_B,
  NUMBER_NINE,
  GAMBLING_CORE,
  PIPELINE_DISTINCTNESS,
];

export const FIXTURE_BY_ID = new Map(FIXTURES.map((f) => [f.id, f]));

export function fixture(id: string): FixtureSet {
  const f = FIXTURE_BY_ID.get(id);
  if (!f) throw new Error(`Unknown fixture ${id}`);
  return f;
}

# V2 Authority / Drift Audit — evidence from current source

Verification only. No code, config, or deployment was changed.

## 0. Authority recorded

Expanded V2 is logged as locked Gabriel's Number architecture: no additional Numbers, expanded semantic architecture of the existing nine. Prototype thresholds, weights, gain formulas, stopping values and normalization rules remain research/unvalidated. V3 stays research-only. Detailed V2 source files — not this audit and not memory — are the authority for exact vocabulary, mappings, relationships and diagrams; nothing below invents V2 content.

Classification key used throughout: section 1 = BUILT (preserve), section 2 = NEW or CORRECTION, section 3 = UNVERIFIED, section 4 = UNKNOWN.

Immediate conflicts visible in current source:
- Overlap is only ever suppressive (`engine.ts:259–269` collision guard) — conflicts with "overlap is information".
- Lexical similarity alone merges evidence units (`taxonomy.ts:141–152`) — conflicts with "vocabulary similarity is not proof of an intersection".
- The 1–9 material is labelled provisional/prototype in spec and UI — conflicts with locked status.

## 1. What currently matches the locked V2 target — BUILT, preserve

- **Nine territories exist and are not expanded in count.** `src/lib/lab/spec.ts:14` types `StructuralQuestionId = 1..9`; `STRUCTURAL_QUESTIONS` (lines 26–90) holds exactly nine entries with the agreed labels (1 Beginning/Identification … 9 Embodiment/Completion). No tenth Number anywhere.
- **1–9 is non-sequential.** `spec.ts:96` states no ordering, adjacency, or magnitude may be inferred.
- **Evidence precedes location.** `engine.ts` `resolve()` scores only from `EvidenceInput[]`; a position is assigned only after weight floor, lead, qualification, and collision checks (`engine.ts:241–276`).
- **A response never automatically equals a Number.** Self-report is weight 0 / polarity 0 / non-qualifying (`taxonomy.ts:27–34`) and is carried as `hypothesis` that is never scored (`engine.ts:283–293`).
- **Undetermined is a first-class outcome.** `ResolutionStatus` includes `undetermined`; `undetermined()` returns reasons (`engine.ts:298–317`).
- **Redundancy ≠ corroboration.** `collapse()` folds same semantic key to the strongest instance (`engine.ts:110–117`); corroboration requires probe-distinct, key-distinct units (`engine.ts:150–163`).
- **Contradiction is information.** Kept as signed evidence, subtracts mass and can disqualify (`taxonomy.ts:80–88`, `engine.ts:143–176`).
- **One response may support multiple territories.** Evidence is not partitioned; `scoreQuestion` runs per position over all units (`engine.ts:215–222`); principle stated at `spec.ts:142–146`.
- **Traceability.** Every `QuestionScore` retains its `CollapsedUnit[]` with probe and response ids; `Resolution.reasons` explains the outcome.
- **No Number feeds back as its own evidence.** Nothing in `engine.ts` reads `primary`/`hypothesis` when computing scores.

## 2. Drift — missing or materially different

- **Expanded V2 semantic vocabulary is absent.** Each territory has exactly one `label` + one `signature` string (`spec.ts:26–90`). No expanded vocabulary set, no per-territory term lists.
- **Nine-territory comparison view does not exist.** No route or module renders territories side by side; `src/routes/spec.tsx` lists them linearly.
- **Semantic distinctions are not modelled.** There is no "what distinguishes 3 from 4" structure; the only relational field is `collidesWith`, which is a disqualification guard, not a distinction record.
- **Relationship/intersection architecture is absent.** A repo-wide search for `intersection|overlap|relationship|territory|Venn|compass|cross-reference` returns only the incidental sentence at `spec.ts:97`. No relationship types, no intersection records, no evidence links between territories.
- **The required distinction vocabulary is not represented.** `EvidenceKind` (`taxonomy.ts:3–11`) has eight kinds but no way to mark *linguistic proximity*, *candidate relationship*, *evidence-supported intersection*, or *unknown*. Redundancy and corroboration exist only as engine-internal computations, not as declarable states.
- **Intentional overlap is treated as collision, not as information.** `engine.ts:259–269` converts near-tied members of a collision set into an Undetermined reason. Under locked V2 an overlap can be legitimate information; today it can only suppress a result.
- **Vocabulary similarity currently *does* drive structure.** `normalizeToSemanticKey` (`taxonomy.ts:141–152`) collapses on shared word roots, so lexical proximity alone silently merges units — the opposite of "vocabulary similarity alone does not establish an intersection".
- **Venn/bubble/compass and cross-reference surfaces do not exist** in any route (`src/routes/`: index, spec, engine, tests, capture).

## 3. Present but prototype/unvalidated — must not be treated as law

- All numeric constants: `DEFAULT_CONFIG` gates (`engine.ts:89–96`), evidence weights (`taxonomy.ts:25–98`), confidence formula (`engine.ts:180–185`), `DEFAULT_STOPPING` (`engine.ts:339–342`). Comments themselves say "research values, not production constants".
- `normalizeToSemanticKey` is self-described as "deliberately crude" (`taxonomy.ts:104–108`).
- `collidesWith` sets are hand-authored guesses, unvalidated against evidence.
- The whole Contract V1 capture stack (`capture.ts`, `recorder.ts`, `instrument.fixture.ts`, `/capture`) is synthetic-fixture validated only; it has no in-vivo evidence and its fixture content is invented.
- `PRODUCTION_BASELINE` (`spec.ts:169–176`) is a mirrored reference copy, not authority.

## 4. Unknown from current code

- Whether the production Gabriel app agrees with these nine labels — the production branches/doorways are not in this repo at all.
- The intended expanded V2 vocabulary content itself: not present in any file, so its scope cannot be verified here.
- Which relationships/intersections between territories are considered evidence-supported: no data exists.
- Whether V3 material exists anywhere: no V3 references in this codebase.
- Whether the capture contract holds for real instruments: only synthetic runs exist.

## 5. Smallest eventual implementation set (NOT to be done now)

1. Extend `spec.ts` per territory with an expanded vocabulary field and an explicit distinctions field; keep `label`/`signature` intact so nothing existing breaks.
2. Add a separate relationships module declaring typed links between territories with a status enum: `linguistic_proximity | candidate_relationship | evidence_supported_intersection | contradiction | unknown`, each requiring evidence references to move beyond `candidate`.
3. Separate `collidesWith` (discrimination guard) from the new relationship graph so overlap can be reported as information rather than only suppressing resolution.
4. Add a read-only nine-territory comparison route, plus the Venn/bubble/compass visual over the relationship graph — presentation only, no scoring change.
5. Gate any similarity-derived link so it is emitted as `linguistic_proximity` and can never be promoted to an intersection without evidence units.
6. Restate status wording (item below) once V2 is treated as locked.

No change to the engine's resolution mathematics is required for any of this.

## Stale "provisional / reference" wording to correct

- `src/lib/lab/spec.ts:9` — `LAB_STATUS.label: "Research / Prototype"`; line 11 warning text.
- `src/lib/lab/spec.ts:1–5` header block: "RESEARCH / PROTOTYPE ONLY … research-language definitions".
- `src/routes/spec.tsx:19,25` meta descriptions: "Provisional 1–9 structural questions".
- `src/routes/spec.tsx:44` intro: "Provisional definitions under active revision".
- `src/routes/spec.tsx:47` panel title: "Provisional structural questions".
- `src/routes/index.tsx:20` og description: "Research-only prototype…"; `index.tsx:33` track copy "Provisional 1–9 structural questions…".
- `src/routes/engine.tsx:21` and `src/routes/tests.tsx:14,20` — "prototype structural engine" (accurate for the engine, stale if applied to the 1–9 labels).
- `src/components/lab/LabChrome.tsx:19` global banner and `:77–78` footer — blanket research framing covering the now-locked 1–9/V2 material.
- `README.md` — generic Lovable template text; no mention of the project, V2, or lock status.
- `.lovable/project.json` — template metadata only; carries no project description to correct.

Note: the prototype labelling remains correct for the engine constants, normalizer, and capture stack. Only the 1–9 semantic material and V2 architecture should be relabelled as locked.

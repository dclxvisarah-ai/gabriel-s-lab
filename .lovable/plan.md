# Assessment: Gabriel's Lab as a non-production test path for Raw-Response Capture Record Contract V1

Research evaluation only. No files were changed. Nothing below authorizes implementation; the contract is treated as a specification under review.

## Verified current state of this project

- The project contains only the research lab: routes `/` (`src/routes/index.tsx`), `/spec`, `/engine`, `/tests`, plus `src/lib/lab/{spec,taxonomy,engine,tests}.ts` and `src/components/lab/LabChrome.tsx`.
- There is no production branch content here: no doorway definitions, no question sets, no THE FIRE / THE CHASE / SPIRALING / DRINKING copy, no menu.
- `src/lib/lab/engine.ts` is pure and deterministic: `resolve(EngineInput) -> Resolution`, `nextProbe(...) -> ProbeRecommendation`. It consumes `EvidenceInput[]` (`id`, `responseId`, `probeId`, `question`, `kind`, `strength`, `text`). It has no I/O, no persistence, no clock, no randomness.
- `src/routes/engine.tsx` is a client-side sandbox holding evidence in `useState` with an in-memory counter for ids; nothing is persisted and nothing is timestamped.
- `src/lib/lab/tests.ts` is a synchronous in-process assertion harness (order-invariance via seeded shuffle, redundancy, collision, missingness, stopping), rendered by `/tests`.
- No Lovable Cloud/database is enabled in this project, so there is currently no durable store for records.

## Findings

### 1. Can the Lab host a capture prototype without importing production branch logic?

Yes. The Lab has no dependency on production content, and a capture record is a data-shape concern that does not require branch logic. A capture prototype would need a synthetic instrument fixture (a fake doorway with a few fake displayed questions) authored inside `src/lib/lab/`, explicitly labeled research fixture, not production copy. The one real risk is drift: if someone pastes real doorway wording into the fixture to make it "realistic," the Lab silently becomes a copy of production. That must be an explicit prohibition, not an assumption.

### 2. Could such a prototype test the record/reconstruction contract meaningfully?

Partly, and the split matters.

Testable in the Lab with synthetic input:
- Record schema completeness and required-field enforcement (runId, timestamps, instrumentId/version, source revision, doorway, ordered events, prompts/notes, choice id + label, boundary markers).
- Ordering and append-only integrity of the event log.
- Navigation semantics: back, change-of-answer, restart — whether the log reconstructs "what was actually displayed, in the order displayed" rather than a final answer set.
- Reconstruction round-trip: replay the event log into a rendered transcript and diff it against what the harness says was displayed.
- Separation of raw events from any derived-result snapshot (the snapshot must be a sibling object, never mutate or annotate raw events).
- Missingness without inference: skipped, unanswered, timed-out, and never-displayed must be distinct states with no defaulting.
- Instrument-version behavior: a record captured under v1 must remain reconstructable after the fixture changes to v2.
- Model-agnosticism: the record must contain no engine outputs beyond the optional snapshot; verified by asserting the engine is never imported by the capture module.

Not testable in the Lab:
- Whether the real production UI actually emits every event it displays. That is an instrumentation-coverage question about production code, not a schema question.
- Real timing/ordering under real user behavior, real navigation quirks, real restart paths.
- Whether the real `instrumentId`/`version`/source-revision values are correct and stable at capture time.

So the Lab can falsify the contract (find shapes it cannot express) and validate reconstruction logic. It cannot establish that the contract holds in vivo.

### 3. Reusable existing components

- `src/lib/lab/tests.ts` — the harness pattern (`LabTestResult`, category-tagged assertions, pure functions) transfers directly to contract tests; add categories such as `capture`, `reconstruction`, `missingness`, `versioning`.
- `src/routes/tests.tsx` — live runner UI, reusable unchanged for capture tests.
- `src/components/lab/LabChrome.tsx` — `LabPage`/`Panel`/`LabBanner` chrome and the research/prototype labeling.
- `src/routes/engine.tsx` — the interactive-append pattern (add an item, recompute derived view) is the right shape for a capture-replay page.
- `src/lib/lab/engine.ts` — reusable only as the producer of the optional derived-result snapshot, called after capture, never inside it.
- Route/head/metadata and noindex conventions already established.

### 4. What is missing

- A record schema: no types exist today for run, event, boundary, or snapshot.
- Identity and time: no runId generation, no monotonic sequence, no timestamps. `src/routes/engine.tsx` uses a module-level counter that resets on reload — not adequate for record identity.
- Instrument versioning: no `instrumentId`, no version, no source-revision capture; the build exposes no revision value to the app today.
- A synthetic instrument fixture (fake doorway + ordered displayed questions + choice ids/labels).
- A capture recorder API (`start run`, `record displayed`, `record selection`, `record navigation boundary`, `end run`) with append-only semantics.
- A reconstruction/replay function plus a transcript view.
- An explicit missingness vocabulary with no default fill.
- Persistence: nothing durable exists; export/import JSON is the minimum, a database would be a larger step.
- Validation: schema validation and round-trip diffing.
- Conformance criteria: a written statement of what counts as a passing record.

### 5. Does a fresh live capture run require an isolated copy of Delightful Development?

Yes. A live run means real doorways and real displayed questions, which exist only in the production project. Instrumenting them requires touching that codebase, so it must be an isolated copy/variant, never the production branch, with capture write-only and no read path back into scoring or content. The Lab cannot do this because it has no branches, and importing them would defeat the isolation this project exists to preserve. Division of labor: contract correctness in the Lab, instrumentation coverage in the isolated variant.

### 6. Smallest non-production implementation path preserving the August 18 baseline

Baseline preservation means `src/lib/lab/engine.ts`, `taxonomy.ts`, `spec.ts` and the production constants they mirror (`W_n = Raw_n / sqrt(max(Available_n,1)) * 2`, MIN_PRIMARY_WEIGHT 2.4, MIN_LEAD 0.35, MIN_SUPPORT_WEIGHT 1.8) are read-only for this work.

Phase 0 — specification only: write the contract as a document in the Lab (`/capture` spec page or a markdown note), no code. Cheapest way to find shape problems.

Phase 1 — schema + fixture: add `src/lib/lab/capture.ts` (types + validator) and `src/lib/lab/instrument.fixture.ts` (synthetic doorway). No engine import.

Phase 2 — recorder + replay: append-only recorder and a pure `reconstruct(record)`; both pure and testable.

Phase 3 — contract tests: extend `src/lib/lab/tests.ts` with capture/reconstruction/missingness/versioning categories, surfaced in the existing `/tests` runner.

Phase 4 — capture sandbox page: a `/capture` route that walks the synthetic instrument (with back, change-answer, restart), shows the raw event log and the reconstructed transcript side by side, and offers JSON export/import. Derived snapshot rendered in a visually separate panel, computed by calling `resolve` on the finished record only.

Phase 5 — handoff artifact: export the schema + conformance checklist for the isolated production variant to implement against.

Stop before any production instrumentation. Persistence beyond JSON export is out of scope at this size.

## Evidence still required before claiming the contract works in vivo

1. A real captured run from an isolated production variant that validates against the schema with zero missing required fields.
2. Instrumentation-coverage proof: every question the UI can display emits a displayed event — enumerated against the branch definitions, not sampled.
3. Reconstruction fidelity against ground truth: a recorded session (screen capture or an independent display log) diffed against the replayed transcript, matching in content and order.
4. Boundary fidelity for real back, change-answer, and restart paths, including mid-branch restarts.
5. Version-change survival: a record captured under one instrument version still reconstructing after the instrument changes.
6. Missingness fidelity: real skipped/abandoned runs recorded as distinct states with no inferred fill.
7. Snapshot separation: proof that removing the derived snapshot leaves the raw record intact and unchanged.
8. Multi-run integrity: unique runIds, monotonic ordering, no cross-run contamination.

Until 1-8 exist, the honest statement is that the contract is expressible and internally testable, not that it holds in practice.

# Add H7 / X7 — Candidate DRINK Questions Experiment

Add the uploaded Lab Experiment H7 document as new code only: one new fixture, one new hypothesis, one new experiment. No existing behavior changes. Research-only; no production, no scoring, no V2 architecture changes.

## What gets added

### 1. New evidence origin: `candidate_construct` (additive)

The fixture is reasoned from real research, not invented noise and not a recorded run — neither existing origin fits honestly.

- `src/lib/lab/research/types.ts` — extend the `EvidenceOrigin` union with `"candidate_construct"`. Additive only; existing values untouched.
- `src/lib/lab/research/controller.ts` — extend the existing "synthetic can never be an empirical finding" guard to also cover `candidate_construct` (same protection, no finding eligibility). No other controller logic changes.

### 2. New fixture: `fx-drink-candidates`

- `src/lib/lab/research/fixtures.ts` — add an optional origin/label override to the internal `set()` helper (default unchanged, so all existing fixtures are byte-identical in behavior), then add `DRINK_CANDIDATE_QUESTIONS` exactly as specified in the document:
  - 8 statements (`c1`–`c8`), run `rx-candidate`, strength 0.6, probes `drink-recognition`, `drink-readiness`, `drink-cost-actual`, `drink-stop-locus`, `drink-urge-itself`
  - Locations as given: c1→[3], c2→[2,5], c3→[4], c4→[6], c5→[7], c6→[5], c7→[] (unmapped — "my body made the decision for me"), c8→[2]
  - Label: `CANDIDATE CONSTRUCT — research-reasoned, not yet answered by a real person`
  - Register in `FIXTURES` / `FIXTURE_BY_ID`.

### 3. New hypothesis H7

- `src/lib/lab/research/registry.ts` — append `h("H7", 5, ...)` exactly as worded in the document (5 candidate DRINK questions closing the coverage gap H2 flagged; derived from bubble-overlap reasoning against locked V2 + CAGE/SAMHSA/AUDIT-C construct research). No edits to H1–H6.

### 4. New experiment X7

- `src/lib/lab/research/experiments.ts` — append `X7-candidate-coverage` exactly as specified:
  - Prediction (stated before run): at least 6 of 8 statements locate, occupying at least 5 distinct territories.
  - `run()` uses existing `analyzeV2` via the same `analyze()`/`occupied()` helpers.
  - `implicatesArchitecture`: true when unmapped > 2 — surfaces as pending_approval and pauses the line, per the document's intent.
  - Add `H7: ["X7-candidate-coverage"]` to `SEED_QUEUE` (additive entry).

## Expected outcome

With the given locations: 7 of 8 locate (c7 unmapped), across 6 territories (2,3,4,5,6,7) — prediction should pass, `implicatesArchitecture` false (1 unmapped ≤ 2). H7 will run when the research loop next selects it.

## Tests (additive)

- `src/lib/lab/research/tests.ts` — add focused assertions only:
  - X7 runs through the real pipeline and its prediction check passes on the fixture (7 located, 6 territories).
  - `candidate_construct` origin is labeled honestly and is **not** empirical-finding-eligible (same protection as synthetic).
  - All existing assertions remain untouched and passing.

## Verification

- Run research tests + full existing suites (V2 12, engine 10, capture 11, recorder 10) and typecheck; report exact counts.
- The read-only `/research` page will show H7/X7 on the next run with no route changes needed.

## Explicitly not done

- No claim that passing X7 proves the questions work with real people — the document itself states that requires real participant evidence.
- No production/promotion step, no behavioral branch testing, no changes to locked V2 data, scoring, or thresholds.

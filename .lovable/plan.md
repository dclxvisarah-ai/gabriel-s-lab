# Autonomous Research Loop (Lab-only)

A research-only controller that composes the existing Engine, V2 pipeline, taxonomy, and capture/recorder machinery into one repeatable loop. No V2 redesign, no production access, no new Numbers, no fabricated empirical data.

## The loop

```text
mission ──> hypothesis pool ──> select next hypothesis
                                      │
                                      v
                              experiment design
                                      │
                                      v
                    execution via existing Engine / V2 pipeline
                                      │
                                      v
                      result + failure analysis (why, not just pass)
                                      │
                                      v
                              ledger entry appended
                                      │
                    ┌─────────────────┴─────────────────┐
              budget/stop met ──> HALT            continue ──> next
```

Every iteration is deterministic and pure: same inputs, same ledger.

## State representation

- **Mission**: id, question in plain research language, success criteria, explicit out-of-scope list (production, V2 promotion, Number creation).
- **Hypothesis**: id, statement, derived-from reference (territory/CrossMap/principle it came from — never invented), status `open | testing | supported | refuted | inconclusive | blocked`, priority score, parent hypothesis id for follow-ups.
- **Experiment**: id, hypothesis id, design (which mechanism it runs: `engine.resolve`, `engine.nextProbe`, `v2.analyzeV2`, `capture.validate`, `recorder.reconstruct`), synthetic input set, predicted outcome stated **before** execution, and the assertion that decides the verdict.
- **Evidence provenance**: every input statement carries `origin: "synthetic_fixture" | "recorded_run"` plus runId, responseId, probeId. Synthetic origin is required to be labelled in the ledger line and in any UI render. No statement without provenance may enter an experiment.
- **Iteration**: index, selected hypothesis, experiment, observed result, verdict, failure analysis text, and the justification for the next experiment.
- **Ledger**: append-only array of iteration records plus derived summary (counts per status, open questions, flags). Never mutated in place; identical to the append-only discipline already used by the recorder.
- **Budget/stopping**: max iterations, max experiments per hypothesis, no-new-information counter (N consecutive iterations producing no status change), and explicit `halt_reason`: `budget_exhausted | no_new_information | all_hypotheses_closed | blocked_needs_approval`. Recursive re-explanation without a new result counts as no new information.

## Findings gate

Any ledger conclusion that would change V2, the engine math, or production is emitted as a `pending_approval` finding only. The controller can never act on it; it records it and halts that line of inquiry with `blocked_needs_approval`.

## Reused files (unchanged)

- `src/lib/lab/engine.ts` — `resolve`, `nextProbe`, config, stopping constants (still RESEARCH/UNVALIDATED).
- `src/lib/lab/v2/pipeline.ts` — `analyzeV2`, relationship/intersection states, Venn model.
- `src/lib/lab/v2/territories.ts` — locked territory data and CrossMap (read-only).
- `src/lib/lab/taxonomy.ts` — evidence kinds, `normalizeToSemanticKey`.
- `src/lib/lab/capture.ts`, `recorder.ts`, `instrument.fixture.ts` — provenance and synthetic input source.
- `src/lib/lab/tests.ts`, `v2/tests.ts` — existing suites stay green and untouched.
- `src/components/lab/LabChrome.tsx`, existing route conventions.

## New modules (minimal)

1. `src/lib/lab/research/types.ts` — Mission, Hypothesis, Experiment, Iteration, Ledger, Budget, Verdict, Provenance types.
2. `src/lib/lab/research/hypotheses.ts` — derives the hypothesis pool from existing V2 territory/CrossMap/principle data; a selection function (priority = unresolved + cheapest + most information-bearing). No hypothesis may be authored from outside established material.
3. `src/lib/lab/research/experiments.ts` — maps a hypothesis to a runnable experiment against the existing mechanisms; builds synthetic inputs from the labelled fixture; records the pre-stated prediction.
4. `src/lib/lab/research/controller.ts` — pure `runResearchLoop(mission, budget)` performing select → design → execute → analyse → append → stop. Returns the full ledger; no side effects, no persistence.
5. `src/lib/lab/research/ledger.ts` — append-only ledger construction and summary derivation.
6. `src/lib/lab/research/tests.ts` — focused assertions: determinism/order-invariance of the loop; budget halt; no-new-information halt; hypothesis status transitions incl. refuted and inconclusive; provenance required and synthetic labelling enforced; a finding that would touch V2/production yields `pending_approval` + `blocked_needs_approval`; existing engine/V2 outputs unchanged when driven through the controller.
7. `src/routes/research.tsx` — read-only research terminal: mission, ledger iterations, hypothesis statuses, halt reason, pending-approval findings; plus a nav entry in `LabChrome`. Display only; no scoring authority.

## Verification on implementation

Run new research suite plus existing engine / V2 / capture / recorder suites and a typecheck; all pre-existing suites must remain at their current counts.

## Out of scope

Production reads/writes, V2 or threshold promotion, new Numbers, real participant data, persistence/database, live capture, branch behavioural testing.

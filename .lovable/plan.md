# H8 — Test all three finalized branches together

Add H8, X8, and the `fx-finalized-branches` fixture as new code only. No existing behavior changes, no production or locked-V2 changes.

## What gets added

1. **Fixture `fx-finalized-branches`** — 7 statements exactly as specified, origin `candidate_construct` (already exists from H7):
   - f1 `spiral-replay` → [2] "how I looked or came across"
   - f2 `lost-should` → [5] "I might find out I did it wrong"
   - f3 `lost-tell` → [5] "someone else to blame if it's wrong"
   - f4 `lost-spont` → [5,4] "it feels irresponsible"
   - f5 `drink-stop-locus` → [] "my body just gave out"
   - f6 `spiral-unknown` → [] "tired or hadn't eaten"
   - f7 `lost-unknown` → [] "I've been tired"

2. **Hypothesis H8** (priority 5) — reassignments across SPIRAL/LOST hold against the real pipeline, and the somatic-causation gap is consistent across all three branches.

3. **Experiment X8-reassignment-and-gap-check** — mechanism `v2.analyzeV2`, prediction registered before the run: exactly 4 located, exactly 3 unmapped of 7. `implicatesArchitecture` fires when unmapped is not exactly 3, which pauses the line for review instead of auto-resolving.

4. **Seed queue entry** `H8: ["X8-reassignment-and-gap-check"]` so the bounded loop picks it up.

5. **Test** — one new assertion that the fixture is labelled `candidate_construct` and that X8 runs and produces its metrics.

## Technical note

The existing `set()` helper takes four arguments (`id`, `label`, `statements`, `origin`) and derives the label suffix from the origin; the proposal passes a fifth custom-label argument. To keep the request's intent without changing existing call sites, `set()` gets an optional fifth `labelOverride` parameter — defaulting to today's behavior, so all current fixtures are byte-identical in output.

Everything else is purely additive: a new const in `fixtures.ts`, a new entry in `FIXTURES`, a new `h(...)` in `registry.ts`, a new design in `EXPERIMENTS`, and a new `SEED_QUEUE` key.

## After implementing

Run the research tests plus the full suite and the typecheck, then run X8 and report the real, unedited output: located/unmapped counts, occupied territories, any flags, and whether the pre-registered prediction held.

The two ambiguous items (DRINK's "never really stopped", LOST's avoidance-weighted Completion) are intentionally out of this fixture and will get their own check later.

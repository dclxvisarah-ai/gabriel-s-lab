# Gabriel's Lab

Create a research-only laboratory for the Gabriel's Number project. This is NOT the production app and must NOT be used to edit any production branch. Preserve the following as the research target: self-report is a starting hypothesis, never the conclusion; the participant never answers a number; responses generate evidence; evidence must be distinguished from qualification and confidence; semantic redundancy is one evidence unit, not multiple evidence; independent corroboration is distinct from repetition; contradictions are information; one response may support multiple structural questions; coordinates are earned structurally, not by highest raw score; Undetermined is valid; probing is adaptive and must stop when sufficient evidence is earned or further questions are unlikely to add information. Provisional 1-9 structural questions: 1 Beginning/identification; 2 Duality/differentiation; 3 Pattern/relationship; 4 Structure/organization; 5 Discernment; 6 Integration; 7 Staying/persistence/endurance/sustained attention; 8 Listening/receiving/recognition; 9 Embodiment/Completion. 1-9 is not sequential. This lab is where we can develop the deeper evidence taxonomy, semantic normalization, resolution/dependency/confidence mathematics, collision tests, order-invariance tests, missing-evidence tests, and adaptive stopping logic. Do not create a production formula yet. Do not change the production app. The goal is to determine the smallest useful structural engine that can later be selectively applied to branches that actually need it, especially open-ended branches such as spiraling. Keep research language separate from final user-facing question copy. The current production scoring baseline remains untouched: Raw_n, Available_n, W_n = Raw_n / sqrt(max(Available_n,1))*2; MIN_PRIMARY_WEIGHT 2.4; MIN_LEAD 0.35; MIN_SUPPORT_WEIGHT 1.8; insufficient convergence -> Undetermined. This lab should be explicitly labeled research/prototype and should not contain gambling-specific production logic.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49ad7268-9e63-42c7-ac2d-50791ab2ab1e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

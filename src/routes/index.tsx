import { createFileRoute, Link } from "@tanstack/react-router";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import { RESEARCH_PRINCIPLES, STRUCTURAL_QUESTIONS } from "@/lib/lab/spec";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Gabriel's Number — Structural Research Laboratory" },
      {
        name: "description",
        content:
          "A research-only laboratory for the Gabriel's Number structural engine: evidence taxonomy, resolution mathematics, collision and order-invariance tests, and adaptive stopping logic.",
      },
      { property: "og:title", content: "Gabriel's Number — Structural Research Laboratory" },
      {
        property: "og:description",
        content:
          "Research-only prototype for the smallest useful structural engine. Not the production app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TRACKS = [
  {
    to: "/spec" as const,
    n: "01",
    title: "Spec",
    body: "Provisional 1–9 structural questions, the evidence taxonomy, semantic normalization, and the constants the lab currently reasons with.",
  },
  {
    to: "/engine" as const,
    n: "02",
    title: "Engine",
    body: "Interactive sandbox: enter evidence units, watch redundancy collapse, qualification gates, confidence, and adaptive probe recommendations.",
  },
  {
    to: "/tests" as const,
    n: "03",
    title: "Tests",
    body: "Collision, order-invariance, missing-evidence, contradiction, and stopping harnesses run live against the current engine.",
  },
];

function Index() {
  return (
    <LabPage
      eyebrow="Research laboratory"
      title="Gabriel's Number structural engine"
      intro="A research-only workspace for developing the smallest useful structural engine — one that can later be applied selectively to the branches that actually need it, especially open-ended branches such as spiraling. No production formula is defined here, and no production branch is touched."
    >
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="panel group p-5 transition-colors hover:border-primary/60"
            >
              <p className="font-mono text-xs text-primary">{t.n}</p>
              <h2 className="mt-2 text-lg font-semibold group-hover:text-primary">{t.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </Link>
          ))}
        </div>

        <Panel kicker="Research target" title="Invariants this lab must preserve">
          <ol className="grid gap-4 md:grid-cols-2">
            {RESEARCH_PRINCIPLES.map((p, i) => (
              <li key={p.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel kicker="Positions" title="Provisional structural questions (1–9, non-sequential)">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STRUCTURAL_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="flex items-baseline gap-3 rounded-md border border-border bg-surface-2 px-3 py-2"
              >
                <span className="font-mono text-lg text-primary">{q.id}</span>
                <span className="text-sm">{q.label}</span>
              </div>
            ))}
          </div>
          <p className="mono-label mt-4 normal-case tracking-normal">
            Open research questions: deeper evidence taxonomy, dependency mathematics between
            positions, and how much of this engine any given branch actually needs.
          </p>
        </Panel>
      </div>
    </LabPage>
  );
}

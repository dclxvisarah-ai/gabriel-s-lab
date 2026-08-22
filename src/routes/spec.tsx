import { createFileRoute } from "@tanstack/react-router";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import {
  NON_SEQUENTIAL_NOTE,
  PRODUCTION_BASELINE,
  STRUCTURAL_QUESTIONS,
} from "@/lib/lab/spec";
import { EVIDENCE_KINDS, normalizeToSemanticKey } from "@/lib/lab/taxonomy";
import { DEFAULT_CONFIG, DEFAULT_STOPPING } from "@/lib/lab/engine";

export const Route = createFileRoute("/spec")({
  component: SpecPage,
  head: () => ({
    meta: [
      { title: "Structural Spec — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Provisional 1–9 structural questions, evidence taxonomy, semantic normalization, and resolution constants used in the Gabriel's Number research lab.",
      },
      { property: "og:title", content: "Structural Spec — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Provisional 1–9 structural questions, evidence taxonomy, and resolution mathematics under research.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SAMPLES = [
  "I stayed with the failing prototype for eleven months",
  "I remained with that failing prototype eleven whole months",
  "I sorted the archive into three shelves by weight",
];

function SpecPage() {
  return (
    <LabPage
      eyebrow="Research spec"
      title="Structural questions, taxonomy, mathematics"
      intro="Provisional definitions under active revision. Everything on this page is research language, held separately from any final user-facing question copy."
    >
      <div className="space-y-8">
        <Panel kicker="Positions 1–9" title="Provisional structural questions">
          <p className="mb-5 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">
            {NON_SEQUENTIAL_NOTE}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {STRUCTURAL_QUESTIONS.map((q) => (
              <li key={q.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold text-primary">
                    {q.id}
                  </span>
                  <h3 className="text-sm font-semibold">{q.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {q.signature}
                </p>
                <p className="mono-label mt-3">
                  Collision set: {q.collidesWith.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel kicker="Layer 1" title="Evidence taxonomy">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="mono-label border-b border-border">
                  <th className="pb-2">Kind</th>
                  <th className="pb-2">Weight</th>
                  <th className="pb-2">Polarity</th>
                  <th className="pb-2">Qualifying</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE_KINDS.map((k) => (
                  <tr key={k.kind} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 font-medium">{k.label}</td>
                    <td className="py-3 pr-4 font-mono text-primary">{k.weight.toFixed(2)}</td>
                    <td className="py-3 pr-4 font-mono">
                      {k.polarity === 1 ? "+" : k.polarity === -1 ? "−" : "0"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {k.qualifying ? "yes" : "no"}
                    </td>
                    <td className="py-3 text-muted-foreground">{k.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel kicker="Layer 2" title="Semantic normalization probe">
            <p className="text-sm text-muted-foreground">
              Prototype normalizer. Two restatements of one structural claim should land on the
              same key and collapse to a single evidence unit.
            </p>
            <ul className="mt-4 space-y-3">
              {SAMPLES.map((s) => (
                <li key={s} className="rounded-md border border-border bg-surface-2 p-3">
                  <p className="text-sm">{s}</p>
                  <p className="mt-1 font-mono text-xs text-primary">
                    {normalizeToSemanticKey(s)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel kicker="Layer 3" title="Resolution constants">
            <dl className="space-y-2 font-mono text-sm">
              {Object.entries(DEFAULT_CONFIG).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-primary">{String(v)}</dd>
                </div>
              ))}
              {Object.entries(DEFAULT_STOPPING).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-signal">{String(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 rounded-md border border-border bg-surface-2 p-3">
              <p className="mono-label text-caution">Production baseline — read only</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {PRODUCTION_BASELINE.formula}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                MIN_PRIMARY_WEIGHT {PRODUCTION_BASELINE.MIN_PRIMARY_WEIGHT} · MIN_LEAD{" "}
                {PRODUCTION_BASELINE.MIN_LEAD} · MIN_SUPPORT_WEIGHT{" "}
                {PRODUCTION_BASELINE.MIN_SUPPORT_WEIGHT}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {PRODUCTION_BASELINE.fallback}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </LabPage>
  );
}

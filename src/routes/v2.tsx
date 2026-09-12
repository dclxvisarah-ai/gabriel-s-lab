import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import {
  V2_TERRITORIES,
  V2_STATUS,
  allPairs,
  crossMapState,
  type CrossMapState,
} from "@/lib/lab/v2/territories";
import { runV2Tests } from "@/lib/lab/v2/tests";

export const Route = createFileRoute("/v2")({
  component: V2Page,
  head: () => ({
    meta: [
      { title: "Expanded V2 Architecture — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Locked expanded V2 territory vocabulary, semantic distinctions, comparative references, the locked CrossMap, and the evidence-first relationship and intersection tests.",
      },
      { property: "og:title", content: "Expanded V2 Architecture — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Nine locked territories, the CrossMap, and evidence-earned intersections — research only, no production logic.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATE_STYLE: Record<CrossMapState, string> = {
  DIRECT: "bg-primary/20 text-primary",
  CANDIDATE: "bg-caution/20 text-caution",
  LINGUISTIC_PROXIMITY: "bg-secondary text-muted-foreground",
  NO_CURRENT_OVERLAP: "bg-transparent text-muted-foreground/40",
};

const STATE_SHORT: Record<CrossMapState, string> = {
  DIRECT: "D",
  CANDIDATE: "C",
  LINGUISTIC_PROXIMITY: "L",
  NO_CURRENT_OVERLAP: "·",
};

function V2Page() {
  const results = useMemo(() => runV2Tests(), []);
  const passed = results.filter((r) => r.passed).length;
  const pairs = useMemo(() => allPairs(), []);

  return (
    <LabPage
      eyebrow="Locked architecture"
      title="Expanded V2 territories, CrossMap and intersections"
      intro="V2 expands the semantic architecture of the existing nine and creates no additional Numbers. Reasoning runs response → evidence statement → structural location(s) → relationships/intersections → possible Number. Vocabulary similarity and comparative references never contribute to resolution or to earned status."
    >
      <div className="space-y-6">
        <Panel kicker="Status">
          <p className="text-sm leading-relaxed text-muted-foreground">{V2_STATUS.note}</p>
        </Panel>

        <Panel kicker="Locked territories" title="Nine territories — vocabulary, distinction, references">
          <div className="grid gap-3 md:grid-cols-2">
            {V2_TERRITORIES.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-lg text-primary">{t.id}</span>
                  <h3 className="text-sm font-semibold">{t.name}</h3>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {t.vocabulary.join(" · ")}
                </p>
                <p className="mt-2 text-xs leading-relaxed">
                  <span className="mono-label">Distinction </span>
                  {t.distinction}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  <span className="mono-label">Reference </span>
                  {t.references.join("; ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          kicker="Locked CrossMap"
          title="Relationship map between territories"
        >
          <p className="text-xs text-muted-foreground">
            D = direct · C = candidate · L = linguistic proximity · · = no current overlap. A CrossMap
            entry is not an intersection: intersections are earned only by shared evidence supporting
            both meanings.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-4">
            {pairs
              .filter(([a, b]) => crossMapState(a, b) !== "NO_CURRENT_OVERLAP")
              .map(([a, b]) => {
                const s = crossMapState(a, b);
                return (
                  <div
                    key={`${a}-${b}`}
                    className={`rounded-md px-3 py-2 font-mono text-xs ${STATE_STYLE[s]}`}
                  >
                    {a}↔{b} · {STATE_SHORT[s]} · {s.toLowerCase()}
                  </div>
                );
              })}
          </div>
          <p className="mono-label mt-4 normal-case tracking-normal">
            All remaining unordered pairs are NO_CURRENT_OVERLAP. Venn/bubble/compass views are derived
            representations of this relationship data; visual adjacency and geometry carry no structural
            meaning and no scoring authority.
          </p>
        </Panel>

        <Panel kicker="V2 harness" title="Architecture assertions">
          <p className="font-mono text-2xl text-primary">
            {passed}/{results.length}
          </p>
          <ul className="mt-4 space-y-3">
            {results.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
                      r.passed ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {r.passed ? "hold" : "break"}
                  </span>
                  <h3 className="text-sm font-semibold">{r.name}</h3>
                  <span className="mono-label">{r.id}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{r.intent}</p>
                <p className="mt-1 font-mono text-xs">{r.observed}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </LabPage>
  );
}

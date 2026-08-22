import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import { runLabTests, type LabTestResult } from "@/lib/lab/tests";

export const Route = createFileRoute("/tests")({
  component: TestsPage,
  head: () => ({
    meta: [
      { title: "Structural Test Harness — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Live collision, order-invariance, missing-evidence, contradiction, and adaptive-stopping tests for the prototype structural engine.",
      },
      { property: "og:title", content: "Structural Test Harness — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Collision, order-invariance, missing-evidence and stopping tests run live against the prototype engine.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CATEGORY_LABEL: Record<LabTestResult["category"], string> = {
  redundancy: "Semantic redundancy",
  corroboration: "Independent corroboration",
  collision: "Collision",
  order: "Order invariance",
  missing: "Missing evidence",
  contradiction: "Contradiction handling",
  stopping: "Adaptive stopping",
};

function TestsPage() {
  const results = useMemo(() => runLabTests(), []);
  const passed = results.filter((r) => r.passed).length;

  const grouped = results.reduce<Record<string, LabTestResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <LabPage
      eyebrow="Test harness"
      title="Structural behaviour under test"
      intro="These assertions describe behaviour the engine must keep as the taxonomy and mathematics evolve. They are research checks on structural properties, not production acceptance criteria."
    >
      <div className="space-y-6">
        <Panel>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="font-mono text-3xl text-primary">
              {passed}/{results.length}
            </p>
            <p className="mono-label">assertions holding on the current engine</p>
            {passed < results.length ? (
              <p className="mono-label text-caution normal-case tracking-normal">
                A failing assertion is a research finding, not a bug to hide.
              </p>
            ) : null}
          </div>
        </Panel>

        {Object.entries(grouped).map(([cat, items]) => (
          <Panel key={cat} kicker={CATEGORY_LABEL[cat as LabTestResult["category"]]}>
            <ul className="space-y-3">
              {items.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-xs px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
                        r.passed
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {r.passed ? "hold" : "break"}
                    </span>
                    <h3 className="text-sm font-semibold">{r.name}</h3>
                    <span className="mono-label">{r.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.intent}</p>
                  <p className="mt-2 font-mono text-xs text-signal">{r.observed}</p>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </LabPage>
  );
}

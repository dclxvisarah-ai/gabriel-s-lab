import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabPage, Panel } from "@/components/lab/LabChrome";
import {
  DEFAULT_CONFIG,
  nextProbe,
  resolve,
  type EvidenceInput,
} from "@/lib/lab/engine";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/lib/lab/taxonomy";
import { STRUCTURAL_QUESTIONS, type StructuralQuestionId } from "@/lib/lab/spec";

export const Route = createFileRoute("/engine")({
  component: EnginePage,
  head: () => ({
    meta: [
      { title: "Engine Sandbox — Gabriel's Number Research Lab" },
      {
        name: "description",
        content:
          "Interactive prototype of the structural resolution engine: evidence units, redundancy collapse, qualification gates, confidence, and adaptive probe stopping.",
      },
      { property: "og:title", content: "Engine Sandbox — Gabriel's Number Research Lab" },
      {
        property: "og:description",
        content:
          "Enter evidence units and watch qualification, confidence, and adaptive stopping resolve or return Undetermined.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

let uid = 0;
const nid = () => `u${++uid}`;

const SEED: EvidenceInput[] = [
  {
    id: nid(),
    responseId: "resp-1",
    probeId: "probe-A",
    question: 7,
    kind: "behavioral_instance",
    strength: 0.9,
    text: "stayed with the failing prototype for eleven months",
  },
  {
    id: nid(),
    responseId: "resp-1",
    probeId: "probe-A",
    question: 4,
    kind: "structural_implication",
    strength: 0.5,
    text: "described the eleven months as a schedule of stages",
  },
  {
    id: nid(),
    responseId: "resp-2",
    probeId: "probe-B",
    question: 7,
    kind: "cost_borne",
    strength: 0.85,
    text: "lost the contract rather than leave the work unfinished",
  },
  {
    id: nid(),
    responseId: "resp-3",
    probeId: "probe-C",
    question: 7,
    kind: "behavioral_instance",
    strength: 0.88,
    text: "I remained with that failing prototype eleven whole months",
  },
];

function EnginePage() {
  const [evidence, setEvidence] = useState<EvidenceInput[]>(SEED);
  const [hypothesis, setHypothesis] = useState<StructuralQuestionId | "">(3);
  const [probesAsked, setProbesAsked] = useState(3);

  const [question, setQuestion] = useState<StructuralQuestionId>(7);
  const [kind, setKind] = useState<EvidenceKind>("behavioral_instance");
  const [strength, setStrength] = useState(0.8);
  const [probeId, setProbeId] = useState("probe-D");
  const [text, setText] = useState("");

  const resolution = useMemo(
    () => resolve({ evidence, hypothesis: hypothesis === "" ? null : hypothesis }),
    [evidence, hypothesis],
  );
  const recommendation = useMemo(
    () => nextProbe(resolution, probesAsked),
    [resolution, probesAsked],
  );

  const ranked = resolution.scores
    .slice()
    .sort((a, b) => b.weight - a.weight || a.question - b.question);
  const maxWeight = Math.max(...ranked.map((s) => s.weight), DEFAULT_CONFIG.MIN_PRIMARY_WEIGHT);

  const add = () => {
    if (!text.trim()) return;
    setEvidence((prev) => [
      ...prev,
      {
        id: nid(),
        responseId: `resp-${prev.length + 1}`,
        probeId: probeId.trim() || "probe-?",
        question,
        kind,
        strength,
        text: text.trim(),
      },
    ]);
    setText("");
    setProbesAsked((p) => p + 1);
  };

  const field =
    "w-full rounded-md border border-input bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

  return (
    <LabPage
      eyebrow="Engine sandbox"
      title="Evidence in, structure out"
      intro="Nothing here asks anyone for a number. Evidence units are what a parsed response would produce; the engine decides whether a coordinate has been earned, or returns Undetermined."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel kicker="Input" title="Add evidence unit">
            <div className="space-y-3">
              <div>
                <label className="mono-label" htmlFor="q">
                  Structural question
                </label>
                <select
                  id="q"
                  className={field}
                  value={question}
                  onChange={(e) => setQuestion(Number(e.target.value) as StructuralQuestionId)}
                >
                  {STRUCTURAL_QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.id} — {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono-label" htmlFor="k">
                  Evidence kind
                </label>
                <select
                  id="k"
                  className={field}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as EvidenceKind)}
                >
                  {EVIDENCE_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label} (×{k.weight})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono-label" htmlFor="p">
                  Source probe (independence key)
                </label>
                <input
                  id="p"
                  className={field}
                  value={probeId}
                  onChange={(e) => setProbeId(e.target.value)}
                />
              </div>
              <div>
                <label className="mono-label" htmlFor="s">
                  Observed strength · {strength.toFixed(2)}
                </label>
                <input
                  id="s"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className="mono-label" htmlFor="t">
                  Research text (normalized to a semantic key)
                </label>
                <textarea
                  id="t"
                  rows={3}
                  className={field}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="stayed after everyone else left the room"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={add}
                  className="rounded-md bg-primary px-3 py-2 font-mono text-xs text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Add unit
                </button>
                <button
                  onClick={() => {
                    setEvidence([]);
                    setProbesAsked(0);
                  }}
                  className="rounded-md border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          </Panel>

          <Panel kicker="Prior" title="Self-report hypothesis">
            <select
              className={field}
              value={hypothesis}
              onChange={(e) =>
                setHypothesis(
                  e.target.value === "" ? "" : (Number(e.target.value) as StructuralQuestionId),
                )
              }
            >
              <option value="">none stated</option>
              {STRUCTURAL_QUESTIONS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id} — {q.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-muted-foreground">
              Carries zero scoring weight. Tracked only so the lab can report where the earned
              result and the starting hypothesis diverge.
            </p>
          </Panel>

          <Panel kicker="Corpus" title={`${evidence.length} raw unit(s)`}>
            <ul className="space-y-2">
              {evidence.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-border bg-surface-2 p-3 text-sm"
                >
                  <div className="mono-label flex justify-between">
                    <span>
                      q{e.question} · {e.kind} · {e.probeId}
                    </span>
                    <button
                      className="hover:text-destructive"
                      onClick={() => setEvidence((p) => p.filter((x) => x.id !== e.id))}
                    >
                      remove
                    </button>
                  </div>
                  <p className="mt-1 text-muted-foreground">{e.text}</p>
                </li>
              ))}
              {evidence.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No evidence. Undetermined is the correct outcome.
                </li>
              ) : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel kicker="Resolution">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="mono-label">Earned coordinate</p>
                <p
                  className={`font-mono text-4xl ${
                    resolution.status === "resolved" ? "text-primary" : "text-caution"
                  }`}
                >
                  {resolution.primary ?? "Undetermined"}
                </p>
              </div>
              <div>
                <p className="mono-label">Support</p>
                <p className="font-mono text-2xl text-signal">{resolution.support ?? "—"}</p>
              </div>
              <div>
                <p className="mono-label">Lead</p>
                <p className="font-mono text-2xl">{resolution.lead.toFixed(3)}</p>
              </div>
              <div>
                <p className="mono-label">Confidence</p>
                <p className="font-mono text-2xl">{resolution.confidence.toFixed(2)}</p>
              </div>
              <div>
                <p className="mono-label">Redundancy collapsed</p>
                <p className="font-mono text-2xl">{resolution.redundancyCollapsed}</p>
              </div>
            </div>

            {resolution.hypothesis ? (
              <p className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">
                Hypothesis {resolution.hypothesis} was a starting point only.{" "}
                {resolution.hypothesisAgrees === null
                  ? "No coordinate was earned, so it remains untested."
                  : resolution.hypothesisAgrees
                    ? "Evidence independently earned the same position."
                    : `Evidence earned position ${resolution.primary} instead.`}
              </p>
            ) : null}

            <ul className="mt-4 space-y-1">
              {resolution.reasons.map((r) => (
                <li key={r} className="font-mono text-xs leading-relaxed text-muted-foreground">
                  › {r}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel kicker="Per-position" title="Evidence, qualification, confidence">
            <ul className="space-y-2">
              {ranked.map((s) => (
                <li key={s.question} className="rounded-md border border-border bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-lg text-primary">{s.question}</span>
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="mono-label ml-auto">
                      W {s.weight.toFixed(3)} · raw {s.raw.toFixed(2)} · avail {s.available} ·
                      corrob {s.corroboration} · conf {s.confidence.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${s.qualified ? "bg-primary" : "bg-caution"}`}
                      style={{ width: `${Math.min(100, (s.weight / maxWeight) * 100)}%` }}
                    />
                  </div>
                  {s.contradictionMass > 0 ? (
                    <p className="mono-label mt-2 text-destructive normal-case tracking-normal">
                      contradiction mass {s.contradictionMass.toFixed(2)} — retained as information
                    </p>
                  ) : null}
                  {!s.qualified && s.weight > 0 ? (
                    <p className="mono-label mt-1 normal-case tracking-normal">
                      qualification: {s.qualificationNotes.join("; ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel kicker="Adaptive probing" title={recommendation.stop ? "Stop" : "Continue"}>
            <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
              <span>probes asked: {probesAsked}</span>
              <span>expected gain: {recommendation.expectedGain.toFixed(2)}</span>
              <span>
                targets:{" "}
                {recommendation.targets.length ? recommendation.targets.join(", ") : "none"}
              </span>
              <button
                className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                onClick={() => setProbesAsked((p) => p + 1)}
              >
                simulate probe
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </LabPage>
  );
}

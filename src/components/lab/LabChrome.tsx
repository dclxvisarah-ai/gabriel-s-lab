import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LAB_STATUS } from "@/lib/lab/spec";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/spec", label: "Spec" },
  { to: "/v2", label: "V2" },
  { to: "/engine", label: "Engine" },
  { to: "/tests", label: "Tests" },
  { to: "/capture", label: "Capture" },
  { to: "/research", label: "Research" },
] as const;

export function LabBanner() {
  return (
    <div className="border-b border-border bg-surface-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2">
        <span className="hatch h-4 w-10 rounded-xs" aria-hidden />
        <span className="mono-label text-caution">{LAB_STATUS.label}</span>
        <p className="mono-label normal-case tracking-normal">{LAB_STATUS.warning}</p>
      </div>
    </div>
  );
}

export function LabNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold text-primary">GN·LAB</span>
          <span className="mono-label hidden sm:inline">Structural Research Laboratory</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function LabPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <LabBanner />
      <LabNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="mono-label text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {intro ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
        ) : null}
        <div className="mt-8">{children}</div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="mono-label normal-case tracking-normal">
            Research artifact. No production formula, no production branch, no vertical-specific
            logic. Research language here is deliberately not user-facing question copy.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Panel({
  title,
  kicker,
  children,
  className = "",
}: {
  title?: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel p-5 ${className}`}>
      {kicker ? <p className="mono-label">{kicker}</p> : null}
      {title ? <h2 className="mt-1 text-lg font-semibold">{title}</h2> : null}
      <div className={title || kicker ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

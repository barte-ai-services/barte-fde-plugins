"use client";

import { useMemo } from "react";
import type { Event, Item, Step } from "@/lib/api";
import { time, pct } from "@/lib/format";

/**
 * The live pipeline.
 *
 * The steps come from the FLOW — the same one the agent runs and the panel edits
 * — so adding a step in front of the client redraws the pipeline without touching
 * this file.
 *
 * It takes the FULL width. Sharing the row with the decision log — the first
 * attempt — left about 700px for five boxes and four arrows: at 1440 the fifth
 * dropped to its own line and the pipeline stopped reading as a pipeline. The log
 * got its own place, next to the queue.
 */
export function Pipeline({
  steps,
  items,
  events,
}: {
  steps: Step[];
  items: Item[];
  events: Event[];
}) {
  const stepState = useMemo(() => {
    const map: Record<string, "idle" | "running" | "done" | "exception"> = {};
    for (const step of steps) map[step.id] = "idle";
    for (const e of events) if (e.type === "step" && e.step in map) map[e.step] = e.state;
    // With nothing in flight the pipeline goes back to idle — otherwise it stays
    // frozen on "running" after the queue drains and looks stuck.
    if (!items.some((i) => i.state === "processing")) {
      for (const step of steps) if (map[step.id] === "running") map[step.id] = "idle";
    }
    return map;
  }, [steps, events, items]);

  return (
    /* Columns by CONTENT rather than a fixed count: a flow may have three steps or
       eight, and a hardcoded five-column grid would leave a hole in one case and
       squeeze the other. `auto-fit` with a minimum width handles both. */
    <div
      className="grid gap-x-1 gap-y-2 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] p-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
    >
      {steps.map((step, i) => (
        <div key={step.id} className="flex min-w-0 items-center gap-1">
          <div className={`min-w-0 flex-1 rounded-[6px] border px-3 py-2 transition-colors ${tone(stepState[step.id])}`}>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot(stepState[step.id])}`} />
              <span className="truncate text-[12px] font-medium text-[var(--content-primary)]">{step.label}</span>
            </div>
            <span className="block text-[11px] leading-tight text-[var(--content-tertiary)]">{step.hint}</span>
          </div>
          {/* The arrow disappears on the last node and on any node ending a row —
              an arrow pointing at the edge of a box is the detail that gives away
              a broken layout. */}
          {i < steps.length - 1 ? (
            <span className="hidden shrink-0 text-[var(--stroke-secondary)] xl:inline" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * What the agent decided, next to the queue.
 *
 * This panel carries the demo's thesis: the agent does not "process", it ACCOUNTS
 * for itself — what it decided, why, how confident, and where it stopped.
 */
export function DecisionLog({ events }: { events: Event[] }) {
  const decisions = events
    .filter((e): e is Extract<Event, { type: "decision" }> => e.type === "decision")
    .slice(-12)
    .reverse();

  return (
    <aside className="flex min-w-0 flex-col gap-2 self-start rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] p-4 xl:sticky xl:top-0">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--content-primary)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--bg-brand)]" />
        O que o agente decidiu
      </span>
      {decisions.length === 0 ? (
        <span className="text-[12px] text-[var(--content-tertiary)]">
          Nada ainda — execute a esteira e acompanhe por aqui.
        </span>
      ) : (
        <ol className="list-none pl-0 flex flex-col gap-2">
          {decisions.map((d, i) => (
            <li key={i} className="border-l-2 border-[var(--stroke-brand)] pl-2 text-[12px] leading-snug">
              <span className="text-[var(--content-primary)]">{d.action}</span>{" "}
              <span className="text-[var(--content-tertiary)]">
                · {time(d.at)} · {pct(d.confidence)}
              </span>
              <p className="text-[var(--content-secondary)]">{d.reason}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

const tone = (state: string) =>
  state === "running"
    ? "border-[var(--stroke-brand)] bg-[var(--bg-brand-light)]"
    : state === "done"
      ? "border-[var(--accent-green)] bg-[var(--accent-green-light)]"
      : state === "exception"
        ? "border-[var(--accent-red)] bg-[var(--accent-red-light)]"
        : "border-[var(--stroke-primary)] bg-[var(--bg-secondary)]";

const dot = (state: string) =>
  state === "running"
    ? "bg-[var(--bg-brand)] animate-pulse"
    : state === "done"
      ? "bg-[var(--accent-green)]"
      : state === "exception"
        ? "bg-[var(--accent-red)]"
        : "bg-[var(--stroke-secondary)]";

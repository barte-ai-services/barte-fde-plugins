"use client";

import type { Item } from "@/lib/api";
import { brl } from "@/lib/format";
import { useVocabulary } from "@/lib/vocabulary";

/**
 * The stat band. Four numbers, with what each one means underneath.
 *
 * This is where the client reads the value of the thing in three seconds, so the
 * numbers have to be THEIRS — and so do the words, which come from the
 * vocabulary.
 *
 * Only the money card carries the brand: four pink cards highlight nothing, and
 * the number that drives the conversation is that one.
 */
export function Stats({ items }: { items: Item[] }) {
  const vocabulary = useVocabulary();
  const ready = items.filter((i) => i.state === "ready");
  const review = items.filter((i) => i.state === "review");
  const queued = items.filter((i) => i.state === "pending" || i.state === "processing");
  const total = items.reduce((s, i) => s + Number((i.document.content as any).valorTotal ?? 0), 0);
  const automated = items.length ? Math.round((ready.length / items.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat value={String(queued.length)} label={vocabulary.stats.queued} hint="aguardando o agente" />
      <Stat
        value={String(ready.length)}
        label={vocabulary.stats.ready}
        hint={`${automated}% da esteira, sem toque humano`}
        tone="green"
      />
      <Stat
        value={String(review.length)}
        label={vocabulary.stats.review}
        hint="o agente parou e explicou por quê"
        tone="red"
      />
      <Stat value={brl(total)} label={vocabulary.stats.amount} hint="soma do que está na esteira" tone="brand" />
    </div>
  );
}

function Stat({
  value,
  label,
  hint,
  tone = "neutral",
}: {
  value: string;
  label: string;
  hint: string;
  tone?: "neutral" | "brand" | "green" | "red";
}) {
  const border = {
    neutral: "border-[var(--stroke-primary)]",
    brand: "border-[var(--stroke-brand)]",
    green: "border-[var(--accent-green)]",
    red: "border-[var(--accent-red)]",
  }[tone];
  const ink = {
    neutral: "text-[var(--content-primary)]",
    brand: "text-[var(--content-brand)]",
    green: "text-[var(--accent-green-dark)]",
    red: "text-[var(--accent-red-dark)]",
  }[tone];

  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] px-4 py-3">
      {/* The colour is a bar on top rather than a card background: a coloured
          surface would fight with the pills in the table right below. */}
      <span className={`-mx-4 -mt-3 mb-2 h-[3px] rounded-t-[8px] border-t-[3px] ${border}`} />
      <span className={`truncate text-[20px] font-semibold ${ink}`}>{value}</span>
      <span className="text-[12px] text-[var(--content-secondary)]">{label}</span>
      <span className="text-[11px] text-[var(--content-tertiary)]">{hint}</span>
    </div>
  );
}

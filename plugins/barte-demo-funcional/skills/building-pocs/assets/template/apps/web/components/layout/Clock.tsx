"use client";

import { useEffect, useState } from "react";

/**
 * The live clock. Costs three lines and is what makes the screen look like a
 * system in operation rather than a screenshot — Barte's consoles have carried
 * one forever, for the same reason.
 *
 * Starts EMPTY and only writes the time after mounting: rendering `new Date()` on
 * the server and again on the client gives two different texts for the same node,
 * which is a hydration error — and a hydration error takes the whole page's
 * interactivity down.
 */
export function Clock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const read = () => setNow(new Date().toLocaleTimeString("pt-BR"));
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="flex items-center gap-2 text-[12px] text-[var(--content-tertiary)]">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--bg-brand)]" />
      {now || "—"}
    </span>
  );
}

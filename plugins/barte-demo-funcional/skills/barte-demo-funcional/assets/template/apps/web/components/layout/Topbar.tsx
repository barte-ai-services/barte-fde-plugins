"use client";

import { Breadcrumb } from "barte-design-system";
import { useVocabulary } from "@/lib/vocabulary";
import { Clock } from "./Clock";

/**
 * Thin topbar with the DS breadcrumb and the live clock.
 *
 * Infrastructure health moved out of here: it lives at the bottom of the sidebar,
 * in the stack panel. The top of the screen belongs to the client, not to the
 * architecture.
 *
 * `flex-none` is not decoration: without it the height is only the flex basis and
 * the browser SHRINKS the bar when the content is tall.
 */
export function Topbar() {
  const vocabulary = useVocabulary();
  return (
    <header className="flex h-[var(--app-header-height)] flex-none items-center justify-between gap-4 border-b border-[var(--stroke-primary)] bg-[var(--bg-primary)] px-8">
      <Breadcrumb items={[{ label: vocabulary.client }, { label: vocabulary.module }]} />
      <Clock />
    </header>
  );
}

"use client";

import { Logo, MenuLeaf, MenuTitle, Sidebar } from "barte-design-system";
import { usePathname, useRouter } from "next/navigation";
import { initials, useVocabulary } from "@/lib/vocabulary";
import { StackPanel } from "./StackPanel";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const vocabulary = useVocabulary();

  return (
    <div className="flex h-full flex-col border-r border-[var(--stroke-primary)] bg-[var(--bg-primary)]">
      {/* Same height as the Topbar (`--app-header-height`): both bottom borders
          land on the same y and form the cross with the vertical border here. */}
      <div className="flex h-[var(--app-header-height)] flex-none items-center border-b border-[var(--stroke-primary)] px-8">
        {/* `brand` is the PINK wordmark. The DS default is `inverse` (white, for
            dark backgrounds) and `default` comes out black — on a light surface
            either one delivers a brand that is not the brand. */}
        <Logo type="full" variant="brand" />
      </div>

      {/* `app-shell-nav` styles nothing: it is the anchor for the override that
          removes the DS Sidebar's own right border (globals.css). Drop the class
          and the ghost vertical line comes back. */}
      <div className="app-shell-nav min-h-0 flex-auto overflow-hidden p-2">
        <Sidebar>
          <div className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-xs)] overflow-y-auto">
            <MenuTitle title="Operação" type="title" />
            {/* The menu is the module from the vocabulary: switching the demo to
                accounts receivable renames it here with no code change. */}
            <MenuLeaf
              label={vocabulary.module}
              isActive={pathname.startsWith("/pipeline")}
              onClick={() => router.push("/pipeline")}
            />
          </div>
        </Sidebar>
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-[var(--stroke-primary)] px-3 py-3">
        <StackPanel />
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-brand)] text-[11px] font-semibold text-[var(--content-alwaysLight)]">
            {initials(vocabulary.client)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-[var(--content-primary)]">
              {vocabulary.client}
            </span>
            <span className="truncate text-[11px] text-[var(--content-tertiary)]">
              Financeiro · {vocabulary.module}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

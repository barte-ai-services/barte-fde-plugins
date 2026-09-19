import type { ReactNode } from "react";
import { VocabularyProvider } from "@/lib/vocabulary";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

/** Two columns: sidebar on the left, topbar plus scrollable content on the right. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <VocabularyProvider>
      <div className="grid h-screen grid-cols-[264px_1fr] overflow-hidden bg-[var(--bg-secondary)]">
        <aside className="h-screen overflow-hidden">
          <AppSidebar />
        </aside>
        <div className="flex h-screen min-w-0 flex-col overflow-hidden">
          <Topbar />
          <main className="min-h-0 flex-auto overflow-y-auto px-8 py-6">{children}</main>
        </div>
      </div>
    </VocabularyProvider>
  );
}

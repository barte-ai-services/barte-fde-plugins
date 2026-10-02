import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/AppShell";

const API = process.env.NEXT_PUBLIC_API ?? "http://127.0.0.1:8080/api";

/**
 * The tab title comes from the demo's vocabulary, so renaming the module renames
 * the tab too.
 *
 * Wrapped in try/catch with a fallback because this runs on the server, at render
 * time: if the API is not up yet the page still has to render. A layout that
 * throws here takes the whole screen down over a title.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const flow = await fetch(`${API}/flow`, { cache: "no-store" }).then((r) => r.json());
    const v = flow.vocabulary ?? {};
    return {
      title: `Barte · ${v.client ?? "Demo"} · ${v.module ?? "Contas a Pagar"}`,
      description: "Esteira com agente — demo funcional da Barte.",
    };
  } catch {
    return { title: "Barte · Demo", description: "Esteira com agente — demo funcional da Barte." };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

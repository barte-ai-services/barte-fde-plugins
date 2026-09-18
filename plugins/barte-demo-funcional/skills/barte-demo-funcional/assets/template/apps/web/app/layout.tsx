import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  // "Barte · <Cliente> · <Tema>" — é o título que aparece na aba quando você
  // compartilha a tela, e é a primeira coisa que o cliente lê.
  title: "Barte · Demo · Contas a Pagar",
  description: "Esteira de contas a pagar com agente — demo funcional.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

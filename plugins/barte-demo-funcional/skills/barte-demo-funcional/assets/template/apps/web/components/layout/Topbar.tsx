"use client";

import { Breadcrumb } from "barte-design-system";
import { usePathname } from "next/navigation";
import { rotuloDaTela } from "@/lib/nav";
import { Relogio } from "./Relogio";

/**
 * Topbar fina com o breadcrumb do DS e o relógio ao vivo.
 *
 * A saúde da infraestrutura saiu daqui: ela vive no rodapé da barra lateral, no
 * painel da stack. O topo da tela é do cliente, não da arquitetura.
 *
 * `flex-none` não é enfeite: sem ele a altura é só a base do flex e o browser
 * ENCOLHE a barra quando o conteúdo é alto.
 */
export function Topbar() {
  const pathname = usePathname();
  return (
    <header className="flex h-[var(--app-header-height)] flex-none items-center justify-between gap-4 border-b border-[var(--stroke-primary)] bg-[var(--bg-primary)] px-8">
      <Breadcrumb items={[{ label: "Cliente Demo" }, { label: rotuloDaTela(pathname) }]} />
      <Relogio />
    </header>
  );
}

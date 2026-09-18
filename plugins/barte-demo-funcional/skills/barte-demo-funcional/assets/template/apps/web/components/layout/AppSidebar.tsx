"use client";

import { Logo, MenuLeaf, MenuTitle, Sidebar } from "barte-design-system";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { PainelStack } from "./PainelStack";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-[var(--stroke-primary)] bg-[var(--bg-primary)]">
      {/* Mesma altura do Topbar (`--app-header-height`): as duas bordas
          inferiores caem no mesmo y e formam a cruz com a borda vertical daqui. */}
      <div className="flex h-[var(--app-header-height)] flex-none items-center border-b border-[var(--stroke-primary)] px-8">
        {/* `brand` é o wordmark ROSA. O default do DS é `inverse` (branco, para
            fundo escuro) e `default` sai preto — num fundo claro os dois entregam
            uma marca que não é a marca. */}
        <Logo type="full" variant="brand" />
      </div>

      {/* `app-shell-nav` não estiliza nada: é a âncora do override que apaga a
          borda direita do Sidebar do DS (globals.css). Se esta classe sair, a
          linha vertical fantasma volta. */}
      <div className="app-shell-nav min-h-0 flex-auto overflow-hidden p-2">
        <Sidebar>
          <div className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-xs)] overflow-y-auto">
            {NAV_GROUPS.flatMap((grupo) => [
              <MenuTitle key={grupo.key} title={grupo.label} type="title" />,
              ...grupo.items.map((item) => (
                <MenuLeaf
                  key={item.key}
                  label={item.label}
                  isActive={pathname.startsWith(item.href)}
                  onClick={() => router.push(item.href)}
                />
              )),
            ])}
          </div>
        </Sidebar>
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-[var(--stroke-primary)] px-3 py-3">
        <PainelStack />
        {/* O nome do cliente vive aqui. Trocar a demo de cliente passa por esta
            linha e pelo <title> do layout — em nenhum outro lugar. */}
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-brand)] text-[11px] font-semibold text-[var(--content-alwaysLight)]">
            CD
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-[var(--content-primary)]">Cliente Demo</span>
            <span className="truncate text-[11px] text-[var(--content-tertiary)]">Financeiro · Contas a Pagar</span>
          </span>
        </div>
      </div>
    </div>
  );
}

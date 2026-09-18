export interface NavItem {
  key: string;
  label: string;
  href: string;
}
export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * A navegação como DADO, e não como markup.
 *
 * Trocar o menu por cliente é editar esta lista — é o primeiro lugar que se
 * toca ao re-skinar a demo, e o único que precisa ser tocado para isso.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "operacao",
    label: "Operação",
    items: [{ key: "esteira", label: "Contas a Pagar", href: "/esteira" }],
  },
];

export function rotuloDaTela(pathname: string): string {
  const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href));
  return item?.label ?? "Início";
}

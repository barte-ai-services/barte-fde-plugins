"use client";

import type { Item } from "@/lib/api";
import { brl } from "@/lib/format";

/**
 * A statband. Quatro números, e embaixo o que cada número significa.
 *
 * É aqui que o cliente lê o valor da coisa em três segundos, então os números
 * têm de ser os DELE: volume em fila, o que já saiu pronto, o que travou e
 * quanto dinheiro isso representa.
 *
 * O cartão do dinheiro é o único com a marca — quatro cartões rosa não destacam
 * nada, e o número que decide a conversa é esse.
 */
export function Kpis({ itens }: { itens: Item[] }) {
  const prontos = itens.filter((i) => i.estado === "pronto");
  const revisao = itens.filter((i) => i.estado === "revisao");
  const fila = itens.filter((i) => i.estado === "pendente" || i.estado === "processando");
  const total = itens.reduce((s, i) => s + Number((i.documento.conteudo as any).valorTotal ?? 0), 0);
  const automatico = itens.length ? Math.round((prontos.length / itens.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi valor={String(fila.length)} rotulo="na fila" sub="aguardando o agente" />
      <Kpi
        valor={String(prontos.length)}
        rotulo="prontos para aprovação"
        sub={`${automatico}% da esteira, sem toque humano`}
        cor="verde"
      />
      <Kpi
        valor={String(revisao.length)}
        rotulo="em revisão humana"
        sub="o agente parou e explicou por quê"
        cor="vermelho"
      />
      <Kpi valor={brl(total)} rotulo="valor na esteira" sub="soma dos documentos recebidos" cor="marca" />
    </div>
  );
}

function Kpi({
  valor,
  rotulo,
  sub,
  cor = "neutro",
}: {
  valor: string;
  rotulo: string;
  sub: string;
  cor?: "neutro" | "marca" | "verde" | "vermelho";
}) {
  const borda = {
    neutro: "border-[var(--stroke-primary)]",
    marca: "border-[var(--stroke-brand)]",
    verde: "border-[var(--accent-green)]",
    vermelho: "border-[var(--accent-red)]",
  }[cor];
  const tinta = {
    neutro: "text-[var(--content-primary)]",
    marca: "text-[var(--content-brand)]",
    verde: "text-[var(--accent-green-dark)]",
    vermelho: "text-[var(--accent-red-dark)]",
  }[cor];

  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] px-4 py-3">
      {/* A cor entra como uma barra no topo, e não como fundo do cartão: fundo
          colorido brigaria com os Pills da tabela logo abaixo. */}
      <span className={`-mx-4 -mt-3 mb-2 h-[3px] rounded-t-[8px] border-t-[3px] ${borda}`} />
      <span className={`truncate text-[20px] font-semibold ${tinta}`}>{valor}</span>
      <span className="text-[12px] text-[var(--content-secondary)]">{rotulo}</span>
      <span className="text-[11px] text-[var(--content-tertiary)]">{sub}</span>
    </div>
  );
}

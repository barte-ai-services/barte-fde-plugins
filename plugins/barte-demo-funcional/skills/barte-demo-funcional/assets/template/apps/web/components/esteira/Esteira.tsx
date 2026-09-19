"use client";

import { useMemo } from "react";
import type { Etapa, Evento, Item } from "@/lib/api";
import { hora, pct } from "@/lib/format";

/**
 * A esteira ao vivo.
 *
 * As etapas vêm do FLUXO — o mesmo que o agente executa e que o painel edita —,
 * então acrescentar uma etapa na frente do cliente redesenha a esteira sem
 * passar por aqui.
 *
 * Ocupa a LARGURA INTEIRA. Dividir a linha com o log de decisões — que foi a
 * primeira tentativa — deixava cerca de 700px para cinco caixas mais quatro
 * setas: em 1440 a quinta caía sozinha na linha de baixo e a esteira deixava de
 * se ler como uma esteira. O log ganhou lugar próprio, ao lado da fila.
 *
 * Grid e não `flex`: com colunas de mesma largura os nós não mudam de tamanho
 * conforme o texto, então nada dança quando um deles acende.
 */
export function Esteira({
  etapas,
  itens,
  eventos,
}: {
  etapas: Etapa[];
  itens: Item[];
  eventos: Evento[];
}) {
  const estadoDoNo = useMemo(() => {
    const mapa: Record<string, "ocioso" | "executando" | "concluido" | "excecao"> = {};
    for (const etapa of etapas) mapa[etapa.id] = "ocioso";
    for (const e of eventos) if (e.tipo === "no" && e.no in mapa) mapa[e.no] = e.estado;
    // Sem nada em curso a esteira volta a ociosa — senão ela fica congelada em
    // "executando" depois que a fila esvazia e parece travada.
    if (!itens.some((i) => i.estado === "processando")) {
      for (const etapa of etapas) if (mapa[etapa.id] === "executando") mapa[etapa.id] = "ocioso";
    }
    return mapa;
  }, [etapas, eventos, itens]);

  return (
    /* Colunas por CONTEÚDO, e não um número fixo: o fluxo pode ter três etapas
       ou oito, e um `grid-cols-5` cravado deixaria buraco num caso e espremeria
       o outro. `auto-fit` com largura mínima resolve os dois. */
    <div
      className="grid gap-x-1 gap-y-2 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] p-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
    >
      {etapas.map((etapa, i) => (
        <div key={etapa.id} className="flex min-w-0 items-center gap-1">
          <div className={`min-w-0 flex-1 rounded-[6px] border px-3 py-2 transition-colors ${cor(estadoDoNo[etapa.id])}`}>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${ponto(estadoDoNo[etapa.id])}`} />
              <span className="truncate text-[12px] font-medium text-[var(--content-primary)]">{etapa.rotulo}</span>
            </div>
            <span className="block text-[11px] leading-tight text-[var(--content-tertiary)]">{etapa.legenda}</span>
          </div>
          {/* A seta some no último nó e em qualquer nó que termine uma linha —
              seta apontando para a borda da caixa é o detalhe que denuncia
              layout quebrado. */}
          {i < etapas.length - 1 ? (
            <span className="hidden shrink-0 text-[var(--stroke-secondary)] xl:inline" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * O que o agente decidiu, ao lado da fila.
 *
 * É este painel que carrega a tese da demo: o agente não "processa", ele
 * PRESTA CONTAS — o que decidiu, por quê, com quanta confiança, e onde parou.
 */
export function LogDecisoes({ eventos }: { eventos: Evento[] }) {
  const decisoes = eventos
    .filter((e): e is Extract<Evento, { tipo: "decisao" }> => e.tipo === "decisao")
    .slice(-12)
    .reverse();

  return (
    <aside className="flex min-w-0 flex-col gap-2 self-start rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] p-4 xl:sticky xl:top-0">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--content-primary)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--bg-brand)]" />
        O que o agente decidiu
      </span>
      {decisoes.length === 0 ? (
        <span className="text-[12px] text-[var(--content-tertiary)]">
          Nada ainda — execute a esteira e acompanhe por aqui.
        </span>
      ) : (
        <ol className="list-none pl-0 flex flex-col gap-2">
          {decisoes.map((d, i) => (
            <li key={i} className="border-l-2 border-[var(--stroke-brand)] pl-2 text-[12px] leading-snug">
              <span className="text-[var(--content-primary)]">{d.acao}</span>{" "}
              <span className="text-[var(--content-tertiary)]">
                · {hora(d.em)} · {pct(d.confianca)}
              </span>
              <p className="text-[var(--content-secondary)]">{d.razao}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

const cor = (estado: string) =>
  estado === "executando"
    ? "border-[var(--stroke-brand)] bg-[var(--bg-brand-light)]"
    : estado === "concluido"
      ? "border-[var(--accent-green)] bg-[var(--accent-green-light)]"
      : estado === "excecao"
        ? "border-[var(--accent-red)] bg-[var(--accent-red-light)]"
        : "border-[var(--stroke-primary)] bg-[var(--bg-secondary)]";

const ponto = (estado: string) =>
  estado === "executando"
    ? "bg-[var(--bg-brand)] animate-pulse"
    : estado === "concluido"
      ? "bg-[var(--accent-green)]"
      : estado === "excecao"
        ? "bg-[var(--accent-red)]"
        : "bg-[var(--stroke-secondary)]";

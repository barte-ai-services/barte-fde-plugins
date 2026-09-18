"use client";

import { useMemo } from "react";
import type { Evento, Item } from "@/lib/api";
import { hora, pct } from "@/lib/format";

const NOS = [
  { key: "leitura", rotulo: "Leitura", sub: "extrai o documento" },
  { key: "cadastro", rotulo: "Cadastro", sub: "identifica o fornecedor" },
  { key: "classificacao", rotulo: "Classificação", sub: "centro de custo e conta" },
  { key: "conformidade", rotulo: "Conformidade", sub: "pedido, retenção, alçada" },
  { key: "proposta", rotulo: "Proposta", sub: "pronta para aprovação" },
] as const;

/**
 * A esteira ao vivo.
 *
 * Ocupa a LARGURA INTEIRA, com os cinco nós em colunas iguais. Dividir a linha
 * com o log de decisões — que foi a primeira tentativa — deixa cerca de 700px
 * para cinco caixas mais quatro setas: em 1440 a quinta cai sozinha na linha de
 * baixo e a esteira deixa de se ler como uma esteira. O log ganhou lugar
 * próprio, ao lado da fila.
 *
 * `grid-cols-5` e não `flex`: com colunas iguais os nós não mudam de largura
 * conforme o texto, então nada dança quando um deles acende.
 */
export function Esteira({ itens, eventos }: { itens: Item[]; eventos: Evento[] }) {
  const estadoDoNo = useMemo(() => {
    const mapa: Record<string, "ocioso" | "executando" | "concluido" | "excecao"> = {};
    for (const no of NOS) mapa[no.key] = "ocioso";
    for (const e of eventos) if (e.tipo === "no") mapa[e.no] = e.estado;
    // Sem nada em curso a esteira volta a ociosa — senão ela fica congelada em
    // "executando" depois que a fila esvazia e parece travada.
    if (!itens.some((i) => i.estado === "processando")) {
      for (const no of NOS) if (mapa[no.key] === "executando") mapa[no.key] = "ocioso";
    }
    return mapa;
  }, [eventos, itens]);

  return (
    <div className="grid grid-cols-2 gap-x-1 gap-y-2 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)] p-4 md:grid-cols-3 xl:grid-cols-5">
      {NOS.map((no, i) => (
        <div key={no.key} className="flex min-w-0 items-center gap-1">
          <div className={`min-w-0 flex-1 rounded-[6px] border px-3 py-2 transition-colors ${cor(estadoDoNo[no.key])}`}>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${ponto(estadoDoNo[no.key])}`} />
              <span className="truncate text-[12px] font-medium text-[var(--content-primary)]">{no.rotulo}</span>
            </div>
            <span className="block text-[11px] leading-tight text-[var(--content-tertiary)]">{no.sub}</span>
          </div>
          {/* A seta some no último nó e em qualquer nó que termine uma linha —
              seta apontando para a borda da caixa é o detalhe que denuncia
              layout quebrado. */}
          {i < NOS.length - 1 ? (
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

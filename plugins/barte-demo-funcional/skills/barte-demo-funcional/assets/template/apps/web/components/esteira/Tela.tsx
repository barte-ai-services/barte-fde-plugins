"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Pills, Table } from "barte-design-system";
import { API, executarEsteira, listarItens, type Evento, type Item } from "@/lib/api";
import { brl, dia, hora, pct } from "@/lib/format";
import { useLargura } from "@/lib/useLargura";
import { Esteira, LogDecisoes } from "./Esteira";
import { Kpis } from "./Kpis";

/**
 * `Pills`, e não `Badge`: o Badge do DS é um PONTO colorido — ele ignora o
 * texto, e a coluna Situação sai com uma bolinha e nada escrito. Quem carrega
 * rótulo é o Pills, via `label`.
 */
const ROTULO: Record<Item["estado"], { texto: string; estado: "default" | "accent" | "success" | "error" }> = {
  pendente: { texto: "Na fila", estado: "default" },
  processando: { texto: "Processando", estado: "accent" },
  pronto: { texto: "Pronto para aprovação", estado: "success" },
  revisao: { texto: "Revisão humana", estado: "error" },
};

export function Tela() {
  const [itens, setItens] = useState<Item[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [executando, setExecutando] = useState(false);
  const largura = useLargura();
  // Abaixo de 1100px as cinco colunas ficam estreitas demais para se ler. Sai o
  // vencimento — que está na gaveta, a um clique — e não a SITUAÇÃO, que é o que
  // a demo existe para mostrar. Esconder coluna é melhor que rolar para o lado:
  // ninguém arrasta tabela na frente do cliente.
  const estreito = largura < 1100;

  useEffect(() => {
    void listarItens().then(setItens).catch(() => undefined);

    /**
     * Uma conexão SSE para a tela inteira.
     *
     * O evento `item` diz "este item mudou no banco" e dispara uma releitura —
     * a lista nunca é remontada a partir do que passou pelo fluxo, só do que
     * está gravado. É o que impede a tela de divergir do banco se um evento se
     * perder no meio de uma reunião.
     */
    const fonte = new EventSource(`${API}/eventos`);
    fonte.onmessage = (e) => {
      const evento = JSON.parse(e.data) as Evento;
      setEventos((atuais) => [...atuais.slice(-400), evento]);
      if (evento.tipo === "item") void listarItens().then(setItens).catch(() => undefined);
    };
    return () => fonte.close();
  }, []);

  const aberto = useMemo(() => itens.find((i) => i.id === abertoId) ?? null, [itens, abertoId]);

  const executar = async () => {
    setExecutando(true);
    try {
      await executarEsteira();
    } finally {
      // O botão volta quando a fila esvazia, não quando o POST responde: o POST
      // só enfileira, e soltar o botão aqui faria a tela dizer "terminou" com o
      // agente ainda trabalhando.
      setExecutando(false);
    }
  };

  const emCurso = itens.some((i) => i.estado === "processando");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* A barra rosa à esquerda do título é a marca aparecendo na tela de
              trabalho, e não só no logotipo do canto — é o que os consoles da
              Barte fazem, e é barato. */}
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-[var(--content-primary)]">
            <span className="inline-block h-6 w-1 rounded-full bg-[var(--bg-brand)]" />
            Contas a Pagar
          </h1>
          <p className="mt-1 text-[13px] text-[var(--content-tertiary)]">
            {itens.length} documento(s) na esteira · o agente lê, confere e propõe —{" "}
            <span className="text-[var(--content-brand)]">quem aprova é você</span>
          </p>
        </div>
        <Button onClick={executar} loading={executando || emCurso} disabled={executando || emCurso}>
          Executar esteira
        </Button>
      </div>

      <Kpis itens={itens} />
      <Esteira itens={itens} eventos={eventos} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_320px]">
      {/* Sem rolagem horizontal, de propósito. Uma tabela que rola para o lado
          esconde justamente a coluna da SITUAÇÃO — que é o que a demo existe
          para mostrar — e obriga quem apresenta a arrastar a tabela na frente do
          cliente. As colunas encolhem e o texto trunca; o detalhe inteiro está a
          um clique, na gaveta. */}
      <div className="min-w-0 rounded-[8px] border border-[var(--stroke-primary)] bg-[var(--bg-primary)]">
        <Table
          data={itens}
          rowKey={(i) => i.id}
          onRowClick={(i) => setAbertoId(i.id)}
          emptyText="Nenhum documento na esteira"
          columns={[
            {
              key: "assunto",
              title: "Documento",
              dataIndex: "documento",
              render: (_v, item) => (
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] text-[var(--content-primary)]">{item.documento.assunto}</span>
                  <span className="truncate text-[12px] text-[var(--content-tertiary)]">{item.documento.remetente}</span>
                </div>
              ),
            },
            {
              key: "fornecedor",
              title: "Fornecedor",
              width: "20%",
              dataIndex: "proposta",
              render: (_v, item) =>
                item.proposta?.fornecedor ?? (
                  <span className="text-[var(--content-tertiary)]">—</span>
                ),
            },
            {
              key: "valor",
              title: "Valor",
              width: "12%",
              dataIndex: "documento",
              align: "right",
              render: (_v, item) => brl(Number((item.documento.conteudo as any).valorTotal ?? 0)),
            },
            ...(estreito
              ? []
              : [
                  {
                    key: "vencimento",
                    title: "Vencimento",
                    width: "11%",
                    dataIndex: "documento" as const,
                    render: (_v: unknown, item: Item) =>
                      dia((item.documento.conteudo as any).vencimento ?? null),
                  },
                ]),
            {
              key: "estado",
              title: "Situação",
              width: "22%",
              dataIndex: "estado",
              render: (_v, item) => (
                <div className="flex flex-col gap-1">
                  <Pills size="sm" variant="light" state={ROTULO[item.estado].estado} label={ROTULO[item.estado].texto} />
                  {item.motivoRevisao ? (
                    <span className="text-[12px] text-[var(--content-tertiary)]">{item.motivoRevisao}</span>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </div>
        <LogDecisoes eventos={eventos} />
      </div>

      <Drawer
        isOpen={aberto !== null}
        title={aberto?.documento.assunto ?? ""}
        onClose={() => setAbertoId(null)}
      >
        {aberto ? <Detalhe item={aberto} /> : null}
      </Drawer>
    </div>
  );
}

function Detalhe({ item }: { item: Item }) {
  const c = item.documento.conteudo as Record<string, any>;
  return (
    <div className="flex flex-col gap-6 py-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Proposta do agente</h3>
        {item.proposta ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <Linha rotulo="Fornecedor" valor={item.proposta.fornecedor} />
            <Linha rotulo="Centro de custo" valor={item.proposta.centroCusto} />
            <Linha rotulo="Conta contábil" valor={item.proposta.contaContabil} />
            <Linha rotulo="Valor" valor={brl(item.proposta.valor)} />
            <Linha rotulo="Vencimento" valor={dia(item.proposta.vencimento)} />
          </dl>
        ) : (
          <p className="text-[13px] text-[var(--content-secondary)]">
            {item.motivoRevisao ?? "Ainda não processado."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Trilha de decisões</h3>
        {item.decisoes.length === 0 ? (
          <p className="text-[13px] text-[var(--content-tertiary)]">Nada registrado ainda.</p>
        ) : (
          <ol className="list-none pl-0 flex flex-col gap-3">
            {item.decisoes.map((d, i) => (
              <li key={i} className="border-l-2 border-[var(--stroke-brand)] pl-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-[var(--content-primary)]">{d.acao}</span>
                  <span className="shrink-0 text-[11px] text-[var(--content-tertiary)]">
                    {hora(d.em)} · confiança {pct(d.confianca)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--content-secondary)]">{d.razao}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Documento</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <Linha rotulo="Recebido em" valor={new Date(item.documento.recebidoEm).toLocaleString("pt-BR")} />
          <Linha rotulo="De" valor={item.documento.remetente} />
          <Linha rotulo="Chave / linha" valor={(c.chave ?? c.linhaDigitavel ?? "—") as string} />
          <Linha rotulo="Descrição" valor={(c.descricao ?? "—") as string} />
        </dl>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">{rotulo}</dt>
      <dd className="text-[var(--content-primary)]">{valor ?? "—"}</dd>
    </div>
  );
}

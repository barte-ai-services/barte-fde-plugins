"use client";

import { useEffect, useState } from "react";
import { Drawer } from "barte-design-system";
import { saude, type Chamada, type Evento, type Stack } from "@/lib/api";
import { API } from "@/lib/api";

/**
 * A stack da demo: o bloco no rodapé da barra lateral e o painel que ele abre.
 *
 * Existe por causa de uma pergunta que sempre vem, e que costuma ser respondida
 * com uma afirmação: "isso está mesmo rodando?". Aqui a resposta é a tela — as
 * peças com a saúde de cada uma, e as chamadas ao banco, ao S3 e à fila
 * aparecendo ao vivo com a duração em milissegundos, enquanto a esteira anda.
 *
 * Fica no RODAPÉ, e não no topo, de propósito: a conversa da reunião é a dor do
 * cliente, e a arquitetura é o que se abre quando alguém pergunta. Deixá-la
 * aberta o tempo todo rouba a atenção da tela que importa.
 */
export function PainelStack() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [aberto, setAberto] = useState(false);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);

  useEffect(() => {
    let vivo = true;
    const ler = async () => {
      try {
        const r = await saude();
        if (vivo) setStack(r);
      } catch {
        if (vivo) setStack(null);
      }
    };
    void ler();
    const t = setInterval(ler, 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    // O fluxo de chamadas só é assinado com o painel ABERTO: são dezenas de
    // eventos por execução, e guardá-los com o painel fechado é encher a memória
    // da aba com o que ninguém vai ver.
    if (!aberto) return;
    const fonte = new EventSource(`${API}/eventos`);
    fonte.onmessage = (e) => {
      const evento = JSON.parse(e.data) as Evento;
      if (evento.tipo === "telemetria") {
        setChamadas((atuais) => [evento.chamada, ...atuais].slice(0, 60));
      }
    };
    return () => fonte.close();
  }, [aberto]);

  const tudoOk = stack?.pecas.every((p) => p.ok) ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-between gap-2 rounded-[6px] border border-[var(--stroke-primary)] px-3 py-2 text-left transition-colors hover:border-[var(--stroke-brand)] hover:bg-[var(--bg-secondary)]"
      >
        <span className="flex flex-col">
          <span className="text-[12px] font-medium text-[var(--content-primary)]">A stack desta demo</span>
          <span className="text-[11px] text-[var(--content-tertiary)]">
            {stack ? `${stack.pecas.filter((p) => p.ok).length}/${stack.pecas.length} de pé · agente ${stack.motor}` : "verificando…"}
          </span>
        </span>
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${tudoOk ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
        />
      </button>

      <Drawer isOpen={aberto} title="A stack desta demo" onClose={() => setAberto(false)}>
        <div className="flex flex-col gap-6 py-2">
          <section className="flex flex-col gap-2">
            <p className="text-[12px] text-[var(--content-secondary)]">
              Tudo abaixo roda na sua máquina, em contêiner, com as mesmas APIs da AWS. O que muda
              numa instalação de verdade é o endereço de cada peça — não o código.
            </p>
            <ul className="list-none pl-0 flex flex-col gap-2">
              {(stack?.pecas ?? []).map((peca) => (
                <li
                  key={peca.nome}
                  className="flex items-start gap-3 rounded-[6px] border border-[var(--stroke-primary)] px-3 py-2"
                >
                  <span
                    className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${peca.ok ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-medium text-[var(--content-primary)]">
                      {peca.nome} <span className="font-normal text-[var(--content-tertiary)]">· {peca.tecnologia}</span>
                    </span>
                    <span className="text-[12px] text-[var(--content-secondary)]">{peca.papel}</span>
                    {peca.detalhe ? (
                      <span className="text-[11px] text-[var(--accent-red)]">{peca.detalhe}</span>
                    ) : null}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-[var(--content-tertiary)]">{peca.ms} ms</span>
                </li>
              ))}
            </ul>
          </section>

          {stack?.telemetria.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Chamadas por peça</h3>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[var(--content-tertiary)]">
                    <th className="font-normal">peça</th>
                    <th className="font-normal">chamadas</th>
                    <th className="font-normal">mediana</th>
                    <th className="font-normal">pior</th>
                  </tr>
                </thead>
                <tbody>
                  {stack.telemetria.map((t) => (
                    <tr key={t.peca} className="border-t border-[var(--stroke-primary)]">
                      <td className="py-1 text-[var(--content-primary)]">{t.peca}</td>
                      <td>{t.chamadas}</td>
                      <td>{t.medianaMs} ms</td>
                      <td>{t.piorMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="flex min-h-0 flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--content-primary)]">Ao vivo</h3>
            {chamadas.length === 0 ? (
              <p className="text-[12px] text-[var(--content-tertiary)]">
                Execute a esteira com este painel aberto: cada ida ao banco, ao S3 e à fila aparece
                aqui, na hora, com a duração.
              </p>
            ) : (
              <ol className="list-none pl-0 flex flex-col gap-1 font-mono text-[11px]">
                {chamadas.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${c.ok ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"}`}
                    />
                    <span className="w-16 shrink-0 text-[var(--content-brand)]">{c.peca}</span>
                    <span className="min-w-0 flex-1 truncate text-[var(--content-secondary)]">{c.operacao}</span>
                    <span className="shrink-0 text-[var(--content-tertiary)]">{c.ms} ms</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </Drawer>
    </>
  );
}

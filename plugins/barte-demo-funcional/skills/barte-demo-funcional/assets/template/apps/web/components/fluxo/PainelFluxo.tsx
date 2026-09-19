"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Drawer } from "barte-design-system";
import {
  ErroDeFluxo,
  lerArquivoDoFluxo,
  lerCatalogo,
  restaurarFluxo,
  salvarArquivoDoFluxo,
  salvarFluxo,
  type Catalogo,
  type Etapa,
  type Fluxo,
} from "@/lib/api";

/**
 * Onde o fluxo é montado durante a reunião.
 *
 * Duas abas para duas pessoas: **Etapas** é um formulário — menus e caixas de
 * marcar, sem sintaxe para errar — e é por onde quem é do comercial acrescenta
 * uma etapa enquanto o cliente descreve o processo dele. **Arquivo** é o YAML
 * cru, para quem prefere editar direto.
 *
 * As duas passam pela MESMA validação no servidor. O que não passa não é
 * aplicado, e o fluxo que está rodando continua rodando — o pior desfecho
 * possível aqui seria a demo parar de funcionar por causa de um dedo torto no
 * meio da apresentação.
 */
export function PainelFluxo({
  aberto,
  fluxo,
  onFechar,
  onAplicado,
}: {
  aberto: boolean;
  fluxo: Fluxo | null;
  onFechar: () => void;
  onAplicado: (novo: Fluxo) => void;
}) {
  const [aba, setAba] = useState<"etapas" | "arquivo">("etapas");
  const [rascunho, setRascunho] = useState<Fluxo | null>(fluxo);
  const [texto, setTexto] = useState("");
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    void lerCatalogo().then(setCatalogo).catch(() => undefined);
  }, []);

  // O fluxo vivo entra por REF, e não pela lista de dependências do efeito
  // abaixo. Depender dele fazia o efeito rodar no instante em que "Aplicar"
  // funcionava — porque aplicar muda o fluxo no pai — e a confirmação verde
  // sumia antes de alguém ler, com a aplicação tendo dado certo.
  const fluxoVivo = useRef(fluxo);
  fluxoVivo.current = fluxo;

  // O rascunho é recarregado a cada ABERTURA: sair sem aplicar tem de DESCARTAR
  // o que foi rabiscado, e não guardar uma edição fantasma para a próxima vez
  // que o painel abrir.
  useEffect(() => {
    if (!aberto) return;
    setRascunho(fluxoVivo.current);
    setProblemas([]);
    setAplicado(false);
    void lerArquivoDoFluxo().then(setTexto).catch(() => undefined);
  }, [aberto]);

  if (!rascunho) return null;

  const trocar = (i: number, mudanca: Partial<Etapa>) =>
    setRascunho({
      ...rascunho,
      etapas: rascunho.etapas.map((e, j) => (i === j ? { ...e, ...mudanca } : e)),
    });

  const mover = (i: number, direcao: -1 | 1) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= rascunho.etapas.length) return;
    const etapas = [...rascunho.etapas];
    [etapas[i], etapas[destino]] = [etapas[destino], etapas[i]];
    setRascunho({ ...rascunho, etapas });
  };

  const remover = (i: number) =>
    setRascunho({ ...rascunho, etapas: rascunho.etapas.filter((_, j) => j !== i) });

  const acrescentar = () => {
    // O id é derivado do número da etapa e não pedido a quem está montando:
    // ninguém numa reunião quer inventar um identificador único. Se já existir,
    // anda até achar um livre.
    let n = rascunho.etapas.length + 1;
    while (rascunho.etapas.some((e) => e.id === `etapa-${n}`)) n += 1;
    setRascunho({
      ...rascunho,
      etapas: [
        ...rascunho.etapas,
        {
          id: `etapa-${n}`,
          rotulo: "Nova etapa",
          legenda: "",
          acao: catalogo?.acoes[0]?.id ?? "conferir",
          escalaSe: [],
        },
      ],
    });
  };

  const aplicar = async (f: () => Promise<Fluxo>) => {
    setSalvando(true);
    setProblemas([]);
    try {
      const novo = await f();
      setRascunho(novo);
      setTexto(await lerArquivoDoFluxo());
      onAplicado(novo);
      setAplicado(true);
    } catch (erro) {
      setProblemas(erro instanceof ErroDeFluxo ? erro.problemas : [(erro as Error).message]);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer isOpen={aberto} title="O fluxo desta demo" onClose={onFechar}>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-[12px] text-[var(--content-secondary)]">
          A esteira executa exatamente o que estiver aqui. O que você aplicar vale a partir do
          próximo documento processado — sem reiniciar nada.
        </p>

        <div className="flex gap-1 border-b border-[var(--stroke-primary)]">
          {(["etapas", "arquivo"] as const).map((chave) => (
            <button
              key={chave}
              type="button"
              onClick={() => setAba(chave)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] ${
                aba === chave
                  ? "border-[var(--stroke-brand)] text-[var(--content-brand)]"
                  : "border-transparent text-[var(--content-tertiary)]"
              }`}
            >
              {chave === "etapas" ? "Etapas" : "Arquivo (YAML)"}
            </button>
          ))}
        </div>

        {problemas.length > 0 ? (
          <div className="flex flex-col gap-1 rounded-[6px] border border-[var(--accent-red)] bg-[var(--accent-red-light)] px-3 py-2">
            <span className="text-[12px] font-semibold text-[var(--accent-red-dark)]">
              Não apliquei — o fluxo que está rodando continua o mesmo.
            </span>
            {problemas.map((p, i) => (
              <span key={i} className="text-[12px] text-[var(--content-secondary)]">
                · {p}
              </span>
            ))}
          </div>
        ) : null}

        {aplicado ? (
          <div className="rounded-[6px] border border-[var(--accent-green)] bg-[var(--accent-green-light)] px-3 py-2 text-[12px] text-[var(--accent-green-dark)]">
            Aplicado. Execute a esteira para ver o fluxo novo rodando.
          </div>
        ) : null}

        {aba === "etapas" ? (
          <div className="flex flex-col gap-3">
            {rascunho.etapas.map((etapa, i) => (
              <div
                key={etapa.id}
                className="flex flex-col gap-2 rounded-[6px] border border-[var(--stroke-primary)] p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-brand-light)] text-[11px] font-semibold text-[var(--content-brand)]">
                    {i + 1}
                  </span>
                  <input
                    value={etapa.rotulo}
                    onChange={(e) => trocar(i, { rotulo: e.target.value })}
                    className="min-w-0 flex-1 rounded-[4px] border border-[var(--stroke-primary)] px-2 py-1 text-[13px]"
                    placeholder="Nome da etapa"
                  />
                  <button type="button" onClick={() => mover(i, -1)} className="px-1 text-[13px] text-[var(--content-tertiary)]" aria-label="subir">
                    ↑
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} className="px-1 text-[13px] text-[var(--content-tertiary)]" aria-label="descer">
                    ↓
                  </button>
                  <button type="button" onClick={() => remover(i)} className="px-1 text-[13px] text-[var(--accent-red)]" aria-label="remover">
                    ×
                  </button>
                </div>

                <input
                  value={etapa.legenda}
                  onChange={(e) => trocar(i, { legenda: e.target.value })}
                  className="rounded-[4px] border border-[var(--stroke-primary)] px-2 py-1 text-[12px]"
                  placeholder="A linha pequena que aparece na esteira"
                />

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
                    O que o agente faz aqui
                  </span>
                  <select
                    value={etapa.acao}
                    onChange={(e) => trocar(i, { acao: e.target.value })}
                    className="rounded-[4px] border border-[var(--stroke-primary)] px-2 py-1 text-[13px]"
                  >
                    {(catalogo?.acoes ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.rotulo}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="flex flex-col gap-1">
                  <legend className="text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
                    Parar e chamar um humano se…
                  </legend>
                  {(catalogo?.condicoes ?? []).map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={etapa.escalaSe.includes(c.id)}
                        onChange={(e) =>
                          trocar(i, {
                            escalaSe: e.target.checked
                              ? [...etapa.escalaSe, c.id]
                              : etapa.escalaSe.filter((x) => x !== c.id),
                          })
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-[var(--content-primary)]">{c.rotulo}</span>{" "}
                        <span className="text-[var(--content-tertiary)]">— {c.descricao}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ))}

            <button
              type="button"
              onClick={acrescentar}
              className="rounded-[6px] border border-dashed border-[var(--stroke-secondary)] py-2 text-[13px] text-[var(--content-secondary)] hover:border-[var(--stroke-brand)] hover:text-[var(--content-brand)]"
            >
              + acrescentar etapa
            </button>
          </div>
        ) : (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            spellCheck={false}
            className="h-[420px] w-full rounded-[6px] border border-[var(--stroke-primary)] p-3 font-mono text-[12px] leading-relaxed"
          />
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--stroke-primary)] pt-3">
          <Button
            loading={salvando}
            onClick={() =>
              aplicar(() => (aba === "etapas" ? salvarFluxo(rascunho) : salvarArquivoDoFluxo(texto)))
            }
          >
            Aplicar
          </Button>
          <Button variant="ghost" disabled={salvando} onClick={() => aplicar(restaurarFluxo)}>
            Voltar ao original
          </Button>
          <span className="text-[11px] text-[var(--content-tertiary)]">
            “Voltar ao original” relê o arquivo dados/fluxo.yaml.
          </span>
        </div>
      </div>
    </Drawer>
  );
}

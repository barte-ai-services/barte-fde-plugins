"use client";

/*
 * GUIDED DEMONSTRATION — the engine, plus ONE EXAMPLE SCRIPT.
 *
 * Reusable as is: the Piloto component, the cursor, `visivel`, `parado`, `trazer`
 * and the `Mao` helpers (dizer, clicar, apontar, digitar, ate, dorme).
 *
 * Replace for each POC:
 *   - `roteiro()`: the steps of the story. The one below is the example from the
 *     reference POC (expense reconciliation) and names its screens and data.
 *   - the three imports from "@/lib/api": a call that restarts the POC, a summary
 *     with the counters to wait on, and the list the script picks its targets from.
 *   - the `data-tour`, `data-lanc` and `data-kcard` attributes the script aims at:
 *     add equivalents to the controls of the new screen.
 *
 * The comments and the on-screen text are in Portuguese because the reference POC's
 * code was; a new POC writes identifiers and comments in English and keeps only the
 * captions in Portuguese.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getLancs, getResumo, type Lanc, reiniciar } from "@/lib/api";

/**
 * A demonstracao guiada: um cursor que opera a tela como a controladoria operaria.
 *
 * Nada e' encenado. O cursor clica nos MESMOS botoes que uma pessoa clicaria
 * (el.click()), entao a decisao retoma o workflow no Loom, o complemento cai no
 * S3 e o retorno sai pelo SES. O roteiro so' escolhe onde clicar e o que dizer.
 * Ele sempre recomeca a demo do zero, para partir do mesmo ponto.
 */

type Alvo = string | (() => Element | null | undefined);
type Mem = { antes: Set<string>; email?: Lanc; fornecedor?: Lanc; conta?: Lanc; historico?: Lanc };
type Mao = {
  dizer: (titulo: string, texto: string) => void;
  dorme: (ms: number) => Promise<void>;
  clicar: (alvo: Alvo, espera?: number) => Promise<void>;
  apontar: (alvo: Alvo) => Promise<void>;
  digitar: (alvo: Alvo, texto: string) => Promise<void>;
  ate: (cond: () => boolean | Promise<boolean>, limite?: number) => Promise<void>;
};
type Passo = { nome: string; rodar: (m: Mao, mem: Mem) => Promise<void> };

const PARADO = new Error("parado");
const lanc = (l?: Lanc) => `[data-lanc="${l?.id}"]`;
const drawer = (resto: string) => `#drawer.open ${resto}`;
const semDrawer = () => !document.querySelector("#drawer.open");
const kpis = async () => (await getResumo()).kpis;

function roteiro(aoReiniciar: () => void): Passo[] {
  return [
    {
      nome: "A planilha chega",
      rodar: async (m, mem) => {
        m.dizer("Começando do zero", "A planilha de despesas não classificadas acabou de chegar da contabilidade. O arquivo cai no bucket de entrada e o processo começa sozinho.");
        await m.clicar('[data-tour="nav-despesas"]');
        await reiniciar();
        aoReiniciar();
        await m.apontar(".kpirow");
        await m.dorme(900);
        m.dizer("O agente está trabalhando", "Para cada linha: cruza com o Omie, procura a nota fiscal no Omie e no financeiro@, lê a nota e confere. Ao vivo.");
        await m.ate(async () => { const k = await kpis(); return k.total >= 23 && k.processando === 0; }, 90000);
        const ls = await getLancs();
        mem.antes = new Set(ls.map((l) => l.id));
        mem.email = ls.find((l) => l.estado === "conciliado" && l.fonte === "email");
        mem.fornecedor = ls.find((l) => l.excecao?.tipo === "fornecedor");
        mem.conta = ls.find((l) => l.excecao?.tipo === "conta");
        mem.historico = ls.find((l) => l.excecao?.tipo === "nf" && l.excecao.historico);
        const k = await kpis();
        m.dizer("Fechamento processado", `${k.total} lançamentos: ${k.conciliados} conciliados sozinhos e ${k.decidir} que pararam para a controladoria decidir.`);
        await m.dorme(3200);
      },
    },
    {
      nome: "Conciliado sozinho",
      rodar: async (m, mem) => {
        await m.clicar('[data-tour="filtro-auto"]');
        m.dizer("Um lançamento conciliado sozinho", "Valor, data e nome bateram com o Omie. A nota fiscal não estava no Omie: o agente achou num e-mail do financeiro@.");
        await m.clicar(lanc(mem.email));
        await m.dorme(1800);
        await m.apontar(".agent-col");
        m.dizer("Como foi conciliado", "As regras que ele aplicou, uma a uma, e a aderência do cruzamento. Nada é caixa-preta.");
        await m.dorme(3200);
      },
    },
    {
      nome: "O e-mail e a nota fiscal",
      rodar: async (m) => {
        m.dizer("O e-mail que o agente achou", "É um e-mail de verdade na caixa financeiro@, guardado no S3. Abrindo…");
        await m.clicar(".inbox .ev-hd.click");
        await m.dorme(2600);
        m.dizer("A nota fiscal anexa", "O arquivo existe. À esquerda o documento; à direita, o que o agente leu dele: número, emitente, tomador, valor.");
        await m.clicar(".mail button.attach");
        await m.apontar(() => document.querySelectorAll(".viewer-side .d-lbl")[1] ?? document.querySelector(".viewer-side"));
        await m.dorme(4200);
        await m.clicar('[data-tour="viewer-fechar"]');
      },
    },
    {
      nome: "Onde o agente para",
      rodar: async (m, mem) => {
        await m.clicar('[data-tour="filtro-decidir"]');
        m.dizer("Aqui o agente parou", "A nota existe e o valor bate. Mesmo assim ele não conciliou — e explica por quê.");
        await m.clicar(lanc(mem.fornecedor));
        await m.dorme(2400);
        await m.clicar(".inbox .ev-bd button.attach");
        await m.apontar(() => document.querySelector(".viewer-side b.no") ?? document.querySelector(".viewer-side"));
        m.dizer("Lido da própria nota", "O CNPJ do tomador é de outra empresa do grupo, não o da Just Travel que pagou. Isso não veio pronto: foi lido do PDF.");
        await m.dorme(4600);
        await m.clicar('[data-tour="viewer-fechar"]');
      },
    },
    {
      nome: "A decisão que vira regra",
      rodar: async (m, mem) => {
        await m.clicar('[data-tour="nav-decidir"]');
        m.dizer("Para decidir", "Só o que as regras não fecharam. Cada card diz a regra que travou e o histórico, quando existe.");
        await m.dorme(2600);
        await m.clicar(`[data-kcard="${mem.conta?.id}"]`);
        m.dizer("Divergência de conta", "A controladoria já aceitou esta mesma diferença duas vezes. Esta é a terceira.");
        await m.dorme(2400);
        await m.clicar(() => document.querySelector(drawer(".decision-card .dc-suggest"))?.closest(".decision-card") ?? document.querySelector(drawer(".decision-card")));
        m.dizer("A observação é de quem decide", "O texto que volta para a contabilidade é editável. Vale o que a controladoria escrever.");
        await m.digitar(drawer("textarea.obs-edit"), " Conferido pela controladoria.");
        await m.apontar(drawer(".rule-toggle"));
        m.dizer("Três iguais viram regra", "Com esta confirmação, o agente passa a resolver sozinho os próximos casos como este.");
        await m.dorme(2800);
        await m.clicar(drawer(".drawer-ft .btn.primary"));
        await m.ate(semDrawer);
        m.dizer("Virou regra", "A decisão retomou o processo que estava parado no Loom, e o card foi para Resolvidas.");
        await m.apontar(`.kcol:nth-child(2) [data-kcard="${mem.conta?.id}"]`);
        await m.dorme(3000);
      },
    },
    {
      nome: "Isso já aconteceu antes",
      rodar: async (m, mem) => {
        await m.clicar(`[data-kcard="${mem.historico?.id}"]`);
        m.dizer("O agente lembra", "Sem nota fiscal — mas este caso já foi decidido num fechamento anterior, e a decisão de então vem sugerida.");
        await m.apontar(drawer(".alertbox.info"));
        await m.dorme(3200);
        await m.clicar(() => document.querySelector(drawer(".decision-card .dc-suggest"))?.closest(".decision-card") ?? document.querySelector(drawer(".decision-card")));
        await m.dorme(1500);
        await m.clicar(drawer(".drawer-ft .btn.primary"));
        await m.ate(semDrawer);
        m.dizer("Resolvida", "Com a observação registrada, a linha está pronta para voltar à contabilidade.");
        await m.apontar(`.kcol:nth-child(2) [data-kcard="${mem.historico?.id}"]`);
        await m.dorme(2600);
      },
    },
    {
      nome: "Chega um complemento",
      rodar: async (m, mem) => {
        await m.clicar('[data-tour="nav-despesas"]');
        await m.clicar('[data-tour="filtro-todos"]');
        m.dizer("Chega um complemento", "A contabilidade manda mais dois lançamentos no meio do fechamento. O mesmo processo, que estava esperando, retoma.");
        await m.clicar('[data-tour="simular"]');
        await m.apontar(".kpirow");
        await m.ate(async () => { const k = await kpis(); return k.total > mem.antes.size && k.processando === 0; }, 90000);
        const novo = (await getLancs()).find((l) => !mem.antes.has(l.id));
        m.dizer("Conciliados na hora", "Os dois lançamentos novos já entraram com nota fiscal e observação, sem ninguém tocar.");
        await m.clicar(lanc(novo));
        await m.dorme(3200);
      },
    },
    {
      nome: "Retorno à contabilidade",
      rodar: async (m) => {
        await m.clicar('[data-tour="retorno"]');
        m.dizer("A prévia do retorno", "A mesma planilha que chegou, agora com a observação de cada linha. O que ainda está para decidir fica fora deste envio.");
        await m.apontar(drawer(".obs-block"));
        await m.dorme(3800);
        m.dizer("Nada sai sem aprovação", "É a controladoria que aprova. Aprovando…");
        await m.clicar(drawer(".drawer-ft .btn.primary"));
        await m.ate(() => !!document.querySelector(drawer(".alertbox.good")), 60000);
        await m.apontar(drawer(".alertbox.good"));
        m.dizer("Enviado", "A planilha .xlsx foi gerada e guardada, as notas fiscais foram para a pasta do retorno e o e-mail saiu para a contabilidade.");
        await m.dorme(4200);
        await m.clicar(drawer(".close"));
      },
    },
    {
      nome: "Por baixo da tela",
      rodar: async (m) => {
        await m.clicar(".tb-pill-live");
        m.dizer("Tudo isso rodou de verdade", "O Loom orquestrou, o Postgres guardou o domínio, as notas estão no S3 e o Omie foi consultado pelo gatekeeper. As chamadas estão aqui, em milissegundos.");
        await m.apontar(drawer(".stk"));
        await m.dorme(5200);
        await m.clicar(drawer(".close"));
        m.dizer("Fim da demonstração", "A tela é sua: pode clicar em qualquer lançamento, nota ou exceção.");
        await m.dorme(3000);
      },
    },
  ];
}

/** Totalmente visivel na janela e dentro de cada ancestral que rola? */
function visivel(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.top < 70 || r.bottom > window.innerHeight - 12) return false;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o !== "auto" && o !== "scroll") continue;
    const pr = p.getBoundingClientRect();
    if (r.top < pr.top || r.bottom > pr.bottom) return false;
  }
  return true;
}

/** Espera o alvo parar de se mexer na tela (rolagem suave, drawer deslizando,
 *  conteudo chegando): so' entao a posicao dele serve para mirar. */
async function parado(el: HTMLElement, dorme: (ms: number) => Promise<void>, limite = 2400) {
  let antes = "", iguais = 0;
  for (let t = 0; t < limite && iguais < 3; t += 70) {
    await dorme(70);
    const r = el.getBoundingClientRect();
    const agora = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
    iguais = agora === antes ? iguais + 1 : 0;
    antes = agora;
  }
}

/** Rola ate' o alvo ficar no meio: primeiro cada ancestral que rola (a lista, o
 *  corpo do drawer), depois a janela. Feito 'a mao - e nao com scrollIntoView -
 *  para rolar so' o que rola de fato, do mesmo jeito em qualquer navegador. */
async function trazer(el: HTMLElement, dorme: (ms: number) => Promise<void>) {
  let fixo = false;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.position === "fixed") fixo = true;
    if ((cs.overflowY !== "auto" && cs.overflowY !== "scroll") || p.scrollHeight <= p.clientHeight + 1) continue;
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    if (r.top >= pr.top && r.bottom <= pr.bottom) continue;
    p.scrollTo({ top: p.scrollTop + (r.top - pr.top) - Math.max(0, (pr.height - r.height) / 2), behavior: "smooth" });
    await parado(el, dorme);
  }
  const r = el.getBoundingClientRect();
  if (!fixo && (r.top < 70 || r.bottom > window.innerHeight - 12)) {
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - Math.max(80, (window.innerHeight - r.height) / 2)), behavior: "smooth" });
    await parado(el, dorme);
  }
}

export function Piloto({ aberto, fechar, aoReiniciar, toast }: {
  aberto: boolean; fechar: () => void; aoReiniciar: () => void; toast: (msg: string, tipo?: "good" | "warn") => void;
}) {
  const [rodando, setRodando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, ms: 0 });
  const [clique, setClique] = useState(0);
  const [fala, setFala] = useState<{ titulo: string; texto: string } | null>(null);
  const [passo, setPasso] = useState({ n: 0, de: 0, nome: "" });
  const s = useRef({ cancelado: false, pausado: false, x: 0, y: 0 });

  const parar = useCallback(() => { s.current.cancelado = true; }, []);
  const alternar = useCallback(() => { s.current.pausado = !s.current.pausado; setPausado(s.current.pausado); }, []);

  const comecar = useCallback(async () => {
    const st = s.current;
    st.cancelado = false; st.pausado = false;
    st.x = window.innerWidth / 2; st.y = window.innerHeight / 2;
    setPos({ x: st.x, y: st.y, ms: 0 }); setPausado(false); setFala(null); setRodando(true);
    document.body.classList.add("piloto");

    const dorme = async (ms: number) => {
      for (let resto = ms; resto > 0;) {
        await new Promise((r) => setTimeout(r, 50));
        if (st.cancelado) throw PARADO;
        if (!st.pausado) resto -= 50;
      }
    };
    const achar = async (alvo: Alvo, limite = 15000): Promise<HTMLElement> => {
      for (let t = 0; t < limite; t += 150) {
        const el = typeof alvo === "string" ? document.querySelector(alvo) : alvo();
        if (el instanceof HTMLElement && el.getBoundingClientRect().width > 0) return el;
        await dorme(150);
      }
      throw new Error(`não encontrei na tela: ${typeof alvo === "string" ? alvo : "o próximo alvo"}`);
    };
    const mirar = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const dentro = (v: number, max: number) => Math.min(Math.max(v, 8), max - 8);  // o cursor nunca sai da janela
      return { x: dentro(r.left + Math.min(r.width / 2, 150), window.innerWidth), y: dentro(r.top + Math.min(r.height / 2, 60), window.innerHeight) };
    };
    const mover = async (el: HTMLElement) => {
      await parado(el, dorme);
      if (!visivel(el)) await trazer(el, dorme);
      for (let i = 0; i < 2; i++) {  // 2a volta: o alvo pode ter andado (drawer abrindo)
        const p = mirar(el);
        const d = Math.hypot(p.x - st.x, p.y - st.y);
        if (d < 4) break;
        const ms = Math.round(Math.min(950, Math.max(320, d * 0.9)));
        st.x = p.x; st.y = p.y;
        setPos({ ...p, ms });
        await dorme(ms + 90);
      }
    };
    // acha o alvo e leva o cursor ate' ele; se o React recriou o elemento no
    // caminho (o card que muda de coluna), procura de novo
    const chegar = async (alvo: Alvo, limite?: number): Promise<HTMLElement> => {
      for (let i = 0; ; i++) {
        const el = await achar(alvo, limite);
        await mover(el);
        if (el.isConnected || i >= 3) return el;
      }
    };
    const mao: Mao = {
      dizer: (titulo, texto) => setFala({ titulo, texto }),
      dorme,
      ate: async (cond, limite = 30000) => {
        for (let t = 0; t < limite; t += 400) { if (await cond()) return; await dorme(400); }
        throw new Error("a tela demorou mais do que o esperado");
      },
      // apontar e' so' gesto: se o alvo nao existe nesta largura de tela, segue o roteiro
      apontar: async (alvo) => {
        try { await chegar(alvo, 4000); } catch (e) { if (e === PARADO) throw e; }
      },
      clicar: async (alvo, espera = 420) => {
        for (let t = 0; t < 20000; t += 200) {
          if (!((await achar(alvo)) as HTMLButtonElement).disabled) break;
          await dorme(200);
        }
        const el = await chegar(alvo);
        el.classList.add("piloto-foco");
        try {
          await dorme(espera);
          setClique((c) => c + 1);
          await dorme(140);
          el.click();
          await dorme(260);
        } finally { el.classList.remove("piloto-foco"); }
      },
      digitar: async (alvo, texto) => {
        const el = (await chegar(alvo)) as HTMLTextAreaElement;
        el.classList.add("piloto-foco");
        el.focus({ preventScroll: true });  // a rolagem ja' foi feita; o foco nao deve mexer na pagina
        const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
        try {
          for (const ch of texto) {
            set.call(el, el.value + ch);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.scrollTop = el.scrollHeight;
            await dorme(34);
          }
          await dorme(500);
        } finally { el.classList.remove("piloto-foco"); el.blur(); }
      },
    };

    const passos = roteiro(aoReiniciar);
    const mem: Mem = { antes: new Set() };
    try {
      for (let i = 0; i < passos.length; i++) {
        setPasso({ n: i + 1, de: passos.length, nome: passos[i].nome });
        await passos[i].rodar(mao, mem);
      }
      toast("Demonstração concluída — a tela é sua", "good");
    } catch (e: any) {
      if (e !== PARADO) toast(`Demonstração interrompida: ${e?.message ?? e}`, "warn");
    } finally {
      document.body.classList.remove("piloto");
      document.querySelectorAll(".piloto-foco").forEach((el) => el.classList.remove("piloto-foco"));
      setRodando(false); setFala(null);
      fechar();
    }
  }, [aoReiniciar, fechar, toast]);

  const soReiniciar = async () => {
    setOcupado(true);
    try { await reiniciar(); aoReiniciar(); toast("Demo recomeçada — a planilha da contabilidade está chegando de novo", "good"); fechar(); }
    catch (e: any) { toast(e?.message || "Não foi possível recomeçar", "warn"); }
    setOcupado(false);
  };

  // Esc devolve o controle (fase de captura: antes de fechar drawer ou visualizador)
  useEffect(() => {
    if (!rodando) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); parar(); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [rodando, parar]);
  useEffect(() => () => { s.current.cancelado = true; document.body.classList.remove("piloto"); }, []);

  if (!aberto && !rodando) return null;

  if (!rodando) {
    return (
      <div className="piloto-modal" onClick={fechar}>
        <div className="piloto-card" onClick={(e) => e.stopPropagation()}>
          <h2>Demonstração guiada</h2>
          <p>
            A tela passa a operar sozinha, como a controladoria operaria: abre lançamentos e notas fiscais, decide exceções, recebe um
            complemento e envia o retorno à contabilidade. <b>O trabalho é executado de verdade</b> — o roteiro só escolhe onde clicar.
          </p>
          <p>Leva cerca de 2 minutos e <b>recomeça a demo do zero</b>: o que foi decidido até aqui é descartado. Esc encerra a qualquer momento.</p>
          <div className="piloto-acoes">
            <button className="btn ghost" onClick={fechar} disabled={ocupado}>Cancelar</button>
            <button className="btn" onClick={soReiniciar} disabled={ocupado}>{ocupado ? "Recomeçando…" : "Só recomeçar a demo"}</button>
            <button className="btn accent" onClick={() => void comecar()} disabled={ocupado}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>Começar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const aEsquerda = pos.x > (typeof window === "undefined" ? 0 : window.innerWidth) - 360;
  const acima = pos.y > (typeof window === "undefined" ? 0 : window.innerHeight) - 190;
  return (
    <>
      {/* enquanto roda, um clique de verdade pausa em vez de bagunçar o roteiro */}
      {!pausado ? <div className="piloto-escudo" onClick={alternar} title="Clique para pausar · Esc encerra" /> : null}
      <div className="piloto-cursor" style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transitionDuration: `${pos.ms}ms` }}>
        {clique ? <i key={clique} className="piloto-onda" /> : null}
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l13.5 8.2-6 1.3 3.6 6.7-2.6 1.4-3.6-6.8L5 18.6z" fill="var(--jt-2)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        {fala ? (
          <div className={`piloto-fala${aEsquerda ? " esq" : ""}${acima ? " acima" : ""}`}>
            <b>{fala.titulo}</b>{fala.texto}
          </div>
        ) : null}
      </div>
      <div className="piloto-painel">
        <div className="pp-top"><span className={`pp-dot${pausado ? " off" : ""}`} />{pausado ? "Pausada" : "Demonstração guiada"}<small>{passo.n} de {passo.de}</small></div>
        <div className="pp-nome">{passo.nome}</div>
        <div className="pp-barra"><i style={{ width: `${passo.de ? (passo.n / passo.de) * 100 : 0}%` }} /></div>
        <div className="pp-acoes">
          <button className="btn sm" onClick={alternar}>{pausado ? "Continuar" : "Pausar"}</button>
          <button className="btn sm ghost" onClick={parar}>Encerrar</button>
        </div>
      </div>
    </>
  );
}

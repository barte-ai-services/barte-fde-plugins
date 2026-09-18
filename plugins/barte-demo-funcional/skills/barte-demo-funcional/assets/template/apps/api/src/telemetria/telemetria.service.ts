import { Injectable } from "@nestjs/common";
import { EventosService } from "../eventos/eventos.service";

export interface Chamada {
  /**
   * O nome da PEÇA, não o do produto: "armazenamento" e "fila" continuam
   * valendo quando a demo roda em GCP ou Azure. Qual tecnologia está por baixo
   * aparece no painel da stack, uma vez, e não em cada linha do fluxo.
   */
  peca: "postgres" | "armazenamento" | "fila" | "agente";
  operacao: string;
  ms: number;
  ok: boolean;
  em: string;
}

/**
 * A telemetria da demo: cada ida ao banco, ao S3 e à fila, com a duração.
 *
 * Numa demo comercial isto é argumento, não enfeite. Quando o cliente pergunta
 * "mas isso está mesmo rodando, ou é uma tela?", a resposta deixa de ser uma
 * afirmação: ele vê o `SELECT` acontecendo em 3 ms enquanto a esteira anda.
 *
 * O que NÃO se faz aqui é instrumentar tudo com um interceptor. A lista é curta
 * e escrita à mão nos pontos que importam — o que aparece na tela é o que
 * alguém decidiu mostrar, e não o barulho inteiro do processo.
 */
@Injectable()
export class TelemetriaService {
  /** Últimas chamadas. O suficiente para uma reunião, e nada além disso. */
  private readonly ultimas: Chamada[] = [];

  constructor(private readonly eventos: EventosService) {}

  async medir<T>(peca: Chamada["peca"], operacao: string, f: () => Promise<T>): Promise<T> {
    const inicio = process.hrtime.bigint();
    try {
      const r = await f();
      this.registrar(peca, operacao, inicio, true);
      return r;
    } catch (erro) {
      // Registra a falha ANTES de repropagar: uma chamada que estourou é
      // justamente a que se quer ver na tela.
      this.registrar(peca, operacao, inicio, false);
      throw erro;
    }
  }

  private registrar(peca: Chamada["peca"], operacao: string, inicio: bigint, ok: boolean): void {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const chamada: Chamada = {
      peca,
      operacao,
      ms: Math.round(ms * 10) / 10,
      ok,
      em: new Date().toISOString(),
    };
    this.ultimas.push(chamada);
    if (this.ultimas.length > 200) this.ultimas.shift();
    this.eventos.publicar({ tipo: "telemetria", chamada });
  }

  /** Resumo por peça: quantas chamadas, mediana e a pior. */
  resumo() {
    const porPeca = new Map<string, number[]>();
    for (const c of this.ultimas) {
      const lista = porPeca.get(c.peca) ?? [];
      lista.push(c.ms);
      porPeca.set(c.peca, lista);
    }
    return [...porPeca.entries()].map(([peca, ms]) => {
      const ordenado = [...ms].sort((a, b) => a - b);
      return {
        peca,
        chamadas: ms.length,
        medianaMs: ordenado[Math.floor(ordenado.length / 2)] ?? 0,
        piorMs: ordenado.at(-1) ?? 0,
      };
    });
  }

  recentes(n = 40): Chamada[] {
    return this.ultimas.slice(-n).reverse();
  }
}

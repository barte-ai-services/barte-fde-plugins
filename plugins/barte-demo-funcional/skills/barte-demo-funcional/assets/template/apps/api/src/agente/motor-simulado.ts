import type { Contexto, Motor, Resultado } from "./tipos";
import { carregarCadastro, extrair } from "./ferramentas";
import { ACOES, CONDICOES, type Estado } from "../fluxo/catalogo";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * O motor que roda na reunião.
 *
 * Sem chave, sem internet, e a MESMA entrada produz a MESMA saída — inclusive a
 * mesma ordem de decisões. Isso não é uma versão pobre do motor de verdade: é o
 * requisito de palco. Demo que depende de rede de hotel ou que decide diferente
 * na segunda passada quebra na frente do cliente, e quebra justamente quando
 * alguém pede "roda de novo".
 *
 * Ele não conhece etapa nenhuma: percorre o FLUXO que recebeu. Trocar a ordem
 * das etapas, acrescentar uma, ou ligar outra regra de escalonamento não passa
 * por este arquivo — passa pelo painel, ou por `dados/fluxo.yaml`.
 *
 * A pausa entre etapas é deliberada: sem ela os nós acendem no mesmo quadro e
 * ninguém vê o trabalho acontecer.
 */
export class MotorSimulado implements Motor {
  readonly nome = "simulado";

  async processar(ctx: Contexto): Promise<Resultado> {
    const estado: Estado = {
      documento: ctx.documento,
      cadastro: carregarCadastro(),
      extraido: extrair(ctx.documento),
      chavesConhecidas: ctx.chavesConhecidas,
      fornecedor: null,
      classificacao: null,
      proposta: null,
    };

    for (const etapa of ctx.fluxo.etapas) {
      ctx.no(etapa.id, "executando");
      await espera(420);

      const acao = ACOES[etapa.acao];
      // Uma ação fora do catálogo não deveria chegar aqui — a validação recusa
      // antes de gravar. Se chegou, a etapa é pulada em vez de derrubar o
      // processamento no meio de uma reunião.
      const decisao = acao ? acao.executar(estado) : null;
      if (decisao) ctx.decidir(decisao.acao, decisao.razao, decisao.confianca);

      // As condições são avaliadas DEPOIS da ação: é a ação que descobre o
      // fornecedor, e a condição que julga o que ela descobriu.
      for (const id of etapa.escalaSe) {
        const condicao = CONDICOES[id];
        if (!condicao) continue;
        const veredito = condicao.avaliar(estado);
        if (!veredito.bate) continue;

        ctx.decidir(
          "escalou para revisão",
          veredito.razao || condicao.motivoPadrao.toLowerCase(),
          veredito.confianca,
        );
        ctx.no(etapa.id, "excecao");
        // A ordem é: o que quem montou o fluxo escreveu, depois o motivo com o
        // número que a condição calculou, e só então o texto genérico dela.
        return {
          proposta: null,
          revisao: etapa.motivo ?? veredito.motivo ?? condicao.motivoPadrao,
          decisoes: [],
        };
      }

      ctx.no(etapa.id, "concluido");
    }

    return { proposta: estado.proposta, revisao: null, decisoes: [] };
  }
}

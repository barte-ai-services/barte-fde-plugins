import type { Contexto, Motor, Resultado } from "./tipos";
import {
  carregarCadastro,
  consultarFornecedor,
  divergencia,
  exigeRetencaoInss,
  extrair,
  verificarDuplicidade,
} from "./ferramentas";

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
 * A pausa entre etapas é deliberada: sem ela os cinco nós acendem no mesmo
 * quadro e ninguém vê o trabalho acontecer.
 */
export class MotorSimulado implements Motor {
  readonly nome = "simulado";

  async processar(ctx: Contexto): Promise<Resultado> {
    const cadastro = carregarCadastro();
    const d = extrair(ctx.documento);

    ctx.no("leitura", "executando");
    await espera(450);
    ctx.decidir(
      "extraiu o documento",
      `${ctx.documento.tipo.toUpperCase()} de ${d.fornecedorNome}, ${brl(d.valor)}, vencimento ${d.vencimento ?? "não informado"}`,
      0.99,
    );
    ctx.no("leitura", "concluido");

    ctx.no("cadastro", "executando");
    await espera(400);
    if (verificarDuplicidade(cadastro, d.chave, ctx.chavesConhecidas)) {
      ctx.decidir("barrou por duplicidade", `a chave ${d.chave.slice(-8)} já foi lançada`, 1);
      ctx.no("cadastro", "excecao");
      return { proposta: null, revisao: "Documento já lançado — chave duplicada", decisoes: [] };
    }
    const fornecedor = consultarFornecedor(cadastro, d.fornecedorCnpj);
    if (!fornecedor) {
      ctx.decidir(
        "não encontrou o fornecedor",
        `CNPJ ${d.fornecedorCnpj || "ausente"} não está no cadastro — sem ele não há centro de custo nem conta contábil`,
        0.97,
      );
      ctx.no("cadastro", "excecao");
      return { proposta: null, revisao: "Fornecedor não cadastrado", decisoes: [] };
    }
    ctx.decidir("identificou o fornecedor", `${fornecedor.nome}, condição ${fornecedor.condicao}`, 0.98);
    ctx.no("cadastro", "concluido");

    ctx.no("classificacao", "executando");
    await espera(500);
    ctx.decidir(
      "classificou o lançamento",
      `centro de custo ${fornecedor.centroCusto} e conta ${fornecedor.contaContabil}, pelo histórico do fornecedor`,
      0.94,
    );
    ctx.no("classificacao", "concluido");

    ctx.no("conformidade", "executando");
    await espera(500);
    const delta = divergencia(d.valor, d.valorPedido);
    if (delta !== null && Math.abs(delta) > 0.01) {
      ctx.decidir(
        "encontrou divergência com o pedido",
        `nota ${brl(d.valor)} contra pedido ${brl(d.valorPedido!)} — diferença de ${brl(Math.abs(delta))}`,
        0.96,
      );
      ctx.no("conformidade", "excecao");
      return { proposta: null, revisao: `Divergência de ${brl(Math.abs(delta))} com o pedido`, decisoes: [] };
    }
    if (exigeRetencaoInss(d.descricao, d.retencoes)) {
      ctx.decidir(
        "apontou retenção ausente",
        "serviço com cessão de mão de obra sem a retenção de INSS de 11% destacada",
        0.91,
      );
      ctx.no("conformidade", "excecao");
      return { proposta: null, revisao: "Retenção de INSS não destacada", decisoes: [] };
    }
    if (d.valor > cadastro.alcadaAprovacaoAutomatica) {
      ctx.decidir(
        "escalou por alçada",
        `${brl(d.valor)} acima do limite de ${brl(cadastro.alcadaAprovacaoAutomatica)} para aprovação automática`,
        1,
      );
      ctx.no("conformidade", "excecao");
      return { proposta: null, revisao: "Acima da alçada de aprovação automática", decisoes: [] };
    }
    ctx.decidir("conferiu conformidade", "valor bate com o pedido e as retenções estão destacadas", 0.95);
    ctx.no("conformidade", "concluido");

    ctx.no("proposta", "executando");
    await espera(350);
    ctx.decidir("propôs o lançamento", "pronto para aprovação — o humano decide", 0.95);
    ctx.no("proposta", "concluido");

    return {
      proposta: {
        fornecedor: fornecedor.nome,
        centroCusto: fornecedor.centroCusto,
        contaContabil: fornecedor.contaContabil,
        valor: d.valor,
        vencimento: d.vencimento,
      },
      revisao: null,
      decisoes: [],
    };
  }
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

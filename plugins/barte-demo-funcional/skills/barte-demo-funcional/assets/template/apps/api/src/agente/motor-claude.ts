import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import type { Contexto, Motor, Resultado } from "./tipos";
import { carregarCadastro, consultarFornecedor, extrair } from "./ferramentas";
import { ACOES, CONDICOES, type Estado } from "../fluxo/catalogo";

/**
 * De onde vem o modelo.
 *
 * `anthropic` (padrão) fala com a API da Anthropic. `bedrock` fala com o Amazon
 * Bedrock na conta AWS de quem está rodando — que é o que alguns clientes
 * exigem, porque aí o prompt não sai da nuvem deles.
 *
 * O Floci emula `bedrock-runtime`, e é tentador apontar a demo para lá: NÃO
 * funciona para o que interessa. O emulador devolve um texto fixo
 * ("Floci stub response") com o formato certo — serve para provar que a
 * credencial e a rota estão de pé, e não para mostrar um agente decidindo. Uma
 * demo local com inteligência de verdade usa o motor `simulado`; uma demo com
 * Bedrock aponta para o Bedrock de verdade.
 *
 * O cliente do Bedrock vem do pacote `@anthropic-ai/bedrock-sdk`, que não é
 * instalado por padrão:
 *
 *   npm install --workspace @demo/api @anthropic-ai/bedrock-sdk
 *
 * e no Bedrock o `model` é o ID de lá (`anthropic.claude-...`), não o da API da
 * Anthropic — por isso `AGENTE_MODELO` existe.
 */
function criarCliente(): Anthropic {
  if ((process.env.AGENTE_PROVEDOR ?? "anthropic") !== "bedrock") return new Anthropic();
  // `require` com o nome numa variável, pela mesma razão dos adaptadores de
  // nuvem: sem o pacote instalado, um import estático quebraria a compilação de
  // toda demo que não usa Bedrock.
  const pacote = "@anthropic-ai/bedrock-sdk";
  const { AnthropicBedrockMantle } = require(pacote);
  return new AnthropicBedrockMantle({
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
  }) as Anthropic;
}

/**
 * O motor de verdade: o modelo conduz o trabalho chamando as ferramentas.
 *
 * As ferramentas são as MESMAS do motor simulado — o catálogo do fluxo. O modelo
 * não calcula valor nem inventa conta contábil; ele decide o que perguntar e o
 * que concluir. Quando o cliente perguntar "e se a IA errar o número?", a
 * resposta está nesta linha: o número não passa por ela.
 *
 * O fluxo editado no painel chega aqui de duas formas: vira o roteiro escrito no
 * prompt, e vira a lista de regras que `conferir` devolve. Acrescentar uma etapa
 * no painel muda o que o modelo é instruído a fazer, sem tocar neste arquivo.
 */
export class MotorClaude implements Motor {
  readonly nome = "claude";
  private readonly cliente = criarCliente();

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

    /**
     * Os nós acendem por um CURSOR que anda junto com o trabalho.
     *
     * O modelo não é obrigado a anunciar em que etapa está — e pedir isso a ele
     * seria uma ferramenta a mais só para alimentar a animação. Então cada
     * ferramenta de trabalho fecha o nó corrente e abre o próximo. Se ele pular
     * uma consulta, o nó correspondente fecha junto no fim; a esteira nunca fica
     * com um nó aceso para sempre.
     */
    let cursor = 0;
    const etapas = ctx.fluxo.etapas;
    if (etapas[0]) ctx.no(etapas[0].id, "executando");

    const avancar = () => {
      const atual = etapas[cursor];
      if (atual) ctx.no(atual.id, "concluido");
      cursor += 1;
      const proxima = etapas[cursor];
      if (proxima) ctx.no(proxima.id, "executando");
    };

    const fecharRestantes = (estadoFinal: "concluido" | "excecao") => {
      const atual = etapas[cursor];
      if (atual) ctx.no(atual.id, estadoFinal);
      for (let i = cursor + 1; i < etapas.length; i += 1) {
        ctx.no(etapas[i].id, estadoFinal === "excecao" ? "excecao" : "concluido");
      }
    };

    // Só as condições que o fluxo realmente usa. Mandar a lista inteira do
    // catálogo faria o modelo escalar por uma regra que quem montou o fluxo
    // tinha desligado de propósito.
    const condicoesDoFluxo = [...new Set(etapas.flatMap((e) => e.escalaSe))].filter(
      (id) => CONDICOES[id],
    );

    let saida: Resultado | null = null;

    const ferramentas = [
      betaZodTool({
        name: "consultar_fornecedor",
        description:
          "Procura o CNPJ no cadastro de fornecedores. Devolve nome, centro de custo, conta contábil e condição de pagamento, ou informa que não existe.",
        inputSchema: z.object({ cnpj: z.string().describe("CNPJ do emitente, com ou sem máscara") }),
        run: ({ cnpj }) => {
          // A busca é a MESMA função do catálogo, mas chamada direto: passar um
          // estado clonado para `ACOES.consultar_fornecedor` faria a escrita
          // dele cair na cópia, e o resto do laço continuaria sem fornecedor.
          estado.fornecedor = consultarFornecedor(estado.cadastro, cnpj);
          avancar();
          return estado.fornecedor
            ? JSON.stringify(estado.fornecedor)
            : `fornecedor não cadastrado: o CNPJ ${cnpj} não está no cadastro`;
        },
      }),
      betaZodTool({
        name: "conferir",
        description:
          "Confere o documento contra todas as regras deste fluxo. É esta ferramenta que calcula — não estime valores por conta própria.",
        inputSchema: z.object({}),
        run: () => {
          avancar();
          const veredito: Record<string, { bate: boolean; razao: string; regra: string }> = {};
          for (const id of condicoesDoFluxo) {
            const c = CONDICOES[id];
            const r = c.avaliar(estado);
            veredito[id] = { bate: r.bate, razao: r.razao, regra: c.rotulo };
          }
          return JSON.stringify(veredito);
        },
      }),
      betaZodTool({
        name: "registrar_decisao",
        description:
          "Registra uma decisão na trilha que o humano vai ler. Chame a cada conclusão parcial, com a razão em uma frase e a confiança de 0 a 1.",
        inputSchema: z.object({
          acao: z.string().describe("o que você decidiu, no passado: 'identificou o fornecedor'"),
          razao: z.string().describe("por que, em uma frase, citando o número que sustenta"),
          confianca: z.number().min(0).max(1),
        }),
        run: ({ acao, razao, confianca }) => {
          ctx.decidir(acao, razao, confianca);
          return "registrado";
        },
      }),
      betaZodTool({
        name: "propor_lancamento",
        description: "Encerra com uma proposta de lançamento para o humano aprovar.",
        inputSchema: z.object({
          centroCusto: z.string(),
          contaContabil: z.string(),
        }),
        run: ({ centroCusto, contaContabil }) => {
          estado.classificacao = { centroCusto, contaContabil };
          ACOES.propor.executar(estado);
          fecharRestantes("concluido");
          saida = { proposta: estado.proposta, revisao: null, decisoes: [] };
          return "proposta registrada";
        },
      }),
      betaZodTool({
        name: "escalar_para_humano",
        description:
          "Encerra devolvendo o documento para revisão humana. Use sempre que a conferência apontar algo que você não pode resolver sozinho.",
        inputSchema: z.object({
          motivo: z.string().describe("uma linha curta, do jeito que apareceria numa fila"),
        }),
        run: ({ motivo }) => {
          fecharRestantes("excecao");
          saida = { proposta: null, revisao: motivo, decisoes: [] };
          return "escalado";
        },
      }),
    ];

    const runner = this.cliente.beta.messages.toolRunner({
      model: process.env.AGENTE_MODELO ?? "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // `low` porque o trabalho é curto e as contas já vêm prontas das
      // ferramentas — o que se quer do modelo aqui é condução, não deliberação.
      // Numa demo isso também é latência na frente do cliente.
      output_config: { effort: "low" },
      max_iterations: 12,
      system: sistema(ctx),
      tools: ferramentas,
      messages: [
        {
          role: "user",
          content: `Documento recebido de ${ctx.documento.remetente} em ${ctx.documento.recebidoEm}:\n\n${JSON.stringify(ctx.documento.conteudo, null, 2)}`,
        },
      ],
    });

    await runner.runUntilDone();

    // O laço pode terminar sem o modelo ter chamado nenhuma das duas ferramentas
    // de encerramento — teto de iterações, ou ele simplesmente responde em texto.
    // Nesse caso o item vai para revisão humana: é o único desfecho honesto, e é
    // o mesmo que o produto faria.
    if (!saida) fecharRestantes("excecao");
    return saida ?? { proposta: null, revisao: "Agente encerrou sem conclusão", decisoes: [] };
  }
}

/**
 * O roteiro vem do fluxo, e não de um texto fixo.
 *
 * É isto que faz uma etapa acrescentada no painel chegar ao modelo: ela aparece
 * na lista abaixo, com o nome que quem montou o fluxo deu a ela.
 */
function sistema(ctx: Contexto): string {
  const roteiro = ctx.fluxo.etapas
    .map((etapa, i) => {
      const acao = ACOES[etapa.acao];
      const regras = etapa.escalaSe
        .map((id) => CONDICOES[id]?.rotulo)
        .filter(Boolean)
        .join(", ");
      return `${i + 1}. ${etapa.rotulo} — ${acao?.descricao ?? etapa.acao}${
        regras ? `. Pare e escale se: ${regras}.` : ""
      }`;
    })
    .join("\n");

  return `Você processa documentos para o time financeiro, no fluxo "${ctx.fluxo.nome}".

O roteiro é este, nesta ordem:

${roteiro}

Regras que não se negociam:
- Nunca calcule nem estime valores. A ferramenta \`conferir\` é a fonte de
  qualquer número — se ela não disser, você não sabe.
- Registre uma decisão com \`registrar_decisao\` a cada conclusão parcial, antes
  de seguir. É essa trilha que o humano lê.
- Encerre sempre com \`propor_lancamento\` ou \`escalar_para_humano\`.
- Você recomenda; quem aprova é uma pessoa.

Escreva em português do Brasil, uma frase por razão, sempre citando o número que
a sustenta.`;
}

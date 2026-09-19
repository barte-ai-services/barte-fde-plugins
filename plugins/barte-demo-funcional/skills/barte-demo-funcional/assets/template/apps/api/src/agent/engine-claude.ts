import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import type { Context, Engine, Outcome } from "./types";
import { findCounterparty, loadRegistry, extract } from "./tools";
import { ACTIONS, CONDITIONS, type State } from "../flow/catalog";

/**
 * Where the model comes from.
 *
 * `anthropic` (default) talks to the Anthropic API. `bedrock` talks to Amazon
 * Bedrock in the AWS account running the demo — which is what some clients
 * require, because then the prompt never leaves their cloud.
 *
 * Floci emulates `bedrock-runtime`, and pointing the demo at it is tempting: it
 * does NOT work for what matters. The emulator returns fixed text
 * ("Floci stub response") in the right shape — good for proving credentials and
 * routing are up, useless for showing an agent deciding. A local demo with real
 * intelligence uses the `rules` engine; a Bedrock demo points at real Bedrock.
 *
 * The Bedrock client lives in `@anthropic-ai/bedrock-sdk`, which is not installed
 * by default:
 *
 *   npm install --workspace @demo/api @anthropic-ai/bedrock-sdk
 *
 * and on Bedrock the `model` is their id (`anthropic.claude-...`), not the
 * Anthropic API's — which is why `AGENT_MODEL` exists.
 */
function createClient(): Anthropic {
  if ((process.env.AGENT_PROVIDER ?? "anthropic") !== "bedrock") return new Anthropic();
  // `require` with the name in a variable, for the same reason as the cloud
  // adapters: without the package installed, a static import would break
  // compilation for every demo that does not use Bedrock.
  const packageName = "@anthropic-ai/bedrock-sdk";
  const { AnthropicBedrockMantle } = require(packageName);
  return new AnthropicBedrockMantle({
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
  }) as Anthropic;
}

/**
 * The real engine: the model drives the work by calling tools.
 *
 * The tools are the SAME ones the rules engine uses — the flow catalog. The model
 * computes no amounts and invents no account codes; it decides what to ask and
 * what to conclude. When the client asks "what if the AI gets the number wrong?",
 * the answer is this line: the number never goes through it.
 *
 * The flow edited in the panel reaches the model two ways: it becomes the script
 * written into the prompt, and it becomes the list of rules `check` returns.
 * Adding a step in the panel changes what the model is told to do, without
 * touching this file.
 */
export class ClaudeEngine implements Engine {
  readonly name = "claude";
  private readonly client = createClient();

  async process(ctx: Context): Promise<Outcome> {
    const state: State = {
      document: ctx.document,
      registry: loadRegistry(),
      extracted: extract(ctx.document),
      knownKeys: ctx.knownKeys,
      counterparty: null,
      classification: null,
      proposal: null,
    };

    /**
     * The nodes light up through a CURSOR that walks with the work.
     *
     * The model is not required to announce which step it is on — asking it to
     * would be one more tool existing only to feed an animation. So each working
     * tool closes the current node and opens the next. If it skips a lookup, the
     * matching node closes with the rest at the end; the pipeline never leaves a
     * node lit forever.
     */
    let cursor = 0;
    const steps = ctx.flow.steps;
    if (steps[0]) ctx.step(steps[0].id, "running");

    const advance = () => {
      const current = steps[cursor];
      if (current) ctx.step(current.id, "done");
      cursor += 1;
      const next = steps[cursor];
      if (next) ctx.step(next.id, "running");
    };

    const closeRemaining = (finalState: "done" | "exception") => {
      const current = steps[cursor];
      if (current) ctx.step(current.id, finalState);
      for (let i = cursor + 1; i < steps.length; i += 1) {
        ctx.step(steps[i].id, finalState === "exception" ? "exception" : "done");
      }
    };

    // Only the conditions this flow actually uses. Sending the whole catalog
    // would have the model escalate on a rule whoever built the flow had
    // deliberately switched off.
    const flowConditions = [...new Set(steps.flatMap((s) => s.escalate_if))].filter(
      (id) => CONDITIONS[id],
    );

    let outcome: Outcome | null = null;

    const tools = [
      betaZodTool({
        name: "buscar_no_cadastro",
        description:
          "Procura o CNPJ no cadastro. Devolve nome, centro de custo, conta contábil e condição de pagamento, ou informa que não existe.",
        inputSchema: z.object({ cnpj: z.string().describe("CNPJ do emitente, com ou sem máscara") }),
        run: ({ cnpj }) => {
          // The lookup is the catalog's own function, called directly: handing a
          // cloned state to `ACTIONS.find_counterparty` would land its write on
          // the copy, and the rest of the loop would carry on with no
          // counterparty.
          state.counterparty = findCounterparty(state.registry, cnpj);
          advance();
          return state.counterparty
            ? JSON.stringify(state.counterparty)
            : `não cadastrado: o CNPJ ${cnpj} não está no cadastro`;
        },
      }),
      betaZodTool({
        name: "conferir",
        description:
          "Confere o documento contra todas as regras deste fluxo. É esta ferramenta que calcula — não estime valores por conta própria.",
        inputSchema: z.object({}),
        run: () => {
          advance();
          const verdict: Record<string, { fired: boolean; reason: string; rule: string }> = {};
          for (const id of flowConditions) {
            const c = CONDITIONS[id];
            const r = c.evaluate(state);
            verdict[id] = { fired: r.fired, reason: r.reason, rule: c.label };
          }
          return JSON.stringify(verdict);
        },
      }),
      betaZodTool({
        name: "registrar_decisao",
        description:
          "Registra uma decisão na trilha que o humano vai ler. Chame a cada conclusão parcial, com a razão em uma frase e a confiança de 0 a 1.",
        inputSchema: z.object({
          acao: z.string().describe("o que você decidiu, no passado: 'identificou no cadastro'"),
          razao: z.string().describe("por que, em uma frase, citando o número que sustenta"),
          confianca: z.number().min(0).max(1),
        }),
        run: ({ acao, razao, confianca }) => {
          ctx.decide(acao, razao, confianca);
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
          state.classification = { costCenter: centroCusto, account: contaContabil };
          ACTIONS.propose.run(state);
          closeRemaining("done");
          outcome = { proposal: state.proposal, review: null, decisions: [] };
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
          closeRemaining("exception");
          outcome = { proposal: null, review: motivo, decisions: [] };
          return "escalado";
        },
      }),
    ];

    const runner = this.client.beta.messages.toolRunner({
      model: process.env.AGENT_MODEL ?? "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      // `low` because the work is short and the arithmetic already arrives from
      // the tools — what we want from the model here is navigation, not
      // deliberation. In a demo that is also latency in front of the client.
      output_config: { effort: "low" },
      max_iterations: 12,
      system: systemPrompt(ctx),
      tools,
      messages: [
        {
          role: "user",
          content: `Documento recebido de ${ctx.document.sender} em ${ctx.document.received_at}:\n\n${JSON.stringify(ctx.document.content, null, 2)}`,
        },
      ],
    });

    await runner.runUntilDone();

    // The loop can end without the model calling either closing tool — iteration
    // cap, or it simply answers in prose. The item then goes to human review: it
    // is the only honest outcome, and the same one the product would produce.
    if (!outcome) closeRemaining("exception");
    return outcome ?? { proposal: null, review: "Agente encerrou sem conclusão", decisions: [] };
  }
}

/**
 * The script comes from the flow, not from fixed text.
 *
 * This is what carries a step added in the panel through to the model: it shows
 * up in the list below, under the name whoever built the flow gave it.
 *
 * The prompt is in Portuguese on purpose — the decisions it produces are read by
 * the client, on screen.
 */
function systemPrompt(ctx: Context): string {
  const script = ctx.flow.steps
    .map((step, i) => {
      const action = ACTIONS[step.action];
      const rules = step.escalate_if
        .map((id) => CONDITIONS[id]?.label)
        .filter(Boolean)
        .join(", ");
      return `${i + 1}. ${step.label} — ${action?.description ?? step.action}${
        rules ? `. Pare e escale se: ${rules}.` : ""
      }`;
    })
    .join("\n");

  return `Você processa documentos para o time financeiro, no fluxo "${ctx.flow.name}".

O roteiro é este, nesta ordem:

${script}

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

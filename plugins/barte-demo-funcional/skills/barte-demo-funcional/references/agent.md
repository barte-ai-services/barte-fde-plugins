# The agent

The demo's agent does real work: it reads the document, looks up what it needs,
checks the rules and **stops when it does not know**, saying why. That last part
is what sells — a pipeline that gets everything right convinces nobody who has
worked in the area.

## The rule that governs everything

> **The model computes nothing.** Registry, approval limit, duplicates, amount
> mismatch, withholding rules — all of it comes from deterministic tools. What the
> model does is decide **which questions to ask** and **what to conclude** from the
> answers.

When the client asks "what if the AI gets the number wrong?", the answer is not a
promise: the number never goes through it.

## Two engines, the same events

| | `rules` | `claude` |
|---|---|---|
| how it runs | rules in TypeScript | the Anthropic SDK's Tool Runner |
| needs a key | no | `ANTHROPIC_API_KEY` |
| needs internet | no | yes |
| same input, same output | **always** | not necessarily |
| when to use | **in the meeting**, and in any demo the client will operate alone | when the conversation is about the agent's intelligence |

Switch with `.env` (`AGENT_ENGINE`), and the screen cannot tell which is running:
both publish the same events (`step`, `decision`, `exception`).

**The default is `rules`, and that is a stage decision.** Hotel wifi drops, keys
expire, latency shows up at the worst moment — and a demo that decides differently
on the second pass breaks precisely when someone asks you to "run it again".

Touch one engine, touch the other. If they diverge, the demo starts lying about
itself depending on an environment variable.

## The tools

They live in `apps/api/src/agent/tools.ts` and are shared by both engines:

| Tool | What it answers |
|---|---|
| `findCounterparty` | is this CNPJ in the registry? with which cost center and account? |
| `isDuplicate` | has this key already been posted? |
| `mismatch` | how far the document is from the purchase order, in reais |
| `missingInssWithholding` | did this service require a withholding that did not arrive? |
| `loadRegistry` | the policy: counterparties, approval limit, what was already posted |

They are wrapped by the **flow catalog** (`apps/api/src/flow/catalog.ts`), which is
what gives each one a name in Portuguese and makes it selectable in the panel.

Changing the demo's domain means changing **these functions** and the data they
read — the pipeline, the screen and the events stay as they are.

## How the Claude engine drives

`apps/api/src/agent/engine-claude.ts` uses the **Tool Runner**
(`client.beta.messages.toolRunner`), which runs the request → tool → response loop
until the model finishes. Each tool is a `betaZodTool` with a Zod schema, so
arguments arrive validated.

Two tools exist only to end the run: `propor_lancamento` and
`escalar_para_humano`. That is how you get structured output out of an agent loop
without depending on the model returning JSON inside prose — it calls one of the
two, and the loop ends. If neither is called (iteration cap, or it answers in
prose), the item goes to **human review**: the only honest outcome, and the one the
product would produce.

Model: `claude-opus-5`, `thinking: { type: "adaptive" }` and `effort: "low"` — the
work is short and the arithmetic already arrives from the tools; what we want from
the model is navigation, not deliberation. In a demo that is also latency in front
of the client.

The instructions are built from the flow, in `systemPrompt()`. The prompt is in
Portuguese because the decisions it produces are read by the client, on screen.

## Running the model on Bedrock (the client's cloud)

Some clients require the prompt not to leave their cloud. `AGENT_PROVIDER=bedrock`
swaps the Anthropic client for Amazon Bedrock's:

```bash
npm install --workspace @demo/api @anthropic-ai/bedrock-sdk
# in .env:  AGENT_ENGINE=claude, AGENT_PROVIDER=bedrock, AGENT_MODEL=<bedrock id>
```

**Floci's Bedrock does not serve this.** The emulator has `bedrock-runtime` and
answers in a valid shape — but the content is fixed (`"Floci stub response"`). It
proves credentials and routing are up; it shows no agent deciding. A local demo
with real intelligence uses the `rules` engine; a Bedrock demo points at real
Bedrock, in the client's account.

> This path is written and compiles, but has **not been exercised against a real
> Bedrock account** — there were no credentials on the machine where the skill was
> built. The first time it is used, budget time for the model id and the region.

## The decision trail

Each partial conclusion becomes a decision with four fields: **what** it decided,
**the reason** (one sentence, citing the number that holds it up), the
**confidence** and the time. It appears live next to the queue and is stored on
the item.

The copy follows a pattern worth keeping: **one sentence, number + action, the
agent recommends — a person approves.**

```
identificou no cadastro · 19:32:21 · 98%
Ativa Logística e Transportes Ltda, condição 30 dias

encontrou divergência com o pedido · 19:32:22 · 96%
documento R$ 14.318,90 contra pedido R$ 14.300,00 — diferença de R$ 18,90
```

## Changing the pipeline steps

No code for that: the steps are the **flow**, and the flow is data — `data/flow.yaml`
or the "Editar fluxo" panel inside the demo. Backend and screen read the same
structure, so there are no two lists to keep in agreement. See `references/flow.md`.

Five steps is a good number: fewer looks shallow, and above six the pipeline starts
wrapping to a second line on a laptop screen.

## When the agent should stop

This is the most important question in the discovery conversation, and the answers
become the exceptions planted in the data. Patterns that work at almost any client:

1. **Incomplete registry** — the counterparty does not exist; without it there is
   no way to classify.
2. **Mismatch with what was agreed** — invoice vs purchase order, contract, price
   table.
3. **Tax rule not met** — a withholding that should have been stated and was not.
4. **Duplicate** — the same key already posted.
5. **Approval limit** — above the threshold, the decision belongs to a person.

Each one proves a different capability. `references/data.md` covers how to plant
them.

# The flow

The demo's flow — the pipeline steps, what each one does, when the agent stops,
and what the screen calls things — is **data**, not code. It lives in
`data/flow.yaml`, is executed by the agent, drawn by the screen, and editable
inside the demo itself, in the **Editar fluxo** panel.

This exists for a commercial reason: in a meeting, the client describes a step
nobody had foreseen, and whoever is presenting adds it on the spot. The next
document already runs the new flow, with no restart.

**Keys are English and snake_case — this file is a wire format, like the API.
Values are Portuguese, because the client reads them.**

## The file

```yaml
name: Contas a pagar

vocabulary:
  client: Cliente Demo
  module: Contas a Pagar       # menu, breadcrumb, page title, tab title
  counterparty: Fornecedor     # the queue column and the proposal field
  incoming: Documento          # what arrives: documento, nota, título, boleto
  labels:
    cost_center: Centro de custo
    account: Conta contábil
    amount: Valor
    due_date: Vencimento
  stats:
    queued: na fila
    ready: prontos para aprovação
    review: em revisão humana
    amount: valor na esteira

steps:
  - id: cadastro               # stable: events light the node up by it
    label: Cadastro            # what shows on the pipeline
    hint: identifica o fornecedor
    action: find_counterparty
    escalate_if:               # what makes the agent STOP at this step
      - duplicate_document
      - not_in_registry
    reason: Cadastro incompleto   # optional; overrides the condition's reason
```

The file is the **seed**: on first boot it goes into the database, and from then
on what rules is what was applied in the panel. "Back to original" re-reads the
file — which is what git tracks, and therefore the right home for history.

## The vocabulary is what switches modules

The pipeline is the same for accounts payable, accounts receivable,
reconciliation and classification: something arrives, the agent processes it, and
a queue of proposals and exceptions remains. What changes is the words — and they
are configuration, so "show me accounts receivable" is a panel edit, live, not a
code change.

What is **not** configurable is the structure of the screen. When a demo needs a
different shape — a P&L dashboard, a bank-file pipeline with a transformation
terminal — that is a new screen, and you write code. Declaring layout in YAML
would mean building a screen editor nobody asked for.

## The catalog

`action` and `escalate_if` point at a closed catalog
(`apps/api/src/flow/catalog.ts`). The panel builds its menus from it, so a new
verb shows up on screen with no frontend change.

| Action | What it does |
|---|---|
| `read_document` | reads the document |
| `find_counterparty` | finds the CNPJ in the registry |
| `classify` | sets cost center and account |
| `check` | computes everything the rules need |
| `propose` | closes the proposal for a human to approve |

| Condition | When it fires |
|---|---|
| `duplicate_document` | the key has already been through |
| `not_in_registry` | CNPJ outside the registry |
| `amount_mismatch` | the document does not match the purchase order |
| `missing_inss_withholding` | labour-assignment service with no withholding |
| `above_approval_limit` | above the automatic approval limit |

**The border, so nothing is oversold:** adding, removing and reordering steps,
changing text, renaming what the screen says, and switching on an existing rule
take no code. A new rule does — and that is right. The alternative would be
inventing an expression language inside the YAML, turning the demo into a platform
product nobody asked for.

## Adding a verb to the catalog

One entry in `catalog.ts`, nothing else:

```ts
budget_exceeded: {
  label: "Centro de custo sem orçamento",
  description: "o mês já consumiu o orçamento daquele centro de custo",
  defaultReason: "Orçamento do centro de custo estourado",
  evaluate: (s) => ({
    fired: spent(s) > budget(s),
    reason: `${brl(spent(s))} consumidos de ${brl(budget(s))} no mês`,
    confidence: 0.95,
  }),
},
```

`label` and `description` are what shows in the panel — write them in the client's
language, not the database's. `reason` is what lands in the decision trail, and it
cites the number: that is what holds a sentence up in front of a CFO.

Once added, the verb appears in the panel's menu immediately and can be attached
to any step.

## How this reaches the agent

- **Rules engine** walks the steps in order: runs the action, records the decision,
  evaluates the conditions. It knows no step by name.
- **Claude engine** receives the flow as a **script in the prompt** — each step
  becomes a numbered line with the action's description and the rules that stop it
  — and the `conferir` tool returns only the conditions that flow uses. Adding a
  step in the panel changes what the model is told to do.

Pipeline nodes light up through a cursor that walks with the work: the model does
not have to announce which step it is on, and asking it to would be one more tool
existing only to feed an animation.

## Validation

Everything applied goes through the same path, whether it came from the form, the
vocabulary tab or the YAML editor. What does not pass is **not applied**, and the
running flow keeps running — the worst possible outcome would be the demo stopping
because of a slip mid-presentation.

Problems come back as a **list**, in Portuguese, all at once: whoever is editing in
front of the client cannot fix one, retry, and discover the next.

One warning that is not an error: a flow with no `propose` action never concludes
anything — every document ends in human review. It shows up in the log and does
not block, because it may be exactly what you want to show at one point in the
narrative.

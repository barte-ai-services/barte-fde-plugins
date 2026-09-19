# The demo's data

Bad data sinks a demo faster than a bug. "Supplier A / R$ 100.00" tells the client,
in two seconds, that this is a mock-up.

**The sample content is in Portuguese on purpose** — it mimics Brazilian tax
documents, and the field names (`chave`, `valorTotal`, `emitente`) are the domain's
own. Only the envelope (`id`, `type`, `subject`, `received_at`, `sender`, `content`)
and `registry.json`'s keys are English and snake_case, because those are the wire
format.

## The rule

> **The demo never opens at zero.** It is born with weeks of work behind it — and
> today's batch is what runs in front of the client.

`generateHistory()` (`apps/api/src/provisioning/history.ts`) produces ~38 items
spread across the last 21 days, ~22% of them in review. The curated documents in
`data/documents/` are today's batch.

**Generated, but from a fixed seed.** Real randomness would make the figure on
screen change between the rehearsal and the meeting — and that is exactly when
someone asks "where did that number come from?".

The curated batch is **moved to today** on import (`rebase.ts`): the most recent
document becomes today's and every other one shifts by the same number of days,
preserving the gaps. A demo saved in September does not open in January claiming
the invoice was due three months ago.

## If the client sent material

**It drives the data, always.** Spreadsheet, report, invoice, statement, a
screenshot of their system — convert it into `data/documents/*.json` (one file per
document) and adjust `data/registry.json` with their counterparties, chart of
accounts and approval limit.

For an `.xlsx`: use the `xlsx` skill to read it before converting. And
**anonymise anything identifiable** if the material cannot circulate — swap CNPJ
and legal name while keeping the format.

None of this touches code: provisioning reads the folder and uploads what it
finds.

## If they sent nothing

Adjust the counterparties and amount ranges to the client's sector. It is cheap and
it changes the perception — a logistics company sees logistics names.

What makes data believable:

- **A formatted, plausible CNPJ**: `04.252.011/0001-10`.
- **An NF-e key that looks like one**: 44 digits, starting with the state code.
- **Amounts consistent with each other**: the invoice matches the order, the
  withholding is a rate that exists, the due date falls after the issue date.
- **The client's vocabulary**: the words they used in the meeting — CFOP, cost
  center, competência, medição, apontamento.
- **Plausible names from the sector**, not "Company 1".

## Planted exceptions

Each exception proves **one** capability. The template's six:

| Document | What it proves |
|---|---|
| `01-nfe-ativa-logistica` | the happy path — the agent concludes on its own |
| `02-nfe-nexo-divergencia` | checks invoice against order and finds R$ 18.90 |
| `03-boleto-fornecedor-novo` | a different type (boleto) and a registry gap |
| `04-nfe-duplicidade` | recognises what has already been posted |
| `05-nfe-retencao-ausente` | reads the service and knows INSS was not withheld |
| `06-nfe-acima-alcada` | respects the approval limit and escalates to a person |

**About a fifth of the batch in exception** is the ratio that works. Much less looks
like magic; much more looks like the agent solves nothing.

When adapting: ask the salesperson for three real situations where the client's
process gets stuck today, and plant one for each. The client recognises their own
case on screen — that is the moment the demo stops being a presentation.

## The format

```json
{
  "id": "nfe-0001",
  "type": "nfe",
  "subject": "NF-e 18.822 - Ativa Logistica",
  "received_at": "2026-09-15T08:41:00-03:00",
  "sender": "faturamento@ativalog.com.br",
  "content": {
    "chave": "35260904252011000110550010000188221099887755",
    "emitente": { "nome": "Ativa Logística e Transportes Ltda", "cnpj": "04.252.011/0001-10" },
    "emissao": "2026-09-12",
    "vencimento": "2026-10-12",
    "valorTotal": 8470.35,
    "descricao": "Prestação de serviço de transporte rodoviário de carga - setembro/2026",
    "pedido": "PC-2026-4471",
    "valorPedido": 8470.35,
    "retencoes": { "iss": 0, "irrf": 127.06, "inss": 0 }
  }
}
```

`content` is free-form — it is the client's format. What the application reads is
in `extract()` (`tools.ts`); a new field that has to become a column goes through
there.

## The registry

`data/registry.json` is what the agent looks up: `counterparties` (each with
`cost_center` and `account`), `auto_approval_limit`, and `already_posted` — the
keys that feed the duplicate check. In a real demo this mirrors the client's ERP — swap in accounts
**they** recognise.

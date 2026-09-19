# Functional demo

A demo the client actually **uses**: web carrying Barte's brand, a NestJS backend,
storage, queue and database in containers, and an agent that reads a document,
checks the rules and stops when it does not know — explaining why.

Code and comments are English; everything on screen is Brazilian Portuguese.

## Run it

```bash
./scripts/start.sh
```

Or double-click **`demo.command`** in Finder. It picks free ports, brings the
infrastructure up, waits for everything to answer and opens the browser. `Ctrl-C`
stops the processes; the containers stay up (`make down` stops them).

Needs **Docker** and **Node 20+**. No API key and no internet: the agent runs the
deterministic engine by default.

Before presenting:

```bash
make check
```

## The cloud

`CLOUD` in `.env` picks: `aws` (Floci), `gcp` (fake-gcs-server + the Pub/Sub
emulator) or `azure` (Azurite). The application code is the same in all three —
only the adapter changes. Pointing at the real cloud means deleting the emulator's
address from `.env`.

## The flow and the words

The pipeline steps, the rules that stop the agent and everything the screen calls
things live in `data/flow.yaml` — and in the **Editar fluxo** panel inside the
demo, where you can add a step, switch on rules, or turn accounts payable into
accounts receivable in front of the client, without restarting. What you apply
takes effect from the next document; "back to original" re-reads the file.

## Layout

```
apps/web/        Next.js 16 + barte-design-system
apps/api/        NestJS: items, events (SSE), agent, telemetry, provisioning
  src/cloud/     the two ports (storage and queue) and the three adapters
  src/flow/      the flow as data: catalog of actions and rules, validation
  src/agent/     the two engines and the deterministic tools
data/            documents, registry and flow.yaml — where the client comes in
infra/compose/   the emulators, one profile per cloud
scripts/         start.sh (the one-command path) and check.sh
```

## Swapping in the client's data

Convert their material into `data/documents/*.json` (one per document) and adjust
`data/registry.json`. No code changes: the API reads the folder at startup.

With no material from the client, the demo is already born with generated history
(fixed seed) and six curated documents — each proving one agent capability.

## Commands

| | |
|---|---|
| `./scripts/start.sh` | brings everything up and opens the browser |
| `make check` | verifies infrastructure **and** screen before the meeting |
| `make down` | stops the containers, keeping the data |
| `make clean` | drops the volumes — the pipeline returns to its initial state |
| `make build` | compiles both apps |

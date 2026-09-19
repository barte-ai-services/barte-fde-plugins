# The demo's architecture

```
browser ──► web (Next.js 16)  ──HTTP──►  api (NestJS)
                 ▲                          │
                 └────── SSE ───────────────┤
                                            ├──► Postgres   items, proposals, decisions
                                            ├──► storage    documents as they arrived
                                            └──► queue      hands work to the agent
                                                   │
                                              worker (same process)
                                                   └──► agent ──► tools
```

Everything in containers on the presenter's machine. **What changes in a real
installation is each component's address — not the code.**

## Three clouds, two adapters

The application talks to two interfaces, `Storage` and `Queue`
(`apps/api/src/cloud/ports.ts`), and nothing else. `CLOUD` in `.env` picks who
implements them:

| | AWS | Google Cloud | Azure |
|---|---|---|---|
| storage | S3 | Cloud Storage | Blob Storage |
| queue | SQS | Pub/Sub | Queue Storage |
| database | Aurora (PostgreSQL) | Cloud SQL (PostgreSQL) | Azure Database (PostgreSQL) |
| local emulator | **Floci** (one container) | `fake-gcs-server` + the official Pub/Sub emulator (two) | **Azurite** (one, Microsoft's own) |

Two ports on purpose: keeping the document and handing out work is what the demo
does, and all three clouds have both. A third port would multiply the adapters by
three and add nothing to the conversation with the client.

Provider packages are installed **only for the chosen cloud** — `new-demo.sh
--cloud gcp` installs Google's, and an AWS demo carries none of them. That is why
the GCP and Azure adapters load their SDK through `import()` with the name in a
variable: with a string literal, TypeScript would try to resolve the package at
compile time and fail the AWS demo.

### Why Floci and not LocalStack

Both speak the same API on the same port; swapping them is one image line. What
decides is what the **open** edition ships: in LocalStack, state persistence is a
Pro feature. In a demo that is no detail — the client closes the laptop, you run
`down`, and at the next meeting the work already done has to still be there. Floci
is MIT, needs no token, and persists.

### Why a plain Postgres and not the emulator's managed database

Floci has `rds`, and what it does when you create an instance is **bring up a
Postgres in a container** — for which it needs the Docker socket mounted inside
it, i.e. control of the machine's daemon handed to the emulator. In exchange you
get a control API this demo never calls: the application connects by URL.

Aurora, Cloud SQL and Azure Database with the PostgreSQL engine **are** Postgres.
Pointing at a real Postgres is the more faithful version of production, not the
less. (Same reasoning that keeps Redis outside the emulator in `gatekeeper`.)

## Pointing the demo at the real cloud

One line of `.env`, no code:

- **AWS** — delete `AWS_ENDPOINT_URL`. The SDK resolves the address itself and
  uses your profile's credentials.
- **GCP** — delete `STORAGE_EMULATOR_HOST` and `PUBSUB_EMULATOR_HOST`, and
  authenticate with `gcloud auth application-default login`.
- **Azure** — swap `AZURE_STORAGE_CONNECTION_STRING` for the real account's.

That is how the same demo becomes a pilot in the client's account.

## Ports

None are fixed. `scripts/start.sh` finds the **first free** port from 3000 (web),
8080 (api), 5432 (Postgres) and the active cloud's emulator — and exports the
number to everyone: compose, API, web and browser. This exists because 4566 is the
`gatekeeper`'s port: running both would lose the demo to "port is already
allocated" thirty seconds before the meeting.

From the second run on, the demo's own containers hold those ports, so after
`up` the script asks **Compose** which port each service actually publishes. The
Compose project name comes from the demo's **folder**: with a fixed name, two
demos prepared in the same week would share containers and volumes, and bringing
the second up would recreate the first one's database.

## Persistence

Volumes survive `down`. `make clean` wipes them and the pipeline returns to its
initial state. That is why the demo can stay with the client: they poke at it
today, and next week their work is still there.

## What the backend serves

| Route | What |
|---|---|
| `GET /api/items` | the whole queue, most recent first |
| `GET /api/items/:id` | one item with its decision trail |
| `POST /api/items/import` | re-reads storage — how a new document joins mid-meeting |
| `POST /api/pipeline/run` | queues everything pending |
| `GET /api/events` | SSE: pipeline steps, decisions, exceptions, telemetry, flow changes |
| `GET /api/flow` | the live flow, including the vocabulary |
| `PUT /api/flow` · `PUT /api/flow/file` · `POST /api/flow/restore` | apply and restore |
| `GET /api/health` | each component, its role in plain Portuguese, and its health |
| `GET /api/telemetry` | calls per component, median and worst case |

**SSE and not WebSocket**: the stream is one-way and SSE reconnects on its own
when the laptop sleeps mid-meeting.

The worker runs in the **same process** as the API. In a real installation it is a
separate service — and that is exactly the conversation the demo opens: work
already arrives through a queue, so splitting it is changing where the process
runs, not rewriting the flow.

## Naming

Two conventions, and the split is deliberate:

- **What crosses the wire is snake_case** — API JSON, the events stream,
  `data/flow.yaml`, the sample documents and the database columns
  (`review_reason`, `escalate_if`, `received_at`, `cost_center`). The TypeScript
  interfaces that mirror those payloads carry the same keys, the way the Anthropic
  SDK does with `max_tokens` and `stop_reason`.
- **Everything else follows the language** — camelCase for variables and
  functions, PascalCase for classes and React components, and NestJS/Next file
  naming (`flow.service.ts`, `page.tsx`).

Mixing them is how you end up mapping names at every boundary; keeping the border
at the wire means one conversion point, in `fromRow`, and nowhere else.

## Environment traps

- **Next 16 blocks dev resources outside `localhost`.** Without
  `allowedDevOrigins: ["127.0.0.1", "localhost"]`, the page opens, renders and
  **does not hydrate** — no clicks, no API calls, no error in the browser console.
  The warning lands in the `next dev` log.
- **File bind mounts are brittle.** If the path is not shared in Docker Desktop, it
  mounts an empty directory and the container dies with "is a directory". That is
  why the API itself provisions and seeds.
- **TypeScript does not copy `.sql`.** `nest-cli.json` declares `assets` with
  `watchAssets`; without it the process boots, maps the routes and dies on the
  first `readFileSync`.
- **`curl … | grep -q` with `pipefail` fails what is correct** — `-q` closes the
  pipe, curl dies of SIGPIPE, and the pipeline's status is curl's.
- **Google's Storage library breaks when `STORAGE_EMULATOR_HOST` is set**: it takes
  a legacy path where writes answer "Not Found" while reads keep working. The
  adapter deletes the variable and passes the address through `apiEndpoint`.

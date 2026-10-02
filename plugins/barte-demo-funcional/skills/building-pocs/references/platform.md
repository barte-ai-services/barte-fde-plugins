# Deriving the architecture, on the platform

The POC runs on Barte's components, locally, in containers. That is the point of
it: what the client sees is the platform doing the work, and what changes for a
real installation is the address of each piece, not the code.

## From capability to component

Go through the capability list of the analysis and place each one.

| The capability needs | It goes to | Why this and not something else |
|---|---|---|
| a process that waits for a person, resumes on a new input, or holds a lock | **Loom** (Temporal): one workflow per unit of work, signals for the human decision | the wait survives a restart; a queue and a status column do not |
| records the screen filters, searches, counts or joins | a **domain Postgres**, separate from Temporal's | the count behind "three equal decisions become a rule" is a query |
| a file: a document, an e-mail, a spreadsheet | **S3**, one prefix per kind | the file is the thing; the database holds what was read from it |
| "a file arrived, start the process" | S3 event → **SQS** → an ingress loop → signal-with-start | it is the production shape, and the emulator supports it |
| sending something out | **SES**, only after an explicit approval | inspectable in the emulator, and nothing really leaves |
| any external system (ERP, bank, portal) | the **gatekeeper**, with a connector pointing at a **stub** | swapping the stub for the real system is swapping one YAML |
| reading a document | an extractor in the worker: structured file first, PDF text layer second | the emulator's OCR returns fixed content |
| deciding the next step | a **rules engine**, with the model behind a switch | reproducible, offline, no key |
| live updates | Postgres `LISTEN/NOTIFY` → the API → SSE | no extra component |
| the screen | **Next.js** with the `barte-design-system` | `references/branding.md` |

The domain Postgres is a separate container from Temporal's on purpose. They have
different life cycles, as they do in a client's account.

## The local account: what the emulator does and does not do

The account is emulated by **Floci**. Verified behaviour:

| Service | Works | Does not |
|---|---|---|
| S3, SQS, S3 → SQS notification | yes, including overwrite events | — |
| Secrets Manager, KMS | yes | — |
| SES | sends, and the message is inspectable at `/_aws/ses` | does not receive |
| Textract | — | returns the same fixed content for any document |
| Bedrock | — | returns a fixed stub, not an inference |

Consequences that belong in the plan:

- **Inbound e-mail** is written as raw `.eml` into an `inbox/` prefix. That is what
  an SES receipt rule with an S3 action does in a real account, so the code is the
  same. No mail server is added.
- **Document reading** is local (XML, PDF text layer) with `OCR_ENGINE=textract`
  as the switch for a real account. Generated PDFs must carry a text layer.
- **Inference** is the rules engine with `AGENT_ENGINE=bedrock` as the switch.

## Decisions worth a question

Ask these, one at a time, with a recommendation. Each changes the cost.

1. **Does the external system go through the gatekeeper?** Recommended: yes, with a
   stub upstream. It adds one container and shows the integration door.
2. **How is a document read?** Recommended: structured file plus PDF text layer.
   Real OCR needs a real account.
3. **Which language for the API and the worker?** Recommended: Python for both. The
   Loom worker is Python, and one image serves both.
4. **Where is the scope line?** Recommended: what the client can navigate in the
   proposal. Dead screens are a later cycle.

Do not ask about anything the analysis already settled.

## The compose

Start from the client repository's `projects/exemplo/deploy/compose/compose.yml`.
It already brings up the four Temporal services, their Postgres, Floci, the account
provisioning job and the Loom console. Add only what belongs to the project.

Rules that came from failures:

- **It comes up with no `.env`.** Every `${VAR:-default}` default is the POC's
  value. `.env.example` documents the overrides. The template's defaults say
  `exemplo`; replace every one.
- **Nothing comes from the shell.** A variable the compose reads from the machine's
  environment works on the laptop that happens to have it, and takes another value
  on the host. A region taken from the shell put the emulated account in one region
  and the gatekeeper looking in another.
- **Every image has a version.** No `latest`: the emulator was one version on the
  laptop and another on the host.
- **The web server listens on every interface.** Next's stand-alone server binds to
  `HOSTNAME`, which in a container is one network's address. Set `HOSTNAME=0.0.0.0`
  in the image.
- **`platform: linux/amd64` per service**, on `temporalio/server`,
  `temporalio/admin-tools`, `loom/console`, `loom/proxy` and `gatekeeper/proxy`.
  They have no runnable arm64 image. Do not set it globally: Floci is multi-arch
  and a global default breaks a cached native image.
- **Host ports away from the usual ones.** 3000, 4566, 7233, 8080 and 8233 are
  taken on most developer machines. Publish on loopback only, and let internal
  traffic use service names.
- **The gatekeeper needs `AWS_*` as well as `BARTE_AWS_*`** in its environment, or
  the connector reports the credential as unresolved. It runs without `edge` and
  without Redis in a POC.
- **One image, built once.** When several services share an image, only one of them
  declares `build`. Four parallel builds of the same tag race on the classic
  builder and fail on a clean machine.
- **No bind mounts for configuration.** Bake the gatekeeper's config into a small
  image. An unshared path mounts as an empty directory and the container dies.
- **A binary crosses the gatekeeper as base64 in JSON.**
- **A minimisation map on every connector response.** Remove the fields the process
  does not use. It is cheap, and it is visible in the stack panel.

## Platform skills to use instead of improvising

- Workflows and activities: the `implementing-loom-workflows` skill of the
  `barte-loom` plugin.
- A connector and its stub: the `creating-upstreams` skill of the
  `barte-gatekeeper` plugin.
- A decision that is expensive to undo: a decision record in the project, in the
  repository's own format.

## What the worker looks like

Two workflows are enough for most POCs:

- **one per batch** (a closing, a file, a day), started by signal-with-start from
  the ingress, that reads the input, starts one child per item, accepts a later
  complement by signal, and holds the lock on anything that leaves;
- **one per item**, the agent loop: `infer` picks the next tool, `run_tool` runs
  it, until it proposes or escalates. Escalating waits for a `decide` signal.

Children are abandoned, not cancelled, when the parent closes: an open exception
keeps waiting for its decision.

Activities are synchronous functions on a thread pool. Pace them (around 250 ms per
step) so the screen shows work happening instead of a finished table.

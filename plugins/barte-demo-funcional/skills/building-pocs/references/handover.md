# Handing over

The POC lives in the client's repository, as a project, from the first commit.

## The project folder

Client repositories come from the platform's template. A project is a folder under
`projects/`, with the skeleton of `projects/exemplo/`. The POC is `projects/poc/`.

| Folder | Holds | In a POC |
|---|---|---|
| `apps/` | services that answer | the web app, the API, the stub of the external system |
| `workers/` | processes that work | the Loom worker, and the one-shot seed |
| `packages/` | what apps and workers share | the domain: database, storage, rules |
| `flows/`, `agents/` | Loom flows, Guild agents in use | a README saying where the code is |
| `tests/e2e/` | the end-to-end script | |
| `deploy/compose/` | the local environment | the compose, `.env.example`, a Makefile, the connector's config |
| `docs/` | eight folders | below |
| `data/`, `scripts/` | the extracted proposal data; the start scripts | |

Read the repository's `AGENTS.md` first. It wins over this file. The rules that a
POC meets on its first day:

- **Names of apps and workers are unique in the repository**, so prefix them:
  `poc-web`, `poc-api`, `poc-reconciliation`.
- **Prose in Portuguese, code in English.** Identifiers, fields, routes and folder
  names are English from the first line. The screen's vocabulary is Portuguese and
  it is tempting to carry it into the code; translating later is a rewrite.
- **What comes from the template is not edited.** Root files change upstream.
  The licence notice is the exception: a new dependency updates it in the same
  commit.
- **The pull request is the only way in.** A branch, a pull request, and the
  repository's own check before asking for review.

## Where the POC departs from the rules

A POC departs on purpose in a few places. Write each one in
`docs/architecture/README.md`, with the reason and who owns it when the POC becomes
a project:

- it brings up its own Loom and gatekeeper, because the client's installation does
  not exist yet;
- the connector's config sits in the project's compose, not in the root
  `connectors/`, because it points at a stub;
- one image for the back-end, to shorten the first start;
- no unit tests: the end-to-end script is the coverage.

## The eight documentation folders

The repository's check requires all eight, each with a README.

| Folder | In a POC |
|---|---|
| `context` | the client and the pain, what the POC proves, where the agent stops, what was delivered, out of scope; the approved plan; `explainer/`, the source of the PDF |
| `architecture` | the diagram, the components, the departures above, what is open; `decisions/` |
| `domain` | the vocabulary, the tables, the kinds of exception |
| `workflows` | each workflow, its steps, signals and tools; how the restart works |
| `reference` | the API routes, the connector, the ports, the variables |
| `operations` | one-click start, before presenting, restarting, commands, what to do when it fails |
| `security` | what is real and what is fake; what must change before it leaves the presenter's machine |
| `agents` | the agent, its engine, when it stops; what would move to the Guild |

## Decision records

One file per decision that is expensive to undo, in the repository's format: state,
date, context, decision, consequences. A POC usually has four or five: the separate
domain database, the external system behind the gatekeeper as a stub, how documents
are read, the rules engine with the model behind a switch, and any departure from a
repository rule.

## One click

The person who presents is not an engineer and may not have a Mac.

- `scripts/start.sh` (Mac, Linux) and `scripts/start.ps1` (Windows): check that
  Docker is installed, start it if it is stopped, bring the stack up, wait for the
  page and for the process to rest, open the browser.
- `abrir-demo.command` and `abrir-demo.bat`: a double click that calls them.
- A failed start says what to do. The usual cause is missing access to the
  platform's private images: `docker login ghcr.io`.

The first start downloads and compiles for minutes. Say so in the README, and say
to do it before the meeting.

## The contract of a hostable POC

A POC that meets these can be hosted next to others on one machine. Build to this
contract from iteration 1: `references/publishing.md` has the full list, with how
to check each line, and the publication itself.

| Rule | Why |
|---|---|
| comes up with `docker compose up` and no `.env` | the host keeps no per-client configuration |
| one service named `web`, on port 3000, is the only entrance | the edge proxy knows that name |
| `web` listens on every interface (`HOSTNAME=0.0.0.0`) | on the host it sits on two networks, and the proxy comes in by the second |
| nothing is read from the shell: every variable has a value in `.env.example` or a default | the host runs the compose with a clean environment |
| every image has a version, never `latest` | the laptop and the host must run the same thing |
| the API is reached through `web`, on the same origin | one host per client, no CORS |
| invented data only, and no real credential | the machine is shared |
| no call to the outside (ERP, e-mail, model) | no variable cost, nothing leaks |
| `POST /api/restart` returns to the opening state | the demonstration is repeatable |
| survives `stop` and `start` | the machine goes off every night |
| at most 2 GB of memory, healthy within 60 seconds of a start | three fit on one machine |
| private platform images are listed in the host's mirror | the host has no credential for the registry; it compiles the POC's own images |

The reference POC used 1.8 GB in 14 containers and was healthy 17 seconds after a
`docker compose start`.

## The pull request

The body says what is in, how to check it (the two or three commands), what was
verified and on which platform, where the POC departs from the repository's rules,
and what is out of scope. Then bind it in the environment's pull-request view and
read its checks.

## What goes back to this skill

After the POC is presented, write down what the process got wrong: a question that
should have been asked earlier, an iteration that was too big, a trap of the
environment. Open a pull request to this skill with it. The next POC starts from
there.

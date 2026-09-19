---
name: barte-demo-funcional
description: Builds a FUNCTIONAL Barte demo — Next.js web on the barte-design-system, a NestJS backend, storage, queue and database in containers on the client's cloud (AWS, Google Cloud or Azure), and an agent that does real work and accounts for itself on screen. Use it WHENEVER someone asks for a client demo, proof of concept, clickable prototype, pilot, proposal MVP, "a demo the client can actually use", "something working to show in the meeting", a demo with an agent/AI that processes documents or runs a flow, or wants to run, adjust, re-skin or hand over a demo already built. Trigger it too when someone brings the transcript or audio of a discovery meeting and wants it turned into a demo, when they mention LocalStack, Floci, Azurite, Pub/Sub or Bedrock in a demo context, or when they ask to swap the demo's data for the client's own (spreadsheet, report, invoice). Do NOT use it for the single-file HTML demos in the fde-demos repository (those are decks or mocked consoles with no backend), nor for work on the real product.
---

# Building a functional demo

What this skill delivers is not a screen that looks like a product: it is a small
product. Web carrying Barte's brand, a NestJS backend, real storage, queue and
database in containers, and an agent that reads a document, checks a registry,
applies rules and **stops when it does not know**, explaining why. It runs on the
presenter's machine, with one command, no internet and no API key.

On the client's cloud: **AWS**, **Google Cloud** or **Azure** — one environment
variable picks, and the code is identical across the three.

> **This does not replace `fde-demos`.** That is where the single-file HTML demos
> live — narrative decks and mocked consoles — and they remain the right call when
> the meeting is short and the story is what matters. This skill is for when the
> client will **operate** the thing: they click, work happens, data is stored, and
> next week it is still there.

## Language

**Code, comments and these docs are in English. Everything the client reads on
screen is Brazilian Portuguese** — screen labels, agent decisions, the flow
panel's interface and the sample data. When you edit this template, keep that
split: an identifier in Portuguese or a screen label in English are both bugs.

## How to run the conversation

**The person on the other side works in sales.** They know the client's pain and
have no obligation to know what a queue, a container or an agent is. So:

- **One question at a time.** Never dump a questionnaire. Ask, wait, confirm what
  you understood, move on.
- **Offer options, not blank fields.** "Is it accounts payable, reconciliation, or
  something else?" works; "what is the domain?" does not.
- **Translate everything.** No SQS, Postgres or Tool Runner in the conversation.
  Say "the queue that hands out the work", "where the data is stored", "the
  agent".
- **Propose the default and move.** When a detail is missing that only the client
  could answer, assume the most plausible one, say out loud what you assumed, and
  carry on. Stalling on a fact nobody has is the most expensive mistake here.
- **Audio counts as input.** If an audio or the transcript of the discovery
  meeting arrives, listen/read first and come back with the summary as a proposal:
  "I understood the pain is X, the flow is Y, the wow moment is Z — right?". They
  correct what is wrong instead of answering from scratch.
- **Show progress.** After each step, say what exists and what comes next.

## The script, step by step

Follow this order. Do not skip step 0, and do not write code before step 3.

### 0 · Does a demo already exist?

If they want to **run** a finished demo (or show yesterday's again), build
nothing:

```bash
cd <demo-folder> && ./scripts/start.sh
```

One command, or a double click on `demo.command` in Finder. It picks free ports,
brings the infrastructure up, waits for everything to answer and **opens the
browser**. Before presenting, `make check`.

### 1 · Understand the pain (one question at a time)

1. **Who is the client and what hurts?** Ask for one sentence, in the client's own
   words. If there is a transcript or audio, pull it from there and validate.
2. **What does today look like?** The path the document/data travels now: where it
   arrives from (email? a portal? WhatsApp?), who looks at it, where it is posted,
   what gets stuck.
3. **What is the "wow" moment?** The single thing that, seen on screen, makes the
   client turn to the person next to them. The whole demo serves it.
4. **Who will use the demo?** Just you in the meeting, or will the client poke at
   it later? It changes how much the navigation has to explain itself.

### 2 · Define the agent (this is the central question)

Ask, in commercial Portuguese: **"what work does the agent do, start to finish?"**
Then these four, one at a time:

1. **What does it read?** (invoice, boleto, bank statement, spreadsheet, email…)
2. **What does it consult to decide?** (supplier registry, purchase order, chart
   of accounts, approval limits…)
3. **What does it deliver?** (a proposed posting, a reconciliation, a
   classification, a report…)
4. **When does it STOP and call a human?** — the most important of the four. A demo
   where the agent gets everything right convinces nobody who has worked in the
   area. Ask for three real situations where it should block.

Each answer to question 4 becomes a planted exception in the data, and each
exception proves one specific capability. The pattern is in `references/data.md`.

### 3 · Lock the agreement

Write a short `BRIEF.md` in the demo's folder and **show it before coding**:
client, pain, wow moment, what the agent does, where it stops, which screens,
which data, and — explicitly — **what is out of scope**. Showing what you will not
touch is worth as much as showing what you will solve.

### 4 · Create the demo

One more question first, and it is commercial, not technical: **which cloud does
the client use?** If nobody knows, AWS, and say that you assumed it.

```bash
bash ~/.claude/skills/barte-demo-funcional/scripts/new-demo.sh <folder> "<Client Name>" [--cloud aws|gcp|azure]
```

The script copies the template, writes the client's name into the flow's
vocabulary, installs dependencies and the chosen cloud's packages. The result
comes up as is.

Seeing the demo run on Cloud Storage and Pub/Sub in a meeting with a
Google-house client is worth more than any architecture slide.

### 5 · Swap in the data

**If the client sent material** (spreadsheet, report, invoice, statement), it
drives the data — always. Convert it into `data/documents/*.json` (one document
per file) and adjust `data/registry.json`. For `.xlsx`, use the `xlsx` skill to
read it before converting. **Anonymise anything identifiable** if the material
cannot circulate.

**If they sent nothing**, the template is already born with realistic data and
opens with weeks of work behind it: `generateHistory()` produces the history from
a fixed seed, and the six curated documents are today's batch. Adjust supplier
names and amount ranges to the client's sector — it is cheap and it changes the
perception.

A rule that does not bend: **no "Supplier A / R$ 100.00"**. Formatted CNPJs, an
NF-e key that looks like a key, amounts consistent with each other, plausible
names from the sector. That is what makes the client see their own system.

### 6 · Adapt the flow and the words

Both are **data**, and both are editable inside the demo, in the **Editar fluxo**
panel:

| What you want | Where |
|---|---|
| add/remove/reorder a step, change text, switch on an existing rule | the panel's **Etapas** tab, live — or `data/flow.yaml` |
| turn the demo into accounts receivable, reconciliation, anything else | the panel's **Vocabulário** tab: module, counterparty, what arrives, field labels |
| a rule or action that does not exist yet | `apps/api/src/flow/catalog.ts` — one entry, and it shows up in the panel |
| what the tools look up | `apps/api/src/agent/tools.ts` |

**Take the panel into the meeting.** When the client describes a step nobody had
foreseen, add it there, apply, and run the pipeline: the next document already
follows their flow. That is the moment the demo stops being a presentation.

Both engines — the deterministic one and the Claude one — read the same flow and
publish the same events, so the screen cannot tell which is running. Details in
`references/flow.md` and `references/agent.md`.

### 7 · Check it with your own eyes

```bash
make check
```

The screen checks exist because the most embarrassing way to fail is not being
down: it is the page opening with no CSS, or opening beautifully and **not
responding to clicks**. After the green, take the manual pass the script lists —
open it, run the whole pipeline, open a blocked item, open the stack panel, and
narrow the window to the width of the screen you will project from.

### 8 · Hand it over

- **In the meeting:** `./scripts/start.sh`, full screen, pipeline run once before
  you start.
- **For the client to use afterwards:** the demo runs on their machine with Docker
  + Node, or on a machine of yours they can reach. For a demo **without a
  backend**, the internal portal (`demos-portal`, `<slug>.demos.barte.ai`)
  publishes HTML for 7 days — this one has a backend, so it does not apply.
- **Record what you learned** in `fde-demos/aprendizados/` after the meeting. The
  commercial process is the same.

## What the demo has the moment it is born

- A live pipeline lighting up over SSE while the agent works — with whatever steps
  the flow declares, not a fixed list.
- A queue with per-item status and a drawer holding the **decision trail**: what
  the agent decided, why, how confident.
- The **"Editar fluxo"** panel: add a step, choose what the agent does in it, tick
  what makes it stop, and rename everything the screen says — by form or by
  editing the YAML — **without restarting the demo**. Validation in Portuguese, and
  "back to original" always at hand.
- The **"A stack desta demo"** panel at the bottom of the sidebar: every component,
  its role in plain Portuguese, its health, and calls to the database/storage/queue
  **live, in milliseconds**. It is the answer to "is this actually running?".
- Seeded history — the screen never opens at zero.
- Barte's brand through the real design system, the same one `barte-copilot` uses.
- The same demo on **AWS, Google Cloud or Azure**, by changing one line of `.env`.

## References

| File | When to read it |
|---|---|
| `references/branding.md` | before touching any screen — DS, tokens, the CSS traps |
| `references/architecture.md` | before touching the backend, the infrastructure or the ports |
| `references/flow.md` | before changing steps, rules, vocabulary, or adding a catalog verb |
| `references/agent.md` | before changing how the agent works, or switching on the Claude engine |
| `references/data.md` | before swapping in the client's data or planting exceptions |

## Mistakes that have already cost time

- **Coding before step 3.** A generic demo comes back as rework.
- **Happy path only.** With no exception that blocks, the demo looks fake.
- **Invented data that does not look real.** It destroys credibility in two
  seconds.
- **Presenting without `make check`.** A screen with no CSS erases every other
  merit.
- **Promising what the demo does not do.** What is out of scope belongs in the
  BRIEF and in the conversation, not as a surprise at the next meeting.

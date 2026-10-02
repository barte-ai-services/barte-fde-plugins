# The explainer document

A PDF, on Barte's brand, that explains the POC to someone who was not in the room
when it was built. It is the third thing this skill delivers, next to the POC
running and the POC published.

Without it, the knowledge of what the POC does, where it stops and what is fake
stays in the head of whoever built it, and the presenter improvises.

## Who reads it

Whoever will present, evaluate or evolve the POC: a client partner, another FDE,
sometimes the client. Not necessarily an engineer. So:

- no table name, no function name, no file path outside the last section;
- each component is introduced by what it does for the work, then named;
- the reader can stop after any section and still have something true.

Ask the builder who the reader is. A document that goes to the client is the same
document with section 10 read twice.

## What it holds

Twelve A4 pages, eleven sections, in this order. The order goes from the client's
problem inward, so a reader who stops early has the part they needed.

| | Section | It must hold | Where the facts come from |
|---|---|---|---|
| | Cover | the client as text, what the POC does, the four opening numbers | the summary endpoint |
| 1 | The problem | the manual work today, as three or four steps | `docs/context` |
| 2 | The path | three to five steps, from what arrives to what goes back | the workflow |
| 3 | The main screen | the screenshot, and what each region shows | the running POC |
| 4 | How the agent works | one row per tool, following **one real item** to the end; how the score is made; the document, opened | the tools, the rules module, the item's detail |
| 5 | When the agent stops | every kind of exception, with its count and one real example | the summary and each exception's reason |
| 6 | The decision | what the person sees, what confirming does, how a decision becomes a rule | the decision tool |
| 7 | What goes back | what approving produces, and what arriving work does to the numbers | the return activity, the simulation |
| 8 | The parts | a diagram, and one row per component | the compose |
| 9 | What is stored | one row per table, in the business's words; the states of an item | the schema |
| 10 | Real and simulated | two columns; why the agent follows rules; what is out of this version | the security document, the plan |
| 11 | How to present | the guided demonstration's steps and its measured time; where to open it | the script, the host |

## How to write it

Use the `writing-barte-voice` skill. On top of it:

- **One item, start to end.** Pick an item that the agent reconciled alone and that
  needed the interesting path. Select it in the screenshot of section 3, follow it
  step by step in section 4, and open its document. The reader learns the process
  once, on a real case.
- **Every number is read, not remembered.** Counts from the summary endpoint, the
  example from the item's detail, weights and thresholds from the code. Read them
  again on the day the document is built.
- **Say what is a premise.** A saving shown on screen that came from the proposal,
  and not from a measurement, is named as a premise in section 1.
- **Section 10 is never dropped.** List every label on the screen that promises
  more than the code does. In the reference POC the screen says "IA" and "OCR",
  and the document says that this version scores e-mails by rules and reads the
  note from its XML or its text layer.
- **A caption says what to look at**, not what the picture is.
- **Short sentences, one idea each.** No adjective standing in for a number, no
  sentence that only announces the next one, no "it is worth noting".
- **The client is a name in plain text.** Never their logo.
- **No password, no real data, no promise** about a pilot or a date.

## Build it

The source lives with the POC, in `projects/poc/docs/context/explainer/`. Start the
POC locally and put it in its opening state, then:

```bash
cp assets/explainer/template.html projects/poc/docs/context/explainer/explainer.html
cp assets/explainer/shots.example.json projects/poc/docs/context/explainer/shots.json
cd projects/poc/docs/context/explainer
node <skill>/scripts/extract-brand.mjs http://127.0.0.1:3210/ brand
node <skill>/scripts/capture-screens.mjs shots.json
node <skill>/scripts/build-explainer.mjs explainer.html
```

1. **`extract-brand.mjs`** takes Barte's logo and typeface from the running web app,
   which carries them through the design system. Nothing is downloaded or redrawn.
2. **`capture-screens.mjs`** follows `shots.json`: click, wait, photograph. Rewrite
   the list for this POC, with the same hooks the guided demonstration uses.
3. **Write** `explainer.html` from the template: every text in brackets, the
   diagram, the tables.
4. **`build-explainer.mjs`** measures every page, prints the PDF and renders each
   page to `pages/`.

The scripts need Node 22 or newer and a Chromium-based browser already on the
machine. They share `scripts/lib/browser.mjs`, which finds the browser; set
`BROWSER_BIN` to choose one.

## Figures

Seven are enough: the main screen, the document open, a stopped item's rules, the
queue of stopped items, one decision, the return, and the stack panel.

- Cut a figure to the element that matters, with `of`. A whole window in a page is
  too small to read.
- A tall window (`resize`) shows a whole column. A short one keeps a drawer's
  footer, with its button, in the picture.
- A figure cut by `maxHeight` gets the class `fades`, so it fades out and does not
  end in a hard cut through a row.
- Look at the edges of every figure. A shadow or half a button at the border is a
  wrong cut.
- Photograph from the opening state, so the figures agree with the numbers.

## Pages do not grow

A page is a fixed sheet. Text that does not fit is cut, silently, in the PDF. The
build measures each page and refuses to print when one runs into its footer.

Fix an overflow by moving a block to the next page or by cutting text. Do not
shrink the type.

Then **look at every page** in `pages/`. The measurement finds an overflow. It does
not find a figure that shows the wrong state, a table that reads badly or a
caption under the wrong picture.

## Checkpoint D

Show the PDF to the builder and wait. Three things are theirs to decide:

- who the reader is, and so whether section 11 names the repository;
- how section 10 reads when the document goes to the client;
- whether the published address is in it.

## What is committed

`explainer.html`, `shots.json`, `fig/` and the PDF, in the same pull request as
the rest of the documentation or in the next one. `brand/` and `pages/` are
rebuilt by the scripts and stay out of the repository.

When the POC changes on screen, run the capture and the build again. The document
that describes last month's screen is worse than no document.

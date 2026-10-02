# The plan

The plan is what the builder approves at checkpoint B. It is written to be read by
a person in ten minutes, and it becomes an issue.

Use the plan mode of the environment when it has one: the plan is presented for
approval, and nothing is written to the project until it is accepted.

## Sections, in order

### Context

Three to five sentences: what exists today, why it is not enough, and what will be
true when the POC is done. Name the decisions already taken with the builder.

### 1. Analysis of the proposal

The six tables of `references/analysis.md`, with their counts in the headings, and
the table of **deliberate differences**: what the POC does differently from the
proposal, and why.

### 2. Architecture

- One diagram, in text, from the input arriving to the screen updating.
- A table of components with three columns: component, status (already in the
  platform, new, rejected) and why.
- The processes: each workflow, its steps in order, its signals.
- The domain: the tables, in one line each.
- The screen: what is ported from the proposal, and what has to exist for real
  (every attachment opens, every read value says where it came from).

### 3. Iterations

The six iterations of `references/iterations.md`, each with its tasks and one
**acceptance check the builder can run**: a command and the output expected, or a
URL and what is on it. "The screen works" is not an acceptance check. "14 items
reconciled and 9 exceptions, by type: 5, 1, 1, 1, 1" is.

### 4. Out of this cycle

By name. The dead screens, the real integrations, anything the proposal hints at
and the POC will not do.

### 5. Verification

The end-to-end checks, as a numbered list of facts, and the manual pass in the
browser. `references/verification.md`.

### 6. Risks

A table: the risk, and the plan B. Test the riskiest assumption before writing the
plan, when it takes minutes. A risk already tested is reported as tested.

## What makes a plan approvable

- **Counts, not adjectives.** "23 documents, 12 e-mails, 2 spreadsheets."
- **Every new component justified in one sentence**, and every rejected one too.
- **No decision hidden in the build.** If it changes the cost, it is in the plan or
  it was asked.
- **The numbers that will differ from the proposal are named.** A computed
  similarity will not equal the hand-typed one. Say that the cases will land on the
  same side of the line, and that the figures are now computed.

## Filing it

In the client's repository, the plan is saved as
`projects/poc/docs/context/execution-plan.md` and filed with the repository's issue
templates:

| Template | Holds |
|---|---|
| initiative | the problem, the boundaries (in, out, depends on), the decisions, and the iterations as epics |
| task, one per iteration | the context and the acceptance check, as a command |
| plan, under each task | the steps with the files they touch, the execution prompt, and the verification |

Open the issues only when the builder asks for them. Saving the file is enough to
start.

## When the plan changes

Feedback at a checkpoint often changes the plan. Edit the file first: the section,
and one line under a `## Changes` heading with the date, what changed and who asked.
Then build. A plan that no longer matches the code is worse than no plan.

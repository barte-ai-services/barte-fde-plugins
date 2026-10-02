# The iterations

A POC is not delivered in one pass. It is built in six iterations, and after each
one the builder looks at something real and answers. A wrong turn found at the end
of iteration 1 costs an hour. The same turn found at the end costs the build.

## The rules of an iteration

1. **It ends in something the builder can check in ten minutes or less.** A file
   to open, a command to run, a page to look at.
2. **It ends in the report below**, and then it stops.
3. **Blocking feedback is resolved before the next iteration starts.** Other
   feedback is written into the plan, with the iteration that will take it.
4. **One commit per iteration**, on the POC's branch, with what the iteration
   delivered in the message.
5. **It leaves the stack running** and in its opening state.

## The report

In Portuguese, in this order, short:

1. **What exists now**, as facts with numbers.
2. **How to check it**: the command or the address, and what to expect.
3. **What was assumed**, where the proposal or the builder did not say.
4. **What differs from the proposal**, and why.
5. **Up to three questions**, each with a recommendation.

Then the name of the next iteration and what it will deliver. No more.

## 1. The world: data and documents

Everything the process will read exists as a file or a record, and nothing else
does yet.

- Extract the proposal's data with a script into `data/mock.json`.
- Derive the world from it: the client's entities, the external system's records,
  the inbox, the history of earlier periods. Identifiers are valid (a CNPJ with
  correct check digits, an access key with its check digit).
- Generate every document named on screen, as a real file of the right kind, and
  the input spreadsheets in the layout the client's supplier uses.
- A self-test reads every generated document back and compares it with the data it
  was generated from.

**Builder checks:** opens three documents and one spreadsheet. "Does this look like
what your client receives?"

**Acceptance:** the self-test reports every document read back, with zero
mismatches, and the storage listing shows the expected count per prefix.

## 2. The process, with no screen

The workflows run from the input arriving to every item being reconciled or
escalated. There is no web yet; the API and an end-to-end script are the interface.

- The stub of the external system, behind the gatekeeper.
- The domain schema, applied at boot, idempotent.
- The ingress, the batch workflow and the item workflow, with the real tools.
- Exceptions derived from facts, never read from a field.

**Builder checks:** the counts, and the reason of each exception. "Are these the
reasons your client would recognise?"

**Acceptance:** on a fresh stack, the input arrives by itself and the end-to-end
script prints the proposal's numbers: so many reconciled, so many exceptions, by
type.

## 3. The screen, read-only

The proposed screen, in Barte's brand, showing the real data. Nothing is clickable
beyond navigation and opening a document.

- Port the proposal's layout and structure. Map its colours to design-system
  tokens.
- Every attachment opens the real file, next to what was read from it.
- Live updates arrive from the back-end.

**Builder checks:** each screen next to the proposal, at the width they will
present on. This is the iteration where fidelity is judged.

**Acceptance:** for every reachable screen and overlay, a screenshot, with the
differences from the proposal listed.

## 4. The interactions

Everything the client can do: decide, edit, simulate an arrival, export, approve
and send, search.

- Each action reaches the workflow by a signal, and the screen follows by events.
- The restart endpoint returns the POC to its opening state.

**Builder checks:** operates it, start to finish, without help.

**Acceptance:** the end-to-end script covers every action and passes, and it ends
by restarting the POC.

## 5. The guided demonstration

The screen operates itself through the story, doing the real work.
`references/guided-demo.md`.

**Builder checks:** the order of the story and every caption. This is a script for
a meeting; the builder knows the client and will change it.

**Acceptance:** the demonstration runs to the end, twice in a row, at two widths,
with every click landing on its target.

## 6. The package

Whoever presents opens it with one click, and the work is in the client's
repository.

- Launchers for Mac and Windows, and the start script for Linux.
- The eight documentation folders, the decision records, the licence notice.
- The pull request. `references/handover.md`.

**Builder checks:** starts it from a clean checkout with one click.

**Acceptance:** the repository's own check passes, the end-to-end script passes
from the new location, and the report says what was not verified.

## When an iteration is too big

If the report cannot be checked in ten minutes, the iteration was two. Split it at
the point where the builder's answer could change what comes next: one screen
before the others, one workflow before the second.

## When the builder is not there

Do not run ahead through the checkpoints. Finish the iteration, leave the report,
and stop. An iteration built on an unreviewed one doubles what may be thrown away.

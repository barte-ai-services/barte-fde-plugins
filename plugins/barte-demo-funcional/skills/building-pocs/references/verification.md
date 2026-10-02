# Verifying

An iteration is done when it was checked, and the report shows the check. Four
layers, from the cheapest to the one that matters most.

## 1. The end-to-end script

One script, standard library only, that talks to the API of the running stack. It
runs the same on Windows, Linux and Mac, and it needs nothing installed beyond the
language.

It asserts **facts**, in the order of the story, and prints one line per fact:

- the input arrived and the process ran by itself: the counts, by kind;
- what the agent read came from the file: for every reconciled item, a document in
  storage whose extracted amount equals the spreadsheet's;
- the planted exception that depends on reading a document was detected by that
  reading;
- an attachment is served as a real file (check the magic bytes);
- a decision resumed the workflow, the history fed "this happened before", and the
  third confirmation became a rule;
- the simulated arrival was processed;
- the return was generated, stored and sent, only after approval;
- search finds by name without accents, by amount and by external code;
- every component is healthy;
- **the restart returns to the opening state**, and the script ends by restarting,
  so the stack is left ready to present.

Wait on conditions, never on sleeps: poll the summary until nothing is processing.

## 2. The health of every component

One endpoint returns each component with its role in plain Portuguese, whether it
answers, how long it took, and one detail (objects in storage, messages in the
queue, pollers on the task queue). The stack panel on screen reads the same
endpoint, and so does `make check`.

It is the answer to "is this really running?", and it is what tells a presenter
what is wrong before the meeting.

## 3. The browser

`curl` returning 200 proves the server answered. It does not prove the page has
styles, hydrated, or responds to a click. Open it.

- Every reachable screen and every overlay, at **two widths**: about 1440 px, and
  the narrow width of a side panel or a small laptop (about 1024 px).
- Every kind of attachment: a PDF, a structured file, an e-mail, a spreadsheet.
- Each action once, by hand.
- The console, after a fresh load: no error that belongs to the current page.

Compare each screen with the proposal side by side. Fidelity is judged by eye.

## 4. The guided demonstration

To the end, twice, at two widths, with the cursor sampled.
`references/guided-demo.md`.

## From a clean start

Before the hand-over, do it once from nothing: remove the volumes, bring the stack
up with the one-click script, run the end-to-end script, open the browser. A POC
that only works on the machine that built it fails in the meeting.

Time the cold start and the warm start, and write both in the operations document.

## The report

State what passed with its output. Then state, as plainly, **what was not
verified**: a platform not tested, a launcher not executed, a width not checked.
The builder decides what to do with a known gap. An unknown one decides for them.

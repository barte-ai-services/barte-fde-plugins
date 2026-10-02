# Analysing the proposal

The analysis answers one question: **what has to exist for this screen to be
true?** It is done before any architecture is proposed, and it ends in a report the
builder confirms (checkpoint A).

A proposal is a sales artefact. It contains more than the client was shown: screens
left over from an earlier version, buttons that only show a toast, numbers typed by
hand. The analysis separates what the client saw from what merely sits in the file.

## 1. Run the inventory

```bash
node scripts/inventory-mock.mjs proposal.html
```

It prints candidates, and decides nothing:

- **Screen candidates**, with how many navigation references each has in the
  markup. Zero references is a candidate for unreachable.
- **Navigation functions**, with their first lines, so the guards can be read.
- **Data literals**, with their size: the fixture the back-end will own.
- **Files named on screen**: every one is a document the POC has to make real.
- Timers, network calls and browser storage: how much of the behaviour is staged.

## 2. Decide what the client can reach

Read the navigation function and the menu. A screen is **reachable** when a control
the client can click leads to it. A screen that exists in the file but is filtered
out by a guard, or has no menu entry, is **dead code** and is out of scope.

In the proposal that produced this procedure, the file held 11 screens. The menu
listed 2, and the navigation function redirected the other 9 to the first one. The
scope was 2 screens, and the builder confirmed it in one message.

Open the proposal in a browser and click through it once. The inventory cannot see
a drawer that opens from a row, or a tab inside a screen.

## 3. Count, in six lists

Each list is a table in the report. Counts are exact, not "several".

| List | What goes in it | Why it matters |
|---|---|---|
| Screens | reachable, dead, and overlays (drawers, modals, viewers) | the scope line |
| Features | what the client can do or see, one per row, grouped by screen | iterations 3 and 4 |
| Capabilities | what the back-end must be able to do for each feature to be true, with "today in the proposal" next to "in the POC" | the architecture |
| Events | the things that happen in the domain, in the past tense | the trail and the live updates |
| Documents and data | every file named on screen, every record, every history entry | iteration 1 |
| Defects | where the proposal contradicts itself | the deliberate differences |

A **feature** is on the screen. A **capability** is behind it. "The attachment chip"
is a feature; "fetch the attachment from the ERP and store it" and "read the number,
issuer and amount from the file" are the capabilities under it.

For every capability, write what the proposal does today. It is almost always "a
constant", "a toast" or "in memory". That column is the work.

## 4. Find where the agent stops

List every case the proposal shows as an exception, a pending item or a decision.
For each one, write the **fact** that would make a real process stop there: the
document that is missing, the field that does not match, the two candidates with
the same value.

If a case has no fact behind it, the proposal invented the outcome. Say so in the
report and propose the fact.

## 5. Find the defects

Proposals have bugs. Typical ones:

- a value shown as "read from the document" for a document the same screen says
  does not exist;
- a button whose effect is already visible before it is pressed;
- a total that does not match its rows;
- branches for a channel or a state nothing leads to.

Each defect becomes a **deliberate difference**: the POC does the coherent thing,
and the plan says which and why. Never reproduce a bug for fidelity, and never fix
one silently.

## 6. Extract the data, do not retype it

The proposal's data block is JavaScript. Evaluate it in a sandbox and write JSON:
the same records, the same texts, including any post-processing the proposal does
on load. Retyped data drifts from the screen the client saw, one row at a time.

The pattern, in a Node script of the project:

1. slice the script between the first data declaration and the first function;
2. run the slice with `vm.runInContext` in an empty context;
3. return the named literals and write them to `data/mock.json`.

Keep the script in the project (`scripts/extract-mock-data.mjs`). When the proposal
changes, the data is re-extracted, not edited.

## The report

Send it in Portuguese, in this order. It fits on one screen plus the tables.

1. **One paragraph**: what the proposal shows, in the client's words.
2. **The scope line**: N reachable screens in, M dead screens out, by name.
3. **The six tables**, with their counts in the headings.
4. **Where the agent stops**: the cases and the fact behind each.
5. **Defects and the deliberate differences** proposed.
6. **What is still unknown**, and what was assumed in its place.

Then stop. The builder's answer to this report is the first feedback of the build.

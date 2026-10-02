---
name: building-pocs
description: Turn the HTML proposal a client has already seen into a working proof of concept on Barte's platform, through an approved plan and reviewed iterations. Use when an FDE or client partner hands over an HTML mock, a proposed screen or a single-file demo and asks to make it functional, interactive or real; when asked to build a POC, a proof of value or a functional demo for a client; or when resuming, extending, packaging or presenting one. Covers the intake, the screen analysis, the architecture, the plan and its approval, the build in iterations with the builder's feedback, the guided demonstration, verification and the hand-over into the client's repository. Do NOT use it to write the HTML proposal itself, to build a production system, or to deploy infrastructure.
type: skill
clade: discovery
---

# Building POCs

A POC is the proposal the client already saw, made true. The screen is the one that
was proposed. Behind it there is a real process: a spreadsheet arrives as a file,
an agent does the work on the platform's components, a document opens and was read,
and the agent stops when it does not know.

The client sees a POC. They do not use it yet. That is the difference from a pilot,
and it is why the external systems are stubs and the data is invented.

**The builder** is whoever is driving the session: the FDE, with the client partner
behind them. Their feedback is an input to every step, not a review at the end.

Three things hold from the first message to the last:

- **The proposal is the contract of the screen.** Same screens, same layout, same
  words, same numbers. What the client can click defines the scope.
- **Everything on screen exists.** An attachment is a file that opens. A value the
  agent "read" was read from that file. A total is computed.
- **No code before an approved plan, and no iteration on top of open feedback.**

## How to talk to the builder

Write to the builder in **Brazilian Portuguese**. Code, identifiers, routes and
folder names are in English; what the client reads on screen is Portuguese.

- Ask only what the proposal and the repositories cannot answer. Read first.
- Ask one decision at a time, with two to four options and a recommendation, and
  only when the answer changes the cost of the build.
- When the builder explains an idea in free form or by audio, restate it as a
  proposal in three lines and let them correct it. Do not answer a half-understood
  idea with a menu of options.
- When a fact is missing that only the client could give, assume the most plausible
  value, say what was assumed, and continue.

## 1. Take in the proposal

Get three things before reading any code: the proposal file, the client's
repository, and who will present.

The proposal is normally a single HTML file. Read it whole. If there is no proposal
and no repository yet, this is the stand-alone track: follow
`references/standalone-template.md` instead of steps 2 to 7.

The POC is built inside the client's repository, in `projects/poc/`, from the first
commit. `references/handover.md` has the layout. Building it elsewhere and moving it
later costs a migration and leaves the identifiers in the wrong language.

## 2. Analyse the screen

Do this before proposing anything. Start from the inventory:

```bash
node scripts/inventory-mock.mjs path/to/proposal.html
```

Then follow `references/analysis.md`, which ends in a report with counts: screens
the client can reach, screens that are dead code, features, back-end capabilities,
domain events, documents named on screen, and defects in the proposal itself.

**Checkpoint A.** Show the report and wait. The builder confirms the counts and
the scope line: what the client can navigate is in, and the rest is out.

## 3. Derive the architecture

The architecture is a conclusion of the analysis, capability by capability. It is
not a stack chosen beforehand. `references/platform.md` maps each kind of
capability to a platform component, lists what the local emulators cannot do, and
names the decisions that are worth a question.

Every component that is not already in the platform needs one sentence saying why
it is there. Every component considered and rejected gets one too.

## 4. Write the plan and stop

Write the plan from `references/plan.md`: the analysis, the architecture, the
iterations with an acceptance check each, what is out of scope, the verification
and the risks with a plan B.

**Checkpoint B.** The builder reads the plan and says yes. Until then, write no
application code. The approved plan is filed as an issue in the client's
repository and saved in `docs/context/`.

A plan that changes after approval is changed in the file, with the reason, before
the code follows it.

## 5. Build one iteration at a time

`references/iterations.md` defines six iterations. Each one ends in something the
builder can check in ten minutes or less, and in a report with the same five parts:
what exists now, how to check it, what was assumed, what differs from the proposal
and why, and at most three questions.

| | Iteration | The builder checks |
|---|---|---|
| 1 | The world: data and documents | the files open and look like the client's |
| 2 | The process, with no screen | the counts and the reasons the agent stopped |
| 3 | The screen, read-only | each screen next to the proposal |
| 4 | The interactions | deciding, simulating, sending back |
| 5 | The guided demonstration | the story and the captions |
| 6 | The package | one click on a clean machine |

**Checkpoint C, after every iteration.** Stop and wait for feedback. Feedback that
blocks is resolved before the next iteration starts. Commit once per iteration.

`references/realness.md` is the standard for iterations 1 and 2, and
`references/branding.md` for iteration 3. `references/guided-demo.md` covers
iteration 5.

## 6. Verify before you report

A check counts as passing only with the output of the run that shows it.
`references/verification.md` has the four layers: the end-to-end script, the health
of every component, the browser at two widths, and the guided demonstration run to
the end.

Say what was not verified. "Not run on Windows" is part of the report.

## 7. Hand over

`references/handover.md` covers the project layout in the client's repository, the
eight documentation folders, the decision records, the pull request, the one-click
launchers and the contract a POC meets to be hosted.

What the POC taught about this process comes back here, as a pull request to this
skill.

## Rules that do not bend

- **Never redraw the client's logo.** Not as styled text, not recoloured, not as a
  monogram. The client's name is plain text, or their official file untouched.
- **The agent stops.** At least three planted situations where it does not decide,
  each one derived from a fact in the data, each with the reason on screen.
- **Deterministic by default.** A rules engine drives the agent, so the result is
  the same in every presentation. A real model sits behind an environment switch.
- **No real data and no real credential.** External systems are stubs behind the
  gatekeeper.
- **The demonstration returns to its opening state** by one call, without tearing
  the stack down.
- **Out of scope is written down**, in the plan and in `docs/context/`.
- **Every word the client reads follows Barte's voice.** Use the
  `writing-barte-voice` skill for screen text, captions and documents.

## Mistakes that already cost time

- Making the static HTML clickable instead of building the process behind it.
- Building a generic app with a generic stack when the platform's components were
  the point.
- Simplifying the proposed screen. A POC that runs on the right stack and shows a
  different screen is rejected.
- Retyping the proposal's data instead of extracting it with a script.
- Serving the "attachment" as a label, and the "read value" as a constant.
- Starting to code while the builder was still explaining the idea.
- Delivering everything at once, with no point where the builder could redirect.
- Reporting done from `curl` when the page had not been opened in a browser.

## References

| File | Read it |
|---|---|
| `references/analysis.md` | before the analysis report of step 2 |
| `references/platform.md` | before choosing components, and before touching the compose |
| `references/plan.md` | before writing the plan |
| `references/iterations.md` | at the start of each iteration |
| `references/realness.md` | before generating data, documents or exceptions |
| `references/branding.md` | before touching any screen |
| `references/guided-demo.md` | before building the guided demonstration |
| `references/verification.md` | before reporting an iteration as done |
| `references/handover.md` | before creating the project folder, and before the pull request |
| `references/standalone-template.md` | when there is no proposal and no client repository |

The stand-alone track keeps its own references: `references/template-architecture.md`,
`references/template-agent.md`, `references/template-flow.md` and
`references/template-data.md`. Its scaffold is `scripts/new-demo.sh`.

## When this skill does not apply

- **Writing the proposal.** The single-file HTML that goes into a commercial
  proposal is made before this skill starts. This skill takes it as input.
- **Building what the client will use.** A pilot or a production system starts
  from an initiative, with real integrations and real data, under the repository's
  full rules. A POC whose stubs were swapped for real systems is not a pilot.
- **Deploying.** Hosting a POC, or creating cloud resources for one, is its own
  plan with its own approval. This skill only makes the POC fit to be hosted.
- **A short meeting where the story is enough.** A narrative deck or a mocked
  console is faster, and no back-end is needed.

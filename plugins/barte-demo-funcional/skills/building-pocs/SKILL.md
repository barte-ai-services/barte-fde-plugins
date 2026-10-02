---
name: building-pocs
description: Turn the HTML proposal a client has already seen into a working proof of concept on Barte's platform, through an approved plan and reviewed iterations. Use when an FDE or client partner hands over an HTML mock, a proposed screen or a single-file demo and asks to make it functional, interactive or real; when asked to build a POC, a proof of value or a functional demo for a client; or when resuming, extending, packaging or presenting one. Also use it to publish a POC to Barte's POC host (an address under `poc.barte.ai`), to diagnose a published one, or to write the PDF that explains how a POC works. Covers the whole chain: the intake, the screen analysis, the architecture, the plan and its approval, the build in iterations with the builder's feedback, the guided demonstration, verification, the hand-over into the client's repository, the publication and the explainer document. Do NOT use it to write the HTML proposal itself, to build a production system, or to create or change the hosting infrastructure.
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

A POC is delivered as three things, and it is not done until the three exist:

1. **the POC running**, in the client's repository, started with one click;
2. **the POC published**, at an address the presenter opens in a browser;
3. **the document that explains it**, a PDF on Barte's brand.

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
`references/standalone-template.md` instead of steps 2 to 9.

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
`references/verification.md` has the five layers: the end-to-end script, the health
of every component, the browser at two widths, the guided demonstration run to the
end, and all of it again on the published address.

Say what was not verified. "Not run on Windows" is part of the report.

## 7. Hand over

`references/handover.md` covers the project layout in the client's repository, the
eight documentation folders, the decision records, the pull request, the one-click
launchers and the contract a POC meets to be hosted.

## 8. Publish

The POC goes to Barte's POC host, at `<client>.poc.barte.ai`, by a workflow started
from GitHub. `references/publishing.md` has the contract, the rehearsal, the
command, the verification and what to do when it fails.

- **Rehearse first.** The host's own tool runs on the builder's machine and
  reproduces the two conditions that differ from a laptop: a clean environment and
  a second network. What fails there fails on the host.
- **Publish from GitHub.** Nothing is applied to the cloud from a laptop.
- **Verify behind the proxy.** The end-to-end script against the public address,
  and the guided demonstration to the end. A green workflow only means the
  containers started.

Do not type the host's password into a browser, and do not write it anywhere. The
reference says how to verify without it.

## 9. Write the explainer

A PDF of about twelve pages that explains the POC to someone who was not there:
the problem, the path of the work, how the agent decides and where it stops, the
parts, what is stored, **what is real and what is simulated**, and how to present.
`references/explainer.md` has the outline and the rules of writing.

```bash
node scripts/extract-brand.mjs http://127.0.0.1:3210/ brand
node scripts/capture-screens.mjs shots.json
node scripts/build-explainer.mjs explainer.html
```

The source is `assets/explainer/template.html`, and the three scripts share
`scripts/lib/browser.mjs`. The build refuses a page whose content overflows; then
look at every page before sending it.

**Checkpoint D.** The builder opens the published address and reads the PDF. They
decide who the document is for and how frank it is about what is simulated.

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
- **Nothing reaches the cloud from a laptop.** Publishing is a workflow, and a
  change to the host is a pull request to its repository.
- **Everything lives in the organisation `barte-ai-services`.** No repository,
  branch or pull request anywhere else without the builder asking for it.
- **No component the builder did not approve.** Say what it is and why first.
- **A command handed to the builder has every value filled in.** A placeholder gets
  run as written.
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
- Calling the publication done because the workflow was green. The page answered
  502: the web server listened on one network and the proxy came in by another.
- Letting the compose take a value from the shell. It worked on the laptop and
  stalled on the host, which runs it with a clean environment.
- Leaving an image on `latest`. The laptop and the host ran different versions.
- Opening a pull request in a repository of another organisation because a
  convention of the cloud account pointed there.
- Explaining the POC from memory. The document is written from the running POC and
  the code, and it says what is simulated.

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
| `references/publishing.md` | before the compose is final, and before publishing or diagnosing a published POC |
| `references/explainer.md` | before writing the document that explains the POC |
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
- **Creating or changing the host.** The machine, the network, the certificate and
  the access roles belong to `barte-ai-services/poc-host`, with its own plan and
  approval. This skill publishes a POC onto the host that exists. A client that
  needs its own cloud account is a different plan.
- **A short meeting where the story is enough.** A narrative deck or a mocked
  console is faster, and no back-end is needed.

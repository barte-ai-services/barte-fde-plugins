# The stand-alone track

Use this track only when there is **no proposal** and **no client repository**: a
first conversation, a meeting in two days, a pain described in a sentence. It
produces a small self-contained demo from a template, not a POC on the platform.

When the client later receives a proposal, the POC is built by the main procedure,
from that proposal. This demo is not migrated into it.

## What the template is

Web on the `barte-design-system`, a NestJS back-end, storage, queue and database in
containers, and an agent that reads a document, checks a registry, applies rules
and stops when it does not know. One environment variable picks the cloud whose
emulators are used: AWS, Google Cloud or Azure.

It is born with a live pipeline, a queue with a decision trail per item, an
editable flow, a stack panel, seeded history and Barte's brand.

## The script

1. **Understand the pain**, one question at a time: who the client is and what
   hurts, in their words; what the path looks like today; the one thing that, seen
   on screen, makes the client turn to the person next to them.
2. **Define the agent**: what it reads, what it consults, what it delivers, and
   when it stops and calls a person. Ask for three real situations where it should
   stop. Each becomes a planted exception.
3. **Write a `BRIEF.md` and show it before coding**: client, pain, the moment that
   convinces, what the agent does, where it stops, which screens, which data, and
   what is out of scope.
4. **Create the demo** with `scripts/new-demo.sh`, passing the folder, the client's
   name and the cloud.
5. **Swap in the data.** Material the client sent drives it; anonymise what cannot
   circulate. With no material, adjust the seeded names and ranges to the sector.
6. **Adapt the flow and the words** in the demo's own flow panel, or in
   `data/flow.yaml`.
7. **Check it** with `make check`, then with your own eyes.
8. **Hand it over** with `./scripts/start.sh`.

## Its references

| File | Read it |
|---|---|
| `references/template-architecture.md` | before touching the back-end, the infrastructure or the ports |
| `references/template-agent.md` | before changing how the agent works |
| `references/template-flow.md` | before changing steps, rules or vocabulary |
| `references/template-data.md` | before swapping in the client's data |
| `references/branding.md` | before touching any screen |

## What carries over from the main procedure

The rules that do not bend apply here too: the agent stops, the data looks real, the
client's logo is never redrawn, out of scope is written down, and nothing is
reported done from `curl` alone.

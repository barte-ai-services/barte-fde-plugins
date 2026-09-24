---
name: barte-checkpoint-fde
description: Turns the daily Sync FDEs meeting into the FDE team checkpoint and publishes it — a status update on the "Barte AI Services" GitHub project and a post in the #fde-deployment Slack channel. Use it WHENEVER someone asks for the checkpoint, the daily report, the sync summary, "monta o report da sync", "publica o checkpoint", "atualiza o board", "manda no deployment", or brings the transcript/recording of a Sync FDEs and wants it turned into a status. Trigger it too when someone asks what changed on the client fronts today, wants the semaphore per front (Grupo Primo, Comp, Buser, Skintec, Monkey, Sallve, Riza), or asks to re-publish a checkpoint after correcting it. Do NOT use it for client-facing reports, for a single project's deep status, or for meetings other than the Sync FDEs.
---

# The daily FDE checkpoint

The Sync FDEs happens at 14:00 (moved there on 21/09/2026 so blockers still have
a workday left to be worked). Every run produces one checkpoint that lands in two
places: a **status update** on the project board, and a post in
**#fde-deployment** for whoever missed the call.

**Nothing is published before the owner says so.** Every run ends with the full
checkpoint drafted for validation. The owner corrects it, and only an explicit OK
publishes it. See section 8.

This skill exists because the raw material is unreliable and the vocabulary is
not free-form. Both problems have known answers. Follow them.

## 1. Get the transcript — from the right source

Two recorders run on this meeting and **they do not fail together**.

| Source | How | When it wins |
|---|---|---|
| **Google Docs (Gemini)** | Attached to the calendar event; read with the Drive connector | **Start here.** Carries a structured summary, decisions, next steps *and* the verbatim transcript with timestamps |
| **Fireflies** | `fireflies_get_transcripts` filtered by date, then `fireflies_get_transcript` | Cross-check, and the audio/video fallback |
| **Granola** | `list_meetings` / `query_granola_meetings` | Third resort; often has nothing for this meeting |

**Always sanity-check before you use a transcript.** On 21/09/2026 Fireflies
returned 44 single-word fragments for a 42-minute call and transcribed Portuguese
audio as English — its auto-summary then invented a "Japanese process" and a
"Boozer project". A transcript whose sentence count is absurd for the duration is
broken; say so and switch sources rather than reporting its summary.

Two more traps, both from 24/09/2026:

- **The calendar event can carry several "Anotações do Gemini" docs.** One of
  them was a 10-second stub ("A transcrição foi encerrada após 00:00:10"). Pick
  the doc whose transcript length matches the meeting's duration.
- **Reprocessing Fireflies in pt-BR can come back partial.** The retry covered
  only the last 16 of 32 minutes. Check the first timestamp before trusting it.

The Drive connector answers "not found" for a doc the connected account cannot
see. That means the doc needs to be shared with that account, not that the doc
is missing. Ask for access; do not try to log in through a browser.

If every source failed, the audio still exists. Say the transcript failed, link
the recording, and do not fill the report with guesses.

## 2. Get attendance right

**Invitees are not attendees.** Fireflies lists everyone on the calendar invite
under "Meeting Attendees" whether or not they showed up. Build the present list
from who actually **speaks** in the transcript, and confirm with the person you
are working for. List the absent explicitly — the checkpoint is read by people
who need to know whose front went unreported.

Silence is not absence: someone can attend without speaking. When the transcript
shows no line from an invitee, ask rather than assume.

## 3. Use the canonical client names

Speech-to-text mangles every client name on this call. **Never take a client name
from a transcript.** The source of truth is the `Frente` field on the project
board:

```bash
gh project field-list 1 --owner barte-ai-services --format json
```

Current values: **Grupo Primo · Comp · Barte AI Platform · Buser · Skintec ·
Monkey · Sallve**. The org's repositories corroborate them
(`barte-ai-platform-<client>`).

Known manglings, all observed in real transcripts:

| Canonical | Heard as |
|---|---|
| Sallve | Salve, Sauve |
| Monkey | Monki, Mon, Monk, comon |
| Buser | Boozer, Boomer, Booer, Boas, Buzzer |
| Comp | Pomp, compa |
| Riza | Risa |
| Skintec | Skintech, SkinTech |

**Riza has a repository (`ai-services-riza`) but is not yet a `Frente` option.**
When a front is missing from the board, flag it in the checkpoint — a front that
exists in the work but not in the board is exactly what goes quiet.

## 4. Structure it as CPPP

Manuel introduced this on the call and asked the team to report in this order,
explicitly because it makes the transcript better. **Use their framework, not
your own:**

> **C**liente · **P**roblema · **P**rogresso · **P**lano

`assets/template.md` is the skeleton, and **its section order is fixed**. The
owner approved this format on 24/09/2026, so do not add, drop or reorder sections:

1. Header: date, time, links, present and absent, plus a source note when the
   transcript failed.
2. **TL;DR**: three to five bold points.
3. **Por frente (CPPP)**: one block per front, with a semaphore, FDE and CP.
4. **Delta vs. the previous checkpoint** (section 5).
5. **Itens de ontem que ficaram em silêncio hoje** (section 5).
6. **Decisões**, with the reservations raised.
7. **Processo**.
8. **Action items**, **Sem data definida na call** and **Agenda de datas**.

Every front on the roster gets a block, even when nobody spoke about it. Those
get ⬜ and "Sem update na call." A front that goes quiet is a finding, not an
omission.

**Quote, don't paraphrase, when the words are the evidence.** A deadline that
vanished, a risk that was contested, or a client changing tone all land harder
with the literal line and its timestamp.

**The owner can take a front out.** When they do, remove it everywhere: its
block, the delta, the TL;DR, the agenda and the Slack post. Do not leave traces
elsewhere.

## 5. Compare with the previous checkpoint

The delta is what makes a daily worth reading. Before drafting, read the last
status updates on the board:

```bash
gh api graphql -f query='query{node(id:"PVT_kwDOE6aFI84BkCui"){... on ProjectV2{
  statusUpdates(last:3){nodes{createdAt status body}}}}}'
```

From the most recent one, build:

- **Delta table.** For each front: what yesterday said, what today said, and the
  movement (↑ improved · ↓ got worse · ↕ split · → steady · ⬜ silent), with a
  one-line reading.
- **Climate and three cross-cutting signals.** What changed in how the team
  talks, not only in what it delivers.
- **Silence table.** Every commitment, risk or pending item from yesterday that
  today's call did not mention, with its owner. Nothing closed, nothing
  reaffirmed: they just left the conversation.
- **Inherited dates.** Carry yesterday's milestones that are still in the future
  into today's agenda, marking their origin, e.g. "(de 21/09)". Strike through a
  milestone whose date quietly changed, and say it was not mentioned.

## 6. Extract every date, and name the ones that are missing

Do not leave a prazo blank because it was not stated as a date. Sweep the
transcript for temporal markers and resolve them against the meeting date:

```bash
grep -n -o -i -E ".{120}(hoje|amanhã|ontem|segunda|terça|quarta|quinta|sexta|semana|dia [0-9]+|até (o )?dia|prazo|deadline|[0-9]+ dias|duas semanas|outubro|à noite|às [0-9]+).{120}" transcript.txt
```

Then:

- **Carry the source phrase** into the report, in a `Fonte` column. It makes every
  date auditable without reopening the transcript.
- Resolve relative dates with `date -j -f "%Y-%m-%d" <date> "+%a %d/%m"` so
  "quarta-feira" becomes a real day.
- **Items with genuinely no date get their own table**, not a dash in the main
  one. That table is a finding: it is the agenda for the next daily.
- Watch for **deadlines that were actively deferred**. On 21/09 the Monkey
  Terraform was asked for "ainda hoje", softened to "me diz quando você consegue",
  and no new date was ever given. That is not a missing date — it is an owner who
  owes one. Call it out.

## 7. Calibrate the semaphore with the owner

🔴 prazo em risco · 🟡 atenção · 🟢 no trilho

Derive a first pass from the transcript, then **show it and ask**. The person
running the sync knows things the recording does not — which client went quiet,
which deadline is soft. On 21/09 four of seven had to be corrected.

Two rules worth keeping:

- **A blocker on the client's side is still red on our board** when it gates our
  date. Grupo Primo's deployment sat with the client, unreported — that is a risk
  to raise, not a reason to relax.
- **A deliberate slowdown is not a risk.** Riza was decelerated on purpose to
  build trust with a client in recuperação judicial. Amber, not red, and say why.

## 8. Validate, then publish

**Draft → validation → explicit OK → publish.** Always in this order, every day:

1. Write the full checkpoint (`assets/template.md`) to a local file and the Slack
   text (`assets/slack-template.md`) to another. Show both to the owner.
2. List what you inferred and need confirmed: ambiguous speakers, the fronts'
   semaphores, the overall status, dates resolved from relative phrases, fronts
   left out.
3. Apply the corrections and show the result again.
4. **Publish only after an explicit OK.** Approving the content is not approving
   the publication, and an OK for the board is not an OK for Slack. Each target
   needs its own yes.

### Project board status update

The body is the **full checkpoint**, not a summary.

```bash
gh api graphql \
  -f query='mutation($p:ID!,$b:String!,$s:ProjectV2StatusUpdateStatus!,$sd:Date!,$td:Date!){
    createProjectV2StatusUpdate(input:{projectId:$p, body:$b, status:$s, startDate:$sd, targetDate:$td}){
      statusUpdate{ id status createdAt }
    }
  }' \
  -f p='PVT_kwDOE6aFI84BkCui' \
  -f b="$(cat checkpoint.md)" \
  -f s='AT_RISK' \
  -f sd='YYYY-MM-DD' \
  -f td='YYYY-MM-DD'
```

`status` is one of `ON_TRACK`, `AT_RISK`, `OFF_TRACK`, `COMPLETE`, `INACTIVE`.
Propose it from the worst semaphore on the board, and let the owner decide.
`startDate` is the meeting date; `targetDate` is the horizon the committed dates
reach.

The board's own vocabulary already matches this report; prefer its literal values
so the checkpoint feeds the board instead of running beside it:

- `Base da data` → **Sem data definida** for the undated table
- `Evidência` → **Aceite não comprovado** when a client has not confirmed
- `Origem da demanda`, `Motivação` → for items that become issues

### Slack

Post in **#fde-deployment**. This was agreed on the call: whoever misses the sync
reports asynchronously in that channel, and the checkpoint is what closes the
loop.

> **Known blocker (as of 21/09/2026):** the connected Slack workspace is Guardia,
> not Barte, so the channel is unreachable from a session with only that
> connector. Check with `slack_search_channels` before promising the post; if the
> Barte workspace is missing, publish to the board, hand over the formatted text,
> and say plainly that the Slack step did not happen.

The Slack post always follows `assets/slack-template.md`, the format the owner
approved on 24/09/2026:

- Opening line: "Mandando um resumo da Sync de hoje."
- Header: `Checkpoint FDE — DD/MM (dia) · <emoji> <status>`, followed by one
  sentence on blockers. The status is the same one chosen for the board:
  `:large_green_circle: on track` · `:large_yellow_circle: at risk` ·
  `:red_circle: off track`.
- The absent, with the reason when it was given.
- **One line per front**: Slack emoji + canonical name + an em dash + the day's
  fact in one line, with the date that matters. Emojis: `:red_circle:` 🔴 ·
  `:large_yellow_circle:` 🟡 · `:large_green_circle:` 🟢 · `:white_large_square:` ⬜.
- Closing line: `Detalhe completo no board:
  https://github.com/orgs/barte-ai-services/projects/1`.

No tables, no headings, no decisions or agenda. The detail lives on the board;
the Slack post is only there to send people to it.

## Overlap to respect

Manuel is building an agent that pipes the sync transcript into this channel and
back into the board. **Ask before scheduling anything recurring** — two processes
publishing the same checkpoint is worse than none.

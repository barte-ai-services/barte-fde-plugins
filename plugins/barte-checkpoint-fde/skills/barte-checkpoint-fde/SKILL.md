---
name: barte-checkpoint-fde
description: Turns the daily Sync FDEs meeting into the FDE team checkpoint and publishes it — a status update on the "Barte AI Services" GitHub project and a post in the #fde-deployment Slack channel. Use it WHENEVER someone asks for the checkpoint, the daily report, the sync summary, "monta o report da sync", "publica o checkpoint", "atualiza o board", "manda no deployment", or brings the transcript/recording of a Sync FDEs and wants it turned into a status. Trigger it too when someone asks what changed on the client fronts today, wants the semaphore per front (Grupo Primo, Comp, Buser, Skintec, Monkey, Sallve, Riza), or asks to re-publish a checkpoint after correcting it. Do NOT use it for client-facing reports, for a single project's deep status, or for meetings other than the Sync FDEs.
---

# The daily FDE checkpoint

The Sync FDEs happens at 14:00 (moved there on 21/09/2026 so blockers still have
a workday left to be worked). Every run produces one checkpoint that lands in two
places: a **status update** on the project board, and a post in
**#fde-deployment** for whoever missed the call.

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
from a transcript.**

The roster is not this skill's to own. It lives in the roadmap data contract —
[`plugins/barte-roadmap/skills/update-roadmap/references/barte-roadmap.md`](../../../barte-roadmap/skills/update-roadmap/references/barte-roadmap.md)
— under **Portfolio and stable identifiers**, together with the display spellings
and the transcript manglings to expect. Read it; do not keep a second copy here.

Confirm against the board when a name is in doubt, since the contract is a
starting configuration and not live evidence:

```bash
gh project field-list 1 --owner barte-ai-services --format json
```

**Flag a front that is missing from the board.** Riza has a repository
(`ai-services-riza`) and an active engagement but no `Frente` option — a front
that exists in the work and not in the board is exactly what goes quiet.

## 4. Structure it as CPPP

Manuel introduced this on the call and asked the team to report in this order,
explicitly because it makes the transcript better. **Use their framework, not
your own:**

> **C**liente · **P**roblema · **P**rogresso · **P**lano

One block per front, with a semaphore. Then decisions, process items, action
items, and the date agenda. `assets/template.md` is the skeleton.

## 5. Extract every date, and name the ones that are missing

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

## 6. Calibrate the semaphore with the owner

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

## 7. Publish

Both targets, every day. Draft first, confirm, then publish.

### Project board status update

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

`status` is one of `ON_TRACK`, `AT_RISK`, `OFF_TRACK`, `COMPLETE`, `INACTIVE` —
pick it from the worst semaphore on the board. `targetDate` is the horizon the
committed dates reach.

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

Keep the Slack version shorter than the board version: semaphore table, decisions,
next milestones, undated items. Link the transcript.

## Overlap to respect

Manuel is building an agent that pipes the sync transcript into this channel and
back into the board. **Ask before scheduling anything recurring** — two processes
publishing the same checkpoint is worse than none.

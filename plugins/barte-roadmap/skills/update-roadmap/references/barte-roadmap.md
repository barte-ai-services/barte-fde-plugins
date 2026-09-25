# Barte roadmap data contract

Verified starting configuration, September 2026. Re-read repository files and GitHub metadata for current values; this reference is not a substitute for live evidence.

## Canonical locations

- Roadmap repository: `barte-ai-services/barte-ai-services`.
- GitHub Project: `https://github.com/orgs/barte-ai-services/projects/1` (private).
- Roadmap: `https://glowing-adventure-jgyzwpr.pages.github.io/` (private Pages; verify its current URL through the repository Pages API).
- The former Grupo Primo Pages site is a migration landing page. Do not recreate a separate Gantt there.
- Issues remain in their owning repositories, including `grupo-primo-financial-dashboard`, `comp-financial-reconciliation`, `gatekeeper` and `loom`. Read the current Project repository list for additions.

## Files and ownership

| File in the roadmap repo | Purpose |
| --- | --- |
| `docs/assets/project-data.js` | Generated `window.PROJECT_DATA`: retrieval timestamp and issue snapshot |
| `docs/assets/portfolio-data.js` | `window.PORTFOLIO_DATA`: registered clients, project-level state, confirmed start and history availability |
| `docs/assets/roadmap-data.js` | Editorial milestones, source schedules and shared capabilities |
| `scripts/refresh-roadmap.py` | Maintained GitHub-to-snapshot refresh entrypoint |
| `docs/assets/roadmap.js` | Presentation/filter logic; inspect mappings when the data contract changes |
| `docs/portfolio.md`, `docs/evidence.md`, `docs/decisions.md` | Human-readable portfolio, evidence and unresolved decisions |
| `docs/maintaining.md`, `.github/workflows/docs.yml` | Update and private deployment procedure |

Typical commands, run from the verified roadmap checkout:

```sh
python3 scripts/refresh-roadmap.py
python3 -m mkdocs build --strict
git diff --check
```

The current refresh script deliberately uses stored `gh` credentials instead of injected `GH_TOKEN`/`GITHUB_TOKEN`. For a read-only Project preflight with that credential:

```sh
env -u GH_TOKEN -u GITHUB_TOKEN gh project item-list 1 --owner barte-ai-services --limit 1000 --format json
```

Use the environment's approved execution path; the command is not a sandbox bypass. If total count exceeds retrieved items, use complete pagination before writing. Do not request `admin:org` for a roadmap refresh: organization issue-type administration is a separate task.

## Current Project fields

`Status`, `Frente`, `Plataforma`, `Prioridade`, `Evidência`, `Base da data`, `Início`, `Fim`.

The CLI JSON may normalize custom field keys to lowercase, including accents (`evidência`, `início`). Inspect actual output rather than assuming an API shape.

The initial snapshot distinguishes technical completion from business acceptance. `Done` is a Project state; `Concluído técnico` explains its scope. `closedAt` is the issue closure event, not a delivery duration. Missing dates remain undated. Do not move a Project item to Done merely because a PR merged.

## Portfolio and stable identifiers

| Display name | Current client key | Known context |
| --- | --- | --- |
| Comp | `comp` | Original source schedule exists; planned dates are not proof of execution |
| Grupo Primo | `gp` | Official start confirmed as 4 September 2026; first partial views targeted for 21–27 September, separate from full go-live |
| Buser | `boozer` | Correct display spelling is Buser; legacy key retained for saved URLs |
| Skintec | `skintec` | No H in Tec |
| Monkey | `monkey` | History must come from evidence |
| Sallve | `salve` | Double L in display name; legacy key retained |
| Barte AI Platform | `shared` | Internal platform: Gatekeeper integrations, Chronicles projections, Loom workflows |
| Riza | *(none yet)* | Repository `ai-services-riza` exists and the engagement is active since the 21 September 2026 kickoff, but there is no `Frente` option and no client key. Deliberately in diagnosis, with no technical workstream for 10–15 days — which is exactly how a front goes unnoticed. Assign a key before it enters the Project |

The first seven were declared active by the user. That statement does not establish issue-level progress, scope or dates, and it predates Riza — which was added here from its kickoff, not from that declaration.

### Transcript spellings

Meeting transcripts reach these names through speech-to-text and mangle them
consistently. A checkpoint or roadmap entry must never take a client name from a
transcript — resolve it here or against the Project. Observed in real recordings:

| Display name | Heard as |
| --- | --- |
| Sallve | Salve, Sauve |
| Monkey | Monki, Mon, Monk, comon |
| Buser | Boozer, Boomer, Booer, Boas, Buzzer |
| Comp | Pomp, compa |
| Skintec | Skintech, SkinTech |
| Riza | Risa |

Note that two of the manglings collide with the legacy keys: a transcript's
"Boozer" is the display name Buser, and "Salve" is Sallve. The key and the
mishearing look alike and mean different things.

The initial refresh script maps only `Grupo Primo`, `Comp` and `Compartilhada`. If new clients enter the Project, expand the mapping using the existing portfolio keys and test the affected paths before refreshing. Preserve `Compartilhada` as a source alias for `Barte AI Platform` when appropriate; do not rename Project options merely to refresh the site.

GP source deadlines written as DD/MM have no confirmed year. The confirmed project start does not resolve the year of each source deadline. Comp's source contains 19 substeps with overlaps; block days and substep days are not interchangeable effort estimates.

## Presentation checks

Meeting URLs use `client`, `view` (legacy values `strategic` for the visible Tático view and `tactical` for the visible Operacional view) and `meeting=1`. Existing status and platform filters may be included. Keep selected client when switching views. New or unknown-history clients should show an explicit history gap, not fabricated timeline bars. Technical completions stay labeled as technical; future scope and unresolved decisions remain distinguishable.

The present site uses a committed snapshot. Automatic refresh is not installed by invoking this skill. If the user later asks for automation, configure it separately with an authorized credential, explicit cadence/event, private publishing and a failure path that retains the last good snapshot.

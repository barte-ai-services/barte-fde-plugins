# barte-fde-plugins

Claude Code plugins for Barte's FDE team.

Maintained by **Barte AI Services**. The `barte-demo-funcional` plugin was written
by **Fernando Seguim**.

## Install

The plugins live here and are catalogued by
[barte-forge](https://github.com/barte-ai-services/barte-forge), Barte's one
marketplace. This repository is no longer a marketplace of its own.

```
/plugin marketplace add barte-ai-services/barte-forge
/plugin install barte-demo-funcional@ahrena
/plugin install fde-reports@ahrena
```

If you installed from here before, remove the old marketplace first with
`/plugin marketplace remove barte-fde`, then install from the forge.

## What is here

| Plugin | Skill | What it does |
|---|---|---|
| [`barte-demo-funcional`](plugins/barte-demo-funcional) | `building-pocs` | turns the HTML proposal a client has seen into a working **POC** on Barte's platform: screen analysis, architecture on Loom and the gatekeeper, an approved plan, a build in six reviewed iterations, a guided demonstration, and the hand-over into the client's repository. Keeps the stand-alone NestJS template for when there is no proposal yet |
| [`fde-reports`](plugins/fde-reports) | `daily-brief` | daily brief for an FDE, as plain text in the chat: their to-dos from Fireflies and Granola, client meetings held without them, a recap of the last business day and movement in their engagements; sets itself up as a weekday scheduled task |
| | `sync-fde` | turns the daily **Sync FDEs** into the team checkpoint and publishes it: a status update on the `Barte AI Services` project board and a post in `#fde-deployment` |
| | `update-roadmap` | refreshes the private tactical/operational roadmap from GitHub, reconciles evidence, supports requested backfill and verifies publication |

A plugin is what gets installed; a skill is one activity inside it. The three
reports ship together because they read the same sources and share one client
roster, which lives in `update-roadmap`'s data contract
(`plugins/fde-reports/skills/update-roadmap/references/barte-roadmap.md`).

The `update-roadmap` skill runs on invocation; it does not install a scheduler or promise live synchronization. It reuses the roadmap repository’s maintained refresh script.

## Layout

```
plugins/<plugin>/
  .claude-plugin/plugin.json             the manifest (Claude Code)
  .codex-plugin/ · .cursor-plugin/       the same manifest, for Codex and Cursor
  skills/<skill>/SKILL.md                the skill: numbered steps, and when it does not apply
  skills/<skill>/references/             what a step reads; every file is named in SKILL.md
  skills/<skill>/scripts/                what a step runs
  skills/<skill>/assets/                 what the skill copies into a project
```

## Language

**Code, comments and documentation are in English. What the client reads on a
generated demo's screen is Brazilian Portuguese** — labels, agent decisions, the
flow panel's interface and the sample data. Keep that split: an identifier in
Portuguese or a screen label in English are both bugs.

## Working on the plugins

Skills follow barte-forge's artifact rules: the skill's folder and `name` are a
gerund with no plugin prefix (`building-pocs`), the frontmatter carries `type` and
`clade`, steps are numbered `##` headings, there is a `## When this skill does not
apply` section, and a code block in `SKILL.md` holds at most 10 lines. The forge's
CI does not reach a plugin hosted here, so run its gate by hand on a copy of the
forge with the plugin inside:

```bash
python3 foundation/hooks/validate-artifacts.py
```

If Claude Code's skills directory points here through a symlink, it names the
skill's folder. Renaming a skill breaks that symlink until it is recreated:

```bash
ls -l ~/.claude/skills/
```

After changing a skill, bump `version` in its `plugin.json` here and in its entry
in barte-forge's `.claude-plugin/marketplace.json` — that number is what tells
whoever already installed it that something is new.

**A new plugin needs an entry in barte-forge** before anyone can install it: a
`git-subdir` source pointing at this repository, `path: plugins/<plugin>`,
`ref: main`. Add it once the plugin reaches `main` here, not before, or the
catalogue lists a path that does not exist.

Each plugin's `author` is whoever **wrote** that plugin, so a new plugin here
carries the name of whoever made it.

## License

Proprietary — see [LICENSE](LICENSE).

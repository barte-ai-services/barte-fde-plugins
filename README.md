# barte-fde-plugins

Claude Code plugins for Barte's FDE team.

Maintained by **Barte AI Services**. The `barte-demo-funcional` skill was written
by **Fernando Seguim**.

## Install

The plugins live here and are catalogued by
[barte-forge](https://github.com/barte-ai-services/barte-forge), Barte's one
marketplace. This repository is no longer a marketplace of its own.

```
/plugin marketplace add barte-ai-services/barte-forge
/plugin install barte-demo-funcional@ahrena
/plugin install sync-fde@ahrena
/plugin install barte-roadmap@ahrena
/plugin install daily-brief@ahrena
```

If you installed from here before, remove the old marketplace first with
`/plugin marketplace remove barte-fde`, then install from the forge.

## What is here

| Plugin | What it does |
|---|---|
| [`barte-demo-funcional`](plugins/barte-demo-funcional) | builds a **functional** client demo: web on the `barte-design-system`, a NestJS backend, storage/queue/database in containers (AWS, GCP or Azure), and an agent that does the work and accounts for itself on screen |
| [`sync-fde`](plugins/sync-fde) | turns the daily **Sync FDEs** into the team checkpoint and publishes it: a status update on the `Barte AI Services` project board and a post in `#fde-deployment` |
| [`barte-roadmap`](plugins/barte-roadmap) | refreshes the private tactical/operational roadmap from GitHub, reconciles evidence, supports requested backfill and verifies publication |
| [`daily-brief`](plugins/daily-brief) | daily brief for an FDE, as plain text in the chat: their to-dos from Fireflies and Granola, client meetings held without them, a recap of the last business day and movement in their engagements; sets itself up as a weekday scheduled task |

The `update-roadmap` skill runs on invocation; it does not install a scheduler or promise live synchronization. It reuses the roadmap repository’s maintained refresh script.

## Layout

```
plugins/<plugin>/
  .claude-plugin/plugin.json             the manifest
  skills/<skill>/SKILL.md                the skill
  skills/<skill>/assets/template/        the project the skill copies
```

## Language

**Code, comments and documentation are in English. What the client reads on a
generated demo's screen is Brazilian Portuguese** — labels, agent decisions, the
flow panel's interface and the sample data. Keep that split: an identifier in
Portuguese or a screen label in English are both bugs.

## Working on the plugins

Claude Code's skills directory points here through a symlink, so editing here is
editing the installed skill:

```bash
ls -l ~/.claude/skills/barte-demo-funcional
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

# barte-fde-plugins

Claude Code plugins for Barte's FDE team.

Maintained by **Barte AI Services**. The `barte-demo-funcional` skill was written
by **Fernando Seguim**.

## Install

```
/plugin marketplace add barte-ai-services/barte-fde-plugins
/plugin install barte-demo-funcional@barte-fde
/plugin install barte-roadmap@barte-fde
```

Until the repository is on GitHub, point at the local path:

```
/plugin marketplace add ~/Workspace/barte/_platform/barte-fde-plugins
```

## What is here

| Plugin | What it does |
|---|---|
| [`barte-demo-funcional`](plugins/barte-demo-funcional) | builds a **functional** client demo: web on the `barte-design-system`, a NestJS backend, storage/queue/database in containers (AWS, GCP or Azure), and an agent that does the work and accounts for itself on screen |

| [`barte-roadmap`](plugins/barte-roadmap) | refreshes the private tactical/operational roadmap from GitHub, reconciles evidence, supports requested backfill and verifies publication |

The `update-roadmap` skill runs on invocation; it does not install a scheduler or promise live synchronization. It reuses the roadmap repository’s maintained refresh script.

## Layout

```
.claude-plugin/marketplace.json          the catalog
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

After changing a skill, bump `version` in `plugin.json` and `marketplace.json` —
that number is what tells whoever already installed it that something is new.

The marketplace `owner` is whoever **maintains** the repository; each plugin's
`author` is whoever **wrote** that plugin. The two are separate fields on purpose:
a new plugin here carries the name of whoever made it.

## License

Proprietary — see [LICENSE](LICENSE).

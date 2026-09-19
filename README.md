# barte-fde-plugins

Marketplace de plugins do time de FDE da Barte para o Claude Code.

Mantido por **Barte AI Services**. A skill `barte-demo-funcional` foi escrita por
**Fernando Seguim**.

## Instalar

```
/plugin marketplace add barte-ai-services/barte-fde-plugins
/plugin install barte-demo-funcional@barte-fde
```

Enquanto o repositório não estiver no GitHub, aponte para o caminho local:

```
/plugin marketplace add ~/Workspace/barte/_platform/barte-fde-plugins
```

## O que tem aqui

| Plugin | O que faz |
|---|---|
| [`barte-demo-funcional`](plugins/barte-demo-funcional) | constrói uma demo **funcional** para cliente: web com o `barte-design-system`, backend NestJS, armazenamento/fila/banco em contêiner (AWS, GCP ou Azure) e um agente que executa o trabalho e presta contas na tela |

## Layout

```
.claude-plugin/marketplace.json          o catálogo
plugins/<plugin>/
  .claude-plugin/plugin.json             o manifesto
  skills/<skill>/SKILL.md                a skill
  skills/<skill>/assets/template/         o projeto que a skill copia
```

## Trabalhar nos plugins

O diretório de skills do Claude Code aponta para cá por link simbólico, então
editar aqui é editar a skill instalada:

```bash
ls -l ~/.claude/skills/barte-demo-funcional
```

Depois de mexer numa skill, suba a `version` no `plugin.json` e no
`marketplace.json` — é o número que diz a quem já instalou que há coisa nova.

O `owner` do marketplace é de quem **mantém** o repositório; o `author` de cada
plugin é de quem **escreveu** aquele plugin. Os dois são campos distintos de
propósito: um plugin novo aqui dentro leva o nome de quem o fez.

---
name: barte-fde-setup
description: Sets up a new FDE or Client Partner's Mac from zero to working — Homebrew, git and identity, GitHub CLI with access to barte-ai-services, Node, Python, Claude Code, the Barte plugins, the connectors (Fireflies, Granola, Drive, Slack, Notion) and Podman for containers. Use it WHENEVER someone is starting at Barte AI Services, on a new or reset machine, or says "setup da máquina", "configurar meu Mac", "primeiro dia", "não tenho nada instalado", "o gh não funciona", "instala o Claude Code aqui", "não consigo acessar o repositório", or asks to check whether their environment is complete. Use it too when an existing machine is half-broken — a missing command, an expired GitHub login, a plugin that will not install. Do NOT use it to set up a client's machine or a server; this is for the team's own laptops.
---

# Setting up a machine

The person on the other side is usually a **Client Partner on their first day**.
They are sharp and they are not an engineer. They should finish this able to work
— not holding a list of commands to run later.

So the rule for this whole skill: **you run the commands.** You do not paste a
tutorial into the chat and wish them luck. When something needs a human — a
password, a browser login — you say exactly what is about to happen, wait, and
then verify it worked.

**Talk to them in Portuguese.** Code, identifiers and these docs are English;
what a human reads is Brazilian Portuguese. Same split as the rest of this repo.

## How to talk while you work

- **Say what it is for before installing it**, in one sentence, in their language.
  "O `gh` é o que deixa você abrir e revisar os projetos da Barte pelo terminal,
  sem precisar do site." Not "installing GitHub CLI v2.x".
- **One thing at a time.** Announce, run, verify, confirm out loud, move on.
- **Never show a wall of build output.** It scrolls past, it looks like an error,
  and it scares people. Summarize: "Node instalado, versão 22."
- **A failure is not their fault.** Say what broke, what you are trying instead,
  and only ask them for something when you genuinely cannot proceed.

## What you never do

**You never type their credentials.** Not a password, not a token, not a
recovery code — even if they offer, even to be helpful. Every login here is a
browser flow that belongs to them:

- `gh auth login` → opens the browser, they authorize, you verify afterwards
- `/mcp` connectors → they sign in on each service's own page
- macOS admin password → Homebrew may ask; that prompt is theirs to answer

Your job is to get them to the prompt and confirm the result.

## Check before you install

Run `assets/doctor.sh` first. It prints what is already there and what is
missing, so a half-configured machine does not get reinstalled from scratch.
Everything in this skill is safe to run twice.

```bash
bash assets/doctor.sh
```

Run it again at the end. The closing report is its output, not your summary.

## Layer 1 — the base

Nothing else installs without this.

| What | Command | Why it matters to them |
|---|---|---|
| Xcode Command Line Tools | `xcode-select --install` | brings `git` and `make`; a GUI window opens, they click through |
| Homebrew | the official script from brew.sh | the installer for everything else; **may ask for the Mac password** |
| git identity | `git config --global user.name` / `user.email` | their name on every change; the email **must be @barte.com** |

After Homebrew, make sure the shell finds it — on Apple Silicon that means
`/opt/homebrew/bin` on `PATH`, usually via `eval "$(/opt/homebrew/bin/brew shellenv)"`
in `~/.zprofile`. A fresh Mac will not have it and every later step will fail
with "command not found". Fix it here, once.

## Layer 2 — the work

```bash
brew install gh node python uv
```

- **`gh`** — GitHub from the terminal. Then `gh auth login` (browser flow), and
  **verify they actually reach the org**, which is the part that silently fails:

  ```bash
  gh auth status
  gh repo list barte-ai-services --limit 5
  ```

  Empty list with a valid login means the invite has not been accepted or was
  never sent. That is Fernando's action, not theirs — say so and move on rather
  than looping.

- **`node`** — Node 20 or newer; the demo template runs Next 16. Check with
  `node --version`.
- **`python`** and **`uv`** — several skills run Python scripts. `uv` keeps each
  script's dependencies separate so one never breaks another.

### Claude Code

This is the whole point of the machine — Barte is an AI-first company and Claude
is where the work happens. Install per the current official instructions, then
confirm `claude --version` answers.

### The Barte plugins

```
/plugin marketplace add barte-ai-services/barte-fde-plugins
/plugin install barte-checkpoint-fde@barte-fde
/plugin install barte-demo-funcional@barte-fde
/plugin install barte-fde-setup@barte-fde
```

Install all three. `barte-checkpoint-fde` is day-one for a Client Partner, and
the others cost nothing sitting there — the expensive moment is discovering a
missing plugin the hour before a client call.

### Containers

The demo template brings up storage, queue and database with `docker compose`.
The engine underneath is **Podman** — daemonless, rootless, and free for
commercial use. Docker Desktop needs a paid subscription above 250 employees or
US$10M revenue, which is not a default worth walking into, and it is the heavier
of the two on every platform.

```bash
brew install podman docker docker-compose
podman machine init && podman machine start
```

`podman` is the engine; `docker` here is **only the client CLI** (tens of MB, not
Desktop); `docker-compose` is the plugin the template's Makefile calls. Then point
the client at Podman's Docker-compatible socket, once, in `~/.zprofile`:

```bash
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
```

**Verify with `docker ps`.** It has to answer without error. An install that
succeeded with `DOCKER_HOST` unset looks fine and then fails later, inside a demo,
in front of a client.

This is not optional and it is not only for demos — a Client Partner who has to
install containers the morning of a client call will not be running that demo.

**Other platforms.** On **Linux** there is no VM at all: skip `podman machine`,
the socket is `unix:///run/user/$UID/podman/podman.sock`, and this is where Podman
is dramatically lighter than Docker Desktop. On **Windows** it runs on WSL2 —
`winget install RedHat.Podman`, and everything after is identical. **Podman
Desktop** (`brew install --cask podman-desktop`) adds a GUI on all three if
someone prefers buttons to commands.

## Layer 3 — the connectors

These are what make Claude useful on this team, and they are the step people skip
because it has no terminal command. Walk them through `/mcp` and stay until each
one says connected:

| Connector | What it unlocks |
|---|---|
| **Fireflies** | the meeting transcripts — the daily checkpoint depends on it |
| **Granola** | the second recorder; the two do not fail together |
| **Google Drive** | the Gemini transcripts attached to calendar events |
| **Slack** | `#fde-deployment` and the rest of the team's channels |
| **Notion** | the documentation that has not moved to GitHub yet |
| **Gmail / Calendar** | their own agenda and threads |

> **Slack, watch out:** a person can be signed into a workspace that is not
> Barte's. Confirm the workspace, not just the green check — a connected Slack
> pointing at the wrong org looks identical and silently cannot reach
> `#fde-deployment`.

## What not to install

Resist the pull to make this a full engineering workstation. No editor wars, no
`kubectl`, no cloud CLIs, no dotfiles framework. Every extra tool is one more
thing that can break on a machine whose owner cannot debug it. If a real need
shows up later, that is a later conversation.

## Closing

Run `assets/doctor.sh` one last time and show it. Then tell them, in plain
Portuguese:

1. **What works now** — one line, not a table dump.
2. **What is pending and on whom** — the GitHub invite is Fernando's; a connector
   login is theirs.
3. **The one thing to try next**, so the setup ends with something working rather
   than a certificate. For a Client Partner, opening Claude and asking for the day's
   checkpoint is a good first run.

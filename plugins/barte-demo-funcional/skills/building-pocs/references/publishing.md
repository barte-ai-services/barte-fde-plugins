# Publishing

A finished POC gets an address: `<client>.poc.barte.ai`, behind a password, on
Barte's POC host. The presenter opens a link instead of starting Docker.

The host is the repository `barte-ai-services/poc-host`: one machine, one Compose
project per client, an edge proxy with a wildcard certificate, on from 8h to 20h on
weekdays. Its README is the source of truth for operating it. This file is what the
POC and its builder need to get there.

**The POC that runs on the host is the same `compose.yml` that runs on the builder's
machine.** The host adds three things at deploy time: it removes every published
port, it puts `web` on the edge network, and it makes long-running services restart
by themselves. Everything that broke in the first publication came from the two
conditions that differ from a laptop: a clean environment and a second network.

## Before you start

| Needed | Who does it |
|---|---|
| the POC merged into `main` of the client's repository | the builder; publishing reads a commit of that repository |
| the organisation's GitHub App (Herald) installed on the client's repository | an organisation admin, once per repository |
| every private platform image of the compose listed in `host/mirror.txt` of `poc-host` | a pull request there, when the POC uses a new image or version |
| an AWS session on the profile `barte-aiservices` | only to verify afterwards; publishing itself needs GitHub alone |

## The contract

The hand-over's contract, plus what the first publication taught. Check each line
before publishing.

| Rule | Why | How to check |
|---|---|---|
| the compose is `projects/poc/deploy/compose/compose.yml`, with `.env.example` beside it | the host starts it with that file as the environment, and nothing else | start it from a clean checkout |
| one service named `web`, on port 3000, is the only entrance | the edge proxy routes to that name | open only `web`'s port locally |
| **`web` listens on every interface** | on the host it sits on two networks, and the proxy comes in by the second | `HOSTNAME=0.0.0.0` in the image; `netstat -ltn` in the container shows `0.0.0.0:3000` |
| **nothing is read from the shell** | the host runs the compose with a clean environment; a laptop does not, so a POC can work there by accident | every `${VAR}` in the compose has a value in `.env.example` or a default |
| **every image has a version** | `latest` was one version on the laptop and another on the host | no `image:` without a tag, none with `latest` |
| ports are published on `127.0.0.1` only | nothing of the POC is reachable from the network of who runs it | `docker ps` shows no `0.0.0.0:` |
| a one-shot service says so | the host waits for it to exit with 0 and does not restart it | `restart: "no"`, or something depends on it with `service_completed_successfully` |
| one build per image | services that share a tag and all declare `build:` race each other | only one service builds; the others reuse the tag |
| invented data, no real credential, no call to the outside | the machine is shared, and nothing may leak or cost | read the compose and the connector's config |
| survives `stop` and `start` | the machine goes off every night | stop and start locally, then run the end-to-end script |
| at most 2 GB of memory | three or four POCs share 8 GB | `docker stats` |

## Rehearse it on your own machine

The host's tool runs locally and reproduces both conditions. A POC that fails here
fails there, and here it takes two minutes to find out.

```bash
cd poc-host/host
./pocctl init && docker compose up -d
./pocctl deploy just-travel --source ~/repos/barte-ai-platform-just-travel --name "Just Travel"
```

It answers at `http://just-travel.poc.localhost:8480`, with no certificate and no
password. Run the end-to-end script against that address, open the page, then
`./pocctl remove just-travel`. Stop the POC's own local stack first if the machine
is short of memory.

## Publish

Publishing is a workflow in `poc-host`, started from GitHub. It reads the client's
repository with a one-hour, read-only token, packs the commit, and tells the machine
to bring it up. The machine compiles the POC's images: about ten minutes the first
time.

```bash
gh workflow run publish --repo barte-ai-services/poc-host --ref main \
  -f slug=just-travel -f repository=barte-ai-platform-just-travel \
  -f ref=main -f name="Just Travel" -f owner="Fernando Seguim"
```

| Input | Meaning |
|---|---|
| `slug` | the address: lower case, digits and hyphens |
| `repository` | the client's repository, without the organisation |
| `ref` | a tag, a branch or a commit |
| `name`, `owner` | what the index page shows: the client, and who looks after the POC |
| `path` | where the compose is, when it is not `projects/poc/deploy/compose` |
| `ttl_days` | how long it stays, 30 by default; publishing again renews it |
| `fresh=true` | remove the POC and its volumes first |

Use `fresh` when the seed or the schema changed, or when a stack is stuck in a state
the restart endpoint cannot leave. It costs the full start again.

Follow the run with `gh run watch`. **When you hand a command to the builder, every
value is already filled in.** A command with a placeholder in it gets run as
written.

## Verify what was published

"The workflow passed" means the containers came up. It does not mean the POC works
behind the proxy. Check, in this order:

1. **Without the password: 401, with a valid certificate.** With it: 200 and the
   right title.
2. **The end-to-end script against the public address.** It goes through the proxy
   and the password, and it ends by restarting the POC.
3. **The index** at `https://poc.barte.ai` lists the POC.
4. **The guided demonstration, to the end, in a browser.** See below.

The password lives in the parameter store. Read it into a variable; do not print
it, do not put it in a URL, do not write it in a document or a message.

```bash
export POC_PASSWORD="$(aws ssm get-parameter --profile barte-aiservices --region us-east-2 \
  --name /poc-host/basic-auth-password --with-decryption --query Parameter.Value --output text)"
```

The end-to-end script takes its address from the environment. Give it the public
one and the password, as HTTP basic authentication, user `barte`:

```python
manager = urllib.request.HTTPPasswordMgrWithDefaultRealm()
manager.add_password(None, "https://just-travel.poc.barte.ai/", "barte", os.environ.pop("POC_PASSWORD"))
urllib.request.install_opener(urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(manager)))
runpy.run_path("tests/e2e/e2e.py", run_name="__main__")
```

### The browser check, without typing a password

An agent does not type a password into a browser, even when asked. Two ways to run
the guided demonstration on the host:

- **The builder opens the address** and runs it. This is the default.
- **A tunnel.** Session Manager forwards one local port to the `web` container, with
  the builder's own AWS session. The page opens at `http://127.0.0.1:3299`, with no
  password, and reaches the same containers.

```bash
scripts/host.sh run "docker inspect poc-just-travel-web-1 --format '{{json .NetworkSettings.Networks}}'"
aws ssm start-session --profile barte-aiservices --region us-east-2 --target i-0a036939f9ba34a34 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["172.18.0.4"],"portNumber":["3000"],"localPortNumber":["3299"]}'
```

The first command gives the container's address on the `poc-edge` network, and
`scripts/host.sh` prints the instance it talks to. When done: stop the tunnel, end
the session on the AWS side with `aws ssm terminate-session`, confirm that
`aws ssm describe-sessions --state Active` is empty, and restart the POC.

## When it fails

| What you see | Cause | Fix |
|---|---|---|
| the workflow fails reading the client's repository | the GitHub App is not installed on it | an organisation admin adds the repository |
| "não achei compose.yml" | the compose is somewhere else | the `path` input |
| a one-shot service left with a code other than 0 | the seed or the provisioning failed | `scripts/host.sh run "docker logs poc-<slug>-<service>-1"` |
| an image cannot be pulled | a private platform image that is not mirrored | add it to `host/mirror.txt` in a pull request; the `mirror` workflow copies it |
| **502 on every route** | `web` listens on one network only | `HOSTNAME=0.0.0.0` in the web image |
| **the page opens and the items stay "processing"** | a value differs from the laptop: a variable the compose took from the shell there, or an unpinned image | give the variable a value in `.env.example`, pin the image, rehearse with `pocctl` |
| old data after a change to the seed | the volumes are from the previous version | publish with `fresh=true` |

Diagnose from the logs before changing anything, and reproduce the failure locally
with `pocctl`. A fix to the POC is a pull request to the client's repository. A fix
to the host is a pull request to `poc-host`.

## What does not bend

- **Nothing is applied to the cloud from a laptop.** The host changes by pull
  request in `poc-host`, and its pipeline applies it. Reading the machine is fine;
  changing it by hand is not.
- **Everything lives in the organisation `barte-ai-services`.** No repository,
  branch or pull request anywhere else, even when a convention of the account
  points there.
- **No new component on the host without saying what it is and why.** Propose it,
  and wait for the builder.
- **Every change to a port or a network comes with the proof**: the published
  ports, the firewall rules, and a probe from outside.
- **A password that appeared in a conversation is rotated.**

## Known limits

- The edge network is shared. With two POCs on the host, the `web` container of one
  can reach the `web` of the other from inside, without the password. Databases,
  queues and storage stay on each POC's own network. Say so before publishing a
  second client.
- One password for every POC. A login per person is not there yet.
- The machine is off at night and on weekends. A meeting outside those hours needs
  the `power` workflow first.

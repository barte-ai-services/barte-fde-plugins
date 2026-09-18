# Demo funcional

Uma demo que o cliente **usa**: web com a marca da Barte, backend NestJS,
armazenamento, fila e banco em contêiner, e um agente que lê documento, confere
regra e para quando não sabe — explicando por quê.

## Rodar

```bash
./scripts/subir.sh
```

Ou dois cliques em **`demo.command`** pelo Finder. Ele escolhe portas livres,
sobe a infraestrutura, espera tudo responder e abre o navegador. `Ctrl-C`
encerra os processos; os contêineres seguem de pé (`make down` derruba).

Precisa de **Docker** e **Node 20+**. Não precisa de chave de API nem de
internet: o agente roda no motor determinístico por padrão.

Antes de apresentar:

```bash
make verificar
```

## A nuvem

`NUVEM` no `.env` escolhe: `aws` (Floci), `gcp` (fake-gcs-server + emulador do
Pub/Sub) ou `azure` (Azurite). O código da aplicação é o mesmo nas três — só o
adaptador muda. Apontar para a nuvem de verdade é apagar o endereço do emulador
no `.env`.

## Como ela está organizada

```
apps/web/        Next.js 16 + barte-design-system
apps/api/        NestJS: itens, eventos (SSE), agente, telemetria, provisionamento
  src/nuvem/     as duas portas (armazenamento e fila) e os três adaptadores
  src/agente/    os dois motores e as ferramentas determinísticas
dados/           os documentos e o cadastro — é aqui que entram os dados do cliente
infra/compose/   os emuladores, um perfil por nuvem
scripts/         subir.sh (o caminho de um comando) e verificar.sh
```

## Trocar pelos dados do cliente

Converta o material dele para `dados/documentos/*.json` (um por documento) e
ajuste `dados/cadastro.json`. Nada de código precisa mudar: a API lê a pasta na
subida.

Sem material do cliente, a demo já nasce com histórico gerado (semente fixa) e
seis documentos curados — cada um provando uma capacidade do agente.

## Comandos

| | |
|---|---|
| `./scripts/subir.sh` | sobe tudo e abre o navegador |
| `make verificar` | confere infraestrutura **e** tela antes da reunião |
| `make down` | derruba os contêineres preservando os dados |
| `make clean` | apaga os volumes — a esteira volta ao estado inicial |
| `make build` | compila os dois aplicativos |

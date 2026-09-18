# A arquitetura da demo

```
navegador ──► web (Next.js 16)  ──HTTP──►  api (NestJS)
                   ▲                          │
                   └────── SSE ───────────────┤
                                              ├──► Postgres        os itens, as propostas, as decisões
                                              ├──► armazenamento   os documentos como chegaram
                                              └──► fila            distribui o trabalho para o agente
                                                     │
                                                worker (no mesmo processo)
                                                     └──► agente ──► ferramentas
```

Tudo em contêiner na máquina de quem apresenta. **O que muda numa instalação de
verdade é o endereço de cada peça — não o código.**

## Três nuvens, dois adaptadores

A aplicação fala com duas interfaces, `Armazenamento` e `Fila`
(`apps/api/src/nuvem/portas.ts`), e nada mais. O `NUVEM` do `.env` escolhe quem
as implementa:

| | AWS | Google Cloud | Azure |
|---|---|---|---|
| armazenamento | S3 | Cloud Storage | Blob Storage |
| fila | SQS | Pub/Sub | Queue Storage |
| banco | Aurora (PostgreSQL) | Cloud SQL (PostgreSQL) | Azure Database (PostgreSQL) |
| emulador local | **Floci** (um contêiner) | `fake-gcs-server` + emulador oficial do Pub/Sub (dois) | **Azurite** (um, oficial da Microsoft) |

São só duas portas de propósito: guardar o documento e distribuir trabalho é o
que a demo faz, e as três nuvens têm as duas. Uma terceira porta multiplicaria os
adaptadores por três sem acrescentar nada à conversa com o cliente.

Os pacotes de cada provedor entram **só na nuvem escolhida** — `nova-demo.sh
--nuvem gcp` instala os do Google, e uma demo AWS não carrega nenhum deles. Por
isso os adaptadores de GCP e Azure carregam o SDK por `import()` com o nome numa
variável: com a string literal, o TypeScript tentaria resolver o pacote na
compilação e reprovaria a demo AWS.

### Por que Floci, e não LocalStack

Os dois falam a mesma API na mesma porta; a troca é a linha da imagem. O que
decide é o que a edição **aberta** entrega: no LocalStack, persistência de estado
é recurso Pro. Numa demo isso não é detalhe — o cliente fecha o notebook, você
roda `down`, e na reunião seguinte o trabalho já feito tem de estar lá. Floci é
MIT, sem token, e persiste.

### Por que um Postgres em contêiner, e não o banco gerenciado do emulador

O Floci tem `rds`, e o que ele faz ao criar uma instância é **subir um Postgres
num contêiner** — para o que precisa do socket do Docker montado dentro dele, ou
seja, controle do daemon da máquina entregue ao emulador. Em troca, ganha-se uma
API de controle que esta demo nunca chama: a aplicação conecta por URL.

Aurora, Cloud SQL e Azure Database com motor PostgreSQL **são** Postgres.
Apontar para um Postgres de verdade é a versão mais fiel do que roda em produção,
não a menos. (É o mesmo raciocínio que mantém o Redis fora do emulador no
`gatekeeper`.)

## Apontar a demo para a nuvem de verdade

Uma linha do `.env`, sem tocar em código:

- **AWS** — apague `AWS_ENDPOINT_URL`. O SDK resolve o endereço sozinho e usa as
  credenciais do seu perfil.
- **GCP** — apague `STORAGE_EMULATOR_HOST` e `PUBSUB_EMULATOR_HOST`, e
  autentique com `gcloud auth application-default login`.
- **Azure** — troque a `AZURE_STORAGE_CONNECTION_STRING` pela da conta real.

É assim que a mesma demo vira piloto na conta do cliente.

## Portas

Nenhuma é fixa. O `scripts/subir.sh` procura a **primeira livre** a partir de
3000 (web), 8080 (api), 5432 (Postgres) e da porta do emulador da nuvem ativa —
e exporta o número para todos: compose, API, web e navegador. Isso existe porque
4566 é a mesma porta do `gatekeeper`: quem tem os dois de pé perderia a demo por
um "port is already allocated" trinta segundos antes da reunião.

O nome do projeto do Compose sai da **pasta** da demo. Com um nome fixo, duas
demos abertas na mesma semana dividiriam contêineres e volumes — e subir a
segunda recriaria o banco da primeira.

## Persistência

Os volumes sobrevivem ao `down`. `make clean` apaga tudo e a esteira volta ao
estado inicial. É por isso que a demo pode ficar com o cliente: ele mexe hoje, e
na semana que vem o trabalho dele ainda está lá.

## O que roda no backend

| Caminho | O quê |
|---|---|
| `GET /api/itens` | a fila inteira, mais recente primeiro |
| `GET /api/itens/:id` | um item com a trilha de decisões |
| `POST /api/itens/importar` | relê o armazenamento — é como um documento novo entra durante a reunião |
| `POST /api/esteira/executar` | enfileira todo pendente |
| `GET /api/eventos` | SSE: nós da esteira, decisões, exceções, telemetria |
| `GET /api/saude` | cada peça, o papel dela em português, e a saúde |
| `GET /api/telemetria` | chamadas por peça, mediana e pior caso |

**SSE e não WebSocket**: o fluxo é de mão única e o SSE reconecta sozinho quando
o notebook dorme no meio da reunião.

O worker roda no **mesmo processo** da API. Numa instalação de verdade é um
serviço à parte — e essa é justamente a conversa que a demo abre: o trabalho já
chega por fila, então separar é mudar onde o processo roda, não reescrever o
fluxo.

## Armadilhas do ambiente

- **Next 16 bloqueia recursos de dev fora de `localhost`.** Sem
  `allowedDevOrigins: ["127.0.0.1", "localhost"]`, a página abre, renderiza e
  **não hidrata** — sem clique, sem chamada à API, sem erro no console do
  navegador. O aviso sai no log do `next dev`.
- **Bind mount de arquivo é frágil.** Se o caminho não estiver compartilhado no
  Docker Desktop, ele monta um diretório vazio e o contêiner morre com "is a
  directory". Por isso quem provisiona e semeia é a própria API.
- **O TypeScript não copia `.sql`.** O `nest-cli.json` declara `assets` com
  `watchAssets`; sem isso o processo sobe, mapeia as rotas e morre no primeiro
  `readFileSync`.
- **`curl … | grep -q` com `pipefail` reprova o que está certo** — o `-q` fecha o
  cano, o curl morre de SIGPIPE e o status do pipeline é o dele.

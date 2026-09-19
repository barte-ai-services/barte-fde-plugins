---
name: barte-demo-funcional
description: Constrói uma demo FUNCIONAL da Barte — web em Next.js com o barte-design-system, backend em NestJS, armazenamento, fila e banco em contêiner na nuvem que o cliente usa (AWS, Google Cloud ou Azure) e um agente que executa o trabalho de verdade e presta contas na tela. Use SEMPRE que alguém pedir uma demo para cliente, prova de conceito, protótipo navegável, piloto, MVP de proposta, "uma demo que o cliente possa usar", "algo funcionando para mostrar na reunião", uma demo com agente/IA que processe documentos ou execute um fluxo, ou quiser rodar, ajustar, re-skinar ou entregar ao cliente uma demo já construída. Acione também quando a pessoa trouxer a transcrição ou o áudio de uma reunião de diagnóstico e quiser transformá-la em demo, quando mencionar LocalStack, Floci, Azurite, Pub/Sub ou Bedrock no contexto de demo, ou quando pedir para trocar os dados da demo pelos do cliente (planilha, relatório, NF-e). NÃO use para a demo em HTML single-file do repositório fde-demos (aquela é deck ou console mockado, sem back-end) nem para trabalho no produto de verdade.
---

# Construir uma demo funcional

O que esta skill entrega não é uma tela que parece um produto: é um produto
pequeno. Web com a marca da Barte, backend em NestJS, armazenamento, fila e
banco de verdade em contêiner, e um agente que lê documento, consulta cadastro,
confere regra e **para quando não sabe**, explicando por quê. Roda na máquina de
quem apresenta, com um comando, sem internet e sem chave de API.

Na nuvem do cliente: **AWS**, **Google Cloud** ou **Azure** — uma variável de
ambiente escolhe, e o código é o mesmo nas três.

O objetivo comercial é este: deixar o cliente **usando** enquanto o projeto
maior é negociado.

> **Isto não substitui o `fde-demos`.** Lá vivem as demos em HTML single-file —
> deck narrativo e console mockado —, que continuam certas quando a reunião é
> curta e o que importa é a narrativa. Esta skill é para quando o cliente vai
> **operar** a coisa: ele clica, o trabalho acontece, o dado fica gravado, e na
> semana seguinte ainda está lá.

## Como conduzir

**Quem está do outro lado é do comercial.** Ele conhece a dor do cliente e não
tem obrigação nenhuma de saber o que é fila, contêiner ou agente. Então:

- **Uma pergunta por vez.** Nunca despeje um questionário. Pergunte, espere,
  confirme o que entendeu, siga.
- **Ofereça opções, não campos em branco.** "É contas a pagar, conciliação, ou
  outra coisa?" funciona; "qual o domínio?" não.
- **Traduza tudo.** Nada de SQS, Postgres ou Tool Runner na conversa. Diga "a
  fila que distribui o trabalho", "onde os dados ficam guardados", "o agente".
- **Proponha o padrão e siga.** Quando faltar um detalhe que o cliente teria de
  responder, assuma o mais plausível, diga em voz alta o que assumiu, e siga.
  Travar a construção esperando um dado que ninguém tem é o erro mais caro aqui.
- **Áudio vale como entrada.** Se vier um áudio ou a transcrição da reunião de
  diagnóstico, ouça/leia primeiro e volte com o resumo em forma de proposta:
  "entendi que a dor é X, o fluxo é Y, o momento uau é Z — confirma?". A pessoa
  corrige o que estiver errado em vez de responder do zero.
- **Mostre progresso.** Depois de cada etapa, diga o que já existe e o que vem
  a seguir.

## O roteiro, passo a passo

Siga nesta ordem. Não pule a 0 e não comece a escrever código antes da 3.

### 0 · Já existe uma demo?

Se a pessoa quer **rodar** uma demo pronta (ou mostrar de novo a de ontem),
não construa nada:

```bash
cd <pasta-da-demo> && ./scripts/subir.sh
```

Um comando, ou dois cliques no `demo.command` pelo Finder. Ele escolhe portas
livres, sobe a infraestrutura, espera tudo responder e **abre o navegador**.
Antes de apresentar, `make verificar`.

### 1 · Entender a dor (uma pergunta por vez)

1. **Quem é o cliente e o que dói?** Peça em uma frase, do jeito que o cliente
   falou. Se houver transcrição ou áudio, extraia daí e valide.
2. **Como é hoje?** O caminho que o documento/dado percorre hoje: de onde chega
   (e-mail? portal? WhatsApp?), quem olha, onde é lançado, o que trava.
3. **Qual é o momento "uau"?** A única coisa que, vista na tela, faz o cliente
   virar para o lado e comentar. A demo inteira serve a ela.
4. **Quem vai usar a demo?** Só você na reunião, ou o cliente vai mexer sozinho
   depois? Muda o quanto a navegação precisa se explicar.

### 2 · Definir o agente (esta é a pergunta central)

Pergunte, em português comercial: **"que trabalho o agente faz, do começo ao
fim?"** E depois estas quatro, uma de cada vez:

1. **O que ele lê?** (NF-e, boleto, extrato, planilha, e-mail…)
2. **O que ele consulta para decidir?** (cadastro de fornecedor, pedido de
   compra, plano de contas, política de alçada…)
3. **O que ele entrega?** (um lançamento proposto, uma conciliação, uma
   classificação, um relatório…)
4. **Quando ele PARA e chama um humano?** — a mais importante das quatro. Uma
   demo em que o agente acerta tudo não convence ninguém que já trabalhou na
   área. Peça três situações reais em que ele deve travar.

Cada resposta da pergunta 4 vira uma exceção plantada nos dados, e cada exceção
prova uma capacidade específica. O padrão está em `references/dados.md`.

### 3 · Fechar o combinado

Escreva um `BRIEF.md` curto na pasta da demo e **mostre para a pessoa antes de
codar**: cliente, dor, momento uau, o que o agente faz, onde ele para, quais
telas, quais dados, e — explicitamente — **o que fica de fora**. Mostrar o que
não se toca vale tanto quanto mostrar o que se resolve.

### 4 · Criar a demo

Antes, uma pergunta a mais — e ela é comercial, não técnica: **que nuvem o
cliente usa?** Se ninguém souber, AWS, e diga que assumiu.

```bash
bash ~/.claude/skills/barte-demo-funcional/scripts/nova-demo.sh <pasta> "<Nome do Cliente>" [--nuvem aws|gcp|azure]
```

O script copia o template de `assets/template`, troca o nome do cliente nos três
lugares onde ele aparece, instala as dependências e os pacotes da nuvem
escolhida. O resultado já sobe.

Ver a demo rodando com Cloud Storage e Pub/Sub na reunião com um cliente que é
casa do Google vale mais do que qualquer slide de arquitetura.

### 5 · Trocar os dados

**Se o cliente mandou material** (planilha, relatório, NF-e, extrato), ele manda
nos dados — sempre. Converta para `dados/documentos/*.json` (uma nota por
arquivo) e ajuste `dados/cadastro.json`. Planilha `.xlsx` → use a skill `xlsx`
para ler antes de converter. **Anonimize o que for identificável** se o material
não puder circular.

**Se não mandou**, o template já nasce com dados realistas e a demo abre com
semanas de trabalho feito: `gerarHistorico()` produz o histórico com semente
fixa, e os seis documentos curados são o lote do dia. Ajuste os nomes dos
fornecedores e as faixas de valor para o setor do cliente — é barato e muda a
percepção.

Regra que não se negocia: **nada de "Fornecedor A / R$ 100,00"**. CNPJ
formatado, chave de NF-e com a cara de uma chave, valores coerentes entre si,
nomes plausíveis do setor. É o que faz o cliente ver o sistema dele.

### 6 · Adaptar o fluxo

O fluxo é **dado**: `dados/fluxo.yaml` diz quais são as etapas, o que cada uma
faz e quando o agente para. O agente executa isso, a tela desenha isso, e o
painel **Editar fluxo** — dentro da própria demo — edita isso.

Três formas de mexer, da mais leve para a mais pesada:

| O que você quer | Onde |
|---|---|
| acrescentar/remover/reordenar etapa, trocar texto, ligar uma regra que já existe | **painel Editar fluxo**, na própria demo, ao vivo — ou `dados/fluxo.yaml` |
| uma regra ou ação que ainda não existe | `apps/api/src/fluxo/catalogo.ts` — uma entrada, e ela já aparece no painel |
| o que as ferramentas consultam | `apps/api/src/agente/ferramentas.ts` |

**Leve o painel para a reunião.** Quando o cliente descrever uma etapa que
ninguém tinha previsto, acrescente ali, aplique, e execute a esteira: o próximo
documento já roda com o fluxo dele. É o momento em que a demo deixa de ser uma
apresentação.

Os dois motores — o determinístico e o que chama o Claude — leem o mesmo fluxo e
emitem os **mesmos eventos**, então a tela não sabe qual está rodando. Detalhes
em `references/fluxo.md` e `references/agente.md`.

### 7 · Conferir com os próprios olhos

```bash
make verificar
```

As verificações de tela existem porque o modo mais constrangedor de falhar não é
ficar fora do ar: é a página abrir sem CSS, ou abrir bonita e **não responder a
clique**. Depois do verde, faça a passada manual que o script lista — abra,
execute a esteira inteira, abra um item travado, abra o painel da stack, e
estreite a janela até a largura da tela que vai projetar.

### 8 · Entregar

- **Na reunião:** `./scripts/subir.sh`, tela cheia, esteira executada uma vez
  antes de começar.
- **Para o cliente usar depois:** a demo roda na máquina dele com Docker +
  Node, ou vai para uma máquina sua com acesso dele. Para uma demo **sem
  backend**, o portal interno (`demos-portal`, `<slug>.demos.barte.ai`) publica
  HTML por 7 dias — esta aqui tem backend, então não serve.
- **Registre o aprendizado** no `fde-demos/aprendizados/` depois da reunião. O
  processo comercial é o mesmo.

## O que a demo já tem quando nasce

- Esteira ao vivo, acendendo por SSE enquanto o agente trabalha — com as etapas
  que o fluxo declarar, não uma lista fixa.
- Painel **"Editar fluxo"**: acrescentar etapa, escolher o que o agente faz nela
  e marcar o que o faz parar — por formulário ou editando o YAML — **sem
  reiniciar a demo**. Validação em português, e "voltar ao original" sempre à
  mão.
- Fila com situação por item e gaveta com a **trilha de decisões**: o que o
  agente decidiu, por quê, com quanta confiança.
- Painel **"A stack desta demo"** no rodapé da barra lateral: cada peça, o papel
  dela em português, a saúde, e as chamadas ao banco/S3/fila **ao vivo, em
  milissegundos**. É a resposta para "isso está mesmo rodando?".
- Histórico semeado — a tela nunca abre zerada.
- Marca da Barte pelo design system de verdade, o mesmo do `barte-copilot`.
- A mesma demo em **AWS, Google Cloud ou Azure**, trocando uma linha do `.env`.

## Referências

| Arquivo | Quando ler |
|---|---|
| `references/branding.md` | ao mexer em qualquer tela — DS, tokens, as armadilhas de CSS |
| `references/arquitetura.md` | ao mexer no backend, na infraestrutura ou nas portas |
| `references/fluxo.md` | ao mexer nas etapas, nas regras, ou ao acrescentar um verbo ao catálogo |
| `references/agente.md` | ao mudar como o agente trabalha, ou ao ligar o motor Claude |
| `references/dados.md` | ao trocar os dados pelos do cliente ou plantar exceções |

## Erros que já custaram caro

- **Começar a codar antes da etapa 3.** Demo genérica volta para retrabalho.
- **Caminho feliz só.** Sem exceção que trave, a demo parece fake.
- **Dado inventado sem cara de real.** Derruba a credibilidade em dois segundos.
- **Apresentar sem `make verificar`.** Uma tela sem CSS apaga o resto do mérito.
- **Prometer o que a demo não faz.** O que está fora de escopo aparece no
  BRIEF e na conversa, não vira surpresa na reunião seguinte.

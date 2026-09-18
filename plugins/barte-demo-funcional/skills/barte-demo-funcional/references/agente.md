# O agente

O agente da demo faz um trabalho de verdade: lê o documento, consulta o que
precisa, confere as regras e **para quando não sabe**, dizendo por quê. É essa
última parte que vende — uma esteira que acerta tudo não convence ninguém que já
trabalhou na área.

## A regra que governa tudo

> **O modelo não calcula nada.** Cadastro, alçada, duplicidade, divergência de
> valor, regra de retenção — tudo sai de ferramentas determinísticas. O que o
> modelo faz é decidir **quais perguntas fazer** e **o que concluir** das
> respostas.

Quando o cliente perguntar "e se a IA errar o número?", a resposta não é uma
promessa: o número não passa por ela.

## Dois motores, os mesmos eventos

| | `simulado` | `claude` |
|---|---|---|
| como roda | regras em TypeScript | Tool Runner do SDK da Anthropic |
| precisa de chave | não | `ANTHROPIC_API_KEY` |
| precisa de internet | não | sim |
| mesma entrada, mesma saída | **sempre** | não necessariamente |
| quando usar | **na reunião**, e em toda demo que o cliente vai operar sozinho | quando a conversa é sobre a inteligência do agente |

Troca-se pelo `.env` (`AGENTE_MOTOR`), e a tela não sabe qual está rodando: os
dois publicam os mesmos eventos (`no`, `decisao`, `excecao`).

**O padrão é o `simulado`, e isso é uma decisão de palco.** Rede de hotel cai,
chave expira, latência aparece no pior momento — e uma demo que decide diferente
na segunda passada quebra justamente quando alguém pede "roda de novo".

Mexeu em um motor, mexa no outro. Se divergirem, a demo passa a mentir sobre si
mesma dependendo de uma variável de ambiente.

## As ferramentas

Vivem em `apps/api/src/agente/ferramentas.ts` e são compartilhadas pelos dois
motores:

| Ferramenta | O que responde |
|---|---|
| `consultarFornecedor` | esse CNPJ está no cadastro? com que centro de custo e conta? |
| `verificarDuplicidade` | essa chave já foi lançada? |
| `divergencia` | quanto a nota difere do pedido, em reais |
| `exigeRetencaoInss` | esse serviço exigia retenção que não veio destacada? |
| `carregarCadastro` | a política: fornecedores, alçada, o que já foi lançado |

Trocar o domínio da demo é trocar **estas funções** e os dados que elas leem — a
esteira, a tela e os eventos continuam iguais.

## Como o motor Claude conduz

`apps/api/src/agente/motor-claude.ts` usa o **Tool Runner**
(`client.beta.messages.toolRunner`), que roda o laço pedido → ferramenta →
resposta até o modelo encerrar. Cada ferramenta é um `betaZodTool` com esquema
Zod, então o argumento chega validado.

Duas ferramentas existem só para terminar: `propor_lancamento` e
`escalar_para_humano`. É assim que se arranca uma saída estruturada de um laço de
agente sem depender de o modelo devolver JSON no meio do texto — ele chama uma
das duas, e o laço acaba. Se nenhuma for chamada (teto de iterações, ou o modelo
responde em prosa), o item vai para **revisão humana**: é o único desfecho
honesto, e é o que o produto faria.

Modelo: `claude-opus-5`, `thinking: { type: "adaptive" }` e `effort: "low"` — o
trabalho é curto e as contas já vêm prontas das ferramentas; o que se quer do
modelo é condução, não deliberação. Numa demo isso também é latência na frente do
cliente.

As instruções ficam na constante `SISTEMA`, no fim do arquivo. É lá que se
escreve o vocabulário do cliente.

## Rodar o modelo no Bedrock (a nuvem do cliente)

Alguns clientes exigem que o prompt não saia da nuvem deles. `AGENTE_PROVEDOR=bedrock`
troca o cliente da Anthropic pelo do Amazon Bedrock:

```bash
npm install --workspace @demo/api @anthropic-ai/bedrock-sdk
# no .env:  AGENTE_MOTOR=claude, AGENTE_PROVEDOR=bedrock, AGENTE_MODELO=<id do bedrock>
```

**O Bedrock do Floci não serve para isso.** O emulador tem `bedrock-runtime` e
responde com formato válido — mas o conteúdo é fixo (`"Floci stub response"`).
Serve para provar que credencial e rota estão de pé; não mostra agente nenhum
decidindo. Demo local com inteligência de verdade usa o motor `simulado`; demo
com Bedrock aponta para o Bedrock de verdade, na conta do cliente.

> Este caminho está escrito e compila, mas **não foi exercitado contra uma conta
> Bedrock real** — não havia credencial na máquina onde a skill foi construída.
> Na primeira vez que for usado, reserve tempo para o ID do modelo e a região.

## A trilha de decisões

Cada conclusão parcial vira uma decisão com quatro campos: **o que** decidiu, **a
razão** (uma frase, citando o número que a sustenta), a **confiança** e a hora.
Ela aparece ao vivo ao lado da fila e fica gravada no item.

A copy segue um padrão, e vale mantê-lo: **uma frase, número + ação, o agente
recomenda — quem aprova é uma pessoa.**

```
identificou o fornecedor · 19:32:21 · 98%
Ativa Logística e Transportes Ltda, condição 30 dias

encontrou divergência com o pedido · 19:32:22 · 96%
nota R$ 14.318,90 contra pedido R$ 14.300,00 — diferença de R$ 18,90
```

## Mudar as etapas da esteira

Os nós estão em dois lugares e precisam concordar:

- `apps/api/src/agente/tipos.ts` — a constante `NOS`
- `apps/web/components/esteira/Esteira.tsx` — a lista com rótulo e legenda

Cinco é um bom número: menos parece raso, mais não cabe numa linha e a esteira
deixa de se ler como esteira.

## Quando o agente deve parar

Esta é a pergunta mais importante da entrevista, e as respostas viram as exceções
plantadas nos dados. Padrões que funcionam em quase todo cliente:

1. **Cadastro incompleto** — o fornecedor não existe; sem ele não há como
   classificar.
2. **Divergência com o combinado** — nota × pedido, contrato, tabela.
3. **Regra fiscal não atendida** — retenção que devia vir destacada e não veio.
4. **Duplicidade** — a mesma chave já lançada.
5. **Alçada** — acima do limite, decisão é de gente.

Cada uma prova uma capacidade diferente. Em `references/dados.md` está como
plantá-las.

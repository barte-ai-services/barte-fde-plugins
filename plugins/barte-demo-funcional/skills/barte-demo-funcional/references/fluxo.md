# O fluxo

O fluxo da demo — as etapas da esteira, o que cada uma faz e quando o agente para
— é **dado**, não código. Vive em `dados/fluxo.yaml`, é executado pelo agente,
desenhado pela tela e editável dentro da própria demo, no painel **Editar
fluxo**.

Isso existe por uma razão comercial: numa reunião, o cliente descreve uma etapa
que ninguém tinha previsto, e quem está apresentando acrescenta ela na hora. O
próximo documento já roda com o fluxo novo, sem reiniciar nada.

## O arquivo

```yaml
nome: Contas a pagar

etapas:
  - id: cadastro              # estável: é por ele que o evento acende o nó
    rotulo: Cadastro          # o que aparece na esteira
    legenda: identifica o fornecedor
    acao: consultar_fornecedor
    escalaSe:                 # o que faz o agente PARAR nesta etapa
      - documento_duplicado
      - fornecedor_ausente
    motivo: Cadastro incompleto   # opcional; sobrescreve o motivo da condição
```

O arquivo é a **semente**: na primeira subida ele entra no banco, e a partir daí
quem manda é o que foi aplicado no painel. "Voltar ao original" relê o arquivo —
que é o que está versionado no git, e por isso o lugar certo do histórico.

## O catálogo

`acao` e `escalaSe` apontam para um catálogo fechado
(`apps/api/src/fluxo/catalogo.ts`). O painel monta os menus a partir dele, então
um verbo novo aparece na tela sem tocar no front.

| Ação | O que faz |
|---|---|
| `extrair` | lê o documento |
| `consultar_fornecedor` | acha o CNPJ no cadastro |
| `classificar` | define centro de custo e conta |
| `conferir` | calcula tudo o que as regras precisam |
| `propor` | fecha a proposta para um humano aprovar |

| Condição | Quando dispara |
|---|---|
| `documento_duplicado` | a chave já passou por aqui |
| `fornecedor_ausente` | CNPJ fora do cadastro |
| `divergencia_pedido` | nota não bate com o pedido |
| `retencao_inss_ausente` | serviço com cessão de mão de obra sem retenção |
| `acima_alcada` | valor acima do limite de aprovação automática |

**A fronteira, para não vender demais:** acrescentar, remover e reordenar etapa,
trocar texto e ligar uma regra que já existe não pede código. Uma regra nova
pede — e é isso mesmo. A alternativa seria inventar uma linguagem de expressão
dentro do YAML, que ninguém pediu e que transformaria a demo num produto de
plataforma.

## Acrescentar um verbo ao catálogo

Uma entrada em `catalogo.ts`, e nada mais:

```ts
orcamento_estourado: {
  rotulo: "Centro de custo sem orçamento",
  descricao: "o mês já consumiu o orçamento daquele centro de custo",
  motivoPadrao: "Orçamento do centro de custo estourado",
  avaliar: (e) => ({
    bate: consumido(e) > limite(e),
    razao: `${brl(consumido(e))} consumidos de ${brl(limite(e))} no mês`,
    confianca: 0.95,
  }),
},
```

O `rotulo` e a `descricao` são o que aparece no painel — escreva-os na língua do
cliente, não na do banco de dados. O `razao` é o que entra na trilha de decisões,
e ele cita o número: é isso que sustenta a frase na frente de um CFO.

Depois de acrescentar, o verbo aparece no menu do painel na hora, e pode ser
ligado em qualquer etapa.

## Como isso chega ao agente

- **Motor simulado** percorre as etapas na ordem: executa a ação, registra a
  decisão, avalia as condições. Não conhece etapa nenhuma por nome.
- **Motor Claude** recebe o fluxo como **roteiro no prompt** — cada etapa vira
  uma linha numerada com a descrição da ação e as regras que fazem parar —, e a
  ferramenta `conferir` devolve só as condições que aquele fluxo usa. Acrescentar
  uma etapa no painel muda o que o modelo é instruído a fazer.

Os nós da esteira acendem por um cursor que anda com o trabalho: o modelo não
precisa anunciar em que etapa está, e pedir isso a ele seria uma ferramenta a
mais só para alimentar animação.

## A validação

Tudo o que é aplicado passa pelo mesmo caminho, venha do formulário ou do editor
de YAML. O que não passa **não é aplicado**, e o fluxo que está rodando continua
rodando — o pior desfecho possível seria a demo parar por um dedo torto no meio
da apresentação.

Os problemas voltam em **lista**, em português, e todos de uma vez: quem está
editando na frente do cliente não pode corrigir um, tentar, e descobrir o
seguinte.

Um aviso que não é erro: fluxo sem a ação `propor` nunca conclui nada — todo
documento acaba em revisão humana. Aparece no log, e não bloqueia, porque pode
ser exatamente o que se quer mostrar num primeiro momento da narrativa.

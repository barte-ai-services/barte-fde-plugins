# Os dados da demo

Dado ruim derruba a demo mais rápido que bug. "Fornecedor A / R$ 100,00" avisa ao
cliente, em dois segundos, que aquilo é uma maquete.

## A regra

> **A demo nunca abre zerada.** Ela nasce com semanas de trabalho atrás dela — e
> o lote do dia é o que roda na frente do cliente.

`gerarHistorico()` (`apps/api/src/provisionamento/historico.ts`) produz ~38 itens
espalhados pelos últimos 21 dias, ~22% deles em revisão. Os documentos curados de
`dados/documentos/` são o lote de hoje.

**Gerado, mas com semente fixa.** Aleatório de verdade faria o valor na tela
mudar entre a preparação e a reunião — e é exatamente aí que alguém pergunta
"esse número saiu de onde?".

O lote curado é **trazido para hoje** na importação (`rebase.ts`): o documento
mais recente passa a ser de hoje e todos os outros andam o mesmo número de dias,
preservando as distâncias. Uma demo guardada em setembro não abre em janeiro
dizendo que a nota venceu há três meses.

## Se o cliente mandou material

**Ele manda nos dados, sempre.** Planilha, relatório, NF-e, extrato, print do
sistema — converta para `dados/documentos/*.json` (um arquivo por documento) e
ajuste `dados/cadastro.json` com os fornecedores, o plano de contas e a alçada
dele.

Planilha `.xlsx`: use a skill `xlsx` para ler antes de converter. E **anonimize o
que for identificável** se o material não puder circular — troque CNPJ e razão
social mantendo o formato.

Nada disso exige tocar em código: o provisionamento lê a pasta e sobe o que
encontrar.

## Se não mandou

Ajuste os fornecedores e as faixas de valor para o setor do cliente. É barato e
muda a percepção — uma transportadora vê nomes de transportadora.

O que torna um dado crível:

- **CNPJ formatado** e plausível: `04.252.011/0001-10`.
- **Chave de NF-e com cara de chave**: 44 dígitos, começando pelo código da UF.
- **Valores coerentes entre si**: a nota bate com o pedido, a retenção é um
  percentual que existe, o vencimento cai depois da emissão.
- **Vocabulário do cliente**: as palavras que ele usou na reunião — CFOP, centro
  de custo, competência, medição, apontamento.
- **Nomes plausíveis do setor**, e não "Empresa 1".

## Exceções plantadas

Cada exceção prova **uma** capacidade. As seis do template:

| Documento | O que ele prova |
|---|---|
| `01-nfe-ativa-logistica` | o caminho feliz — o agente conclui sozinho |
| `02-nfe-nexo-divergencia` | confere nota contra pedido e acha R$ 18,90 |
| `03-boleto-fornecedor-novo` | tipo diferente (boleto) e gap cadastral |
| `04-nfe-duplicidade` | reconhece o que já foi lançado |
| `05-nfe-retencao-ausente` | lê o serviço e sabe que faltou reter INSS |
| `06-nfe-acima-alcada` | respeita a alçada e escala para gente |

Cerca de **um quinto do lote em exceção** é a proporção que funciona. Muito menos
parece mágica; muito mais parece que o agente não resolve nada.

Ao adaptar: pergunte ao comercial três situações reais em que o processo do
cliente trava hoje, e plante uma para cada. O cliente reconhece o próprio caso na
tela — é o momento em que a demo deixa de ser uma apresentação.

## O formato

```json
{
  "id": "nfe-0001",
  "tipo": "nfe",
  "assunto": "NF-e 18.822 - Ativa Logistica",
  "recebidoEm": "2026-09-15T08:41:00-03:00",
  "remetente": "faturamento@ativalog.com.br",
  "conteudo": {
    "chave": "35260904252011000110550010000188221099887755",
    "emitente": { "nome": "Ativa Logística e Transportes Ltda", "cnpj": "04.252.011/0001-10" },
    "emissao": "2026-09-12",
    "vencimento": "2026-10-12",
    "valorTotal": 8470.35,
    "descricao": "Prestação de serviço de transporte rodoviário de carga - setembro/2026",
    "pedido": "PC-2026-4471",
    "valorPedido": 8470.35,
    "retencoes": { "iss": 0, "irrf": 127.06, "inss": 0 }
  }
}
```

`conteudo` é livre — é o formato do cliente. O que a aplicação lê está em
`extrair()` (`ferramentas.ts`); campo novo que precise virar coluna passa por lá.

## O cadastro

`dados/cadastro.json` é o que o agente consulta: fornecedores com centro de custo
e conta contábil, a alçada de aprovação automática, e as chaves já lançadas
(que alimentam o teste de duplicidade). Numa demo de verdade isto é o espelho do
ERP do cliente — troque por contas que **ele** reconheça.

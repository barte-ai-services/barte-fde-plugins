-- O esquema da demo, aplicado na subida.
--
-- Uma tabela e um índice. O documento e a trilha de decisões ficam em `jsonb`
-- porque é isso que eles são — formato do cliente, que muda a cada demo; o que
-- vira coluna é só aquilo que a tela FILTRA ou ORDENA. Modelar o documento em
-- colunas custaria uma migração por cliente e não daria nada em troca.
CREATE TABLE IF NOT EXISTS itens (
  id             TEXT PRIMARY KEY,
  estado         TEXT        NOT NULL,
  recebido_em    TIMESTAMPTZ NOT NULL,
  valor          NUMERIC(14,2) NOT NULL DEFAULT 0,
  motivo_revisao TEXT,
  documento      JSONB       NOT NULL,
  proposta       JSONB,
  decisoes       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itens_recebido_em_idx ON itens (recebido_em DESC);
CREATE INDEX IF NOT EXISTS itens_estado_idx ON itens (estado);

-- O fluxo que está no ar. Uma linha só (`id = 'atual'`): o histórico de edições
-- não interessa a ninguém aqui, e "voltar ao original" é reler `dados/fluxo.yaml`
-- — que é o arquivo versionado no git, o lugar certo para guardar histórico.
CREATE TABLE IF NOT EXISTS fluxo (
  id            TEXT PRIMARY KEY,
  definicao     JSONB       NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

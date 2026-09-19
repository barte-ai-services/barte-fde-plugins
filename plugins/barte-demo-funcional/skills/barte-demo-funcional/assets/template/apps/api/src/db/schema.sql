-- The demo's schema, applied at startup.
--
-- One table and two indexes. The document and the decision trail live in `jsonb`
-- because that is what they are — the client's format, different in every demo;
-- what becomes a column is only what the screen FILTERS or ORDERS by. Modelling
-- the document into columns would cost one migration per client and buy nothing.
CREATE TABLE IF NOT EXISTS items (
  id              TEXT PRIMARY KEY,
  state           TEXT        NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  review_reason   TEXT,
  document        JSONB       NOT NULL,
  proposal        JSONB,
  decisions       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_received_at_idx ON items (received_at DESC);
CREATE INDEX IF NOT EXISTS items_state_idx ON items (state);

-- The flow currently live. A single row (`id = 'current'`): the edit history is
-- of no interest here, and "back to original" re-reads `data/flow.yaml` — the
-- file tracked in git, which is the right place for history.
CREATE TABLE IF NOT EXISTS flow (
  id          TEXT PRIMARY KEY,
  definition  JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

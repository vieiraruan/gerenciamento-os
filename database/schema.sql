-- =====================================================================
-- gerenciamento-os — modelo de dados inicial (PostgreSQL 16)
-- Schema próprio para ficar isolado no mesmo cluster do PMI.
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS eventos;
SET search_path TO eventos;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Clientes (contratantes)
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          text NOT NULL,
    cpf_cnpj      text UNIQUE,
    telefone      text,
    email         text,
    endereco      text,
    criado_em     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Eventos — equivalente à pasta raiz do evento no Drive
-- ---------------------------------------------------------------------
CREATE TYPE status_evento AS ENUM
    ('orcamento', 'contratado', 'em_producao', 'realizado', 'cancelado');

CREATE TABLE evento (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id         uuid NOT NULL REFERENCES cliente(id),
    nome               text NOT NULL,              -- ex.: "Casamento Maria & João"
    tipo               text NOT NULL,              -- casamento, 15 anos, corporativo...
    data_evento        date NOT NULL,
    local              text,
    convidados         integer,
    status             status_evento NOT NULL DEFAULT 'orcamento',
    orcamento_previsto numeric(12,2),              -- teto de gastos com fornecedores
    drive_pasta_id     text,                       -- ID da pasta do evento no Google Drive
    criado_em          timestamptz NOT NULL DEFAULT now(),
    atualizado_em      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Fornecedores (cadastro geral, reaproveitado entre eventos)
-- ---------------------------------------------------------------------
CREATE TABLE fornecedor (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           text NOT NULL,
    categoria      text NOT NULL,                  -- buffet, decoração, foto, DJ...
    cpf_cnpj       text,
    contato_nome   text,
    telefone       text,
    email          text,
    pix_tipo       text,                           -- cpf, cnpj, email, telefone, aleatoria
    pix_chave      text,
    banco          text,
    agencia        text,
    conta          text,
    observacoes    text,
    criado_em      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Contrato — serve para os dois lados:
--   lado = 'cliente'    → contrato da assessoria com o cliente (receita)
--   lado = 'fornecedor' → contrato do evento com um fornecedor (despesa)
-- ---------------------------------------------------------------------
CREATE TYPE lado_contrato AS ENUM ('cliente', 'fornecedor');
CREATE TYPE status_contrato AS ENUM
    ('negociacao', 'enviado', 'assinado', 'quitado', 'cancelado');

CREATE TABLE contrato (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id         uuid NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
    lado              lado_contrato NOT NULL,
    fornecedor_id     uuid REFERENCES fornecedor(id),
    servico           text NOT NULL,               -- descrição do que foi contratado
    valor_total       numeric(12,2) NOT NULL CHECK (valor_total >= 0),
    entrada           numeric(12,2) NOT NULL DEFAULT 0 CHECK (entrada >= 0),
    num_parcelas      integer NOT NULL DEFAULT 0,
    forma_pagamento   text,
    status            status_contrato NOT NULL DEFAULT 'negociacao',
    data_assinatura   date,
    drive_pasta_id    text,                        -- subpasta do fornecedor no Drive
    criado_em         timestamptz NOT NULL DEFAULT now(),
    CHECK (entrada <= valor_total),
    CHECK ((lado = 'fornecedor') = (fornecedor_id IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- Parcelas previstas (a entrada é a parcela número 0)
-- ---------------------------------------------------------------------
CREATE TYPE status_parcela AS ENUM ('pendente', 'paga', 'atrasada', 'cancelada');

CREATE TABLE parcela (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id   uuid NOT NULL REFERENCES contrato(id) ON DELETE CASCADE,
    numero        integer NOT NULL,                -- 0 = entrada
    valor         numeric(12,2) NOT NULL,
    vencimento    date NOT NULL,
    status        status_parcela NOT NULL DEFAULT 'pendente',
    UNIQUE (contrato_id, numero)
);

-- ---------------------------------------------------------------------
-- Pagamentos efetivamente realizados (com comprovante)
-- ---------------------------------------------------------------------
CREATE TABLE pagamento (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcela_id      uuid NOT NULL REFERENCES parcela(id) ON DELETE CASCADE,
    valor_pago      numeric(12,2) NOT NULL CHECK (valor_pago > 0),
    data_pagamento  date NOT NULL,
    meio            text,                          -- pix, ted, boleto, cartão...
    observacao      text,
    criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Documentos (arquivos no Google Drive: contratos, comprovantes...)
-- ---------------------------------------------------------------------
CREATE TYPE tipo_documento AS ENUM ('contrato', 'comprovante', 'orcamento', 'outro');

CREATE TABLE documento (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id       uuid NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
    contrato_id     uuid REFERENCES contrato(id) ON DELETE SET NULL,
    pagamento_id    uuid REFERENCES pagamento(id) ON DELETE SET NULL,
    tipo            tipo_documento NOT NULL,
    nome_arquivo    text NOT NULL,
    mime_type       text,                          -- application/pdf, image/png...
    drive_arquivo_id text NOT NULL,
    enviado_em      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Linha do tempo do evento (substitui o histórico manual da planilha)
-- ---------------------------------------------------------------------
CREATE TABLE evento_historico (
    id          bigserial PRIMARY KEY,
    evento_id   uuid NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
    contrato_id uuid REFERENCES contrato(id) ON DELETE SET NULL,
    tipo        text NOT NULL,     -- contrato_assinado, entrada_paga, parcela_paga...
    descricao   text NOT NULL,
    criado_por  text,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Visão financeira consolidada por contrato (base do dashboard)
-- ---------------------------------------------------------------------
CREATE VIEW vw_financeiro_contrato AS
SELECT
    c.id                                  AS contrato_id,
    c.evento_id,
    c.lado,
    f.nome                                AS fornecedor,
    f.categoria,
    c.servico,
    c.valor_total,
    COALESCE(SUM(pg.valor_pago), 0)       AS valor_pago,
    c.valor_total - COALESCE(SUM(pg.valor_pago), 0) AS saldo,
    MIN(p.vencimento) FILTER (WHERE p.status IN ('pendente', 'atrasada')) AS proximo_vencimento,
    f.pix_tipo,
    f.pix_chave
FROM contrato c
LEFT JOIN fornecedor f ON f.id = c.fornecedor_id
LEFT JOIN parcela   p  ON p.contrato_id = c.id
LEFT JOIN pagamento pg ON pg.parcela_id = p.id
WHERE c.status <> 'cancelado'
GROUP BY c.id, f.id;

CREATE INDEX ON evento (data_evento);
CREATE INDEX ON contrato (evento_id);
CREATE INDEX ON parcela (vencimento) WHERE status IN ('pendente', 'atrasada');
CREATE INDEX ON documento (evento_id);

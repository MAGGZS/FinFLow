-- ============================================================
-- SCHEMA: FinFlow — Controle de Finanças Pessoais
-- Base: MySQL 8.0+ / MariaDB 10.5+
-- ============================================================

CREATE DATABASE IF NOT EXISTS finflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finflow;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. USUÁRIOS  (tabela principal — sua estrutura)
-- ============================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `nome`       VARCHAR(100) NOT NULL,
  `email`      VARCHAR(150) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL,
  `ativo`      BOOLEAN      NOT NULL DEFAULT TRUE,
  `admin`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `criado_em`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. CATEGORIAS  (expense = gasto | income = receita)
-- ============================================================
CREATE TABLE IF NOT EXISTS `categorias` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `usuario_id`  INT              NULL,           -- NULL = categoria global/padrão
  `nome`        VARCHAR(100) NOT NULL,
  `icone`       VARCHAR(50)      NULL,
  `cor`         VARCHAR(7)       NULL,           -- hex: #FF5733
  `tipo`        ENUM('gasto','receita') NOT NULL,
  `padrao`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `criado_em`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cat_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ORÇAMENTO MENSAL  (renda base + referência do mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS `orcamentos_mensais` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `usuario_id`   INT           NOT NULL,
  `ano`          SMALLINT      NOT NULL,
  `mes`          TINYINT       NOT NULL,
  `renda_base`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,  -- salário/renda fixa
  `observacoes`  TEXT              NULL,
  `criado_em`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em`TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orcamento_usuario_mes` (`usuario_id`, `ano`, `mes`),
  CONSTRAINT `chk_mes` CHECK (`mes` BETWEEN 1 AND 12),
  CONSTRAINT `fk_orc_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. RENDAS EXTRAS  (ganhos avulsos durante o mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS `rendas_extras` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `usuario_id`   INT           NOT NULL,
  `orcamento_id` INT           NOT NULL,
  `categoria_id` INT               NULL,
  `descricao`    VARCHAR(255)  NOT NULL,
  `valor`        DECIMAL(12,2) NOT NULL,
  `recebido_em`  DATE          NOT NULL,
  `criado_em`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_renda_valor` CHECK (`valor` > 0),
  KEY `idx_renda_orcamento`  (`orcamento_id`),
  KEY `idx_renda_categoria`  (`categoria_id`),
  CONSTRAINT `fk_renda_usuario`
    FOREIGN KEY (`usuario_id`)   REFERENCES `usuarios`          (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_renda_orcamento`
    FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos_mensais`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_renda_categoria`
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias`        (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. GASTOS / DESPESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS `gastos` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `usuario_id`    INT           NOT NULL,
  `orcamento_id`  INT           NOT NULL,
  `categoria_id`  INT               NULL,
  `descricao`     VARCHAR(255)  NOT NULL,
  `valor`         DECIMAL(12,2) NOT NULL,
  `data_gasto`    DATE          NOT NULL,
  `recorrente`    BOOLEAN       NOT NULL DEFAULT FALSE,  -- gasto fixo mensal?
  `observacoes`   TEXT              NULL,
  `criado_em`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_gasto_valor` CHECK (`valor` > 0),
  KEY `idx_gasto_orcamento`  (`orcamento_id`),
  KEY `idx_gasto_categoria`  (`categoria_id`),
  KEY `idx_gasto_data`       (`data_gasto`),
  CONSTRAINT `fk_gasto_usuario`
    FOREIGN KEY (`usuario_id`)   REFERENCES `usuarios`          (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gasto_orcamento`
    FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos_mensais`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gasto_categoria`
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias`        (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. LIMITE POR CATEGORIA NO MÊS  (orçamento por categoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS `limites_categoria` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `orcamento_id`  INT           NOT NULL,
  `categoria_id`  INT           NOT NULL,
  `valor_limite`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `criado_em`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_limite_orc_cat` (`orcamento_id`, `categoria_id`),
  CONSTRAINT `fk_limite_orcamento`
    FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos_mensais`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_limite_categoria`
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias`        (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VIEWS PARA RELATÓRIOS
-- ============================================================

-- Resumo financeiro por mês: renda total, total gasto, saldo
CREATE OR REPLACE VIEW `vw_resumo_mensal` AS
SELECT
  om.id                                                              AS orcamento_id,
  om.usuario_id,
  u.nome                                                             AS usuario_nome,
  om.ano,
  om.mes,
  CONCAT(om.ano, '-', LPAD(om.mes, 2, '0'))                         AS periodo,
  om.renda_base,
  COALESCE(re.total_extra, 0)                                        AS total_renda_extra,
  om.renda_base + COALESCE(re.total_extra, 0)                        AS renda_total,
  COALESCE(g.total_gasto, 0)                                         AS total_gastos,
  (om.renda_base + COALESCE(re.total_extra, 0))
    - COALESCE(g.total_gasto, 0)                                     AS saldo,
  CASE
    WHEN (om.renda_base + COALESCE(re.total_extra, 0)) > 0
    THEN ROUND(
      COALESCE(g.total_gasto, 0) /
      (om.renda_base + COALESCE(re.total_extra, 0)) * 100, 2)
    ELSE NULL
  END                                                                AS percentual_gasto
FROM `orcamentos_mensais` om
JOIN `usuarios` u ON u.id = om.usuario_id
LEFT JOIN (
  SELECT orcamento_id, SUM(valor) AS total_extra
  FROM `rendas_extras`
  GROUP BY orcamento_id
) re ON re.orcamento_id = om.id
LEFT JOIN (
  SELECT orcamento_id, SUM(valor) AS total_gasto
  FROM `gastos`
  GROUP BY orcamento_id
) g ON g.orcamento_id = om.id;


-- Gastos agrupados por categoria + % do limite consumido
CREATE OR REPLACE VIEW `vw_gastos_por_categoria` AS
SELECT
  g.orcamento_id,
  om.usuario_id,
  om.ano,
  om.mes,
  c.id                                                               AS categoria_id,
  c.nome                                                             AS categoria,
  c.cor,
  c.icone,
  SUM(g.valor)                                                       AS total_gasto,
  COUNT(g.id)                                                        AS qtd_lancamentos,
  lc.valor_limite                                                    AS limite,
  CASE
    WHEN lc.valor_limite > 0
    THEN ROUND(SUM(g.valor) / lc.valor_limite * 100, 2)
    ELSE NULL
  END                                                                AS percentual_limite
FROM `gastos` g
JOIN `orcamentos_mensais` om   ON om.id = g.orcamento_id
JOIN `categorias` c            ON c.id  = g.categoria_id
LEFT JOIN `limites_categoria` lc
  ON lc.orcamento_id = g.orcamento_id AND lc.categoria_id = g.categoria_id
GROUP BY
  g.orcamento_id, om.usuario_id, om.ano, om.mes,
  c.id, c.nome, c.cor, c.icone, lc.valor_limite;


-- Comparativo mês a mês (ideal para gráficos de linha/barra)
CREATE OR REPLACE VIEW `vw_comparativo_mensal` AS
SELECT
  om.usuario_id,
  u.nome                                                             AS usuario_nome,
  om.ano,
  om.mes,
  CONCAT(om.ano, '-', LPAD(om.mes, 2, '0'))                         AS periodo,
  om.renda_base,
  COALESCE(re.total_extra, 0)                                        AS renda_extra,
  om.renda_base + COALESCE(re.total_extra, 0)                        AS renda_total,
  COALESCE(g.total_gasto, 0)                                         AS total_gastos,
  (om.renda_base + COALESCE(re.total_extra, 0))
    - COALESCE(g.total_gasto, 0)                                     AS saldo,
  CASE
    WHEN (om.renda_base + COALESCE(re.total_extra, 0)) > 0
    THEN ROUND(
      COALESCE(g.total_gasto, 0) /
      (om.renda_base + COALESCE(re.total_extra, 0)) * 100, 2)
    ELSE NULL
  END                                                                AS percentual_gasto
FROM `orcamentos_mensais` om
JOIN `usuarios` u ON u.id = om.usuario_id
LEFT JOIN (
  SELECT orcamento_id, SUM(valor) AS total_extra
  FROM `rendas_extras`
  GROUP BY orcamento_id
) re ON re.orcamento_id = om.id
LEFT JOIN (
  SELECT orcamento_id, SUM(valor) AS total_gasto
  FROM `gastos`
  GROUP BY orcamento_id
) g ON g.orcamento_id = om.id
ORDER BY om.usuario_id, om.ano, om.mes;

-- ============================================================
-- SEED: Categorias padrão (globais, usuario_id = NULL)
-- ============================================================
INSERT IGNORE INTO `categorias`
  (`usuario_id`, `nome`, `icone`, `cor`, `tipo`, `padrao`)
VALUES
  -- Gastos
  (NULL, 'Alimentação',    '🍔', '#FF6B6B', 'gasto',   TRUE),
  (NULL, 'Transporte',     '🚗', '#4ECDC4', 'gasto',   TRUE),
  (NULL, 'Moradia',        '🏠', '#45B7D1', 'gasto',   TRUE),
  (NULL, 'Saúde',          '💊', '#96CEB4', 'gasto',   TRUE),
  (NULL, 'Educação',       '📚', '#FFEAA7', 'gasto',   TRUE),
  (NULL, 'Lazer',          '🎮', '#DDA0DD', 'gasto',   TRUE),
  (NULL, 'Roupas',         '👗', '#F0E68C', 'gasto',   TRUE),
  (NULL, 'Assinaturas',    '📱', '#FFB347', 'gasto',   TRUE),
  (NULL, 'Outros gastos',  '📦', '#D3D3D3', 'gasto',   TRUE),
  -- Receitas
  (NULL, 'Salário',        '💼', '#2ECC71', 'receita', TRUE),
  (NULL, 'Freelance',      '💻', '#27AE60', 'receita', TRUE),
  (NULL, 'Investimentos',  '📈', '#16A085', 'receita', TRUE),
  (NULL, 'Outros ganhos',  '💰', '#1ABC9C', 'receita', TRUE);
-- ============================================================
-- SCHEMA: Controle de Finanças Pessoais
-- Versão: MySQL 8.0+
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================
-- 1. USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS `profiles` (
  `id`         CHAR(36)     NOT NULL,          -- UUID
  `name`       VARCHAR(150)     NULL,
  `email`      VARCHAR(255)     NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. CATEGORIAS DE GASTOS / RECEITAS
-- ============================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `icon`       VARCHAR(50)      NULL,
  `color`      VARCHAR(7)       NULL,  -- ex: #FF5733
  `type`       ENUM('expense','income') NOT NULL,
  `is_default` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_categories_user`
    FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ORÇAMENTO MENSAL (renda base + referência do mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS `monthly_budgets` (
  `id`          CHAR(36)       NOT NULL,
  `user_id`     CHAR(36)       NOT NULL,
  `year`        SMALLINT       NOT NULL,
  `month`       TINYINT        NOT NULL CHECK (`month` BETWEEN 1 AND 12),
  `base_income` DECIMAL(12,2)  NOT NULL DEFAULT 0.00,  -- renda fixa do mês
  `notes`       TEXT               NULL,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_budget_user_ym` (`user_id`, `year`, `month`),
  CONSTRAINT `fk_budgets_user`
    FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. RENDAS EXTRAS (ganhos avulsos durante o mês)
-- ============================================================
CREATE TABLE IF NOT EXISTS `extra_incomes` (
  `id`          CHAR(36)       NOT NULL,
  `user_id`     CHAR(36)       NOT NULL,
  `budget_id`   CHAR(36)       NOT NULL,
  `category_id` CHAR(36)           NULL,
  `description` VARCHAR(255)   NOT NULL,
  `amount`      DECIMAL(12,2)  NOT NULL CHECK (`amount` > 0),
  `received_at` DATE           NOT NULL,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_extra_budget`   (`budget_id`),
  KEY `idx_extra_category` (`category_id`),
  CONSTRAINT `fk_extra_user`
    FOREIGN KEY (`user_id`)     REFERENCES `profiles`         (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_extra_budget`
    FOREIGN KEY (`budget_id`)   REFERENCES `monthly_budgets`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_extra_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`       (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. DESPESAS / GASTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id`           CHAR(36)       NOT NULL,
  `user_id`      CHAR(36)       NOT NULL,
  `budget_id`    CHAR(36)       NOT NULL,
  `category_id`  CHAR(36)           NULL,
  `description`  VARCHAR(255)   NOT NULL,
  `amount`       DECIMAL(12,2)  NOT NULL CHECK (`amount` > 0),
  `expense_date` DATE           NOT NULL,
  `is_recurring` TINYINT(1)     NOT NULL DEFAULT 0,  -- gasto fixo recorrente?
  `notes`        TEXT               NULL,
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expense_budget`   (`budget_id`),
  KEY `idx_expense_category` (`category_id`),
  KEY `idx_expense_date`     (`expense_date`),
  CONSTRAINT `fk_expense_user`
    FOREIGN KEY (`user_id`)     REFERENCES `profiles`        (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expense_budget`
    FOREIGN KEY (`budget_id`)   REFERENCES `monthly_budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expense_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`      (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. LIMITE POR CATEGORIA NO MÊS (orçamento por categoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS `budget_category_limits` (
  `id`           CHAR(36)       NOT NULL,
  `budget_id`    CHAR(36)       NOT NULL,
  `category_id`  CHAR(36)       NOT NULL,
  `limit_amount` DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_limit_budget_cat` (`budget_id`, `category_id`),
  CONSTRAINT `fk_limit_budget`
    FOREIGN KEY (`budget_id`)   REFERENCES `monthly_budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_limit_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`      (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VIEWS PARA RELATÓRIOS
-- ============================================================

-- Resumo financeiro por mês (renda total, gasto total, saldo)
CREATE OR REPLACE VIEW `vw_monthly_summary` AS
SELECT
  mb.id                                                        AS budget_id,
  mb.user_id,
  mb.year,
  mb.month,
  mb.base_income,
  COALESCE(ei.total_extra, 0)                                  AS total_extra_income,
  mb.base_income + COALESCE(ei.total_extra, 0)                 AS total_income,
  COALESCE(ex.total_spent, 0)                                  AS total_spent,
  (mb.base_income + COALESCE(ei.total_extra, 0))
    - COALESCE(ex.total_spent, 0)                              AS balance
FROM `monthly_budgets` mb
LEFT JOIN (
  SELECT budget_id, SUM(amount) AS total_extra
  FROM `extra_incomes`
  GROUP BY budget_id
) ei ON ei.budget_id = mb.id
LEFT JOIN (
  SELECT budget_id, SUM(amount) AS total_spent
  FROM `expenses`
  GROUP BY budget_id
) ex ON ex.budget_id = mb.id;


-- Gastos agrupados por categoria + % do limite consumido
CREATE OR REPLACE VIEW `vw_expenses_by_category` AS
SELECT
  e.budget_id,
  mb.user_id,
  mb.year,
  mb.month,
  c.id                                                         AS category_id,
  c.name                                                       AS category_name,
  c.color,
  c.icon,
  SUM(e.amount)                                                AS total_spent,
  COUNT(e.id)                                                  AS transactions_count,
  bcl.limit_amount                                             AS budget_limit,
  CASE
    WHEN bcl.limit_amount > 0
    THEN ROUND((SUM(e.amount) / bcl.limit_amount) * 100, 2)
    ELSE NULL
  END                                                          AS percentage_used
FROM `expenses` e
JOIN `monthly_budgets` mb         ON mb.id = e.budget_id
JOIN `categories` c               ON c.id  = e.category_id
LEFT JOIN `budget_category_limits` bcl
  ON bcl.budget_id = e.budget_id AND bcl.category_id = e.category_id
GROUP BY
  e.budget_id, mb.user_id, mb.year, mb.month,
  c.id, c.name, c.color, c.icon, bcl.limit_amount;


-- Comparativo entre meses (ideal para gráficos de linha/barra)
CREATE OR REPLACE VIEW `vw_monthly_comparison` AS
SELECT
  mb.user_id,
  mb.year,
  mb.month,
  CONCAT(mb.year, '-', LPAD(mb.month, 2, '0'))                AS period,
  mb.base_income                                               AS base_income,
  COALESCE(ei.total_extra, 0)                                  AS extra_income,
  mb.base_income + COALESCE(ei.total_extra, 0)                 AS total_income,
  COALESCE(ex.total_spent, 0)                                  AS total_spent,
  (mb.base_income + COALESCE(ei.total_extra, 0))
    - COALESCE(ex.total_spent, 0)                              AS balance,
  CASE
    WHEN (mb.base_income + COALESCE(ei.total_extra, 0)) > 0
    THEN ROUND(
      (COALESCE(ex.total_spent, 0) /
       (mb.base_income + COALESCE(ei.total_extra, 0))) * 100, 2)
    ELSE NULL
  END                                                          AS spent_percentage
FROM `monthly_budgets` mb
LEFT JOIN (
  SELECT budget_id, SUM(amount) AS total_extra
  FROM `extra_incomes`
  GROUP BY budget_id
) ei ON ei.budget_id = mb.id
LEFT JOIN (
  SELECT budget_id, SUM(amount) AS total_spent
  FROM `expenses`
  GROUP BY budget_id
) ex ON ex.budget_id = mb.id
ORDER BY mb.user_id, mb.year, mb.month;

-- ============================================================
-- DADOS INICIAIS: Categorias padrão (user_id a preencher)
-- ============================================================
-- Para inserir para um usuário específico, substitua o UUID abaixo:
-- INSERT INTO `categories` VALUES
--   (UUID(), '<USER_UUID>', 'Alimentação',   '🍔', '#FF6B6B', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Transporte',    '🚗', '#4ECDC4', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Moradia',       '🏠', '#45B7D1', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Saúde',         '💊', '#96CEB4', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Educação',      '📚', '#FFEAA7', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Lazer',         '🎮', '#DDA0DD', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Roupas',        '👗', '#F0E68C', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Outros',        '📦', '#D3D3D3', 'expense', 1, NOW()),
--   (UUID(), '<USER_UUID>', 'Salário',       '💼', '#2ECC71', 'income',  1, NOW()),
--   (UUID(), '<USER_UUID>', 'Freelance',     '💻', '#27AE60', 'income',  1, NOW()),
--   (UUID(), '<USER_UUID>', 'Investimentos', '📈', '#16A085', 'income',  1, NOW()),
--   (UUID(), '<USER_UUID>', 'Outros ganhos', '💰', '#1ABC9C', 'income',  1, NOW());

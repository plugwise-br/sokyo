-- Sokyo (Missao Arthur) - schema inicial (Fase 2)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'responsavel',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦸',
  gender TEXT, -- 'male' | 'female' | NULL (nao definido ainda)
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY,
  min_xp INTEGER NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_categories (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  category_id TEXT NOT NULL REFERENCES task_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '⭐',
  type TEXT NOT NULL DEFAULT 'rotina',
  frequency TEXT NOT NULL DEFAULT 'daily',
  days_of_week TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  requires_approval INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  child_id TEXT NOT NULL REFERENCES children(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtasks_done TEXT,
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  UNIQUE(task_id, child_id, date)
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS streaks (
  child_id TEXT PRIMARY KEY REFERENCES children(id),
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🎁',
  type TEXT NOT NULL DEFAULT 'material',
  cost_coins INTEGER NOT NULL,
  requires_approval INTEGER NOT NULL DEFAULT 1,
  stock INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  reward_id TEXT NOT NULL REFERENCES rewards(id),
  child_id TEXT NOT NULL REFERENCES children(id),
  status TEXT NOT NULL DEFAULT 'pending',
  cost_coins INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  child_id TEXT NOT NULL REFERENCES children(id),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  target_coins INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🏆', -- usado quando a crianca nao tem genero definido ainda
  name_boy TEXT, name_girl TEXT,   -- nome no masculino/feminino (ex: "Guardiao"/"Guardia"), opcional
  icon_boy TEXT, icon_girl TEXT,   -- caminho de imagem por genero, opcional (sobrepoe o icon acima)
  rule_type TEXT NOT NULL,
  rule_value INTEGER NOT NULL,
  rule_category_id TEXT
);

CREATE TABLE IF NOT EXISTS child_achievements (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TEXT NOT NULL,
  UNIQUE(child_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS allowance_settings (
  family_id TEXT PRIMARY KEY REFERENCES families(id),
  model TEXT NOT NULL DEFAULT 'performance',
  base_value REAL NOT NULL DEFAULT 0,
  coin_value REAL NOT NULL DEFAULT 0.10
);

CREATE TABLE IF NOT EXISTS allowance_payouts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  week_start TEXT NOT NULL,
  coins_spent INTEGER NOT NULL,
  value_brl REAL NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(child_id, week_start)
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  token TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id),
  expires_at TEXT NOT NULL
);

-- Produto unico (nao multi-tenant): uma unica linha, controlada so pelo
-- super admin (dono do produto) via /admin, nunca pelos pais das familias.
CREATE TABLE IF NOT EXISTS branding (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  tagline TEXT,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  gold_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  logo_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_family ON tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_completions_child_date ON task_completions(child_id, date);
CREATE INDEX IF NOT EXISTS idx_xp_tx_child ON xp_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_child ON coin_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_child ON reward_redemptions(child_id);

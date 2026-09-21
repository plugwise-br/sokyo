"use strict";
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { id } = require("../util/ids");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "sokyo.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

function withTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

// ---------- seed (só roda se o banco estiver vazio) ----------
function seedIfEmpty() {
  const familyRow = db.prepare("SELECT id FROM families LIMIT 1").get();
  if (familyRow) return familyRow.id;

  const now = new Date().toISOString();
  const familyId = id();
  const childId = id();
  const parentId = id();

  withTransaction(() => {
    db.prepare("INSERT INTO families (id, name, created_at) VALUES (?,?,?)").run(familyId, "Família Sokyo", now);
    db.prepare(
      "INSERT INTO parents (id, family_id, name, pin_hash, role, created_at) VALUES (?,?,?,?,?,?)"
    ).run(parentId, familyId, "Pais", hashPin("1010"), "responsavel", now);
    db.prepare("INSERT INTO children (id, family_id, name, avatar, created_at) VALUES (?,?,?,?,?)").run(
      childId, familyId, "Arthur", "🦸", now
    );
    db.prepare("INSERT INTO allowance_settings (family_id, model, base_value, coin_value) VALUES (?,?,?,?)").run(
      familyId, "performance", 0, 0.10
    );

    const levels = [
      [1, 0, "Aventureiro"],
      [2, 100, "Explorador"],
      [3, 300, "Guardião"],
      [4, 600, "Herói"],
      [5, 1000, "Mestre da Autonomia"]
    ];
    const insLevel = db.prepare("INSERT INTO levels (id, min_xp, name) VALUES (?,?,?)");
    levels.forEach((l) => insLevel.run(...l));

    const categories = [
      ["casa", "Casa", "🏠", "#1F8A70"],
      ["cuidados", "Cuidados pessoais", "🧼", "#3AA5D6"],
      ["autonomia", "Autonomia", "🧠", "#6C5CE7"],
      ["responsabilidades", "Responsabilidades", "📚", "#FF6B4A"],
      ["familia", "Família", "❤️", "#E1503F"]
    ];
    const insCat = db.prepare(
      "INSERT INTO task_categories (id, family_id, name, icon, color, sort_order) VALUES (?,?,?,?,?,?)"
    );
    const catIds = {};
    categories.forEach(([key, name, icon, color], i) => {
      const catId = id();
      catIds[key] = catId;
      insCat.run(catId, familyId, name, icon, color, i);
    });

    const insTask = db.prepare(
      `INSERT INTO tasks (id, family_id, category_id, name, description, icon, type, frequency, days_of_week, xp, coins, requires_approval, active, sort_order, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`
    );
    const tasks = [
      ["casa", "Arrumar a cama", "🛏️", "rotina", "daily", 10, 2, 0],
      ["casa", "Guardar brinquedos", "🧸", "rotina", "daily", 8, 1, 1],
      ["casa", "Guardar mochila", "🎒", "rotina", "daily", 8, 1, 1],
      ["casa", "Tirar o lixo", "🗑️", "rotina", "daily", 10, 2, 0],
      ["casa", "Levar prato para a cozinha", "🍽️", "rotina", "daily", 8, 2, 0],
      ["casa", "Ajudar a colocar a mesa", "🍴", "rotina", "daily", 8, 2, 0],
      ["cuidados", "Escovar os dentes (manhã)", "🪥", "rotina", "daily", 5, 1, 0],
      ["cuidados", "Escovar os dentes (noite)", "🪥", "rotina", "daily", 5, 1, 0],
      ["cuidados", "Tomar banho", "🚿", "rotina", "daily", 5, 0, 0],
      ["cuidados", "Guardar roupas", "👕", "rotina", "daily", 5, 1, 0],
      ["autonomia", "Preparar mochila", "🎒", "rotina", "daily", 10, 2, 1],
      ["autonomia", "Separar roupa do dia seguinte", "👔", "rotina", "daily", 8, 1, 1],
      ["autonomia", "Organizar material escolar", "📐", "rotina", "daily", 8, 1, 1],
      ["responsabilidades", "Fazer o dever de casa", "📖", "rotina", "daily", 15, 4, 1],
      ["responsabilidades", "Ler 15 minutos", "📚", "rotina", "daily", 10, 3, 0],
      ["responsabilidades", "Estudar para prova", "🧠", "rotina", "daily", 15, 4, 1],
      ["familia", "Ajudar alguém sem pedir", "❤️", "bonus", "daily", 15, 3, 1],
      ["familia", "Cuidar de um animal", "🐶", "rotina", "daily", 10, 2, 0],
      ["familia", "Ajudar em uma tarefa da família", "🤝", "bonus", "daily", 12, 3, 1]
    ];
    tasks.forEach(([catKey, name, icon, type, freq, xp, coins, approval], i) => {
      insTask.run(id(), familyId, catIds[catKey], name, null, icon, type, freq, null, xp, coins, approval, i, now);
    });

    db.prepare("INSERT INTO streaks (child_id, current, best, last_active_date) VALUES (?,0,0,NULL)").run(childId);

    const insReward = db.prepare(
      `INSERT INTO rewards (id, family_id, name, description, icon, type, cost_coins, requires_approval, stock, active, created_at)
       VALUES (?,?,?,?,?,?,?,1,?,1,?)`
    );
    const rewards = [
      ["Escolher o filme da família", "🎬", "privilegio", 30, null],
      ["1 hora extra de videogame", "🎮", "privilegio", 40, null],
      ["Escolher a pizza do fim de semana", "🍕", "experiencia", 25, null],
      ["Ida ao cinema", "🎟️", "experiencia", 200, null],
      ["Um brinquedo à sua escolha", "🧸", "material", 600, null]
    ];
    rewards.forEach(([name, icon, type, cost, stock]) => insReward.run(id(), familyId, name, null, icon, type, cost, stock, now));

    const insGoal = db.prepare(
      "INSERT INTO goals (id, family_id, child_id, name, icon, target_coins, created_at) VALUES (?,?,?,?,?,?,?)"
    );
    insGoal.run(id(), familyId, childId, "PlayStation 5", "🎮", 4000, now);
    insGoal.run(id(), familyId, childId, "Passeio no parque", "🎡", 250, now);

    const insAch = db.prepare(
      `INSERT INTO achievements (id, family_id, name, description, icon, rule_type, rule_value, rule_category_id)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    insAch.run(id(), familyId, "Guardião da Manhã", "7 dias seguidos cumprindo a rotina", "🌅", "streak_at_least", 7, null);
    insAch.run(id(), familyId, "Super Organizado", "10 tarefas de autonomia concluídas", "🗂️", "completions_in_category_at_least", 10, catIds.autonomia);
    insAch.run(id(), familyId, "Ajudante da Família", "20 missões de família concluídas", "🤝", "completions_in_category_at_least", 20, catIds.familia);
    insAch.run(id(), familyId, "Mestre da Autonomia", "100 tarefas concluídas no total", "🎓", "total_completions_at_least", 100, null);
  });

  return familyId;
}

function seedBrandingIfEmpty() {
  const existing = db.prepare("SELECT id FROM branding LIMIT 1").get();
  if (existing) return;
  db.prepare(
    `INSERT INTO branding (id, app_name, tagline, primary_color, secondary_color, gold_color, accent_color, logo_url)
     VALUES ('default', ?, ?, ?, ?, ?, ?, NULL)`
  ).run("Sokyo — Missão Arthur", "Pequenas missões. Grandes conquistas.", "#1F8A70", "#FF6B4A", "#E8940C", "#6C5CE7");
}

const familyId = seedIfEmpty();
seedBrandingIfEmpty();

module.exports = { db, withTransaction, hashPin, familyId, DB_PATH, DATA_DIR };

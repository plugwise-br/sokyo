"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function listByFamily(familyId) {
  return db.prepare("SELECT * FROM achievements WHERE family_id=?").all(familyId);
}

function listUnlockedByChild(childId) {
  return db.prepare(
    `SELECT a.*, ca.unlocked_at FROM child_achievements ca
     JOIN achievements a ON a.id = ca.achievement_id
     WHERE ca.child_id=? ORDER BY ca.unlocked_at DESC`
  ).all(childId);
}

function isUnlocked(childId, achievementId) {
  return !!db.prepare("SELECT 1 FROM child_achievements WHERE child_id=? AND achievement_id=?").get(childId, achievementId);
}

function unlock(childId, achievementId) {
  if (isUnlocked(childId, achievementId)) return null;
  db.prepare("INSERT INTO child_achievements (id, child_id, achievement_id, unlocked_at) VALUES (?,?,?,?)")
    .run(id(), childId, achievementId, new Date().toISOString());
  return db.prepare("SELECT * FROM achievements WHERE id=?").get(achievementId);
}

const RULE_TYPES = ["streak_at_least", "total_completions_at_least", "completions_in_category_at_least"];

function get(achievementId) {
  return db.prepare("SELECT * FROM achievements WHERE id=?").get(achievementId);
}

function create(familyId, body) {
  const achievementId = id();
  const ruleType = RULE_TYPES.indexOf(body.ruleType) >= 0 ? body.ruleType : "total_completions_at_least";
  db.prepare(
    `INSERT INTO achievements (id, family_id, name, description, icon, rule_type, rule_value, rule_category_id)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(achievementId, familyId, body.name, body.description || null, body.icon || "🏆", ruleType,
    Math.max(1, parseInt(body.ruleValue, 10) || 1), ruleType === "completions_in_category_at_least" ? (body.ruleCategoryId || null) : null);
  return get(achievementId);
}

function update(achievementId, body) {
  const current = get(achievementId);
  if (!current) return null;
  const name = body.name !== undefined ? body.name : current.name;
  const icon = body.icon !== undefined ? body.icon : current.icon;
  const description = body.description !== undefined ? body.description : current.description;
  db.prepare("UPDATE achievements SET name=?, icon=?, description=? WHERE id=?").run(name, icon, description, achievementId);
  return get(achievementId);
}

function remove(achievementId) {
  db.prepare("DELETE FROM child_achievements WHERE achievement_id=?").run(achievementId);
  return db.prepare("DELETE FROM achievements WHERE id=?").run(achievementId).changes > 0;
}

module.exports = { listByFamily, listUnlockedByChild, isUnlocked, unlock, get, create, update, remove, RULE_TYPES };

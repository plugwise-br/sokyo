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

module.exports = { listByFamily, listUnlockedByChild, isUnlocked, unlock };

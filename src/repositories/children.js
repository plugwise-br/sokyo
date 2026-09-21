"use strict";
const { db } = require("../db");
const { id } = require("../util/ids");

function listByFamily(familyId) {
  return db.prepare("SELECT * FROM children WHERE family_id = ? ORDER BY created_at").all(familyId);
}

function get(childId) {
  return db.prepare("SELECT * FROM children WHERE id = ?").get(childId);
}

function create(familyId, { name, avatar }) {
  const childId = id();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO children (id, family_id, name, avatar, created_at) VALUES (?,?,?,?,?)").run(
    childId, familyId, name, avatar || "🦸", now
  );
  db.prepare("INSERT INTO streaks (child_id, current, best, last_active_date) VALUES (?,0,0,NULL)").run(childId);
  return get(childId);
}

function update(childId, body) {
  const current = get(childId);
  if (!current) return null;
  const name = body.name !== undefined && body.name.trim() ? body.name.trim() : current.name;
  const avatar = body.avatar !== undefined && body.avatar.trim() ? body.avatar.trim() : current.avatar;
  db.prepare("UPDATE children SET name=?, avatar=? WHERE id=?").run(name, avatar, childId);
  return get(childId);
}

module.exports = { listByFamily, get, create, update };

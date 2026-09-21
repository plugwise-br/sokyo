"use strict";
const { db } = require("../db");

function listByFamily(familyId) {
  return db.prepare("SELECT * FROM task_categories WHERE family_id = ? ORDER BY sort_order").all(familyId);
}

function get(categoryId) {
  return db.prepare("SELECT * FROM task_categories WHERE id = ?").get(categoryId);
}

module.exports = { listByFamily, get };

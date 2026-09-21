"use strict";
const { db } = require("../db");

function all() {
  return db.prepare("SELECT * FROM levels ORDER BY min_xp").all();
}

function forXp(xp) {
  const levels = all();
  let current = levels[0] || { id: 1, min_xp: 0, name: "Aventureiro" };
  let next = null;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min_xp) current = levels[i];
    else { next = levels[i]; break; }
  }
  const progress = next ? xp - current.min_xp : 0;
  const span = next ? next.min_xp - current.min_xp : 1;
  return {
    level: current.id,
    name: current.name,
    xp,
    xpIntoLevel: progress,
    xpForNextLevel: next ? span : null,
    nextLevelName: next ? next.name : null
  };
}

module.exports = { all, forXp };

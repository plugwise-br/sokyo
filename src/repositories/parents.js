"use strict";
const { db, hashPin } = require("../db");
const { id } = require("../util/ids");
const crypto = require("crypto");

function findByFamily(familyId) {
  return db.prepare("SELECT * FROM parents WHERE family_id=?").all(familyId);
}

function verifyPin(familyId, pin) {
  const hash = hashPin(pin);
  return db.prepare("SELECT * FROM parents WHERE family_id=? AND pin_hash=?").get(familyId, hash);
}

function setPin(parentId, newPin) {
  db.prepare("UPDATE parents SET pin_hash=? WHERE id=?").run(hashPin(newPin), parentId);
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createSession(parentId) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO parent_sessions (token, parent_id, expires_at) VALUES (?,?,?)").run(token, parentId, expiresAt);
  return { token, expiresAt };
}

function getSession(token) {
  const s = db.prepare("SELECT * FROM parent_sessions WHERE token=?").get(token);
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM parent_sessions WHERE token=?").run(token);
    return null;
  }
  return s;
}

function touchSession(token) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("UPDATE parent_sessions SET expires_at=? WHERE token=?").run(expiresAt, token);
}

module.exports = { findByFamily, verifyPin, setPin, createSession, getSession, touchSession };

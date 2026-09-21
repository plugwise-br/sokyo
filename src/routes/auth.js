"use strict";
const express = require("express");
const parentsRepo = require("../repositories/parents");
const { familyId } = require("../db");

const LOGIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const attempts = new Map(); // ip -> {count, windowStart}

const router = express.Router();

router.post("/login", (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  let rec = attempts.get(ip);
  if (!rec || now - rec.windowStart > LOGIN_ATTEMPT_WINDOW_MS) rec = { count: 0, windowStart: now };
  if (rec.count >= LOGIN_MAX_ATTEMPTS) return res.status(429).json({ error: "too_many_attempts" });

  const pin = String((req.body && req.body.pin) || "");
  const parent = parentsRepo.verifyPin(familyId, pin);
  if (!parent) {
    rec.count += 1;
    attempts.set(ip, rec);
    return res.status(401).json({ error: "invalid_pin" });
  }
  attempts.delete(ip);
  const session = parentsRepo.createSession(parent.id);
  res.json({ token: session.token, expiresAt: session.expiresAt, parentName: parent.name });
});

module.exports = router;

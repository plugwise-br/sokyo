"use strict";
// Area do super admin - separada da familia: PIN proprio (nunca o mesmo
// PIN dos pais), controla so a marca do produto (nome, cores, logo),
// nunca dados de uma familia especifica.
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const brandingRepo = require("../repositories/branding");
const { DATA_DIR } = require("../db");

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ADMIN_PIN = process.env.ADMIN_PIN || "";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

const sessions = new Map(); // token -> expiresAt
const attempts = new Map(); // ip -> {count, windowStart}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const expires = token && sessions.get(token);
  if (!expires || expires < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: "unauthorized" });
  }
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || ".png").toLowerCase();
      cb(null, "logo-" + Date.now() + ext);
    }
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("tipo_invalido"), ok);
  }
});

const router = express.Router();

router.post("/login", (req, res) => {
  if (!ADMIN_PIN) return res.status(503).json({ error: "admin_disabled" });
  const ip = req.ip;
  const now = Date.now();
  let rec = attempts.get(ip);
  if (!rec || now - rec.windowStart > LOGIN_ATTEMPT_WINDOW_MS) rec = { count: 0, windowStart: now };
  if (rec.count >= LOGIN_MAX_ATTEMPTS) return res.status(429).json({ error: "too_many_attempts" });

  const pin = String((req.body && req.body.pin) || "");
  if (pin !== ADMIN_PIN) {
    rec.count += 1;
    attempts.set(ip, rec);
    return res.status(401).json({ error: "invalid_pin" });
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ token });
});

router.put("/branding", requireAdmin, (req, res) => {
  res.json(brandingRepo.update(req.body || {}));
});

router.post("/branding/logo", requireAdmin, upload.single("logo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "arquivo_ausente" });
  const logoUrl = "/branding-uploads/" + req.file.filename;
  res.json(brandingRepo.update({ logoUrl }));
});

module.exports = router;

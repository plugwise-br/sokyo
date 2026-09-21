"use strict";
const express = require("express");
const childrenRepo = require("../repositories/children");
const gameService = require("../services/gameService");
const { familyId } = require("../db");
const { requireParent } = require("./middleware");

const router = express.Router();

// Publico: a tela de selecao de perfil da crianca lista quem existe na familia,
// sem senha nenhuma (item 3 do briefing).
router.get("/", (req, res) => {
  const children = childrenRepo.listByFamily(familyId).map((c) => Object.assign({}, c, gameService.childSummary(c.id)));
  res.json(children);
});

router.post("/", requireParent, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  const child = childrenRepo.create(familyId, { name, avatar: req.body.avatar });
  res.json(child);
});

module.exports = router;

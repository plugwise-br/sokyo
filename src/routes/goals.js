"use strict";
const express = require("express");
const goalsRepo = require("../repositories/goals");
const { familyId } = require("../db");
const { requireParent } = require("./middleware");

const router = express.Router();

router.get("/children/:childId/goals", (req, res) => {
  res.json(goalsRepo.listByChild(req.params.childId));
});

router.post("/children/:childId/goals", requireParent, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  res.json(goalsRepo.create(familyId, req.params.childId, req.body));
});

router.put("/goals/:id", requireParent, (req, res) => {
  const goal = goalsRepo.update(req.params.id, req.body);
  if (!goal) return res.status(404).json({ error: "not_found" });
  res.json(goal);
});

router.delete("/goals/:id", requireParent, (req, res) => {
  const ok = goalsRepo.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

module.exports = router;

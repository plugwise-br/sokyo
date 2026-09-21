"use strict";
const express = require("express");
const rewardsRepo = require("../repositories/rewards");
const redemptionsRepo = require("../repositories/redemptions");
const rewardsService = require("../services/rewardsService");
const { familyId } = require("../db");
const { requireParent, handleGameError } = require("./middleware");

const router = express.Router();

router.get("/rewards", (req, res) => {
  res.json(rewardsRepo.listByFamily(familyId, { onlyActive: !req.query.all }));
});

router.post("/rewards", requireParent, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  res.json(rewardsRepo.create(familyId, req.body));
});

router.put("/rewards/:id", requireParent, (req, res) => {
  const reward = rewardsRepo.update(req.params.id, req.body);
  if (!reward) return res.status(404).json({ error: "not_found" });
  res.json(reward);
});

router.delete("/rewards/:id", requireParent, (req, res) => {
  const ok = rewardsRepo.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

// Publico: a crianca solicita a troca (nunca recebe as moedas so por pedir).
router.post("/children/:childId/rewards/:rewardId/redeem", (req, res) => {
  try {
    res.json(rewardsService.redeem(req.params.childId, req.params.rewardId));
  } catch (err) { handleGameError(err, res); }
});

router.get("/redemptions/pending", requireParent, (req, res) => {
  res.json(redemptionsRepo.listPendingByFamily(familyId));
});

router.post("/redemptions/:id/resolve", requireParent, (req, res) => {
  try {
    res.json(rewardsService.resolveRedemption(req.params.id, req.body && req.body.status, req.parentId));
  } catch (err) { handleGameError(err, res); }
});

module.exports = router;

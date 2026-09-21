"use strict";
const express = require("express");
const tasksRepo = require("../repositories/tasks");
const categoriesRepo = require("../repositories/categories");
const dates = require("../util/dates");
const { familyId } = require("../db");
const { requireParent } = require("./middleware");

const router = express.Router();

router.get("/categories", (req, res) => {
  res.json(categoriesRepo.listByFamily(familyId));
});

// Publico: lista as missoes agendadas para hoje (o que a crianca ve na aba "Hoje").
// ?all=1 (uso do painel dos pais) traz tambem as inativas / fora do dia de hoje.
router.get("/", (req, res) => {
  if (req.query.all) return res.json(tasksRepo.listByFamily(familyId));
  const weekday = dates.weekdayIndex(dates.todayKey());
  const scheduled = tasksRepo.listByFamily(familyId, { onlyActive: true }).filter((t) => tasksRepo.isScheduledToday(t, weekday));
  res.json(scheduled);
});

router.post("/", requireParent, (req, res) => {
  const name = String((req.body && req.body.name) || "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  if (!req.body.categoryId) return res.status(400).json({ error: "category_required" });
  res.json(tasksRepo.create(familyId, req.body));
});

router.put("/:id", requireParent, (req, res) => {
  const task = tasksRepo.update(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: "not_found" });
  res.json(task);
});

router.delete("/:id", requireParent, (req, res) => {
  const ok = tasksRepo.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

module.exports = router;

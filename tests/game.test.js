"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "sokyo-test-"));

const { createApp } = require("../src/app");
const streaksRepo = require("../src/repositories/streaks");
const levelsRepo = require("../src/repositories/levels");
const tasksRepo = require("../src/repositories/tasks");
const childrenRepo = require("../src/repositories/children");
const rewardsRepo = require("../src/repositories/rewards");
const { familyId } = require("../src/db");

let server, baseUrl;

before(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function api(path, opts = {}) {
  const res = await fetch(baseUrl + "/api" + path, {
    method: opts.method || "GET",
    headers: Object.assign({ "Content-Type": "application/json" }, opts.token ? { Authorization: "Bearer " + opts.token } : {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login() {
  const { json } = await api("/auth/login", { method: "POST", body: { pin: "1010" } });
  return json.token;
}

test("regra 1+3+4: completar tarefa sem aprovacao credita XP e moedas na hora", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste1" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, { name: "Tarefa livre", categoryId: category.id, xp: 10, coins: 2, requiresApproval: false });

  const { status, json } = await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });
  assert.equal(status, 200);
  assert.equal(json.status, "approved");

  const { json: children } = await api("/children");
  const found = children.find((c) => c.id === child.id);
  assert.equal(found.xp, 10);
  assert.equal(found.coins, 2);
});

test("regra 2: tarefa com aprovacao fica pendente ate o pai aprovar", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste2" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, { name: "Tarefa aprovada", categoryId: category.id, xp: 5, coins: 1, requiresApproval: true });

  const { json: completion } = await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });
  assert.equal(completion.status, "pending");

  let { json: children } = await api("/children");
  assert.equal(children.find((c) => c.id === child.id).xp, 0, "nao deve creditar antes de aprovar");

  const token = await login();
  const resolve = await api(`/completions/${completion.id}/resolve`, { method: "POST", token, body: { status: "approved" } });
  assert.equal(resolve.status, 200);
  assert.equal(resolve.json.status, "approved");

  ({ json: children } = await api("/children"));
  assert.equal(children.find((c) => c.id === child.id).xp, 5);
});

test("regra 5: reenviar a mesma tarefa no mesmo dia nao duplica o premio", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste5" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, { name: "Tarefa idempotente", categoryId: category.id, xp: 10, coins: 3, requiresApproval: false });

  await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });
  await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });
  await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });

  const { json: children } = await api("/children");
  assert.equal(children.find((c) => c.id === child.id).xp, 10, "deveria contar so uma vez");
});

test("regra 6: crianca nao acessa endpoint administrativo sem PIN", async () => {
  const { status } = await api("/completions/pending");
  assert.equal(status, 401);
  const { status: status2 } = await api("/tasks", { method: "POST", body: { name: "x" } });
  assert.equal(status2, 401);
});

test("regra 7: trocar moedas por recompensa debita o saldo", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste7" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, { name: "Ganhar moedas", categoryId: category.id, xp: 0, coins: 50, requiresApproval: false });
  await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });

  const reward = rewardsRepo.create(familyId, { name: "Recompensa teste", costCoins: 30, requiresApproval: false });
  const { status, json } = await api(`/children/${child.id}/rewards/${reward.id}/redeem`, { method: "POST" });
  assert.equal(status, 200);
  assert.equal(json.status, "approved");

  const { json: children } = await api("/children");
  assert.equal(children.find((c) => c.id === child.id).coins, 20);

  // sem moedas suficientes -> rejeita
  const { status: status2, json: json2 } = await api(`/children/${child.id}/rewards/${reward.id}/redeem`, { method: "POST" });
  assert.equal(status2, 409);
  assert.equal(json2.error, "insufficient_coins");
});

test("regra 8: streak soma em dias consecutivos e reseta ao quebrar a sequencia", () => {
  const child = childrenRepo.create(familyId, { name: "Teste8" });
  let s = streaksRepo.registerActivity(child.id, "2026-01-01", "2025-12-31");
  assert.equal(s.current, 1);
  s = streaksRepo.registerActivity(child.id, "2026-01-02", "2026-01-01");
  assert.equal(s.current, 2);
  s = streaksRepo.registerActivity(child.id, "2026-01-03", "2026-01-02");
  assert.equal(s.current, 3);
  // pula um dia -> quebra a sequencia, mas o recorde (best) permanece
  s = streaksRepo.registerActivity(child.id, "2026-01-05", "2026-01-04");
  assert.equal(s.current, 1);
  assert.equal(s.best, 3, "o recorde nao deve ser apagado quando a sequencia quebra");
});

test("regra 9: nivel sobe conforme o XP acumulado, sem perder XP ja conquistado", () => {
  assert.equal(levelsRepo.forXp(0).name, "Aventureiro");
  assert.equal(levelsRepo.forXp(99).name, "Aventureiro");
  assert.equal(levelsRepo.forXp(100).name, "Explorador");
  assert.equal(levelsRepo.forXp(300).name, "Guardião");
  assert.equal(levelsRepo.forXp(1000).name, "Mestre da Autonomia");
  assert.equal(levelsRepo.forXp(999999).name, "Mestre da Autonomia");
});

test("regra 10: toda conclusao aprovada fica registrada no diario", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste10" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, { name: "Tarefa historico", categoryId: category.id, xp: 4, coins: 1, requiresApproval: false });
  await api(`/children/${child.id}/tasks/${task.id}/complete`, { method: "POST" });

  const { json: diary } = await api(`/children/${child.id}/diary`);
  assert.equal(diary.length, 1);
  assert.equal(diary[0].task_name, "Tarefa historico");
  assert.equal(diary[0].status, "approved");
});

test("missao epica so libera XP/moedas quando todas as subtarefas estao feitas", async () => {
  const child = childrenRepo.create(familyId, { name: "Teste11" });
  const [category] = require("../src/repositories/categories").listByFamily(familyId);
  const task = tasksRepo.create(familyId, {
    name: "Organizar o quarto", categoryId: category.id, type: "epica", xp: 100, coins: 50,
    requiresApproval: false, subtasks: ["Guardar brinquedos", "Organizar livros", "Arrumar cama"]
  });

  const [s1, s2, s3] = task.subtasks;
  await api(`/children/${child.id}/tasks/${task.id}/subtasks/${s1.id}/toggle`, { method: "POST" });
  await api(`/children/${child.id}/tasks/${task.id}/subtasks/${s2.id}/toggle`, { method: "POST" });

  let { json: children } = await api("/children");
  assert.equal(children.find((c) => c.id === child.id).xp, 0, "nao deve liberar premio parcial");

  const { json: last } = await api(`/children/${child.id}/tasks/${task.id}/subtasks/${s3.id}/toggle`, { method: "POST" });
  assert.equal(last.status, "approved");

  ({ json: children } = await api("/children"));
  assert.equal(children.find((c) => c.id === child.id).xp, 100);
  assert.equal(children.find((c) => c.id === child.id).coins, 50);
});

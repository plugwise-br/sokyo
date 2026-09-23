// Camada fina de acesso a API - nenhuma logica de negocio aqui, so HTTP.
const TOKEN_KEY = "sokyo.parentToken";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
export function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(path, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch("/api" + path, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 401) {
    setToken(null);
    onUnauthorized();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || "erro"), { code: json.error, status: res.status });
  return json;
}

export const api = {
  // publico
  children: () => request("/children"),
  createChild: (body) => request("/children", { method: "POST", body }),
  tasksToday: () => request("/tasks"),
  categories: () => request("/tasks/categories"),
  completeTask: (childId, taskId) => request(`/children/${childId}/tasks/${taskId}/complete`, { method: "POST" }),
  toggleSubtask: (childId, taskId, subtaskId) => request(`/children/${childId}/tasks/${taskId}/subtasks/${subtaskId}/toggle`, { method: "POST" }),
  rewards: (all) => request("/rewards" + (all ? "?all=1" : "")),
  redeem: (childId, rewardId) => request(`/children/${childId}/rewards/${rewardId}/redeem`, { method: "POST" }),
  goals: (childId) => request(`/children/${childId}/goals`),
  achievements: (childId) => request(`/children/${childId}/achievements`),
  diary: (childId, days) => request(`/children/${childId}/diary?days=${days == null ? 14 : days}`),
  weeklyReport: (childId) => request(`/children/${childId}/report/weekly`),

  // auth
  login: (pin) => request("/auth/login", { method: "POST", body: { pin } }),
  changePin: (newPin) => request("/auth/pin", { method: "PUT", body: { newPin } }),

  // pais (autenticado)
  dashboard: () => request("/dashboard"),
  allTasks: () => request("/tasks?all=1"),
  createTask: (body) => request("/tasks", { method: "POST", body }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: "PUT", body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  pendingCompletions: () => request("/completions/pending"),
  resolveCompletion: (id, status) => request(`/completions/${id}/resolve`, { method: "POST", body: { status } }),
  allRewards: () => request("/rewards?all=1"),
  createReward: (body) => request("/rewards", { method: "POST", body }),
  updateReward: (id, body) => request(`/rewards/${id}`, { method: "PUT", body }),
  deleteReward: (id) => request(`/rewards/${id}`, { method: "DELETE" }),
  pendingRedemptions: () => request("/redemptions/pending"),
  resolveRedemption: (id, status) => request(`/redemptions/${id}/resolve`, { method: "POST", body: { status } }),
  createGoal: (childId, body) => request(`/children/${childId}/goals`, { method: "POST", body }),
  updateGoal: (id, body) => request(`/goals/${id}`, { method: "PUT", body }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: "DELETE" }),
  allowanceSettings: () => request("/allowance/settings"),
  updateAllowanceSettings: (body) => request("/allowance/settings", { method: "PUT", body }),
  payWeek: (childId) => request(`/children/${childId}/allowance/pay-week`, { method: "POST" }),
  allowanceHistory: (childId) => request(`/children/${childId}/allowance/history`),
  createChildAuth: (body) => request("/children", { method: "POST", body }),
  updateChild: (id, body) => request(`/children/${id}`, { method: "PUT", body }),
  allAchievements: () => request("/achievements"),
  createAchievement: (body) => request("/achievements", { method: "POST", body }),
  updateAchievement: (id, body) => request(`/achievements/${id}`, { method: "PUT", body }),
  deleteAchievement: (id) => request(`/achievements/${id}`, { method: "DELETE" })
};

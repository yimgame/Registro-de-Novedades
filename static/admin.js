const THEME_KEY = "bloqueos_theme";
const ADMIN_USER_STORE = "bloqueos_admin_user";
const ADMIN_KEY_STORE = "bloqueos_admin_key";

const rowsEl = document.getElementById("rows");
const usersRowsEl = document.getElementById("usersRows");
const auditRowsEl = document.getElementById("auditRows");
const statusEl = document.getElementById("status");
const metaInfo = document.getElementById("metaInfo");

const adminUserInput = document.getElementById("admin_user");
const adminKeyInput = document.getElementById("admin_key");
const adminUnlockBtn = document.getElementById("adminUnlockBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const downloadBtn = document.getElementById("downloadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const adminSearchBtn = document.getElementById("adminSearchBtn");
const adminSearchInput = document.getElementById("admin_search_query");
const usersCard = document.getElementById("usersCard");
const createUserBtn = document.getElementById("createUserBtn");
const forceChangeCard = document.getElementById("forceChangeCard");
const forceChangeBtn = document.getElementById("forceChangeBtn");
const forceNewKeyInput = document.getElementById("force_new_key");
const forceNewKey2Input = document.getElementById("force_new_key_2");
const auditCard = document.getElementById("auditCard");
const policyCard = document.getElementById("policyCard");
const savePolicyBtn = document.getElementById("savePolicyBtn");
const forceLegacyRotationBtn = document.getElementById("forceLegacyRotationBtn");
const permissionsCard = document.getElementById("permissionsCard");
const permissionsHeadEl = document.getElementById("permissionsHead");
const permissionsRowsEl = document.getElementById("permissionsRows");
const savePermissionsBtn = document.getElementById("savePermissionsBtn");
const expiryCard = document.getElementById("expiryCard");
const expiryRowsEl = document.getElementById("expiryRows");
const expiryAlertEl = document.getElementById("expiryAlert");
const expiryDaysThresholdInput = document.getElementById("expiry_days_threshold");
const expiryCountExpiredInput = document.getElementById("expiry_count_expired");
const expiryCountSoonInput = document.getElementById("expiry_count_soon");
const refreshExpiryBtn = document.getElementById("refreshExpiryBtn");
const adminTabsCard = document.getElementById("adminTabsCard");
const adminTabsEl = document.getElementById("adminTabs");
const recordsCard = document.getElementById("recordsCard");

const policyMinLengthInput = document.getElementById("policy_min_length");
const policyExpiresDaysInput = document.getElementById("policy_expires_days");
const policyRequireUpperInput = document.getElementById("policy_require_uppercase");
const policyRequireLowerInput = document.getElementById("policy_require_lowercase");
const policyRequireDigitInput = document.getElementById("policy_require_digit");
const policyRequireSymbolInput = document.getElementById("policy_require_symbol");

let auth = {
  user: "",
  key: "",
  role: "",
  permissions: {},
  unlocked: false,
  mustChangePassword: false,
};

let roleCatalog = ["ADMIN", "JRT", "SUPERVISOR", "LIDER", "GERENTE", "AUDITOR"];
let permissionsPayload = null;
let activeTab = "records";

const panelByTab = {
  records: recordsCard,
  users: usersCard,
  policy: policyCard,
  permissions: permissionsCard,
  audit: auditCard,
  expiry: expiryCard,
  "force-change": forceChangeCard,
};

function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function saveAuth() {
  localStorage.setItem(ADMIN_USER_STORE, auth.user || "");
  localStorage.setItem(ADMIN_KEY_STORE, auth.key || "");
}

function clearAuth() {
  auth = { user: "", key: "", role: "", permissions: {}, unlocked: false, mustChangePassword: false };
  localStorage.removeItem(ADMIN_USER_STORE);
  localStorage.removeItem(ADMIN_KEY_STORE);
}

function can(permission) {
  return Boolean(auth.permissions && auth.permissions[permission]);
}

function getAuthHeaders() {
  return {
    "X-Admin-User": auth.user,
    "X-Admin-Key": auth.key,
  };
}

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text || "";
  return td;
}

function formatFriendlyDate(isoValue) {
  if (!isoValue) {
    return "-";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }

  return date.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExpiryState(item) {
  if (item.password_issue === "must_change_password") {
    return "Cambio obligatorio";
  }
  if (item.password_issue === "password_expired") {
    return "Vencida";
  }
  if (typeof item.days_until_expiry === "number") {
    return item.days_until_expiry <= 0 ? "Vence hoy" : "Vigente";
  }
  return "Sin vencimiento";
}

function hasNormalAccess() {
  return auth.unlocked && !auth.mustChangePassword;
}

function getAvailableTabs() {
  if (!auth.unlocked) {
    return [];
  }

  if (auth.mustChangePassword) {
    return ["force-change"];
  }

  const tabs = [];
  if (can("can_view_records")) {
    tabs.push("records");
  }
  if (can("can_manage_users")) {
    tabs.push("users");
  }
  if (can("can_manage_policy")) {
    tabs.push("policy");
  }
  if (can("can_manage_permissions")) {
    tabs.push("permissions");
  }
  if (can("can_view_audit")) {
    tabs.push("audit");
  }
  if (can("can_view_password_health")) {
    tabs.push("expiry");
  }

  return tabs;
}

function renderTabs() {
  const availableTabs = getAvailableTabs();
  const tabButtons = adminTabsEl ? adminTabsEl.querySelectorAll(".tab-btn[data-tab]") : [];

  if (!availableTabs.length) {
    if (adminTabsCard) {
      adminTabsCard.classList.add("hidden");
    }
    Object.values(panelByTab).forEach((panel) => {
      if (panel) {
        panel.classList.add("hidden");
      }
    });
    return;
  }

  if (adminTabsCard) {
    adminTabsCard.classList.remove("hidden");
  }

  if (!availableTabs.includes(activeTab)) {
    activeTab = availableTabs[0];
  }

  tabButtons.forEach((button) => {
    const tab = button.dataset.tab;
    const enabled = availableTabs.includes(tab);
    button.classList.toggle("hidden", !enabled);
    button.classList.toggle("active", enabled && tab === activeTab);
    button.setAttribute("aria-selected", enabled && tab === activeTab ? "true" : "false");
  });

  Object.entries(panelByTab).forEach(([tab, panel]) => {
    if (!panel) {
      return;
    }
    panel.classList.toggle("hidden", tab !== activeTab);
  });
}

function switchTab(tab) {
  activeTab = tab;
  renderTabs();
}

function refreshAdminUI() {
  const enable = hasNormalAccess();
  downloadBtn.classList.toggle("hidden", !enable || !can("can_export_excel"));
  refreshBtn.classList.toggle("hidden", !enable || !can("can_view_records"));
  adminSearchBtn.classList.toggle("hidden", !enable || !can("can_search_records"));

  if (!enable || !can("can_view_password_health")) {
    expiryAlertEl.classList.add("hidden");
    expiryRowsEl.innerHTML = "";
    expiryCountExpiredInput.value = "-";
    expiryCountSoonInput.value = "-";
  }

  if (!enable || !can("can_manage_permissions")) {
    permissionsHeadEl.innerHTML = "";
    permissionsRowsEl.innerHTML = "";
  }

  renderTabs();
}

function setPolicyInputs(policy) {
  policyMinLengthInput.value = policy.min_length;
  policyExpiresDaysInput.value = policy.expires_days;
  policyRequireUpperInput.checked = Boolean(policy.require_uppercase);
  policyRequireLowerInput.checked = Boolean(policy.require_lowercase);
  policyRequireDigitInput.checked = Boolean(policy.require_digit);
  policyRequireSymbolInput.checked = Boolean(policy.require_symbol);
}

async function loadMeta() {
  const response = await fetch("/api/meta");
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  metaInfo.textContent = `Servidor GMT-3: ${data.server_datetime_gmt_minus_3} | DB: ${data.db_engine} | Desbloqueo: ${data.unlock_roles.join("/")}`;
}

async function verifyAuth(user, key) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_user: user, admin_key: key }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo validar credenciales.");
  }

  return response.json();
}

async function loadRows(search = "") {
  if (!hasNormalAccess()) {
    rowsEl.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 15;
    td.textContent = auth.mustChangePassword
      ? "Debes cambiar tu clave para ver registros."
      : "Inicia panel para ver registros.";
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  if (!can("can_view_records")) {
    rowsEl.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 15;
    td.textContent = "No tienes permisos para ver registros.";
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  const response = await fetch(`/api/admin/requests?limit=100&q=${encodeURIComponent(search)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    clearAuth();
    refreshAdminUI();
    throw new Error("Sesion admin invalida.");
  }

  const rows = await response.json();
  rowsEl.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 15;
    td.textContent = "Sin registros.";
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(String(row.id)));
    tr.appendChild(createCell(row.created_at_system));
    tr.appendChild(createCell(row.event_datetime));
    tr.appendChild(createCell(row.action_type));
    tr.appendChild(createCell(String(row.related_request_id || "")));
    tr.appendChild(createCell(row.requested_by_user));
    tr.appendChild(createCell(row.authorized_by_user));
    tr.appendChild(createCell(row.patente_primaria));
    tr.appendChild(createCell(row.patente_secundaria));
    tr.appendChild(createCell(row.bitren));
    tr.appendChild(createCell(row.dni));
    tr.appendChild(createCell(row.nombre));
    tr.appendChild(createCell(row.motivo));

    const evidenceTd = document.createElement("td");
    if (row.has_evidence) {
      const evidenceLink = document.createElement("a");
      evidenceLink.className = "ghost-link";
      evidenceLink.href = `/api/evidence/${encodeURIComponent(row.id)}?admin_user=${encodeURIComponent(auth.user || "")}&admin_key=${encodeURIComponent(auth.key || "")}`;
      evidenceLink.textContent = row.evidence_original_name || "Descargar";
      evidenceTd.appendChild(evidenceLink);
    } else {
      evidenceTd.textContent = "-";
    }
    tr.appendChild(evidenceTd);

    const actionsTd = document.createElement("td");
    if (auth.role === "ADMIN") {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "ghost";
      deleteBtn.textContent = "Eliminar";
      deleteBtn.addEventListener("click", () => {
        deleteRecord(row.id).catch((error) => showStatus(error.message || "No se pudo eliminar registro.", "error"));
      });
      actionsTd.appendChild(deleteBtn);
    } else {
      actionsTd.textContent = "-";
    }
    tr.appendChild(actionsTd);

    rowsEl.appendChild(tr);
  });
}

async function deleteRecord(requestId) {
  if (auth.role !== "ADMIN") {
    showStatus("Solo ADMIN puede eliminar registros.", "error");
    return;
  }

  const confirmed = confirm(`Se eliminara el registro #${requestId}. Esta accion no se puede deshacer. Continuar?`);
  if (!confirmed) {
    return;
  }

  const response = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudo eliminar registro.", "error");
    return;
  }

  showStatus(`Registro #${requestId} eliminado.`, "ok");
  await loadRows(adminSearchInput.value.trim());
  await loadAudit();
}

async function downloadExcel() {
  if (!hasNormalAccess()) {
    showStatus("Inicia panel y completa cambio de clave si corresponde.", "error");
    return;
  }

  const response = await fetch("/api/export/excel", {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "No autorizado para descargar.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  link.href = url;
  link.download = match ? match[1] : "bloqueos.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadUsers() {
  if (!hasNormalAccess() || !can("can_manage_users")) {
    usersRowsEl.innerHTML = "";
    return;
  }

  const response = await fetch("/api/admin/users", {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    usersRowsEl.innerHTML = "";
    return;
  }

  const users = await response.json();
  usersRowsEl.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");

    tr.appendChild(createCell(String(user.id)));
    tr.appendChild(createCell(user.username));

    const roleTd = document.createElement("td");
    const roleSelect = document.createElement("select");
    roleCatalog.forEach((role) => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      option.selected = role === user.role;
      roleSelect.appendChild(option);
    });
    roleSelect.addEventListener("change", async () => {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ role: roleSelect.value }),
      });
      showStatus(`Rol actualizado para ${user.username}.`, "ok");
      await loadAudit();
      await loadPasswordHealth();
    });
    roleTd.appendChild(roleSelect);
    tr.appendChild(roleTd);

    const activeTd = document.createElement("td");
    const activeCheckbox = document.createElement("input");
    activeCheckbox.type = "checkbox";
    activeCheckbox.checked = Boolean(user.active);
    activeCheckbox.addEventListener("change", async () => {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ active: activeCheckbox.checked }),
      });
      showStatus(`Estado actualizado para ${user.username}.`, "ok");
      await loadAudit();
      await loadPasswordHealth();
    });
    activeTd.appendChild(activeCheckbox);
    tr.appendChild(activeTd);

    const resetTd = document.createElement("td");
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "ghost";
    resetBtn.textContent = "Reset hash";
    resetBtn.addEventListener("click", async () => {
      const newKey = prompt(`Nueva clave para ${user.username}`) || "";
      if (!newKey.trim()) {
        return;
      }
      const response = await fetch(`/api/admin/users/${user.id}/reset-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ key_plain: newKey.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        showStatus(body.error || "No se pudo resetear hash.", "error");
        return;
      }
      showStatus(`Hash reseteado para ${user.username}. Cambiara clave en primer login.`, "ok");
      await loadUsers();
      await loadAudit();
      await loadPasswordHealth();
    });
    resetTd.appendChild(resetBtn);
    tr.appendChild(resetTd);

    usersRowsEl.appendChild(tr);
  });
}

async function loadAudit() {
  if (!hasNormalAccess() || !can("can_view_audit")) {
    auditRowsEl.innerHTML = "";
    return;
  }

  const response = await fetch("/api/admin/audit?limit=120", {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    auditRowsEl.innerHTML = "";
    return;
  }

  const rows = await response.json();
  auditRowsEl.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Sin movimientos de auditoria.";
    tr.appendChild(td);
    auditRowsEl.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(row.created_at));
    tr.appendChild(createCell(row.actor_username));
    tr.appendChild(createCell(row.action));
    tr.appendChild(createCell(row.target_username));
    tr.appendChild(createCell(row.details));
    auditRowsEl.appendChild(tr);
  });
}

async function loadPolicy() {
  if (!hasNormalAccess() || !can("can_manage_policy")) {
    return;
  }

  const response = await fetch("/api/admin/settings", {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return;
  }
  const policy = await response.json();
  setPolicyInputs(policy);
}

async function savePolicy() {
  if (!hasNormalAccess() || !can("can_manage_policy")) {
    return;
  }

  const payload = {
    min_length: Number(policyMinLengthInput.value || 8),
    expires_days: Number(policyExpiresDaysInput.value || 90),
    require_uppercase: policyRequireUpperInput.checked,
    require_lowercase: policyRequireLowerInput.checked,
    require_digit: policyRequireDigitInput.checked,
    require_symbol: policyRequireSymbolInput.checked,
  };

  const response = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudo guardar politica.", "error");
    return;
  }

  setPolicyInputs(body.policy || payload);
  showStatus("Politica de claves actualizada.", "ok");
  await loadAudit();
  await loadPasswordHealth();
}

async function forceLegacyRotation() {
  if (!hasNormalAccess() || !can("can_manage_users")) {
    return;
  }

  const confirmed = confirm("Esto forzara cambio de clave al proximo login para cuentas con hash legacy. Continuar?");
  if (!confirmed) {
    return;
  }

  const response = await fetch("/api/admin/users/force-password-rotation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ legacy_only: true, include_inactive: false }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudo forzar recambio legacy.", "error");
    return;
  }

  showStatus(`Recambio aplicado. Usuarios marcados: ${body.updated_count || 0}.`, "ok");
  await loadUsers();
  await loadAudit();
  await loadPasswordHealth();
}

async function loadPasswordHealth() {
  if (!hasNormalAccess() || !can("can_view_password_health")) {
    return;
  }

  const threshold = Math.max(0, Number(expiryDaysThresholdInput.value || 7));
  const response = await fetch(`/api/admin/users/password-health?days=${encodeURIComponent(threshold)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    expiryRowsEl.innerHTML = "";
    expiryAlertEl.classList.add("hidden");
    return;
  }

  const data = await response.json();
  const expired = data.expired || [];
  const soon = data.expiring_soon || [];
  const rows = [...expired, ...soon];

  expiryCountExpiredInput.value = String(data.expired_count ?? expired.length);
  expiryCountSoonInput.value = String(data.expiring_soon_count ?? soon.length);

  if (data.expired_count > 0) {
    expiryAlertEl.textContent = `Alerta: ${data.expired_count} usuario(s) con clave vencida o pendiente de cambio.`;
    expiryAlertEl.className = "status error";
    expiryAlertEl.classList.remove("hidden");
  } else if (data.expiring_soon_count > 0) {
    expiryAlertEl.textContent = `Aviso: ${data.expiring_soon_count} usuario(s) vencen dentro de ${data.threshold_days} dias.`;
    expiryAlertEl.className = "status warning";
    expiryAlertEl.classList.remove("hidden");
  } else {
    expiryAlertEl.classList.add("hidden");
  }

  expiryRowsEl.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Sin usuarios vencidos ni por vencer en el umbral seleccionado.";
    tr.appendChild(td);
    expiryRowsEl.appendChild(tr);
    return;
  }

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(item.username));
    tr.appendChild(createCell(item.role));
    tr.appendChild(createCell(getExpiryState(item)));
    tr.appendChild(createCell(item.days_until_expiry == null ? "-" : String(item.days_until_expiry)));
    tr.appendChild(createCell(formatFriendlyDate(item.last_password_change_at)));
    expiryRowsEl.appendChild(tr);
  });
}

function permissionLabel(permission) {
  const labels = {
    can_access_admin_panel: "Acceder panel",
    can_view_records: "Ver registros",
    can_search_records: "Buscar registros",
    can_export_excel: "Exportar Excel",
    can_unlock_requests: "Autorizar desbloqueo",
    can_manage_users: "Gestionar usuarios",
    can_view_audit: "Ver auditoria",
    can_manage_policy: "Editar politica de claves",
    can_view_password_health: "Ver vencimientos",
    can_manage_permissions: "Editar permisos",
  };
  return labels[permission] || permission;
}

function renderPermissionsMatrix(payload) {
  permissionsHeadEl.innerHTML = "";
  permissionsRowsEl.innerHTML = "";

  const roles = payload.roles || [];
  const permissionKeys = payload.permission_keys || [];
  const matrix = payload.matrix || {};

  const headRow = document.createElement("tr");
  const emptyTh = document.createElement("th");
  emptyTh.textContent = "Permiso";
  headRow.appendChild(emptyTh);
  roles.forEach((role) => {
    const th = document.createElement("th");
    th.textContent = role;
    headRow.appendChild(th);
  });
  permissionsHeadEl.appendChild(headRow);

  permissionKeys.forEach((permission) => {
    const tr = document.createElement("tr");
    const labelTd = document.createElement("td");
    labelTd.textContent = permissionLabel(permission);
    tr.appendChild(labelTd);

    roles.forEach((role) => {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(matrix[role] && matrix[role][permission]);
      checkbox.dataset.role = role;
      checkbox.dataset.permission = permission;
      td.appendChild(checkbox);
      tr.appendChild(td);
    });

    permissionsRowsEl.appendChild(tr);
  });
}

function buildPermissionsMatrixFromUI() {
  if (!permissionsPayload) {
    return null;
  }

  const matrix = {};
  (permissionsPayload.roles || []).forEach((role) => {
    matrix[role] = {};
    (permissionsPayload.permission_keys || []).forEach((permission) => {
      matrix[role][permission] = false;
    });
  });

  const checkboxes = permissionsRowsEl.querySelectorAll("input[type='checkbox'][data-role][data-permission]");
  checkboxes.forEach((checkbox) => {
    const role = checkbox.dataset.role;
    const permission = checkbox.dataset.permission;
    if (matrix[role]) {
      matrix[role][permission] = checkbox.checked;
    }
  });

  return matrix;
}

async function loadPermissions() {
  if (!hasNormalAccess() || !can("can_manage_permissions")) {
    return;
  }

  const response = await fetch("/api/admin/permissions", {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return;
  }

  permissionsPayload = await response.json();
  roleCatalog = permissionsPayload.roles || roleCatalog;
  renderPermissionsMatrix(permissionsPayload);
}

async function savePermissions() {
  if (!hasNormalAccess() || !can("can_manage_permissions")) {
    return;
  }

  const matrix = buildPermissionsMatrixFromUI();
  if (!matrix) {
    showStatus("No hay matriz de permisos cargada.", "error");
    return;
  }

  const response = await fetch("/api/admin/permissions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ matrix }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudieron guardar permisos.", "error");
    return;
  }

  showStatus("Permisos por nivel actualizados.", "ok");
  await loadPermissions();
  await loadAudit();
}

async function createUser() {
  const username = document.getElementById("new_username").value.trim();
  const role = document.getElementById("new_role").value;
  const keyPlain = document.getElementById("new_key").value.trim();

  if (!username || !keyPlain) {
    showStatus("Usuario y clave inicial son obligatorios.", "error");
    return;
  }

  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ username, role, key_plain: keyPlain }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudo crear usuario.", "error");
    return;
  }

  document.getElementById("new_username").value = "";
  document.getElementById("new_key").value = "";
  showStatus("Usuario creado. Debe cambiar clave en primer login.", "ok");
  await loadUsers();
  await loadAudit();
  await loadPasswordHealth();
}

async function changeOwnKey() {
  if (!auth.unlocked) {
    return;
  }

  const newKey = forceNewKeyInput.value.trim();
  const newKey2 = forceNewKey2Input.value.trim();

  if (!newKey || !newKey2) {
    showStatus("Completa nueva clave y repeticion.", "error");
    return;
  }
  if (newKey !== newKey2) {
    showStatus("Las claves nuevas no coinciden.", "error");
    return;
  }

  const response = await fetch("/api/admin/change-own-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: auth.user,
      current_key: auth.key,
      new_key: newKey,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || "No se pudo actualizar clave.", "error");
    return;
  }

  auth.key = newKey;
  auth.mustChangePassword = false;
  saveAuth();
  forceNewKeyInput.value = "";
  forceNewKey2Input.value = "";
  refreshAdminUI();
  showStatus("Clave actualizada. Ya podes usar el panel.", "ok");
  await loadRows();
  await loadUsers();
  await loadAudit();
  await loadPasswordHealth();
}

async function unlockPanel(user, key, options = {}) {
  const { showSuccessMessage = true } = options;

  if (!user || !key) {
    showStatus("Ingresa usuario y clave.", "error");
    return false;
  }

  try {
    const result = await verifyAuth(user, key);
    const authenticatedUser = (result.username || user || "").trim();
    auth = {
      user: authenticatedUser,
      key,
      role: result.role,
      permissions: result.permissions || {},
      unlocked: true,
      mustChangePassword: Boolean(result.must_change_password),
    };
    roleCatalog = result.roles || roleCatalog;
    saveAuth();
    refreshAdminUI();

    if (auth.mustChangePassword) {
      const reason = result.password_issue === "password_expired"
        ? "Clave vencida: debes cambiarla para continuar."
        : "Primer login o clave reseteada: debes cambiar la clave para continuar.";
      showStatus(reason, "error");
      await loadRows();
      return true;
    }

    if (showSuccessMessage) {
      showStatus(`Sesion iniciada como ${auth.user || result.role}.`, "ok");
    }

    await loadRows();
    await loadUsers();
    await loadAudit();
    await loadPolicy();
    await loadPasswordHealth();
    await loadPermissions();
    return true;
  } catch (error) {
    clearAuth();
    refreshAdminUI();
    throw error;
  }
}

async function logoutPanel() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuth();
    refreshAdminUI();
    window.location.href = "/";
  }
}

function bootstrap() {
  const themeSelector = document.getElementById("themeSelector");
  const savedTheme = localStorage.getItem(THEME_KEY) || "arcor";
  themeSelector.value = savedTheme;
  setTheme(savedTheme);
  themeSelector.addEventListener("change", () => setTheme(themeSelector.value));

  adminUnlockBtn.addEventListener("click", async () => {
    const user = adminUserInput.value.trim();
    const key = adminKeyInput.value.trim();
    try {
      await unlockPanel(user, key, { showSuccessMessage: true });
    } catch (error) {
      showStatus(error.message || "No autorizado.", "error");
    }
  });

  downloadBtn.addEventListener("click", () => {
    downloadExcel().catch((error) => showStatus(error.message || "Error de descarga", "error"));
  });

  refreshBtn.addEventListener("click", () => {
    loadRows(adminSearchInput.value.trim()).catch((error) => showStatus(error.message, "error"));
    loadMeta().catch(() => null);
    loadAudit().catch(() => null);
    loadPasswordHealth().catch(() => null);
  });

  refreshExpiryBtn.addEventListener("click", () => {
    loadPasswordHealth().catch(() => showStatus("No se pudo actualizar vencimientos.", "error"));
  });

  expiryDaysThresholdInput.addEventListener("change", () => {
    loadPasswordHealth().catch(() => null);
  });

  adminSearchBtn.addEventListener("click", () => {
    loadRows(adminSearchInput.value.trim()).catch((error) => showStatus(error.message, "error"));
  });

  if (adminTabsEl) {
    adminTabsEl.addEventListener("click", (event) => {
      const target = event.target.closest(".tab-btn[data-tab]");
      if (!target || target.classList.contains("hidden")) {
        return;
      }
      switchTab(target.dataset.tab);
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      logoutPanel().catch(() => null);
    });
  }

  createUserBtn.addEventListener("click", () => {
    createUser().catch((error) => showStatus(error.message || "Error creando usuario", "error"));
  });

  savePolicyBtn.addEventListener("click", () => {
    savePolicy().catch((error) => showStatus(error.message || "Error guardando politica", "error"));
  });

  savePermissionsBtn.addEventListener("click", () => {
    savePermissions().catch((error) => showStatus(error.message || "Error guardando permisos", "error"));
  });

  forceLegacyRotationBtn.addEventListener("click", () => {
    forceLegacyRotation().catch((error) => showStatus(error.message || "Error en recambio legacy", "error"));
  });

  forceChangeBtn.addEventListener("click", () => {
    changeOwnKey().catch((error) => showStatus(error.message || "Error cambiando clave", "error"));
  });

  const savedUser = localStorage.getItem(ADMIN_USER_STORE) || "";
  const savedKey = localStorage.getItem(ADMIN_KEY_STORE) || "";
  adminUserInput.value = savedUser;
  adminKeyInput.value = savedKey;

  const params = new URLSearchParams(window.location.search);
  const wantsAutoLogin = params.get("autologin") === "1";

  if (savedKey) {
    unlockPanel(savedUser, savedKey, { showSuccessMessage: wantsAutoLogin })
      .then(() => {
        if (wantsAutoLogin && !auth.mustChangePassword) {
          showStatus("Sesion restaurada desde landing.", "ok");
        }
      })
      .catch(() => {
        clearAuth();
        refreshAdminUI();
        if (wantsAutoLogin) {
          showStatus("No se pudo restaurar la sesion desde landing. Reingresa credenciales.", "error");
        }
      });
  }

  loadMeta().catch(() => null);
  renderTabs();
}

bootstrap();

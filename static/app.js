const THEME_KEY = "bloqueos_theme";
const USER_KEY = "bloqueos_usuario_sistema";
const USER_EMAIL_KEY = "bloqueos_usuario_email";
const AUTH_USER_KEY = "bloqueos_auth_user";
const AUTH_KEY_KEY = "bloqueos_auth_key";
const ADMIN_USER_STORE = "bloqueos_admin_user";
const ADMIN_KEY_STORE = "bloqueos_admin_key";
const TZ = "America/Argentina/Buenos_Aires";

const form = document.getElementById("blockForm");
const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("sendBtn");
const metaInfo = document.getElementById("metaInfo");
const actionSelect = document.getElementById("action_type");
const unlockAuthBox = document.getElementById("unlockAuthBox");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const operationLogoutBtn = document.getElementById("operationLogoutBtn");

const fieldConfig = [
  "patente_primaria",
  "patente_secundaria",
  "bitren",
  "tipo_unidad",
  "dni",
  "nombre",
  "transporte",
];

const autoTimers = {};

function nowInGMTMinus3ForInput() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function detectEquipo() {
  const ua = navigator.userAgent || "N/A";
  const platform = navigator.platform || "N/A";
  return `${platform} | ${ua}`;
}

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function toTitleCase(text) {
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatServerDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${toTitleCase(map.weekday)} ${map.day} de ${toTitleCase(map.month)} ${map.year} ${map.hour} hs ${map.minute} min`;
}

function fillDatalist(field, values) {
  const list = document.getElementById(`${field}_list`);
  list.innerHTML = values.map((value) => `<option value="${value}"></option>`).join("");
}

function fillBaseSelect(values) {
  const select = document.getElementById("base_descripcion");
  const selected = select.value;
  const options = [
    '<option value="">Seleccionar base...</option>',
    ...values.map((value) => `<option value="${value}">${value}</option>`),
  ];
  select.innerHTML = options.join("");

  if (selected && values.includes(selected)) {
    select.value = selected;
  }
}

async function loadAutocomplete(field, query) {
  const response = await fetch(`/api/autocomplete?field=${encodeURIComponent(field)}&q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    return;
  }
  const values = await response.json();
  fillDatalist(field, values);
}

function wireAutocomplete(field) {
  const input = document.getElementById(field);
  input.addEventListener("input", () => {
    const query = input.value.trim();
    clearTimeout(autoTimers[field]);
    autoTimers[field] = setTimeout(() => {
      loadAutocomplete(field, query).catch(() => null);
    }, 150);
  });

  loadAutocomplete(field, "").catch(() => null);
}

function applyLookupData(data, forceFields = []) {
  const forced = new Set(forceFields || []);
  [
    "carga_nro",
    "tipo_unidad",
    "nombre",
    "transporte",
    "base_descripcion",
    "dni",
    "patente_primaria",
    "patente_secundaria",
    "bitren",
    "motivo",
    "usuario_sistema",
  ].forEach((field) => {
    const el = document.getElementById(field);
    if ((forced.has(field) || !el.value.trim()) && data[field]) {
      el.value = data[field];
    }
  });
}

function toDateTimeLocalInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function loadBases() {
  const response = await fetch("/api/reference/bases");
  if (!response.ok) {
    return;
  }
  const values = await response.json();
  fillBaseSelect(Array.isArray(values) ? values : []);
}

async function lookupTransportFromPatentes() {
  const patentePrimaria = document.getElementById("patente_primaria").value.trim();
  const patenteSecundaria = document.getElementById("patente_secundaria").value.trim();
  const bitren = document.getElementById("bitren").value.trim();

  if (!patentePrimaria && !patenteSecundaria && !bitren) {
    return;
  }

  const response = await fetch(
    `/api/reference/transport-lookup?patente_primaria=${encodeURIComponent(patentePrimaria)}&patente_secundaria=${encodeURIComponent(patenteSecundaria)}&bitren=${encodeURIComponent(bitren)}`
  );
  if (!response.ok) {
    return;
  }

  const body = await response.json();
  if (!body.has_match || !body.transporte) {
    return;
  }

  const transporteInput = document.getElementById("transporte");
  if (!transporteInput.value.trim()) {
    transporteInput.value = body.transporte;
  }
}

async function lookupByPatenteOrDni() {
  const patente = document.getElementById("patente_primaria").value.trim();
  const dni = document.getElementById("dni").value.trim();
  const nombre = document.getElementById("nombre").value.trim();

  if (!patente && !dni && !nombre) {
    return;
  }

  const response = await fetch(
    `/api/lookup?patente_primaria=${encodeURIComponent(patente)}&patente_secundaria=${encodeURIComponent(document.getElementById("patente_secundaria").value.trim())}&bitren=${encodeURIComponent(document.getElementById("bitren").value.trim())}&dni=${encodeURIComponent(dni)}&nombre=${encodeURIComponent(nombre)}`
  );
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  if (!data || Object.keys(data).length === 0) {
    return;
  }

  applyLookupData(data, ["tipo_unidad"]);
}

function renderSearchResults(rows) {
  searchResults.innerHTML = "";
  if (!rows.length) {
    searchResults.textContent = "Sin coincidencias.";
    return;
  }

  rows.forEach((row) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-item";
    btn.textContent = `#${row.id} | ${row.action_type} | ${row.patente_primaria} | ${row.nombre} | ${row.motivo}`;
    btn.addEventListener("click", () => {
      document.getElementById("related_request_id").value = row.id;
      applyLookupData(row, [
        "carga_nro",
        "tipo_unidad",
        "nombre",
        "transporte",
        "base_descripcion",
        "dni",
        "patente_primaria",
        "patente_secundaria",
        "bitren",
        "motivo",
        "usuario_sistema",
      ]);

      const eventInput = document.getElementById("event_datetime");
      const recoveredDateTime = toDateTimeLocalInput(row.event_datetime);
      if (recoveredDateTime) {
        eventInput.value = recoveredDateTime;
      }

      if (actionSelect.value === "DESBLOQUEAR") {
        showStatus(`Linea #${row.id} seleccionada para desbloqueo.`, "ok");
      } else {
        showStatus(`Linea #${row.id} recuperada en el formulario.`, "ok");
      }
    });
    searchResults.appendChild(btn);
  });
}

async function searchRecords() {
  const q = document.getElementById("search_query").value.trim();
  if (!q) {
    searchResults.innerHTML = "";
    return;
  }

  const response = await fetch(`/api/search/records?q=${encodeURIComponent(q)}&limit=20`);
  if (!response.ok) {
    searchResults.textContent = "No se pudo buscar.";
    return;
  }

  const rows = await response.json();
  renderSearchResults(rows);
}

function toggleUnlockAuth() {
  const isUnlock = actionSelect.value === "DESBLOQUEAR";
  unlockAuthBox.classList.toggle("hidden", !isUnlock);
  if (isUnlock) {
    showStatus("Desbloqueo requiere usuario y clave de JRT/Supervisor.");
  } else {
    showStatus("");
  }
}

async function loadMeta() {
  const response = await fetch("/api/meta");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  metaInfo.textContent = `Servidor GMT-3: ${formatServerDate(data.server_datetime_gmt_minus_3)}`;
}

async function submitForm(event) {
  event.preventDefault();
  showStatus("");
  sendBtn.disabled = true;

  const payload = {
    event_datetime: document.getElementById("event_datetime").value,
    action_type: document.getElementById("action_type").value,
    related_request_id: document.getElementById("related_request_id").value,
    auth_user: document.getElementById("auth_user").value,
    auth_key: document.getElementById("auth_key").value,
    carga_nro: document.getElementById("carga_nro").value,
    patente_primaria: document.getElementById("patente_primaria").value,
    patente_secundaria: document.getElementById("patente_secundaria").value,
    bitren: document.getElementById("bitren").value,
    tipo_unidad: document.getElementById("tipo_unidad").value,
    dni: document.getElementById("dni").value,
    nombre: document.getElementById("nombre").value,
    transporte: document.getElementById("transporte").value,
    base_descripcion: document.getElementById("base_descripcion").value,
    motivo: document.getElementById("motivo").value,
    equipo: document.getElementById("equipo").value,
    usuario_sistema: document.getElementById("usuario_sistema").value,
    email_usuario: document.getElementById("email_usuario").value,
  };
  const evidenceInput = document.getElementById("evidence_file");
  const evidenceFile = evidenceInput.files && evidenceInput.files.length ? evidenceInput.files[0] : null;

  try {
    let response;
    if (evidenceFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value || ""));
      formData.append("evidence_file", evidenceFile);
      response = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const body = await response.json();
    if (!response.ok) {
      const missing = (body.missing || []).join(", ");
      throw new Error(body.error + (missing ? `: ${missing}` : ""));
    }

    localStorage.setItem(AUTH_USER_KEY, payload.auth_user || "");
    localStorage.setItem(AUTH_KEY_KEY, payload.auth_key || "");

    showStatus(`Solicitud ${payload.action_type.toLowerCase()} registrada correctamente.`, "ok");
    document.getElementById("motivo").value = "";
    document.getElementById("carga_nro").value = "";
    evidenceInput.value = "";
    await loadMeta();
  } catch (error) {
    showStatus(error.message || "No se pudo registrar la solicitud.", "error");
  } finally {
    sendBtn.disabled = false;
  }
}

async function logoutSession() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem(ADMIN_USER_STORE);
    localStorage.removeItem(ADMIN_KEY_STORE);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_KEY_KEY);
    window.location.href = "/";
  }
}

function bootstrap() {
  document.getElementById("event_datetime").value = nowInGMTMinus3ForInput();
  document.getElementById("equipo").value = detectEquipo();

  const savedUser = localStorage.getItem(USER_KEY);
  if (savedUser) {
    document.getElementById("usuario_sistema").value = savedUser;
  }

  const savedUserEmail = localStorage.getItem(USER_EMAIL_KEY);
  if (savedUserEmail) {
    document.getElementById("email_usuario").value = savedUserEmail;
  }

  const savedAuthUser = localStorage.getItem(AUTH_USER_KEY) || "";
  const savedAuthKey = localStorage.getItem(AUTH_KEY_KEY) || "";
  document.getElementById("auth_user").value = savedAuthUser;
  document.getElementById("auth_key").value = savedAuthKey;

  const userInput = document.getElementById("usuario_sistema");
  userInput.addEventListener("change", () => {
    localStorage.setItem(USER_KEY, userInput.value.trim());
  });

  const userEmailInput = document.getElementById("email_usuario");
  userEmailInput.addEventListener("change", () => {
    localStorage.setItem(USER_EMAIL_KEY, userEmailInput.value.trim());
  });

  const themeSelector = document.getElementById("themeSelector");
  const savedTheme = localStorage.getItem(THEME_KEY) || "arcor";
  themeSelector.value = savedTheme;
  setTheme(savedTheme);
  themeSelector.addEventListener("change", () => setTheme(themeSelector.value));

  fieldConfig.forEach((field) => wireAutocomplete(field));

  document.getElementById("patente_primaria").addEventListener("blur", () => {
    lookupByPatenteOrDni().catch(() => null);
    lookupTransportFromPatentes().catch(() => null);
  });
  document.getElementById("patente_secundaria").addEventListener("blur", () => {
    lookupByPatenteOrDni().catch(() => null);
    lookupTransportFromPatentes().catch(() => null);
  });
  document.getElementById("bitren").addEventListener("blur", () => {
    lookupByPatenteOrDni().catch(() => null);
    lookupTransportFromPatentes().catch(() => null);
  });
  document.getElementById("dni").addEventListener("blur", () => {
    lookupByPatenteOrDni().catch(() => null);
  });
  document.getElementById("nombre").addEventListener("blur", () => {
    lookupByPatenteOrDni().catch(() => null);
  });

  actionSelect.addEventListener("change", toggleUnlockAuth);
  toggleUnlockAuth();

  searchBtn.addEventListener("click", () => {
    searchRecords().catch(() => null);
  });

  if (operationLogoutBtn) {
    operationLogoutBtn.addEventListener("click", () => {
      logoutSession().catch(() => null);
    });
  }

  form.addEventListener("submit", submitForm);
  loadMeta().catch(() => null);
  loadBases().catch(() => null);
}

bootstrap();

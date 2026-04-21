const THEME_KEY = "bloqueos_theme";
const ADMIN_USER_STORE = "bloqueos_admin_user";
const ADMIN_KEY_STORE = "bloqueos_admin_key";

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function showStatus(message, type = "") {
  const status = document.getElementById("landingStatus");
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

async function verifyAdmin(user, key) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_user: user, admin_key: key }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Credenciales invalidas");
  }

  return body;
}

function bootstrap() {
  const themeSelector = document.getElementById("themeSelector");
  const savedTheme = localStorage.getItem(THEME_KEY) || "arcor";
  themeSelector.value = savedTheme;
  setTheme(savedTheme);
  themeSelector.addEventListener("change", () => setTheme(themeSelector.value));

  const adminUserInput = document.getElementById("landing_admin_user");
  const adminKeyInput = document.getElementById("landing_admin_key");
  adminUserInput.value = localStorage.getItem(ADMIN_USER_STORE) || "";
  adminKeyInput.value = localStorage.getItem(ADMIN_KEY_STORE) || "";

  document.getElementById("landingAdminBtn").addEventListener("click", async () => {
    const user = adminUserInput.value.trim();
    const key = adminKeyInput.value.trim();

    if (!user || !key) {
      showStatus("Ingresa usuario y clave para continuar.", "error");
      return;
    }

    try {
      await verifyAdmin(user, key);
      localStorage.setItem(ADMIN_USER_STORE, user);
      localStorage.setItem(ADMIN_KEY_STORE, key);
      showStatus("Credenciales validadas. Redirigiendo...", "ok");
      window.location.href = "/operacion";
    } catch (error) {
      showStatus(error.message || "No se pudo iniciar sesion.", "error");
    }
  });
}

bootstrap();

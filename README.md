# Sistema de novedades, incidencias y solicitud de bloqueo / desbloqueo - Web responsive

App web para registrar bloqueos de unidades y/o choferes.

## Funcionalidades
- Formulario responsive con titulo: **Solicitud de bloqueo**.
- Registro de fecha y hora del evento (editable) y fecha/hora de sistema en GMT-3 al guardar.
- Campos obligatorios y opcionales segun requerimiento.
- Permite adjuntar prueba del evento (foto/archivo opcional) en la solicitud.
- Nuevos campos: `Patente secundaria` y `Bitren`.
- Integracion con `data.xlsx` (hojas `Plantas` y `Transportes`):
  - Desplegable de `Base` desde columna `Descripción de Base`.
  - Recupero automatico de `Transporte` por patente (`Inicial de equipo` -> `Transportista`) usando primaria, secundaria o bitren.
- Campo `Accion` con opciones: `Bloquear` / `Desbloquear`.
- Desbloqueo autorizado solo por roles `JRT` o `SUPERVISOR`.
- Buscador de lineas para localizar bloqueos y asociar el desbloqueo.
- Autocompletado para patente, tipo unidad, DNI, nombre y transporte basado en registros existentes.
- Lookup automatico por patente o DNI para completar datos relacionados.
- Captura de metadatos al enviar:
  - IP origen (server-side).
  - Equipo (navegador/plataforma cliente).
  - Usuario de sistema local (editable y recordado en navegador).
- Exportacion de registros a Excel `.xlsx`.
  - El reporte incluye `SolicitadoPor` y `AutorizadoPor`.
- Temas seleccionables: `arcor`, `claro`, `oscuro`.
- Seguridad admin por hash:
  - Sistema extendido con tabla de usuarios (`ADMIN`, `JRT`, `SUPERVISOR`, `LIDER`, `GERENTE`, `AUDITOR`) y hash por usuario.
  - Hash de claves con `Argon2id` + salt (interno del algoritmo) + `AUTH_PEPPER`.
  - Verificacion estricta solo para hashes `Argon2id`.
  - El endpoint de Excel y panel admin requieren credenciales validas.
  - Usuarios nuevos o con hash reseteado deben cambiar clave en su primer login.
  - Auditoria visible de acciones de usuarios: alta, cambio de rol/activo, reset hash, login y cambio de clave.
  - Politica de claves configurable desde panel Admin: longitud minima, complejidad y vencimiento por dias.
  - Si una clave vence, el usuario debe cambiarla para continuar.
- Pantalla admin separada en `/admin` para:
  - Ingreso de usuario + clave.
  - Descarga de Excel.
  - Visualizacion de ultimos registros con accion (bloqueo/desbloqueo).
  - Buscador en registros.
  - Gestion de usuarios: crear, modificar rol/activo y resetear hash.
  - Configuracion de permisos por nivel (que ve y que puede hacer cada rol).
  - Tab `Notificaciones` para configurar SMTP, destinatarios `TO/CC` y asunto por tipo de accion.
  - Envio automatico de mail al registrar `BLOQUEAR`, `DESBLOQUEAR`, `NOVEDAD` o `INCIDENCIA`.

## Stack tecnico
- Backend: Flask + SQLAlchemy
- DB por defecto: SQLite
- Export Excel: openpyxl
- Frontend: HTML + CSS + JS vanilla

## Requisitos
- Python 3.10+

## Instalacion
```powershell
python -m pip install -r requirements.txt
```
## Instalacion
```powershell
create_db.bat
```

## Instalacion Integral (todo en uno)
Para instalar en una sola ejecucion (entorno, dependencias, pepper, migracion legacy admin hash, admin key opcional y DB):

```powershell
install_full_setup.bat
```

El script informa cada paso y finaliza con `pause`.

## Ejecucion
```powershell
python app.py
```

Si usas `run_app.bat`, el script ahora:
- Crea/activa `venv` si hace falta.
- Verifica si `pip` esta desactualizado y lo actualiza automaticamente.
- Instala requerimientos y lanza la app.

Abrir: `http://127.0.0.1:5000`

Al abrir la raiz (`/`) se muestra landing de ingreso:
- Acceso a operacion (`/operacion`).
- Acceso a login admin (`/admin`) con ayuda visual para iniciar sesion.

## HTTPS
- La app soporta HTTPS si el servidor define certificado y clave.
- Variables de entorno:
  - `SSL_CERT_FILE` ruta al certificado.
  - `SSL_KEY_FILE` ruta a la clave privada.
- Si no estan definidas, corre en HTTP normal.

Ejemplo PowerShell:
```powershell
$env:SSL_CERT_FILE="C:\certs\server.crt"
$env:SSL_KEY_FILE="C:\certs\server.key"
python app.py
```

Nota: en produccion se recomienda terminar TLS en IIS/Nginx/Apache o balanceador.

## Alta/Baja de unidades y choferes (Excel de referencia)
- El alta/baja se gestiona actualizando `data.xlsx` (hojas `Plantas` y `Transportes`).
- No se cargan tablas SQL de unidades/choferes: la app consulta este Excel como fuente de referencia.

### Update operativo por .bat
```powershell
update_reference_data.bat "C:\ruta\nuevo_data.xlsx"
```

Que hace:
- Valida hojas y columnas requeridas.
- Hace backup del `data.xlsx` anterior en `instance/reference_backups/`.
- Reemplaza `data.xlsx` por el nuevo archivo.
- Pide reiniciar la app para tomar cambios inmediatamente.

## Configuracion de admin key (hash)

### Crear o cambiar clave admin
```powershell
python set_admin_key.py
```

Alternativa en Windows:
```powershell
set_admin_key.bat
```

Esto genera el archivo `.env/admin_key.hash`.

Formato actual del hash: `argon2id`.

### Comportamiento
- Sin `.env/admin_key.hash`: funciones admin ocultas (ejemplo: boton de Excel).
- Con `.env/admin_key.hash`: se muestra panel Admin key.
- Al validar la clave en la web, se habilita boton de descarga Excel.

## Configuracion de base de datos
La app usa `DATABASE_URL` si esta definida, si no usa SQLite local.

### Crear DB y tablas (Windows)
Crea la db sqlite en carpeta `instance/` para  inicializar el esquema desde cero:

```powershell
create_db.bat
```

Esto crea/actualiza tablas necesarias en la DB configurada (por defecto `instance/bloqueos.db`).

### Default (SQLite)
No requiere cambios.

### MySQL / MariaDB
1. Instalar driver:
```powershell
python -m pip install pymysql
```
2. Definir variable:
```powershell
$env:DATABASE_URL="mysql+pymysql://usuario:password@host:3306/base"
python app.py
```

### Oracle
1. Instalar driver:
```powershell
python -m pip install oracledb
```
2. Definir variable (ejemplo):
```powershell
$env:DATABASE_URL="oracle+oracledb://usuario:password@host:1521/?service_name=ORCLPDB1"
python app.py
```

## Endpoints utiles
- `GET /` landing de ingreso
- `GET /operacion` interfaz web de carga
- `GET /admin` interfaz admin
- `POST /api/requests` crear solicitud
- `GET /api/evidence/{id}` descargar prueba adjunta de una solicitud (permiso de ver registros)
- `GET /api/requests?limit=20` listar solicitudes
- `GET /api/search/records?q=...` buscar lineas para bloqueo/desbloqueo
- `GET /api/autocomplete?field=nombre&q=...` sugerencias
- `GET /api/lookup?patente_primaria=...&dni=...` completar datos
- `GET /api/reference/bases` listar bases desde Excel
- `GET /api/reference/transport-lookup?patente_primaria=...&patente_secundaria=...&bitren=...` buscar transporte por patente en Excel
- `GET /api/export/excel` descargar Excel
- `GET /api/meta` estado del servidor y DB
- `GET /api/admin/status` estado admin
- `POST /api/admin/verify` validar admin key
- `GET /api/admin/requests?limit=50` listar registros (requiere admin key)
- `GET /api/admin/users` listar usuarios (ADMIN)
- `POST /api/admin/users` crear usuario (ADMIN)
- `PATCH /api/admin/users/{id}` modificar rol/activo (ADMIN)
- `POST /api/admin/users/{id}/reset-key` resetear hash (ADMIN)
- `POST /api/admin/users/force-password-rotation` forzar cambio de clave masivo (ADMIN, util para cuentas legacy)
- `POST /api/admin/change-own-key` cambio de clave propia (primer login)
- `GET /api/admin/audit` auditoria de usuarios (ADMIN)
- `GET /api/admin/settings` leer politica de claves (ADMIN)
- `PATCH /api/admin/settings` actualizar politica de claves (ADMIN)
- `GET /api/admin/users/password-health?days=7` usuarios vencidos o por vencer (ADMIN)
- `GET /api/admin/permissions` leer matriz de permisos por nivel
- `PATCH /api/admin/permissions` actualizar matriz de permisos por nivel
- `GET /api/admin/notifications` leer configuracion de notificaciones por mail
- `PATCH /api/admin/notifications` guardar configuracion de notificaciones por mail
- `POST /api/admin/notifications/test` enviar mail de prueba






@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

echo ============================================================
echo  Instalacion integral - Registro de Novedades
echo ============================================================

echo [1/9] Detectando Python del sistema...
set "SYSTEM_PY="
where py >nul 2>nul
if %ERRORLEVEL%==0 set "SYSTEM_PY=py -3"
if not defined SYSTEM_PY (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 set "SYSTEM_PY=python"
)

if not defined SYSTEM_PY (
  echo ERROR: No se encontro Python en PATH.
  echo Instala Python 3.10+ y vuelve a ejecutar este script.
  goto :END_ERROR
)

echo [2/9] Preparando entorno virtual...
set "VENV_PYTHON="
if exist ".venv\Scripts\python.exe" set "VENV_PYTHON=.venv\Scripts\python.exe"
if not defined VENV_PYTHON if exist "venv\Scripts\python.exe" set "VENV_PYTHON=venv\Scripts\python.exe"

if not defined VENV_PYTHON (
  echo No existe entorno virtual. Creando .venv...
  %SYSTEM_PY% -m venv .venv
  if errorlevel 1 (
    echo ERROR: No se pudo crear .venv.
    goto :END_ERROR
  )
  set "VENV_PYTHON=.venv\Scripts\python.exe"
)

echo [3/9] Actualizando pip del entorno...
"%VENV_PYTHON%" -m pip install --upgrade pip --disable-pip-version-check --no-input
if errorlevel 1 (
  echo ADVERTENCIA: No se pudo actualizar pip. Se continua.
)

echo [4/9] Instalando dependencias de requirements.txt...
if exist "requirements.txt" (
  "%VENV_PYTHON%" -m pip install -r requirements.txt --disable-pip-version-check
  if errorlevel 1 (
    echo ERROR: Fallo la instalacion de requerimientos.
    goto :END_ERROR
  )
) else (
  echo ADVERTENCIA: No existe requirements.txt. Se omite este paso.
)

echo [5/9] Asegurando directorio .env...
if not exist ".env" mkdir ".env"

echo [6/9] Configurando AUTH_PEPPER...
if not exist ".env\auth_pepper.env" (
  echo No existe .env\auth_pepper.env. Generando pepper seguro...
  "%VENV_PYTHON%" -c "import secrets, pathlib; p=pathlib.Path('.env/auth_pepper.env'); p.parent.mkdir(parents=True, exist_ok=True); p.write_text('AUTH_PEPPER='+secrets.token_hex(64)+'\\n', encoding='utf-8')"
  if errorlevel 1 (
    echo ERROR: No se pudo generar AUTH_PEPPER.
    goto :END_ERROR
  )
  echo OK: AUTH_PEPPER generado en .env\auth_pepper.env
) else (
  echo OK: AUTH_PEPPER ya existe.
)

echo [7/9] Migracion de admin_key hash legacy (si existe)...
if exist "admin_key.hash" (
  if exist ".env\admin_key.hash" (
    echo INFO: Existe admin_key.hash en raiz y tambien .env\admin_key.hash. Se conserva .env\admin_key.hash.
  ) else (
    move /Y "admin_key.hash" ".env\admin_key.hash" >nul
    if errorlevel 1 (
      echo ERROR: No se pudo mover admin_key.hash a .env\admin_key.hash
      goto :END_ERROR
    )
    echo OK: admin_key.hash migrado a .env\admin_key.hash
  )
) else (
  echo INFO: No se encontro admin_key.hash legacy en raiz.
)

echo [8/9] Configuracion de clave admin Argon2id...
if exist ".env\admin_key.hash" (
  echo OK: .env\admin_key.hash ya existe.
) else (
  choice /C SN /M "No hay .env\admin_key.hash. Deseas crearla ahora? (S/N)"
  if errorlevel 2 (
    echo INFO: Se omitio la creacion de admin key.
  ) else (
    "%VENV_PYTHON%" set_admin_key.py
    if errorlevel 1 (
      echo ERROR: No se pudo generar admin key.
      goto :END_ERROR
    )
  )
)

echo [9/9] Inicializando base de datos y esquema...
"%VENV_PYTHON%" init_db.py
if errorlevel 1 (
  echo ERROR: Fallo la inicializacion de base de datos.
  goto :END_ERROR
)

echo.
echo ============================================================
echo  Instalacion finalizada correctamente.
echo  Saludos del equipo de desarrollo GitHub ChatGPT Codex y Yim
echo  Recuerden que con IA el mundo es mejor.
echo  Just coding 4 fun !!!
echo ============================================================
pause
exit /b 0

:END_ERROR
echo.
echo ============================================================
echo  La instalacion no pudo completarse.
echo  Revisa el error indicado arriba y vuelve a intentar.
echo ============================================================
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Buscando Python en entorno virtual...
set "PYTHON_EXE="
if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=.venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "venv\Scripts\python.exe" set "PYTHON_EXE=venv\Scripts\python.exe"

if not defined PYTHON_EXE (
  echo ERROR: No se encontro .venv ni venv.
  echo Crea el entorno primero con run_app.bat o instala dependencias manualmente.
  exit /b 1
)

echo [2/3] Inicializando base de datos y esquema...
"%PYTHON_EXE%" init_db.py
if errorlevel 1 (
  echo ERROR: No se pudo inicializar la base de datos.
  exit /b 1
)

echo [3/3] Listo.
echo Ya puedes ejecutar la app con run_app.bat
exit /b 0

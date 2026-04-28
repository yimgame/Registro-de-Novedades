@echo off
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

echo [1/5] Detectando Python...
set "PYTHON_EXE="
where py >nul 2>nul
if %ERRORLEVEL%==0 set "PYTHON_EXE=py -3"

if not defined PYTHON_EXE (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 set "PYTHON_EXE=python"
)

if not defined PYTHON_EXE (
  echo ERROR: No se encontro Python en PATH.
  echo Instala Python 3 y vuelve a intentar.
  exit /b 1
)

echo [2/5] Preparando entorno virtual...
if not exist "venv\Scripts\python.exe" (
  echo Creando venv...
  %PYTHON_EXE% -m venv venv
  if errorlevel 1 (
    echo ERROR: No se pudo crear el entorno virtual.
    exit /b 1
  )
)

echo [3/5] Verificando actualizacion de pip...
set "PIP_OUTDATED_FILE=%TEMP%\pip_outdated_%RANDOM%.json"
set "VENV_PYTHON=venv\Scripts\python.exe"
"%VENV_PYTHON%" -m pip list --outdated --format=json > "%PIP_OUTDATED_FILE%" 2>nul

if exist "%PIP_OUTDATED_FILE%" (
  findstr /i /c:"\"name\": \"pip\"" "%PIP_OUTDATED_FILE%" >nul
  if !ERRORLEVEL! EQU 0 (
    echo pip desactualizado. Actualizando...
    "%VENV_PYTHON%" -m pip install --upgrade pip --disable-pip-version-check --no-input
    if errorlevel 1 (
      echo ADVERTENCIA: No se pudo actualizar pip. Se continua igual.
    )
  ) else (
    echo pip ya esta actualizado.
  )
  del /q "%PIP_OUTDATED_FILE%" >nul 2>nul
) else (
  echo ADVERTENCIA: No se pudo verificar si pip esta desactualizado.
)

call "venv\Scripts\activate.bat"
if errorlevel 1 (
  echo ERROR: No se pudo activar el entorno virtual.
  exit /b 1
)

echo [4/5] Verificando e instalando requerimientos...
if exist "requirements.txt" (
  python -m pip install -r requirements.txt --disable-pip-version-check
  if errorlevel 1 (
    echo ERROR: Fallo la instalacion de requerimientos.
    exit /b 1
  )
) else (
  echo ADVERTENCIA: No existe requirements.txt. Se omite instalacion.
)

echo [5/5] Lanzando app con Waitress (WSGI produccion)...
set "USE_WAITRESS=1"
python app.py
set "APP_EXIT_CODE=%ERRORLEVEL%"

call deactivate >nul 2>nul
exit /b %APP_EXIT_CODE%

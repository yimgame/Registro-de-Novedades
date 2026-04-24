@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python no esta disponible en PATH.
  exit /b 1
)

echo [2/4] Instalando/actualizando herramientas de build...
python -m pip install --upgrade pip >nul
python -m pip install --upgrade pyinstaller >nul

echo [3/4] Limpiando build anterior...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist RegistroNovedades.spec del /q RegistroNovedades.spec

echo [4/4] Generando EXE...
pyinstaller --noconfirm --clean --onefile --windowed --name RegistroNovedades ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-data "data.xlsx;." ^
  app.py
if errorlevel 1 (
  echo ERROR: Fallo la compilacion.
  exit /b 1
)

copy /y "dist\RegistroNovedades.exe" "dist\Registro de novedades.exe" >nul
if errorlevel 1 (
  echo ERROR: No se pudo generar el alias Registro de novedades.exe
  exit /b 1
)

echo.
echo Listo. Ejecutables generados en:
echo - dist\RegistroNovedades.exe
echo - dist\Registro de novedades.exe
echo Copia junto al EXE tus archivos de configuracion (.env) si corresponde.
echo.
pause

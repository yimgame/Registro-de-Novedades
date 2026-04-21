@echo off
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

if "%~1"=="" (
  echo Uso: update_reference_data.bat "C:\ruta\archivo.xlsx"
  exit /b 1
)

set "PYTHON_EXE="
where py >nul 2>nul
if %ERRORLEVEL%==0 set "PYTHON_EXE=py -3"

if not defined PYTHON_EXE (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 set "PYTHON_EXE=python"
)

if not defined PYTHON_EXE (
  echo ERROR: No se encontro Python en PATH.
  exit /b 1
)

%PYTHON_EXE% update_reference_data.py "%~1"
exit /b %ERRORLEVEL%

@echo off
chcp 65001 >nul
setlocal

rem ============================================================
rem  Gera contrato + ordem de servico a partir de um .txt.
rem  Arraste o .txt (da pasta _DADOS DO SISTEMA) em cima deste arquivo.
rem  A saida vai para  CONTRATOS\CONTRATOS GERADOS  no Google Drive.
rem ============================================================

set "ARQ=%~f1"
if "%~1"=="" (
  echo Arraste o arquivo .txt do contrato em cima deste atalho.
  goto :fim
)
cd /d "%~dp0"
node src\index.js "%ARQ%"

:fim
echo.
pause

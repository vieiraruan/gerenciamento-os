@echo off
chcp 65001 >nul
title Lotus - Tayna Alves Assessoria

rem ============================================================
rem  Abre o Lotus (sistema da Tayna Alves Assessoria) no navegador.
rem  O atalho da Area de Trabalho usa o abrir-aplicativo.vbs, que roda
rem  este arquivo escondido (--oculto). Abrir este .cmd direto mostra a
rem  janela com as mensagens - util para investigar problemas.
rem ============================================================

cd /d "%~dp0"
set "OCULTO="
if /i "%~1"=="--oculto" set "OCULTO=1"
where node >nul 2>nul || (
  echo Node.js nao encontrado. Rode o instalar-sistema.cmd na pasta do projeto.
  if not defined OCULTO pause
  exit /b 9009
)
echo Verificando atualizacoes...
node scripts\atualizar.js
if not exist node_modules\docxtemplater call npm.cmd ci --no-audit --no-fund --loglevel=error
node src\servidor.js %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" if not defined OCULTO pause
exit /b %RC%

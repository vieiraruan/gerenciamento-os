@echo off
chcp 65001 >nul
title Aplicativos - Tayna Alves Assessoria

rem ============================================================
rem  Abre os aplicativos da Tayna Alves Assessoria no navegador.
rem  Antes de abrir, busca atualizacoes no GitHub (se houver internet).
rem  Para encerrar o aplicativo, feche esta janela.
rem ============================================================

cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Rode o instalar-sistema.cmd na pasta do projeto. & pause & exit /b 1)
echo Verificando atualizacoes...
node scripts\atualizar.js
if not exist node_modules\docxtemplater call npm.cmd ci --no-audit --no-fund --loglevel=error
node src\servidor.js %*
if errorlevel 1 pause

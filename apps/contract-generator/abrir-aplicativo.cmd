@echo off
chcp 65001 >nul
title Gerador de Contratos - Tayna Alves Assessoria

rem ============================================================
rem  Abre o aplicativo de contratos no navegador.
rem  Com o Google Drive para computador instalado, os contratos
rem  vao para  CONTRATOS\CONTRATOS GERADOS  no Drive.
rem  Para encerrar o aplicativo, feche esta janela.
rem ============================================================

cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Rode primeiro o instalar.cmd & pause & exit /b 1)
if not exist node_modules call instalar.cmd
node src\servidor.js %*
if errorlevel 1 pause

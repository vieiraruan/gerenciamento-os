@echo off
chcp 65001 >nul
rem ============================================================
rem  Instala as dependencias do gerador (rodar uma vez por maquina).
rem ============================================================
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Node.js nao encontrado. Instale com:  winget install OpenJS.NodeJS.LTS
  echo ou baixe em https://nodejs.org  e rode este arquivo de novo.
  pause & exit /b 1
)
echo Instalando dependencias...
call npm.cmd install --no-audit --no-fund
echo.
node -e "const p=require('./src/pastas').resolverPastas(); console.log(p.modo==='drive' ? 'Google Drive encontrado: '+p.saida : 'ATENCAO: pasta CONTRATOS do Google Drive nao encontrada nesta maquina. Os contratos serao salvos em '+p.saida)"
echo.
echo Pronto. Para usar, abra o  abrir-aplicativo.cmd
pause

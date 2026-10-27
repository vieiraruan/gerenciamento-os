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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut(\"$d\Tayna Alves Assessoria.lnk\"); $s.TargetPath='%~dp0abrir-aplicativo.cmd'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0templates\marca\icone.ico,0'; $s.Description='Aplicativos Tayna Alves Assessoria'; $s.Save()"
echo Atalho "Tayna Alves Assessoria" criado na Area de Trabalho.
echo Pronto. Para usar, abra o atalho na Area de Trabalho (ou o abrir-aplicativo.cmd).
pause

<# : -------------------------------------------------------------------------
@echo off
rem ===========================================================================
rem  Instalador / atualizador do sistema Tayna Alves Assessoria
rem
rem  Funciona sozinho: copie ESTE arquivo para qualquer computador Windows e
rem  de dois cliques. Ele instala o que faltar (Git, Node.js, LibreOffice,
rem  Google Drive), baixa o projeto do GitHub, instala as dependencias e cria
rem  o atalho na Area de Trabalho. Rodar de novo = atualizar tudo.
rem
rem  Opcoes:  instalar-sistema.cmd [-Destino C:\pasta] [-SemPdf] [-SemDrive]
rem ===========================================================================
setlocal
set "INSTALADOR=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create([IO.File]::ReadAllText($env:INSTALADOR))) %*"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
#>
param(
  [string]$Destino = '',
  [switch]$SemPdf,
  [switch]$SemDrive
)

$ErrorActionPreference = 'Continue'
$REPO      = 'https://github.com/vieiraruan/gerenciamento-os.git'
$NODE_MIN  = [version]'22.20.0'
$APP_REL   = 'apps\contract-generator'
$ATALHO    = 'Tayna Alves Assessoria'
$LOG       = Join-Path $env:TEMP ('instalar-tayna-alves-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$falhas    = New-Object System.Collections.ArrayList
try { Start-Transcript -Path $LOG -Force | Out-Null } catch {}

function Titulo($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "   [ok] $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "   [!]  $t" -ForegroundColor Yellow }
function Erro($t)   { Write-Host "   [x]  $t" -ForegroundColor Red; [void]$falhas.Add($t) }
function Tem($c)    { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function AtualizarPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Perguntar($pergunta, $padraoSim = $true) {
  $op = if ($padraoSim) { '[S/n]' } else { '[s/N]' }
  $r = Read-Host "   $pergunta $op"
  if ([string]::IsNullOrWhiteSpace($r)) { return $padraoSim }
  return $r.Trim().ToLower().StartsWith('s')
}
function Winget($id, $nome, [switch]$Atualizar) {
  if (-not (Tem winget)) {
    Erro "winget nao encontrado. Instale o 'Instalador de Aplicativo' pela Microsoft Store e rode de novo."
    return
  }
  $acao = if ($Atualizar) { 'upgrade' } else { 'install' }
  Write-Host "   Instalando $nome (winget $acao $id)... pode pedir permissao de administrador."
  & winget $acao --id $id -e --silent --accept-source-agreements --accept-package-agreements | Out-Host
  AtualizarPath
}
function VersaoNode {
  if (-not (Tem node)) { return $null }
  $v = (& node --version) -replace '^v', ''
  try { return [version]$v } catch { return $null }
}
function AcharSoffice {
  if (Tem soffice) { return (Get-Command soffice).Source }
  foreach ($p in @("$env:ProgramFiles\LibreOffice\program\soffice.exe",
                   "${env:ProgramFiles(x86)}\LibreOffice\program\soffice.exe")) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  return $null
}
function AcharDrive {
  foreach ($letra in 'GHIJKLMNOPQRSTUVWXYZDEF'.ToCharArray()) {
    foreach ($n in 'Meu Drive', 'My Drive') {
      $p = "$($letra):\$n"
      if (Test-Path -LiteralPath $p) { return $p }
    }
  }
  foreach ($n in 'Meu Drive', 'My Drive') {
    $p = Join-Path $env:USERPROFILE $n
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

Write-Host ''
Write-Host '  Tayna Alves Assessoria - instalacao / atualizacao do sistema' -ForegroundColor Magenta
Write-Host "  Registro desta execucao: $LOG"

# ---------------------------------------------------------------------------
Titulo '1/7  Gerenciador de pacotes (winget)'
if (Tem winget) { Ok 'winget disponivel' }
else { Aviso "winget nao encontrado: so sera possivel continuar se Git e Node.js ja estiverem instalados." }

# ---------------------------------------------------------------------------
Titulo '2/7  Git'
if (-not (Tem git)) { Winget 'Git.Git' 'Git' }
if (Tem git) { Ok ((& git --version) + ' (com Git Credential Manager para login no GitHub)') }
else { Erro 'Git nao foi instalado.' }

# ---------------------------------------------------------------------------
Titulo '3/7  Node.js'
$vn = VersaoNode
if (-not $vn) { Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS'; $vn = VersaoNode }
elseif ($vn -lt $NODE_MIN) {
  Aviso "Node.js $vn e antigo (minimo $NODE_MIN). Atualizando..."
  Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS' -Atualizar
  $vn = VersaoNode
  if ($vn -lt $NODE_MIN) { Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS'; $vn = VersaoNode }
}
if ($vn -and $vn -ge $NODE_MIN) { Ok "Node.js $vn" }
elseif ($vn) { Aviso "Node.js $vn abaixo do recomendado ($NODE_MIN); deve funcionar, mas atualize quando puder." }
else { Erro 'Node.js nao foi instalado.' }

# ---------------------------------------------------------------------------
Titulo '4/7  LibreOffice (gera os PDFs dos contratos)'
$so = AcharSoffice
if ($so) { Ok "LibreOffice encontrado: $so" }
elseif ($SemPdf) { Aviso 'Pulado (-SemPdf). Sem LibreOffice os PDFs so saem se houver Microsoft Word.' }
elseif (Perguntar 'LibreOffice nao encontrado. Instalar agora (cerca de 350 MB)?') {
  Winget 'TheDocumentFoundation.LibreOffice' 'LibreOffice'
  $so = AcharSoffice
  if ($so) { Ok "LibreOffice instalado: $so" } else { Aviso 'LibreOffice nao confirmado; os PDFs podem nao ser gerados.' }
}
else { Aviso 'Sem LibreOffice: os contratos saem so em .docx (ou PDF via Word, se houver).' }

# ---------------------------------------------------------------------------
Titulo '5/7  Google Drive para computador'
$drive = AcharDrive
$driveApp = Test-Path "$env:ProgramFiles\Google\Drive File Stream"
if ($drive) { Ok "Drive encontrado em $drive" }
elseif ($SemDrive) { Aviso 'Pulado (-SemDrive). O sistema vai gravar numa pasta local.' }
elseif ($driveApp) { Aviso 'Google Drive instalado, mas sem conta conectada. Abra o Google Drive, entre com a conta da empresa e rode este instalador de novo.' }
elseif (Perguntar 'Google Drive para computador nao encontrado. Instalar agora?') {
  Winget 'Google.GoogleDrive' 'Google Drive'
  Aviso 'Depois de instalar, abra o Google Drive e entre com a conta da empresa (contatotaynaassessoria@gmail.com).'
}
else { Aviso 'Sem Google Drive: os contratos ficam numa pasta local deste computador.' }

# ---------------------------------------------------------------------------
Titulo '6/7  Projeto (GitHub)'
$aqui = Split-Path -Parent $env:INSTALADOR
if (-not $Destino) {
  if (Test-Path (Join-Path $aqui '.git')) { $Destino = $aqui }
  else { $Destino = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'gerenciamento-os' }
}
$env:GIT_TERMINAL_PROMPT = '1'
if (-not (Tem git)) {
  Erro 'Sem Git nao da para baixar o projeto.'
}
elseif (Test-Path (Join-Path $Destino '.git')) {
  Write-Host "   Projeto ja existe em $Destino. Atualizando..."
  $alteracoes = & git -C $Destino status --porcelain --untracked-files=no
  if ($alteracoes) {
    Aviso 'Ha arquivos alterados nesta copia; a atualizacao foi pulada para nao perder nada:'
    $alteracoes | ForEach-Object { Write-Host "        $_" }
  } else {
    & git -C $Destino pull --ff-only | Out-Host
    if ($LASTEXITCODE -eq 0) { Ok ('Atualizado: ' + (& git -C $Destino log --oneline -1)) }
    else { Erro 'Nao foi possivel atualizar pelo GitHub (sem internet ou sem acesso ao repositorio).' }
  }
}
elseif ((Test-Path $Destino) -and (Get-ChildItem -LiteralPath $Destino -Force | Select-Object -First 1)) {
  Erro "A pasta $Destino ja existe e nao e uma copia do projeto. Use -Destino para escolher outra."
}
else {
  Write-Host "   Baixando o projeto para $Destino ..."
  Write-Host '   Se abrir uma janela do GitHub, entre com uma conta que tenha acesso ao repositorio.'
  & git clone $REPO $Destino | Out-Host
  if ($LASTEXITCODE -eq 0) { Ok "Projeto baixado em $Destino" }
  else { Erro 'Falha ao baixar o projeto. Verifique a internet e se a conta do GitHub tem acesso a vieiraruan/gerenciamento-os.' }
}

# ---------------------------------------------------------------------------
Titulo '7/7  Dependencias, verificacao e atalho'
$app = Join-Path $Destino $APP_REL
if (-not (Test-Path (Join-Path $app 'package.json'))) {
  Erro "Aplicativo nao encontrado em $app."
}
elseif (-not (Tem npm)) {
  Erro 'npm nao encontrado (vem com o Node.js).'
}
else {
  Push-Location $app
  $cmdNpm = if (Test-Path 'package-lock.json') { 'ci' } else { 'install' }
  Write-Host "   npm $cmdNpm ..."
  & npm.cmd $cmdNpm --no-audit --no-fund --loglevel=error | Out-Host
  if ($LASTEXITCODE -eq 0) { Ok 'Dependencias instaladas' } else { Erro "npm $cmdNpm falhou." }

  $teste = & node -e "require('docxtemplater');require('pizzip');require('extenso');const p=require('./src/pastas').resolverPastas();console.log(p.modo+'|'+p.saida+'|'+p.dados)" 2>$null
  if ($LASTEXITCODE -eq 0 -and $teste) {
    $modo, $saida, $dados = "$teste".Split('|')
    if ($modo -eq 'drive') { Ok "Modo Google Drive: contratos em $saida\ASSESSORIA e \CERIMONIAL" }
    else { Aviso "Modo local (Drive nao encontrado): contratos em $saida" }
    Ok "Dados do sistema: $dados"
    if ($modo -ne 'drive' -and -not (Test-Path 'config\empresa.json')) {
      Copy-Item 'config\empresa.exemplo.json' 'config\empresa.json'
      Aviso 'Criado config\empresa.json de exemplo: preencha com os dados da empresa (no modo Drive ele vem do Drive).'
    }
  } else { Erro 'O aplicativo nao passou na verificacao (modulos ou pastas).' }
  Pop-Location

  $desk = [Environment]::GetFolderPath('Desktop')
  foreach ($velho in 'Contratos - Tayna Alves.lnk') {
    $pv = Join-Path $desk $velho
    if (Test-Path $pv) { Remove-Item $pv -Force }
  }
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut((Join-Path $desk "$ATALHO.lnk"))
  $lnk.TargetPath = Join-Path $app 'abrir-aplicativo.cmd'
  $lnk.WorkingDirectory = $app
  $lnk.IconLocation = (Join-Path $app 'templates\marca\icone.ico') + ',0'
  $lnk.Description = 'Aplicativos Tayna Alves Assessoria'
  $lnk.Save()
  Ok "Atalho '$ATALHO' na Area de Trabalho"
}

# ---------------------------------------------------------------------------
Write-Host ''
if ($falhas.Count -eq 0) {
  Write-Host '  Tudo pronto! Abra o atalho "Tayna Alves Assessoria" na Area de Trabalho.' -ForegroundColor Green
  Write-Host '  Para atualizar no futuro, basta rodar este instalador de novo.'
  try { Stop-Transcript | Out-Null } catch {}
  if (Perguntar 'Abrir o aplicativo agora?') { Start-Process (Join-Path $app 'abrir-aplicativo.cmd') -WorkingDirectory $app }
  exit 0
} else {
  Write-Host "  Terminou com $($falhas.Count) problema(s):" -ForegroundColor Red
  $falhas | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
  Write-Host "  Resolva e rode o instalador de novo. Registro: $LOG"
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}

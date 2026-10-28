<# : -------------------------------------------------------------------------
@echo off
rem ===========================================================================
rem  Instalador / atualizador do sistema Tayna Alves Assessoria
rem
rem  Arquivo unico: copie para qualquer computador Windows e de dois cliques.
rem  Abre uma janela que mostra cada etapa: instala o que faltar (Git, Node.js,
rem  LibreOffice, Google Drive), baixa o projeto do GitHub, instala as
rem  dependencias e cria o atalho. Rodar de novo = atualizar.
rem
rem  Opcoes: [-Destino C:\pasta] [-SemPdf] [-SemDrive] [-SemInterface]
rem  (-SemInterface roda no modo texto, nesta janela)
rem
rem  NAO EDITE AQUI: gerado por scripts\instalador\montar.py a partir de
rem  scripts\instalador\instalador.ps1
rem ===========================================================================
setlocal
set "INSTALADOR=%~f0"
echo.%* | findstr /i /c:"-SemInterface" >nul && goto :texto
start "" powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -Command "& ([scriptblock]::Create([IO.File]::ReadAllText($env:INSTALADOR))) %*"
exit /b 0
:texto
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create([IO.File]::ReadAllText($env:INSTALADOR))) %*"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
#>
param(
  [string]$Destino = '',
  [string]$Repositorio = 'https://github.com/vieiraruan/gerenciamento-os.git',
  [switch]$SemPdf,
  [switch]$SemDrive,
  [switch]$SemInterface
)
# ===========================================================================
#  Instalador / atualizador do sistema Tayná Alves Assessoria
#  (fonte do instalar-sistema.cmd — gerado por scripts/instalador/montar.py)
# ===========================================================================

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
# downloads diretos (GitHub, nodejs.org, Google) exigem TLS 1.2
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}
# o projeto é público: nunca pedir login do GitHub
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
$REPO     = $Repositorio
$NODE_MIN = [version]'22.20.0'
$APP_REL  = 'apps\contract-generator'
$ATALHO   = 'Tayna Alves Assessoria'
$LOG      = Join-Path $env:TEMP ('instalar-tayna-alves-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$GUI      = -not $SemInterface
$script:cancelado = $false
$script:falhas = New-Object System.Collections.ArrayList
$script:avisos = New-Object System.Collections.ArrayList
$script:app = $null

$LOGO_B64  = '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'
$ICONE_B64 = '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'

# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------
function Tem($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function AtualizarPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
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
function DestinoPadrao {
  $aqui = if ($env:INSTALADOR) { Split-Path -Parent $env:INSTALADOR } else { '' }
  if ($aqui -and (Test-Path (Join-Path $aqui '.git'))) { return $aqui }
  return Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'gerenciamento-os'
}

function Log([string]$texto) {
  if ($null -eq $texto) { return }
  Add-Content -LiteralPath $LOG -Value $texto -Encoding UTF8
  if ($GUI) {
    $script:txtLog.AppendText($texto + [Environment]::NewLine)
  } else {
    Write-Host "      $texto" -ForegroundColor DarkGray
  }
}
function Bombear { if ($GUI) { [System.Windows.Forms.Application]::DoEvents() } }

# Executa um programa mostrando a saída ao vivo sem travar a janela.
function Executar([string]$exe, [string[]]$argumentos, [string]$pasta = '') {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $exe
  $psi.Arguments = ($argumentos | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }) -join ' '
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
  $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
  if ($pasta) { $psi.WorkingDirectory = $pasta }
  Log "> $exe $($psi.Arguments)"
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  try { [void]$p.Start() } catch { Log "Falha ao iniciar $exe : $($_.Exception.Message)"; return -1 }

  $leitores = @($p.StandardOutput, $p.StandardError)
  $tarefas = @($leitores[0].ReadLineAsync(), $leitores[1].ReadLineAsync())
  $abertos = @($true, $true)
  while ($abertos[0] -or $abertos[1]) {
    $algo = $false
    for ($i = 0; $i -lt 2; $i++) {
      if ($abertos[$i] -and $tarefas[$i].IsCompleted) {
        $linha = $tarefas[$i].Result
        if ($null -eq $linha) { $abertos[$i] = $false }
        else {
          $t = $linha.Trim()
          # ignora animações de progresso (winget/npm)
          if ($t -and $t -notmatch '^[-\\|/]$' -and $t -notmatch '[█▒░]') { Log $t }
          $tarefas[$i] = $leitores[$i].ReadLineAsync()
          $algo = $true
        }
      }
    }
    if ($script:cancelado) { try { $p.Kill() } catch {}; break }
    if (-not $algo) { Bombear; Start-Sleep -Milliseconds 40 }
  }
  $p.WaitForExit()
  return $p.ExitCode
}

function Winget($id, $nome, [switch]$Atualizar) {
  if (-not (Tem winget)) {
    Log "winget não encontrado: $nome será baixado direto do site oficial."
    return $false
  }
  $acao = if ($Atualizar) { 'upgrade' } else { 'install' }
  Etapa-Detalhe "Instalando $nome... (pode pedir permissão de administrador)"
  [void](Executar 'winget' @($acao, '--id', $id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements'))
  AtualizarPath
  return $true
}

# Baixa um arquivo mostrando o percentual na etapa, sem travar a janela.
function Baixar([string]$url, [string]$destino, [string]$nome) {
  Log "Baixando $url"
  try {
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.UserAgent = 'instalador-tayna-alves'
    $resp = $req.GetResponse()
    $total = $resp.ContentLength
    $entrada = $resp.GetResponseStream()
    $saida = [System.IO.File]::Create($destino)
    $buf = New-Object byte[] 262144
    $lido = 0; $ultimo = [DateTime]::MinValue
    try {
      while (($n = $entrada.Read($buf, 0, $buf.Length)) -gt 0) {
        $saida.Write($buf, 0, $n); $lido += $n
        if (([DateTime]::Now - $ultimo).TotalMilliseconds -gt 300) {
          $ultimo = [DateTime]::Now
          $mb = [Math]::Round($lido / 1MB, 1)
          $txt = if ($total -gt 0) { "Baixando $nome... $([int](100 * $lido / $total))% ($mb MB)" } else { "Baixando $nome... $mb MB" }
          if ($GUI) { $script:linhas[$script:etapaAtual].Status.Text = $txt }
          Bombear
        }
        if ($script:cancelado) { throw 'cancelado' }
      }
    } finally { $saida.Close(); $entrada.Close(); $resp.Close() }
    return $true
  } catch {
    Log "Falha no download: $($_.Exception.Message)"
    return $false
  }
}
function TextoWeb([string]$url) {
  $wc = New-Object System.Net.WebClient
  $wc.Headers.Add('User-Agent', 'instalador-tayna-alves')
  $wc.Encoding = [System.Text.Encoding]::UTF8
  return $wc.DownloadString($url)
}
# Roda um instalador pedindo permissão de administrador e espera sem travar a janela.
function InstalarComoAdmin([string]$exe, [string]$argumentos, [string]$nome) {
  Etapa-Detalhe "Instalando $nome... (confirme a permissão de administrador)"
  Log "> $exe $argumentos (como administrador)"
  try { $p = Start-Process -FilePath $exe -ArgumentList $argumentos -Verb RunAs -PassThru }
  catch { Log "Instalação não autorizada: $($_.Exception.Message)"; return $false }
  while (-not $p.HasExited) { Bombear; Start-Sleep -Milliseconds 200; if ($script:cancelado) { return $false } }
  Log "Código de saída: $($p.ExitCode)"
  AtualizarPath
  return ($p.ExitCode -in 0, 3010)
}
$ARQ = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'arm64' } else { 'x64' }
$PASTA_TMP = Join-Path $env:TEMP 'instalador-tayna-alves'
function GitDireto {
  Etapa-Detalhe 'Procurando a versão mais recente do Git...'
  try {
    $rel = TextoWeb 'https://api.github.com/repos/git-for-windows/git/releases/latest' | ConvertFrom-Json
    $padrao = if ($ARQ -eq 'arm64') { '^Git-.*-arm64\.exe$' } else { '^Git-.*-64-bit\.exe$' }
    $asset = $rel.assets | Where-Object { $_.name -match $padrao } | Select-Object -First 1
    if (-not $asset) { Log 'Instalador do Git não encontrado na página de versões.'; return }
    New-Item -ItemType Directory -Force $PASTA_TMP | Out-Null
    $exe = Join-Path $PASTA_TMP $asset.name
    if (Baixar $asset.browser_download_url $exe 'Git') {
      [void](InstalarComoAdmin $exe '/VERYSILENT /NORESTART /NOCANCEL /SP- /SUPPRESSMSGBOXES' 'Git')
    }
  } catch { Log "Falha ao instalar o Git direto: $($_.Exception.Message)" }
}
function NodeDireto {
  Etapa-Detalhe 'Procurando a versão LTS mais recente do Node.js...'
  try {
    $lista = TextoWeb 'https://nodejs.org/dist/index.json' | ConvertFrom-Json
    $v = ($lista | Where-Object { $_.lts -and $_.lts -ne $false } | Select-Object -First 1).version
    if (-not $v) { Log 'Versão LTS do Node.js não encontrada.'; return }
    New-Item -ItemType Directory -Force $PASTA_TMP | Out-Null
    $msi = Join-Path $PASTA_TMP "node-$v-$ARQ.msi"
    if (Baixar "https://nodejs.org/dist/$v/node-$v-$ARQ.msi" $msi "Node.js $v") {
      [void](InstalarComoAdmin 'msiexec.exe' "/i `"$msi`" /qn /norestart" "Node.js $v")
    }
  } catch { Log "Falha ao instalar o Node.js direto: $($_.Exception.Message)" }
}
function LibreOfficeDireto {
  Etapa-Detalhe 'Procurando a versão estável do LibreOffice...'
  try {
    $base = 'https://download.documentfoundation.org/libreoffice/stable/'
    $versoes = [regex]::Matches((TextoWeb $base), 'href="(\d+\.\d+\.\d+)/"') | ForEach-Object { [version]$_.Groups[1].Value }
    $v = ($versoes | Sort-Object -Descending | Select-Object -First 1).ToString()
    $pasta = if ($ARQ -eq 'arm64') { 'aarch64' } else { 'x86_64' }
    $nomeMsi = if ($ARQ -eq 'arm64') { "LibreOffice_$($v)_Win_aarch64.msi" } else { "LibreOffice_$($v)_Win_x86-64.msi" }
    New-Item -ItemType Directory -Force $PASTA_TMP | Out-Null
    $msi = Join-Path $PASTA_TMP $nomeMsi
    if (Baixar "$base$v/win/$pasta/$nomeMsi" $msi "LibreOffice $v") {
      [void](InstalarComoAdmin 'msiexec.exe' "/i `"$msi`" /qn /norestart" "LibreOffice $v")
    }
  } catch { Log "Falha ao instalar o LibreOffice direto: $($_.Exception.Message)" }
}
function DriveDireto {
  New-Item -ItemType Directory -Force $PASTA_TMP | Out-Null
  $exe = Join-Path $PASTA_TMP 'GoogleDriveSetup.exe'
  if (Baixar 'https://dl.google.com/drive-file-stream/GoogleDriveSetup.exe' $exe 'Google Drive') {
    [void](InstalarComoAdmin $exe '--silent --desktop_shortcut' 'Google Drive')
  }
}

# ---------------------------------------------------------------------------
# Etapas (status: pendente, rodando, ok, aviso, erro, pulada)
# ---------------------------------------------------------------------------
$ETAPAS = @(
  @{ id = 'winget'; nome = 'Gerenciador de pacotes (winget)' },
  @{ id = 'git';    nome = 'Git (download do projeto)' },
  @{ id = 'node';   nome = 'Node.js (motor do aplicativo)' },
  @{ id = 'office'; nome = 'LibreOffice (PDF dos contratos)' },
  @{ id = 'drive';  nome = 'Google Drive para computador' },
  @{ id = 'repo';   nome = 'Projeto do GitHub' },
  @{ id = 'deps';   nome = 'Dependências e verificação' },
  @{ id = 'atalho'; nome = 'Atalho na Área de Trabalho' }
)
$script:etapaAtual = $null

function Etapa-Inicio($id) {
  $script:etapaAtual = $id
  $e = $ETAPAS | Where-Object { $_.id -eq $id }
  Log ''
  Log "== $($e.nome)"
  if ($GUI) {
    Definir-Status $id 'rodando' 'em andamento...'
    $script:lblAtual.Text = $e.nome
  } else { Write-Host ''; Write-Host "== $($e.nome)" -ForegroundColor Cyan }
  Bombear
}
function Etapa-Detalhe($texto) {
  Log $texto
  if ($GUI) { $script:linhas[$script:etapaAtual].Status.Text = $texto; Bombear }
}
function Etapa-Fim($status, $texto) {
  $id = $script:etapaAtual
  switch ($status) {
    'erro'  { [void]$script:falhas.Add($texto) }
    'aviso' { [void]$script:avisos.Add($texto) }
  }
  Log "[$status] $texto"
  if ($GUI) {
    Definir-Status $id $status $texto
    $script:barra.Value = [Math]::Min($script:barra.Maximum, $script:barra.Value + 1)
  } else {
    $cor = @{ ok = 'Green'; aviso = 'Yellow'; erro = 'Red'; pulada = 'DarkGray' }[$status]
    Write-Host "   [$status] $texto" -ForegroundColor $cor
  }
  Bombear
}

function Rodar-Instalacao {
  $instalarOffice = if ($GUI) { $script:chkOffice.Checked } else { -not $SemPdf }
  $instalarDrive  = if ($GUI) { $script:chkDrive.Checked } else { -not $SemDrive }
  $dest = if ($GUI) { $script:txtDestino.Text.Trim() } elseif ($Destino) { $Destino } else { DestinoPadrao }
  Log "Instalação iniciada em $(Get-Date) | destino: $dest"

  # 1. winget
  Etapa-Inicio 'winget'
  if (Tem winget) { Etapa-Fim 'ok' 'Disponível' }
  else { Etapa-Fim 'aviso' 'Não encontrado: instale o "Instalador de Aplicativo" pela Microsoft Store se faltar algum programa.' }
  if ($script:cancelado) { return }

  # 2. Git
  Etapa-Inicio 'git'
  if (-not (Tem git)) { [void](Winget 'Git.Git' 'Git') }
  if (-not (Tem git)) { GitDireto }
  if (Tem git) { Etapa-Fim 'ok' ((& git --version) -replace 'git version ', 'Versão ') }
  else { Etapa-Fim 'erro' 'Git não foi instalado.' }
  if ($script:cancelado) { return }

  # 3. Node.js
  Etapa-Inicio 'node'
  $vn = VersaoNode
  if (-not $vn) { [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js'); $vn = VersaoNode }
  if (-not $vn) { NodeDireto; $vn = VersaoNode }
  elseif ($vn -lt $NODE_MIN) {
    Etapa-Detalhe "Versão $vn é antiga; atualizando..."
    [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js' -Atualizar); $vn = VersaoNode
    if ($vn -lt $NODE_MIN) { [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js'); $vn = VersaoNode }
    if ($vn -lt $NODE_MIN) { NodeDireto; $vn = VersaoNode }
  }
  if ($vn -and $vn -ge $NODE_MIN) { Etapa-Fim 'ok' "Versão $vn" }
  elseif ($vn) { Etapa-Fim 'aviso' "Versão $vn (recomendado $NODE_MIN ou mais nova)" }
  else { Etapa-Fim 'erro' 'Node.js não foi instalado.' }
  if ($script:cancelado) { return }

  # 4. LibreOffice
  Etapa-Inicio 'office'
  $so = AcharSoffice
  if ($so) { Etapa-Fim 'ok' 'Já instalado' }
  elseif (-not $instalarOffice) { Etapa-Fim 'pulada' 'Não instalar: contratos só em .docx (ou PDF pelo Word, se houver)' }
  else {
    [void](Winget 'TheDocumentFoundation.LibreOffice' 'LibreOffice (cerca de 350 MB)')
    if (-not (AcharSoffice)) { LibreOfficeDireto }
    if (AcharSoffice) { Etapa-Fim 'ok' 'Instalado' }
    else { Etapa-Fim 'aviso' 'Não confirmado: os PDFs podem não ser gerados (instale por libreoffice.org).' }
  }
  if ($script:cancelado) { return }

  # 5. Google Drive
  Etapa-Inicio 'drive'
  $drive = AcharDrive
  $driveApp = Test-Path "$env:ProgramFiles\Google\Drive File Stream"
  if ($drive) { Etapa-Fim 'ok' "Conectado em $drive" }
  elseif (-not $instalarDrive) { Etapa-Fim 'pulada' 'Não instalar: contratos ficam numa pasta local' }
  elseif ($driveApp) { Etapa-Fim 'aviso' 'Instalado, mas sem conta conectada: abra o Google Drive e entre com a conta da empresa.' }
  else {
    if (-not (Winget 'Google.GoogleDrive' 'Google Drive')) { DriveDireto }
    Etapa-Fim 'aviso' 'Abra o Google Drive e entre com contatotaynaassessoria@gmail.com; depois rode o instalador de novo.'
  }
  if ($script:cancelado) { return }

  # 6. Projeto
  Etapa-Inicio 'repo'
  if (-not (Tem git)) { Etapa-Fim 'erro' 'Sem Git não dá para baixar o projeto.' }
  elseif (Test-Path (Join-Path $dest '.git')) {
    Etapa-Detalhe 'Projeto já existe; buscando atualizações...'
    $alteracoes = & git -C $dest status --porcelain --untracked-files=no
    if ($alteracoes) {
      $alteracoes | ForEach-Object { Log "alterado: $_" }
      Etapa-Fim 'aviso' 'Há arquivos alterados nesta cópia; atualização pulada para não perder nada.'
    } elseif ((Executar 'git' @('-C', $dest, 'pull', '--ff-only')) -eq 0) {
      Etapa-Fim 'ok' ('Atualizado: ' + (& git -C $dest log -1 --format='%h %s'))
    } else { Etapa-Fim 'erro' 'Não foi possível atualizar (sem internet ou sem acesso ao GitHub).' }
  }
  elseif ((Test-Path $dest) -and (Get-ChildItem -LiteralPath $dest -Force | Select-Object -First 1)) {
    Etapa-Fim 'erro' "A pasta $dest já existe e não é uma cópia do projeto. Escolha outra pasta."
  }
  else {
    Etapa-Detalhe 'Baixando o projeto do GitHub...'
    # público: sem credenciais (credential.helper vazio evita qualquer janela de login)
    if ((Executar 'git' @('-c', 'credential.helper=', 'clone', '--progress', $REPO, $dest)) -eq 0) { Etapa-Fim 'ok' "Baixado em $dest" }
    else { Etapa-Fim 'erro' "Falha ao baixar de $REPO. Verifique a internet (e se o repositório está público)." }
  }
  if ($script:cancelado) { return }

  # 7. Dependências
  Etapa-Inicio 'deps'
  $app = Join-Path $dest $APP_REL
  $script:app = $app
  if (-not (Test-Path (Join-Path $app 'package.json'))) { Etapa-Fim 'erro' 'Aplicativo não encontrado na pasta do projeto.' }
  elseif (-not (Tem npm)) { Etapa-Fim 'erro' 'npm não encontrado (vem com o Node.js).' }
  else {
    $cmdNpm = if (Test-Path (Join-Path $app 'package-lock.json')) { 'ci' } else { 'install' }
    Etapa-Detalhe "Instalando bibliotecas (npm $cmdNpm)..."
    $rc = Executar 'cmd.exe' @('/d', '/c', 'npm.cmd', $cmdNpm, '--no-audit', '--no-fund', '--loglevel=error') $app
    if ($rc -ne 0) { Etapa-Fim 'erro' "npm $cmdNpm falhou (veja os detalhes)." }
    else {
      Etapa-Detalhe 'Verificando o aplicativo...'
      Push-Location $app
      $teste = & node -e "require('docxtemplater');require('pizzip');require('extenso');const p=require('./src/pastas').resolverPastas();console.log(p.modo+'|'+p.saida+'|'+p.dados)" 2>$null
      $okTeste = ($LASTEXITCODE -eq 0) -and $teste
      if ($okTeste) {
        $modo, $saida, $dados = "$teste".Split('|')
        Log "modo=$modo saida=$saida dados=$dados"
        if ($modo -ne 'drive' -and -not (Test-Path 'config\empresa.json')) {
          Copy-Item 'config\empresa.exemplo.json' 'config\empresa.json'
          Log 'Criado config\empresa.json de exemplo (preencher com os dados da empresa).'
        }
      }
      Pop-Location
      if (-not $okTeste) { Etapa-Fim 'erro' 'O aplicativo não passou na verificação.' }
      elseif ($modo -eq 'drive') { Etapa-Fim 'ok' "Pronto; contratos no Drive ($saida)" }
      else { Etapa-Fim 'aviso' "Pronto, mas sem Drive: contratos em $saida" }
    }
  }
  if ($script:cancelado) { return }

  # 8. Atalho
  Etapa-Inicio 'atalho'
  if (-not (Test-Path (Join-Path $app 'abrir-aplicativo.cmd'))) { Etapa-Fim 'pulada' 'Sem aplicativo para o atalho.' }
  else {
    try {
      $desk = [Environment]::GetFolderPath('Desktop')
      $velho = Join-Path $desk 'Contratos - Tayna Alves.lnk'
      if (Test-Path $velho) { Remove-Item $velho -Force }
      $ws = New-Object -ComObject WScript.Shell
      $lnk = $ws.CreateShortcut((Join-Path $desk "$ATALHO.lnk"))
      # abre em segundo plano (sem janela preta) pelo .vbs; o .cmd fica para diagnóstico
      $vbs = Join-Path $app 'abrir-aplicativo.vbs'
      if (Test-Path $vbs) {
        $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
        $lnk.Arguments = '"' + $vbs + '"'
      } else {
        $lnk.TargetPath = Join-Path $app 'abrir-aplicativo.cmd'
      }
      $lnk.WorkingDirectory = $app
      $lnk.IconLocation = (Join-Path $app 'templates\marca\icone.ico') + ',0'
      $lnk.Description = 'Aplicativos Tayna Alves Assessoria'
      $lnk.Save()
      Etapa-Fim 'ok' "Atalho '$ATALHO' criado"
    } catch { Etapa-Fim 'erro' "Não foi possível criar o atalho: $($_.Exception.Message)" }
  }
}

# ---------------------------------------------------------------------------
# Modo texto (-SemInterface)
# ---------------------------------------------------------------------------
if (-not $GUI) {
  Write-Host ''
  Write-Host '  Tayná Alves Assessoria - instalação / atualização do sistema' -ForegroundColor Magenta
  Write-Host "  Registro: $LOG"
  Rodar-Instalacao
  Write-Host ''
  if ($script:falhas.Count) {
    Write-Host "  Terminou com $($script:falhas.Count) problema(s). Veja o registro: $LOG" -ForegroundColor Red
    exit 1
  }
  Write-Host '  Tudo pronto! Abra o atalho "Tayna Alves Assessoria" na Área de Trabalho.' -ForegroundColor Green
  exit 0
}

# ---------------------------------------------------------------------------
# Interface gráfica
# ---------------------------------------------------------------------------
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false) } catch {}

$COR_MARCA = [System.Drawing.Color]::FromArgb(130, 70, 52)
$COR_FUNDO = [System.Drawing.Color]::FromArgb(248, 243, 239)
$COR_SUAVE = [System.Drawing.Color]::FromArgb(123, 111, 106)
$COR_BORDA = [System.Drawing.Color]::FromArgb(234, 220, 212)
$CORES = @{
  pendente = [System.Drawing.Color]::FromArgb(190, 180, 175)
  rodando  = $COR_MARCA
  ok       = [System.Drawing.Color]::FromArgb(47, 122, 79)
  aviso    = [System.Drawing.Color]::FromArgb(196, 128, 0)
  erro     = [System.Drawing.Color]::FromArgb(179, 38, 30)
  pulada   = [System.Drawing.Color]::FromArgb(160, 150, 145)
}
$SIMBOLOS = @{
  pendente = [string][char]0x25CB   # ○
  rodando  = [string][char]0x25D4   # ◔
  ok       = [string][char]0x2714   # ✔
  aviso    = [string][char]0x26A0   # ⚠
  erro     = [string][char]0x2716   # ✖
  pulada   = [string][char]0x2013   # –
}
$FONTE      = New-Object System.Drawing.Font('Segoe UI', 9.5)
$FONTE_NEG  = New-Object System.Drawing.Font('Segoe UI Semibold', 9.5)
$FONTE_TIT  = New-Object System.Drawing.Font('Segoe UI Semibold', 14)
$FONTE_SIMB = New-Object System.Drawing.Font('Segoe UI Symbol', 12)

function Imagem($b64) {
  try { return [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(, [Convert]::FromBase64String($b64)))) }
  catch { return $null }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Instalação - Tayná Alves Assessoria'
$form.ClientSize = New-Object System.Drawing.Size(660, 700)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.BackColor = $COR_FUNDO
$form.Font = $FONTE
$form.AutoScaleMode = 'None'
$ic = Imagem $ICONE_B64
if ($ic) { try { $form.Icon = [System.Drawing.Icon]::FromHandle(([System.Drawing.Bitmap]$ic).GetHicon()) } catch {} }

# Cabeçalho
$topo = New-Object System.Windows.Forms.Panel
$topo.SetBounds(0, 0, 660, 110); $topo.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($topo)
$logo = Imagem $LOGO_B64
if ($logo) {
  $pic = New-Object System.Windows.Forms.PictureBox
  $pic.Image = $logo; $pic.SizeMode = 'Zoom'; $pic.SetBounds(18, 8, 125, 94)
  $topo.Controls.Add($pic)
}
$tit = New-Object System.Windows.Forms.Label
$tit.Text = 'Instalação do sistema'; $tit.Font = $FONTE_TIT; $tit.ForeColor = $COR_MARCA
$tit.AutoSize = $true; $tit.Location = New-Object System.Drawing.Point(160, 28)
$topo.Controls.Add($tit)
$sub = New-Object System.Windows.Forms.Label
$sub.Text = 'Instala ou atualiza tudo o que o aplicativo precisa neste computador.'
$sub.ForeColor = $COR_SUAVE; $sub.AutoSize = $true; $sub.Location = New-Object System.Drawing.Point(162, 62)
$topo.Controls.Add($sub)

# Opções
$grp = New-Object System.Windows.Forms.GroupBox
$grp.Text = 'Opções'; $grp.SetBounds(18, 122, 624, 112); $grp.ForeColor = $COR_MARCA
$form.Controls.Add($grp)
$lblDest = New-Object System.Windows.Forms.Label
$lblDest.Text = 'Pasta do sistema:'; $lblDest.ForeColor = [System.Drawing.Color]::Black
$lblDest.AutoSize = $true; $lblDest.Location = New-Object System.Drawing.Point(14, 28)
$grp.Controls.Add($lblDest)
$script:txtDestino = New-Object System.Windows.Forms.TextBox
$script:txtDestino.SetBounds(130, 25, 380, 24)
$script:txtDestino.Text = if ($Destino) { $Destino } else { DestinoPadrao }
$grp.Controls.Add($script:txtDestino)
$btnPasta = New-Object System.Windows.Forms.Button
$btnPasta.Text = 'Alterar...'; $btnPasta.SetBounds(518, 23, 92, 28); $btnPasta.ForeColor = [System.Drawing.Color]::Black
$btnPasta.Add_Click({
  $d = New-Object System.Windows.Forms.FolderBrowserDialog
  $d.Description = 'Escolha a pasta onde o sistema será instalado'
  if ($d.ShowDialog() -eq 'OK') { $script:txtDestino.Text = Join-Path $d.SelectedPath 'gerenciamento-os' }
})
$grp.Controls.Add($btnPasta)
$script:chkOffice = New-Object System.Windows.Forms.CheckBox
$script:chkOffice.Text = 'Instalar LibreOffice se faltar (gera os PDFs dos contratos, ~350 MB)'
$script:chkOffice.Checked = -not $SemPdf; $script:chkOffice.ForeColor = [System.Drawing.Color]::Black
$script:chkOffice.SetBounds(14, 56, 590, 24)
$grp.Controls.Add($script:chkOffice)
$script:chkDrive = New-Object System.Windows.Forms.CheckBox
$script:chkDrive.Text = 'Instalar Google Drive para computador se faltar (pasta CONTRATOS da empresa)'
$script:chkDrive.Checked = -not $SemDrive; $script:chkDrive.ForeColor = [System.Drawing.Color]::Black
$script:chkDrive.SetBounds(14, 80, 590, 24)
$grp.Controls.Add($script:chkDrive)

# Lista de etapas
$painel = New-Object System.Windows.Forms.Panel
$painel.SetBounds(18, 244, 624, 8 * 34 + 12); $painel.BackColor = [System.Drawing.Color]::White
$painel.BorderStyle = 'FixedSingle'
$form.Controls.Add($painel)
$script:linhas = @{}
$y = 6
foreach ($e in $ETAPAS) {
  $s = New-Object System.Windows.Forms.Label
  $s.Font = $FONTE_SIMB; $s.SetBounds(10, $y, 28, 28); $s.TextAlign = 'MiddleCenter'
  $n = New-Object System.Windows.Forms.Label
  $n.Font = $FONTE_NEG; $n.Text = $e.nome; $n.SetBounds(42, $y + 5, 230, 22)
  $st = New-Object System.Windows.Forms.Label
  $st.SetBounds(275, $y + 5, 340, 22); $st.AutoEllipsis = $true
  $painel.Controls.AddRange(@($s, $n, $st))
  $script:linhas[$e.id] = @{ Simbolo = $s; Nome = $n; Status = $st }
  $y += 34
}
$dica = New-Object System.Windows.Forms.ToolTip
function Definir-Status($id, $status, $texto) {
  $l = $script:linhas[$id]
  $l.Simbolo.Text = $SIMBOLOS[$status]; $l.Simbolo.ForeColor = $CORES[$status]
  $l.Status.Text = $texto
  $l.Status.ForeColor = if ($status -in 'pendente', 'pulada') { $COR_SUAVE } else { $CORES[$status] }
  $l.Nome.ForeColor = if ($status -eq 'pendente') { $COR_SUAVE } else { [System.Drawing.Color]::Black }
  $dica.SetToolTip($l.Status, $texto)
}
foreach ($e in $ETAPAS) { Definir-Status $e.id 'pendente' 'aguardando' }

# Progresso
$script:lblAtual = New-Object System.Windows.Forms.Label
$script:lblAtual.Text = 'Clique em Instalar para começar.'; $script:lblAtual.ForeColor = $COR_SUAVE
$script:lblAtual.SetBounds(18, 538, 624, 20)
$form.Controls.Add($script:lblAtual)
$script:barra = New-Object System.Windows.Forms.ProgressBar
$script:barra.SetBounds(18, 560, 624, 16); $script:barra.Maximum = $ETAPAS.Count
$form.Controls.Add($script:barra)

# Detalhes
$btnDet = New-Object System.Windows.Forms.LinkLabel
$btnDet.Text = 'Mostrar detalhes'; $btnDet.SetBounds(18, 584, 200, 20); $btnDet.LinkColor = $COR_MARCA
$form.Controls.Add($btnDet)
$script:txtLog = New-Object System.Windows.Forms.TextBox
$script:txtLog.Multiline = $true; $script:txtLog.ReadOnly = $true; $script:txtLog.ScrollBars = 'Vertical'
$script:txtLog.Font = New-Object System.Drawing.Font('Consolas', 8.5)
$script:txtLog.BackColor = [System.Drawing.Color]::White
$script:txtLog.SetBounds(18, 700, 624, 170); $script:txtLog.Visible = $false
$form.Controls.Add($script:txtLog)

# Botões
$btnInstalar = New-Object System.Windows.Forms.Button
$btnInstalar.Text = 'Instalar'; $btnInstalar.SetBounds(512, 640, 130, 40)
$btnInstalar.BackColor = $COR_MARCA; $btnInstalar.ForeColor = [System.Drawing.Color]::White
$btnInstalar.FlatStyle = 'Flat'; $btnInstalar.FlatAppearance.BorderSize = 0; $btnInstalar.Font = $FONTE_NEG
$form.Controls.Add($btnInstalar)
$btnAbrir = New-Object System.Windows.Forms.Button
$btnAbrir.Text = 'Abrir aplicativo'; $btnAbrir.SetBounds(372, 640, 130, 40); $btnAbrir.Visible = $false
$btnAbrir.FlatStyle = 'Flat'; $btnAbrir.ForeColor = $COR_MARCA; $btnAbrir.FlatAppearance.BorderColor = $COR_MARCA
$form.Controls.Add($btnAbrir)
$btnFechar = New-Object System.Windows.Forms.Button
$btnFechar.Text = 'Cancelar'; $btnFechar.SetBounds(18, 640, 110, 40); $btnFechar.FlatStyle = 'Flat'
$btnFechar.FlatAppearance.BorderColor = $COR_BORDA
$form.Controls.Add($btnFechar)
$lnkLog = New-Object System.Windows.Forms.LinkLabel
$lnkLog.Text = 'Abrir registro'; $lnkLog.SetBounds(140, 652, 120, 20); $lnkLog.LinkColor = $COR_SUAVE; $lnkLog.Visible = $false
$form.Controls.Add($lnkLog)

function Posicionar {
  $extra = if ($script:txtLog.Visible) { 180 } else { 0 }
  $script:txtLog.Top = 608
  $btnInstalar.Top = 616 + $extra; $btnAbrir.Top = 616 + $extra; $btnFechar.Top = 616 + $extra; $lnkLog.Top = 628 + $extra
  $form.ClientSize = New-Object System.Drawing.Size(660, (672 + $extra))
}
Posicionar
$btnDet.Add_LinkClicked({
  $script:txtLog.Visible = -not $script:txtLog.Visible
  $btnDet.Text = if ($script:txtLog.Visible) { 'Ocultar detalhes' } else { 'Mostrar detalhes' }
  Posicionar
})
$lnkLog.Add_LinkClicked({ Start-Process notepad.exe $LOG })
$btnAbrir.Add_Click({
  if ($script:app) {
    $vbs = Join-Path $script:app 'abrir-aplicativo.vbs'
    if (Test-Path $vbs) { Start-Process 'wscript.exe' -ArgumentList ('"' + $vbs + '"') -WorkingDirectory $script:app }
    else { Start-Process (Join-Path $script:app 'abrir-aplicativo.cmd') -WorkingDirectory $script:app }
  }
  $form.Close()
})
$script:rodando = $false
$btnFechar.Add_Click({
  if ($script:rodando) {
    $r = [System.Windows.Forms.MessageBox]::Show('Cancelar a instalação em andamento?', 'Cancelar', 'YesNo', 'Question')
    if ($r -eq 'Yes') { $script:cancelado = $true }
  } else { $form.Close() }
})
$form.Add_FormClosing({
  param($s, $ev)
  if ($script:rodando) {
    $ev.Cancel = $true
    $r = [System.Windows.Forms.MessageBox]::Show('Cancelar a instalação em andamento?', 'Cancelar', 'YesNo', 'Question')
    if ($r -eq 'Yes') { $script:cancelado = $true }
  }
})

$btnInstalar.Add_Click({
  $script:rodando = $true
  $script:cancelado = $false
  $script:falhas.Clear(); $script:avisos.Clear()
  $btnInstalar.Enabled = $false; $btnAbrir.Visible = $false; $grp.Enabled = $false
  $script:barra.Value = 0; $script:txtLog.Clear()
  foreach ($e in $ETAPAS) { Definir-Status $e.id 'pendente' 'aguardando' }
  try { Rodar-Instalacao } catch { Log "Erro inesperado: $($_.Exception.Message)"; [void]$script:falhas.Add($_.Exception.Message) }
  $script:rodando = $false
  $grp.Enabled = $true; $btnInstalar.Enabled = $true; $lnkLog.Visible = $true
  $btnFechar.Text = 'Fechar'
  if ($script:cancelado) {
    $script:lblAtual.Text = 'Instalação cancelada.'; $script:lblAtual.ForeColor = $CORES.erro
    $btnInstalar.Text = 'Tentar de novo'
  } elseif ($script:falhas.Count) {
    $script:lblAtual.Text = "Terminou com $($script:falhas.Count) problema(s). Corrija e clique em Tentar de novo."
    $script:lblAtual.ForeColor = $CORES.erro
    $btnInstalar.Text = 'Tentar de novo'
    if (-not $script:txtLog.Visible) { $btnDet.Text = 'Ocultar detalhes'; $script:txtLog.Visible = $true; Posicionar }
  } else {
    # truque para a barra não ficar no meio da animação
    $script:barra.Maximum = $script:barra.Maximum + 1; $script:barra.Value = $script:barra.Maximum
    $script:barra.Value = $script:barra.Maximum - 1; $script:barra.Maximum = $script:barra.Maximum - 1
    $script:lblAtual.Text = if ($script:avisos.Count) { "Pronto, com $($script:avisos.Count) aviso(s). O atalho está na Área de Trabalho." }
                            else { 'Tudo pronto! O atalho "Tayna Alves Assessoria" está na Área de Trabalho.' }
    $script:lblAtual.ForeColor = if ($script:avisos.Count) { $CORES.aviso } else { $CORES.ok }
    $btnInstalar.Text = 'Atualizar de novo'
    $btnAbrir.Visible = [bool]$script:app
  }
})

# Já instalado? Então o botão principal é "Atualizar".
if (Test-Path (Join-Path $script:txtDestino.Text '.git')) { $btnInstalar.Text = 'Atualizar' }

Log "Registro: $LOG"

# Teste automatizado: INSTALADOR_CAPTURA=C:\caminho\tela  -> salva tela-inicio.png e tela-fim.png
if ($env:INSTALADOR_CAPTURA) {
  function Capturar($arq) {
    $bmp = New-Object System.Drawing.Bitmap($form.Width, $form.Height)
    $form.DrawToBitmap($bmp, (New-Object System.Drawing.Rectangle(0, 0, $form.Width, $form.Height)))
    $bmp.Save($arq, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $form.Show(); Bombear
  Capturar "$($env:INSTALADOR_CAPTURA)-inicio.png"
  $btnInstalar.PerformClick(); Bombear
  Capturar "$($env:INSTALADOR_CAPTURA)-fim.png"
  if (-not $script:txtLog.Visible) { $btnDet.Text = 'Ocultar detalhes'; $script:txtLog.Visible = $true; Posicionar; Bombear }
  Capturar "$($env:INSTALADOR_CAPTURA)-detalhes.png"
  $form.Close()
  return
}
[void]$form.ShowDialog()

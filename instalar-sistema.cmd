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

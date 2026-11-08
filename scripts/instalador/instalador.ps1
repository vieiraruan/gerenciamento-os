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

$LOGO_B64  = '__LOGO__'
$ICONE_B64 = '__ICONE__'

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
# Pasta CONTRATOS escolhida/confirmada (o aplicativo lê o mesmo arquivo)
$CONFIG_LOCAL = Join-Path $env:LOCALAPPDATA 'TaynaAlves'
$ARQ_CONTRATOS = Join-Path $CONFIG_LOCAL 'pasta-contratos.txt'
function RaizesDrive {
  # todas as raízes do Google Drive para computador: cada conta é uma unidade (G:, H:...) ou pasta espelho
  $r = New-Object System.Collections.ArrayList
  foreach ($letra in 'GHIJKLMNOPQRSTUVWXYZDEF'.ToCharArray()) {
    foreach ($n in 'Meu Drive', 'My Drive') { $p = "$($letra):\$n"; if (Test-Path -LiteralPath $p) { [void]$r.Add($p) } }
    foreach ($n in 'Drives compartilhados', 'Shared drives') {
      $p = "$($letra):\$n"
      if (Test-Path -LiteralPath $p) { Get-ChildItem -LiteralPath $p -Directory -ErrorAction SilentlyContinue | ForEach-Object { [void]$r.Add($_.FullName) } }
    }
  }
  foreach ($n in 'Meu Drive', 'My Drive', 'Google Drive\Meu Drive', 'Google Drive\My Drive') {
    $p = Join-Path $env:USERPROFILE $n; if (Test-Path -LiteralPath $p) { [void]$r.Add($p) }
  }
  return $r
}
function AcharDrive {
  $raizes = RaizesDrive
  if ($raizes.Count) { return $raizes[0] }
  return $null
}
# Pasta CONTRATOS da empresa (com CONTRATOS GERADOS\_DADOS DO SISTEMA, de preferência)
function AcharContratos {
  if (Test-Path -LiteralPath $ARQ_CONTRATOS) {
    $p = (Get-Content -LiteralPath $ARQ_CONTRATOS -Encoding UTF8 -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($p -and (Test-Path -LiteralPath $p.Trim())) { return $p.Trim() }
  }
  $achadas = @()
  foreach ($raiz in RaizesDrive) {
    $c = Join-Path $raiz 'CONTRATOS'
    if (Test-Path -LiteralPath $c) { $achadas += $c }
  }
  $comDados = $achadas | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'CONTRATOS GERADOS\_DADOS DO SISTEMA') } | Select-Object -First 1
  if ($comDados) { return $comDados }
  return ($achadas | Select-Object -First 1)
}
function GuardarContratos([string]$p) {
  New-Item -ItemType Directory -Force $CONFIG_LOCAL | Out-Null
  Set-Content -LiteralPath $ARQ_CONTRATOS -Value $p -Encoding UTF8
}
function ExeDrive {
  $base = "$env:ProgramFiles\Google\Drive File Stream"
  if (-not (Test-Path $base)) { return $null }
  $exe = Get-ChildItem $base -Recurse -Filter 'GoogleDriveFS.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if ($exe) { return $exe.FullName }
  return $null
}
function AbrirDrive {
  # o Drive instalado mas fechado não monta a unidade G:
  if (Get-Process GoogleDriveFS -ErrorAction SilentlyContinue) { return $true }
  $exe = ExeDrive
  if (-not $exe) { return $false }
  Log "Abrindo o Google Drive: $exe"
  try { Start-Process $exe | Out-Null } catch { Log "Não abriu: $($_.Exception.Message)"; return $false }
  return $true
}
function DestinoPadrao {
  $aqui = if ($env:INSTALADOR) { Split-Path -Parent $env:INSTALADOR } else { '' }
  if ($aqui -and (Test-Path (Join-Path $aqui '.git'))) { return $aqui }
  $docs = [Environment]::GetFolderPath('MyDocuments')
  $emDocs = Join-Path $docs 'gerenciamento-os'
  # instalação antiga em Documentos (fora do OneDrive) continua onde está
  if ((Test-Path (Join-Path $emDocs '.git')) -and $docs -notmatch 'OneDrive') { return $emDocs }
  # Documentos no OneDrive: as bibliotecas (node_modules) falham sincronizando; instala fora dele
  if ($docs -match 'OneDrive' -or -not $docs) { return Join-Path $env:USERPROFILE 'TaynaAlves\gerenciamento-os' }
  return $emDocs
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
  Log ("Windows: " + [Environment]::OSVersion.VersionString + " | usuário: $env:USERNAME | computador: $env:COMPUTERNAME | Documentos: " + [Environment]::GetFolderPath('MyDocuments'))
  if ($dest -match 'OneDrive') { Log 'ATENÇÃO: a pasta do sistema está no OneDrive; isso costuma quebrar o npm.' }

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
  $contratos = AcharContratos
  if (-not $contratos -and $instalarDrive) {
    $driveApp = [bool](ExeDrive)
    if (-not $driveApp) {
      if (-not (Winget 'Google.GoogleDrive' 'Google Drive')) { DriveDireto }
      AtualizarPath
    }
    if (AbrirDrive) {
      # espera a unidade do Drive aparecer (até ~60 s)
      for ($i = 0; $i -lt 30 -and -not $contratos -and -not $script:cancelado; $i++) {
        Etapa-Detalhe "Esperando o Google Drive conectar... ($([int](($i + 1) * 2)) s)"
        Start-Sleep -Seconds 2; Bombear
        $contratos = AcharContratos
      }
    }
  }
  $raizes = RaizesDrive
  if ($contratos) {
    GuardarContratos $contratos
    $temDados = Test-Path -LiteralPath (Join-Path $contratos 'CONTRATOS GERADOS\_DADOS DO SISTEMA')
    if ($temDados) { Etapa-Fim 'ok' "Pasta CONTRATOS: $contratos" }
    else { Etapa-Fim 'aviso' "Pasta CONTRATOS em $contratos, mas sem CONTRATOS GERADOS\_DADOS DO SISTEMA (é a pasta da empresa?)" }
  }
  elseif (-not $instalarDrive) { Etapa-Fim 'pulada' 'Não instalar: contratos ficam numa pasta local' }
  elseif ($raizes.Count) {
    $raizes | ForEach-Object { Log "Drive encontrado sem a pasta CONTRATOS: $_" }
    Etapa-Fim 'aviso' "O Google Drive está em $($raizes[0]), mas sem a pasta CONTRATOS: entre com contatotaynaassessoria@gmail.com no Google Drive (ou use 'Escolher pasta CONTRATOS')."
  }
  elseif (ExeDrive) { Etapa-Fim 'aviso' 'Google Drive instalado, mas não conectado: abra o Google Drive (ícone perto do relógio), entre com contatotaynaassessoria@gmail.com e clique em Tentar de novo.' }
  else { Etapa-Fim 'aviso' 'Google Drive não foi instalado: baixe em google.com/drive/download, entre com a conta da empresa e clique em Tentar de novo.' }
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
    if ($rc -ne 0) {
      # segunda tentativa: limpa o que ficou pela metade (arquivo preso por antivírus/OneDrive) e usa npm install
      Etapa-Detalhe 'Primeira tentativa falhou; limpando e tentando de novo...'
      try { Remove-Item -LiteralPath (Join-Path $app 'node_modules') -Recurse -Force -ErrorAction Stop } catch { Log "Não deu para limpar node_modules: $($_.Exception.Message)" }
      [void](Executar 'cmd.exe' @('/d', '/c', 'npm.cmd', 'cache', 'verify') $app)
      $rc = Executar 'cmd.exe' @('/d', '/c', 'npm.cmd', 'install', '--no-audit', '--no-fund', '--loglevel=error') $app
    }
    if ($rc -ne 0) {
      $dicaNpm = if ($app -match 'OneDrive') { ' A pasta está no OneDrive: escolha outra pasta (ex.: C:\TaynaAlves) em Alterar... e tente de novo.' } else { ' Veja os detalhes; antivírus ou falta de internet costumam ser a causa.' }
      Etapa-Fim 'erro' ("Falha ao instalar as bibliotecas (npm)." + $dicaNpm)
    }
    else {
      Etapa-Detalhe 'Verificando o aplicativo...'
      # teste num arquivo (sem problemas de aspas) e com a mensagem de erro no registro
      $teste = Join-Path $env:TEMP 'verificar-tayna-alves.js'
      Set-Content -LiteralPath $teste -Encoding UTF8 -Value @"
process.chdir(process.argv[2]);
for (const m of ['docxtemplater', 'pizzip', 'extenso']) require(require.resolve(m, { paths: [process.argv[2]] }));
const p = require(require('path').join(process.argv[2], 'src', 'pastas.js')).resolverPastas();
console.log([p.modo, p.saida, p.dados].join('|'));
"@
      $saidaTeste = & node $teste $app 2>&1
      $rcTeste = $LASTEXITCODE
      $saidaTeste | ForEach-Object { Log "$_" }
      $linhaOk = $saidaTeste | Where-Object { "$_" -match '^(drive|local|manual)\|' } | Select-Object -Last 1
      $okTeste = ($rcTeste -eq 0) -and $linhaOk
      if ($okTeste) {
        $modo, $saida, $dados = "$linhaOk".Split('|')
        Log "modo=$modo saida=$saida dados=$dados"
        if ($modo -ne 'drive' -and -not (Test-Path (Join-Path $app 'config\empresa.json'))) {
          Copy-Item (Join-Path $app 'config\empresa.exemplo.json') (Join-Path $app 'config\empresa.json')
          Log 'Criado config\empresa.json de exemplo (preencher com os dados da empresa).'
        }
      }
      if (-not $okTeste) {
        $erroTeste = ($saidaTeste | Where-Object { "$_" -match 'Error|Erro|Cannot' } | Select-Object -First 1)
        Etapa-Fim 'erro' ("O aplicativo não passou na verificação" + $(if ($erroTeste) { ": $erroTeste" } else { ' (veja os detalhes).' }))
      }
      elseif ($modo -eq 'drive') { Etapa-Fim 'ok' "Pronto; contratos no Drive ($saida)" }
      else { Etapa-Fim 'aviso' "Pronto, mas sem a pasta CONTRATOS do Drive: o aplicativo vai usar $saida até o Drive conectar" }
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

# Cópia do registro na Área de Trabalho (e na pasta gerenciamento-os do Drive, se houver) para mandar ao suporte
function Copiar-Registro {
  try {
    $desk = [Environment]::GetFolderPath('Desktop')
    Copy-Item -LiteralPath $LOG -Destination (Join-Path $desk 'Registro da instalacao - Tayna Alves.txt') -Force
    $raiz = AcharDrive
    if ($raiz) {
      $pasta = Join-Path $raiz 'gerenciamento-os\registros'
      if (Test-Path -LiteralPath (Join-Path $raiz 'gerenciamento-os')) {
        New-Item -ItemType Directory -Force $pasta | Out-Null
        Copy-Item -LiteralPath $LOG -Destination (Join-Path $pasta ("$env:COMPUTERNAME-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')) -Force
      }
    }
  } catch {}
}

# ---------------------------------------------------------------------------
# Modo texto (-SemInterface)
# ---------------------------------------------------------------------------
if (-not $GUI) {
  Write-Host ''
  Write-Host '  Tayná Alves Assessoria - instalação / atualização do sistema' -ForegroundColor Magenta
  Write-Host "  Registro: $LOG"
  Rodar-Instalacao
  Copiar-Registro
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
$grp.Text = 'Opções'; $grp.SetBounds(18, 122, 624, 146); $grp.ForeColor = $COR_MARCA
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
$lblCont = New-Object System.Windows.Forms.Label
$lblCont.Text = 'Pasta CONTRATOS:'; $lblCont.ForeColor = [System.Drawing.Color]::Black
$lblCont.AutoSize = $true; $lblCont.Location = New-Object System.Drawing.Point(14, 113)
$grp.Controls.Add($lblCont)
$script:txtContratos = New-Object System.Windows.Forms.TextBox
$script:txtContratos.SetBounds(130, 110, 280, 24); $script:txtContratos.ReadOnly = $true
$script:txtContratos.Text = $(try { $c = AcharContratos; if ($c) { $c } else { '(não encontrada: abra o Google Drive)' } } catch { '' })
$grp.Controls.Add($script:txtContratos)
$btnCont = New-Object System.Windows.Forms.Button
$btnCont.Text = 'Escolher...'; $btnCont.SetBounds(418, 108, 92, 28); $btnCont.ForeColor = [System.Drawing.Color]::Black
$btnCont.Add_Click({
  $d = New-Object System.Windows.Forms.FolderBrowserDialog
  $d.Description = 'Escolha a pasta CONTRATOS da empresa no Google Drive (a que tem ASSESSORIA, CERIMONIAL e CONTRATOS GERADOS)'
  $d.ShowNewFolderButton = $false
  if ($d.ShowDialog() -eq 'OK') {
    $sel = $d.SelectedPath
    if ((Split-Path $sel -Leaf) -ne 'CONTRATOS' -and (Test-Path -LiteralPath (Join-Path $sel 'CONTRATOS'))) { $sel = Join-Path $sel 'CONTRATOS' }
    GuardarContratos $sel; $script:txtContratos.Text = $sel
  }
})
$grp.Controls.Add($btnCont)
$btnDrive = New-Object System.Windows.Forms.Button
$btnDrive.Text = 'Abrir Drive'; $btnDrive.SetBounds(518, 108, 92, 28); $btnDrive.ForeColor = [System.Drawing.Color]::Black
$btnDrive.Add_Click({
  if (-not (AbrirDrive)) { [System.Windows.Forms.MessageBox]::Show('Google Drive para computador não está instalado. Clique em Instalar (com a opção do Google Drive marcada) ou baixe em google.com/drive/download.', 'Google Drive') | Out-Null }
  else { [System.Windows.Forms.MessageBox]::Show('O Google Drive foi aberto. Entre com contatotaynaassessoria@gmail.com (ícone do Drive perto do relógio) e depois clique em Instalar / Tentar de novo.', 'Google Drive') | Out-Null }
})
$grp.Controls.Add($btnDrive)

# Lista de etapas
$painel = New-Object System.Windows.Forms.Panel
$painel.SetBounds(18, 278, 624, 8 * 34 + 12); $painel.BackColor = [System.Drawing.Color]::White
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
$script:lblAtual.SetBounds(18, 572, 624, 20)
$form.Controls.Add($script:lblAtual)
$script:barra = New-Object System.Windows.Forms.ProgressBar
$script:barra.SetBounds(18, 594, 624, 16); $script:barra.Maximum = $ETAPAS.Count
$form.Controls.Add($script:barra)

# Detalhes
$btnDet = New-Object System.Windows.Forms.LinkLabel
$btnDet.Text = 'Mostrar detalhes'; $btnDet.SetBounds(18, 618, 200, 20); $btnDet.LinkColor = $COR_MARCA
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
  $script:txtLog.Top = 642
  $btnInstalar.Top = 650 + $extra; $btnAbrir.Top = 650 + $extra; $btnFechar.Top = 650 + $extra; $lnkLog.Top = 662 + $extra
  $form.ClientSize = New-Object System.Drawing.Size(660, (706 + $extra))
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
  Copiar-Registro
  try { $c = AcharContratos; if ($c) { $script:txtContratos.Text = $c } } catch {}
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

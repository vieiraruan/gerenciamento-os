param(
  [string]$Destino = '',
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
$REPO     = 'https://github.com/vieiraruan/gerenciamento-os.git'
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
    Log "winget não encontrado: não dá para instalar $nome automaticamente."
    return $false
  }
  $acao = if ($Atualizar) { 'upgrade' } else { 'install' }
  Etapa-Detalhe "Instalando $nome... (pode pedir permissão de administrador)"
  [void](Executar 'winget' @($acao, '--id', $id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements'))
  AtualizarPath
  return $true
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
  if (Tem git) { Etapa-Fim 'ok' ((& git --version) -replace 'git version ', 'Versão ') }
  else { Etapa-Fim 'erro' 'Git não foi instalado.' }
  if ($script:cancelado) { return }

  # 3. Node.js
  Etapa-Inicio 'node'
  $vn = VersaoNode
  if (-not $vn) { [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js'); $vn = VersaoNode }
  elseif ($vn -lt $NODE_MIN) {
    Etapa-Detalhe "Versão $vn é antiga; atualizando..."
    [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js' -Atualizar); $vn = VersaoNode
    if ($vn -lt $NODE_MIN) { [void](Winget 'OpenJS.NodeJS.LTS' 'Node.js'); $vn = VersaoNode }
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
    if (AcharSoffice) { Etapa-Fim 'ok' 'Instalado' }
    else { Etapa-Fim 'aviso' 'Não confirmado: os PDFs podem não ser gerados.' }
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
    [void](Winget 'Google.GoogleDrive' 'Google Drive')
    Etapa-Fim 'aviso' 'Abra o Google Drive e entre com contatotaynaassessoria@gmail.com; depois rode o instalador de novo.'
  }
  if ($script:cancelado) { return }

  # 6. Projeto
  Etapa-Inicio 'repo'
  $env:GIT_TERMINAL_PROMPT = '0'
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
    Etapa-Detalhe 'Baixando... se abrir a janela do GitHub, entre com uma conta com acesso.'
    if ((Executar 'git' @('clone', '--progress', $REPO, $dest)) -eq 0) { Etapa-Fim 'ok' "Baixado em $dest" }
    else { Etapa-Fim 'erro' 'Falha ao baixar: verifique a internet e o acesso da conta ao repositório vieiraruan/gerenciamento-os.' }
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

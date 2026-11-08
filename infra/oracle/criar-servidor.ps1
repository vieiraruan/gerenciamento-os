<#
  Cria a máquina do Lotus online na Oracle (plano Sempre Gratuito) e liga o IP fixo a ela.

  O plano gratuito costuma responder "Out of host capacity" para máquinas ARM; o script tenta de novo a cada
  -Intervalo minutos até conseguir (ou até -Dias dias), primeiro 2 núcleos/12 GB e depois 1 núcleo/6 GB.
  Registro em %LOCALAPPDATA%\TaynaAlves\lotus-servidor.log; ao terminar grava lotus-servidor.json ao lado.

  Requer o OCI CLI configurado (perfil com chave de API) e a chave SSH pública do servidor.
  Uso:  powershell -File criar-servidor.ps1 -Tenancy <ocid> -Subnet <ocid> -Imagem <ocid> -IpReservado <ocid>
#>
param(
  [Parameter(Mandatory)] [string] $Tenancy,
  [Parameter(Mandatory)] [string] $Subnet,
  [Parameter(Mandatory)] [string] $Imagem,
  [Parameter(Mandatory)] [string] $IpReservado,
  [string] $Perfil = 'LOTUS',
  [string] $Ad = 'dkax:SA-SAOPAULO-1-AD-1',
  [string] $ChaveSsh = "$env:USERPROFILE\.ssh\lotus_oci.pub",
  [string] $CloudInit = (Join-Path $PSScriptRoot 'cloud-init.yaml'),
  [int] $Intervalo = 10,
  [int] $Dias = 7
)
$env:SUPPRESS_LABEL_WARNING = 'True'
$pasta = Join-Path $env:LOCALAPPDATA 'TaynaAlves'
New-Item -ItemType Directory -Force $pasta | Out-Null
$log = Join-Path $pasta 'lotus-servidor.log'
$resultado = Join-Path $pasta 'lotus-servidor.json'
function Registrar($t) { "$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')  $t" | Add-Content $log -Encoding utf8 }
$P = @('--profile', $Perfil)
$tamanhos = @('{"ocpus":2,"memoryInGBs":12}', '{"ocpus":1,"memoryInGBs":6}')
$fim = (Get-Date).AddDays($Dias)
Registrar "Início: tentando criar lotus-servidor a cada $Intervalo min até $($fim.ToString('dd/MM HH:mm'))"

# Já existe? (outra execução pode ter conseguido)
$existe = (oci compute instance list --compartment-id $Tenancy --display-name lotus-servidor @P 2>$null | ConvertFrom-Json).data |
  Where-Object { $_.'lifecycle-state' -notin 'TERMINATED', 'TERMINATING' } | Select-Object -First 1
$id = $existe.id
if ($id) { Registrar "Máquina já existe: $id" }

while (-not $id -and (Get-Date) -lt $fim) {
  foreach ($t in $tamanhos) {
    $json = $t.Replace('"', '\"')
    $r = oci compute instance launch --compartment-id $Tenancy --availability-domain $Ad --display-name lotus-servidor `
      --shape VM.Standard.A1.Flex --shape-config $json --image-id $Imagem --boot-volume-size-in-gbs 50 `
      --subnet-id $Subnet --assign-public-ip false --hostname-label lotus `
      --ssh-authorized-keys-file $ChaveSsh --user-data-file $CloudInit @P 2>&1 | Out-String
    if ($r -match '"id": "(ocid1\.instance[^"]+)"') { $id = $Matches[1]; Registrar "CRIADA ($t): $id"; break }
    $msg = ([regex]::Match($r, '"message": "([^"]+)"').Groups[1].Value)
    if (-not $msg) { $msg = ($r.Trim() -split "`n")[0] }
    Registrar "Sem vaga ($t): $msg"
    if ($msg -match 'NotAuthenticated|NotAuthorized|LimitExceeded|InvalidParameter') { Registrar 'Erro que não se resolve tentando de novo; parando.'; exit 1 }
    Start-Sleep 20
  }
  if (-not $id) { Start-Sleep ($Intervalo * 60) }
}
if (-not $id) { Registrar 'Desisti: prazo esgotado.'; exit 1 }

# Espera ligar e liga o IP fixo
oci compute instance get --instance-id $id --wait-for-state RUNNING --max-wait-seconds 900 @P | Out-Null
$vnic = (oci compute vnic-attachment list --compartment-id $Tenancy --instance-id $id @P | ConvertFrom-Json).data[0].'vnic-id'
$priv = (oci network private-ip list --vnic-id $vnic @P | ConvertFrom-Json).data | Where-Object { $_.'is-primary' } | Select-Object -First 1
oci network public-ip update --public-ip-id $IpReservado --private-ip-id $priv.id --display-name lotus-ip --wait-for-state ASSIGNED @P | Out-Null
$ip = (oci network public-ip get --public-ip-id $IpReservado @P | ConvertFrom-Json).data.'ip-address'
Registrar "PRONTA: $ip (ssh -i ~/.ssh/lotus_oci ubuntu@$ip)"
@{ instancia = $id; ip = $ip; criada = (Get-Date).ToString('s') } | ConvertTo-Json | Set-Content $resultado -Encoding utf8
try {
  Add-Type -AssemblyName System.Windows.Forms
  $n = New-Object System.Windows.Forms.NotifyIcon
  $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true
  $n.ShowBalloonTip(15000, 'Lotus', "Servidor do Lotus criado na Oracle ($ip).", 'Info'); Start-Sleep 16; $n.Dispose()
} catch {}

# Lotus online — Oracle Cloud (Sempre Gratuito)

Decisão de 08/11/2026: o teste gratuito da conta acabou e a Oracle apagou o cluster OKE; a conta é **Sempre Gratuita**
(cluster: limite 0; ARM: 2 núcleos / 12 GB). O Lotus online roda em **uma máquina ARM** (Ubuntu 24.04) com Docker.

| Recurso | Nome |
|---|---|
| Rede | VCN `pmi-vcn`, sub-rede pública `lotus-publica` (10.0.10.0/24), gateway `lotus-igw`, rotas `lotus-rotas` |
| Firewall | `lotus-firewall`: 80 e 443 abertas; 22 só do IP do PC do Ruan (atualizar se o IP mudar) |
| Máquina | `lotus-servidor`, VM.Standard.A1.Flex, disco 50 GB, `cloud-init.yaml` |
| IP fixo | IP reservado `lotus-ip` (159.112.176.211) |
| Acesso | `ssh -i ~/.ssh/lotus_oci ubuntu@<ip>` (só chave; senha desligada) |

`criar-servidor.ps1` cria a máquina tentando de novo enquanto a Oracle responder "Out of host capacity" e liga o IP fixo.
Registro em `%LOCALAPPDATA%\TaynaAlves\lotus-servidor.log`.

O CLI usa o perfil `LOTUS` de `~/.oci/config` (chave de API sem senha, só no PC do Ruan). Segredos do Lotus
(credencial do Google, segredo da sessão) ficam num `.env` só no servidor — nunca no git.

## Aplicativo no servidor (`servidor/`)

| Arquivo | Para quê |
|---|---|
| `apps/contract-generator/Dockerfile` | Imagem do Lotus: Node 22 + LibreOffice (PDF) + fontes; `HOST=0.0.0.0`, `LOTUS_LOGIN=1` |
| `docker-compose.yml` | Lotus atrás do **Caddy** (HTTPS automático do Let's Encrypt para `LOTUS_DOMINIO`) |
| `lotus-drive.service` | **rclone** monta `CONTRATOS` do Google Drive da empresa em `/srv/drive/CONTRATOS` — o Lotus lê e grava nas mesmas pastas que o computador da Tayná vê |
| `.env.exemplo` | Modelo do `.env` (domínio, credencial do Google, segredo da sessão, admins) — o `.env` real fica só no servidor |
| `instalar-servidor.sh` / `atualizar.sh` | Primeira instalação / atualizar para a última versão do GitHub |

Decisão: em vez de reescrever o acesso a arquivos para a API do Drive, o servidor monta o Drive com rclone (cache em
disco, novidades do Drive em até ~30 s). O código do Lotus é o mesmo do computador.

Atenção: enquanto o Lotus do computador e o online forem usados ao mesmo tempo, duas pessoas mexendo no mesmo
casal podem gerar conflito de arquivo no Drive. Depois da virada, usar o online; o do computador fica de reserva.

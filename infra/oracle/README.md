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

# gerenciamento-os

Sistema de gestão para assessoria de eventos: contratos, fornecedores, pagamentos,
documentos (Google Drive) e acompanhamento da produção de cada evento.

## Estrutura

```
apps/
  contract-generator/   Gerador de contratos (.txt → DOCX/PDF)   ✅
  api/                  API NestJS                                ⏳
  app/                  App Flutter (web + mobile)                ⏳
database/
  schema.sql            Modelo de dados PostgreSQL
docs/
  arquitetura.md        Decisões, fluxos e etapas
  levantamento-drive.md Estrutura atual do Google Drive e ajustes necessários
  tabela-precos.md      Tabela de preços sugerida por serviço
```

## Instalar em um computador (Windows)

1. Copie o arquivo **`instalar-sistema.cmd`** (raiz deste repositório) para o computador — por e-mail,
   pendrive ou pelo Drive — e dê dois cliques.
2. Ele instala o que faltar via `winget`: **Git**, **Node.js LTS**, **LibreOffice** (PDFs) e
   **Google Drive para computador** (pergunta antes).
3. Baixa o projeto para `Documentos\gerenciamento-os` (abre o login do GitHub na primeira vez — use uma
   conta com acesso ao repositório), roda `npm ci`, verifica o aplicativo e cria o atalho
   **"Tayna Alves Assessoria"** na Área de Trabalho.
4. Entre no Google Drive com a conta da empresa para o sistema usar a pasta `Meu Drive\CONTRATOS`.

Rodar o instalador de novo **atualiza** tudo (projeto e dependências). Além disso, o atalho busca
atualizações no GitHub sempre que o aplicativo é aberto (desligar com `SEM_ATUALIZAR=1`).

Opções: `instalar-sistema.cmd -Destino C:\outra\pasta -SemPdf -SemDrive`.

## Desenvolvimento

```bash
cd apps/contract-generator
npm ci
cp config/empresa.exemplo.json config/empresa.json   # preencha com os dados da assessoria
node src/index.js exemplos/contrato-exemplo.txt
node src/servidor.js                                 # aplicativo em http://localhost:3210
```

Veja [docs/arquitetura.md](docs/arquitetura.md) para o plano completo.

## Segurança

Senhas, chaves e tokens **nunca** entram no repositório. Use Kubernetes Secrets / OCI Vault
e arquivos `.env` locais (já ignorados pelo `.gitignore`).

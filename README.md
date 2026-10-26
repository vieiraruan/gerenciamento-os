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

## Começando

```bash
cd apps/contract-generator
npm install
cp config/empresa.exemplo.json config/empresa.json   # preencha com os dados da assessoria
node src/index.js exemplos/contrato-exemplo.txt
```

Veja [docs/arquitetura.md](docs/arquitetura.md) para o plano completo.

## Segurança

Senhas, chaves e tokens **nunca** entram no repositório. Use Kubernetes Secrets / OCI Vault
e arquivos `.env` locais (já ignorados pelo `.gitignore`).

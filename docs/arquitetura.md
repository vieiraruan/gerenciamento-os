# Arquitetura — gerenciamento-os

Sistema de gestão para assessoria de eventos: contratos, fornecedores, financeiro,
documentos e acompanhamento da produção de cada evento.

## Visão geral

```
 App Flutter: Web (navegador) + Mobile (Android / iOS)
                    │  HTTPS (JWT)
                    ▼
        API NestJS  ── namespace k8s "eventos-api"
        │      │        │
        │      │        └── Google Drive API (pastas e arquivos)
        │      └── Gerador de contratos (docxtemplater + LibreOffice → PDF)
        ▼
 PostgreSQL 16 (schema "eventos")  ── cluster já existente do PMI (OCI)
```

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Nuvem | Oracle Cloud (OKE) já usado no Sistema de Governança (PMI) | Reaproveita cluster, CI e gitops sem custo novo |
| Backend | NestJS + TypeORM (TypeScript) | Mesma stack do `pmi-platform`; reaproveita o `auth-service` |
| Banco | PostgreSQL, schema `eventos`, usuário próprio | Isolado do PMI dentro do mesmo servidor |
| Arquivos | Google Drive (continua sendo o repositório de arquivos) | A equipe já usa; o sistema cria pastas e sobe os arquivos sozinho |
| Fonte da verdade | Banco de dados (não mais a planilha) | Cálculos automáticos, sem fórmula manual; planilha pode virar espelho gerado |
| App | Flutter (web + Android + iOS) | Um único código: a equipe usa no navegador do computador e no celular; clientes podem ter acesso só de leitura |
| Numeração | `AS-NNNN` (Assessoria) e `CE-NNNN` (Cerimonial), sequência por linha | Chave do contrato e da ordem de serviço; o número antigo fica em `numero_legado` |
| Preços | Catálogo de serviços com preço de tabela e valor fechado por contrato | Base do contrato, da OS e do dashboard de descontos (ver tabela-precos.md) |
| Contratos | Modelos `.docx` com campos `{campo}` + `.txt` de dados | Equipe edita os modelos no Word/Docs sem programar |
| Segredos | Kubernetes Secrets / OCI Vault | Nunca em código, commits ou comandos |

## Estrutura de pastas no Drive (padrão atual, com o novo número)

```
CONTRATOS/
├── ASSESSORIA/
│   └── (AS-0040) ASSESSORIA NOIVA E NOIVO/
│       ├── Acompanhamento (planilha espelho, gerada pelo sistema)
│       ├── 001. Tayná Alves Assessoria/   contrato + ordem de serviço
│       ├── 003- BUFFET/
│       │   ├── contrato.pdf
│       │   └── COMPROVANTES/
│       └── 021- DECORAÇÃO/
└── CERIMONIAL/
    └── (CE-0066) CERIMONIAL NOIVA E NOIVO/
```

Hoje (gerador local), os documentos são gravados em `CONTRATOS/CONTRATOS GERADOS/` pelo Google Drive para
computador, e cadastros, numeração e dados da empresa ficam em `CONTRATOS GERADOS/_DADOS DO SISTEMA/`,
compartilhados entre as máquinas.

Detalhes do levantamento em [levantamento-drive.md](levantamento-drive.md).

## Fluxos principais

1. **Fechamento com cliente** → preenche dados (app ou `.txt`) → gera contrato → cria pasta do evento.
2. **Fechamento com fornecedor** → cadastra contrato (valor, entrada, parcelas, PIX) → anexa contrato →
   sistema cria a subpasta, gera as parcelas e registra no histórico.
3. **Pagamento** → registra valor + comprovante → arquivo vai para a pasta do fornecedor,
   parcela é baixada e o saldo/dashboard atualizam sozinhos.
4. **Alertas** → vencimentos próximos e atrasados por evento.

## Etapas

| # | Entrega | Status |
|---|---|---|
| 1 | Gerador de contratos (CLI) | ✅ contrato modular + ordem de serviço + numeração AS/CE |
| 1b | Migração: nova numeração dos 107 contratos e relatório de inconsistências | 🔄 proposta pronta, aguardando revisão |
| 2 | Base: API NestJS, banco, integração Drive, deploy no OKE (ver ajustes em levantamento-drive.md) | ⏳ |
| 3 | Financeiro: fornecedores, contratos, parcelas, comprovantes | ⏳ |
| 4 | Dashboard: visão geral (todos os contratos, por linha) e por evento | ⏳ |
| 5 | App Flutter: web + mobile | ⏳ |

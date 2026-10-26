# Arquitetura — gerenciamento-os

Sistema de gestão para assessoria de eventos: contratos, fornecedores, financeiro,
documentos e acompanhamento da produção de cada evento.

## Visão geral

```
 App Flutter (Android / iOS / Windows / macOS / Web)
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
| App | Flutter | Um único código para mobile e desktop |
| Contratos | Modelos `.docx` com campos `{campo}` + `.txt` de dados | Equipe edita os modelos no Word/Docs sem programar |
| Segredos | Kubernetes Secrets / OCI Vault | Nunca em código, commits ou comandos |

## Estrutura de pastas no Drive (mantida)

```
Eventos/
└── 2027-05-15 Casamento Maria Souza/
    ├── Acompanhamento (gerado pelo sistema)
    ├── _Contrato Cliente/
    ├── Buffet - Sabor & Arte/
    │   ├── contrato.pdf
    │   └── comprovantes/
    └── Decoração - Flor de Lis/
```

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
| 1 | Gerador de contratos (CLI) | ✅ versão inicial |
| 2 | Base: API NestJS, banco, integração Drive, deploy no OKE (ver ajustes em levantamento-drive.md) | ⏳ |
| 3 | Financeiro: fornecedores, contratos, parcelas, comprovantes | ⏳ |
| 4 | Dashboard de evolução e financeiro | ⏳ |
| 5 | App Flutter (mobile + desktop) | ⏳ |

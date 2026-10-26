# Levantamento do Google Drive — Tayná Alves Assessoria

> Levantamento feito em 26/10/2026 na conta da assessoria, somente leitura.
> Dados pessoais de clientes foram omitidos de propósito; os eventos aparecem só pelo número.

## 1. Estrutura atual de pastas

```
Meu Drive/
├── CONTRATOS/
│   ├── ASSESSORIA/                         ← um evento por pasta, numeração 0071…0104
│   │   └── (0090) ASSESSORIA NOIVA E NOIVO/
│   │       ├── ASSESSORIA - Noiva e Noivo  (planilha do evento)
│   │       ├── 001. Tayná Alves Assessoria (contrato do cliente com a assessoria)
│   │       ├── 002-LOCAL/
│   │       ├── 003- BUFFET/
│   │       │   ├── contrato buffet atualizado.pdf
│   │       │   └── COMPROVANTES/
│   │       ├── 004- DRINKS … 021 - DECORAÇÃO/
│   ├── CERIMONIAL/                         ← numeração própria (0001…0010)
│   │   └── (0007) CERIMONIAL NOIVA E NOIVO/
│   └── ACOMPANHAMENTOS/
│       ├── CONTRATOS NOVOS/
│       ├── PENDENTES / CANCELADOS/
│       └── CONTRATOS ENTREGUE, CONCLUIDOS E CANCELADOS/
├── CONTROLE FINANCEIRO/
│   ├── ACOMPANHAMENTO DO PAGAMENTO          (planilha central, uma aba por ano)
│   ├── OLD_ACOMPANHAMENTO DO PAGAMENTO.xlsx
│   └── Planilha_Financeira_Tayna.xlsx
├── MODELOS/
│   ├── MODELOS DE CONTRATOS/               (contratos, recibos, briefing, checklists, planilha-modelo)
│   └── MATERIAL DA MARCA/
├── TEMPLATE/                               (atalho p/ planilha "ASSESSORIA - Nome Noiva & Nome Noivo")
├── COMERCIAL PROPOSTA/                     (propostas comerciais por ano)
├── Espaço/Locais/
└── Diversos/
```

### Categorias de fornecedor (padrão das subpastas do evento)

| Código | Categoria | Código | Categoria |
|---|---|---|---|
| 001 | Assessoria (contrato próprio) | 012 | Iluminação |
| 002 | Local | 013 | Bolo |
| 003 | Buffet | 014 | Doces |
| 004 | Drinks | 015 | Chopp |
| 005 | Bandas | 016 | Bem casados |
| 006 | Foto e filme | 017 | Cadeiras |
| 007 | Som e estrutura | 018 | Cobertas / grid |
| 008 | Gerador | 019 | Foto lembrança |
| 009 | Celebrante | 020 | Mesa buffet |
| 010 | Vestido | 021 | Decoração |
| 011 | Cabelo e make | | |

### Observações
- **O cliente colabora na pasta.** Parte das subpastas, contratos e comprovantes do evento 0090 foi criada pela noiva, com a conta dela. O sistema precisa manter esse compartilhamento e reconhecer arquivos enviados por terceiros.
- A nomenclatura varia (`002-LOCAL `, `003- BUFFET`, `016 - BEM CASADOS`; `comprovante` × `COMPROVANTES`), o que dificulta automatizar a leitura das pastas.
- Assessoria e Cerimonial têm **sequências de numeração separadas**.

## 2. Planilha do evento (`ASSESSORIA - Noiva e Noivo`)

| Aba | Conteúdo |
|---|---|
| ASSESSORIA | Dados do evento (noivos, data, convidados, padrinhos, crianças, local, horário) + **checklist de 92 itens** divididos por fase (6, 5, 4, 3, 2 e 1 mês antes), com status, observação, estimativa, valor final e fornecedor |
| FINANCEIRO | Um fornecedor por linha (ver colunas abaixo) + totais |
| FINANCEIRO 1 | Grade de parcelas (valor/data × 10), vazia: modelo antigo |
| Lista de Convidados | Lista de convidados |
| Botões | Listas das caixas de seleção: status do checklist (EM ANDAMENTO, EM COTAÇÃO, NÃO SE APLICA, NÃO DESEJO, FINALIZADO), status de pagamento (Pago/Pendente), tipo de cerimônia, recepção (bolhas, arroz, pétalas…) |

**Colunas do FINANCEIRO:** ID · Fornecedor · Descrição · Valor contratado · % entrada · Valor da entrada ·
Status da entrada · Data da entrada · Saldo devedor · Total de parcelas · Parcelas pagas · Valor da parcela ·
Valor pago · Dia de pagamento · Valor restante · Status de quitação · PIX · Observação.

### Inconsistências encontradas (evento 0090, 28 fornecedores)

As fórmulas aparecem só em algumas linhas; nas outras, os valores foram digitados à mão. O resultado:

| Linha | Problema |
|---|---|
| Local | Valor R$ 8.500, entrada R$ 1.700 → saldo deveria ser **R$ 6.800**, está **R$ 680**. "1 parcela, 10 pagas" |
| Assessoria | 50% de R$ 3.000 = R$ 1.500, mas entrada registrada R$ 900 (o contrato prevê 30%) |
| Decoração | 30% de R$ 9.900 = R$ 2.970, mas entrada registrada R$ 5.000 |
| Bolo | 20% de R$ 1.800 = R$ 360, mas entrada R$ 484,50 |
| Chopp | 35% de R$ 2.310 = R$ 808,50, mas entrada R$ 880 |
| Dia da noiva e Bebidas | 100% pagos (R$ 4.800), mas sem valor de entrada: ficam fora do total pago |
| Datas | `26/2/06`, células em branco, formatos mistos |

**Impacto:** a planilha mostra **R$ 42.281,32 a pagar**, mas o valor correto
(R$ 88.178,32 contratados − R$ 39.777,00 pagos) é **R$ 48.401,32**: **R$ 6.120 a mais**, vindos só do erro no saldo do Local.
O total pago também aparece R$ 4.800 menor, porque as duas linhas quitadas não somam.
Isso considerando corretas as entradas digitadas, que também não conferem com os percentuais.

## 3. Planilha central (`CONTROLE FINANCEIRO / ACOMPANHAMENTO DO PAGAMENTO`)

Controla o que **os clientes devem à assessoria**. Abas por período (2023, 2024/2025, 2026/2027).

Colunas: Nº do contrato (0043…) · Noivos · Data do evento · Valor total · Serviço (texto livre) · % entrada ·
Valor da entrada · Status da entrada (PAGA / A RECEBER / CANCELADO) · Saldo devedor ·
Status do saldo (EM ABERTO / QUITADO / CANCELADO) · **Prazo de quitação (dias antes do evento: 15 ou 30)** ·
**Qtd. de equipe** · Observação · até 10 pares Valor/Data de pagamentos.

Problemas:
- **Histórico do contrato escrito dentro de uma célula** de observação, com várias datas no mesmo texto (ex.: "20/10/25 - Contrato digitado e enviado…").
- Datas inválidas ou vagas: `17/010/2026`, `fev./2027`, `17 e 19/09/2026`.
- % de entrada em branco em alguns contratos, e entrada que não confere com o % (ex.: 30% de R$ 6.000 registrado como R$ 3.800).
- Serviço em texto livre, com o mesmo pacote escrito de várias formas.

## 4. Modelos de contrato

| Arquivo | Uso |
|---|---|
| CONTRATO - ASSESSORIA - SUPERVISÃO - CERIMONIAL - FINALIZAÇÃO (Google Docs) | Casamento, modelo principal |
| CONTRATO XV ANOS - … .docx | 15 anos |
| CONTRATO BODAS - … (Google Docs) | Bodas |
| CONTRATO - SUPERVISÃO - CERIMONIAL FORMATURA.docx | Formatura |
| CONTRATO - SUPERVISÃO - CERIMONIAL - FINALIZAÇÃO (1).docx | Só cerimonial |
| RECIBO DE PAGAMENTO DA ENTRADA.docx / RECIBO DE QUITAÇÃO DE CONTRATO.docx | Recibos |
| BRIEFING DE ASSESSORIA, CHECKLIST, CHECKLIST ANIVERSÁRIO | Apoio |
| NOVA PLANILHA DE ASSESSORIA | Planilha-modelo do evento |

**O contrato é modular:** um cabeçalho (contratante + contratada), uma seção por serviço contratado, as
obrigações financeiras (entrada %, saldo, prazo de quitação, adicional por convidados e padrinhos, mudança de data),
as cláusulas comuns (repasse, substabelecimento, imagem, destination, crianças, pets, ausência, rescisão) e o foro.

**O "modelo" é, na prática, o último contrato preenchido.** Por isso ele carrega dados do cliente anterior e erros
de edição manual:
- "R$ 3.000,00 (**sete mil reais**)";
- 80, 130 e 200 convidados no mesmo documento;
- "03 (**dois**) profissionais";
- o parágrafo de repasse do contrato **repetido**;
- data de assinatura antiga.

Esse é exatamente o tipo de erro que o gerador elimina: números por extenso, percentuais e contagens passam a ser calculados.

## 5. Catálogo de serviços (Proposta Comercial 2026/2027)

| Pacote | O que é | Preço base |
|---|---|---|
| Só vou para casar | Destination wedding, completo | R$ 12.000 |
| O Essencial | Assessoria completa + supervisão de montagem | R$ 8.000 |
| O Empurrãozinho | Assessoria estratégica online (6 reuniões de 2h + visita técnica) | R$ 3.500 |
| O Necessário | Cerimonial (6h) | R$ 3.000 |
| Te Deixa Tranquila | Supervisão da montagem | R$ 800 |
| Sai na Vassoura | Finalização do evento | R$ 700 |

Regras: entrada de 30% na assinatura (reserva da data); equipe padrão de 1 coordenador + 1 assistente;
**R$ 350 por profissional adicional** (mudança de local, +50 convidados ou +2 casais de padrinhos/crianças).
Adicionais sob consulta: RSVP (concierge), Arruma Docinho e Acalma a Noiva.

## 6. Ajustes no projeto

### Banco de dados
1. `evento.numero` (`0090`) e `evento.linha` (`assessoria` | `cerimonial`), cada linha com sua sequência.
2. **Catálogo `servico`** (pacotes acima, com preço base e texto da seção do contrato) e `contrato_servico` (N:N),
   no lugar do campo de texto livre.
3. Campos do evento: horário, casais de padrinhos, crianças, tipo de cerimônia, **data flexível**
   (data exata ou "a definir" + período previsto).
4. Contrato do cliente: `prazo_quitacao_dias` (15/30, de onde sai o vencimento do saldo), `qtd_equipe`, % de entrada.
5. **`categoria_fornecedor`** com os códigos 001–021, usada para criar as subpastas no padrão atual.
6. **Checklist:** `checklist_modelo` (92 itens com fase) + `evento_checklist` (status, observação, estimativa,
   valor final, fornecedor).
7. Lista de convidados (etapa posterior).
8. O `evento_historico`, que já existe no modelo, substitui a "observação-diário" da planilha central.

### Gerador de contratos
1. Montar o contrato **por módulos**: cabeçalho + seções dos serviços escolhidos + financeiro + cláusulas comuns + foro.
   No `.txt`: `servicos: empurraozinho, te_deixa_tranquila`.
2. Calcular automaticamente: valores por extenso, entrada (%), saldo, prazo de quitação, equipe ("03 (três)"),
   convidados e padrinhos incluídos.
3. Gerar também o **recibo de entrada** e o **recibo de quitação**.
4. Modelos por tipo: casamento, XV anos, bodas, formatura.
5. Atualizar o `empresa.json` com os dados reais da contratada (CNPJ e endereço que já aparecem no contrato).

### Integração com o Drive
1. Ao fechar um contrato: criar `CONTRATOS/ASSESSORIA/(NNNN) ASSESSORIA NOIVA E NOIVO/`, com
   `001. Tayná Alves Assessoria/` e o contrato gerado dentro.
2. Ao cadastrar um fornecedor no evento: criar `NNN- CATEGORIA/` + `COMPROVANTES/` e salvar o contrato do fornecedor.
3. Ao registrar um pagamento: salvar o comprovante em `COMPROVANTES/` com nome padronizado (`AAAA-MM-DD_valor.ext`).
4. Manter a pasta compartilhada com o casal.
5. Gerar a planilha do evento como **espelho somente leitura**, com os cálculos vindos do banco e sem fórmulas manuais.

### Migração
Um importador que leia a planilha central e as planilhas dos eventos em andamento, carregue tudo no banco e
gere um **relatório de inconsistências** (como as da seção 2) para a Tayná revisar antes da virada.

## 7. Pontos a confirmar com a Tayná
- Os clientes devem continuar com acesso de edição à pasta e à planilha? No Empurrãozinho, o contrato diz que o casal preenche o financeiro.
- A numeração do Cerimonial continua separada da Assessoria?
- Os preços da proposta 2026/2027 valem como preço base, ajustado caso a caso?
- Quais modelos de contrato ainda estão em uso (há versões "logo antiga", "(1)", "FMO")?

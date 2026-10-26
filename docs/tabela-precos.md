# Tabela de preços sugerida — 2027

> Proposta para validação da Tayná. Os valores também estão em
> `apps/contract-generator/templates/servicos.json`, de onde o gerador calcula o valor do contrato
> quando `valor_total` não é informado.

## Ponto de partida

| Referência | Valor |
|---|---|
| Cerimonial no mercado do Recife | R$ 1.000 a R$ 2.800 |
| Cerimonial da Tayná (O Necessário) | **R$ 3.000**, cerca de 7% acima do topo do mercado (posicionamento premium) |
| Média praticada: supervisão + cerimonial + finalização (20 contratos) | R$ 2.095 (de R$ 1.600 a R$ 2.700) |
| Média praticada: "Só vou pra casar" (6 contratos) | R$ 8.000 (de R$ 7.500 a R$ 10.000) |

**Leitura:** o cerimonial de tabela já está no topo do mercado, mas o pacote completo do dia (três serviços) vem saindo
**abaixo do preço do cerimonial sozinho**. Os serviços de apoio (supervisão e finalização) estão sendo dados de graça.

## Critério

O cerimonial (O Necessário) é a âncora: 6 horas de evento com coordenador + assistente, mais reunião de roteiro,
ensaio e contatos com fornecedores, o que dá cerca de 18 horas-pessoa e **≈ R$ 165 por hora-pessoa**.
Os demais serviços partem do mesmo valor-hora e recebem desconto quando combinados.

| Serviço | Esforço estimado | Cálculo |
|---|---|---|
| Te Deixa Tranquila (supervisão) | 1 pessoa × 3 a 6 h | ≈ 5,5 h × R$ 165 = R$ 900 |
| Sai na Vassoura (finalização) | 1 pessoa × ≈ 3 h + check-list | ≈ 5 h × R$ 165 = R$ 800 |
| Empurrãozinho | 6 reuniões × 2 h + visita técnica + preparo | ≈ 23 h × R$ 165 = R$ 3.800 |
| O Essencial (assessoria completa) | meses de cotação, negociação, reuniões, degustações, cronograma + supervisão | ≈ 48 h × R$ 165 = R$ 8.000 |
| Produção de palco/atrações | 1 pessoa dedicada durante a festa | ≈ 7 h × R$ 165 = R$ 1.200 |

## Tabela

### Dia do evento (linha Cerimonial – CE)

| Serviço | Preço de tabela | Piso de negociação (−10%) |
|---|---|---|
| Te Deixa Tranquila – supervisão da montagem | **R$ 900** | R$ 810 |
| O Necessário – cerimonial (6 h) | **R$ 3.000** | R$ 2.700 |
| Sai na Vassoura – finalização | **R$ 800** | R$ 720 |
| **Dia D Completo** – os três juntos (R$ 4.700 avulso) | **R$ 4.200** (−11%) | R$ 3.800 |

### Planejamento (linha Assessoria – AS)

| Serviço | Preço de tabela | Piso de negociação (−10%) |
|---|---|---|
| O Empurrãozinho – assessoria estratégica online | **R$ 3.800** | R$ 3.400 |
| Empurrãozinho + Dia D Completo (R$ 8.000 somando os dois de tabela) | **R$ 7.500** (−6%) | R$ 6.800 |
| O Essencial – assessoria completa + supervisão | **R$ 8.000** | R$ 7.200 |
| **Só Vou Pra Casar** – Essencial + cerimonial + finalização + produção de palco (R$ 13.000 avulso) | **R$ 12.000** (−8%) | R$ 10.800 |

A escada vai do serviço mais simples (Sai na Vassoura, R$ 800) até o pacote completo (Só Vou Pra Casar, R$ 12.000).
Cada degrau acrescenta serviço e dá desconto progressivo, o que incentiva o cliente a subir de pacote.

### Adicionais

| Item | Valor |
|---|---|
| Profissional adicional (a cada +50 convidados, +2 casais de padrinhos ou +2 crianças) | R$ 350 (sugestão: R$ 400 a partir de 2027) |
| Destination (fora da Região Metropolitana) | +15% sobre o pacote + hospedagem e transporte da equipe por conta do contratante |
| Mudança de data sem caso fortuito | 20% do contrato (já previsto) |
| RSVP (concierge), Arruma Docinho, Acalma a Noiva | sob consulta |

**Base do contrato:** até 150 convidados, 8 casais de padrinhos e 4 crianças no cortejo; equipe de 2 profissionais.

## Impacto e transição
- O Dia D Completo passa de ≈ R$ 2.100 (média praticada) para R$ 4.200 de tabela. É um salto grande; sugestão:
  aplicar a tabela cheia nas novas propostas e usar o **piso de negociação** como limite de desconto.
- Contratos já assinados não mudam.
- O sistema registra o **preço de tabela** e o **valor fechado** de cada contrato. Assim o dashboard mostra o
  desconto médio concedido e a evolução do ticket médio.

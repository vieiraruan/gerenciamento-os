# Gerador de contratos e ordens de serviço

Lê um `.txt` com os dados do negócio fechado e gera, numa pasta `<numero> - <NOMES>`:

- `contrato.docx` / `.pdf`: contrato modular, só com as seções dos serviços contratados;
- `ordem-servico.docx` / `.pdf`: ordem de serviço do evento (cliente, evento, serviços, escala e financeiro).

## Uso

```powershell
npm.cmd install
copy config\empresa.exemplo.json config\empresa.json      # dados da contratada
copy config\sequencias.exemplo.json config\sequencias.json  # numeração atual
node src\index.js exemplos\contrato-exemplo.txt
```

Opções: `--saida pasta`, `--clientes pasta`, `--sem-pdf`, `--sem-os`.
O PDF usa o LibreOffice ou, no Windows, o Microsoft Word.

## Arquivo do contrato (.txt)

```
cliente: 123.456.789-00                 # cadastro em clientes/
servicos: empurraozinho, dia_d          # catálogo em templates/servicos.json
servicos_cortesia: te_deixa_tranquila   # opcional
evento_nomes: Maria e João
evento_data: 15/05/2027                 # ou  evento_periodo: final de julho de 2027
evento_horario: 16:00
evento_local: Espaço Villa Jardim       # vazio = "local a definir na Região Metropolitana…"
convidados: 150
casais_padrinhos: 8
criancas: 4
valor_total: 7.500,00                   # vazio = soma da tabela de preços
entrada_percentual: 30
prazo_quitacao_dias: 15
```

Veja todos os campos em `exemplos/contrato-exemplo.txt`.

### Serviços

| id | Serviço | Linha | Seções do contrato |
|---|---|---|---|
| `te_deixa_tranquila` | Te Deixa Tranquila | CE | supervisão |
| `necessario` | O Necessário | CE | cerimonial |
| `sai_na_vassoura` | Sai na Vassoura | CE | finalização |
| `dia_d` | Dia D Completo | CE | supervisão, cerimonial, finalização |
| `empurraozinho` | Empurrãozinho | AS | assessoria estratégica |
| `essencial` | O Essencial | AS | assessoria completa, supervisão |
| `so_vou_pra_casar` | Só Vou Pra Casar | AS | assessoria completa, palco, supervisão, cerimonial, finalização |

### Calculado automaticamente
- Valores e percentuais por extenso; entrada, saldo e parcelas (com os centavos na última).
- Data de vencimento do saldo (data do evento − prazo de quitação).
- Equipe: "03 (três) profissionais, sendo 01 (um) coordenador e 02 (dois) assistentes".
- Horários: chegada da supervisão e início/fim do cerimonial a partir do horário da cerimônia.
- Contagens no padrão do contrato: "150 (cento e cinquenta) convidados", "08 (oito) casais".

## Numeração (ordem de serviço)

Formato **`AS-0001`** (Assessoria) ou **`CE-0001`** (Cerimonial). Cada linha tem sequência própria.
Se tiver qualquer serviço de assessoria, o contrato é AS.

Se o `.txt` não tiver `numero_os`, o gerador reserva o próximo número em `config/sequencias.json` e grava
`numero_os: XX-NNNN` no final do `.txt`. Gerar de novo usa o mesmo número. Erros são detectados **antes** da reserva,
então nenhum número é desperdiçado.

## Cadastro de clientes

Um arquivo por cliente em `clientes/`, a partir de `clientes/_modelo.txt`. No contrato, use
`cliente: <CPF/CNPJ>` ou `cliente: <nome-do-arquivo>`. Os campos viram `{contratante_*}`.
Um `contratante_*` escrito no próprio contrato tem prioridade. Os arquivos reais **não vão para o git** (LGPD).

## Editar os modelos

`templates/contrato_casamento.docx` e `templates/ordem_servico.docx` podem ser abertos no Word para trocar
logo, fontes e texto. Mantenha os campos `{assim}` e as marcações `{#secao_x}` … `{/secao_x}` intactos, sem
formatação no meio. Para recriar os modelos do zero: `python scripts/criar_modelos.py`.

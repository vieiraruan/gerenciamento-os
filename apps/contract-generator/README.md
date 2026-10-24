# Gerador de contratos

Lê um arquivo `.txt` com os dados do negócio fechado e gera o contrato em **DOCX** e **PDF**
a partir do modelo correspondente ao tipo de serviço.

## Uso

```bash
npm install
node src/index.js exemplos/contrato-exemplo.txt            # gera em ./saida
node src/index.js dados.txt --saida "C:\contratos" --sem-pdf
```

O PDF usa o LibreOffice (`soffice`). Sem ele, só o DOCX é gerado.

## Arquivo de dados (.txt)

```
tipo_servico: assessoria_completa
cliente: 123.456.789-00
evento_data: 15/05/2027
valor_total: 18.500,00
entrada: 5.000,00
num_parcelas: 6
primeiro_vencimento: 10/12/2026
```

- Formato `chave: valor`, uma por linha; `#` é comentário.
- Valores aceitam `18.500,00`, `18500.00` ou `R$ 18.500`.
- Datas em `DD/MM/AAAA`.

## Cadastro de clientes

Os dados do cliente ficam num arquivo próprio em `clientes/`, preenchido uma única vez:

1. Copie `clientes/_modelo.txt` para, por exemplo, `clientes/maria-souza.txt` e preencha.
2. No `.txt` do contrato, escreva só a referência, pelo CPF/CNPJ (com ou sem pontuação)
   ou pelo nome do arquivo:
   ```
   cliente: 123.456.789-00
   cliente: maria-souza
   ```
3. Os campos do cadastro viram `{contratante_nome}`, `{contratante_cpf}`, `{contratante_endereco}`…
   Qualquer campo extra (ex.: `profissao`) vira `{contratante_profissao}`.

Um `contratante_*` escrito direto no contrato tem prioridade sobre o cadastro, para ajustes pontuais.
A pasta pode ficar em outro lugar (ex.: Google Drive) com `--clientes "G:\Meu Drive\Clientes"`
ou a variável de ambiente `CONTRATOS_CLIENTES`.

> Os arquivos de clientes têm dados pessoais e **não vão para o git**. Só `_modelo.txt` e
> `exemplo-*.txt` são versionados.

### Campos calculados automaticamente

| Campo | Exemplo |
|---|---|
| `{valor_total_fmt}` / `{valor_total_extenso}` | R$ 18.500,00 / dezoito mil e quinhentos reais |
| `{entrada_fmt}`, `{saldo_fmt}` (+ `_extenso`) | |
| `{#parcelas}…{/parcelas}` com `{numero}`, `{valor_fmt}`, `{vencimento}` | divide o saldo; centavos vão na última |
| `{num_parcelas_extenso}` | seis |
| `{<qualquer>_data_extenso}` | 15 de maio de 2027 |
| `{data_assinatura_extenso}` | data de hoje, se não informada |
| `{contratada_*}` | vem de `config/empresa.json` |

Campos esquecidos aparecem no documento como `[[campo NÃO INFORMADO]]`.

## Adicionar um modelo

1. Copie o contrato para `templates/<tipo>.docx` e troque os dados variáveis por `{campo}`.
   Escreva cada `{campo}` de uma vez (sem formatação no meio) para o Word não quebrar o texto.
2. Registre em `templates/modelos.json`:
   ```json
   "decoracao": {
     "descricao": "Contrato de decoração",
     "arquivo": "decoracao.docx",
     "obrigatorios": ["contratante_nome", "valor_total"]
   }
   ```
3. Use `tipo_servico: decoracao` no `.txt`.

> `templates/assessoria_completa.docx` é um **modelo de exemplo** — substitua pelos modelos reais.

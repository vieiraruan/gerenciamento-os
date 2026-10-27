# Gerador de contratos e ordens de serviço

Lê um `.txt` com os dados do negócio fechado e gera, numa pasta `<numero> - <NOMES>`:

- `contrato.docx` / `.pdf`: contrato modular, só com as seções dos serviços contratados;
- `ordem-servico.docx` / `.pdf`: ordem de serviço do evento (cliente, evento, serviços, escala e financeiro).

## Instalação (uma vez por máquina, Windows)

1. Instale o [Google Drive para computador](https://www.google.com/drive/download/) e entre com a conta da
   assessoria. A pasta `Meu Drive\CONTRATOS` precisa aparecer no Explorer.
2. Instale o Node.js: `winget install OpenJS.NodeJS.LTS`.
3. Baixe o projeto (`git clone https://github.com/vieiraruan/gerenciamento-os.git` ou ZIP do GitHub).
4. Em `apps\contract-generator`, dê dois cliques em **`instalar.cmd`**.
5. Para usar: **`abrir-aplicativo.cmd`**. Dica: crie um atalho dele na Área de Trabalho.

## Onde ficam os arquivos (Google Drive)

```
Meu Drive\CONTRATOS\
└── CONTRATOS GERADOS\
    ├── (AS-0042) ASSESSORIA DIDIER & MANUELA\               pasta do casal
    │   ├── 001. Tayná Alves Assessoria\                     contrato + ordem de serviço (.docx/.pdf)
    │   └── PLANILHA DE ASSESSORIA Didier & Manuela.xlsx      planilha do evento (modelo da empresa)
    └── _DADOS DO SISTEMA\               compartilhado entre as máquinas
        ├── *.txt                         dados de cada contrato
        ├── clientes\*.txt               cadastro de clientes
        ├── empresa.json                  dados da contratada
        └── sequencias.json               numeração AS / CE
```

**Planilha de assessoria** (criada uma vez por casal; gerar o contrato de novo **não** a sobrescreve):
é o modelo da empresa (`templates/planilha_assessoria.xlsx`, com as abas ASSESSORIA, FINANCEIRO 1, FINANCEIRO,
Botões e Lista de Convidados). O sistema preenche noivos, data, convidados, padrinhos, crianças, local e horário
na aba ASSESSORIA e a linha do contrato com a assessoria na aba FINANCEIRO; o resto (checklist, logo, listas,
fórmulas) fica igual ao modelo. Para trocar o modelo, rode
`python scripts/criar_planilha_assessoria.py "NOVA PLANILHA DE ASSESSORIA <casal>.xlsx"` com uma planilha atualizada.

A pasta do Drive é encontrada automaticamente (unidade `G:\Meu Drive`, modo espelho em
`C:\Users\<nome>\Meu Drive` ou macOS). Sem Drive, o aplicativo avisa e salva numa pasta local `contratos`.
Para forçar outro caminho: variável `CONTRATOS_DRIVE` (pasta CONTRATOS) ou `CONTRATOS_DADOS` / `CONTRATOS_SAIDA`.

> **Numeração compartilhada:** como `sequencias.json` fica no Drive, as máquinas usam a mesma sequência.
> Evite gerar contratos **novos** em duas máquinas ao mesmo tempo: espere o Drive sincronizar (ícone do Drive sem
> setas) antes de gerar na outra.

## Linha de comando

```powershell
node src\index.js "G:\Meu Drive\CONTRATOS\CONTRATOS GERADOS\_DADOS DO SISTEMA\isabele-jonas.txt"
```

Ou arraste o `.txt` em cima de **`gerar-contrato.cmd`**.
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
convidados: 150                         # informações variáveis do evento
padrinhos: 8
madrinhas: 8
criancas: 4
evento_duracao_horas: 7                 # tempo estimado; calcula o término
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
- Contagens no padrão do contrato: "150 (cento e cinquenta) convidados", "08 (oito) padrinhos".
- Cláusula **"Das informações do evento"**: data, horário, tempo estimado e término, convidados, padrinhos,
  madrinhas, crianças e equipe. Se o evento for mais longo que o cerimonial contratado, a OS e o aplicativo avisam.

## Aplicativo gráfico

`abrir-aplicativo.cmd` (ou `node src/servidor.js`) abre o formulário no navegador
(`http://localhost:3210`), com resumo em tempo real e geração do contrato e da OS.

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

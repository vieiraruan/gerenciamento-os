# Gerador de contratos e ordens de serviço

Lê um `.txt` com os dados do negócio fechado e gera, numa pasta `<numero> - <NOMES>`:

- `CT-AS-0043-271020261844MARIA-JOAO_CONTRATO-TAYNA-ALVES-ASSESSORIA.docx` / `.pdf`: contrato modular, só com as seções dos serviços contratados;
- `OS-AS-0043-271020261844MARIA-JOAO_ORDEM-SERVICO-TAYNA-ALVES-ASSESSORIA.docx` / `.pdf`: ordem de serviço do evento (cliente, evento, serviços, escala e financeiro).
  O nome traz o número, a data e hora da geração (ddmmaaaahhmm) e o casal (noiva-noivo).

## Instalação (uma vez por máquina, Windows)

Use o **`instalar-sistema.cmd`** (raiz do repositório): instala o Node.js se faltar, baixa o projeto, as dependências
e cria o atalho **Lotus** na Área de Trabalho. Rodar de novo = atualizar.

## Atualização

O atalho **Lotus** (`abrir-aplicativo.vbs`) busca a versão nova no GitHub toda vez que é aberto — também com o Lotus
já rodando em segundo plano: se houver novidade, encerra, atualiza (`scripts/atualizar.js`: `git pull`, e `npm ci` se as
dependências mudaram) e abre de novo. Sem internet, ou com arquivos alterados na cópia, abre a versão atual.

## Onde ficam os arquivos (Google Drive)

```
Meu Drive\CONTRATOS\
├── ASSESSORIA\
│   └── (AS-0043) ASSESSORIA NOIVA & NOIVO\                pasta do casal (linha AS)
│       ├── 001. Tayná Alves Assessoria\                    contrato + ordem de serviço (.docx/.pdf)
│       └── PLANILHA DE ASSESSORIA Noiva & Noivo.xlsx        planilha do evento (modelo da empresa)
├── CERIMONIAL\
│   └── (CE-0067) CERIMONIAL NOIVA & NOIVO\                pasta do casal (linha CE)
└── CONTRATOS GERADOS\
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

Um arquivo por cliente em `clientes/`, a partir de `clientes/_modelo.txt`. No aplicativo, ao digitar o **CEP** o endereço é buscado automaticamente (ViaCEP, com BrasilAPI como reserva) e o texto do contrato é montado com rua, número, complemento, bairro, cidade, UF e CEP. No contrato, use
`cliente: <CPF/CNPJ>` ou `cliente: <nome-do-arquivo>`. Os campos viram `{contratante_*}`.
Um `contratante_*` escrito no próprio contrato tem prioridade. Os arquivos reais **não vão para o git** (LGPD).

## Editar os modelos

`templates/contrato_casamento.docx` e `templates/ordem_servico.docx` podem ser abertos no Word para trocar
logo, fontes e texto. Mantenha os campos `{assim}` e as marcações `{#secao_x}` … `{/secao_x}` intactos, sem
formatação no meio. Para recriar os modelos do zero: `python scripts/criar_modelos.py`.

## Gerador de Checklist

Tela **Checklist** do aplicativo (`/checklist`). Escolha o casal e a vertente (destination pronta; sem
destination em breve). Arquivos gravados na pasta do casal (`CONTRATOS/ASSESSORIA` ou `CERIMONIAL`), sem nunca
sobrescrever ("Gerar nova versão").

### Checklist do evento + painel do dia (modelo do roteiro Hanna & Ivan)

Para o **dia do casamento**: fornecedores com responsável, telefone e horário de chegada, montagem (véspera e dia),
cronograma do dia com horário de cada atividade e programação dos outros dias.

1. **Informações do dia**: horário da cerimônia, locais, responsável e telefone da assessoria, emergência, início
   da montagem.
2. **Fornecedores e informações do dia vêm da planilha de assessoria do casal**, sozinhos, ao abrir o casal:
   - aba FINANCEIRO: fornecedor, serviço (quando a coluna Fornecedor traz o serviço, ex. "Vestido | Atelier X",
     o app inverte), detalhes da descrição na observação, celular quando aparece na descrição ou na chave PIX
     (marcado "confirmar"), categoria e se atua no dia; atrações da festa a partir dos fornecedores de música
     (com horário quando a descrição traz "22h às 0h");
   - aba ASSESSORIA: horário da cerimônia, locais, convidados, casais de padrinhos e crianças.
   Só preenche o que está vazio: o que foi editado no app é mantido. Quando a planilha muda, a próxima abertura
   completa o que for novo. Fontes: o .xlsx da pasta do casal ou a **cópia diária** das planilhas do Google
   (`_DADOS DO SISTEMA/planilhas/AS-0031.json`), gravada todo dia por um Apps Script na conta da empresa —
   instalação em `integracoes/google-apps-script/INSTALAR.md`; a tela inicial mostra quando foi a última cópia. Sem nenhuma das duas, ainda dá para "Colar do Google Planilhas" (aba FINANCEIRO).
   Telefone, responsável e horário de chegada que não estão na planilha são preenchidos na tela.
3. **Atividades do dia**: sugestões do roteiro (making of, saída para a cerimônia, recepção, bolo, buquê...) com
   horários calculados pelo horário da cerimônia; todas editáveis. As chegadas dos fornecedores entram sozinhas.
4. **Cerimônia** (tipo, celebrante, decoração, homenagem, alianças, buquê, necessidades especiais, saída, músicas
   de sala de espera / padrinhos / noivo / noiva / alianças / homenagem / saída, protocolo de fotos) e **Festa**
   (decoração, entrada dos noivos, dança, cumprimentos, buquê, uísque, kit festa, brincadeiras, bolo, fotos na mesa
   do bolo, restrições alimentares e previsão artística com início e fim de cada atração — sugeridas a partir dos
   fornecedores de música). Campos em `CAMPOS` de `src/evento.js`.
5. Só gera quando **tudo estiver preenchido** (a tela lista o que falta). Salvo automaticamente em
   `_DADOS DO SISTEMA/eventos/<contrato>.json`.

### Checklist sem destination (modelo CHECK LIST Mariana & Marco)
Na tela do Checklist, o botão "Sem destination" (padrão para contratos que não são destination) acrescenta ao
preenchimento: nome completo, pais, celular e e-mail do casal; previsão de atraso e chegada dos padrinhos;
responsável e contato dos locais; a tabela de **serviços contratados** (linhas fixas do CHECK LIST, com fornecedor
sugerido da lista de fornecedores e detalhes como quantidade, cor e modelo); **músicas e ordem do cortejo**;
crianças do cortejo; padrinhos e madrinhas com contato; informações familiares para as fotos; entrada dos
convidados, horário do jantar e reserva das mesas; notas do cerimonial; e a duração de cada atividade.
O documento sai em `templates/checklist_evento_padrao.docx` (gerado por `scripts/criar_checklist_padrao.py`)
com o cronograma Horário | Serviço | Duração | Objetos; o painel do dia ganha a aba Cortejo. O cronograma de
tarefas dessa vertente usa o modelo da NOVA PLANILHA DE ASSESSORIA (`templates/checklists/padrao.json`) e sai
como `CRONOGRAMA DE TAREFAS - <casal>.xlsx`.

Saída: `CHECKLIST DO EVENTO - <casal>.docx` (modelo `templates/checklist_evento.docx`, gerado por
`python3 scripts/criar_roteiro.py`) e `PAINEL DO EVENTO - <casal>.html` — página única que funciona sem internet
para a equipe no iPad: cronograma com marcar concluído, relógio, próximo item, atrasados em vermelho, abas Cerimônia e Festa
(com previsão artística), fornecedores com Ligar/WhatsApp, montagem e informações. As marcações ficam salvas no aparelho.
Código: `src/evento.js`, `src/roteiro.js`, `src/painel.js`, `src/xlsxLeitor.js`.

### Cronograma de tarefas

`CHECKLIST DESTINATION - <casal>.xlsx`: 106 tarefas do cronograma de 12 meses (planilha Hanna & Ivan),
**recalculadas pelos meses que faltam** até o casamento (ex.: faltando 8 meses, as tarefas de 12 e 11 meses vão para
a etapa atual). Status com cores, valores e fornecedor. `templates/checklists/destination.json`, `src/checklist.js`,
`src/xlsx.js`.

## Financeiro (`/financeiro`)
Fornecedores contratados por casal, no formato da aba FINANCEIRO da planilha de assessoria:
- **Cadastro do fornecedor** (fica salvo para outros casais: `_DADOS DO SISTEMA/fornecedores/`), com abas Fornecedor,
  Informações financeiras (valor contratado, entrada e forma, nº de parcelas, valor e 1º vencimento, PIX/banco) e
  Contrato assinado (upload).
- Cada fornecedor tem uma **pasta na pasta do casal** (`NNN. Nome`; pastas que já existem são reaproveitadas). O
  contrato e os **comprovantes** vão para ela (`COMPROVANTE - PARCELA 2 DE 7 - 10-12-2026.pdf`).
- **Registrar pagamento** (entrada, parcela ou avulso) exige o comprovante e dá baixa: atualiza pago, saldo, parcelas
  e o histórico (como a coluna Observação da planilha).
- **Painel do casal**: contratado, pago, a pagar, parcelas atrasadas, próximos pagamentos, pago × a pagar por fornecedor.
- Na 1ª abertura, importa a aba FINANCEIRO da planilha do casal (cópia diária do Google ou .xlsx). Depois disso o
  sistema é a fonte: grava `_DADOS DO SISTEMA/financeiro-google/AS-0000.json` e o Apps Script reescreve a aba
  FINANCEIRO da planilha do Google todo dia.
- Código: `src/financeiro.js`, `app/financeiro.html`, rotas `/api/financeiro`, `/api/financeiro/enviar` (arquivo no
  corpo da requisição), `/api/fornecedores`.


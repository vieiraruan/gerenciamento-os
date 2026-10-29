# Cópia diária das planilhas do Google para o aplicativo

O aplicativo não acessa o Google diretamente. Este pequeno script roda **no próprio Google**, na conta da
empresa (contatotaynaassessoria@gmail.com), uma vez por dia por volta das 6h: lê as abas FINANCEIRO e
ASSESSORIA da planilha de assessoria de cada casal e grava uma cópia em
`CONTRATOS/CONTRATOS GERADOS/_DADOS DO SISTEMA/planilhas/AS-0031.json` (um arquivo por casal).
O Google Drive para computador traz os arquivos para o PC; ao abrir o casal no Checklist, o aplicativo
pré-preenche fornecedores, informações do dia e o cronograma de tarefas — só o que mudou e só o que está vazio.

## Instalar (uma vez, ~3 minutos)
1. Entre em <https://script.google.com> **com a conta da empresa** e clique em **Novo projeto**.
2. Renomeie o projeto para `Tayná Alves – cópia das planilhas`.
3. Apague o conteúdo de `Código.gs` e cole todo o conteúdo de `SincronizarPlanilhas.gs` (esta pasta).
4. Em **Configurações do projeto** (engrenagem), confira o fuso horário: `(GMT-03:00) Recife`.
5. Volte ao editor, escolha a função **`instalar`** na barra de cima e clique em **Executar**.
6. Autorize: *Revisar permissões* → escolha a conta da empresa → *Avançado* → *Acessar … (não seguro)* →
   *Permitir*. (O aviso aparece porque o script é seu e não foi publicado; ele só lê as planilhas e grava os
   arquivos de cópia no seu próprio Drive.)
7. Pronto: a primeira cópia é feita na hora e as próximas todo dia. Em **Acionadores** (relógio) aparece o
   gatilho diário de `sincronizar`.

Para copiar na hora (sem esperar o dia seguinte): abra o projeto, escolha `sincronizar` e clique em Executar.
Para parar: execute `desinstalar`.

## Como conferir
- A tela inicial do aplicativo mostra quando foi a última cópia e se houve erro em algum casal.
- `_DADOS DO SISTEMA/planilhas/_sincronizacao.json` lista cada pasta de casal: atualizada, sem mudança,
  sem planilha ou com erro.

## Regras
- Pastas de casal: `CONTRATOS/ASSESSORIA` e `CONTRATOS/CERIMONIAL`, nome começando por `(AS-0000)` ou `(CE-0000)`.
- Planilha do casal: Google Planilhas (ou atalho para uma) com "PLANILHA" ou "ASSESSORIA" no nome, na pasta do
  casal ou numa subpasta; se houver mais de uma, a modificada mais recentemente.
- Planilhas `.xlsx` na pasta do casal continuam sendo lidas direto pelo aplicativo.

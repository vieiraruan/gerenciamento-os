# Cópia diária das planilhas do Google para o aplicativo

O aplicativo não acessa o Google diretamente. Este pequeno script roda **no próprio Google**, na conta da
empresa (contatotaynaassessoria@gmail.com), uma vez por dia por volta das 6h: lê as abas FINANCEIRO e
ASSESSORIA da planilha de assessoria de cada casal e grava uma cópia em
`CONTRATOS/CONTRATOS GERADOS/_DADOS DO SISTEMA/planilhas/AS-0031.json` (um arquivo por casal).
O Google Drive para computador traz os arquivos para o PC; ao abrir o casal no Checklist, o aplicativo
pré-preenche fornecedores, informações do dia e o cronograma de tarefas — só o que mudou e só o que está vazio.

**Financeiro:** o financeiro de cada casal é lançado no aplicativo (tela Financeiro). A cada 10 minutos (e também na
execução diária), o script reescreve a aba FINANCEIRO da planilha do casal com o que foi lançado no aplicativo — linha a linha, pelo nome do
fornecedor, sem mexer nas células com fórmula (saldo devedor, valor restante, total). Se faltar linha livre antes
do TOTAL, a situação mostra o erro e é só inserir linhas na planilha.

**Na hora (conexão direta):** publicado como *App da Web*, o script também recebe cada lançamento direto do Lotus e
escreve a aba FINANCEIRO no mesmo instante; a tela do Financeiro mostra "✔ Planilha do Google atualizada em …".
O gatilho de 10 minutos fica de reserva (computador sem internet na hora, por exemplo). Datas vão como data
(8 de novembro), não como texto — o Google Planilhas lia "08/11/2026" como 11 de agosto.

## Instalar (uma vez, ~3 minutos)
1. Entre em <https://script.google.com> **com a conta da empresa** e clique em **Novo projeto**.
2. Renomeie o projeto para `Tayná Alves – cópia das planilhas`.
3. Apague o conteúdo de `Código.gs` e cole todo o conteúdo de `SincronizarPlanilhas.gs` (esta pasta).
4. Em **Configurações do projeto** (engrenagem), confira o fuso horário: `(GMT-03:00) Recife`.
5. Volte ao editor, escolha a função **`instalar`** na barra de cima e clique em **Executar**.
6. Autorize: *Revisar permissões* → escolha a conta da empresa → *Avançado* → *Acessar … (não seguro)* →
   *Permitir*. (O aviso aparece porque o script é seu e não foi publicado; ele só lê as planilhas e grava os
   arquivos de cópia no seu próprio Drive.)
7. Pronto: a primeira cópia é feita na hora e as próximas todo dia. Em **Acionadores** (relógio) aparecem o
   gatilho diário de `sincronizar` e o de 10 em 10 minutos de `escreverFinanceiro`.

Para copiar na hora (sem esperar o dia seguinte): abra o projeto, escolha `sincronizar` e clique em Executar.
Para parar: execute `desinstalar`.

## Conexão direta com o Lotus (uma vez, ~2 minutos)
1. No projeto, **Implantar › Nova implantação** › tipo **App da Web**.
   - Descrição: `Lotus`; **Executar como:** Eu (a conta da empresa); **Quem pode acessar:** Qualquer pessoa.
   - *Qualquer pessoa* é necessário para o Lotus chamar sem login do Google; cada pedido precisa da chave secreta
     do Lotus, sem ela o script recusa.
2. **Implantar** e autorize, se pedir. Copie o **URL do app da Web** (termina em `/exec`).
3. No editor, escolha a função **`conectarLotus`** e clique em **Executar**. Ela cria a chave e grava
   `_DADOS DO SISTEMA/integracoes/google-planilhas.json` (endereço + chave), que os computadores com Lotus leem
   pelo Google Drive. Não compartilhe esse arquivo fora da empresa.
4. Ao atualizar o código depois: **Implantar › Gerenciar implantações** › editar (lápis) › Versão: *Nova versão* ›
   Implantar — o endereço continua o mesmo.

## Atualizar o script (quando o sistema ganhar novidades)
Abra o projeto em script.google.com, substitua todo o código pelo novo `SincronizarPlanilhas.gs` e salve.
Depois execute `instalar` de novo (recria os gatilhos); se o Google pedir, autorize de novo. Com a conexão direta,
publique também a nova versão (Gerenciar implantações › editar › Nova versão).

## Como conferir
- A tela inicial do aplicativo mostra quando foi a última cópia e se houve erro em algum casal.
- `_DADOS DO SISTEMA/planilhas/_sincronizacao.json` lista cada pasta de casal: atualizada, sem mudança,
  sem planilha ou com erro.

## Regras
- Pastas de casal: `CONTRATOS/ASSESSORIA` e `CONTRATOS/CERIMONIAL`, nome começando por `(AS-0000)` ou `(CE-0000)`.
- Planilha do casal: Google Planilhas (ou atalho para uma) com "PLANILHA" ou "ASSESSORIA" no nome, na pasta do
  casal ou numa subpasta; se houver mais de uma, a modificada mais recentemente.
- Planilhas `.xlsx` na pasta do casal (ex.: as criadas pelo Gerador de Contratos) são lidas e escritas direto pelo
  aplicativo, na hora de cada lançamento — o script não mexe nelas.

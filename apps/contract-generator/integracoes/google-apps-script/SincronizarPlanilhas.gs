/**
 * Tayná Alves Assessoria — cópia diária das planilhas de assessoria (Google Planilhas) para o aplicativo.
 *
 * Roda no Google (Apps Script), na conta dona do Drive da empresa, uma vez por dia. Para cada pasta de casal
 * em  Meu Drive / CONTRATOS / ASSESSORIA  e  CERIMONIAL  — "(AS-0031) ASSESSORIA NOMES" —, encontra a planilha
 * de assessoria (Google Planilhas, ou atalho para ela) e grava as abas FINANCEIRO e ASSESSORIA em
 *     CONTRATOS / CONTRATOS GERADOS / _DADOS DO SISTEMA / planilhas / AS-0031.json
 * O Google Drive para computador traz o arquivo para o PC e o aplicativo pré-preenche o checklist com ele.
 * Só regrava quando a planilha mudou. A situação da última execução fica em planilhas/_sincronizacao.json.
 *
 * FINANCEIRO: o financeiro é lançado no aplicativo, que grava _DADOS DO SISTEMA/financeiro-google/AS-0031.json.
 * Antes da cópia, o script reescreve a aba FINANCEIRO da planilha do casal com esses dados (linha a linha, pelo
 * nome do fornecedor; células com fórmula — saldo, valor restante, total — não são tocadas).
 *
 * CONEXÃO DIRETA (na hora): o script também é publicado como "App da Web". O Lotus envia cada lançamento para
 * doPost, que escreve a aba FINANCEIRO na hora e responde. `conectarLotus` grava o endereço e a chave em
 * _DADOS DO SISTEMA/integracoes/google-planilhas.json, onde o Lotus os lê. O gatilho de 10 minutos continua
 * como reserva (por exemplo, se o computador estava sem internet no momento do lançamento).
 *
 * Instalação (uma vez): ver INSTALAR.md nesta pasta — colar este código em script.google.com, executar
 * `instalar` e autorizar. Nada é enviado para fora do Google Drive da própria conta.
 */

const RAIZ = 'CONTRATOS';
const LINHAS = ['ASSESSORIA', 'CERIMONIAL'];
const CAMINHO_DADOS = ['CONTRATOS GERADOS', '_DADOS DO SISTEMA'];
const ABAS = ['FINANCEIRO', 'ASSESSORIA'];
const HORA = 6; // por volta das 6h (fuso do projeto: America/Recife)

const GATILHOS = ['sincronizar', 'escreverFinanceiro'];

/**
 * Executar uma vez: cria os gatilhos e faz a primeira cópia.
 *  - sincronizar: todo dia por volta das 6h (cópia das planilhas + financeiro)
 *  - escreverFinanceiro: a cada 10 minutos (só escreve a aba FINANCEIRO quando houve lançamento no aplicativo)
 */
function instalar() {
  desinstalar();
  ScriptApp.newTrigger('sincronizar').timeBased().everyDays(1).atHour(HORA).create();
  ScriptApp.newTrigger('escreverFinanceiro').timeBased().everyMinutes(10).create();
  sincronizar();
}

/** Remove os gatilhos. */
function desinstalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => GATILHOS.indexOf(t.getHandlerFunction()) >= 0)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

/** A cada 10 minutos: escreve na aba FINANCEIRO o que foi lançado no aplicativo (nada a fazer = sai rápido). */
function escreverFinanceiro() {
  const raiz = pasta_(DriveApp.getRootFolder(), RAIZ);
  if (!raiz) return;
  let dados = raiz;
  for (const n of CAMINHO_DADOS) { dados = pasta_(dados, n); if (!dados) return; }
  const res = escreverFinanceiro_(raiz, dados);
  if (!res.length) return;
  const destino = pasta_(dados, 'planilhas');
  const s = destino && arquivo_(destino, '_sincronizacao.json');
  if (!s) return;
  try {
    const j = JSON.parse(s.getBlob().getDataAsString('UTF-8'));
    j.financeiro_em = new Date().toISOString();
    j.financeiro = res;
    s.setContent(JSON.stringify(j, null, 1));
  } catch (e) { /* situação ilegível: a cópia diária regrava */ }
}

/**
 * Conexão direta com o Lotus. Executar UMA vez depois de publicar o script como App da Web (Implantar › Nova
 * implantação › App da Web; Executar como: eu; Quem pode acessar: qualquer pessoa). Cria a chave e grava o
 * endereço para o Lotus em _DADOS DO SISTEMA/integracoes/google-planilhas.json.
 */
function conectarLotus(endereco) {
  const props = PropertiesService.getScriptProperties();
  let chave = props.getProperty('LOTUS_CHAVE');
  if (!chave) {
    chave = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('LOTUS_CHAVE', chave);
  }
  const url = typeof endereco === 'string' && endereco ? endereco : ScriptApp.getService().getUrl();
  if (!url || !/\/exec$/.test(url)) {
    throw new Error('Publique o script como App da Web antes (Implantar › Nova implantação) e rode de novo. Endereço: ' + url);
  }
  const raiz = pasta_(DriveApp.getRootFolder(), RAIZ);
  if (!raiz) throw new Error(`Pasta "${RAIZ}" não encontrada no Meu Drive.`);
  let dados = raiz;
  CAMINHO_DADOS.forEach((n) => { dados = pasta_(dados, n) || dados.createFolder(n); });
  const dir = pasta_(dados, 'integracoes') || dados.createFolder('integracoes');
  const conteudo = JSON.stringify({ url, chave, criado_em: new Date().toISOString() }, null, 1);
  const arq = arquivo_(dir, 'google-planilhas.json');
  if (arq) arq.setContent(conteudo); else dir.createFile('google-planilhas.json', conteudo, 'application/json');
  Logger.log('Lotus conectado: ' + url);
}

/** O Lotus envia { chave, numero, gerado_em, linhas } e recebe { ok, linhas, em } ou { erro }. */
function doPost(e) {
  const responder = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  let pedido;
  try { pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return responder({ erro: 'pedido inválido' }); }
  const props = PropertiesService.getScriptProperties();
  const chave = props.getProperty('LOTUS_CHAVE');
  if (!chave || pedido.chave !== chave) return responder({ erro: 'chave inválida' });
  const numero = String(pedido.numero || '').toUpperCase();
  if (!/^(AS|CE)-\d{4}$/.test(numero)) return responder({ erro: 'número do contrato inválido' });
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) return responder({ erro: 'planilhas ocupadas, tente de novo' });
  try {
    const raiz = pasta_(DriveApp.getRootFolder(), RAIZ);
    const casal = raiz && acharPastaCasal_(raiz, numero);
    if (!casal) return responder({ erro: 'pasta do casal não encontrada no Drive' });
    const pl = acharPlanilha_(casal, 0);
    if (!pl) return responder({ erro: 'planilha do casal não encontrada' });
    const sh = SpreadsheetApp.openById(pl.id).getSheetByName('FINANCEIRO');
    if (!sh) return responder({ erro: 'planilha sem aba FINANCEIRO' });
    const n = escreverAba_(sh, pedido.linhas || []);
    SpreadsheetApp.flush();
    if (pedido.gerado_em) props.setProperty(`fin:${numero}`, pedido.gerado_em); // o gatilho de 10 min não repete
    return responder({ ok: true, linhas: n, planilha: pl.nome || '', em: new Date().toISOString() });
  } catch (x) {
    return responder({ erro: String(x && x.message || x) });
  } finally {
    trava.releaseLock();
  }
}

function sincronizar() {
  const raiz = pasta_(DriveApp.getRootFolder(), RAIZ);
  if (!raiz) throw new Error(`Pasta "${RAIZ}" não encontrada no Meu Drive.`);
  let dados = raiz;
  CAMINHO_DADOS.forEach((n) => { dados = pasta_(dados, n) || dados.createFolder(n); });
  const destino = pasta_(dados, 'planilhas') || dados.createFolder('planilhas');

  // 1) aplicativo → aba FINANCEIRO das planilhas
  const financeiro = escreverFinanceiro_(raiz, dados);

  // 2) planilhas → cópia para o aplicativo
  const itens = [];
  LINHAS.forEach((nomeLinha) => {
    const linha = pasta_(raiz, nomeLinha);
    if (!linha) return;
    const it = linha.getFolders();
    while (it.hasNext()) {
      const casal = it.next();
      const m = /^\(((?:AS|CE)-\d{4})\)/i.exec(casal.getName());
      if (!m) continue;
      const numero = m[1].toUpperCase();
      const item = { numero, pasta: casal.getName() };
      try {
        const pl = acharPlanilha_(casal, 0);
        if (!pl) { item.sem_planilha = true; itens.push(item); continue; }
        item.planilha = pl.nome;
        const modificada = pl.atualizada.toISOString();
        const arqNome = `${numero}.json`;
        const existente = arquivo_(destino, arqNome);
        if (existente) {
          try {
            const antigo = JSON.parse(existente.getBlob().getDataAsString('UTF-8'));
            if (antigo.fonte && antigo.fonte.id === pl.id && antigo.fonte.modificada_em === modificada) {
              item.sem_mudanca = true; itens.push(item); continue;
            }
          } catch (e) { /* regrava */ }
        }
        const ss = SpreadsheetApp.openById(pl.id);
        const abas = {};
        ABAS.forEach((n) => {
          const sh = ss.getSheetByName(n);
          if (sh) abas[n] = sh.getDataRange().getDisplayValues();
        });
        const json = JSON.stringify({
          formato: 2,
          fonte: { tipo: 'google', id: pl.id, titulo: ss.getName(), url: ss.getUrl(), modificada_em: modificada, pasta: casal.getName(), numero },
          lido_em: new Date().toISOString(),
          abas,
        });
        if (existente) existente.setContent(json);
        else destino.createFile(arqNome, json, 'application/json');
        item.atualizada = true;
      } catch (e) {
        item.erro = String(e && e.message || e);
      }
      itens.push(item);
    }
  });

  const situacao = JSON.stringify({ executado_em: new Date().toISOString(), itens, financeiro }, null, 1);
  const s = arquivo_(destino, '_sincronizacao.json');
  if (s) s.setContent(situacao); else destino.createFile('_sincronizacao.json', situacao, 'application/json');
}

// Planilha de assessoria do casal: Google Planilhas (ou atalho) com "planilha"/"assessoria" no nome; a mais
// recente. Procura na pasta do casal e um nível abaixo.
function acharPlanilha_(pasta, nivel) {
  let melhor = null;
  const considerar = (id, nome, atualizada) => {
    if (!/planilha|assessoria/i.test(nome) || /compilado|comparativ|or[cç]amento|convidados/i.test(nome)) return;
    if (!melhor || atualizada > melhor.atualizada) melhor = { id, nome, atualizada };
  };
  const arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    const f = arquivos.next();
    const tipo = f.getMimeType();
    if (tipo === MimeType.GOOGLE_SHEETS) considerar(f.getId(), f.getName(), f.getLastUpdated());
    else if (tipo === MimeType.SHORTCUT && f.getTargetMimeType() === MimeType.GOOGLE_SHEETS) {
      try { const alvo = DriveApp.getFileById(f.getTargetId()); considerar(alvo.getId(), f.getName(), alvo.getLastUpdated()); } catch (e) { /* sem acesso */ }
    }
  }
  if (nivel < 1) {
    const subs = pasta.getFolders();
    while (subs.hasNext()) {
      const r = acharPlanilha_(subs.next(), nivel + 1);
      if (r && (!melhor || r.atualizada > melhor.atualizada)) melhor = r;
    }
  }
  return melhor;
}

// ---------------------------------------------------------------------------
// Aplicativo → aba FINANCEIRO
// ---------------------------------------------------------------------------
const norm_ = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
// nomes de coluna equivalentes entre o modelo antigo e o novo da planilha
const SINONIMOS = {
  'numero de parcelas': ['numero de parcelas', 'total de parcelas'],
  'numero de parcelas pagas': ['numero de parcelas pagas', 'parcelas pagas'],
  'status do pagamento': ['status do pagamento', 'status de quitacao'],
  'descricao do servico observacao': ['descricao do servico observacao'],
};

function escreverFinanceiro_(raiz, dados) {
  const pastaFin = pasta_(dados, 'financeiro-google');
  if (!pastaFin) return [];
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(60000)) return [];
  try { return escreverFinanceiroTravado_(raiz, pastaFin); } finally { trava.releaseLock(); }
}

function escreverFinanceiroTravado_(raiz, pastaFin) {
  const props = PropertiesService.getScriptProperties();
  const res = [];
  const arquivos = pastaFin.getFiles();
  while (arquivos.hasNext()) {
    const arq = arquivos.next();
    const m = /^((?:AS|CE)-\d{4})\.json$/i.exec(arq.getName());
    if (!m) continue;
    const numero = m[1].toUpperCase();
    const r = { numero };
    try {
      const j = JSON.parse(arq.getBlob().getDataAsString('UTF-8'));
      if (props.getProperty(`fin:${numero}`) === j.gerado_em) continue; // já escrito
      const casal = acharPastaCasal_(raiz, numero);
      if (!casal) { r.erro = 'pasta do casal não encontrada'; res.push(r); continue; }
      const pl = acharPlanilha_(casal, 0);
      if (!pl) { r.erro = 'planilha não encontrada'; res.push(r); continue; }
      const sh = SpreadsheetApp.openById(pl.id).getSheetByName('FINANCEIRO');
      if (!sh) { r.erro = 'planilha sem aba FINANCEIRO'; res.push(r); continue; }
      r.linhas = escreverAba_(sh, j.linhas || []);
      props.setProperty(`fin:${numero}`, j.gerado_em);
      r.escrito = true;
    } catch (e) { r.erro = String(e && e.message || e); }
    res.push(r);
  }
  return res;
}

function acharPastaCasal_(raiz, numero) {
  for (const nomeLinha of LINHAS) {
    const linha = pasta_(raiz, nomeLinha);
    if (!linha) continue;
    const it = linha.getFolders();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().toUpperCase().indexOf(`(${numero})`) === 0) return f;
    }
  }
  return null;
}

function escreverAba_(sh, linhas) {
  const faixa = sh.getDataRange();
  const valores = faixa.getDisplayValues();
  const formulas = faixa.getFormulas();
  const iCab = valores.findIndex((l) => l.some((c) => norm_(c) === 'fornecedor'));
  if (iCab < 0) throw new Error('cabeçalho "Fornecedor" não encontrado');
  const cab = valores[iCab].map(norm_);
  const coluna = (nome) => {
    const alvos = SINONIMOS[norm_(nome)] || [norm_(nome)];
    return cab.findIndex((c) => alvos.indexOf(c) >= 0);
  };
  const cNome = coluna('Fornecedor');
  let iTotal = valores.findIndex((l, i) => i > iCab && l.some((c) => /^total\s*:?$/i.test(String(c).trim())));
  if (iTotal < 0) iTotal = valores.length;
  const usadas = new Set();
  let escritas = 0;
  // primeiro os ativos, depois os fornecedores retirados no aplicativo (_remover: a linha deles é limpa)
  const ordem = linhas.filter((l) => !l._remover).concat(linhas.filter((l) => l._remover));
  ordem.forEach((linha) => {
    const nome = norm_(linha['Fornecedor']);
    let i = -1;
    for (let k = iCab + 1; k < iTotal; k++) if (!usadas.has(k) && norm_(valores[k][cNome]) === nome) { i = k; break; }
    if (linha._remover) {
      if (i < 0) return;
      usadas.add(i);
      cab.forEach((c, col) => { if (c && !formulas[i][col]) sh.getRange(i + 1, col + 1).setValue(''); });
      escritas++;
      return;
    }
    if (i < 0) for (let k = iCab + 1; k < iTotal; k++) if (!usadas.has(k) && !String(valores[k][cNome]).trim()) { i = k; break; }
    if (i < 0) throw new Error(`sem linha livre na aba FINANCEIRO para "${linha['Fornecedor']}" (inclua linhas antes do TOTAL)`);
    usadas.add(i);
    Object.keys(linha).forEach((campo) => {
      if (campo.charAt(0) === '_') return;
      const c = coluna(campo);
      if (c < 0 || formulas[i][c]) return; // coluna que não existe neste modelo ou célula com fórmula
      sh.getRange(i + 1, c + 1).setValue(valorCelula_(campo, linha[campo]));
    });
    escritas++;
  });
  return escritas;
}

/** "08/11/2026" numa coluna de data vira a data 8 de novembro (sem depender do idioma da planilha). */
function valorCelula_(campo, v) {
  if (v === null || v === undefined) return '';
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v).trim());
  if (m && /data/i.test(campo)) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return v;
}

function pasta_(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : null;
}

function arquivo_(pai, nome) {
  const it = pai.getFilesByName(nome);
  return it.hasNext() ? it.next() : null;
}

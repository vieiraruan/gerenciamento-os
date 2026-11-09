/**
 * Conexão direta com a planilha do Google do casal (aba FINANCEIRO).
 *
 * O Apps Script "atualizacao_diaria" é publicado como App da Web e `conectarLotus` grava o endereço e a chave em
 * _DADOS DO SISTEMA/integracoes/google-planilhas.json. Depois de cada lançamento o Lotus envia as linhas para lá e a
 * aba é escrita na hora. Sem a conexão (ou sem internet) fica valendo o gatilho de 10 minutos do Apps Script, que lê
 * financeiro-google/<AS>.json.
 */
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join('integracoes', 'google-planilhas.json');

function configuracao(dirDados) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(dirDados, ARQUIVO), 'utf8'));
    const valido = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(c.url)
      || (process.env.LOTUS_TESTE_GOOGLE_PLANILHAS === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(c.url)); // só nos testes
    return c && valido && c.chave ? c : null;
  } catch { return null; }
}

/**
 * Envia o arquivo financeiro-google/<numero>.json (o mesmo que o gatilho de 10 min usa) para a planilha.
 * Nunca lança erro: devolve { ok, em, linhas, planilha } ou { erro, em } ou { pendente: true } (sem conexão direta).
 */
async function enviarFinanceiro(dirDados, numero, { fetchFn = globalThis.fetch, tempo = 30000 } = {}) {
  const em = () => new Date().toISOString();
  const conf = configuracao(dirDados);
  if (!conf) return { pendente: true, em: em() };
  let pacote;
  try {
    pacote = JSON.parse(fs.readFileSync(path.join(dirDados, 'financeiro-google', `${String(numero).trim()}.json`), 'utf8'));
  } catch {
    return { erro: 'dados do financeiro para a planilha não encontrados', em: em() };
  }
  const corpo = JSON.stringify({ chave: conf.chave, numero: pacote.numero, gerado_em: pacote.gerado_em, linhas: pacote.linhas });
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tempo);
  try {
    // o Apps Script responde com um redirecionamento para o resultado (o fetch segue sozinho)
    const r = await fetchFn(conf.url, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow' });
    const texto = await r.text();
    let j;
    try { j = JSON.parse(texto); } catch { return { erro: `resposta inesperada do Google (HTTP ${r.status})`, em: em() }; }
    if (j.ok) return { ok: true, em: j.em || em(), linhas: j.linhas, planilha: j.planilha || '' };
    return { erro: j.erro || 'o Google recusou a atualização', em: em() };
  } catch (e) {
    return { erro: e.name === 'AbortError' ? 'o Google demorou para responder' : 'sem conexão com o Google', em: em() };
  } finally {
    clearTimeout(t);
  }
}

module.exports = { configuracao, enviarFinanceiro, ARQUIVO };

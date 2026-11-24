'use strict';

/**
 * Avisos no celular da Tayná quando chega um pedido do site (além do e-mail).
 *
 * Canais (configurados no Lotus › Pedidos do site › Avisos no celular; ficam em
 * _DADOS DO SISTEMA/integracoes/avisos.json — não compartilhar):
 *  - notificacao: app gratuito ntfy (Android/iPhone) inscrito num tópico secreto gerado pelo Lotus.
 *  - whatsapp: CallMeBot (grátis, uso pessoal): mensagem no WhatsApp da própria Tayná. Ela pega a chave
 *    mandando "I allow callmebot to send me messages" para o número do bot (callmebot.com).
 * As mensagens levam só o primeiro nome, a data e o serviço, mais o link do pedido no Lotus.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO = path.join('integracoes', 'avisos.json');
const NTFY = 'https://ntfy.sh';

function configuracao(dirDados) {
  try { return JSON.parse(fs.readFileSync(path.join(dirDados, ARQUIVO), 'utf8')) || {}; } catch { return {}; }
}

/** Para a tela: sem a chave do WhatsApp (só se existe). */
function publico(c) {
  const n = c.notificacao || {}; const w = c.whatsapp || {};
  return {
    notificacao: { ativo: Boolean(n.ativo && n.topico), topico: n.topico || '', link: n.topico ? `${NTFY}/${n.topico}` : '' },
    whatsapp: { ativo: Boolean(w.ativo && w.telefone && w.apikey), telefone: w.telefone || '', tem_chave: Boolean(w.apikey) },
  };
}

const novoTopico = () => `lotus-tayna-${crypto.randomBytes(12).toString('hex')}`;
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

/** Salva o que veio da tela. A chave do WhatsApp só muda quando uma nova é informada. */
function salvar(dirDados, d = {}) {
  const atual = configuracao(dirDados);
  const n = { ...(atual.notificacao || {}) };
  if (d.notificacao) {
    n.ativo = Boolean(d.notificacao.ativo);
    if (d.notificacao.novo_topico || (n.ativo && !n.topico)) n.topico = novoTopico();
  }
  const w = { ...(atual.whatsapp || {}) };
  if (d.whatsapp) {
    w.ativo = Boolean(d.whatsapp.ativo);
    if (typeof d.whatsapp.telefone === 'string') {
      const dig = soDigitos(d.whatsapp.telefone);
      if (w.ativo && dig.length < 12) throw new Error('Informe o WhatsApp com o país e o DDD (ex.: +55 81 99999-9999).');
      w.telefone = dig ? `+${dig}` : '';
    }
    if (typeof d.whatsapp.apikey === 'string' && d.whatsapp.apikey.trim()) {
      const k = d.whatsapp.apikey.trim();
      if (!/^[\w-]{4,64}$/.test(k)) throw new Error('Chave do CallMeBot inválida (só números e letras).');
      w.apikey = k;
    }
    if (w.ativo && !w.apikey) throw new Error('Informe a chave (apikey) que o CallMeBot mandou no WhatsApp.');
  }
  const novo = { ...atual, notificacao: n, whatsapp: w, atualizado_em: new Date().toISOString() };
  const arq = path.join(dirDados, ARQUIVO);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, JSON.stringify(novo, null, 2));
  return publico(novo);
}

async function comTempo(fetchFn, url, opcoes, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetchFn(url, { ...opcoes, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/**
 * Envia o aviso por todos os canais ativos. Nunca lança erro: devolve { canal: { ok } | { erro } }.
 * @param {{ titulo: string, texto: string, link?: string }} msg
 */
async function enviar(dirDados, msg, { fetchFn = globalThis.fetch, base = NTFY } = {}) {
  const c = configuracao(dirDados);
  const res = {};
  const n = c.notificacao || {};
  if (n.ativo && n.topico) {
    try {
      const r = await comTempo(fetchFn, base, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: n.topico, title: msg.titulo, message: msg.texto, click: msg.link || undefined, tags: ['cherry_blossom'], priority: 4 }) });
      res.notificacao = r.ok ? { ok: true } : { erro: `ntfy respondeu ${r.status}` };
    } catch (e) { res.notificacao = { erro: e.name === 'AbortError' ? 'sem resposta do ntfy' : e.message }; }
  }
  const w = c.whatsapp || {};
  if (w.ativo && w.telefone && w.apikey) {
    try {
      const texto = `*${msg.titulo}*\n${msg.texto}${msg.link ? `\n${msg.link}` : ''}`;
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(w.telefone)}&apikey=${encodeURIComponent(w.apikey)}&text=${encodeURIComponent(texto)}`;
      const r = await comTempo(fetchFn, url, { method: 'GET' }, 25000);
      const corpo = await r.text().catch(() => '');
      // o CallMeBot responde 200 com uma página; erros vêm escritos no corpo
      res.whatsapp = r.ok && !/(APIKey is invalid|ERROR|not activated|blocked)/i.test(corpo) ? { ok: true }
        : { erro: (corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)) || `CallMeBot respondeu ${r.status}` };
    } catch (e) { res.whatsapp = { erro: e.name === 'AbortError' ? 'sem resposta do CallMeBot' : e.message }; }
  }
  return { ...res, em: new Date().toISOString() };
}

module.exports = { configuracao, publico, salvar, enviar, ARQUIVO };

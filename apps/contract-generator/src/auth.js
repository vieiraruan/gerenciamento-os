'use strict';

/**
 * Login do Lotus online: "Entrar com Google" (OpenID Connect) só para e-mails cadastrados, com perfis.
 *
 *   admin  — tudo (Tayná, Ruan)
 *   equipe — tela inicial, checklist e eventos; sem financeiro, gestão, gerador de contratos e valores
 *   casal  — só o próprio evento (portal do casal)
 *
 * Ligado com LOTUS_LOGIN=1 (o servidor na nuvem). No computador (127.0.0.1, sem LOTUS_LOGIN) o Lotus abre sem
 * login, como sempre.
 *
 * Configuração (variáveis de ambiente — na nuvem vêm de um Secret do Kubernetes / OCI Vault, nunca do git):
 *   LOTUS_URL              endereço público, ex.: https://lotus.exemplo.com.br (redirecionamento do Google)
 *   GOOGLE_CLIENT_ID       credencial OAuth "Aplicativo da Web" do Google Cloud
 *   GOOGLE_CLIENT_SECRET
 *   LOTUS_SESSAO_SEGREDO   32+ caracteres aleatórios (assina os cookies)
 *   LOTUS_ADMINS           e-mails que são sempre admin (separados por vírgula), para o primeiro acesso
 *
 * Segurança: state + nonce + PKCE no fluxo do Google; id_token recebido direto do Google por TLS e conferido
 * (emissor, audiência, validade, nonce, e-mail verificado); sessão em cookie HttpOnly/Secure/SameSite=Lax assinado
 * com HMAC-SHA256 e com prazo; o usuário é conferido na lista a cada requisição (remover ou trocar o perfil vale na
 * hora); POST só da própria origem.
 */
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const PAPEIS = ['admin', 'equipe', 'casal'];
const DURACAO_SESSAO = 12 * 60 * 60; // 12 h
const COOKIE_SESSAO = 'lotus_sessao';
const COOKIE_OAUTH = 'lotus_oauth';
const EMISSORES = ['accounts.google.com', 'https://accounts.google.com'];

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const deB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const aleatorio = (n = 32) => b64url(crypto.randomBytes(n));
const normEmail = (e) => String(e || '').trim().toLowerCase();

function configuracao(env = process.env) {
  const ativo = /^(1|sim|true)$/i.test(env.LOTUS_LOGIN || '');
  const c = {
    ativo,
    url: String(env.LOTUS_URL || '').replace(/\/+$/, ''),
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    segredo: env.LOTUS_SESSAO_SEGREDO || '',
    admins: String(env.LOTUS_ADMINS || '').split(/[,;\s]+/).map(normEmail).filter(Boolean),
    // só para testes automáticos (servidor falso do Google)
    tokenUrl: env.LOTUS_TESTE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
  };
  if (ativo) {
    const faltam = [];
    if (!/^https:\/\//.test(c.url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(c.url)) faltam.push('LOTUS_URL (https://...)');
    if (!c.clientId) faltam.push('GOOGLE_CLIENT_ID');
    if (!c.clientSecret) faltam.push('GOOGLE_CLIENT_SECRET');
    if (c.segredo.length < 32) faltam.push('LOTUS_SESSAO_SEGREDO (32+ caracteres)');
    if (faltam.length) throw new Error(`Login ligado (LOTUS_LOGIN=1), mas falta configurar: ${faltam.join(', ')}`);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Usuários (arquivo _DADOS DO SISTEMA/usuarios.json; depois, tabela do PostgreSQL)
// ---------------------------------------------------------------------------
function criarUsuarios(arquivo, admins = []) {
  let cache = null; let mtime = 0;
  const ler = () => {
    try {
      const m = fs.statSync(arquivo).mtimeMs;
      if (!cache || m !== mtime) { cache = JSON.parse(fs.readFileSync(arquivo, 'utf8')); mtime = m; }
    } catch { cache = { usuarios: [] }; mtime = 0; }
    return cache;
  };
  const gravar = (d) => {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const tmp = `${arquivo}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
    fs.renameSync(tmp, arquivo);
    cache = null;
  };
  return {
    listar() {
      const d = ler();
      const lista = d.usuarios.map((u) => ({ ...u }));
      for (const e of admins) if (!lista.some((u) => u.email === e)) lista.push({ email: e, nome: '', papel: 'admin', fixo: true, versao: 1 });
      return lista;
    },
    obter(email) {
      email = normEmail(email);
      return this.listar().find((u) => u.email === email && !u.bloqueado) || null;
    },
    salvar(dados, autor) {
      const email = normEmail(dados.email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
      if (!PAPEIS.includes(dados.papel)) throw new Error('Perfil inválido.');
      if (dados.papel === 'casal' && !dados.casal) throw new Error('Escolha o casal (contrato) deste acesso.');
      const d = ler();
      const i = d.usuarios.findIndex((u) => u.email === email);
      const antes = i >= 0 ? d.usuarios[i] : null;
      const u = {
        email, nome: String(dados.nome || '').trim(), papel: dados.papel, casal: dados.papel === 'casal' ? String(dados.casal) : '',
        bloqueado: Boolean(dados.bloqueado),
        // trocar perfil/casal ou bloquear encerra as sessões abertas
        versao: antes ? ((antes.papel !== dados.papel || antes.casal !== (dados.casal || '') || Boolean(dados.bloqueado)) ? (antes.versao || 1) + 1 : (antes.versao || 1)) : 1,
        criado_em: antes?.criado_em || new Date().toISOString(), criado_por: antes?.criado_por || autor || '',
        atualizado_em: new Date().toISOString(),
      };
      if (i >= 0) d.usuarios[i] = u; else d.usuarios.push(u);
      gravar({ ...d, usuarios: d.usuarios });
      return u;
    },
    remover(email) {
      email = normEmail(email);
      if (admins.includes(email)) throw new Error('Este e-mail é admin fixo (LOTUS_ADMINS) e não pode ser removido por aqui.');
      const d = ler();
      gravar({ ...d, usuarios: d.usuarios.filter((u) => u.email !== email) });
    },
    encerrarSessoes(email) {
      email = normEmail(email);
      const d = ler();
      const u = d.usuarios.find((x) => x.email === email);
      if (!u) throw new Error('Usuário não encontrado.');
      u.versao = (u.versao || 1) + 1;
      gravar(d);
    },
  };
}

// ---------------------------------------------------------------------------
// Cookies assinados
// ---------------------------------------------------------------------------
function assinar(segredo, obj) {
  const corpo = b64url(JSON.stringify(obj));
  const mac = b64url(crypto.createHmac('sha256', segredo).update(corpo).digest());
  return `${corpo}.${mac}`;
}
function conferir(segredo, valor) {
  const [corpo, mac] = String(valor || '').split('.');
  if (!corpo || !mac) return null;
  const esperado = crypto.createHmac('sha256', segredo).update(corpo).digest();
  const recebido = deB64url(mac);
  if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) return null;
  try {
    const obj = JSON.parse(deB64url(corpo).toString('utf8'));
    if (!obj.exp || obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch { return null; }
}
function lerCookies(req) {
  const r = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) r[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return r;
}
function cookie(nome, valor, { maxAge, seguro }) {
  return `${nome}=${encodeURIComponent(valor)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro ? '; Secure' : ''}`;
}

// ---------------------------------------------------------------------------
// Google (OpenID Connect)
// ---------------------------------------------------------------------------
function postarForm(url, campos) {
  const corpo = new URLSearchParams(campos).toString();
  return new Promise((ok, erro) => {
    const r = (url.startsWith('http://') ? http : https).request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(corpo) }, timeout: 15000 }, (res) => {
      let s = ''; res.on('data', (c) => { s += c; });
      res.on('end', () => { try { ok({ status: res.statusCode, json: JSON.parse(s) }); } catch { erro(new Error(`Resposta inválida do Google (${res.statusCode})`)); } });
    });
    r.on('timeout', () => r.destroy(new Error('O Google não respondeu.')));
    r.on('error', erro);
    r.end(corpo);
  });
}

/** Confere as declarações do id_token (recebido do Google por TLS, direto do endpoint de token). */
function conferirIdToken(idToken, { clientId, nonce, agora = Math.floor(Date.now() / 1000) }) {
  const partes = String(idToken || '').split('.');
  if (partes.length !== 3) throw new Error('Resposta do Google sem identificação.');
  const d = JSON.parse(deB64url(partes[1]).toString('utf8'));
  if (!EMISSORES.includes(d.iss)) throw new Error('Emissor inválido.');
  const aud = Array.isArray(d.aud) ? d.aud : [d.aud];
  if (!aud.includes(clientId)) throw new Error('Identificação emitida para outro aplicativo.');
  if (!d.exp || d.exp < agora - 60) throw new Error('Identificação vencida.');
  if (d.nonce !== nonce) throw new Error('Identificação não corresponde a este login.');
  if (!d.email || d.email_verified !== true) throw new Error('E-mail do Google não verificado.');
  return { email: normEmail(d.email), nome: d.name || '', foto: d.picture || '' };
}

// ---------------------------------------------------------------------------
// Permissões por perfil
// ---------------------------------------------------------------------------
const PUBLICO = [/^GET \/(entrar|sair|privacidade)$/, /^GET \/auth\/google(\/retorno)?$/, /^POST \/sair$/, /^GET \/marca\/(logo|icone)\.png$/, /^GET \/movel\.(css|js)$/, /^GET \/saude$/,
  // formulário do site (taynaalvesassessoria.com.br): pedido de orçamento e de horário com a Tayná
  /^GET \/api\/publico\/(servicos|horarios)$/, /^POST \/api\/publico\/(orcamento|agenda)$/];
const EQUIPE = [
  /^GET \/(inicio)?$/, /^GET \/checklist$/, /^GET \/api\/eu$/,
  /^GET \/api\/contratos$/, /^GET \/api\/sincronizacao$/,
  /^GET \/api\/checklist\/(vertentes|previa)$/, /^GET \/api\/evento$/, /^POST \/api\/evento(\/importar)?$/, /^POST \/api\/checklist\/gerar$/,
  /^GET \/cronograma$/, /^GET \/api\/cronograma(\/casal)?$/, /^POST \/api\/cronograma\/tarefa$/,
];
const CASAL = [/^GET \/(inicio)?$/, /^GET \/api\/eu$/, /^GET \/meu-evento$/, /^GET \/api\/meu-evento$/];
// rotas que mexem no computador onde o servidor roda: nunca no Lotus online
const SO_LOCAL = [/^POST \/api\/(encerrar|abrir)$/];

function permitido(papel, chave) {
  if (SO_LOCAL.some((r) => r.test(chave))) return false;
  if (papel === 'admin') return true;
  if (papel === 'equipe') return EQUIPE.some((r) => r.test(chave));
  if (papel === 'casal') return CASAL.some((r) => r.test(chave));
  return false;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
/**
 * @param {{ arquivoUsuarios: string, env?: object }} op
 * @returns {{ ativo, usuarios, tratar(req, res, url): Promise<{fim?: true, usuario?: object}> }}
 */
function criarAuth({ arquivoUsuarios, env = process.env }) {
  const c = configuracao(env);
  const usuarios = criarUsuarios(arquivoUsuarios, c.admins);
  const seguro = c.url.startsWith('https://');
  const retorno = `${c.url}/auth/google/retorno`;
  const LOCAL = { email: 'local', nome: 'Este computador', papel: 'admin', local: true };

  const html = (res, status, corpo) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(corpo); };
  const redirecionar = (res, para, cookies = []) => { res.writeHead(302, { Location: para, 'Set-Cookie': cookies, 'Cache-Control': 'no-store' }); res.end(); };
  const destinoSeguro = (p) => (typeof p === 'string' && /^\/(?!\/)[^\s\\]*$/.test(p) && !p.startsWith('/auth/') ? p : '/');

  function sessaoDe(req) {
    const s = conferir(c.segredo, lerCookies(req)[COOKIE_SESSAO]);
    if (!s) return null;
    const u = usuarios.obter(s.email);
    if (!u || (u.versao || 1) !== s.v) return null; // removido, bloqueado ou perfil trocado
    return { email: u.email, nome: u.nome || s.nome || '', papel: u.papel, casal: u.casal || '', foto: s.foto || '' };
  }

  async function tratar(req, res, url) {
    if (!c.ativo) return { usuario: LOCAL };
    const chave = `${req.method} ${url.pathname}`;

    // ---- rotas do próprio login ----
    if (chave === 'GET /entrar') return html(res, 200, paginaEntrar(url.searchParams.get('erro'))), { fim: true };
    if (chave === 'GET /auth/google') {
      const estado = { s: aleatorio(), n: aleatorio(), v: aleatorio(48), r: destinoSeguro(url.searchParams.get('voltar')), exp: Math.floor(Date.now() / 1000) + 600 };
      const desafio = b64url(crypto.createHash('sha256').update(estado.v).digest());
      const q = new URLSearchParams({
        client_id: c.clientId, redirect_uri: retorno, response_type: 'code', scope: 'openid email profile',
        state: estado.s, nonce: estado.n, code_challenge: desafio, code_challenge_method: 'S256', prompt: 'select_account',
      });
      redirecionar(res, `https://accounts.google.com/o/oauth2/v2/auth?${q}`, [cookie(COOKIE_OAUTH, assinar(c.segredo, estado), { maxAge: 600, seguro })]);
      return { fim: true };
    }
    if (chave === 'GET /auth/google/retorno') {
      const limpar = cookie(COOKIE_OAUTH, '', { maxAge: 0, seguro });
      const estado = conferir(c.segredo, lerCookies(req)[COOKIE_OAUTH]);
      const falha = (m) => { redirecionar(res, `/entrar?erro=${encodeURIComponent(m)}`, [limpar]); return { fim: true }; };
      if (url.searchParams.get('error')) return falha('Login cancelado.');
      if (!estado || url.searchParams.get('state') !== estado.s) return falha('O login expirou. Tente de novo.');
      let ident;
      try {
        const r = await postarForm(c.tokenUrl, {
          code: url.searchParams.get('code') || '', client_id: c.clientId, client_secret: c.clientSecret,
          redirect_uri: retorno, grant_type: 'authorization_code', code_verifier: estado.v,
        });
        if (r.status !== 200 || !r.json.id_token) return falha('O Google recusou o login. Tente de novo.');
        ident = conferirIdToken(r.json.id_token, { clientId: c.clientId, nonce: estado.n });
      } catch (e) { return falha(e.message); }
      const u = usuarios.obter(ident.email);
      if (!u) return falha(`O e-mail ${ident.email} não tem acesso ao Lotus. Peça para a Tayná liberar.`);
      const sessao = assinar(c.segredo, { email: u.email, nome: ident.nome, foto: ident.foto, v: u.versao || 1, exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO });
      const destino = u.papel === 'casal' && estado.r === '/' ? '/meu-evento' : estado.r;
      redirecionar(res, destino, [limpar, cookie(COOKIE_SESSAO, sessao, { maxAge: DURACAO_SESSAO, seguro })]);
      return { fim: true };
    }
    if (chave === 'POST /sair' || chave === 'GET /sair') {
      redirecionar(res, '/entrar', [cookie(COOKIE_SESSAO, '', { maxAge: 0, seguro })]);
      return { fim: true };
    }
    if (PUBLICO.some((r) => r.test(chave))) return { usuario: null };

    // ---- demais rotas: precisa de sessão ----
    const usuario = sessaoDe(req);
    const ehApi = url.pathname.startsWith('/api/');
    if (!usuario) {
      if (ehApi) { res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ erro: 'Sessão expirada. Entre de novo.' })); }
      else redirecionar(res, `/auth/google?voltar=${encodeURIComponent(url.pathname + url.search)}`);
      return { fim: true };
    }
    // POST só da própria origem (além do SameSite=Lax)
    if (req.method !== 'GET') {
      const origem = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
      if (origem && origem !== new URL(c.url).origin) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ erro: 'Origem não permitida.' }));
        return { fim: true };
      }
    }
    if (!permitido(usuario.papel, chave)) {
      if (ehApi) { res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ erro: 'Seu perfil não tem acesso a isto.' })); }
      else html(res, 403, paginaSemAcesso(usuario));
      return { fim: true };
    }
    return { usuario };
  }

  return { ativo: c.ativo, usuarios, tratar, permitido };
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const ESTILO = `<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8f3ef; font: 15px/1.5 "Segoe UI", system-ui, sans-serif; color: #2b2220; }
  .caixa { background: #fff; border: 1px solid #eadcd4; border-radius: 16px; padding: 34px 38px; width: min(400px, 92vw); text-align: center; box-shadow: 0 10px 30px rgba(130,70,52,.08); }
  img { height: 92px; } h1 { font-size: 26px; color: #824634; margin: 10px 0 0; letter-spacing: .5px; font-weight: 600; }
  .sub { color: #7b6f6a; font-size: 13px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 22px; }
  a.google { display: inline-flex; align-items: center; gap: 10px; justify-content: center; width: 100%; box-sizing: border-box; padding: 11px 14px;
    border: 1px solid #dadce0; border-radius: 8px; color: #3c4043; font-weight: 600; text-decoration: none; background: #fff; }
  a.google:hover { background: #f8f9fa; } .erro { color: #b3261e; background: #fbeceb; border-radius: 8px; padding: 8px 10px; font-size: 13.5px; margin-bottom: 14px; }
  .nota { color: #7b6f6a; font-size: 12.5px; margin-top: 18px; } a.lk { color: #824634; }
</style>`;
const G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
function paginaEntrar(erro) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entrar · Lotus</title><link rel="icon" type="image/png" href="/marca/icone.png">${ESTILO}</head><body><div class="caixa">
<img src="/marca/logo.png" alt="Tayná Alves Assessoria e Produção"><h1>Lotus</h1><div class="sub">sistema de gestão</div>
${erro ? `<div class="erro">${esc(erro)}</div>` : ''}
<a class="google" href="/auth/google">${G} Entrar com Google</a>
<div class="nota">Acesso só para e-mails liberados pela Tayná Alves Assessoria. · <a href="/privacidade" style="color:inherit">Privacidade</a></div></div></body></html>`;
}
function paginaSemAcesso(u) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem acesso · Lotus</title>${ESTILO}</head><body><div class="caixa"><h1>Sem acesso</h1>
<p>${esc(u.email)} não tem acesso a esta parte do Lotus.</p><p><a class="lk" href="/">Voltar ao início</a> · <a class="lk" href="/sair">Sair</a></p></div></body></html>`;
}

module.exports = { criarAuth, configuracao, conferirIdToken, assinar, conferir, permitido, PAPEIS };

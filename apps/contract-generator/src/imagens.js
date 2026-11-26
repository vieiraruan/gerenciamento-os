'use strict';

/**
 * Imagens compartilhadas da equipe: a pasta "IMAGENS COMPARTILHADAS" na raiz do Meu Drive (ao lado de CONTRATOS).
 * No servidor ela chega montada pelo rclone em /drive/IMAGENS COMPARTILHADAS; nos computadores, pelo Google Drive.
 * Só lista/serve o que está dentro dessa pasta (nunca fora dela) e ignora arquivos e pastas ocultos.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let sharp = null;
try { sharp = require('sharp'); sharp.cache(false); sharp.concurrency(1); } catch { /* opcional: sem miniaturas, serve o original */ }

const NOME_PASTA = 'IMAGENS COMPARTILHADAS';
const TIPOS = {
  imagem: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'svg'],
  video: ['mp4', 'mov', 'm4v', 'webm', '3gp'],
  pdf: ['pdf'],
};
const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
  tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4', webm: 'video/webm', '3gp': 'video/3gpp', pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8', zip: 'application/zip',
};
// o navegador mostra direto; o resto (HEIC, TIFF…) só com miniatura gerada ou baixando
const NAVEGADOR = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg']);
const extDe = (n) => path.extname(n).slice(1).toLowerCase();
const tipoDe = (n) => { const e = extDe(n); return Object.keys(TIPOS).find((t) => TIPOS[t].includes(e)) || 'outro'; };
const oculto = (n) => n.startsWith('.') || n.startsWith('~$') || /^desktop\.ini$|^thumbs\.db$/i.test(n);

/** Pasta das imagens: LOTUS_IMAGENS ou, com o Drive, "IMAGENS COMPARTILHADAS" ao lado de CONTRATOS. */
function pastaRaiz(pastas) {
  if (process.env.LOTUS_IMAGENS) return path.resolve(process.env.LOTUS_IMAGENS);
  if (pastas && pastas.drive) return path.join(path.dirname(pastas.drive), NOME_PASTA);
  return null;
}

/** Caminho relativo seguro → absoluto dentro da raiz (erro se tentar sair dela ou usar pasta oculta). */
function resolver(raiz, rel = '') {
  const partes = String(rel || '').replace(/\\/g, '/').split('/').filter((p) => p && p !== '.');
  if (partes.some((p) => p === '..' || oculto(p))) throw new Error('Caminho inválido.');
  const abs = path.resolve(raiz, ...partes);
  const r = path.resolve(raiz);
  if (abs !== r && !abs.startsWith(r + path.sep)) throw new Error('Caminho inválido.');
  return { abs, rel: partes.join('/') };
}

function disponivel(raiz) {
  try { return Boolean(raiz) && fs.statSync(raiz).isDirectory(); } catch { return false; }
}

/** Conteúdo de uma pasta: subpastas e arquivos (mais novos primeiro). */
function listar(raiz, rel = '') {
  if (!disponivel(raiz)) return { disponivel: false, pasta: '', trilha: [], pastas: [], arquivos: [] };
  const { abs, rel: r } = resolver(raiz, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error('Pasta não encontrada.');
  const pastas = []; const arquivos = [];
  for (const d of fs.readdirSync(abs, { withFileTypes: true })) {
    if (oculto(d.name)) continue;
    const caminho = r ? `${r}/${d.name}` : d.name;
    if (d.isDirectory()) { pastas.push({ nome: d.name, caminho }); continue; }
    if (!d.isFile()) continue;
    let st = null; try { st = fs.statSync(path.join(abs, d.name)); } catch { continue; }
    const tipo = tipoDe(d.name);
    arquivos.push({ nome: d.name, caminho, tipo, tamanho: st.size, modificado: st.mtime.toISOString(),
      mostra: tipo === 'imagem' && (NAVEGADOR.has(extDe(d.name)) || Boolean(sharp)) });
  }
  const col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  pastas.sort((a, b) => col.compare(a.nome, b.nome));
  arquivos.sort((a, b) => b.modificado.localeCompare(a.modificado) || col.compare(a.nome, b.nome));
  const trilha = r ? r.split('/').map((nome, i, l) => ({ nome, caminho: l.slice(0, i + 1).join('/') })) : [];
  return { disponivel: true, pasta: r, trilha, pastas, arquivos, miniaturas: Boolean(sharp) };
}

/** Nome de arquivo/pasta aceito no Drive e no Windows. */
function nomeSeguro(nome, padrao = 'arquivo') {
  const n = String(nome || '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 150);
  return n || padrao;
}
function nomeLivre(dir, nome) {
  const ext = path.extname(nome); const base = nome.slice(0, nome.length - ext.length);
  let n = nome;
  for (let i = 2; fs.existsSync(path.join(dir, n)); i++) n = `${base} (${i})${ext}`;
  return n;
}

/** Recebe o arquivo direto do pedido (sem guardar tudo na memória). */
function receber(raiz, relPasta, nomeOriginal, req, limite = 500 * 1024 * 1024) {
  const { abs, rel } = resolver(raiz, relPasta);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return Promise.reject(new Error('Pasta não encontrada.'));
  const nome = nomeLivre(abs, nomeSeguro(nomeOriginal));
  const tmp = path.join(abs, `.envio-${crypto.randomBytes(6).toString('hex')}`);
  return new Promise((ok, erro) => {
    let total = 0; let falhou = false;
    const out = fs.createWriteStream(tmp);
    const falha = (e) => { if (falhou) return; falhou = true; out.destroy(); fs.rm(tmp, { force: true }, () => erro(e)); };
    req.on('data', (c) => { total += c.length; if (total > limite) { req.destroy(); falha(new Error('Arquivo muito grande (máx. 500 MB).')); } });
    req.on('error', falha); out.on('error', falha);
    out.on('finish', () => {
      if (falhou) return;
      if (!total) { fs.rm(tmp, { force: true }, () => erro(new Error('Arquivo vazio.'))); return; }
      try { fs.renameSync(tmp, path.join(abs, nome)); ok({ nome, caminho: rel ? `${rel}/${nome}` : nome, tamanho: total }); } catch (e) { falha(e); }
    });
    req.pipe(out);
  });
}

function criarPasta(raiz, relPasta, nome) {
  const { abs, rel } = resolver(raiz, relPasta);
  const n = nomeSeguro(nome, '');
  if (!n) throw new Error('Dê um nome para a pasta.');
  const alvo = path.join(abs, n);
  if (fs.existsSync(alvo)) throw new Error('Já existe uma pasta ou arquivo com esse nome.');
  fs.mkdirSync(alvo);
  return { nome: n, caminho: rel ? `${rel}/${n}` : n };
}

/** Apaga arquivo ou pasta (no Drive vai para a lixeira). Nunca a própria raiz. */
function excluir(raiz, rel) {
  const { abs, rel: r } = resolver(raiz, rel);
  if (!r) throw new Error('Não é possível apagar a pasta principal.');
  if (!fs.existsSync(abs)) throw new Error('Arquivo não encontrado.');
  const pasta = fs.statSync(abs).isDirectory();
  fs.rmSync(abs, { recursive: true, force: true });
  return { apagado: r, pasta };
}

const DIR_CACHE = process.env.LOTUS_CACHE_MINIATURAS || path.join(os.tmpdir(), 'lotus-miniaturas');
/** Miniatura (webp) em cache local; null se não der para gerar (sem sharp ou formato não suportado). */
async function miniatura(raiz, rel, largura = 480) {
  if (!sharp) return null;
  const { abs } = resolver(raiz, rel);
  const st = fs.statSync(abs);
  if (tipoDe(abs) !== 'imagem' || extDe(abs) === 'svg' || extDe(abs) === 'gif') return null;
  const chave = crypto.createHash('sha1').update(`${abs}|${st.size}|${st.mtimeMs}|${largura}`).digest('hex');
  const arq = path.join(DIR_CACHE, `${chave}.webp`);
  if (fs.existsSync(arq)) return arq;
  fs.mkdirSync(DIR_CACHE, { recursive: true });
  try {
    await sharp(abs, { failOn: 'none', limitInputPixels: 2e8 }).rotate().resize({ width: largura, height: largura, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 }).toFile(`${arq}.tmp`);
    fs.renameSync(`${arq}.tmp`, arq);
    return arq;
  } catch { fs.rmSync(`${arq}.tmp`, { force: true }); return null; }
}

/** Envia um arquivo com suporte a Range (vídeos no celular). */
function servir(req, res, abs, { baixar = false, nome = path.basename(abs), tipo = null, cache = 'private, max-age=300' } = {}) {
  const st = fs.statSync(abs);
  const ct = tipo || MIME[extDe(nome)] || 'application/octet-stream';
  const disp = `${baixar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(nome)}`;
  const base = { 'Content-Type': ct, 'Content-Disposition': disp, 'Cache-Control': cache, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
  if (ct === 'image/svg+xml') base['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'";
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    let ini = m[1] ? Number(m[1]) : st.size - Number(m[2]);
    let fim = m[1] && m[2] ? Number(m[2]) : st.size - 1;
    ini = Math.max(0, ini); fim = Math.min(st.size - 1, fim);
    if (ini > fim) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${ini}-${fim}/${st.size}`, 'Content-Length': fim - ini + 1 });
    return fs.createReadStream(abs, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { ...base, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(abs).pipe(res);
}

module.exports = { NOME_PASTA, pastaRaiz, disponivel, resolver, listar, receber, criarPasta, excluir, miniatura, servir, tipoDe, temMiniaturas: () => Boolean(sharp) };

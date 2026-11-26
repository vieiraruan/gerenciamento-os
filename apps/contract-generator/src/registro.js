'use strict';

/**
 * Registro de alterações do Lotus: quem, quando, o quê (antes → depois), em qual casal e o motivo.
 * Fica no Drive, em _DADOS DO SISTEMA/registro/AAAA-MM-<origem>.jsonl (uma linha por alteração).
 * Cada máquina (servidor, computador da Tayná…) escreve no próprio arquivo, para o Drive nunca ter
 * duas cópias brigando pelo mesmo arquivo; a leitura junta todos.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PASTA = 'registro';
const ORIGEM = String(process.env.LOTUS_ORIGEM || (process.env.LOTUS_LOGIN === '1' ? 'online' : os.hostname()))
  .normalize('NFD').replace(/[^\w-]+/g, '').toLowerCase().slice(0, 30) || 'lotus';
// nunca vão para o registro (senhas, chaves, documentos, conteúdo de arquivos)
const SENSIVEL = /senha|apikey|api_key|chave|token|segredo|secret|cpf|cnpj|rg\b|conteudo|comprovante_base64/i;

function limpar(v, nivel = 0) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'string') return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (nivel >= 3) return '…';
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => limpar(x, nivel + 1));
  if (typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (!SENSIVEL.test(k) && k !== 'motivo') o[k] = limpar(x, nivel + 1);
    return o;
  }
  return String(v);
}

/** O motivo é obrigatório para corrigir ou apagar o que já existe. */
function exigirMotivo(texto) {
  const m = String(texto || '').replace(/\s+/g, ' ').trim();
  if (m.length < 5) throw new Error('Informe o motivo da alteração (pelo menos 5 letras).');
  return m.slice(0, 500);
}

function registrar(dirDados, e) {
  const agora = new Date();
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const linha = {
    em: agora.toISOString(), quem: e.quem || '', papel: e.papel || '', acao: e.acao || '', resumo: e.resumo || '',
    casal: e.casal || '', motivo: e.motivo || '', origem: ORIGEM,
    ...(e.antes !== undefined ? { antes: limpar(e.antes) } : {}), ...(e.depois !== undefined ? { depois: limpar(e.depois) } : {}),
    ...(e.dados ? { dados: limpar(e.dados) } : {}),
  };
  let txt = JSON.stringify(linha);
  if (txt.length > 6000) { delete linha.dados; txt = JSON.stringify(linha); }
  const dir = path.join(dirDados, PASTA);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${mes}-${ORIGEM}.jsonl`), `${txt}\n`);
  return linha;
}

/** Meses com registro (mais recente primeiro). */
function meses(dirDados) {
  try {
    return [...new Set(fs.readdirSync(path.join(dirDados, PASTA)).map((f) => (/^(\d{4}-\d{2})-.+\.jsonl$/.exec(f) || [])[1]).filter(Boolean))].sort().reverse();
  } catch { return []; }
}

/** Alterações de um mês (todas as máquinas), mais recentes primeiro. */
function listar(dirDados, { mes = null, busca = '', limite = 1000 } = {}) {
  const lista = meses(dirDados);
  const alvo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : lista[0];
  const out = [];
  if (alvo) {
    for (const f of fs.readdirSync(path.join(dirDados, PASTA)).filter((x) => x.startsWith(`${alvo}-`) && x.endsWith('.jsonl'))) {
      for (const l of fs.readFileSync(path.join(dirDados, PASTA, f), 'utf8').split('\n')) {
        if (!l.trim()) continue;
        try { out.push(JSON.parse(l)); } catch { /* linha cortada */ }
      }
    }
  }
  const q = String(busca || '').trim().toLowerCase();
  const filtrado = q ? out.filter((e) => `${e.quem} ${e.resumo} ${e.casal} ${e.motivo} ${e.acao}`.toLowerCase().includes(q)) : out;
  filtrado.sort((a, b) => b.em.localeCompare(a.em));
  return { mes: alvo || null, meses: lista, total: filtrado.length, itens: filtrado.slice(0, limite) };
}

module.exports = { registrar, listar, meses, exigirMotivo, limpar, ORIGEM };

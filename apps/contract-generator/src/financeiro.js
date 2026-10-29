'use strict';

/**
 * FINANCEIRO — controle de pagamentos de fornecedores por casal (substitui o lançamento na aba FINANCEIRO da
 * planilha de assessoria; o sistema reescreve a aba do Google todo dia — integracoes/google-apps-script).
 *
 * Dados (em _DADOS DO SISTEMA):
 *   fornecedores/<id>.json   cadastro geral de fornecedores (reaproveitado entre casais): contato e dados de pagamento
 *   financeiro/<contrato>.json   linhas do financeiro do casal (uma por fornecedor contratado) com entrada, parcelas
 *                                e pagamentos (cada um com o comprovante)
 *   financeiro-google/<AS-0000>.json   linhas no formato da aba FINANCEIRO, para o Apps Script escrever na planilha
 *
 * Arquivos (na pasta do casal no Drive): cada fornecedor tem a sua pasta "NNN. Nome" (como "001. Tayná Alves
 * Assessoria"); o contrato assinado e os comprovantes de pagamento vão para ela.
 */
const fs = require('fs');
const path = require('path');

const FORMAS = ['PIX', 'Transferência', 'Boleto', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Outro'];
const TIPOS_PAGAMENTO = { entrada: 'Entrada', parcela: 'Parcela', avulso: 'Pagamento avulso' };

const chave = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
const novoId = () => Math.random().toString(36).slice(2, 10);
const agora = () => new Date().toISOString();
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** "R$ 8.000,00" / "7.020,00" / "4.900" / 5600 → número; "", "-", "?x de" → null */
function valorDe(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v ?? '').replace(/R\$|\s| /g, '');
  if (!s || /^-+$/.test(s)) return null;
  const neg = /^-/.test(s);
  s = s.replace(/^-/, '');
  if (!/^[\d.,]+$/.test(s)) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

/** "22/8/25", "12/08/2026", "2026-08-12" → "2026-08-12"; senão "" */
function dataDe(v) {
  const s = String(v ?? '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (!m) return '';
  const [d, mes, a] = [Number(m[1]), Number(m[2]), m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])];
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return '';
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function somarMeses(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + n, 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(Number(m[3]), ultimo));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const moeda = (n) => (n === null || n === undefined ? '' : `R$ ${r2(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const nomeSeguro = (s) => String(s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

// ---------------------------------------------------------------------------
// Cadastro geral de fornecedores
// ---------------------------------------------------------------------------
const dirFornecedores = (dirDados) => path.join(dirDados, 'fornecedores');

function listarFornecedores(dirDados) {
  const dir = dirFornecedores(dirDados);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; }
  }).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function obterFornecedor(dirDados, id) {
  const arq = path.join(dirFornecedores(dirDados), `${id}.json`);
  return id && fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : null;
}

function salvarFornecedor(dirDados, dados) {
  const nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do fornecedor.');
  const dir = dirFornecedores(dirDados);
  fs.mkdirSync(dir, { recursive: true });
  let id = dados.id;
  if (!id) {
    // mesmo nome → mesmo cadastro (não duplica)
    const igual = listarFornecedores(dirDados).find((f) => chave(f.nome) === chave(nome));
    id = igual ? igual.id : (chave(nome).replace(/ /g, '-').slice(0, 40) || novoId());
    if (!igual && fs.existsSync(path.join(dir, `${id}.json`))) id = `${id}-${novoId().slice(0, 4)}`;
  }
  const atual = obterFornecedor(dirDados, id) || { criado_em: agora() };
  const f = {
    ...atual,
    id,
    nome,
    servico: String(dados.servico ?? atual.servico ?? '').trim(),
    documento: String(dados.documento ?? atual.documento ?? '').trim(),
    responsavel: String(dados.responsavel ?? atual.responsavel ?? '').trim(),
    telefone: String(dados.telefone ?? atual.telefone ?? '').trim(),
    email: String(dados.email ?? atual.email ?? '').trim(),
    instagram: String(dados.instagram ?? atual.instagram ?? '').trim(),
    pagamento: { ...(atual.pagamento || {}), ...(dados.pagamento || {}) },
    observacoes: String(dados.observacoes ?? atual.observacoes ?? '').trim(),
    atualizado_em: agora(),
  };
  fs.writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(f, null, 2)}\n`);
  return f;
}

const textoPagamento = (p = {}) => [p.pix && `PIX: ${p.pix}`, p.banco && `Banco: ${p.banco}`, p.agencia && `Ag.: ${p.agencia}`,
  p.conta && `Conta: ${p.conta}`, p.titular && `Titular: ${p.titular}`].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------
// Financeiro do casal
// ---------------------------------------------------------------------------
const arquivoFinanceiro = (dirDados, contratoArquivo) => path.join(dirDados, 'financeiro', String(contratoArquivo).replace(/\.txt$/i, '.json'));

function carregar(dirDados, contratoArquivo) {
  const arq = arquivoFinanceiro(dirDados, contratoArquivo);
  if (!fs.existsSync(arq)) return null;
  return JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
}

function salvar(dirDados, contratoArquivo, fin, numeroOs) {
  const arq = arquivoFinanceiro(dirDados, contratoArquivo);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fin.atualizado_em = agora();
  fs.writeFileSync(arq, `${JSON.stringify(fin, null, 2)}\n`);
  if (numeroOs) gravarParaGoogle(dirDados, numeroOs, fin);
  return fin;
}

/** Situação calculada de uma linha (fornecedor contratado). */
function calcular(item, hoje = hojeIso()) {
  const pags = item.pagamentos || [];
  const soma = (f) => r2(pags.filter(f).reduce((s, p) => s + (Number(p.valor) || 0), 0));
  const contratado = item.valor_contratado === null || item.valor_contratado === undefined ? null : r2(item.valor_contratado);
  const pago = soma(() => true);
  const pagoEntrada = soma((p) => p.tipo === 'entrada');
  const pagoParcelas = soma((p) => p.tipo !== 'entrada');
  const entradaPrevista = r2(item.entrada?.valor || 0);
  const saldo = contratado === null ? null : r2(contratado - pago);
  const qtd = Number(item.parcelas?.quantidade) || 0;
  const valorParcela = item.parcelas?.valor ? r2(item.parcelas.valor) : (qtd && contratado !== null ? r2((contratado - entradaPrevista) / qtd) : null);
  let pagas = pags.filter((p) => p.tipo === 'parcela').length + (Number(item.parcelas?.pagas_importadas) || 0);
  if (contratado !== null && contratado > 0 && contratado - r2(pags.reduce((s, p) => s + (Number(p.valor) || 0), 0)) <= 0.009) pagas = Math.max(pagas, qtd);
  // vencimentos das parcelas que faltam
  const vencimentos = [];
  if (qtd && item.parcelas?.primeiro_vencimento) {
    for (let i = 0; i < qtd; i++) {
      const venc = somarMeses(item.parcelas.primeiro_vencimento, i);
      vencimentos.push({ numero: i + 1, vencimento: venc, valor: valorParcela, paga: i < pagas });
    }
  }
  const proximas = vencimentos.filter((v) => !v.paga);
  const quitado = contratado !== null && contratado > 0 && saldo <= 0.009;
  const entradaPaga = entradaPrevista ? pagoEntrada >= entradaPrevista - 0.009 : pagoEntrada > 0;
  return {
    contratado, pago, pago_entrada: pagoEntrada, pago_parcelas: pagoParcelas, saldo,
    entrada_prevista: entradaPrevista, entrada_paga: entradaPaga,
    parcelas_total: qtd, parcelas_pagas: Math.min(pagas, qtd || pagas), valor_parcela: valorParcela,
    vencimentos, proxima: proximas[0] || null,
    atrasadas: proximas.filter((v) => v.vencimento && v.vencimento < hoje),
    status: quitado ? 'Pago' : contratado === null ? 'Sem valor' : 'Pendente',
    ultimo_pagamento: pags.map((p) => p.data).filter(Boolean).sort().pop() || '',
  };
}

function resumo(fin, hoje = hojeIso()) {
  const itens = (fin?.itens || []).filter((i) => !i.removido).map((i) => ({ ...i, calc: calcular(i, hoje) }));
  const total = (k) => r2(itens.reduce((s, i) => s + (Number(i.calc[k]) || 0), 0));
  const contratado = total('contratado');
  const pago = total('pago');
  const venc = itens.flatMap((i) => i.calc.vencimentos.filter((v) => !v.paga).map((v) => ({ ...v, item_id: i.id, fornecedor: i.nome })))
    .sort((a, b) => (a.vencimento || '9').localeCompare(b.vencimento || '9'));
  const entradasPendentes = itens.filter((i) => i.calc.entrada_prevista && !i.calc.entrada_paga)
    .map((i) => ({ item_id: i.id, fornecedor: i.nome, valor: r2(i.calc.entrada_prevista - i.calc.pago_entrada), vencimento: i.entrada?.data || '' }));
  return {
    itens,
    totais: {
      contratado, pago, saldo: r2(contratado - pago), percentual: contratado ? Math.round((pago / contratado) * 100) : 0,
      fornecedores: itens.length, quitados: itens.filter((i) => i.calc.status === 'Pago').length,
    },
    proximos: venc.filter((v) => v.vencimento >= hoje).slice(0, 12),
    atrasados: venc.filter((v) => v.vencimento && v.vencimento < hoje),
    entradas_pendentes: entradasPendentes,
  };
}

// ---------------------------------------------------------------------------
// Pastas dos fornecedores na pasta do casal
// ---------------------------------------------------------------------------
const PALAVRAS_SERVICO = /\b(buffet|decor|foto|video|film|bolo|doce|drink|chopp|gerador|banda|dj|musica|som|ilumin|palco|make|cabelo|pentead|vestido|local|igreja|celebra|convite|papelaria|bem casad|sandal|cadeira|mobil|lembran|id visual|cerimon)/;
const semPrefixo = (n) => chave(n).replace(/^\d+\s*/, '');

/** Pasta já existente na pasta do casal que corresponde ao fornecedor (pelo nome ou pelo serviço). */
function acharPastaExistente(pastaCasal, item, { usadas = new Set(), minimo = 1 } = {}) {
  if (!pastaCasal || !fs.existsSync(pastaCasal)) return null;
  const pastas = fs.readdirSync(pastaCasal, { withFileTypes: true }).filter((d) => d.isDirectory() && !usadas.has(d.name)).map((d) => d.name);
  const kNome = chave(item.nome);
  const kServ = chave(item.descricao || item.servico || '');
  let melhor = null;
  for (const p of pastas) {
    const k = semPrefixo(p);
    let pontos = 0;
    if (kNome && (k.includes(kNome) || kNome.includes(k))) pontos = 3;
    else {
      const palavras = kNome.split(' ').filter((w) => w.length > 3);
      if (palavras.some((w) => k.includes(w))) pontos = 2;
      else {
        const servP = (k.match(PALAVRAS_SERVICO) || [])[0];
        if (servP && (kServ.includes(servP) || kNome.includes(servP))) pontos = 1;
      }
    }
    if (pontos >= minimo && (!melhor || pontos > melhor.pontos)) melhor = { nome: p, pontos };
  }
  return melhor ? melhor.nome : null;
}

/** Garante a pasta do fornecedor ("NNN. Nome") e devolve o caminho. */
function garantirPasta(pastaCasal, item, fin) {
  if (!pastaCasal) throw new Error('Pasta do casal não encontrada.');
  fs.mkdirSync(pastaCasal, { recursive: true });
  if (item.pasta && fs.existsSync(path.join(pastaCasal, item.pasta))) return path.join(pastaCasal, item.pasta);
  // pasta já existente com o nome do fornecedor (e que não seja de outro fornecedor do casal)
  const usadas = new Set(((fin && fin.itens) || []).filter((i) => i !== item && i.pasta).map((i) => i.pasta));
  const existente = acharPastaExistente(pastaCasal, item, { usadas, minimo: 2 });
  if (existente) { item.pasta = existente; return path.join(pastaCasal, existente); }
  // número da pasta: o próximo depois das pastas numeradas que já existem (ex.: 024 → 025)
  const nums = fs.readdirSync(pastaCasal, { withFileTypes: true }).filter((d) => d.isDirectory())
    .map((d) => Number((/^\s*(\d{1,3})/.exec(d.name) || [])[1]) || 0);
  const n = Math.max(item.ordem || 0, ...nums.map((x) => x + 1));
  item.pasta = `${String(n).padStart(3, '0')}. ${nomeSeguro(item.nome)}`;
  const dir = path.join(pastaCasal, item.pasta);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Grava um arquivo enviado (contrato ou comprovante) na pasta do fornecedor, sem sobrescrever. */
function gravarArquivo(pastaCasal, item, base, nomeOriginal, conteudo, fin) {
  const dir = garantirPasta(pastaCasal, item, fin);
  const ext = (path.extname(nomeOriginal || '') || '.pdf').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6);
  let nome = `${nomeSeguro(base)}${ext}`;
  for (let i = 2; fs.existsSync(path.join(dir, nome)); i++) nome = `${nomeSeguro(base)} (${i})${ext}`;
  fs.writeFileSync(path.join(dir, nome), conteudo);
  return path.join(item.pasta, nome);
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------
function novoFinanceiro() {
  return { versao: 1, itens: [], criado_em: agora(), importado_de: null };
}

/** Novo fornecedor contratado pelo casal (linha do financeiro). */
function adicionarItem(fin, pastaCasal, dados, contratoArquivo) {
  const ordem = Math.max(0, ...fin.itens.map((i) => i.ordem || 0)) + 1;
  const item = {
    id: novoId(),
    ordem,
    fornecedor_id: dados.fornecedor_id || null,
    nome: String(dados.nome || '').trim(),
    descricao: String(dados.descricao || '').trim(),
    valor_contratado: valorDe(dados.valor_contratado),
    entrada: { valor: valorDe(dados.entrada?.valor), forma: dados.entrada?.forma || '', data: dataDe(dados.entrada?.data) || dados.entrada?.data || '' },
    parcelas: {
      quantidade: Number(dados.parcelas?.quantidade) || 0,
      valor: valorDe(dados.parcelas?.valor),
      primeiro_vencimento: dataDe(dados.parcelas?.primeiro_vencimento) || dados.parcelas?.primeiro_vencimento || '',
      forma: dados.parcelas?.forma || '',
    },
    pix: String(dados.pix || '').trim(),
    contrato: null,
    pagamentos: [],
    historico: [],
    criado_em: agora(),
  };
  if (!item.nome) throw new Error('Informe o fornecedor.');
  garantirPasta(pastaCasal, item, fin);
  if (contratoArquivo) {
    item.contrato = gravarArquivo(pastaCasal, item, `CONTRATO ASSINADO - ${item.nome}`, contratoArquivo.nome, contratoArquivo.conteudo, fin);
  }
  item.historico.push(`${dataBr(hojeIso())} - Fornecedor cadastrado${item.valor_contratado !== null ? ` (${moeda(item.valor_contratado)})` : ''}${item.contrato ? '; contrato assinado salvo na pasta do fornecedor' : ''}.`);
  fin.itens.push(item);
  return item;
}

function atualizarItem(fin, id, dados) {
  const item = fin.itens.find((i) => i.id === id);
  if (!item) throw new Error('Fornecedor não encontrado no financeiro do casal.');
  if (dados.nome !== undefined) item.nome = String(dados.nome).trim() || item.nome;
  if (dados.descricao !== undefined) item.descricao = String(dados.descricao).trim();
  if (dados.valor_contratado !== undefined) item.valor_contratado = valorDe(dados.valor_contratado);
  if (dados.pix !== undefined) item.pix = String(dados.pix).trim();
  if (dados.fornecedor_id !== undefined) item.fornecedor_id = dados.fornecedor_id || null;
  if (dados.entrada) item.entrada = { ...item.entrada, ...dados.entrada, valor: valorDe(dados.entrada.valor ?? item.entrada?.valor), data: dataDe(dados.entrada.data) || dados.entrada.data || '' };
  if (dados.parcelas) {
    item.parcelas = {
      ...item.parcelas, ...dados.parcelas,
      quantidade: Number(dados.parcelas.quantidade ?? item.parcelas?.quantidade) || 0,
      valor: valorDe(dados.parcelas.valor ?? item.parcelas?.valor),
      primeiro_vencimento: dataDe(dados.parcelas.primeiro_vencimento) || dados.parcelas.primeiro_vencimento || '',
    };
  }
  if (dados.removido !== undefined) item.removido = Boolean(dados.removido);
  item.atualizado_em = agora();
  return item;
}

/** Registra entrada/parcela/avulso com o comprovante (obrigatório) na pasta do fornecedor. */
function registrarPagamento(fin, pastaCasal, id, dados, comprovante) {
  const item = fin.itens.find((i) => i.id === id);
  if (!item) throw new Error('Fornecedor não encontrado no financeiro do casal.');
  const valor = valorDe(dados.valor);
  if (!valor || valor <= 0) throw new Error('Informe o valor pago.');
  const data = dataDe(dados.data);
  if (!data) throw new Error('Informe a data do pagamento.');
  if (!comprovante && !dados.sem_comprovante) throw new Error('Anexe o comprovante de pagamento.');
  const tipo = TIPOS_PAGAMENTO[dados.tipo] ? dados.tipo : 'parcela';
  const calc = calcular(item);
  const numero = tipo === 'parcela' ? Number(dados.numero) || calc.parcelas_pagas + 1 : null;
  const rotulo = tipo === 'parcela' ? `PARCELA ${numero}${calc.parcelas_total ? ` DE ${calc.parcelas_total}` : ''}` : TIPOS_PAGAMENTO[tipo].toUpperCase();
  const pg = {
    id: novoId(), tipo, numero, valor, data, forma: dados.forma || '', obs: String(dados.obs || '').trim(), lancado_em: agora(),
    comprovante: comprovante
      ? gravarArquivo(pastaCasal, item, `COMPROVANTE - ${rotulo} - ${dataBr(data).replace(/\//g, '-')}`, comprovante.nome, comprovante.conteudo, fin)
      : null,
  };
  item.pagamentos.push(pg);
  const depois = calcular(item);
  item.historico.push(`${dataBr(data)} - PG ${moeda(valor)} referente a ${tipo === 'parcela' ? `parcela ${numero}${calc.parcelas_total ? ` de ${calc.parcelas_total}` : ''}` : TIPOS_PAGAMENTO[tipo].toLowerCase()}`
    + `${pg.forma ? ` (${pg.forma})` : ''}.${depois.saldo !== null ? ` Saldo: ${moeda(depois.saldo)}.` : ''}${pg.comprovante ? ' Comprovante na pasta do fornecedor.' : ''}${pg.obs ? ` ${pg.obs}` : ''}`);
  return { item, pagamento: pg };
}

function removerPagamento(fin, id, pagamentoId) {
  const item = fin.itens.find((i) => i.id === id);
  if (!item) throw new Error('Fornecedor não encontrado.');
  const pg = item.pagamentos.find((p) => p.id === pagamentoId);
  if (!pg) throw new Error('Pagamento não encontrado.');
  item.pagamentos = item.pagamentos.filter((p) => p.id !== pagamentoId);
  item.historico.push(`${dataBr(hojeIso())} - Lançamento de ${moeda(pg.valor)} (${dataBr(pg.data)}) removido${pg.comprovante ? '; o comprovante continua na pasta' : ''}.`);
  return item;
}

// ---------------------------------------------------------------------------
// Importação da aba FINANCEIRO (cópia do Google ou .xlsx) — casais em andamento
// ---------------------------------------------------------------------------
const IGNORAR = /^total\b/i;

/** Linhas cruas da aba FINANCEIRO → itens do sistema (com entrada e parcelas pagas como pagamentos importados). */
function importarLinhas(linhas, pastaCasal) {
  const iCab = linhas.findIndex((l) => l.some((c) => /^\s*fornecedor\s*$/i.test(String(c || ''))));
  if (iCab < 0) throw new Error('A aba FINANCEIRO não tem a linha de cabeçalho (Fornecedor).');
  const cab = linhas[iCab].map((c) => chave(c));
  const col = (...res) => cab.findIndex((c) => res.some((re) => re.test(c)));
  const C = {
    nome: col(/^fornecedor$/), desc: col(/^descri/), contratado: col(/valor contratado/),
    entrada: col(/^valor da entrada/), statusEntrada: col(/status do pagamento da entrada/), dataEntrada: col(/data do pagamento da entrada/),
    nParcelas: col(/^numero de parcelas$/, /^total de parcelas/, /^numero de parcelas restantes/), parcelasPagas: col(/parcelas pagas/),
    valorParcela: col(/^valor da parcela/), valorPago: col(/^valor pago/), dataParcela: col(/data do pagamento da parcela/, /dia de pagamento da parcela/),
    pix: col(/^pix$/), obs: col(/^observacao$/),
  };
  const v = (l, k) => (C[k] >= 0 ? String(l[C[k]] ?? '').trim() : '');
  const fin = novoFinanceiro();
  for (const l of linhas.slice(iCab + 1)) {
    if (l.some((c) => /^\s*total\s*:?\s*$/i.test(String(c || '')))) break;
    const nome = v(l, 'nome').replace(/\s+/g, ' ');
    if (!nome || IGNORAR.test(nome)) continue;
    const item = {
      id: novoId(), ordem: fin.itens.length + 1, fornecedor_id: null, nome, descricao: v(l, 'desc'),
      valor_contratado: valorDe(v(l, 'contratado')),
      entrada: { valor: valorDe(v(l, 'entrada')), forma: '', data: dataDe(v(l, 'dataEntrada')) },
      parcelas: { quantidade: Number((v(l, 'nParcelas').match(/\d+/) || [])[0]) || 0, valor: valorDe(v(l, 'valorParcela')), primeiro_vencimento: '' },
      pix: v(l, 'pix'), contrato: null, pagamentos: [], historico: [], importado: true, criado_em: agora(),
    };
    // entrada paga
    if (/pago/i.test(v(l, 'statusEntrada')) && item.entrada.valor) {
      item.pagamentos.push({ id: novoId(), tipo: 'entrada', numero: null, valor: item.entrada.valor, data: item.entrada.data,
        forma: '', obs: 'importado da planilha', comprovante: null, importado: true, lancado_em: agora() });
    }
    // parcelas já pagas (a planilha guarda só o total pago)
    const pagoParc = valorDe(v(l, 'valorPago'));
    if (pagoParc && pagoParc > 0 && C.valorPago >= 0 && !/^\d{1,2}$/.test(v(l, 'valorPago'))) {
      item.pagamentos.push({ id: novoId(), tipo: 'avulso', numero: null, valor: pagoParc, data: dataDe(v(l, 'dataParcela')),
        forma: '', obs: 'parcelas pagas (total importado da planilha)', comprovante: null, importado: true, lancado_em: agora() });
    }
    let nPagas = Number((v(l, 'parcelasPagas').match(/\d+/) || [])[0]) || 0;
    if (!nPagas && pagoParc && item.parcelas.valor) nPagas = Math.round(pagoParc / item.parcelas.valor);
    if (nPagas) item.parcelas.pagas_importadas = Math.min(nPagas, item.parcelas.quantidade || nPagas);
    const obs = v(l, 'obs');
    if (obs) item.historico.push(...obs.split(/\n+/).map((x) => x.trim()).filter(Boolean));
    const pasta = acharPastaExistente(pastaCasal, item, { usadas: new Set(fin.itens.map((i) => i.pasta).filter(Boolean)) });
    if (pasta) item.pasta = pasta;
    fin.itens.push(item);
  }
  return fin;
}

// ---------------------------------------------------------------------------
// Para a planilha do Google (o Apps Script escreve a aba FINANCEIRO a partir deste arquivo)
// ---------------------------------------------------------------------------
function linhasParaGoogle(fin) {
  return (fin.itens || []).filter((i) => !i.removido).map((i) => {
    const c = calcular(i);
    const ultParc = (i.pagamentos || []).filter((p) => p.tipo !== 'entrada').map((p) => p.data).filter(Boolean).sort().pop() || '';
    const entradaPg = (i.pagamentos || []).find((p) => p.tipo === 'entrada');
    return {
      'Fornecedor': i.nome,
      'Descrição do Serviço / Observação': i.descricao,
      'Valor Contratado': c.contratado,
      'Valor da Entrada': c.entrada_prevista || null,
      'Status do Pagamento da Entrada': c.entrada_prevista || c.pago_entrada ? (c.entrada_paga ? 'Pago' : 'Pendente') : '',
      'Data do Pagamento da Entrada': dataBr(entradaPg?.data || i.entrada?.data || ''),
      'Número de Parcelas': c.parcelas_total || '',
      'Número de Parcelas Pagas': c.parcelas_total ? c.parcelas_pagas : '',
      'Valor da Parcela': c.valor_parcela,
      'Valor Pago': c.pago_parcelas || null,
      'Data do Pagamento da Parcela': dataBr(ultParc),
      'Status do Pagamento': c.status === 'Pago' ? 'Pago' : c.contratado !== null ? 'Pendente' : '',
      'PIX': i.pix || '',
      'Observação': (i.historico || []).join('\n'),
    };
  });
}

function gravarParaGoogle(dirDados, numeroOs, fin) {
  const dir = path.join(dirDados, 'financeiro-google');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${String(numeroOs).trim()}.json`),
    JSON.stringify({ numero: numeroOs, gerado_em: agora(), linhas: linhasParaGoogle(fin) }, null, 1));
}

module.exports = {
  FORMAS, TIPOS_PAGAMENTO, valorDe, dataDe, dataBr, moeda,
  listarFornecedores, obterFornecedor, salvarFornecedor, textoPagamento,
  carregar, salvar, novoFinanceiro, calcular, resumo,
  acharPastaExistente, garantirPasta, gravarArquivo,
  adicionarItem, atualizarItem, registrarPagamento, removerPagamento,
  importarLinhas, linhasParaGoogle, gravarParaGoogle,
};

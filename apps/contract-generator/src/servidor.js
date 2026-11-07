#!/usr/bin/env node
'use strict';

/**
 * Aplicativo gráfico do gerador de contratos (roda localmente no navegador).
 *
 * Uso:
 *   node src/servidor.js [pasta-de-dados] [--porta 3210] [--sem-navegador]
 *
 * A pasta de dados guarda os .txt dos contratos, clientes/ e gerados/.
 * Padrão: variável CONTRATOS_DADOS ou ../../../contratos (ao lado do repositório).
 * O servidor só aceita conexões do próprio computador (127.0.0.1).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { parseTxt } = require('./parser');
const { enriquecer } = require('./calculos');
const { montarContrato } = require('./contrato');
const { gerarContrato, criarPlanilhaDoContrato } = require('./index');

const { resolverPastas, prepararPastas, acharPastaCasal } = require('./pastas');
const { listarVertentes, montarChecklist, gravarChecklist } = require('./checklist');
const { gravarChecklistEvento } = require('./roteiro');
const ev = require('./evento');
const planilhaCasal = require('./planilha');
const evPadrao = require('./eventoPadrao');
const fin = require('./financeiro');
const gestao = require('./gestao');
const { escreverFinanceiroXlsx } = require('./xlsxFinanceiro');
const { gerarRelatorioIR } = require('./relatorioIR');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opc = (n) => (args.indexOf(n) > -1 ? args[args.indexOf(n) + 1] : undefined);
const PORTA = Number(opc('--porta') || process.env.PORTA || 3210);
const COM_VALOR = ['--porta', '--saida'];
const dadosArg = args.find((a, i) => !a.startsWith('--') && !COM_VALOR.includes(args[i - 1]));
const PASTAS = prepararPastas(resolverPastas({ dados: dadosArg, saida: opc('--saida') }));
const DADOS = PASTAS.dados;
const DIR_CLIENTES = PASTAS.clientes;
const DIR_GERADOS = PASTAS.saida;
const ARQ_SEQ = PASTAS.sequencias;
const ARQ_EMPRESA = PASTAS.empresa;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const lerJson = (arq, padrao) =>
  fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, '')) : padrao;

/** Nome de arquivo seguro: só letras, números e hífen (impede ../ etc.). */
function nomeArquivo(texto) {
  const s = String(texto || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\.txt$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (!s) throw new Error('Nome de arquivo inválido.');
  return `${s}.txt`;
}

function dentroDe(base, alvo) {
  const r = path.relative(base, alvo);
  return r && !r.startsWith('..') && !path.isAbsolute(r);
}

/** Serializa campos no formato "chave: valor" do gerador. */
function paraTxt(campos, cabecalho) {
  const linhas = [`# ${cabecalho}`, `# Salvo pelo aplicativo em ${new Date().toLocaleString('pt-BR')}`, ''];
  for (const [k, v] of Object.entries(campos)) {
    const valor = String(v ?? '').replace(/\r?\n/g, ' ').trim();
    if (valor !== '') linhas.push(`${k}: ${valor}`);
  }
  return `${linhas.join('\n')}\n`;
}

const lerTxt = (arq) => parseTxt(fs.readFileSync(arq, 'utf8'));

/** Contrato pelo nome do arquivo (.txt em _DADOS DO SISTEMA). */
function contratoDe(nome) {
  const arquivo = nomeArquivo(nome);
  const arq = path.join(DADOS, arquivo);
  if (!fs.existsSync(arq)) throw new Error('Contrato não encontrado.');
  const campos = lerTxt(arq);
  let cliente = {};
  const arqCli = campos.cliente && path.join(DIR_CLIENTES, nomeArquivo(campos.cliente));
  if (arqCli && fs.existsSync(arqCli)) cliente = lerTxt(arqCli);
  return { arquivo, campos, cliente };
}

function listarTxt(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.txt') && !f.startsWith('_'))
    .map((f) => ({ arquivo: f, campos: lerTxt(path.join(dir, f)), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function abrirNoSistema(alvo) {
  const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [alvo], { detached: true, stdio: 'ignore' }).unref();
}

// ---------------------------------------------------------------------------
// Regras (prévia sem reservar número)
// ---------------------------------------------------------------------------
function previa(campos, cliente) {
  const catalogo = lerJson(path.join(RAIZ, 'templates', 'servicos.json'), {});
  const empresa = lerJson(ARQ_EMPRESA, {});
  const doCliente = {};
  for (const [k, v] of Object.entries(cliente || {})) doCliente[`contratante_${k === 'cpf_cnpj' ? 'cpf' : k}`] = v;
  const brutos = { ...doCliente, ...campos };
  const c = montarContrato(brutos, catalogo);
  const d = enriquecer({ ...brutos, ...c }, empresa);
  const seq = lerJson(ARQ_SEQ, { AS: 0, CE: 0 });
  return {
    linha: c.linha,
    linha_nome: c.linha_nome,
    proximo_numero: campos.numero_os || `${c.linha}-${String(Number(seq[c.linha] || 0) + 1).padStart(4, '0')}`,
    numero_reservado: Boolean(campos.numero_os),
    servicos: c.servicos_descricao,
    preco_tabela: c.preco_tabela_fmt,
    valor_total: d.valor_total_fmt,
    valor_extenso: d.valor_total_extenso,
    desconto: c.desconto_fmt,
    entrada: `${d.entrada_fmt} (${c.entrada_percentual_fmt.split(' ')[0]})`,
    saldo: d.saldo_fmt,
    vencimento: c.tem_vencimento ? c.vencimento_saldo : `${Number(campos.prazo_quitacao_dias || 15)} dias antes do evento`,
    parcelas: (d.parcelas || []).map((p) => `${p.numero}ª: ${p.valor_fmt} em ${p.vencimento}`),
    equipe: `${c.equipe_fmt} profissionais`,
    convidados: `até ${c.convidados_fmt.split(' ')[0]}`,
    cortejo: `${c.padrinhos_fmt.split(' ')[0]} padrinhos · ${c.madrinhas_fmt.split(' ')[0]} madrinhas · ${c.criancas_fmt.split(' ')[0]} crianças`,
    duracao: c.tem_duracao ? `${c.evento_duracao_fmt.replace(/ \(.*?\)/, '')}${c.evento_termino ? ` (até ${c.evento_termino})` : ''}` : 'a definir',
    termino: c.evento_termino || '',
    alerta_horas: c.alerta_horas,
    horarios: c.tem_horario
      ? [c.secao_supervisao && `Supervisão chega às ${c.supervisao_chegada}`,
        c.secao_cerimonial && `Cerimonial das ${c.cerimonial_inicio} às ${c.cerimonial_fim}`].filter(Boolean)
      : [],
    quando: c.evento_quando,
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
function responder(res, status, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(tipo.startsWith('application/json') ? JSON.stringify(corpo) : corpo);
}

function lerBinario(req, limite = 40 * 1024 * 1024) {
  return new Promise((ok, erro) => {
    const partes = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > limite) { erro(new Error('Arquivo muito grande (máx. 40 MB).')); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}

function lerCorpo(req) {
  return new Promise((ok, erro) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 1e6) erro(new Error('Requisição muito grande.'));
    });
    req.on('end', () => {
      try { ok(s ? JSON.parse(s) : {}); } catch (e) { erro(e); }
    });
  });
}

/**
 * Operações do financeiro que podem levar um arquivo (contrato assinado ou comprovante):
 *   op=item (novo fornecedor do casal + contrato), op=editar, op=pagamento (+ comprovante), op=remover-pagamento,
 *   op=contrato (anexar/substituir o contrato), op=remover (tirar a linha).
 */
function enviarFinanceiro(q, arquivoEnviado) {
  const { arquivo, campos } = contratoDe(q.get('arquivo'));
  const dados = JSON.parse(q.get('dados') || '{}');
  const { pasta } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
  const f = fin.carregar(DADOS, arquivo) || fin.novoFinanceiro();
  const op = q.get('op');
  let resposta = {};
  if (op === 'item') {
    // cadastro geral do fornecedor (fica salvo para outros casais)
    let cad = null;
    if (dados.fornecedor && dados.fornecedor.nome) cad = fin.salvarFornecedor(DADOS, dados.fornecedor);
    const item = fin.adicionarItem(f, pasta, {
      ...dados.item, fornecedor_id: cad ? cad.id : dados.item?.fornecedor_id, nome: dados.item?.nome || cad?.nome,
      pix: dados.item?.pix || (cad ? fin.textoPagamento(cad.pagamento) : ''),
    }, arquivoEnviado);
    resposta = { item_id: item.id, pasta: item.pasta };
  } else if (op === 'editar') {
    fin.atualizarItem(f, dados.id, dados);
  } else if (op === 'contrato') {
    const item = f.itens.find((i) => i.id === dados.id);
    if (!item || !arquivoEnviado) throw new Error('Escolha o arquivo do contrato.');
    item.contrato = fin.gravarArquivo(pasta, item, `CONTRATO ASSINADO - ${item.nome}`, arquivoEnviado.nome, arquivoEnviado.conteudo, f);
    item.historico.push(`${fin.dataBr(new Date().toISOString().slice(0, 10))} - Contrato assinado salvo na pasta do fornecedor.`);
  } else if (op === 'pagamento') {
    const r = fin.registrarPagamento(f, pasta, dados.id, dados, arquivoEnviado);
    resposta = { comprovante: r.pagamento.comprovante };
  } else if (op === 'recebimento') {
    // recebimento da Tayná (contrato de assessoria/cerimonial): cria a linha da Tayná no financeiro se faltar
    const item = gestao.garantirItemTayna(f, pasta, campos);
    const r = fin.registrarPagamento(f, pasta, item.id, { ...dados, sem_comprovante: !arquivoEnviado }, arquivoEnviado);
    resposta = { item_id: item.id, comprovante: r.pagamento.comprovante };
  } else if (op === 'remover-pagamento') {
    fin.removerPagamento(f, dados.id, dados.pagamento_id);
  } else if (op === 'remover') {
    fin.atualizarItem(f, dados.id, { removido: true });
  } else {
    throw new Error('Operação desconhecida.');
  }
  // planilha do Google: o Apps Script escreve a aba (a cada 10 min); planilha .xlsx na pasta: o sistema escreve já
  const temGoogle = fs.existsSync(path.join(DADOS, 'planilhas', `${String(campos.numero_os || '').trim()}.json`));
  fin.salvar(DADOS, arquivo, f, temGoogle ? campos.numero_os : undefined);
  if (!temGoogle) escreverPlanilhaXlsx(arquivo, f, pasta);
  limparCacheFin();
  return { ok: true, ...resposta, ...fin.resumo(f) };
}

/**
 * Financeiro do casal como está agora. Enquanto nada foi lançado no sistema para o casal, acompanha a planilha
 * (reimporta a aba FINANCEIRO quando a cópia do Google ou o .xlsx é mais novo que a última importação).
 */
function financeiroAtual(arquivo, campos, local = null) {
  const { pasta, existe } = local || acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
  let dados = fin.carregar(DADOS, arquivo);
  let importado = null;
  const soImportado = (d) => d && d.importado_de && d.itens.every((i) => i.importado && !i.removido
    && (i.pagamentos || []).every((p) => p.importado) && !i.contrato && !i.atualizado_em);
  if (dados && !soImportado(dados)) return { dados, importado };
  const pl0 = existe ? ev.localizarPlanilha(pasta) : {};
  const bruto = planilhaCasal.linhasFinanceiro(DADOS, arquivo, pl0.arquivo, campos.numero_os);
  if (bruto && (!dados || Number(bruto.quando) > Number(dados.importado_de.quando || 0))) {
    const novo = fin.importarLinhas(bruto.linhas, existe ? pasta : null);
    if (novo.itens.length || !dados) {
      if (dados && dados.vencimentos) novo.vencimentos = dados.vencimentos; // vencimentos cadastrados no sistema continuam
      dados = fin.aplicarVencimentos(novo);
      dados.importado_de = { ...bruto.fonte, quando: bruto.quando, em: new Date().toISOString() };
      // só importado: a planilha continua igual, nada a escrever de volta no Google ainda
      fin.salvar(DADOS, arquivo, dados);
      importado = dados.itens.length;
    }
  }
  return { dados, importado };
}

/**
 * Casal com PLANILHA DE ASSESSORIA .xlsx na pasta (sem planilha do Google): escreve a aba FINANCEIRO do arquivo
 * com o que está no sistema e guarda a situação (quando, ou o erro) para mostrar na tela.
 */
function escreverPlanilhaXlsx(arquivo, f, pasta) {
  const pl = ev.localizarPlanilha(pasta);
  if (!pl.arquivo || pl.gsheet) return null;
  try {
    const r = escreverFinanceiroXlsx(pl.arquivo, fin.linhasParaGoogle(f));
    f.planilha_escrita = { em: new Date().toISOString(), arquivo: path.basename(pl.arquivo), linhas: r.linhas };
  } catch (e) {
    const ocupado = /EBUSY|EPERM|EACCES/.test(e.code || e.message);
    f.planilha_escrita = { em: new Date().toISOString(), arquivo: path.basename(pl.arquivo),
      erro: ocupado ? 'a planilha está aberta no Excel (feche e lance de novo para atualizar)' : e.message };
  }
  fin.salvar(DADOS, arquivo, f);
  return f.planilha_escrita;
}

/**
 * Contratos com número + financeiro atual de cada um (para a gestão). Guarda por 1 minuto o financeiro de cada
 * casal (procurar a planilha na pasta do Drive é lento); qualquer lançamento ou importação limpa a memória.
 */
const CACHE_FIN = new Map();
const limparCacheFin = () => CACHE_FIN.clear();
function contratosComFinanceiro() {
  const contratos = listarTxt(DADOS).filter((c) => c.campos.numero_os);
  const carregarFin = (arquivo) => {
    const guardado = CACHE_FIN.get(arquivo);
    if (guardado && Date.now() - guardado.t < 60e3) return guardado.dados;
    const c = contratos.find((x) => x.arquivo === arquivo);
    let dados;
    try { dados = c ? financeiroAtual(arquivo, c.campos).dados : fin.carregar(DADOS, arquivo); } catch { dados = fin.carregar(DADOS, arquivo); }
    CACHE_FIN.set(arquivo, { dados, t: Date.now() });
    return dados;
  };
  return { contratos, carregarFin };
}

const rotas = {
  // ---- Financeiro (fornecedores do casal, pagamentos e comprovantes) ----
  'GET /api/financeiro': (q) => {
    const { arquivo, campos } = contratoDe(q.get('arquivo'));
    const { pasta, existe } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const { dados, importado } = financeiroAtual(arquivo, campos, { pasta, existe });
    CACHE_FIN.set(arquivo, { dados, t: Date.now() });
    return {
      ...fin.resumo(dados), importado, sem_dados: !dados, importado_de: dados?.importado_de || null,
      planilha_google: Boolean(ev.localizarPlanilha(pasta).gsheet), pasta, pasta_existe: existe,
      fornecedores: fin.listarFornecedores(DADOS), formas: fin.FORMAS, casal: campos.evento_nomes, numero_os: campos.numero_os,
      data_evento: campos.evento_data || '', valor_assessoria: campos.valor_total || '',
      planilha_escrita: dados?.planilha_escrita || null,
      planilha_xlsx: (() => { const pl = existe ? ev.localizarPlanilha(pasta) : {}; return pl.arquivo && !pl.gsheet ? path.basename(pl.arquivo) : null; })(),
    };
  },

  // ---- Gestão: recebimentos da Tayná, pagamentos de todos os casais, painel ----
  'GET /api/gestao/recebimentos': () => { const { contratos, carregarFin } = contratosComFinanceiro(); return gestao.recebimentos(contratos, carregarFin); },
  'GET /api/gestao/pagamentos': (q) => {
    const { contratos, carregarFin } = contratosComFinanceiro();
    return gestao.pagamentos(contratos, carregarFin, undefined, { dias: Number(q.get('dias')) || 30 });
  },
  'GET /api/gestao/painel': () => {
    const { contratos, carregarFin } = contratosComFinanceiro();
    const cronograma = (arquivo, campos) => {
      const evento = ev.carregarEvento(DADOS, arquivo, campos, {});
      return montarChecklist(campos, evento.vertente || (/^s/i.test(campos.destination || '') ? 'destination' : 'padrao'), undefined, evento).ritmo;
    };
    const painel = gestao.painel(contratos, carregarFin, cronograma);
    // a página de gestão usa uma chamada só (recebimentos e pagamentos já calculados no painel)
    return { ...painel, recebimentos: gestao.recebimentos(contratos, carregarFin), pagamentos: gestao.pagamentos(contratos, carregarFin) };
  },

  // escreve agora a aba FINANCEIRO da planilha .xlsx do casal com o que está no sistema
  'POST /api/financeiro/escrever-planilha': (q, corpo) => {
    const { arquivo, campos } = contratoDe(corpo.arquivo);
    const { pasta } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const f = fin.carregar(DADOS, arquivo);
    if (!f) throw new Error('Este casal ainda não tem financeiro.');
    const r = escreverPlanilhaXlsx(arquivo, f, pasta);
    if (!r) throw new Error('Não há planilha .xlsx na pasta do casal.');
    if (r.erro) throw new Error(`Não consegui atualizar ${r.arquivo}: ${r.erro}`);
    limparCacheFin();
    return { ok: true, ...r };
  },

  // vencimentos do saldo de cada fornecedor (não muda a planilha nem tira o casal do acompanhamento dela)
  'POST /api/financeiro/vencimentos': (q, corpo) => {
    const { arquivo } = contratoDe(corpo.arquivo);
    const f = fin.carregar(DADOS, arquivo);
    if (!f) throw new Error('Este casal ainda não tem financeiro.');
    fin.definirVencimentos(f, corpo.itens || []);
    fin.salvar(DADOS, arquivo, f);
    limparCacheFin();
    return { ok: true, ...fin.resumo(f) };
  },

  // relatório de receitas da Tayná no ano (Imposto de Renda / contador): Excel + PDF em CONTRATOS/RELATÓRIOS
  'POST /api/gestao/relatorio-ir': (q, corpo) => {
    const ano = Number(corpo.ano) || new Date().getFullYear();
    if (ano < 2000 || ano > 2100) throw new Error('Ano inválido.');
    const { contratos, carregarFin } = contratosComFinanceiro();
    const clienteDe = (campos) => {
      const arq = campos.cliente && path.join(DIR_CLIENTES, nomeArquivo(campos.cliente));
      return arq && fs.existsSync(arq) ? lerTxt(arq) : null;
    };
    return gerarRelatorioIR({ contratos, carregarFin, clienteDe, empresa: lerJson(ARQ_EMPRESA, {}), ano, pasta: path.join(DIR_GERADOS, 'RELATÓRIOS') });
  },

  'GET /api/fornecedores': () => fin.listarFornecedores(DADOS),
  'POST /api/fornecedores': (q, corpo) => fin.salvarFornecedor(DADOS, corpo.fornecedor || {}),

  // reimporta da planilha (descarta o que foi lançado no sistema para este casal — só com confirmação)
  'POST /api/financeiro/importar': (q, corpo) => {
    const { arquivo, campos } = contratoDe(corpo.arquivo);
    const { pasta, existe } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const atual = fin.carregar(DADOS, arquivo);
    if (atual && atual.itens.some((i) => !i.importado || (i.pagamentos || []).some((p) => !p.importado)) && !corpo.substituir) {
      throw new Error('Já há lançamentos feitos no sistema para este casal. Confirme para substituir pelo que está na planilha.');
    }
    const pl = ev.localizarPlanilha(pasta);
    const bruto = corpo.texto
      ? { linhas: planilhaCasal.linhasDeTextoColado(corpo.texto), fonte: { tipo: 'colado', titulo: 'aba FINANCEIRO colada' }, quando: Date.now() }
      : planilhaCasal.linhasFinanceiro(DADOS, arquivo, pl.arquivo, campos.numero_os);
    if (!bruto) throw new Error('Ainda não há cópia da aba FINANCEIRO deste casal: use "Colar da planilha" (ou instale a cópia diária do Google).');
    const dados = fin.importarLinhas(bruto.linhas, existe ? pasta : null);
    if (atual && atual.vencimentos) { dados.vencimentos = atual.vencimentos; fin.aplicarVencimentos(dados); }
    if (!dados.itens.length) throw new Error('Não encontrei fornecedores no que foi colado. Copie a aba FINANCEIRO a partir da linha do cabeçalho (Fornecedor) até o TOTAL.');
    dados.importado_de = { ...bruto.fonte, quando: bruto.quando, em: new Date().toISOString() };
    fin.salvar(DADOS, arquivo, dados);
    limparCacheFin();
    return { ok: true, itens: dados.itens.length };
  },

  // cópia diária das planilhas do Google (Apps Script) — integracoes/google-apps-script/INSTALAR.md
  'GET /api/sincronizacao': () => planilhaCasal.situacaoSincronizacao(DADOS),

  // cria a planilha de assessoria (.xlsx) de um contrato já gerado, se ainda não existir
  'POST /api/planilha/criar': async (q, corpo) => {
    const { arquivo } = contratoDe(corpo.arquivo);
    const r = await criarPlanilhaDoContrato(path.join(DADOS, arquivo), { saida: DIR_GERADOS, clientes: DIR_CLIENTES, empresa: ARQ_EMPRESA });
    return { criada: r.criada, arquivo: r.arquivo, pasta: r.pastaCasal };
  },

  'GET /api/config': () => ({
    modo: PASTAS.modo,
    pasta: DIR_GERADOS,
    dados: DADOS,
    servicos: Object.fromEntries(
      Object.entries(lerJson(path.join(RAIZ, 'templates', 'servicos.json'), {})).filter(([k]) => !k.startsWith('_')),
    ),
    sequencias: lerJson(ARQ_SEQ, { AS: 0, CE: 0 }),
    empresa: lerJson(ARQ_EMPRESA, {}).razao_social || '(dados da empresa não encontrados)',
  }),

  'GET /api/clientes': () =>
    listarTxt(DIR_CLIENTES).map(({ arquivo, campos }) => ({
      arquivo, nome: campos.nome || arquivo, cpf: campos.cpf_cnpj || campos.cpf || '',
    })),

  'GET /api/cliente': (q) => {
    const arq = path.join(DIR_CLIENTES, nomeArquivo(q.get('arquivo')));
    if (!fs.existsSync(arq)) throw new Error('Cliente não encontrado.');
    return lerTxt(arq);
  },

  'GET /api/contratos': () =>
    listarTxt(DADOS).map(({ arquivo, campos }) => ({
      arquivo,
      numero_os: campos.numero_os || '',
      evento_nomes: campos.evento_nomes || '',
      evento_data: campos.evento_data || campos.evento_periodo || '',
      servicos: campos.servicos || '',
      status: campos.status || '',
      situacao_financeira: campos.situacao_financeira || '',
      valor_total: campos.valor_total || '',
      destination: campos.destination || '',
      evento_horario: campos.evento_horario || '',
      evento_local: campos.evento_local || '',
    })),

  'GET /api/contrato': (q) => {
    const arq = path.join(DADOS, nomeArquivo(q.get('arquivo')));
    if (!fs.existsSync(arq)) throw new Error('Contrato não encontrado.');
    const campos = lerTxt(arq);
    let cliente = {};
    const arqCli = campos.cliente && path.join(DIR_CLIENTES, nomeArquivo(campos.cliente));
    if (arqCli && fs.existsSync(arqCli)) cliente = lerTxt(arqCli);
    return { campos, cliente, cliente_arquivo: arqCli && fs.existsSync(arqCli) ? path.basename(arqCli) : '' };
  },

  'POST /api/previa': (q, corpo) => previa(corpo.contrato || {}, corpo.cliente || {}),

  'POST /api/gerar': async (q, corpo) => {
    const cli = corpo.cliente || {};
    const con = { ...(corpo.contrato || {}) };
    if (!cli.nome) throw new Error('Informe o nome do contratante.');
    if (!cli.cpf_cnpj) throw new Error('Informe o CPF do contratante.');
    if (!con.evento_nomes) throw new Error('Informe os nomes do casal / evento.');

    // valida antes de gravar qualquer coisa
    previa(con, cli);

    let arqCliente;
    if (corpo.cliente_arquivo) {
      arqCliente = nomeArquivo(corpo.cliente_arquivo);
    } else {
      // cliente novo: reaproveita o arquivo só se for a mesma pessoa (mesmo CPF)
      const base = nomeArquivo(cli.nome).replace(/\.txt$/, '');
      const cpf = String(cli.cpf_cnpj || '').replace(/\D/g, '');
      arqCliente = `${base}.txt`;
      for (let i = 2; fs.existsSync(path.join(DIR_CLIENTES, arqCliente)); i += 1) {
        const existente = String(lerTxt(path.join(DIR_CLIENTES, arqCliente)).cpf_cnpj || '').replace(/\D/g, '');
        if (cpf && existente === cpf) break;
        arqCliente = `${base}-${i}.txt`;
      }
    }
    fs.writeFileSync(path.join(DIR_CLIENTES, arqCliente), paraTxt(cli, `Cliente: ${cli.nome}`));
    con.cliente = arqCliente.replace(/\.txt$/, '');

    let arqContrato;
    if (corpo.contrato_arquivo) {
      // editando um contrato existente: mantém o arquivo e o número já reservado
      arqContrato = nomeArquivo(corpo.contrato_arquivo);
      const atual = path.join(DADOS, arqContrato);
      if (!con.numero_os && fs.existsSync(atual)) con.numero_os = lerTxt(atual).numero_os || '';
    } else {
      // contrato novo: nunca sobrescreve outro com o mesmo nome
      const base = nomeArquivo(con.evento_nomes).replace(/\.txt$/, '');
      arqContrato = `${base}.txt`;
      for (let i = 2; fs.existsSync(path.join(DADOS, arqContrato)); i += 1) arqContrato = `${base}-${i}.txt`;
    }
    const caminho = path.join(DADOS, arqContrato);
    fs.writeFileSync(caminho, paraTxt(con, `Contrato: ${con.evento_nomes}`));

    const r = await gerarContrato(caminho, {
      saida: DIR_GERADOS, clientes: DIR_CLIENTES, sequencias: ARQ_SEQ, empresa: ARQ_EMPRESA,
      pdf: corpo.pdf !== false,
    });
    return {
      numero: r.numero,
      pasta: r.pastaCasal,
      arquivos: r.arquivos.map((a) => path.relative(r.pastaCasal, a)),
      planilha_mantida: !r.planilha.criada,
      contrato_arquivo: arqContrato,
      cliente_arquivo: arqCliente,
    };
  },

  // ---- Gerador de Checklist ----
  'GET /api/checklist/vertentes': () => listarVertentes(),

  'GET /api/checklist/previa': (q) => {
    const { arquivo, campos, cliente } = contratoDe(q.get('arquivo'));
    const evento = ev.carregarEvento(DADOS, arquivo, campos, cliente);
    const ck = montarChecklist(campos, q.get('vertente') || evento.vertente || 'destination', undefined, evento);
    const destino = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    return { ...ck, destination_contrato: /^s/i.test(campos.destination || ''), pasta: destino.pasta, pasta_existe: destino.existe };
  },

  // ---- Dados do dia do evento (fornecedores, telefones, chegadas, atividades) ----
  'GET /api/evento': (q) => {
    const { arquivo, campos, cliente } = contratoDe(q.get('arquivo'));
    let evento = ev.carregarEvento(DADOS, arquivo, campos, cliente);
    const { pasta } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const pl = ev.localizarPlanilha(pasta);
    // planilha nova ou atualizada desde a última vez: pré-preenche (só o que está vazio) e salva
    const dados = planilhaCasal.fonteDoCasal(DADOS, arquivo, pl.arquivo, campos.numero_os);
    let aplicada = null;
    if (dados && planilhaCasal.assinatura(dados) !== (evento.planilha || {}).assinatura) {
      const junto = ev.aplicarPlanilha(evento, dados);
      aplicada = { novos: junto.novos, atualizados: junto.atualizados };
      delete junto.novos; delete junto.atualizados;
      evento = ev.salvarEvento(DADOS, arquivo, junto);
    }
    return {
      evento, pendencias: ev.pendencias(evento), planilha: { ...pl, sincronizada: dados ? { titulo: dados.fonte?.titulo, url: dados.fonte?.url, tipo: dados.fonte?.tipo, lido_em: dados.lido_em } : null },
      aplicada, categorias: ev.CATEGORIAS, dias: ev.DIAS, campos: ev.CAMPOS, servicos: evPadrao.linhasServicos(evento),
    };
  },

  'POST /api/evento': (q, corpo) => {
    const { arquivo } = contratoDe(corpo.arquivo);
    const salvo = ev.salvarEvento(DADOS, arquivo, corpo.evento || {});
    return { evento: salvo, pendencias: ev.pendencias(salvo), servicos: evPadrao.linhasServicos(salvo) };
  },

  'POST /api/evento/importar': (q, corpo) => {
    const { arquivo, campos, cliente } = contratoDe(corpo.arquivo);
    const { pasta } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const pl = ev.localizarPlanilha(pasta);
    const atual = ev.carregarEvento(DADOS, arquivo, campos, cliente);
    let junto;
    if (corpo.texto) {
      // colado do Google Planilhas
      const lista = ev.lerTextoColado(corpo.texto);
      if (!lista.length) throw new Error('Não reconheci fornecedores no texto colado. Copie as colunas Fornecedor e Descrição da aba FINANCEIRO.');
      junto = ev.importarFornecedores(atual, lista, 'Google Planilhas (colado)');
    } else {
      const dados = planilhaCasal.fonteDoCasal(DADOS, arquivo, pl.arquivo, campos.numero_os);
      if (!dados) {
        throw new Error(pl.gsheet
          ? 'A planilha deste casal está no Google Planilhas e ainda não foi sincronizada. Use "Colar do Google Planilhas": copie a aba FINANCEIRO e cole aqui.'
          : 'Não encontrei a planilha de assessoria na pasta do casal. Cadastre os fornecedores aqui ou cole do Google Planilhas.');
      }
      junto = ev.aplicarPlanilha(atual, dados);
    }
    const { novos, atualizados } = junto;
    delete junto.novos; delete junto.atualizados;
    const salvo = ev.salvarEvento(DADOS, arquivo, junto);
    const dadosPl = planilhaCasal.fonteDoCasal(DADOS, arquivo, pl.arquivo, campos.numero_os);
    const sincronizada = dadosPl ? { titulo: dadosPl.fonte?.titulo, url: dadosPl.fonte?.url, tipo: dadosPl.fonte?.tipo, lido_em: dadosPl.lido_em } : null;
    return { evento: salvo, novos, atualizados, planilha: { ...pl, sincronizada }, pendencias: ev.pendencias(salvo) };
  },

  // tipo: 'evento' (checklist do evento .docx + painel do dia .html) ou 'cronograma' (tarefas, .xlsx)
  'POST /api/checklist/gerar': (q, corpo) => {
    const { arquivo, campos, cliente } = contratoDe(corpo.arquivo);
    const { pasta } = acharPastaCasal(DIR_GERADOS, campos.numero_os, campos.evento_nomes);
    const evento = ev.carregarEvento(DADOS, arquivo, campos, cliente);
    const vertente = corpo.vertente || evento.vertente || 'destination';
    const opc = { novaVersao: Boolean(corpo.novaVersao), destination: vertente === 'destination' };
    const r = corpo.tipo === 'cronograma'
      ? gravarChecklist(montarChecklist(campos, vertente, undefined, evento), pasta, opc)
      : gravarChecklistEvento(campos, { ...evento, vertente }, pasta, opc);
    return { ...r, pasta };
  },

  // Encerra o aplicativo (ele roda em segundo plano, sem janela)
  'POST /api/encerrar': () => {
    console.log('Encerrado pelo botão "Encerrar".');
    setTimeout(() => process.exit(0), 300);
    return { ok: true };
  },

  'POST /api/abrir': (q, corpo) => {
    const alvo = path.resolve(String(corpo.caminho || ''));
    const permitido = [DADOS, DIR_GERADOS].some((b) => alvo === b || dentroDe(b, alvo));
    if (!permitido || !fs.existsSync(alvo)) {
      throw new Error('Caminho fora da pasta de contratos.');
    }
    abrirNoSistema(alvo);
    return { ok: true };
  },
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // Tela inicial (painel de aplicativos) e aplicativos
    const paginas = { '/': 'inicio.html', '/inicio': 'inicio.html', '/contratos': 'index.html', '/index.html': 'index.html', '/checklist': 'checklist.html', '/financeiro': 'financeiro.html', '/gestao': 'gestao.html' };
    if (req.method === 'GET' && paginas[url.pathname]) {
      // versão no endereço da logo/ícone: quando a marca muda, o navegador busca a nova
      const versao = (n) => Math.round(fs.statSync(path.join(RAIZ, 'templates', 'marca', `${n}.png`)).mtimeMs);
      const html = fs.readFileSync(path.join(RAIZ, 'app', paginas[url.pathname]), 'utf8')
        .replace(/\/marca\/(logo|icone)\.png/g, (m, n) => `${m}?v=${versao(n)}`);
      return responder(res, 200, html, 'text/html; charset=utf-8');
    }
    const marca = /^\/marca\/(logo|icone)\.png$/.exec(url.pathname);
    if (req.method === 'GET' && marca) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
      return res.end(fs.readFileSync(path.join(RAIZ, 'templates', 'marca', `${marca[1]}.png`)));
    }
    // envio de arquivo (contrato assinado / comprovante): corpo = bytes do arquivo; dados no endereço
    if (req.method === 'POST' && url.pathname === '/api/financeiro/enviar') {
      const conteudo = await lerBinario(req);
      const nomeArq = decodeURIComponent(String(req.headers['x-nome-arquivo'] || ''));
      return responder(res, 200, enviarFinanceiro(url.searchParams, conteudo.length ? { nome: nomeArq, conteudo } : null));
    }
    const rota = rotas[`${req.method} ${url.pathname}`];
    if (!rota) return responder(res, 404, { erro: 'Não encontrado' });
    const corpo = req.method === 'POST' ? await lerCorpo(req) : {};
    return responder(res, 200, await rota(url.searchParams, corpo));
  } catch (e) {
    const detalhes = e.properties?.errors?.map((x) => x.properties.explanation).join(' · ');
    return responder(res, 400, { erro: detalhes ? `${e.message}: ${detalhes}` : e.message });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  const endereco = `http://localhost:${PORTA}`;
  console.log('Tayná Alves Assessoria — aplicativos');
  console.log(`  Aplicativo: ${endereco}`);
  console.log(PASTAS.modo === 'drive'
    ? `  Google Drive: ${DIR_GERADOS}`
    : `  ATENÇÃO: Google Drive não encontrado — salvando em ${DIR_GERADOS}`);
  console.log(`  Dados do sistema: ${DADOS}`);
  console.log('  Para encerrar: botão "Encerrar" na tela inicial (ou feche esta janela, se estiver visível).');
  if (!args.includes('--sem-navegador')) {
    const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const a = process.platform === 'win32' ? ['/c', 'start', '', endereco] : [endereco];
    spawn(cmd, a, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`O aplicativo já está aberto em http://localhost:${PORTA}`);
    if (!args.includes('--sem-navegador') && process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', `http://localhost:${PORTA}`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
    process.exit(0);
  }
  throw e;
});

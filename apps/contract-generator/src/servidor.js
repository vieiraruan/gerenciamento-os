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
const { gerarContrato } = require('./index');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opc = (n) => (args.indexOf(n) > -1 ? args[args.indexOf(n) + 1] : undefined);
const PORTA = Number(opc('--porta') || process.env.PORTA || 3210);
const DADOS = path.resolve(
  args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--porta') ||
  process.env.CONTRATOS_DADOS ||
  path.join(RAIZ, '..', '..', '..', 'contratos'),
);
const DIR_CLIENTES = path.join(DADOS, 'clientes');
const DIR_GERADOS = path.join(DADOS, 'gerados');
const ARQ_SEQ = process.env.CONTRATOS_SEQUENCIAS || path.join(RAIZ, 'config', 'sequencias.json');

fs.mkdirSync(DIR_CLIENTES, { recursive: true });
fs.mkdirSync(DIR_GERADOS, { recursive: true });

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
  const empresa = lerJson(path.join(RAIZ, 'config', 'empresa.json'), {});
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

const rotas = {
  'GET /api/config': () => ({
    pasta: DADOS,
    servicos: Object.fromEntries(
      Object.entries(lerJson(path.join(RAIZ, 'templates', 'servicos.json'), {})).filter(([k]) => !k.startsWith('_')),
    ),
    sequencias: lerJson(ARQ_SEQ, { AS: 0, CE: 0 }),
    empresa: lerJson(path.join(RAIZ, 'config', 'empresa.json'), {}).razao_social || '(configure config/empresa.json)',
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

  'POST /api/gerar': (q, corpo) => {
    const cli = corpo.cliente || {};
    const con = { ...(corpo.contrato || {}) };
    if (!cli.nome) throw new Error('Informe o nome do contratante.');
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

    const r = gerarContrato(caminho, {
      saida: DIR_GERADOS, clientes: DIR_CLIENTES, sequencias: ARQ_SEQ, pdf: corpo.pdf !== false,
    });
    return {
      numero: r.numero,
      pasta: r.pasta,
      arquivos: r.arquivos.map((a) => path.basename(a)),
      contrato_arquivo: arqContrato,
      cliente_arquivo: arqCliente,
    };
  },

  'POST /api/abrir': (q, corpo) => {
    const alvo = path.resolve(String(corpo.caminho || ''));
    if (!(alvo === DADOS || dentroDe(DADOS, alvo)) || !fs.existsSync(alvo)) {
      throw new Error('Caminho fora da pasta de contratos.');
    }
    abrirNoSistema(alvo);
    return { ok: true };
  },
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return responder(res, 200, fs.readFileSync(path.join(RAIZ, 'app', 'index.html'), 'utf8'), 'text/html; charset=utf-8');
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
  console.log('Gerador de contratos — Tayná Alves Assessoria');
  console.log(`  Aplicativo: ${endereco}`);
  console.log(`  Pasta de dados: ${DADOS}`);
  console.log('  Para encerrar, feche esta janela.');
  if (!args.includes('--sem-navegador')) {
    const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const a = process.platform === 'win32' ? ['/c', 'start', '', endereco] : [endereco];
    spawn(cmd, a, { detached: true, stdio: 'ignore' }).unref();
  }
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`O aplicativo já está aberto em http://localhost:${PORTA}`);
    if (!args.includes('--sem-navegador') && process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', `http://localhost:${PORTA}`], { detached: true, stdio: 'ignore' }).unref();
    }
    process.exit(0);
  }
  throw e;
});

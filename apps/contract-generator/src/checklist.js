'use strict';

/**
 * Gerador de Checklist do evento (cronograma de tarefas da assessoria).
 *
 * Vertentes (templates/checklists/<vertente>.json):
 *   destination  — modelo do casal Hanna & Ivan (casamento fora da Região Metropolitana)  ✅
 *   padrao       — casamento na Região Metropolitana do Recife                          (em breve)
 *
 * As tarefas ficam agrupadas por "meses antes do evento"; com a data do evento, cada etapa
 * ganha o período (de/até) e a situação em relação a hoje (vencida / atual / futura).
 * A planilha .xlsx segue o visual do "CRONOGRAMA - CHECK LIST" da planilha de assessoria.
 */
const fs = require('fs');
const path = require('path');
const { parseData } = require('./parser');
const { criarXlsx } = require('./xlsx');

const RAIZ = path.resolve(__dirname, '..');
const DIR_MODELOS = path.join(RAIZ, 'templates', 'checklists');
const LOGO = path.join(RAIZ, 'templates', 'marca', 'logo.png');

const VERTENTES = {
  destination: { nome: 'Destination', arquivo: 'destination.json', disponivel: true },
  padrao: { nome: 'Sem destination', arquivo: 'padrao.json', disponivel: false },
};

function listarVertentes() {
  return Object.entries(VERTENTES).map(([id, v]) => ({
    id, nome: v.nome, disponivel: v.disponivel && fs.existsSync(path.join(DIR_MODELOS, v.arquivo)),
  }));
}

function carregarModelo(vertente) {
  const v = VERTENTES[vertente];
  if (!v) throw new Error(`Vertente de checklist desconhecida: ${vertente}`);
  const arq = path.join(DIR_MODELOS, v.arquivo);
  if (!v.disponivel || !fs.existsSync(arq)) throw new Error(`O checklist "${v.nome}" ainda não está disponível.`);
  return JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
}

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------
function somarMeses(data, n) {
  const d = new Date(data.getFullYear(), data.getMonth() + n, 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(data.getDate(), ultimo));
  return d;
}
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dataBr = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hojeSemHora = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); };

function rotuloMeses(m) { return m === 1 ? '1 MÊS ANTES' : `${m} MESES ANTES`; }

/**
 * Monta o checklist (estrutura de dados) a partir do contrato e da vertente.
 * @param {object} contrato campos do .txt do contrato (evento_nomes, evento_data, ...)
 */
function montarChecklist(contrato, vertente = 'destination', hoje = hojeSemHora()) {
  const modelo = carregarModelo(vertente);
  let evento = null;
  try { evento = contrato.evento_data ? parseData(contrato.evento_data) : null; } catch { evento = null; }

  let ordem = 0;
  const secoes = modelo.secoes
    .slice().sort((a, b) => b.meses - a.meses)
    .map((s) => {
      let inicio = null; let fim = null; let situacao = null;
      if (evento) {
        inicio = somarMeses(evento, -s.meses);
        fim = somarDias(s.meses > 1 ? somarMeses(evento, -(s.meses - 1)) : evento, -1);
        situacao = hoje > fim ? 'vencida' : hoje >= inicio ? 'atual' : 'futura';
      }
      return {
        meses: s.meses,
        rotulo: rotuloMeses(s.meses),
        inicio: inicio && dataBr(inicio),
        fim: fim && dataBr(fim),
        situacao,
        itens: s.itens.map((i) => ({ ordem: ++ordem, texto: i.texto, sugerido: Boolean(i.sugerido) })),
      };
    });

  return {
    vertente,
    titulo: modelo.titulo,
    status: modelo.status,
    evento: {
      numero_os: contrato.numero_os || '',
      nomes: String(contrato.evento_nomes || '').replace(/\s+/g, ' ').trim(),
      data: evento ? dataBr(evento) : '',
      data_extenso: evento ? evento.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
      periodo: contrato.evento_periodo || '',
      horario: contrato.evento_horario || '',
      local: contrato.evento_local || '',
      convidados: contrato.convidados || '',
      padrinhos: contrato.padrinhos || contrato.casais_padrinhos || '',
      criancas: contrato.criancas || '',
    },
    total_itens: ordem,
    secoes,
  };
}

// ---------------------------------------------------------------------------
// Planilha
// ---------------------------------------------------------------------------
const MARCA = '97492D';
const MARCA_ESCURA = '8D432A';
const ESTILOS = {
  cab: { negrito: true, cor: 'FFFFFF', fundo: MARCA, alinhar: 'center', borda: 'medium', corBorda: MARCA, tamanho: 12 },
  rot: { negrito: true, borda: 'thin', alinhar: 'left', cor: '3A2A25' },
  val: { borda: 'thin', alinhar: 'left', quebrar: true },
  colcab: { negrito: true, cor: 'FFFFFF', fundo: MARCA_ESCURA, alinhar: 'center', borda: 'medium', corBorda: MARCA_ESCURA, quebrar: true },
  secao: { negrito: true, cor: 'FFFFFF', fundo: MARCA, alinhar: 'center', borda: 'medium', corBorda: MARCA },
  ordem: { negrito: true, alinhar: 'center', borda: 'thin' },
  item: { tamanho: 10, alinhar: 'left', quebrar: true, borda: 'thin' },
  status: { negrito: true, alinhar: 'center', borda: 'thin', tamanho: 10 },
  obs: { tamanho: 10, alinhar: 'left', quebrar: true, borda: 'thin' },
  moeda: { formato: '"R$" #,##0.00', borda: 'thin', alinhar: 'right' },
  total: { negrito: true, alinhar: 'right', borda: 'medium', corBorda: MARCA, fundo: 'F3E6DF' },
  totalMoeda: { negrito: true, formato: '"R$" #,##0.00', borda: 'medium', corBorda: MARCA, fundo: 'F3E6DF', alinhar: 'right' },
  nota: { italico: true, tamanho: 9, cor: '7B6F6A' },
};
const DESTAQUES = [
  { fundo: 'E2F0D9', cor: '375623', negrito: true }, // FINALIZADO
  { fundo: 'FFF2CC', cor: '7F6000', negrito: true }, // EM ANDAMENTO
  { fundo: 'DDEBF7', cor: '1F4E78', negrito: true }, // EM COTAÇÃO
  { fundo: 'EDEDED', cor: '7F7F7F', negrito: true }, // NÃO SE APLICA / NÃO DESEJO
];

function alturaTexto(texto, porLinha = 62) {
  const linhas = String(texto).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / porLinha)), 0);
  return Math.max(18, 13.5 * linhas + 4);
}

function planilhaChecklist(ck) {
  const L = [];
  const mesclas = [];
  const e = ck.evento;
  const linha = (n, celulas, altura) => L.push({ n, celulas, altura });

  linha(2, { B: { v: 'INFORMAÇÕES', s: 'cab' }, C: { s: 'cab' }, D: { s: 'cab' }, E: { s: 'cab' } }, 22);
  mesclas.push('B2:E2');
  linha(3, { B: { v: 'NOIVOS:', s: 'rot' }, C: { v: e.nomes.toUpperCase(), s: 'val' }, D: { s: 'val' }, E: { s: 'val' } });
  mesclas.push('C3:E3');
  linha(4, {
    B: { v: 'DATA DO EVENTO:', s: 'rot' },
    C: { v: e.data ? `${e.data} (${e.data_extenso.split(',')[0]})` : (e.periodo ? `A definir (${e.periodo})` : 'A definir'), s: 'val' },
    D: { v: 'HORÁRIO:', s: 'rot' }, E: { v: e.horario || 'A definir', s: 'val' },
  });
  linha(5, {
    B: { v: 'QTD. CONVIDADOS:', s: 'rot' }, C: { v: Number(e.convidados) || e.convidados || '', s: 'val' },
    D: { v: 'CASAIS DE PADRINHOS:', s: 'rot' }, E: { v: Number(e.padrinhos) || e.padrinhos || '', s: 'val' },
  });
  linha(6, {
    B: { v: 'QTD. CRIANÇAS:', s: 'rot' }, C: { v: Number(e.criancas) || e.criancas || '', s: 'val' },
    D: { v: 'CONTRATO:', s: 'rot' }, E: { v: [e.numero_os, 'Destination'].filter(Boolean).join(' · '), s: 'val' },
  });
  linha(7, { B: { v: 'LOCAL:', s: 'rot' }, C: { v: e.local || 'A definir', s: 'val' }, D: { s: 'val' }, E: { s: 'val' } },
    alturaTexto(e.local || '', 90));
  mesclas.push('C7:E7');

  linha(9, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: i ? undefined : ck.titulo, s: 'cab' }])), 24);
  mesclas.push('B9:H9');
  const cab = ['ORDEM', 'ITENS', 'STATUS', 'OBSERVAÇÕES', 'ESTIMATIVA (R$)', 'VALOR FINAL (R$)', 'FORNECEDOR'];
  linha(10, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: cab[i], s: 'colcab' }])), 20);

  let n = 11;
  const primeiraItem = n + 1;
  for (const s of ck.secoes) {
    const periodo = s.inicio ? `   ·   de ${s.inicio} a ${s.fim}` : '';
    linha(n, Object.fromEntries('BCDEFGH'.split('').map((c, i) => [c, { v: i ? undefined : `${s.rotulo}${periodo}`, s: 'secao' }])), 19);
    mesclas.push(`B${n}:H${n}`);
    n++;
    for (const it of s.itens) {
      linha(n, {
        B: { v: it.ordem, s: 'ordem' }, C: { v: it.texto, s: 'item' }, D: { s: 'status' }, E: { s: 'obs' },
        F: { s: 'moeda' }, G: { s: 'moeda' }, H: { s: 'obs' },
      }, alturaTexto(it.texto));
      n++;
    }
  }
  const ultimaItem = n - 1;
  linha(n, {
    B: { s: 'total' }, C: { s: 'total' }, D: { s: 'total' }, E: { v: 'TOTAL', s: 'total' },
    F: { f: `SUM(F${primeiraItem}:F${ultimaItem})`, s: 'totalMoeda' },
    G: { f: `SUM(G${primeiraItem}:G${ultimaItem})`, s: 'totalMoeda' }, H: { s: 'total' },
  }, 20);
  linha(n + 2, { B: { v: `Gerado pelo sistema Tayná Alves Assessoria em ${dataBr(new Date())}.`, s: 'nota' } });

  const faixa = `D${primeiraItem}:D${ultimaItem}`;
  return criarXlsx({
    estilos: ESTILOS,
    abas: [{
      nome: 'CHECKLIST',
      colunas: { A: 2.5, B: 22, C: 58, D: 23, E: 34, F: 17, G: 17, H: 26 },
      linhas: L,
      mesclas,
      congelar: 11,
      semGrade: true,
      validacoes: [{ sqref: faixa, lista: ck.status }],
      destaques: DESTAQUES,
      condicional: [{
        sqref: faixa,
        regras: [
          { valor: 'FINALIZADO', dxf: 0 }, { valor: 'EM ANDAMENTO', dxf: 1 }, { valor: 'EM COTAÇÃO', dxf: 2 },
          { valor: 'NÃO SE APLICA', dxf: 3 }, { valor: 'NÃO DESEJO', dxf: 3 },
        ],
      }],
      imagem: fs.existsSync(LOGO)
        ? { png: fs.readFileSync(LOGO), col: 'G', linha: 2, dx: 20, dy: 2, largura: 176, altura: 132 }
        : null,
    }],
  });
}

function nomeArquivoChecklist(ck, sufixo = '') {
  const nomes = ck.evento.nomes.replace(/[\\/:*?"<>|]/g, '').trim() || 'Evento';
  const v = ck.vertente === 'destination' ? 'DESTINATION' : 'EVENTO';
  return `CHECKLIST ${v} - ${nomes}${sufixo}.xlsx`;
}

/**
 * Grava a planilha na pasta do casal. Nunca sobrescreve: se já existir, devolve
 * { existe: true } — com novaVersao=true grava uma cópia com data e hora no nome.
 */
function gravarChecklist(ck, pastaCasal, { novaVersao = false } = {}) {
  fs.mkdirSync(pastaCasal, { recursive: true });
  let arquivo = path.join(pastaCasal, nomeArquivoChecklist(ck));
  if (fs.existsSync(arquivo)) {
    if (!novaVersao) return { existe: true, arquivo };
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    arquivo = path.join(pastaCasal, nomeArquivoChecklist(ck, ` (${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}h${p(d.getMinutes())})`));
  }
  fs.writeFileSync(arquivo, planilhaChecklist(ck));
  return { existe: false, arquivo };
}

module.exports = { listarVertentes, carregarModelo, montarChecklist, planilhaChecklist, gravarChecklist, nomeArquivoChecklist };

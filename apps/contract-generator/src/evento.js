'use strict';

/**
 * Dados do DIA DO EVENTO de um casal: fornecedores (com telefone e horário de chegada) e atividades
 * com horário. Base para o checklist do evento (roteiro .docx) e o painel do dia (HTML para iPad).
 *
 * - Fornecedores vêm do CONTROLE FINANCEIRO (aba FINANCEIRO da planilha de assessoria do casal):
 *   nome e descrição do serviço. O que não está lá (telefone, responsável, chegada) é preenchido no app.
 * - Atividades: sugestões do roteiro padrão (making of, saída para a cerimônia...) calculadas pelo
 *   horário da cerimônia + atividades livres. Todas precisam de horário antes de gerar.
 * - Salvo em _DADOS DO SISTEMA/eventos/<contrato>.json
 */
const fs = require('fs');
const path = require('path');
const { lerAba } = require('./xlsxLeitor');
const { parseHora } = require('./contrato');

// Categorias (para agrupar no painel e sugerir a etapa de montagem). Ordem = ordem de exibição.
const CATEGORIAS = [
  ['local', 'Local / espaço', /\b(local|espa[cç]o|villa|vila|casa|s[ií]tio|fazenda|pousada|hotel|igreja|par[oó]quia|capela)\b/i],
  ['estrutura', 'Som, iluminação e estrutura', /\b(som|sonoriza|ilumina|estrutura|palco|led|tablado|tenda|cobert|ramalho|q30)/i],
  ['gerador', 'Gerador', /gerador/i],
  ['decoracao', 'Decoração e mobiliário', /\b(decor|mobili|flor|buqu|mesas?|cadeiras?)/i],
  ['buffet', 'Buffet e alimentação', /\b(buffet|bufe|churrasc|comida|coffee|card[aá]pio|vegan|gastronom)/i],
  ['bebidas', 'Bebidas, bar e chopp', /\b(bebida|drink|bar\b|barman|chopp|chope|coco|cerveja|espumante)/i],
  ['bolo_doces', 'Bolo e doces', /\b(bolo|doce|brigad|bem.?casad|confeit)/i],
  ['musica', 'Música (banda, DJ, orquestra)', /\b(banda|dj|orquestra|m[uú]sic|samba|sax|cantor|ax[eé])/i],
  ['foto_video', 'Foto e vídeo', /\b(foto|v[ií]deo|film|drone|cabine)/i],
  ['beleza', 'Cabelo e maquiagem', /\b(make|maqui|cabel|hair|beleza|noiva por)/i],
  ['servicos', 'Limpeza, segurança e apoio', /\b(limpeza|seguran|carregador|ambul[aâ]nc|bombeir|banheir|\bwc\b|valet|manobr|copeir)/i],
  ['transporte', 'Transporte e passeios', /\b(transfer|translado|transporte|van|[oô]nibus|passeio|barco|lancha)/i],
  ['papelaria', 'Papelaria e personalizados', /\b(papelaria|convite|ecobag|lembran|personaliz|copos?|kit|bal[oõ]es)/i],
  ['outros', 'Outros', /.*/],
];

const ROTULO_CATEGORIA = Object.fromEntries(CATEGORIAS.map(([id, nome]) => [id, nome]));

// Quando o fornecedor chega / atua
const DIAS = {
  vespera: 'Véspera (montagem)',
  evento: 'Dia do casamento',
  posterior: 'Outro dia (programação extra)',
  nao: 'Sem horário (só contato)',
};

function categorizar(texto) {
  return (CATEGORIAS.find(([, , re]) => re.test(texto || '')) || CATEGORIAS[CATEGORIAS.length - 1])[0];
}

// Atividades padrão do dia (minutos em relação ao início da cerimônia) — roteiro Hanna & Ivan.
const ATIVIDADES_PADRAO = [
  [-420, 'Café da manhã dos noivos', []],
  [-390, 'Banho da noiva', [
    'Lavar o cabelo apenas com shampoo (condicionador só para desembaraçar, retirando totalmente);',
    'Cabelo pode ser totalmente seco ou escovado;',
    'Usar camisa de abertura frontal ou robe;',
    'Pele 100% limpa para receber a maquiagem.',
  ]],
  [-330, 'Chegada do cabelo e make da noiva', []],
  [-210, 'Ida do cerimonial ao quarto da noiva', [
    'Organizar o quarto da noiva;',
    'Organizar e fotografar os itens pessoais da noiva (joias, buquê, sapato, vestido);',
    'Verificar se a noiva deseja almoçar;',
    'Separar a bolsa da noiva: maquiagem, perfume, desodorante, sandália, medicações, vestido extra.',
  ]],
  [-150, 'Chegada de foto e vídeo para o making of da noiva', []],
  [-90, 'Passagem do som | Teste de som', []],
  [-90, 'Chegada do cerimonial ao local da cerimônia', []],
  [-90, 'Banho do noivo', ['Fazer a barba e ficar impecável.']],
  [-60, 'Making of do noivo (foto e vídeo)', [
    'Noivo pronto e vestido, faltando abotoar os últimos botões do colarinho e punho;',
    'Colocar o blazer com auxílio de um parente próximo;',
    'Verificar se o noivo deseja alguma foto em especial.',
  ]],
  [-30, 'Sair com o noivo para a cerimônia', []],
  [0, 'Sair com a noiva para a cerimônia / início da cerimônia', []],
  [90, 'Fim da cerimônia: fotos no altar e noivos para hidratação e retoque', []],
  [90, 'Início da recepção', []],
  [null, 'Entrada dos noivos na recepção / dança', []],
  [null, 'Corte do bolo e fotos na mesa do bolo', []],
  [null, 'Jogar o buquê', []],
  [null, 'Encerramento da festa e finalização (conferência de itens com a pessoa indicada pelos noivos)', []],
];

const hhmm = (min) => {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const horaValida = (h) => /^([01]?\d|2[0-3])[:h]([0-5]\d)$/.test(String(h || '').trim());
const normalizarHora = (h) => {
  const m = /^(\d{1,2})[:hH](\d{2})?$/.exec(String(h || '').trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : String(h || '').trim();
};
const novoId = () => Math.random().toString(36).slice(2, 10);
const chave = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Planilha do casal / controle financeiro
// ---------------------------------------------------------------------------
function localizarPlanilha(pastaCasal) {
  const res = { arquivo: null, gsheet: null };
  if (!pastaCasal || !fs.existsSync(pastaCasal)) return res;
  const candidatos = [];
  const varrer = (dir, nivel) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory() && nivel < 1) varrer(p, nivel + 1);
      else if (/planilha/i.test(d.name) && !d.name.startsWith('~$')) {
        if (/\.xlsx$/i.test(d.name)) candidatos.push(p);
        else if (/\.gsheet$/i.test(d.name) && !res.gsheet) res.gsheet = p;
      }
    }
  };
  varrer(pastaCasal, 0);
  candidatos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  res.arquivo = candidatos[0] || null;
  return res;
}

/** Fornecedores do controle financeiro (aba FINANCEIRO): [{ nome, servico }] */
function lerFinanceiro(arquivo) {
  const aba = lerAba(arquivo, 'FINANCEIRO');
  if (!aba) throw new Error('A planilha do casal não tem a aba FINANCEIRO.');
  const cab = aba.linhas.find((l) => /fornecedor/i.test(l.c.B || ''));
  const lista = [];
  for (const l of aba.linhas) {
    if (!cab || l.n <= cab.n) continue;
    const nome = String(l.c.B || '').replace(/\s+/g, ' ').trim();
    if (!nome) continue;
    if (/^total/i.test(nome)) break;
    if (/\{\{/.test(nome) || /tayn[aá]\s+alves/i.test(nome)) continue; // modelo vazio / a própria assessoria
    // só o começo da descrição (o resto costuma ser dado de pagamento)
    const desc = String(l.c.C || '').split(/[\n.;]/)[0].replace(/\s+/g, ' ').trim();
    lista.push({ nome, servico: desc.length > 60 ? `${desc.slice(0, 57)}…` : desc });
  }
  return lista;
}

// ---------------------------------------------------------------------------
// Dados do evento
// ---------------------------------------------------------------------------
function arquivoEvento(dirDados, contratoArquivo) {
  return path.join(dirDados, 'eventos', String(contratoArquivo).replace(/\.txt$/i, '.json'));
}

function atividadesPadrao(horaCerimonia) {
  let ini = null;
  try { ini = horaCerimonia ? parseHora(horaCerimonia) : null; } catch { ini = null; }
  return ATIVIDADES_PADRAO.map(([off, texto, detalhes]) => ({
    id: novoId(), hora: ini !== null && off !== null ? hhmm(ini + off) : '', texto, responsavel: '', detalhes, origem: 'padrao',
  }));
}

function novoEvento(contrato) {
  const local = String(contrato.evento_local || '');
  const m = /^(.*?)\s*\(cerim[oô]nia\)\s*(?:e|\/|;|,)\s*(.*?)\s*\(recep[cç][aã]o\)\s*$/i.exec(local);
  return {
    versao: 1,
    info: {
      hora_cerimonia: contrato.evento_horario ? normalizarHora(contrato.evento_horario) : '',
      local_cerimonia: m ? m[1] : local.replace(/\s*\(cerim[oô]nia e recep[cç][aã]o\)/i, ''),
      local_recepcao: m ? m[2] : (local ? 'Mesmo local da cerimônia' : ''),
      responsavel_montagem: 'Tayná Alves',
      telefone_assessoria: '',
      contato_emergencia: '',
      inicio_montagem_vespera: '',
      inicio_montagem_dia: '',
      observacoes: '',
    },
    fornecedores: [],
    atividades: atividadesPadrao(contrato.evento_horario),
    importado_de: null,
    atualizado_em: null,
  };
}

function carregarEvento(dirDados, contratoArquivo, contrato) {
  const arq = arquivoEvento(dirDados, contratoArquivo);
  if (fs.existsSync(arq)) {
    const ev = JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
    return { ...novoEvento(contrato), ...ev, info: { ...novoEvento(contrato).info, ...(ev.info || {}) } };
  }
  return novoEvento(contrato);
}

function salvarEvento(dirDados, contratoArquivo, evento) {
  const arq = arquivoEvento(dirDados, contratoArquivo);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const limpo = {
    ...evento,
    fornecedores: (evento.fornecedores || []).map((f) => ({ ...f, id: f.id || novoId(), chegada: normalizarHora(f.chegada) })),
    atividades: (evento.atividades || []).map((a) => ({ ...a, id: a.id || novoId(), hora: normalizarHora(a.hora) })),
    atualizado_em: new Date().toISOString(),
  };
  fs.writeFileSync(arq, `${JSON.stringify(limpo, null, 2)}\n`);
  return limpo;
}

/** Junta os fornecedores do controle financeiro com os já cadastrados (mantém o que foi preenchido). */
function importarFornecedores(evento, doFinanceiro, origem) {
  const atuais = evento.fornecedores || [];
  const porChave = new Map(atuais.map((f) => [chave(f.nome), f]));
  let novos = 0;
  for (const f of doFinanceiro) {
    const k = chave(f.nome);
    const existente = porChave.get(k);
    if (existente) {
      if (!existente.servico && f.servico) existente.servico = f.servico;
      existente.origem = 'financeiro';
      continue;
    }
    const cat = categorizar(`${f.nome} ${f.servico}`);
    const item = {
      id: novoId(), nome: f.nome, servico: f.servico, categoria: cat, responsavel: '', telefone: '',
      dia: /dia\s*2|segundo dia|p[oó]s.?casamento|passeio|churrasc|pool/i.test(`${f.nome} ${f.servico}`) ? 'posterior'
        : ['papelaria', 'local'].includes(cat) ? 'nao' : 'evento',
      chegada: '', observacao: '', origem: 'financeiro',
    };
    atuais.push(item);
    porChave.set(k, item);
    novos++;
  }
  return { ...evento, fornecedores: atuais, importado_de: origem, importado_em: new Date().toISOString(), novos };
}

/** O que falta preencher antes de gerar o checklist do evento. */
function pendencias(evento) {
  const p = [];
  const i = evento.info || {};
  if (!horaValida(i.hora_cerimonia)) p.push('Horário da cerimônia');
  if (!String(i.local_cerimonia || '').trim()) p.push('Local da cerimônia');
  if (!String(i.local_recepcao || '').trim()) p.push('Local da recepção');
  if (!(evento.fornecedores || []).length) p.push('Nenhum fornecedor cadastrado (importe do controle financeiro ou adicione)');
  for (const f of evento.fornecedores || []) {
    const nome = f.nome || 'Fornecedor sem nome';
    if (!String(f.nome || '').trim()) p.push('Fornecedor sem nome');
    if (String(f.telefone || '').replace(/\D/g, '').length < 10) p.push(`${nome}: telefone`);
    if (f.dia !== 'nao' && !horaValida(f.chegada)) p.push(`${nome}: horário de chegada`);
  }
  for (const a of evento.atividades || []) {
    if (!String(a.texto || '').trim()) p.push('Atividade sem descrição');
    else if (!horaValida(a.hora)) p.push(`Atividade "${a.texto}": horário`);
  }
  return p;
}

/** Linha do tempo do dia: atividades + chegadas de fornecedores (dia do evento), em ordem de horário. */
function linhaDoTempo(evento) {
  const forn = new Map((evento.fornecedores || []).map((f) => [f.id, f]));
  const itens = (evento.atividades || []).map((a) => ({
    hora: normalizarHora(a.hora), texto: a.texto, responsavel: a.responsavel || '', detalhes: a.detalhes || [],
    fornecedor: a.fornecedor_id && forn.get(a.fornecedor_id) ? forn.get(a.fornecedor_id).nome : '', tipo: 'atividade',
  }));
  for (const f of evento.fornecedores || []) {
    if (f.dia === 'evento' && f.chegada) {
      itens.push({
        hora: normalizarHora(f.chegada), texto: `Chegada: ${f.nome}${f.servico ? ` (${f.servico})` : ''}`,
        responsavel: f.responsavel || '', detalhes: f.observacao ? [f.observacao] : [], fornecedor: f.nome,
        telefone: f.telefone, tipo: 'chegada',
      });
    }
  }
  // horários da madrugada (00h–05h) contam como depois da festa
  const ordem = (h) => { const m = /^(\d{2}):(\d{2})$/.exec(h); if (!m) return 9999; const t = Number(m[1]) * 60 + Number(m[2]); return t < 300 ? t + 1440 : t; };
  return itens.sort((a, b) => ordem(a.hora) - ordem(b.hora));
}

const exibirHora = (h) => { const m = /^(\d{2}):(\d{2})$/.exec(h || ''); return m ? `${m[1]}h${m[2] === '00' ? '' : m[2]}` : (h || ''); };

module.exports = {
  CATEGORIAS: CATEGORIAS.map(([id, nome]) => ({ id, nome })), ROTULO_CATEGORIA, DIAS, categorizar,
  localizarPlanilha, lerFinanceiro, carregarEvento, salvarEvento, importarFornecedores,
  pendencias, linhaDoTempo, atividadesPadrao, exibirHora, normalizarHora,
};

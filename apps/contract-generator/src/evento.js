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
const planilha = require('./planilha');

// Categorias (para agrupar no painel e sugerir a etapa de montagem). Ordem = ordem de exibição.
const CATEGORIAS = [
  ['local', 'Local / espaço', /\b(local|espa[cç]o|villa|vila|casa|s[ií]tio|fazenda|pousada|hotel|igreja|par[oó]quia|capela)\b/i],
  ['estrutura', 'Som, iluminação e estrutura', /\b(som|sonoriza|ilumina|estrutura|palco|led|tablado|tenda|cobert|ramalho|q30)/i],
  ['gerador', 'Gerador', /gerador/i],
  ['decoracao', 'Decoração e mobiliário', /\b(decor|mobili|flor|buqu|mesas?|cadeiras?)/i],
  ['buffet', 'Buffet e alimentação', /\b(buffet|bufe|churrasc|caldinho|comida|coffee|card[aá]pio|vegan|gastronom)/i],
  ['bebidas', 'Bebidas, bar e chopp', /\b(bebida|drink|bar\b|barman|chopp|chope|coco|cerveja|espumante)/i],
  ['bolo_doces', 'Bolo e doces', /\b(bolo|doce|brigad|bem.?casad|confeit)/i],
  ['musica', 'Música (banda, DJ, orquestra)', /\b(banda|dj|orquestra|m[uú]sic|samba|sax|cantor|ax[eé]|show|frevo|sanfon|voz)/i],
  ['foto_video', 'Foto e vídeo', /\b(foto|v[ií]deo|film|drone|cabine)/i],
  ['beleza', 'Cabelo e maquiagem', /\b(make|maqui|cabel|hair|beleza|noiva por|pentead|massag)/i],
  ['servicos', 'Limpeza, segurança e apoio', /\b(limpeza|seguran|carregador|ambul[aâ]nc|bombeir|banheir|\bwc\b|valet|manobr|copeir)/i],
  ['transporte', 'Transporte e passeios', /\b(transfer|translado|transporte|vans?\b|[oô]nibus|passeio|barco|lancha)/i],
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

function categorizar(...textos) {
  // o primeiro texto que cair numa categoria específica decide (ex.: nome do fornecedor, depois o serviço)
  for (const t of textos) {
    const c = CATEGORIAS.find(([id, , re]) => id !== 'outros' && re.test(t || ''));
    if (c) return c[0];
  }
  return 'outros';
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


// ---------------------------------------------------------------------------
// Informações da cerimônia e da festa (roteiro Hanna & Ivan) — obrigatórias, exceto observações.
// tipo: texto | opcao | lista (uma por linha) | longo (observação, opcional)
// ---------------------------------------------------------------------------
const CAMPOS = {
  cerimonia: [
    { id: 'tipo', rotulo: 'Tipo de cerimônia', tipo: 'opcao', opcoes: ['Religiosa', 'Civil', 'Afetiva / simbólica', 'Ecumênica', 'Outra'] },
    { id: 'celebrante', rotulo: 'Celebrante (nome e contato)', tipo: 'texto' },
    { id: 'decoracao', rotulo: 'Cor / estilo da decoração da cerimônia', tipo: 'texto' },
    { id: 'homenagem', rotulo: 'Homenagem ou estrutura especial', tipo: 'texto', dica: 'ex.: aos pais falecidos do noivo, com balões' },
    { id: 'aliancas_com', rotulo: 'Com quem estarão as alianças', tipo: 'texto' },
    { id: 'buque', rotulo: 'Quem busca / entrega o buquê', tipo: 'texto' },
    { id: 'necessidades', rotulo: 'Convidados com necessidades especiais', tipo: 'texto', dica: 'nomes e cuidados, ou "não há"' },
    { id: 'saida_com', rotulo: 'Saída dos noivos com', tipo: 'opcao', opcoes: ['Pétalas', 'Sparkles', 'Chuva de prata', 'Bolhas de sabão', 'Chuva de arroz', 'Balões', 'Nada'] },
    { id: 'sala_espera', rotulo: 'Sala de espera (música / atração)', tipo: 'texto' },
    { id: 'padrinhos_musicas', rotulo: 'Entrada dos padrinhos – músicas, em ordem', tipo: 'lista', dica: 'uma por linha' },
    { id: 'padrinhos_como', rotulo: 'Como entram os padrinhos', tipo: 'texto', dica: 'ex.: separados, pelas três passarelas' },
    { id: 'noivo_musica', rotulo: 'Entrada do noivo – música', tipo: 'texto' },
    { id: 'noivo_com', rotulo: 'Noivo entra com', tipo: 'texto' },
    { id: 'noiva_musica', rotulo: 'Entrada da noiva – música', tipo: 'texto' },
    { id: 'noiva_com', rotulo: 'Noiva entra com', tipo: 'texto' },
    { id: 'aliancas_musica', rotulo: 'Entrada das alianças – música e quem leva', tipo: 'texto' },
    { id: 'homenagem_musica', rotulo: 'Homenagem – música e quem participa', tipo: 'texto', dica: 'ou "não terá"' },
    { id: 'saida_musica', rotulo: 'Saída dos noivos – música', tipo: 'texto' },
    { id: 'protocolo_fotos', rotulo: 'Protocolo de fotos no altar (ordem)', tipo: 'lista',
      padrao: ['Celebrante(s)', 'Pais da noiva', 'Pais do noivo', 'Porta-alianças', 'Padrinhos e madrinhas', 'Crianças'] },
    { id: 'obs', rotulo: 'Observações da cerimônia', tipo: 'longo', opcional: true },
  ],
  festa: [
    { id: 'decoracao', rotulo: 'Cor / estilo da decoração da festa', tipo: 'texto' },
    { id: 'entrada_noivos', rotulo: 'Entrada dos noivos na festa – música e como', tipo: 'texto' },
    { id: 'danca', rotulo: 'Valsa / dança dos noivos – música', tipo: 'texto', dica: 'ou "não terá"' },
    { id: 'cumprimentos', rotulo: 'Cumprimentos aos convidados', tipo: 'opcao', opcoes: ['Agradecimento coletivo após a dança', 'Mesa a mesa', 'Não terá'] },
    { id: 'buque', rotulo: 'Buquê', tipo: 'opcao', opcoes: ['Jogar o buquê (buquê separado para jogar)', 'Jogar o buquê principal', 'Não jogará'] },
    { id: 'uisque', rotulo: 'Noivo jogará uísque ou outro item', tipo: 'opcao', opcoes: ['Sim', 'Não'] },
    { id: 'kit_festa', rotulo: 'Kit festa (o que e quando entra)', tipo: 'texto', dica: 'ou "não terá"' },
    { id: 'brincadeiras', rotulo: 'Brincadeiras (corte da gravata etc.)', tipo: 'texto', dica: 'ou "não terá"' },
    { id: 'bolo', rotulo: 'Corte do bolo – como e quando', tipo: 'texto' },
    { id: 'fotos_bolo', rotulo: 'Fotos na mesa do bolo (grupos, em ordem)', tipo: 'lista',
      padrao: ['Somente os noivos', 'Noivos + pais da noiva', 'Noivos + pais do noivo', 'Noivos + padrinhos'] },
    { id: 'restricoes', rotulo: 'Convidados com restrição / alergia alimentar', tipo: 'texto', dica: 'nomes e restrição, ou "não há"' },
    { id: 'obs', rotulo: 'Observações da festa', tipo: 'longo', opcional: true },
  ],
};

function camposPadrao(grupo) {
  return Object.fromEntries(CAMPOS[grupo].map((c) => [c.id, c.padrao ? c.padrao.slice() : (c.tipo === 'lista' ? [] : '')]));
}
const listaDe = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);

/** Pares rótulo/valor preenchidos (documento e painel). */
function itensPreenchidos(grupo, dados) {
  return CAMPOS[grupo].map((c) => {
    const v = c.tipo === 'lista' ? listaDe(dados?.[c.id]) : String(dados?.[c.id] || '').trim();
    return { rotulo: c.rotulo, valor: Array.isArray(v) ? v.join('\n') : v, lista: Array.isArray(v) ? v : null, tipo: c.tipo };
  }).filter((x) => (x.lista ? x.lista.length : x.valor));
}

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

/** Fornecedores do controle financeiro (aba FINANCEIRO) de um .xlsx. */
function lerFinanceiro(arquivo) {
  return planilha.normalizarFornecedores(planilha.lerPlanilhaXlsx(arquivo).fornecedores);
}

/**
 * Fornecedores a partir de um trecho copiado do Google Planilhas (Ctrl+C na aba FINANCEIRO):
 * colunas separadas por tabulação. Usa a linha de cabeçalho "Fornecedor" se vier junto; senão,
 * 1ª coluna = fornecedor e 2ª = descrição do serviço.
 */
function lerTextoColado(texto) {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n').map((l) => l.split('\t'));
  let cF = 0; let cD = 1; let cP = -1; let inicio = 0;
  const cab = linhas.findIndex((l) => l.some((c) => /^\s*fornecedor\s*$/i.test(c)));
  if (cab >= 0) {
    cF = linhas[cab].findIndex((c) => /^\s*fornecedor\s*$/i.test(c));
    const d = linhas[cab].findIndex((c) => /descri/i.test(c));
    cD = d >= 0 ? d : cF + 1;
    cP = linhas[cab].findIndex((c) => /^\s*pix\s*$/i.test(c));
    inicio = cab + 1;
  } else {
    // pula colunas vazias à esquerda (ex.: copiou a partir da coluna A) e a coluna de ID (001, 002...)
    const primeira = linhas.find((l) => l.some((c) => c.trim()));
    if (primeira) {
      cF = primeira.findIndex((c) => c.trim());
      if (/^\d{1,3}$/.test(primeira[cF].trim())) cF += 1;
      cD = cF + 1;
    }
  }
  return planilha.normalizarFornecedores(linhas.slice(inicio)
    .map((l) => ({ nome: l[cF] || '', descricao: l[cD] || '', pix: cP >= 0 ? l[cP] || '' : '' })));
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
  const recepcaoADefinir = /recep[cç][aã]o\s+(?:a|à)\s+definir/i.test(local);
  return {
    versao: 1,
    info: {
      hora_cerimonia: contrato.evento_horario ? normalizarHora(contrato.evento_horario) : '',
      local_cerimonia: m ? m[1] : recepcaoADefinir ? local.replace(/\s*\(cerim[oô]nia\)\s*[;,/].*$/i, '').trim()
        : local.replace(/\s*\(cerim[oô]nia e recep[cç][aã]o\)/i, ''),
      local_recepcao: m ? m[2] : (local && !recepcaoADefinir ? 'Mesmo local da cerimônia' : ''),
      convidados: contrato.convidados || '',
      padrinhos: contrato.padrinhos || contrato.casais_padrinhos || '',
      criancas: contrato.criancas || '',
      responsavel_montagem: 'Tayná Alves',
      telefone_assessoria: '',
      contato_emergencia: '',
      inicio_montagem_vespera: '',
      inicio_montagem_dia: '',
      observacoes: '',
    },
    cerimonia: camposPadrao('cerimonia'),
    festa: camposPadrao('festa'),
    atracoes: [],
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
    const base = novoEvento(contrato);
    return {
      ...base, ...ev,
      info: { ...base.info, ...(ev.info || {}) },
      cerimonia: { ...base.cerimonia, ...(ev.cerimonia || {}) },
      festa: { ...base.festa, ...(ev.festa || {}) },
      atracoes: ev.atracoes || [],
    };
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
    atracoes: (evento.atracoes || []).map((a) => ({ ...a, id: a.id || novoId(), inicio: normalizarHora(a.inicio), fim: normalizarHora(a.fim) })),
    atualizado_em: new Date().toISOString(),
  };
  fs.writeFileSync(arq, `${JSON.stringify(limpo, null, 2)}\n`);
  return limpo;
}

/** Junta os fornecedores do controle financeiro com os já cadastrados (só preenche o que está vazio). */
function importarFornecedores(evento, doFinanceiro, origem) {
  const atuais = evento.fornecedores || [];
  const porChave = new Map(atuais.map((f) => [chave(f.nome), f]));
  let novos = 0;
  let atualizados = 0;
  for (const f of doFinanceiro) {
    const k = chave(f.nome);
    const existente = porChave.get(k);
    const notaPix = f.telefone_pix ? 'Telefone tirado da chave PIX: confirmar' : '';
    if (existente) {
      let mudou = false;
      if (!existente.servico && f.servico) { existente.servico = f.servico; mudou = true; }
      if (!String(existente.telefone || '').trim() && f.telefone) {
        existente.telefone = f.telefone; mudou = true;
        if (notaPix) existente.observacao = [existente.observacao, notaPix].filter(Boolean).join(' · ');
      }
      if (!String(existente.observacao || '').trim() && f.observacao) { existente.observacao = f.observacao; mudou = true; }
      if (existente.origem !== 'manual') existente.origem = 'financeiro';
      if (mudou) atualizados++;
      continue;
    }
    const cat = planilha.ehServicoGenerico(f.servico)
      ? categorizar(f.servico, f.nome, f.observacao)
      : categorizar(f.nome, f.servico, f.observacao);
    const texto = `${f.nome} ${f.servico}`;
    const item = {
      id: novoId(), nome: f.nome, servico: f.servico || '', categoria: cat, responsavel: '', telefone: f.telefone || '',
      dia: f.dia || (/dia\s*2|segundo dia|p[oó]s.?casamento|passeio|churrasc|pool|catamar|luau/i.test(texto) ? 'posterior'
        : ['papelaria', 'local'].includes(cat) ? 'nao' : 'evento'),
      chegada: '', observacao: [f.observacao, notaPix].filter(Boolean).join(' · '), origem: 'financeiro',
    };
    atuais.push(item);
    porChave.set(k, item);
    novos++;
  }
  // atrações da festa sugeridas a partir dos fornecedores de música (horários a preencher)
  const atracoes = evento.atracoes || [];
  const ja = new Set(atracoes.map((x) => chave(x.nome)));
  for (const f of atuais) {
    const txt = `${f.nome} ${f.servico} ${f.observacao || ''}`;
    const hor = /(\d{1,2})(?:\s*h\s*(\d{2})?)?\s+(?:às|as|a|até)\s+(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/i.exec(`${f.servico} ${f.observacao || ''}`);
    const soCerimonia = /cerim[oô]nia/i.test(txt) || (/orquestra/i.test(txt) && !hor);
    if (f.categoria === 'musica' && f.dia !== 'posterior' && !soCerimonia && !ja.has(chave(f.nome))) {
      const hh = (h, m) => `${String(Number(h) % 24).padStart(2, '0')}:${m || '00'}`;
      atracoes.push({
        id: novoId(), nome: f.nome, inicio: hor ? hh(hor[1], hor[2]) : '', fim: hor ? hh(hor[3], hor[4]) : '', obs: f.servico || '',
      });
      ja.add(chave(f.nome));
    }
  }
  return {
    ...evento, fornecedores: atuais, atracoes, importado_de: origem, importado_em: new Date().toISOString(), novos, atualizados,
  };
}

/**
 * Pré-preenche o evento com a planilha de assessoria do casal (fornecedores + informações do dia).
 * Só preenche campos vazios: o que já foi editado no app é mantido.
 */
function aplicarPlanilha(evento, dados) {
  if (!dados) return { ...evento, novos: 0, atualizados: 0 };
  const origem = dados.fonte?.tipo === 'google' ? `Google Planilhas: ${dados.fonte.titulo}` : (dados.fonte?.titulo || 'planilha');
  const junto = importarFornecedores(evento, planilha.normalizarFornecedores(dados.fornecedores), origem);
  const info = { ...(junto.info || {}) };
  const d = dados.info || {};
  const vazio = (k) => !String(info[k] || '').trim();
  const hora = planilha.lerHorario(d.horario);
  if (vazio('hora_cerimonia') && hora) info.hora_cerimonia = hora;
  const locais = planilha.separarLocais(d.local);
  if (vazio('local_cerimonia') && locais.cerimonia) info.local_cerimonia = locais.cerimonia;
  if (vazio('local_recepcao') && locais.recepcao) info.local_recepcao = locais.recepcao === info.local_cerimonia ? 'Mesmo local da cerimônia' : locais.recepcao;
  // sem local na aba ASSESSORIA: usa os fornecedores "local" do controle financeiro
  if (vazio('local_cerimonia') || vazio('local_recepcao')) {
    const nomesPl = new Set(planilha.normalizarFornecedores(dados.fornecedores).map((f) => chave(f.nome)));
    const locais = junto.fornecedores.filter((f) => f.categoria === 'local' && nomesPl.has(chave(f.nome)) && !/dia da noiva|making|hosped|n[uú]pcias/i.test(`${f.nome} ${f.servico}`));
    const tx = (f) => `${f.nome} ${f.servico}`;
    const cer = locais.find((f) => /igreja|par[oó]quia|capela|catedral|cerim/i.test(tx(f)) && !/recep|festa/i.test(tx(f)));
    const rec = locais.find((f) => /recep|festa|espa[cç]o|s[ií]tio/i.test(tx(f)) && f !== cer && !(/cerim/i.test(tx(f)) && !/recep|festa/i.test(tx(f))));
    if (cer || rec) {
      if (vazio('local_cerimonia') && cer) info.local_cerimonia = cer.nome;
      if (vazio('local_recepcao') && rec) info.local_recepcao = rec.nome;
    } else if (locais.length === 1) {
      if (vazio('local_cerimonia')) info.local_cerimonia = locais[0].nome;
      if (vazio('local_recepcao')) info.local_recepcao = 'Mesmo local da cerimônia';
    }
  }
  for (const k of ['convidados', 'padrinhos', 'criancas']) if (vazio(k) && String(d[k] || '').trim()) info[k] = String(d[k]).trim().replace(/^0+(\d)/, '$1');
  // atividades padrão ainda sem horário: calcula pelo horário da cerimônia que veio da planilha
  let atividades = junto.atividades || [];
  if (hora && !(evento.info || {}).hora_cerimonia) {
    const base = atividadesPadrao(hora);
    atividades = atividades.map((a) => {
      if (a.origem !== 'padrao' || a.hora) return a;
      const p = base.find((b) => b.texto === a.texto);
      return p && p.hora ? { ...a, hora: p.hora } : a;
    });
  }
  // o que a planilha diz diferente do que está no app (contrato/edições): avisar, não sobrescrever
  const divergencias = [];
  if (hora && info.hora_cerimonia && hora !== info.hora_cerimonia) divergencias.push(`Horário da cerimônia: app ${info.hora_cerimonia}, planilha ${hora}`);
  const nConv = String(d.convidados || '').replace(/\D/g, '');
  if (nConv && String(info.convidados || '').replace(/\D/g, '') && Number(nConv) !== Number(String(info.convidados).replace(/\D/g, ''))) {
    divergencias.push(`Convidados: app ${info.convidados}, planilha ${d.convidados}`);
  }
  return {
    ...junto, info, atividades,
    planilha: { divergencias, assinatura: planilha.assinatura(dados), titulo: dados.fonte?.titulo || '', url: dados.fonte?.url || '', lido_em: dados.lido_em, aplicada_em: new Date().toISOString() },
  };
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
  for (const [grupo, nome] of [['cerimonia', 'Cerimônia'], ['festa', 'Festa']]) {
    for (const c of CAMPOS[grupo]) {
      if (c.opcional) continue;
      const v = evento[grupo]?.[c.id];
      const vazio = c.tipo === 'lista' ? listaDe(v).length === 0 : !String(v || '').trim();
      if (vazio) p.push(`${nome}: ${c.rotulo}`);
    }
  }
  if (!(evento.atracoes || []).length) p.push('Festa: nenhuma atração cadastrada (banda, DJ...)');
  for (const a of evento.atracoes || []) {
    if (!String(a.nome || '').trim()) p.push('Atração sem nome');
    else if (!horaValida(a.inicio) || !horaValida(a.fim)) p.push(`Atração "${a.nome}": horário de início e fim`);
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
  for (const a of evento.atracoes || []) {
    if (a.inicio) {
      itens.push({
        hora: normalizarHora(a.inicio), texto: `Atração: ${a.nome} (até ${exibirHora(normalizarHora(a.fim))})`,
        responsavel: '', detalhes: a.obs ? [a.obs] : [], fornecedor: a.nome, tipo: 'atracao',
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
  localizarPlanilha, lerFinanceiro, lerTextoColado, aplicarPlanilha, carregarEvento, salvarEvento, importarFornecedores,
  pendencias, linhaDoTempo, atividadesPadrao, exibirHora, normalizarHora, CAMPOS, itensPreenchidos,
};

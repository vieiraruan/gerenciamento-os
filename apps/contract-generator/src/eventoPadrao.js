'use strict';

/**
 * Checklist do evento SEM destination — modelo "CHECK LIST" do casal Mariana & Marco (Tayná Alves).
 *
 * Além do que é comum aos dois modelos (fornecedores, atividades com horário, cerimônia, festa, atrações),
 * este modelo pede: dados do casal (nome completo, pais, telefones, e-mail), responsável e contato dos
 * locais, previsão de atraso e chegada dos padrinhos, tabela de SERVIÇOS CONTRATADOS (linhas fixas, com
 * quantidades/cores/modelos), informações familiares para as fotos, músicas e ordem do cortejo, crianças
 * do cortejo, padrinhos e madrinhas com contato, e o cronograma Horário | Serviço | Duração | Objetos.
 */

// Linhas fixas da tabela "SERVIÇOS CONTRATADOS" (ordem do modelo). `re` sugere o fornecedor cadastrado;
// `detalhe` = o que perguntar na linha (quantidade, cor, modelo...).
const SERVICOS = [
  { id: 'buffet', servico: 'Buffet', re: /buffet|bufe/i },
  { id: 'espatulas', servico: 'Espátulas e taças', detalhe: 'quem leva' },
  { id: 'iluminacao', servico: 'Iluminação cênica', re: /ilumina/i },
  { id: 'palco', servico: 'Palco', detalhe: 'com iluminação?', re: /palco/i },
  { id: 'gerador', servico: 'Gerador (cerimônia e recepção)', re: /gerador/i },
  { id: 'decoracao', servico: 'Decoração', re: /decora/i },
  { id: 'buque', servico: 'Buquê da noiva / para jogar / lapelas', detalhe: 'buquê para jogar? quantidade de lapelas', re: /buqu|flor/i },
  { id: 'guardanapos', servico: 'Guardanapos', detalhe: 'quantidade e cor' },
  { id: 'cadeiras', servico: 'Cadeiras', detalhe: 'modelo/cor, quantidade na cerimônia e na recepção', re: /cadeira|mobil/i },
  { id: 'mesas', servico: 'Mesas', detalhe: 'quantidade, formato, toalhas', re: /mesas|mobil/i },
  { id: 'bolo', servico: 'Bolo', detalhe: 'sabor, andares, fake ou verdadeiro', re: /\bbolo\b/i },
  { id: 'doces', servico: 'Doces', detalhe: 'quantidade e de quem', re: /\bdoces?\b|brigad/i },
  { id: 'forminhas', servico: 'Forminhas para doces', detalhe: 'quantidade', re: /forminha/i },
  { id: 'lembrancinhas', servico: 'Lembrancinhas', detalhe: 'qual item e quantidade', re: /lembran/i },
  { id: 'banda_cerimonia', servico: 'Banda / música da cerimônia', re: /cerim[oô]nia.*(banda|m[uú]sic|cantor|orquestra)|(banda|cantor|orquestra).*cerim|orquestra|cantora/i },
  { id: 'banda_recepcao', servico: 'Banda / música da recepção', re: /\bbanda\b|samba|show|cantor/i },
  { id: 'dj', servico: 'DJ', re: /\bdj\b/i },
  { id: 'som', servico: 'Som', re: /\bsom\b|sonoriza/i },
  { id: 'foto', servico: 'Foto', re: /\bfoto|fotograf/i },
  { id: 'video', servico: 'Vídeo / storymaker', re: /v[ií]deo|film|stor(y|ie)/i },
  { id: 'cabelo_make', servico: 'Cabelo e make', re: /make|maqui|cabel|pentead/i },
  { id: 'dia_noiva', servico: 'Dia da noiva', detalhe: 'onde' },
  { id: 'hotel_nupcias', servico: 'Hotel para a noite de núpcias' },
  { id: 'vestido', servico: 'Vestido de noiva', re: /vestido/i },
  { id: 'sapato_noiva', servico: 'Sapato da noiva', re: /sapato/i },
  { id: 'robe', servico: 'Robe', re: /\brobe/i },
  { id: 'acessorios_noiva', servico: 'Acessórios da noiva (véu, tiara, brincos)', re: /acess[oó]rio/i },
  { id: 'dia_noivo', servico: 'Dia do noivo', detalhe: 'onde' },
  { id: 'traje_noivo', servico: 'Traje / sapato do noivo', re: /terno|traje/i },
  { id: 'aliancas', servico: 'Alianças', re: /alian[cç]a/i },
  { id: 'celebrante', servico: 'Celebrante', re: /celebra/i },
  { id: 'bebidas', servico: 'Bebidas alcoólicas', detalhe: 'espumante, uísque, água de coco, energético... e quantidades', re: /bebida|u[ií]sque|whisky|cerveja/i },
  { id: 'barman', servico: 'Barman / drinks', re: /drink|barman/i },
  { id: 'chopp', servico: 'Chopp', detalhe: 'litros, consignado, chopeiro', re: /chop/i },
];

// Músicas e ordem do cortejo (linhas sugeridas; editáveis, dá para incluir e remover)
const CORTEJO_PADRAO = [
  'Entrada dos padrinhos', 'Entrada do noivo', 'Entrada da florista / daminhas e pajens', 'Entrada da noiva',
  'Entrada das alianças', 'Beijo', 'Assinatura', 'Fotos', 'Saída dos noivos', 'Dança dos noivos na recepção',
];

const novoId = () => Math.random().toString(36).slice(2, 10);
const vazio = (v) => !String(v ?? '').trim();
const chave = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

function camposPadrao(contrato = {}, cliente = {}) {
  // nomes do casal a partir do contrato ("Thainá e Vinícius") e do cadastro do contratante
  const [n1 = '', n2 = ''] = String(contrato.evento_nomes || '').split(/\s+(?:e|&)\s+/i).map((s) => s.trim());
  const pessoa = (primeiro) => {
    const igual = cliente.nome && chave(cliente.nome).split(' ')[0] === chave(primeiro).split(' ')[0];
    return {
      nome: igual ? cliente.nome : primeiro, pais: '',
      telefone: igual ? (cliente.telefone || cliente.celular || '') : '', email: igual ? (cliente.email || '') : '',
    };
  };
  return {
    casal: { noiva: pessoa(n1), noivo: pessoa(n2) },
    familia: {
      noiva: { pais_separados: '', irmaos: '', avos: '', obs: '' },
      noivo: { pais_separados: '', irmaos: '', avos: '', obs: '' },
    },
    cortejo: CORTEJO_PADRAO.map((entrada) => ({ id: novoId(), entrada, musica: '', quem: '' })),
    criancas_cortejo: [],
    padrinhos_lista: [],
    servicos: {},
  };
}

/** Linhas de "Serviços contratados": o que foi digitado + sugestão do fornecedor cadastrado. */
function linhasServicos(evento) {
  const forn = evento.fornecedores || [];
  const usados = new Set();
  const linhas = SERVICOS.map((s) => {
    const salvo = (evento.servicos || {})[s.id] || {};
    const f = s.re ? forn.find((x) => s.re.test(`${x.nome} ${x.servico || ''}`) && !usados.has(x.id)) : null;
    if (f && !salvo.fornecedor) usados.add(f.id);
    return {
      id: s.id, servico: s.servico, dica: s.detalhe || '',
      fornecedor: salvo.fornecedor ?? (f ? f.nome : ''),
      responsavel: salvo.responsavel ?? (f ? f.responsavel || '' : ''),
      contato: salvo.contato ?? (f ? f.telefone || '' : ''),
      detalhes: salvo.detalhes ?? '',
      sugerido: !salvo.fornecedor && Boolean(f),
    };
  });
  // fornecedores cadastrados que não caíram em nenhuma linha fixa entram no fim da tabela
  const nasLinhas = new Set(linhas.map((l) => chave(l.fornecedor)).filter(Boolean));
  const extras = forn.filter((f) => !nasLinhas.has(chave(f.nome))).map((f) => ({
    id: `f:${f.id}`, servico: f.servico || f.categoria || '', fornecedor: f.nome, responsavel: f.responsavel || '',
    contato: f.telefone || '', detalhes: f.observacao || '', extra: true,
  }));
  return [...linhas, ...extras];
}

/** O que falta preencher no modelo sem destination (além das pendências comuns). */
function pendenciasPadrao(evento) {
  const p = [];
  const i = evento.info || {};
  if (vazio(i.previsao_atraso)) p.push('Previsão de atraso');
  if (vazio(i.chegada_padrinhos)) p.push('Horário de chegada dos padrinhos');
  for (const lado of ['noiva', 'noivo']) {
    const c = (evento.casal || {})[lado] || {};
    if (vazio(c.nome)) p.push(`Casal: nome completo do(a) ${lado}`);
    if (vazio(c.pais)) p.push(`Casal: nome dos pais do(a) ${lado}`);
    if (String(c.telefone || '').replace(/\D/g, '').length < 10) p.push(`Casal: celular do(a) ${lado}`);
    const fam = (evento.familia || {})[lado] || {};
    if (vazio(fam.pais_separados)) p.push(`Fotos: pais separados? (${lado})`);
    if (vazio(fam.irmaos)) p.push(`Fotos: irmãos (${lado}) – nomes ou "não"`);
    if (vazio(fam.avos)) p.push(`Fotos: avós (${lado}) – nomes ou "não"`);
  }
  for (const l of linhasServicos(evento).filter((x) => !x.extra)) {
    if (vazio(l.fornecedor)) p.push(`Serviço "${l.servico}": fornecedor (ou "não terá")`);
  }
  const cortejo = evento.cortejo || [];
  if (!cortejo.length) p.push('Cortejo: nenhuma entrada cadastrada');
  for (const c of cortejo) {
    if (vazio(c.entrada)) p.push('Cortejo: entrada sem nome');
    else if (vazio(c.musica)) p.push(`Cortejo: música de "${c.entrada}" (ou "não terá")`);
  }
  if (!(evento.padrinhos_lista || []).length) p.push('Padrinhos e madrinhas: nenhum cadastrado');
  for (const x of evento.padrinhos_lista || []) {
    if (vazio(x.nome)) p.push('Padrinho/madrinha sem nome');
  }
  for (const x of evento.criancas_cortejo || []) {
    if (vazio(x.nome)) p.push('Criança do cortejo sem nome');
    else if (vazio(x.funcao)) p.push(`Criança "${x.nome}": função no cortejo`);
  }
  return p;
}

module.exports = { SERVICOS, CORTEJO_PADRAO, camposPadrao, linhasServicos, pendenciasPadrao };

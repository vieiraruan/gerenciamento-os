'use strict';

/**
 * Roteiro do evento (checklist DESTINATION) — modelo do casal Hanna & Ivan.
 *
 * Preenche templates/roteiro_destination.docx com o que o sistema já sabe do contrato e do cliente
 * (dados do contratante, data, horário, local, convidados) e calcula o cronograma do dia a partir
 * do horário da cerimônia (making of da noiva e do noivo, passagem de som, saída para a cerimônia).
 * O restante fica em branco para a assessoria completar no Word.
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { parseData } = require('./parser');
const { parseHora, horaFmt } = require('./contrato');

const RAIZ = path.resolve(__dirname, '..');
const MODELO = path.join(RAIZ, 'templates', 'roteiro_destination.docx');
const BRANCO = '______________________';

const hhmm = (min) => {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}h${String(t % 60).padStart(2, '0')}`.replace(/h00$/, 'h');
};

/**
 * Cronograma do dia do casamento (minutos em relação ao início da cerimônia),
 * igual ao roteiro Hanna & Ivan (cerimônia às 15h30).
 */
const CRONOGRAMA = [
  [-420, 'Café da manhã dos noivos', []],
  [-390, 'Banho da noiva', [
    'Lavar o cabelo apenas com shampoo. Para as loiras, se for preciso, usar um pouco de condicionador apenas para desembaraçar e retirar totalmente o produto na lavagem;',
    'Após lavado, o cabelo pode ser totalmente seco. Se preferir, pode escovar;',
    'Dar preferência a camisa de abertura frontal ou robe, peças mais fáceis de retirar sem estragar a maquiagem e o penteado;',
    'Pele 100% limpa para receber a maquiagem.',
  ]],
  [-330, 'Chegada do cabelo e make da noiva', ['Profissional: ________']],
  [-210, 'Ida do cerimonial ao quarto da noiva', [
    'Organizar o quarto da noiva;',
    'Escolher um local do quarto para organizar todos os itens pessoais da noiva (joias, buquê, sapato, vestido) e tirar foto para deixar registrado;',
    'Verificar se a noiva deseja almoçar;',
    'Separar uma bolsa com itens pessoais da noiva para a cerimônia e a recepção: maquiagem, perfume, desodorante, sandália, medicação de uso contínuo, medicação para enjoo, vestido extra.',
  ]],
  [-150, 'Chegada de foto e vídeo para o making of da noiva', ['Fotografia: ________', 'Vídeo: ________']],
  [-90, 'Passagem do som | Teste de som', [
    'Músico da cerimônia 1: ________', 'Músico da cerimônia 2: ________', 'Técnico de som: ________',
    'Técnico do gerador: ________', 'VJ: ________',
  ]],
  [-90, 'Chegada do cerimonial ao local da cerimônia', []],
  [-90, 'Banho do noivo', ['Fazer a barba e ficar impecável.']],
  [-60, 'Chegada de foto e vídeo para o making of do noivo', [
    'Noivo pronto e vestido, faltando abotoar os últimos botões do colarinho e punho da camisa;',
    'Colocar o blazer com auxílio de um parente próximo (pai, irmão, mãe ou melhor amigo);',
    'Verificar se o noivo deseja fazer alguma foto em especial.',
  ]],
  [-60, 'Fotografia do noivo (com quem estiver no momento)', [
    'Equipe de foto e vídeo será informada do local do making of do noivo no dia.',
  ]],
  [-30, 'Sair com o noivo para a cerimônia', []],
  [0, 'Sair com a noiva para a cerimônia', []],
];
const DURACAO_CERIMONIA = 90; // minutos (Hanna & Ivan: 15h30 às 17h)

function separarLocais(local) {
  const s = String(local || '').trim();
  const m = /^(.*?)\s*\(cerim[oô]nia\)\s*(?:e|\/|;|,)\s*(.*?)\s*\(recep[cç][aã]o\)\s*$/i.exec(s);
  if (m) return { cerimonia: m[1], recepcao: m[2] };
  const m2 = /^(.*?)\s*\(cerim[oô]nia(?: e recep[cç][aã]o)?\)/i.exec(s);
  if (m2) return { cerimonia: m2[1], recepcao: /recep/i.test(s) ? m2[1] : BRANCO };
  return { cerimonia: s || BRANCO, recepcao: s ? 'Mesmo local da cerimônia' : BRANCO };
}

const dataExt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const dataBr = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const ou = (v, padrao = BRANCO) => (v === undefined || v === null || String(v).trim() === '' ? padrao : String(v).trim());

/** Dados do roteiro (também usados na prévia do aplicativo). */
function montarRoteiro(contrato, cliente = {}) {
  let data = null;
  try { data = contrato.evento_data ? parseData(contrato.evento_data) : null; } catch { data = null; }
  let ini = null;
  try { ini = contrato.evento_horario ? parseHora(contrato.evento_horario) : null; } catch { ini = null; }
  const duracao = Number(String(contrato.evento_duracao_horas || '').replace(',', '.')) || null;
  const nomes = String(contrato.evento_nomes || '').replace(/\s+/g, ' ').trim();
  const locais = separarLocais(contrato.evento_local);
  const conv = contrato.convidados;

  const recIni = ini !== null ? ini + DURACAO_CERIMONIA : null;
  const recFim = ini !== null && duracao ? ini + Math.round(duracao * 60) : null;
  const horarios = CRONOGRAMA.map(([off, texto, instrucoes]) => ({
    hora: ini !== null ? hhmm(ini + off) : '__h__', texto, instrucoes,
  }));

  const quando = data ? `no dia ${dataExt(data)}` : `em data a definir${contrato.evento_periodo ? ` (${contrato.evento_periodo})` : ''}`;
  const lc = locais.cerimonia === BRANCO ? 'local a definir' : locais.cerimonia;
  const mesmo = /mesmo local/i.test(locais.recepcao) || locais.recepcao === locais.cerimonia;
  const ondeTxt = mesmo ? `com cerimônia e recepção em ${lc}`
    : `com cerimônia em ${lc} e recepção em ${locais.recepcao === BRANCO ? 'local a definir' : locais.recepcao}`;
  const frase = `Casamento, a realizar-se ${quando}${ini !== null ? `, às ${horaFmt(ini)},` : ','} ${ondeTxt}` +
    `${recIni !== null ? `, das ${horaFmt(recIni)}${recFim !== null ? ` até ${horaFmt(recFim)}` : ''}` : ''}` +
    `${conv ? `, para ${conv} convidados` : ''}.`;

  const cli = (k) => cliente[k] ?? contrato[`contratante_${k}`];
  return {
    titulo_nomes: nomes || 'Noiva e Noivo',
    subtitulo: [data ? dataExt(data) : (contrato.evento_periodo ? `Data a definir (${contrato.evento_periodo})` : 'Data a definir'),
      contrato.evento_local || 'Local a definir'].join(' – '),
    numero_os: ou(contrato.numero_os, '—'),
    contratante_nome: ou(cli('nome')),
    primeiros_nomes: nomes || BRANCO,
    contratante_profissao: ou(cli('profissao')),
    contratante_estado_civil: ou(cli('estado_civil')),
    contratante_cpf: ou(cli('cpf_cnpj') ?? contrato.contratante_cpf),
    contratante_endereco: ou(cli('endereco')),
    contratante_telefone: ou(cli('telefone')),
    contratante_email: ou(cli('email')),
    convidados: ou(conv),
    criancas: ou(contrato.criancas),
    padrinhos: ou(contrato.padrinhos || contrato.casais_padrinhos),
    data_evento: data ? dataBr(data) : 'data a definir',
    data_vespera: data ? dataBr(somarDias(data, -1)) : 'véspera',
    data_dia_seguinte: data ? dataBr(somarDias(data, 1)) : '____/____',
    local_cerimonia: locais.cerimonia,
    local_recepcao: locais.recepcao,
    evento_frase: frase,
    horarios,
    cerimonia_horario: ini !== null ? `${horaFmt(ini)} às ${horaFmt(ini + DURACAO_CERIMONIA)}` : BRANCO,
    recepcao_horario: recIni !== null ? `${horaFmt(recIni)} às ${recFim !== null ? horaFmt(recFim) : '________'}` : BRANCO,
    horas_festa: recIni !== null && recFim !== null ? `${Math.round((recFim - recIni) / 6) / 10}h de festa`.replace('.', ',') : '________',
    staff: contrato.qtd_equipe ? `${contrato.qtd_equipe} pessoas da equipe Tayná Alves` : '________',
    tem_horario: ini !== null,
  };
}

function nomeArquivoRoteiro(dados, sufixo = '') {
  const nomes = String(dados.titulo_nomes).replace(/[\\/:*?"<>|]/g, '').trim();
  return `ROTEIRO DESTINATION - ${nomes}${sufixo}.docx`;
}

/** Grava o roteiro na pasta do casal; nunca sobrescreve (novaVersao = cópia com data e hora). */
function gravarRoteiro(dados, pastaCasal, { novaVersao = false } = {}) {
  fs.mkdirSync(pastaCasal, { recursive: true });
  let arquivo = path.join(pastaCasal, nomeArquivoRoteiro(dados));
  if (fs.existsSync(arquivo)) {
    if (!novaVersao) return { existe: true, arquivo };
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    arquivo = path.join(pastaCasal, nomeArquivoRoteiro(dados, ` (${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}h${p(d.getMinutes())})`));
  }
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(MODELO)), {
    paragraphLoop: true, linebreaks: true, nullGetter: () => '',
  });
  doc.render(dados);
  fs.writeFileSync(arquivo, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return { existe: false, arquivo };
}

module.exports = { montarRoteiro, gravarRoteiro, nomeArquivoRoteiro, CRONOGRAMA };

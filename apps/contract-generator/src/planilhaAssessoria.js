'use strict';

/**
 * Cria a "PLANILHA DE ASSESSORIA <casal>.xlsx" a partir de templates/planilha_assessoria.xlsx,
 * que é o modelo da empresa limpo (scripts/criar_planilha_assessoria.py).
 *
 * O arquivo é editado no nível do XML: só as células marcadas com {{CAMPO}} mudam;
 * formatação, logo, listas, checklist e fórmulas ficam exatamente como no modelo.
 * Uma planilha existente nunca é sobrescrita (pode ter pagamentos lançados).
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { parseValor } = require('./parser');
const { parseHora } = require('./contrato');

const MODELO = path.resolve(__dirname, '..', 'templates', 'planilha_assessoria.xlsx');

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Mapa "nome da aba" -> caminho do XML dentro do .xlsx */
function mapaAbas(zip) {
  const wb = zip.file('xl/workbook.xml').asText();
  const rels = zip.file('xl/_rels/workbook.xml.rels').asText();
  const alvo = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])[1];
    const t = /Target="([^"]+)"/.exec(m[0])[1].replace(/^\/?xl\//, '');
    alvo[id] = `xl/${t}`;
  }
  const abas = {};
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const nome = unescXml(/name="([^"]+)"/.exec(m[0])[1]);
    abas[nome] = alvo[/r:id="([^"]+)"/.exec(m[0])[1]];
  }
  return abas;
}

/** Textos compartilhados (sharedStrings) — para achar as células {{CAMPO}}. */
function textosCompartilhados(zip) {
  const f = zip.file('xl/sharedStrings.xml');
  if (!f) return [];
  return [...f.asText().matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => unescXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
}

/** Troca o conteúdo da célula `ref`, mantendo o estilo (atributo s). */
function definirCelula(xml, ref, valor) {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
  const m = re.exec(xml);
  if (!m) throw new Error(`Célula ${ref} não encontrada no modelo da planilha.`);
  const estilo = (/\ss="(\d+)"/.exec(m[1]) || [])[1];
  const s = estilo ? ` s="${estilo}"` : '';
  let nova;
  if (valor === null || valor === undefined || valor === '') nova = `<c r="${ref}"${s}/>`;
  else if (typeof valor === 'number') nova = `<c r="${ref}"${s}><v>${valor}</v></c>`;
  else nova = `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
  return xml.replace(m[0], nova);
}

/** Preenche todas as células cujo texto é {{CAMPO}} com valores[CAMPO]. */
function preencherAba(xml, compartilhados, valores) {
  const pendentes = [];
  const alvos = [];
  for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)>([\s\S]*?)<\/c>/g)) {
    const [, ref, attrs, corpo] = m;
    let texto = null;
    if (/t="s"/.test(attrs)) texto = compartilhados[Number((/<v>(\d+)<\/v>/.exec(corpo) || [])[1])];
    else if (/t="inlineStr"/.test(attrs)) texto = unescXml((/<t[^>]*>([\s\S]*?)<\/t>/.exec(corpo) || [])[1] || '');
    const campo = texto && (/^\{\{(\w+)\}\}$/.exec(texto) || [])[1];
    if (campo) alvos.push([ref, campo]);
  }
  for (const [ref, campo] of alvos) {
    if (!(campo in valores)) pendentes.push(campo);
    xml = definirCelula(xml, ref, valores[campo]);
  }
  return { xml, pendentes };
}

function nomeArquivo(nomes) {
  const limpo = String(nomes).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  return `PLANILHA DE ASSESSORIA ${limpo}.xlsx`;
}

async function criarPlanilha(pastaCasal, { brutos, dados, empresa }) {
  const destino = path.join(pastaCasal, nomeArquivo(brutos.evento_nomes));
  if (fs.existsSync(destino)) return { criada: false, arquivo: destino };

  const zip = new PizZip(fs.readFileSync(MODELO));
  const abas = mapaAbas(zip);
  const compartilhados = textosCompartilhados(zip);

  const total = parseValor(dados.valor_total);
  const entrada = parseValor(dados.entrada);
  const parcelas = dados.parcelas || [];
  let horario = 'a combinar';
  if (brutos.evento_horario) horario = parseHora(brutos.evento_horario) / 1440; // fração do dia (formato hh:mm)

  const nomes = String(brutos.evento_nomes).replace(/\s+/g, ' ').trim().toUpperCase();
  const valores = {
    // aba ASSESSORIA
    NOIVOS: `NOIVOS: ${nomes}`,
    DATA: `DATA: ${brutos.evento_data ? dados.evento_data : `a definir${brutos.evento_periodo ? ` (${brutos.evento_periodo})` : ''}`}`,
    // mesmos números do contrato (com os padrões aplicados): "08 (oito)" -> 8
    CONVIDADOS: parseInt(dados.convidados_fmt, 10),
    PADRINHOS: parseInt(dados.casais_padrinhos_fmt, 10),
    CRIANCAS: parseInt(dados.criancas_fmt, 10),
    LOCAL: brutos.evento_local || 'a combinar',
    HORARIO: horario,
    // aba FINANCEIRO, linha 4: contrato do casal com a assessoria
    F_B: empresa.nome_fantasia || empresa.razao_social,
    F_C: `${dados.servicos_nomes} (contrato ${dados.numero_os})`,
    F_D: total,
    F_E: entrada,
    F_F: 'Pendente',
    F_I: parcelas.length ? `${parcelas.length}x` : '',
    F_J: parcelas.length ? parcelas[0].valor : '',
    F_N: 'Pendente',
    F_O: empresa.pix || '',
    F_P: `Contrato ${dados.numero_os} gerado em ${dados.data_assinatura}. Saldo até ` +
      `${dados.tem_vencimento ? dados.vencimento_saldo : `${brutos.prazo_quitacao_dias || 15} dias antes do evento`}.`,
  };

  const pendentes = [];
  for (const aba of ['ASSESSORIA', 'FINANCEIRO']) {
    const arq = abas[aba];
    if (!arq) throw new Error(`Aba ${aba} não encontrada no modelo da planilha.`);
    const r = preencherAba(zip.file(arq).asText(), compartilhados, valores);
    zip.file(arq, r.xml);
    pendentes.push(...r.pendentes);
  }
  if (pendentes.length) throw new Error(`Campos sem valor no modelo da planilha: ${pendentes.join(', ')}`);

  fs.mkdirSync(pastaCasal, { recursive: true });
  fs.writeFileSync(destino, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return { criada: true, arquivo: destino };
}

module.exports = { criarPlanilha, nomeArquivo };

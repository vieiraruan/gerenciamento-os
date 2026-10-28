'use strict';

/**
 * Gerador mínimo de planilhas .xlsx (Office Open XML), sem dependências além do pizzip.
 *
 * Suporta: várias abas, larguras de coluna, altura de linha, células mescladas, estilos nomeados
 * (fonte, cor, preenchimento, borda, alinhamento, quebra de texto, formato numérico), fórmulas,
 * lista suspensa (validação), formatação condicional por valor, painéis congelados, configuração
 * de impressão e uma imagem (logo) por aba.
 *
 * Uso:
 *   const buf = criarXlsx({
 *     estilos: { titulo: { negrito: true, cor: 'FFFFFF', fundo: '97492D', alinhar: 'center' } },
 *     abas: [{ nome: 'CHECKLIST', colunas: { A: 3, B: 10 }, linhas: [{ n: 2, celulas: { B: { v: 'Olá', s: 'titulo' } } }] }],
 *   });
 */
const PizZip = require('pizzip');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // remove caracteres de controle inválidos em XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function colNum(letras) {
  return [...letras].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}

/** Data JS → número de série do Excel (dias desde 30/12/1899). */
function serialData(d) {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5);
}

function montarEstilos(estilos) {
  const fontes = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'];
  const fundos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const bordas = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const formatos = [];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const indice = {};
  const idx = (lista, xml) => { let i = lista.indexOf(xml); if (i < 0) { lista.push(xml); i = lista.length - 1; } return i; };

  for (const [nome, e] of Object.entries(estilos)) {
    const fonte = `<font>${e.negrito ? '<b/>' : ''}${e.italico ? '<i/>' : ''}<sz val="${e.tamanho || 11}"/>` +
      `${e.cor ? `<color rgb="FF${e.cor}"/>` : ''}<name val="${e.fonte || 'Calibri'}"/><family val="2"/></font>`;
    const fundo = e.fundo
      ? `<fill><patternFill patternType="solid"><fgColor rgb="FF${e.fundo}"/><bgColor indexed="64"/></patternFill></fill>`
      : fundos[0];
    const b = e.borda;
    const lado = (n) => (b ? `<${n} style="${b}"><color rgb="FF${e.corBorda || 'BFBFBF'}"/></${n}>` : `<${n}/>`);
    const borda = `<border>${lado('left')}${lado('right')}${lado('top')}${lado('bottom')}<diagonal/></border>`;
    let numFmtId = 0;
    if (e.formato) {
      const embutidos = { '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9 };
      numFmtId = embutidos[e.formato] ?? (164 + idx(formatos, e.formato));
    }
    const fontId = idx(fontes, fonte);
    const fillId = idx(fundos, fundo);
    const borderId = idx(bordas, borda);
    const alinha = (e.alinhar || e.vertical || e.quebrar)
      ? `<alignment${e.alinhar ? ` horizontal="${e.alinhar}"` : ''} vertical="${e.vertical || 'center'}"${e.quebrar ? ' wrapText="1"' : ''}/>`
      : '';
    xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"` +
      `${alinha ? ` applyAlignment="1">${alinha}</xf>` : '/>'}`);
    indice[nome] = xfs.length - 1;
  }
  return { indice, fontes, fundos, bordas, formatos, xfs };
}

function stylesXml(m, dxfs) {
  const fmts = m.formatos.length
    ? `<numFmts count="${m.formatos.length}">${m.formatos.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>`
    : '';
  const dx = dxfs.map((d) => `<dxf><font>${d.negrito ? '<b/>' : ''}${d.cor ? `<color rgb="FF${d.cor}"/>` : ''}</font>` +
    `${d.fundo ? `<fill><patternFill patternType="solid"><bgColor rgb="FF${d.fundo}"/></patternFill></fill>` : ''}</dxf>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `${fmts}<fonts count="${m.fontes.length}">${m.fontes.join('')}</fonts>` +
    `<fills count="${m.fundos.length}">${m.fundos.join('')}</fills>` +
    `<borders count="${m.bordas.length}">${m.bordas.join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${m.xfs.length}">${m.xfs.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    `<dxfs count="${dxfs.length}">${dx}</dxfs></styleSheet>`;
}

function celulaXml(ref, c, estilos) {
  const s = c.s !== undefined ? ` s="${estilos.indice[c.s] ?? 0}"` : '';
  if (c.f) return `<c r="${ref}"${s}><f>${esc(c.f)}</f></c>`;
  if (c.v === undefined || c.v === null || c.v === '') return `<c r="${ref}"${s}/>`;
  if (c.v instanceof Date) return `<c r="${ref}"${s}><v>${serialData(c.v)}</v></c>`;
  if (typeof c.v === 'number') return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
}

function abaXml(aba, estilos, dxfBase, temImagem) {
  const cols = Object.entries(aba.colunas || {})
    .map(([l, w]) => [colNum(l), w]).sort((a, b) => a[0] - b[0])
    .map(([n, w]) => `<col min="${n}" max="${n}" width="${w}" customWidth="1"/>`).join('');
  const linhas = [...(aba.linhas || [])].sort((a, b) => a.n - b.n).map((l) => {
    const cels = Object.entries(l.celulas || {})
      .sort((a, b) => colNum(a[0]) - colNum(b[0]))
      .map(([col, c]) => celulaXml(`${col}${l.n}`, c, estilos)).join('');
    const alt = l.altura ? ` ht="${l.altura}" customHeight="1"` : '';
    return `<row r="${l.n}"${alt}>${cels}</row>`;
  }).join('');
  const mesclas = (aba.mesclas || []).length
    ? `<mergeCells count="${aba.mesclas.length}">${aba.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';
  let prioridade = 1;
  const cf = (aba.condicional || []).map((c) => `<conditionalFormatting sqref="${c.sqref}">${c.regras.map((r) =>
    `<cfRule type="cellIs" dxfId="${dxfBase + r.dxf}" priority="${prioridade++}" operator="equal"><formula>"${esc(r.valor)}"</formula></cfRule>`).join('')}</conditionalFormatting>`).join('');
  const val = (aba.validacoes || []).length
    ? `<dataValidations count="${aba.validacoes.length}">${aba.validacoes.map((v) =>
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${v.sqref}">` +
      `<formula1>"${esc(v.lista.join(','))}"</formula1></dataValidation>`).join('')}</dataValidations>`
    : '';
  const painel = aba.congelar
    ? `<pane ySplit="${aba.congelar - 1}" topLeftCell="A${aba.congelar}" activePane="bottomLeft" state="frozen"/>`
    : '';
  const grade = aba.semGrade ? ' showGridLines="0"' : '';
  const imp = aba.impressao || {};
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView workbookViewId="0"${grade}>${painel}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${linhas}</sheetData>${mesclas}${cf}${val}` +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    `<pageSetup paperSize="9" orientation="${imp.orientacao || 'landscape'}" fitToWidth="1" fitToHeight="0"/>` +
    `${temImagem ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
}

function desenhoXml(img) {
  const EMU = 9525; // por pixel
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<xdr:oneCellAnchor><xdr:from><xdr:col>${colNum(img.col) - 1}</xdr:col><xdr:colOff>${(img.dx || 0) * EMU}</xdr:colOff>` +
    `<xdr:row>${img.linha - 1}</xdr:row><xdr:rowOff>${(img.dy || 0) * EMU}</xdr:rowOff></xdr:from>` +
    `<xdr:ext cx="${img.largura * EMU}" cy="${img.altura * EMU}"/>` +
    '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
    '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
    `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.largura * EMU}" cy="${img.altura * EMU}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>';
}

function criarXlsx({ estilos = {}, abas, autor = 'Tayná Alves Assessoria' }) {
  const m = montarEstilos(estilos);
  const dxfs = [];
  const zip = new PizZip();
  const tipos = [];
  abas.forEach((aba, i) => {
    const n = i + 1;
    const base = dxfs.length;
    (aba.destaques || []).forEach((d) => dxfs.push(d));
    zip.file(`xl/worksheets/sheet${n}.xml`, abaXml(aba, m, base, Boolean(aba.imagem)));
    tipos.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    if (aba.imagem) {
      zip.file(`xl/worksheets/_rels/sheet${n}.xml.rels`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`);
      zip.file(`xl/drawings/drawing${n}.xml`, desenhoXml(aba.imagem));
      zip.file(`xl/drawings/_rels/drawing${n}.xml.rels`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/imagem${n}.png"/></Relationships>`);
      zip.file(`xl/media/imagem${n}.png`, aba.imagem.png);
      tipos.push(`<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
    }
  });
  zip.file('xl/styles.xml', stylesXml(m, dxfs));
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    abas.map((a, i) => `<sheet name="${esc(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    abas.map((a, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:creator>${esc(autor)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created>` +
    '</cp:coreProperties>');
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    `${tipos.join('')}</Types>`);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { criarXlsx, serialData };

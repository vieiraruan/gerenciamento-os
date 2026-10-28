"""
Gera o modelo do CHECKLIST DO EVENTO (uso no dia do casamento):

  templates/checklist_evento.docx

Baseado no roteiro do casal Hanna & Ivan: contatos principais, montagem (véspera e dia), cronograma
do dia com horário de cada atividade, fornecedores com responsável, telefone e horário de chegada,
programação dos outros dias (destination) e observações. Tudo é preenchido pelo sistema com os dados
cadastrados no aplicativo (src/roteiro.js) — o documento não tem campos em branco.

Uso: python3 scripts/criar_roteiro.py
"""
import sys
from pathlib import Path

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from criar_modelos import DIR, COR, novo_documento, sombrear, bordas, Escritor  # noqa: E402

SUAVE = RGBColor(0x7B, 0x6F, 0x6A)
BRANCO = RGBColor(0xFF, 0xFF, 0xFF)


class Doc(Escritor):
    def secao(self, texto):
        import re
        maiusc = re.sub(r"[^{}]+(?=\{|$)", lambda m: m.group(0).upper(), texto)  # não altera {campos}
        par = self.p(maiusc, negrito=True, cor=COR, tamanho=12.5, depois=4)
        par.paragraph_format.space_before = Pt(14)
        par.paragraph_format.keep_with_next = True
        pPr = par._p.get_or_add_pPr()
        bdr = OxmlElement("w:pBdr")
        b = OxmlElement("w:bottom")
        b.set(qn("w:val"), "single"); b.set(qn("w:sz"), "6"); b.set(qn("w:color"), "D9BFB3"); b.set(qn("w:space"), "2")
        bdr.append(b); pPr.append(bdr)
        return par

    def campo(self, rotulo, valor, depois=2):
        par = self.doc.add_paragraph()
        r = par.add_run(f"{rotulo}: ")
        r.bold = True
        par.add_run(valor)
        par.paragraph_format.space_after = Pt(depois)
        return par

    def linha(self, texto, negrito=False, italico=False, cor=None, depois=2, tamanho=None):
        par = self.doc.add_paragraph()
        r = par.add_run(texto)
        r.bold = negrito
        r.italic = italico
        if cor:
            r.font.color.rgb = cor
        if tamanho:
            r.font.size = Pt(tamanho)
        par.paragraph_format.space_after = Pt(depois)
        return par

    def tabela_loop(self, cabecalho, celulas, larguras, loop):
        """Tabela com uma linha de modelo repetida para cada item da lista {#loop}."""
        t = self.doc.add_table(rows=2, cols=len(cabecalho))
        bordas(t)
        t.autofit = False
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
        for i, gc in enumerate(t._tbl.tblGrid.findall(qn("w:gridCol"))):
            gc.set(qn("w:w"), str(int(larguras[i] * 567)))
        for i, c in enumerate(cabecalho):
            cel = t.rows[0].cells[i]
            r = cel.paragraphs[0].add_run(c)
            r.bold = True; r.font.color.rgb = BRANCO; r.font.size = Pt(9.5)
            sombrear(cel, "824634")
        # cabeçalho repete em cada página
        trPr = t.rows[0]._tr.get_or_add_trPr()
        h = OxmlElement("w:tblHeader"); h.set(qn("w:val"), "true"); trPr.append(h)
        for i, txt in enumerate(celulas):
            if i == 0:
                txt = "{#" + loop + "}" + txt
            if i == len(celulas) - 1:
                txt = txt + "{/" + loop + "}"
            r = t.rows[1].cells[i].paragraphs[0].add_run(txt)
            r.font.size = Pt(9.5)
            r.bold = i == 0
        for row in t.rows:
            for i, w in enumerate(larguras):
                row.cells[i].width = Cm(w)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(0)


def modelo():
    doc = novo_documento()
    for s in doc.sections:
        s.top_margin = Cm(2.2); s.left_margin = Cm(1.8); s.right_margin = Cm(1.8)
    doc.styles["Normal"].font.size = Pt(10.5)
    doc.styles["Normal"].paragraph_format.space_after = Pt(3)
    w = Doc(doc)

    # ---- Cabeçalho -------------------------------------------------------------
    w.p("CHECKLIST DO EVENTO{#destination} · DESTINATION{/destination}", negrito=True, centro=True, tamanho=10, cor=SUAVE, depois=0)
    w.p("{titulo_nomes}", negrito=True, centro=True, tamanho=20, cor=COR, depois=0)
    w.p("{data_extenso}", centro=True, tamanho=11.5, depois=0)
    w.p("Contrato nº {numero_os}  ·  {convidados_txt}", centro=True, tamanho=9.5, cor=SUAVE, depois=8)
    w.campo("Cerimônia", "{cerimonia_txt}")
    w.campo("Recepção", "{recepcao_txt}")

    # ---- Contatos principais ----------------------------------------------------
    w.secao("Contatos principais")
    w.campo("Responsável pela montagem", "{responsavel_montagem}{#telefone_assessoria} – {telefone_assessoria}{/telefone_assessoria}")
    w.tag("{#contato_emergencia}")
    w.campo("Contato de emergência", "{contato_emergencia}")
    w.tag("{/contato_emergencia}")

    # ---- Montagem ---------------------------------------------------------------
    w.tag("{#tem_vespera}")
    w.secao("Montagem – véspera ({data_vespera})")
    w.tag("{#inicio_montagem_vespera}")
    w.campo("Início da montagem", "{inicio_montagem_vespera}")
    w.tag("{/inicio_montagem_vespera}")
    w.tag("{#montagem_vespera}")
    pv = w.doc.add_paragraph()
    r = pv.add_run("{chegada}  ☐ "); r.bold = True; r.font.color.rgb = COR
    pv.add_run("{servico_txt} – {nome}")
    r2 = pv.add_run("{contato_txt}"); r2.font.color.rgb = SUAVE
    pv.paragraph_format.space_after = Pt(2)
    w.tag("{/montagem_vespera}")
    w.tag("{/tem_vespera}")

    w.secao("Montagem – dia do evento ({data_evento})")
    w.tag("{#inicio_montagem_dia}")
    w.campo("Início da montagem", "{inicio_montagem_dia}")
    w.tag("{/inicio_montagem_dia}")
    w.tag("{#montagem_dia}")
    pd = w.doc.add_paragraph()
    r = pd.add_run("{chegada}  ☐ "); r.bold = True; r.font.color.rgb = COR
    pd.add_run("{servico_txt} – {nome}")
    r2 = pd.add_run("{contato_txt}"); r2.font.color.rgb = SUAVE
    pd.paragraph_format.space_after = Pt(2)
    w.tag("{/montagem_dia}")

    # ---- Cronograma do dia ------------------------------------------------------
    w.secao("Cronograma do dia – {data_evento}")
    w.tag("{#linha_tempo}")
    hp = w.doc.add_paragraph()
    r = hp.add_run("{hora}  ☐ "); r.bold = True; r.font.color.rgb = COR
    hp.add_run("{texto}")
    r3 = hp.add_run("{extra}"); r3.font.color.rgb = SUAVE
    hp.paragraph_format.space_before = Pt(4)
    hp.paragraph_format.space_after = Pt(1)
    hp.paragraph_format.keep_with_next = True
    w.tag("{#detalhes}")
    ip = w.doc.add_paragraph(style="List Bullet")
    ip.add_run("{.}")
    ip.paragraph_format.space_after = Pt(0)
    w.tag("{/detalhes}")
    w.tag("{/linha_tempo}")

    # ---- Cerimônia e festa -------------------------------------------------------
    for titulo, loop in (("Cerimônia", "cerimonia_itens"), ("Festa", "festa_itens")):
        w.secao(titulo)
        w.tag("{#" + loop + "}")
        pc = w.doc.add_paragraph()
        r = pc.add_run("{rotulo}:")
        r.bold = True
        pc.add_run("{^lista} {valor}{/lista}")
        pc.paragraph_format.space_after = Pt(2)
        w.tag("{#lista}")
        li = w.doc.add_paragraph(style="List Bullet")
        li.add_run("{.}")
        li.paragraph_format.space_after = Pt(0)
        w.tag("{/lista}")
        w.tag("{/" + loop + "}")
        if loop == "festa_itens":
            w.p("Previsão artística", negrito=True, depois=2)
            w.tag("{#atracoes}")
            pa = w.doc.add_paragraph()
            r = pa.add_run("{inicio} às {fim}  ☐ "); r.bold = True; r.font.color.rgb = COR
            pa.add_run("{nome}")
            r2 = pa.add_run("{obs_txt}"); r2.font.color.rgb = SUAVE
            pa.paragraph_format.space_after = Pt(2)
            w.tag("{/atracoes}")

    # ---- Fornecedores -----------------------------------------------------------
    w.secao("Fornecedores e contatos")
    w.tabela_loop(["Serviço", "Fornecedor", "Responsável", "Telefone", "Chegada"],
                  ["{servico_txt}", "{nome}", "{responsavel}", "{telefone}", "{chegada_txt}"],
                  [4.6, 4.2, 3.2, 3.2, 2.2], "fornecedores")

    # ---- Outros dias ------------------------------------------------------------
    w.tag("{#tem_posterior}")
    w.secao("Programação dos outros dias")
    w.tag("{#posterior}")
    po = w.doc.add_paragraph()
    r = po.add_run("{chegada}  ☐ "); r.bold = True; r.font.color.rgb = COR
    po.add_run("{servico_txt} – {nome}")
    r2 = po.add_run("{contato_txt}"); r2.font.color.rgb = SUAVE
    po.paragraph_format.space_after = Pt(2)
    w.tag("{/posterior}")
    w.tag("{/tem_posterior}")

    # ---- Observações ------------------------------------------------------------
    w.tag("{#observacoes}")
    w.secao("Observações")
    w.p("{observacoes}")
    w.tag("{/observacoes}")

    w.linha("Gerado pelo sistema Tayná Alves Assessoria em {gerado_em}.", italico=True, cor=SUAVE, tamanho=8.5)

    destino = DIR / "checklist_evento.docx"
    doc.save(destino)
    print("Modelo criado:", destino)


if __name__ == "__main__":
    modelo()

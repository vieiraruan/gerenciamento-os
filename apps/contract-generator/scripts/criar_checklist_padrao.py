"""
Gera o modelo do CHECKLIST DO EVENTO sem destination:

  templates/checklist_evento_padrao.docx

Segue o "CHECK LIST" usado pela Tayná (modelo do casal Mariana & Marco): data e horários, nome e filiação,
comunicação, local do evento, serviços contratados, informações da cerimônia e da recepção, informações
familiares para as fotos, músicas e ordem do cortejo, crianças do cortejo, padrinhos e madrinhas,
anotações do cerimonial e o cronograma Horário | Serviço | Duração | Objetos. Tudo é preenchido pelo
sistema (src/roteiro.js) — o documento não tem campos em branco.

Uso: python3 scripts/criar_checklist_padrao.py
"""
import sys
from pathlib import Path

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from criar_modelos import DIR, COR, novo_documento, sombrear, bordas  # noqa: E402
from criar_roteiro import Doc, SUAVE, BRANCO  # noqa: E402

DESTAQUE = RGBColor(0x9C, 0x4A, 0x1E)


def fixar_larguras(t, larguras):
    t.autofit = False
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
    for i, gc in enumerate(t._tbl.tblGrid.findall(qn("w:gridCol"))):
        gc.set(qn("w:w"), str(int(larguras[i] * 567)))
    for row in t.rows:
        for i, w in enumerate(larguras):
            row.cells[i].width = Cm(w)


def cabecalho(t, textos):
    for i, c in enumerate(textos):
        cel = t.rows[0].cells[i]
        r = cel.paragraphs[0].add_run(c)
        r.bold = True; r.font.color.rgb = BRANCO; r.font.size = Pt(9.5)
        sombrear(cel, "824634")


def escrever(cel, texto, negrito=False, tamanho=9.5):
    r = cel.paragraphs[0].add_run(texto)
    r.bold = negrito; r.font.size = Pt(tamanho)


def tabela_fixa(w, cab, linhas, larguras):
    """Tabela com linhas fixas: linhas = [[texto, texto, ...], ...] (1ª coluna em negrito)."""
    t = w.doc.add_table(rows=1 + len(linhas), cols=len(cab))
    bordas(t)
    cabecalho(t, cab)
    for li, lin in enumerate(linhas, start=1):
        for ci, txt in enumerate(lin):
            escrever(t.rows[li].cells[ci], txt, negrito=ci == 0)
    fixar_larguras(t, larguras)
    w.doc.add_paragraph().paragraph_format.space_after = Pt(0)


def lista_marcadores(w, loop, campo="{.}"):
    w.tag("{#" + loop + "}")
    li = w.doc.add_paragraph(style="List Bullet")
    li.add_run(campo)
    li.paragraph_format.space_after = Pt(0)
    w.tag("{/" + loop + "}")


def modelo():
    doc = novo_documento()
    for s in doc.sections:
        s.top_margin = Cm(2.2); s.left_margin = Cm(2.0); s.right_margin = Cm(2.0)
    doc.styles["Normal"].font.size = Pt(10.5)
    doc.styles["Normal"].paragraph_format.space_after = Pt(3)
    w = Doc(doc)

    w.p("CHECK LIST", negrito=True, centro=True, tamanho=10, cor=SUAVE, depois=0)
    w.p("{titulo_nomes}", negrito=True, centro=True, tamanho=20, cor=COR, depois=0)
    w.p("{data_extenso}  ·  Contrato nº {numero_os}", centro=True, tamanho=10, cor=SUAVE, depois=10)

    w.p("Olá, casal!", depois=4)
    w.p("As informações abaixo são de grande importância para a organização do cerimonial. Agradecemos o "
        "preenchimento e ficamos à disposição para qualquer dúvida ou orientação necessária.", depois=8)

    # ---- Quadro de datas e horários ----------------------------------------------
    t = w.doc.add_table(rows=5, cols=1)
    bordas(t)
    for i, (rot, val) in enumerate([("Data", "{data_curta}"), ("Horário do casamento (convite)", "{horario_convite}"),
                                    ("Previsão de atraso", "{previsao_atraso}"),
                                    ("Horário de chegada dos padrinhos", "{chegada_padrinhos}"),
                                    ("Quantidade de convidados", "{quantidade_convidados}")]):
        r = t.rows[i].cells[0].paragraphs[0].add_run(f"{rot}: {val}")
        r.bold = True; r.font.color.rgb = DESTAQUE; r.font.size = Pt(10.5)
    fixar_larguras(t, [17.0])
    w.doc.add_paragraph().paragraph_format.space_after = Pt(0)

    # ---- Nome e filiação / comunicação ---------------------------------------------
    w.secao("Nome e filiação")
    tabela_fixa(w, ["Informações", "Noiva", "Noivo"],
                [["Nome completo", "{noiva_nome}", "{noivo_nome}"], ["Nome dos pais", "{noiva_pais}", "{noivo_pais}"]],
                [3.6, 6.7, 6.7])
    w.secao("Comunicação")
    tabela_fixa(w, ["Informações", "Noiva", "Noivo"],
                [["Telefone (celular)", "{noiva_telefone}", "{noivo_telefone}"], ["E-mail", "{noiva_email}", "{noivo_email}"]],
                [3.6, 6.7, 6.7])

    # ---- Local do evento --------------------------------------------------------------
    w.secao("Local do evento")
    tabela_fixa(w, ["Local", "Nome", "Responsável", "Contato"],
                [["Cerimônia", "{local_cerimonia}", "{cerimonia_responsavel}", "{cerimonia_contato}"],
                 ["Recepção", "{local_recepcao}", "{recepcao_responsavel}", "{recepcao_contato}"]],
                [2.6, 6.2, 4.1, 4.1])
    w.campo("Tipo da cerimônia", "{tipo_cerimonia}{#fe}  ·  Fé: {fe}{/fe}")

    # ---- Serviços contratados ---------------------------------------------------------
    w.secao("Serviços contratados")
    w.tabela_loop(["Serviço", "Fornecedor", "Detalhes / responsável", "Contato"],
                  ["{servico}", "{fornecedor}", "{detalhes}{#responsavel} · Resp.: {responsavel}{/responsavel}", "{contato}"],
                  [4.0, 4.4, 5.2, 3.4], "servicos")

    # ---- Cerimônia e recepção -------------------------------------------------------
    for titulo, loop in (("Informações da cerimônia", "cerimonia_itens"), ("Informações para a recepção", "festa_itens")):
        w.secao(titulo)
        w.tag("{#" + loop + "}")
        pc = w.doc.add_paragraph(style="List Bullet")
        r = pc.add_run("{rotulo}:")
        r.bold = True
        pc.add_run("{^lista} {valor}{/lista}")
        pc.paragraph_format.space_after = Pt(1)
        w.tag("{#lista}")
        li = w.doc.add_paragraph(style="List Bullet 2")
        li.add_run("{.}")
        li.paragraph_format.space_after = Pt(0)
        w.tag("{/lista}")
        w.tag("{/" + loop + "}")
    w.p("OBS.: o cerimonial não se responsabiliza pela animação da festa quanto às brincadeiras. "
        "Solicitamos que um dos convidados fique responsável por elas.", negrito=True, tamanho=9.5, depois=4)
    w.tag("{#tem_atracoes}")
    w.p("Previsão artística", negrito=True, depois=2)
    w.tag("{/tem_atracoes}")
    w.tag("{#atracoes}")
    pa = w.doc.add_paragraph()
    r = pa.add_run("{inicio} às {fim}  "); r.bold = True; r.font.color.rgb = COR
    pa.add_run("{nome}")
    r2 = pa.add_run("{obs_txt}"); r2.font.color.rgb = SUAVE
    pa.paragraph_format.space_after = Pt(1)
    w.tag("{/atracoes}")

    # ---- Família (fotos) -------------------------------------------------------------
    w.secao("Informações familiares para as fotos no altar e na mesa do bolo")
    tabela_fixa(w, ["", "Noiva", "Noivo"],
                [["Pais separados?", "{familia_noiva_pais_separados}", "{familia_noivo_pais_separados}"],
                 ["Irmãos", "{familia_noiva_irmaos}", "{familia_noivo_irmaos}"],
                 ["Avós", "{familia_noiva_avos}", "{familia_noivo_avos}"],
                 ["Obs.", "{familia_noiva_obs}", "{familia_noivo_obs}"]],
                [3.6, 6.7, 6.7])

    # ---- Cortejo ------------------------------------------------------------------------
    w.secao("Músicas e ordem do cortejo")
    w.tabela_loop(["Nº", "Entrada", "Música", "Quem entra / observação"],
                  ["{n}", "{entrada}", "{musica}", "{quem}"], [1.0, 4.6, 6.4, 5.0], "cortejo")
    w.tag("{#tem_criancas}")
    w.p("Crianças do cortejo", negrito=True, depois=2)
    w.tag("{/tem_criancas}")
    w.tag("{#tem_criancas}")
    w.tabela_loop(["Nome", "Função", "Idade", "Fone do responsável"],
                  ["{nome}", "{funcao}", "{idade}", "{responsavel}"], [5.4, 4.4, 1.8, 5.4], "criancas_cortejo")
    w.tag("{/tem_criancas}")
    w.tag("{#tem_padrinhos}")
    w.p("Padrinhos", negrito=True, depois=2)
    w.tabela_loop(["Nome", "Contato", "Observação (entra com, casado com...)"],
                  ["{nome}", "{contato}", "{obs}"], [5.6, 4.2, 7.2], "padrinhos")
    w.tag("{/tem_padrinhos}")
    w.tag("{#tem_madrinhas}")
    w.p("Madrinhas", negrito=True, depois=2)
    w.tabela_loop(["Nome", "Contato", "Observação (entra com, casada com...)"],
                  ["{nome}", "{contato}", "{obs}"], [5.6, 4.2, 7.2], "madrinhas")
    w.tag("{/tem_madrinhas}")

    w.tag("{#notas_cerimonial}")
    w.secao("Para preenchimento do cerimonial")
    w.p("{notas_cerimonial}")
    w.tag("{/notas_cerimonial}")

    # ---- Cronograma ------------------------------------------------------------------
    w.secao("Cronograma do dia – {data_evento}")
    w.tabela_loop(["Horário", "Serviço", "Duração", "Objetos / observações"],
                  ["{hora}", "{servico}", "{duracao}", "{objetos}"], [2.0, 5.0, 2.4, 7.6], "cronograma")
    w.tag("{#observacoes}")
    w.campo("Obs.", "{observacoes}")
    w.tag("{/observacoes}")

    # ---- Chegada dos fornecedores -----------------------------------------------------
    w.tag("{#tem_montagem_dia}")
    w.secao("Chegada dos fornecedores – {data_evento}")
    w.tag("{/tem_montagem_dia}")
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
    w.campo("Responsável pela montagem", "{responsavel_montagem}{#telefone_assessoria} – {telefone_assessoria}{/telefone_assessoria}")
    w.tag("{#contato_emergencia}")
    w.campo("Contato de emergência", "{contato_emergencia}")
    w.tag("{/contato_emergencia}")

    w.p("Abraços e felicidades.", depois=2).paragraph_format.space_before = Pt(16)
    w.p("Tayná Alves", tamanho=16, depois=0)
    w.p("Assessoria e Produção", depois=8)
    w.linha("Gerado pelo sistema Tayná Alves Assessoria em {gerado_em}.", italico=True, cor=SUAVE, tamanho=8.5)

    destino = DIR / "checklist_evento_padrao.docx"
    doc.save(destino)
    print("Modelo criado:", destino)


if __name__ == "__main__":
    modelo()

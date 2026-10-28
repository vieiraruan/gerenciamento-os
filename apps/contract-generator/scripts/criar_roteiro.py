"""
Gera o modelo do ROTEIRO DO EVENTO (checklist destination):

  templates/roteiro_destination.docx

Estrutura baseada no roteiro do casal Hanna & Ivan (HANNA_E_IVAN_ROTEIRO_NOVO.docx, out/2026):
dados do contrato, hospedagem, filiação, restrições, personalizados, cronograma de montagem (dia anterior
e dia do evento), local, serviços contratados, cronograma do dia (making of), cerimônia, recepção,
previsão artística e programação dos outros dias (destination).

Os campos {entre_chaves} são preenchidos pelo sistema (src/roteiro.js); o resto fica em branco
("____") para a assessoria completar no Word.

Uso: python3 scripts/criar_roteiro.py
"""
import sys
from pathlib import Path

from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Cm, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from criar_modelos import DIR, COR, novo_documento, sombrear, bordas, Escritor  # noqa: E402

L = "______________________"   # linha para preencher
CURTA = "________"
SUAVE = RGBColor(0x7B, 0x6F, 0x6A)


class Roteiro(Escritor):
    def secao(self, texto):
        import re
        maiusc = re.sub(r"[^{}]+(?=\{|$)", lambda m: m.group(0).upper(), texto)  # não altera {campos}
        par = self.p(maiusc, negrito=True, cor=COR, tamanho=12.5, depois=4)
        par.paragraph_format.space_before = Pt(16)
        par.paragraph_format.keep_with_next = True
        # linha fina abaixo do título
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
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

    def linha(self, texto, negrito=False, depois=2, italico=False, cor=None):
        par = self.doc.add_paragraph()
        r = par.add_run(texto)
        r.bold = negrito
        r.italic = italico
        if cor:
            r.font.color.rgb = cor
        par.paragraph_format.space_after = Pt(depois)
        return par

    def marcar(self, texto):
        return self.linha(f"☐ {texto}")

    def tabela(self, cabecalho, linhas, larguras):
        t = self.doc.add_table(rows=1, cols=len(cabecalho))
        bordas(t)
        t.autofit = False
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
        grid = t._tbl.tblGrid
        for i, gc in enumerate(grid.findall(qn("w:gridCol"))):
            gc.set(qn("w:w"), str(int(larguras[i] * 567)))
        for i, c in enumerate(cabecalho):
            cel = t.rows[0].cells[i]
            cel.text = ""
            r = cel.paragraphs[0].add_run(c)
            r.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            r.font.size = Pt(10)
            sombrear(cel, "824634")
        for ln in linhas:
            cels = t.add_row().cells
            for i, v in enumerate(ln):
                cels[i].text = ""
                partes = v if isinstance(v, list) else [v]
                for j, txt in enumerate(partes):
                    par = cels[i].paragraphs[0] if j == 0 else cels[i].add_paragraph()
                    run = par.add_run(txt)
                    run.font.size = Pt(9.5)
                    if i == 0 and j == 0:
                        run.bold = True
                    par.paragraph_format.space_after = Pt(0)
        for row in t.rows:
            for i, w in enumerate(larguras):
                row.cells[i].width = Cm(w)
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)
        return t


def roteiro():
    doc = novo_documento()
    for s in doc.sections:
        s.top_margin = Cm(2.2); s.left_margin = Cm(2); s.right_margin = Cm(2)
    doc.styles["Normal"].font.size = Pt(10.5)
    doc.styles["Normal"].paragraph_format.space_after = Pt(3)
    w = Roteiro(doc)

    # ---- Capa / cabeçalho -------------------------------------------------
    w.p("ROTEIRO DO EVENTO · DESTINATION", negrito=True, centro=True, tamanho=10, cor=SUAVE, depois=0)
    w.p("{titulo_nomes}", negrito=True, centro=True, tamanho=20, cor=COR, depois=0)
    w.p("{subtitulo}", centro=True, tamanho=11, depois=2)
    w.p("Contrato nº {numero_os}", centro=True, tamanho=9.5, cor=SUAVE, depois=10)
    w.campo("Link de acesso ao Drive", L)
    w.campo("Referências (Pinterest)", L)

    # ---- Dados do contrato ------------------------------------------------
    w.secao("Dados do contrato")
    w.campo("Nome completo do assinante do contrato", "{contratante_nome}")
    w.campo("Primeiro nome dos noivos", "{primeiros_nomes}")
    w.campo("Profissão", "{contratante_profissao}")
    w.campo("Estado civil", "{contratante_estado_civil}")
    w.campo("CPF", "{contratante_cpf}")
    w.campo("Endereço", "{contratante_endereco}")
    w.campo("Telefone", "{contratante_telefone}")
    w.campo("E-mail", "{contratante_email}")
    w.campo("Quantidade de convidados", "{convidados}")
    w.campo("Quantidade de crianças abaixo de 7 anos", "{criancas}")
    w.campo("Casais de padrinhos", "{padrinhos}")

    # ---- Hospedagem (destination) -----------------------------------------
    w.secao("Hospedagem e site")
    w.campo("Pousada / hotel dos noivos", L)
    w.campo("Check-in", f"{CURTA}      Check-out: {CURTA}")
    w.campo("Hospedagem da equipe (assessoria e decoração)", L)
    w.campo("Site dos noivos", L)

    # ---- Filiação ---------------------------------------------------------
    w.secao("Nome e filiação")
    w.tabela(["Informações", "Noiva", "Noivo"], [
        ["Nome completo", "", ""],
        ["Nome dos pais", ["Pai:", "Mãe:"], ["Pai:", "Mãe:"]],
    ], [3.5, 6.75, 6.75])

    # ---- Restrições -------------------------------------------------------
    w.secao("Restrições e emergência")
    for c in ("Restrição alimentar (noivos)", "Alergia alimentar (noivos)", "Contato de emergência",
              "Convidados com restrição alimentar", "Convidados com alergia alimentar",
              "Convidados com necessidade especial"):
        w.campo(c, L)
    w.campo("Tipo de cerimônia", L)

    # ---- Personalizados ---------------------------------------------------
    w.secao("Personalizados")
    w.campo("Kit banheiro", f"{CURTA} unidades")
    for item in ("Copos personalizados", "Menu", "Menu de drinks", "Lágrimas de alegria",
                 "Placa de reservado", "Lembranças", "Ecobags"):
        w.marcar(f"{item} – {CURTA} unidades – fornecedor: {CURTA}")
    w.campo("Itens em cada kit de boas-vindas", L)
    w.campo("Entrega dos kits (onde / quem)", L)
    w.campo("OBS.", "")

    # ---- Cronograma de montagem -------------------------------------------
    w.secao("Cronograma de montagem")
    w.subtitulo("Dia anterior – {data_vespera}")
    w.linha("Considerar o tempo de trajeto de Recife até o local do evento e possíveis obras/trânsito na pista "
            "para definir o horário de saída das equipes.", italico=True, cor=SUAVE)
    w.campo("Início da montagem", CURTA)
    w.campo("OBS.", f"Descarregamento dos caminhões das {CURTA} às {CURTA}. A montagem deverá encerrar às {CURTA}.")
    for i, f in enumerate(("Sonorização, iluminação e estrutura", "Decoração", "Gerador", "Chopp"), 1):
        w.linha(f"{i}. {f.upper()} | Chega às {CURTA} | Responsável/contato: {CURTA}")
    w.subtitulo("Dia do evento – {data_evento}")
    w.campo("Responsável pela montagem", "Tayná Alves")
    w.campo("Início da montagem", CURTA)
    for i, f in enumerate(("Sonorização, iluminação e estrutura", "Decoração", "Bebidas", "Carregadores", "Chopp",
                           "Gerador", "Bolo", "Doces", "Buffet", "Bar de drinks", "Banda da cerimônia",
                           "Banda 1", "Banda 2", "Banda 3", "DJ"), 1):
        w.linha(f"{i}. {f.upper()} | Chega às {CURTA}")

    # ---- Local ------------------------------------------------------------
    w.secao("Local do evento")
    w.tabela(["Local", "Nome", "Responsável", "Contato"], [
        ["Cerimônia", "{local_cerimonia}", "", ""],
        ["Recepção", "{local_recepcao}", "", ""],
    ], [3, 7, 3.5, 3.5])

    # ---- Serviços contratados ---------------------------------------------
    w.secao("Serviços contratados")
    servicos = [
        "BUFFET", "ESPÁTULAS E TAÇAS", "ILUMINAÇÃO CÊNICA / ESTRUTURA (cobertura, altar elevado)",
        ["PALCO", "Com iluminação ( )"], "PAINEL DE LED E VJ", "GERADOR (cerimônia e recepção)",
        "DECORAÇÃO / MOBILIÁRIO COMPLETO (mesas de buffet, welcome, balcão de bar e chopp)",
        ["BUQUÊ ( )   Jogar ( )", "LAPELA – Qtd.:", "PÉTALAS ( )"], ["GUARDANAPOS – Qtd.:", "COR:"],
        ["CADEIRAS – modelo/cor:", "Cerimônia – Qtd.:", "Recepção – Qtd.:"], ["MESAS – Qtd.:"],
        ["BOLO – sabor:", "Andares:"], ["DOCES – Qtd.:"], ["FORMINHA PARA DOCE – Qtd.:"],
        ["BEM-CASADO / BOLO DE ROLO – Qtd.:"], "LEMBRANCINHAS – qual item?", "BANDA CERIMÔNIA",
        "BANDA RECEPÇÃO", "SOM", "FOTO", "FILMAGEM", "CABELO E MAKE", "DIA DA NOIVA", "HOTEL P/ NÚPCIAS",
        "VESTIDO DE NOIVA", "SAPATO DA NOIVA", "ROBE", "ACESSÓRIOS DA NOIVA (véu/tiara/brincos)", "DIA DO NOIVO",
        "TRAJE / SAPATO DO NOIVO", "ALIANÇAS", "CELEBRANTE",
        ["TAXAS:", "• ECAD (direitos autorais musicais)",
         "• CREA (anotação de responsabilidade técnica: energia e estrutura)",
         "*Consultar o espaço para saber da necessidade do pagamento das taxas, que são de responsabilidade do cliente."],
        ["BEBIDAS ALCOÓLICAS:", "- Espumante", "- Uísque", "- Cerveja", "- Vinho", "- Água de coco", "- Energético"],
        "BARMAN", "CHOPP", "BANHEIROS", "COCO VERDE", "COFFEE BREAK (equipe e fornecedores)", "AXÉ",
        "SEGURANÇA / AMBULÂNCIA / LIMPEZA", "TRANSLADO / TRANSPORTE DE CONVIDADOS",
    ]
    w.tabela(["Serviço", "Fornecedor / Instagram", "Responsável", "Contato"],
             [[s, "", "", "F:"] for s in servicos], [7, 4.5, 3, 2.5])

    # ---- Cronograma do dia ------------------------------------------------
    w.secao("Cronograma do dia – {data_evento}")
    w.p("{evento_frase}", depois=8)
    w.tag("{#horarios}")
    hp = w.doc.add_paragraph()
    r = hp.add_run("{hora}: ")
    r.bold = True
    r.font.color.rgb = COR
    hp.add_run("☐ {texto}")
    hp.paragraph_format.space_before = Pt(6)
    hp.paragraph_format.space_after = Pt(1)
    hp.paragraph_format.keep_with_next = True
    w.tag("{#instrucoes}")
    ip = w.doc.add_paragraph(style="List Bullet")
    ip.add_run("{.}")
    ip.paragraph_format.space_after = Pt(1)
    w.tag("{/instrucoes}")
    w.tag("{/horarios}")
    w.linha("")
    w.campo("Horário da cerimônia", "{cerimonia_horario}")
    w.campo("Horário da recepção", "{recepcao_horario}")
    w.campo("Horas de festa", "{horas_festa}")
    w.campo("Horas de buffet", CURTA)
    w.campo("Horas de bar", CURTA)
    w.campo("Staff", "{staff}")

    # ---- Cerimônia --------------------------------------------------------
    w.secao("Cerimônia")
    w.subtitulo("Informações da cerimônia")
    for c in ("Cor da decoração da cerimônia",
              "Terá alguma homenagem especial ou estrutura especial no casamento?",
              "Com quem estarão as alianças no dia do casamento?",
              "Convidados com necessidades especiais?",
              "Quem irá buscar o buquê com a decoração?"):
        w.campo(c, L)
    w.campo("Terá na saída", "Pétalas ( )  /  Sparkles ( )  /  Chuva de prata ( )  /  Bolhas de sabão ( )  /  Chuva de arroz ( )")
    w.subtitulo("Músicas da cerimônia")
    w.campo("Sala de espera", L)
    w.campo("Padrinhos (nessa ordem)", "")
    for i in (1, 2, 3):
        w.linha(f"{i}- {L}")
    w.campo("Noivo", f"{L}  (entra com: {CURTA})")
    w.campo("Noiva", f"{L}  (entra com: {CURTA})")
    w.campo("Alianças", f"{L}  (quem leva: {CURTA})")
    w.campo("Homenagem", L)
    w.campo("Saída dos noivos", L)
    w.subtitulo("Protocolo de foto no altar")
    for x in ("Celebrante(s)", "Pais da noiva", "Pais do noivo", "Porta-aliança", "Padrinhos e madrinhas", "Crianças"):
        w.item(x)
    w.linha("Fotos com os noivos no altar e no local (praia/jardim, se houver).", negrito=True)
    w.linha("Terminar a cerimônia, levar os noivos para hidratação, alimentação e retoque de beleza (quarto da noiva).")
    w.campo("OBS.", "")

    # ---- Recepção ---------------------------------------------------------
    w.secao("Recepção")
    w.campo("Cor da decoração da recepção", L)
    w.campo("Os noivos terão alguma participação com valsa/dança na festa?", "( ) sim  ( ) não")
    w.campo("O noivo jogará uísque ou outro item?", "( ) sim  ( ) não")
    w.campo("Terá kit festa (óculos coloridos, pluma, glitter) durante a recepção?", "( ) sim  ( ) não – Qual?")
    w.campo("Como serão os cumprimentos aos convidados?", "( ) agradecimento coletivo após a valsa  ( ) mesa a mesa")
    w.campo("Terá brincadeiras do tipo \"corte da gravata\" ou outras?", "( ) sim  ( ) não")
    w.subtitulo("Fotos na mesa do bolo")
    for x in ("Somente os noivos", "Noivos + pais da noiva", "Noivos + pais do noivo", "Noivos + irmãos",
              "Noivos + padrinhos"):
        w.marcar(x)
    w.subtitulo("Entrada dos noivos")
    w.linha("Após a entrada, os noivos entram no salão para dançar, com um grande círculo, e ao final fazem um "
            "agradecimento aos convidados.")
    w.campo("Música", L)
    w.linha("- Jogar o buquê quando a festa estiver bem animada (consultar a noiva se deseja jogar e deixar um buquê "
            "simples separado).")
    w.linha("- Cortar o bolo.")

    # ---- Previsão artística -----------------------------------------------
    w.secao("Previsão artística")
    for i in range(1, 6):
        w.campo(f"Atração {i}", L, depois=0)
        w.linha(f"Horário: {CURTA} às {CURTA} – {CURTA} de show.")
    w.campo("Passagem de som", CURTA)

    # ---- Outros dias (destination) ----------------------------------------
    w.secao("Programação dos outros dias")
    w.linha("Destination: use um bloco para cada evento extra (passeio, pool party, churrasco, brunch...). "
            "Apague o que não houver.", italico=True, cor=SUAVE)
    for rot in ("Dia {data_dia_seguinte} – Evento 1", "Dia {data_dia_seguinte} – Evento 2"):
        w.subtitulo(rot)
        for c in ("Evento", "Local", "Horário", "Início da montagem", "Responsável", "Reservado para (pessoas)",
                  "Staff", "Dress code convidados", "Dress code fornecedores", "Cobertura fotográfica",
                  "Cobertura de vídeo", "Serviço contratado (transfer, barco, buffet...)", "Bebidas",
                  "Fornecedores (churrasqueiro, banda, DJ, decoração, sonorização...)", "Cronograma"):
            w.campo(c, L)
        w.linha("")

    w.p("Roteiro gerado pelo sistema Tayná Alves Assessoria – complete os campos em branco e mantenha a equipe "
        "e os fornecedores atualizados.", tamanho=8.5, cor=SUAVE, centro=True)

    destino = DIR / "roteiro_destination.docx"
    doc.save(destino)
    print("Modelo criado:", destino)


if __name__ == "__main__":
    roteiro()

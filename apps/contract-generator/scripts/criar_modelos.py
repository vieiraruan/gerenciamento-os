"""
Gera os modelos .docx usados pelo gerador:

  templates/contrato_casamento.docx  contrato modular (seções por serviço)
  templates/ordem_servico.docx       ordem de serviço do evento

Texto baseado nos contratos em uso (out/2026):
  - CONTRATO - ASSESSORIA - SUPERVISÃO - CERIMONIAL - FINALIZAÇÃO
  - CONTRATO - SUPERVIÇÃO - CERIMONIAL - FINALIZAÇÃO (1)
com as inconsistências corrigidas: números por extenso calculados, cláusula de
repasse sem duplicidade, equipe e horários calculados.

Os .docx gerados podem ser editados no Word (logo, fonte, texto) — basta manter
os campos {entre_chaves} intactos, sem formatação no meio deles.

Uso: python3 scripts/criar_modelos.py
"""
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Cm

DIR = Path(__file__).resolve().parent.parent / "templates"
COR = RGBColor(0x82, 0x46, 0x34)  # terracota da identidade visual
LOGO = DIR / "marca" / "logo.png"


def novo_documento():
    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(2.5)
        s.bottom_margin = Cm(2)
        s.left_margin = Cm(2.5)
        s.right_margin = Cm(2.5)
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    # logo da identidade visual no cabeçalho de todas as páginas
    if LOGO.exists():
        cab = doc.sections[0].header
        cab.is_linked_to_previous = False
        par = cab.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.add_run().add_picture(str(LOGO), width=Cm(3.2))
        doc.sections[0].header_distance = Cm(0.8)
    return doc


def sombrear(celula, cor_hex):
    """Cor de fundo de uma célula de tabela."""
    tc = celula._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), cor_hex)
    tc.append(shd)


def bordas(tabela, cor_hex="E6D3CA"):
    """Bordas finas na cor da marca."""
    tblPr = tabela._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{lado}")
        e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), "4")
        e.set(qn("w:color"), cor_hex)
        b.append(e)
    tblPr.append(b)


class Escritor:
    def __init__(self, doc):
        self.doc = doc

    def p(self, texto, negrito=False, centro=False, tamanho=None, cor=None, depois=None):
        par = self.doc.add_paragraph()
        run = par.add_run(texto)  # um run por parágrafo mantém os {campos} intactos
        run.bold = negrito
        if tamanho:
            run.font.size = Pt(tamanho)
        if cor:
            run.font.color.rgb = cor
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER if centro else WD_ALIGN_PARAGRAPH.JUSTIFY
        if depois is not None:
            par.paragraph_format.space_after = Pt(depois)
        return par

    def rico(self, partes, centro=False):
        """Parágrafo com trechos em negrito: partes = [("texto", negrito), ...]."""
        par = self.doc.add_paragraph()
        for texto, negrito in partes:
            r = par.add_run(texto)
            r.bold = negrito
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER if centro else WD_ALIGN_PARAGRAPH.JUSTIFY
        return par

    def titulo(self, texto):
        par = self.p(texto, negrito=True, cor=COR, depois=4)
        par.paragraph_format.space_before = Pt(12)
        par.paragraph_format.keep_with_next = True
        return par

    def subtitulo(self, texto):
        par = self.p(texto, negrito=True, depois=2)
        par.paragraph_format.keep_with_next = True
        return par

    def item(self, texto):
        par = self.doc.add_paragraph(style="List Bullet")
        par.add_run(texto)
        par.paragraph_format.space_after = Pt(2)
        return par

    def tag(self, texto):
        """Parágrafo só com {#condicao} ou {/condicao}: some no documento final."""
        par = self.doc.add_paragraph()
        par.add_run(texto)
        return par


# =============================================================================
# CONTRATO
# =============================================================================
def contrato():
    doc = novo_documento()
    w = Escritor(doc)

    w.p("CONTRATO DE PRESTAÇÃO DE SERVIÇO", negrito=True, centro=True, tamanho=14, cor=COR, depois=0)
    w.p("Contrato nº {numero_os}", centro=True, tamanho=10, depois=14)

    w.rico([
        ("Pelo presente instrumento de CONTRATO DE PRESTAÇÃO DE SERVIÇOS que celebram entre si, de um lado ", False),
        ("{contratante_nome}", True),
        (", {contratante_profissao}, {contratante_estado_civil}, portador(a) do RG {contratante_rg} e do CPF "
         "{contratante_cpf}, residente no endereço {contratante_endereco}, telefone {contratante_telefone} e "
         "e-mail {contratante_email}, denominado(a) ", False),
        ("CONTRATANTE", True),
        (", e do outro lado ", False),
        ("{contratada_razao_social}", True),
        (", pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {contratada_cnpj}, com sede na "
         "{contratada_endereco}, neste ato representada na forma prevista em seu Contrato Social pela produtora "
         "{contratada_representante}, {contratada_representante_nacionalidade}, "
         "{contratada_representante_cargo}, {contratada_representante_estado_civil}, portadora do RG "
         "{contratada_representante_rg} e do CPF {contratada_representante_cpf}, telefone {contratada_telefone}, "
         "denominada ", False),
        ("CONTRATADA", True),
        (", pelas cláusulas pactuadas a seguir:", False),
    ])

    # ---- Objeto -------------------------------------------------------------
    w.titulo("DO OBJETO DO CONTRATO")
    w.p("O presente contrato tem por OBJETO a prestação dos serviços de {servicos_descricao}, destinados ao "
        "{evento_tipo} de {evento_nomes}, a realizar-se {evento_quando}, {evento_local_frase}, conforme as "
        "informações do evento descritas na cláusula seguinte, no valor total de {valor_total_fmt} "
        "({valor_total_extenso}), a ser pago na forma estabelecida neste contrato.")
    w.tag("{#tem_cortesia}")
    w.p("Como cortesia, a CONTRATADA incluirá o serviço {cortesia_nomes}, sem ônus à CONTRATANTE, "
        "preservando-se todas as demais condições, prazos e responsabilidades previstas neste instrumento.")
    w.tag("{/tem_cortesia}")

    # ---- Informações variáveis do evento -----------------------------------
    w.titulo("DAS INFORMAÇÕES DO EVENTO")
    w.p("Para fins deste contrato, o evento terá as seguintes características, que servem de base para o "
        "dimensionamento da equipe e para os valores ajustados:")
    for t in [
        "Data: {evento_quando_curto};",
        "Horário de início da cerimônia: {#tem_horario}{evento_horario}{/tem_horario}{^tem_horario}a definir{/tem_horario};",
        "Tempo estimado de evento: {#tem_duracao}{evento_duracao_fmt}{#tem_termino}, com término previsto às {evento_termino}{/tem_termino}{/tem_duracao}{^tem_duracao}a definir{/tem_duracao};",
        "Quantidade de convidados: até {convidados_fmt};",
        "Padrinhos e madrinhas no cortejo: até {padrinhos_fmt} padrinhos e {madrinhas_fmt} madrinhas;",
        "Crianças no cortejo (damas e pajens): até {criancas_fmt};",
        "Equipe da CONTRATADA no dia do evento: {equipe_fmt} profissionais.",
    ]:
        w.item(t)
    w.p("Alterações nessas informações deverão ser comunicadas à CONTRATADA em até 20 (vinte) dias antes do "
        "evento e poderão gerar reajuste, conforme as cláusulas de acréscimo deste contrato.")

    # ---- Empurrãozinho ------------------------------------------------------
    w.tag("{#secao_empurraozinho}")
    w.titulo("DA ASSESSORIA ESTRATÉGICA (\"EMPURRÃOZINHO\")")
    w.subtitulo("1. DAS OBRIGAÇÕES DA CONTRATADA")
    w.p("Mediante este instrumento de contrato, a CONTRATADA obriga-se a prestar à CONTRATANTE o serviço "
        "denominado EMPURRÃOZINHO, consistente em uma assessoria estratégica de acompanhamento e orientação "
        "para o planejamento do evento, composta pelas seguintes atividades:")
    for t in [
        "Realização de 06 (seis) reuniões online, por meio de videoconferência, com duração máxima de 02 (duas) horas cada;",
        "Direcionamento dos noivos a fornecedores compatíveis com seu perfil, estilo e orçamento;",
        "Orientação para o planejamento da cerimônia e da recepção, auxiliando na definição das etapas do evento;",
        "Organização das informações referentes aos fornecedores já contratados e levantamento dos serviços ainda pendentes de contratação;",
        "Disponibilização de planilha exclusiva de acompanhamento, contendo relação de fornecedores, checklist de atividades, cronograma e controle financeiro, cuja alimentação financeira será de responsabilidade da CONTRATANTE;",
        "Realização de 01 (uma) visita técnica, entre 01 (um) e 02 (dois) meses antes do evento, preferencialmente com a presença da equipe de decoração e demais fornecedores essenciais.",
    ]:
        w.item(t)
    w.subtitulo("2. DO ESCOPO DO SERVIÇO")
    w.p("O serviço EMPURRÃOZINHO possui caráter consultivo e estratégico, não compreendendo negociação "
        "contratual em nome da CONTRATANTE, acompanhamento presencial de fornecedores durante a organização, "
        "gerenciamento contínuo do planejamento nem execução de montagem, salvo os serviços expressamente "
        "contratados neste instrumento ou por aditivo contratual.")
    w.subtitulo("3. DAS REUNIÕES")
    w.p("As reuniões serão previamente agendadas conforme disponibilidade das partes. Caso a CONTRATANTE "
        "necessite remarcar alguma reunião, deverá comunicar à CONTRATADA com antecedência mínima de 24 "
        "(vinte e quatro) horas. A ausência injustificada da CONTRATANTE na data e horário agendados será "
        "considerada como reunião realizada.")
    w.subtitulo("4. DA VIGÊNCIA")
    w.p("O acompanhamento será realizado desde a assinatura deste contrato até a realização da visita técnica, "
        "encerrando-se após a entrega de todas as orientações e materiais correspondentes ao serviço.")
    w.tag("{/secao_empurraozinho}")

    # ---- Assessoria completa ------------------------------------------------
    w.tag("{#secao_assessoria_completa}")
    w.titulo("DA ASSESSORIA COMPLETA")
    w.subtitulo("1. DAS OBRIGAÇÕES DA CONTRATADA")
    w.p("Mediante este instrumento de contrato, a CONTRATADA obriga-se a prestar à CONTRATANTE o serviço de "
        "assessoria completa para o planejamento e a organização do evento, composto pelas seguintes atividades:")
    for t in [
        "Direcionamento dos noivos a fornecedores compatíveis com seu perfil, estilo e orçamento;",
        "Cotação e negociação com os fornecedores;",
        "Planejamento da cerimônia e da recepção junto aos noivos, em cada etapa, de forma online;",
        "Presença em reuniões, degustações e visitas, quando houver necessidade;",
        "Verificação dos dados e serviços previstos nos contratos de terceiros (leitura não jurídica);",
        "Elaboração e administração do cronograma, para que todos os itens sejam resolvidos dentro do prazo previsto;",
        "Disponibilização de planilha exclusiva de acompanhamento, contendo relação de fornecedores, checklist, cronograma e controle financeiro;",
        "Encontros com os noivos ao longo do planejamento.",
    ]:
        w.item(t)
    w.subtitulo("2. DA VIGÊNCIA")
    w.p("A assessoria será prestada desde a assinatura deste contrato até a realização do evento.")
    w.tag("{/secao_assessoria_completa}")

    # ---- Produção de palco --------------------------------------------------
    w.tag("{#secao_producao_palco}")
    w.titulo("DA PRODUÇÃO DE PALCO E ATRAÇÕES")
    w.p("A CONTRATADA realizará a produção ativa de palco e backstage durante a recepção, incluindo a troca e a "
        "manutenção de bandas e atrações, conforme cronograma definido com os noivos.")
    w.tag("{/secao_producao_palco}")

    # ---- Supervisão ---------------------------------------------------------
    w.tag("{#secao_supervisao}")
    w.titulo("DA SUPERVISÃO DA MONTAGEM")
    w.subtitulo("1. DAS OBRIGAÇÕES DA CONTRATADA")
    w.p("Mediante este instrumento de contrato, a CONTRATADA obriga-se para com a CONTRATANTE a prestar o "
        "serviço de supervisão da montagem, composto pelas seguintes ações:")
    for t in [
        "Chegada do cerimonialista com {supervisao_antecedencia_fmt} horas de antecedência do horário de início da cerimônia{#tem_horario} (às {supervisao_chegada}){/tem_horario};",
        "Acompanhamento e coordenação da montagem do evento junto aos fornecedores;",
        "Checagem dos mínimos detalhes;",
        "Conferência dos itens contratados com os que estão sendo dispostos no evento;",
        "Repasse aos noivos do andamento da montagem (opcional);",
        "Disponibilização de 01 (um) integrante da equipe com todos os contratos necessários para supervisionar toda a organização do evento.",
    ]:
        w.item(t)
    w.tag("{/secao_supervisao}")

    # ---- Cerimonial ---------------------------------------------------------
    w.tag("{#secao_cerimonial}")
    w.titulo("DO CERIMONIAL")
    w.subtitulo("1. DAS OBRIGAÇÕES DA CONTRATADA")
    w.p("Mediante este instrumento de contrato, a CONTRATADA obriga-se para com a CONTRATANTE a prestar o "
        "serviço de cerimonial, composto pelas seguintes ações:")
    w.p("Nos dias que antecedem a cerimônia:", negrito=True, depois=2)
    for t in [
        "Realização de reunião com os noivos para definir o roteiro do evento;",
        "Realização de ensaio com os noivos, pais, damas e pajens, não sendo necessária a presença de padrinhos;",
        "Contato com o celebrante e com os demais profissionais contratados para a execução do serviço;",
        "Confirmação da presença dos padrinhos ou testemunhas.",
    ]:
        w.item(t)
    w.p("Durante a cerimônia:", negrito=True, depois=2)
    for t in [
        "Recepção dos convidados;",
        "Disponibilização de água mineral e bombons na entrada da cerimônia;",
        "Colocação dos broches na lapela do noivo, padrinhos e pais;",
        "Recebimento e orientação dos noivos, padrinhos, damas e pajens para início da programação;",
        "Coordenação do cortejo de entrada e saída e dos cumprimentos aos pais ao término da cerimônia;",
        "Organização das fotos no altar;",
        "Assessoramento durante toda a cerimônia, com auxílio às equipes de músicos, foto, filmagem e ao celebrante;",
        "Entrega de pétalas e arroz para os convidados.",
    ]:
        w.item(t)
    w.p("Durante a recepção:", negrito=True, depois=2)
    for t in [
        "Reserva das mesas e recepção de noivos e convidados;",
        "Cuidado dos detalhes envolvendo a aparência dos noivos;",
        "Organização para as fotos no bolo e orientações à equipe de foto e filmagem;",
        "Abertura do salão com a dança dos noivos;",
        "Recepção de presentes, identificando todos através de etiquetas;",
        "Organização para a jogada do buquê e entrega das lembranças e adereços;",
        "Recolhimento das caixas de doces (previamente reservadas) e da sobra do bolo (se já disponibilizado).",
    ]:
        w.item(t)
    w.subtitulo("2. DO PERÍODO DE EXECUÇÃO")
    w.p("A equipe de cerimonial estará presente no evento (cerimônia e recepção) por um período de "
        "{cerimonial_horas_fmt} horas, com início uma hora antes do horário marcado no convite"
        "{#tem_horario}, ou seja, das {cerimonial_inicio} às {cerimonial_fim}{/tem_horario}. Caso as etapas não "
        "sejam realizadas no total de horas estimado, a equipe de cerimonial só sairá do evento com todas elas "
        "cumpridas.")
    w.p("A CONTRATADA disponibilizará: 01 (um) porta-alianças, caneta para assinatura, champanheira para água e "
        "kit de primeiros socorros (mala do cerimonial).")
    w.p("Estarão presentes {equipe_fmt} profissionais, sendo 01 (um) coordenador e {assistentes_fmt} "
        "{assistentes_palavra}, para a realização do evento.")
    w.tag("{/secao_cerimonial}")

    # ---- Finalização --------------------------------------------------------
    w.tag("{#secao_finalizacao}")
    w.titulo("DA FINALIZAÇÃO DO EVENTO")
    w.subtitulo("1. DAS OBRIGAÇÕES DA CONTRATADA")
    w.p("Mediante este instrumento de contrato, a CONTRATADA obriga-se para com a CONTRATANTE a prestar o "
        "serviço de finalização do evento, composto pelas seguintes ações:")
    for t in [
        "Disponibilização de 01 (um) integrante da equipe até o encerramento do evento;",
        "Prestação de contas, à pessoa indicada pelos noivos, ao final do evento, de todos os itens portáteis, tais como bolo, doces, bebidas, bem-casados e chocolates;",
        "Recolhimento de sobras de doces e bolo;",
        "Organização de todos os pertences dos noivos;",
        "Contagem de bebidas alcoólicas ao final (opcional).",
    ]:
        w.item(t)
    w.p("Após a entrega de todos os itens junto com o CHECKLIST de finalização (em duas vias, sendo uma da "
        "CONTRATADA e outra da CONTRATANTE), a CONTRATADA não se responsabilizará por itens perdidos.")
    w.subtitulo("2. DO PERÍODO DE EXECUÇÃO")
    w.p("No dia do evento, após o encerramento do serviço de cerimonial, será designado 01 (um) integrante da "
        "equipe para desempenhar as atividades acima, permanecendo no local o tempo necessário para a "
        "consecução de tais fins.")
    w.tag("{/secao_finalizacao}")

    # ---- Financeiro ---------------------------------------------------------
    w.titulo("DAS OBRIGAÇÕES DA CONTRATANTE")
    w.p("A CONTRATANTE obriga-se, mediante a assinatura deste contrato, ao pagamento de {valor_total_fmt} "
        "({valor_total_extenso}) à CONTRATADA, referente aos serviços de {servicos_descricao}, da seguinte "
        "maneira:")
    w.rico([("DA ENTRADA: ", True),
            ("a CONTRATANTE é responsável pelo pagamento de entrada no percentual de {entrada_percentual_fmt} do "
             "valor deste contrato, qual seja, a importância de {entrada_fmt} ({entrada_extenso}), no ato da "
             "assinatura. O valor da entrada será reembolsado se a CONTRATANTE desistir do contrato em até 30 "
             "(trinta) dias de sua assinatura. Após esse prazo, o valor não será restituído, por compensação aos "
             "serviços já prestados e à reserva da data do evento.", False)])
    w.rico([("DO SALDO DEVEDOR: ", True),
            ("o saldo devedor, no valor de {saldo_fmt} ({saldo_extenso}), deverá ser integralizado até "
             "{prazo_quitacao_fmt} dias antes do evento{#tem_vencimento}, ou seja, até {vencimento_saldo}"
             "{/tem_vencimento}{#tem_parcelas}, em {num_parcelas} ({num_parcelas_extenso}) parcelas, conforme "
             "abaixo{/tem_parcelas}. O valor pago do saldo devedor não será devolvido em caso de desistência da "
             "CONTRATANTE, por ser a contraprestação dos serviços prestados e da reserva da data do evento.", False)])
    w.tag("{#parcelas}")
    w.p("    {numero}ª parcela: {valor_fmt} ({valor_extenso}) – vencimento em {vencimento}", depois=0)
    w.tag("{/parcelas}")
    w.rico([("DO ACRÉSCIMO DE CONVIDADOS: ", True),
            ("o valor estabelecido neste contrato é para um evento com até {convidados_fmt} convidados. Caso "
             "ocorra aumento neste quantitativo, será procedido um reajuste de {adicional_fmt} "
             "({adicional_extenso}) a cada 50 (cinquenta) convidados, valor correspondente ao integrante da equipe "
             "que será necessário acrescentar para cumprir a nova demanda. A mudança deverá ser comunicada em até "
             "20 (vinte) dias antes do evento.", False)])
    w.rico([("DO ACRÉSCIMO DE PADRINHOS E CRIANÇAS NO CORTEJO: ", True),
            ("o valor estabelecido neste contrato é para um evento com até {padrinhos_fmt} padrinhos, "
             "{madrinhas_fmt} madrinhas e {criancas_fmt} crianças no cortejo. Caso ocorra aumento neste quantitativo, será "
             "procedido um reajuste de {adicional_fmt} ({adicional_extenso}) a cada 02 (dois) casais de padrinhos "
             "ou 02 (duas) crianças acrescentados, valor correspondente ao integrante da equipe que será "
             "necessário acrescentar. A mudança deverá ser comunicada em até 20 (vinte) dias antes do evento.",
             False)])
    w.rico([("DA MUDANÇA DE DATA: ", True),
            ("na ocorrência de caso fortuito ou de força maior que impeça a realização do evento no dia e hora "
             "marcados, o evento será remarcado de acordo com a disponibilidade da CONTRATADA, sem cobrança de "
             "multa, podendo haver reequilíbrio econômico-financeiro. Não sendo a mudança motivada pelas razões "
             "acima, ela terá um custo de 20% (vinte por cento) do valor total do contrato.", False)])

    # ---- Cláusulas comuns ---------------------------------------------------
    w.titulo("DAS CLÁUSULAS COMUNS A TODOS OS SERVIÇOS")
    comuns = [
        ("DO REPASSE DO CONTRATO",
         "A CONTRATANTE tem a faculdade de, após o período de desistência de 30 (trinta) dias a contar da "
         "assinatura do contrato, efetuar o repasse do contrato, de forma que a CONTRATADA receba o valor total "
         "do contrato até 30 (trinta) dias antes do evento, podendo a CONTRATADA rever a forma de pagamento com "
         "o sucessor do contrato."),
        ("DO SUBSTABELECIMENTO DO CONTRATO",
         "A CONTRATADA detém a faculdade de substabelecer o contrato a qualquer tempo, desde que aponte à "
         "CONTRATANTE três empresas que prestem serviço de cerimonial e assessoria, para que esta escolha aquela "
         "que melhor lhe aprouver, ou que indique a empresa de sua preferência, desde que haja compatibilidade de "
         "valores, uma vez que do substabelecimento não resultará pagamento de novos haveres pela CONTRATANTE."),
        ("DA CESSÃO DO DIREITO DE IMAGEM",
         "A CONTRATANTE autoriza o uso e a veiculação de imagens dos noivos, bem como do evento, em material de "
         "divulgação da CONTRATADA."),
        ("DO ACRÉSCIMO DE SERVIÇOS",
         "A CONTRATADA oferece os serviços de assessoria, cerimonial, supervisão da montagem, finalização do "
         "evento, confirmação de presença dos convidados e assistência da noiva. Em caso de contratação de "
         "serviços além dos ajustados neste contrato, após a sua assinatura, os valores serão reajustados e a "
         "solicitação deverá ser feita em até 30 (trinta) dias antes do evento."),
    ]
    for tit, txt in comuns:
        w.subtitulo(tit)
        w.p(txt)
    w.tag("{#destination}")
    w.subtitulo("DAS CONDIÇÕES ESPECIAIS PARA EVENTOS FORA DA REGIÃO METROPOLITANA DO RECIFE (DESTINATION)")
    w.p("Nos casos em que o evento seja realizado fora da Região Metropolitana do Recife, a equipe de cerimonial "
        "poderá chegar 01 (um) dia antes da data do evento, ficando hospedada em quarto destinado ao staff, "
        "disponibilizado pela CONTRATANTE, a fim de garantir a adequada organização, o acompanhamento da "
        "montagem e a execução dos serviços contratados.")
    w.tag("{/destination}")
    for tit, txt in [
        ("DA PRESENÇA DE CRIANÇAS COM IDADE ENTRE 0 E 07 ANOS",
         "Nos casos em que haja mais de 05 (cinco) crianças com idade entre 0 e 07 anos no evento, fica sob "
         "responsabilidade da CONTRATANTE a contratação de recreadores, babás ou profissionais específicos para "
         "a supervisão e os cuidados das mesmas. A equipe da CONTRATADA estará inteiramente dedicada à execução "
         "dos serviços contratados, não podendo assumir a guarda, o entretenimento ou a segurança das crianças."),
        ("DA PRESENÇA DE PETS NO EVENTO",
         "A presença de pets na cerimônia e/ou recepção é bem-vinda, desde que atendidas condições que garantam o "
         "bem-estar do animal e a harmonia do evento. O cuidado e a supervisão do pet são de responsabilidade "
         "exclusiva dos tutores, sendo recomendada a contratação de um cuidador. Cabe aos contratantes verificar, "
         "com antecedência, se os locais da cerimônia e da recepção permitem a presença de animais. A equipe da "
         "CONTRATADA não se responsabiliza por imprevistos relacionados ao pet, mas colaborará no que for "
         "possível dentro das atribuições do cerimonial."),
        ("DA POSSÍVEL AUSÊNCIA DA PROFISSIONAL TAYNÁ ALVES",
         "Fica esclarecido que a profissional Tayná Alves poderá, em situações excepcionais e devidamente "
         "justificadas, tais como caso fortuito, força maior, doença ou falecimento, não estar presente "
         "fisicamente no evento. Nessa hipótese, a CONTRATADA se compromete a designar, com antecedência mínima "
         "de 60 (sessenta) dias, a equipe responsável pela execução dos serviços, apresentando-a formalmente à "
         "CONTRATANTE, composta por profissionais capacitados e treinados diretamente por Tayná Alves, de modo a "
         "assegurar o mesmo padrão de qualidade pactuado neste contrato."),
        ("DA RESCISÃO UNILATERAL DO CONTRATO",
         "Se da rescisão unilateral do contrato pela CONTRATADA resultar ausência da prestação do serviço, a "
         "CONTRATADA fica obrigada ao pagamento de multa correspondente a 20% (vinte por cento) do valor deste "
         "contrato. Se da rescisão unilateral pela CONTRATANTE não ocorrer o repasse do contrato, de modo que a "
         "CONTRATADA não tenha evento a realizar, será devida pela CONTRATANTE multa correspondente a 20% (vinte "
         "por cento) do valor deste contrato."),
        ("DO FORO",
         "É eleito o foro da {contratada_foro} para dirimir qualquer litígio judicial resultante destes serviços."),
    ]:
        w.subtitulo(tit)
        w.p(txt)

    w.p("")
    w.p("{contratada_cidade} – {contratada_uf}, {data_assinatura_extenso}.", centro=True)
    w.p("")

    tab = doc.add_table(rows=4, cols=2)
    tab.alignment = WD_TABLE_ALIGNMENT.CENTER
    celulas = [
        ("______________________________", "______________________________"),
        ("CONTRATADA\n{contratada_razao_social}", "CONTRATANTE\n{contratante_nome}"),
        ("\n\n______________________________", "\n\n______________________________"),
        ("Testemunha 1 – CPF:", "Testemunha 2 – CPF:"),
    ]
    for i, (a, b) in enumerate(celulas):
        for j, txt in enumerate((a, b)):
            par = tab.cell(i, j).paragraphs[0]
            par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = par.add_run(txt)
            run.bold = i in (1,)

    destino = DIR / "contrato_casamento.docx"
    doc.save(destino)
    print(f"Modelo criado: {destino}")


# =============================================================================
# ORDEM DE SERVIÇO
# =============================================================================
def ordem_servico():
    doc = novo_documento()
    w = Escritor(doc)

    w.p("ORDEM DE SERVIÇO", negrito=True, centro=True, tamanho=16, cor=COR, depois=0)
    w.p("Nº {numero_os}  ·  {linha_nome}", negrito=True, centro=True, tamanho=12, depois=0)
    w.p("{contratada_razao_social} · emitida em {data_assinatura}", centro=True, tamanho=9, depois=12)

    def tabela(titulo, linhas):
        w.titulo(titulo)
        t = doc.add_table(rows=0, cols=2)
        bordas(t)
        for rotulo, valor in linhas:
            c = t.add_row().cells
            c[0].width = Cm(5.5)
            c[1].width = Cm(10.5)
            sombrear(c[0], "F6EEE9")
            r = c[0].paragraphs[0].add_run(rotulo)
            r.bold = True
            r.font.color.rgb = COR
            c[1].paragraphs[0].add_run(valor)

    tabela("CLIENTE", [
        ("Contratante", "{contratante_nome}"),
        ("CPF", "{contratante_cpf}"),
        ("Telefone", "{contratante_telefone}"),
        ("E-mail", "{contratante_email}"),
    ])
    tabela("EVENTO", [
        ("Tipo", "{evento_tipo} de {evento_nomes}"),
        ("Data", "{evento_quando}"),
        ("Horário da cerimônia", "{#tem_horario}{evento_horario}{/tem_horario}{^tem_horario}a definir{/tem_horario}"),
        ("Local", "{evento_local_frase}"),
        ("Tempo estimado", "{#tem_duracao}{evento_duracao_fmt}{#tem_termino} (término às {evento_termino}){/tem_termino}{/tem_duracao}{^tem_duracao}a definir{/tem_duracao}"),
        ("Convidados", "até {convidados_fmt}"),
        ("Padrinhos / madrinhas", "{padrinhos_fmt} padrinhos / {madrinhas_fmt} madrinhas"),
        ("Crianças no cortejo", "{criancas_fmt}"),
        ("Destination", "{#destination}Sim{/destination}{^destination}Não{/destination}"),
    ])

    w.titulo("SERVIÇOS CONTRATADOS")
    t = doc.add_table(rows=2, cols=3)
    bordas(t)
    for j, h in enumerate(["Serviço", "Escopo", "Preço de tabela"]):
        sombrear(t.cell(0, j), "824634")
        r = t.cell(0, j).paragraphs[0].add_run(h)
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for j, v in enumerate(["{#servicos_lista}{nome}", "{descricao}", "{preco_tabela_fmt}{/servicos_lista}"]):
        t.cell(1, j).paragraphs[0].add_run(v)
    w.p("{#tem_cortesia}Cortesia: {cortesia_nomes}.{/tem_cortesia}", tamanho=10)

    tabela("ESCALA DO DIA", [
        ("Equipe", "{equipe_fmt} profissionais (01 coordenador + {assistentes_fmt} {assistentes_palavra})"),
        ("Chegada – supervisão", "{#secao_supervisao}{#tem_horario}{supervisao_chegada}{/tem_horario}{^tem_horario}{supervisao_antecedencia_fmt} h antes{/tem_horario}{/secao_supervisao}{^secao_supervisao}—{/secao_supervisao}"),
        ("Cerimonial", "{#secao_cerimonial}{#tem_horario}{cerimonial_inicio} às {cerimonial_fim}{/tem_horario}{^tem_horario}{cerimonial_horas_fmt} horas{/tem_horario}{/secao_cerimonial}{^secao_cerimonial}—{/secao_cerimonial}"),
        ("Finalização", "{#secao_finalizacao}Sim, até o encerramento{/secao_finalizacao}{^secao_finalizacao}—{/secao_finalizacao}"),
    ])
    tabela("FINANCEIRO", [
        ("Valor do contrato", "{valor_total_fmt}"),
        ("Preço de tabela", "{preco_tabela_fmt}"),
        ("Entrada", "{entrada_fmt} ({entrada_percentual_fmt})"),
        ("Saldo devedor", "{saldo_fmt}"),
        ("Quitação até", "{#tem_vencimento}{vencimento_saldo}{/tem_vencimento}{^tem_vencimento}{prazo_quitacao_fmt} dias antes do evento{/tem_vencimento}"),
    ])
    w.titulo("OBSERVAÇÕES")
    w.p("{#alerta_horas}ATENÇÃO: {alerta_horas}{/alerta_horas}", negrito=True)
    w.p("{observacoes}")
    w.p("")
    w.p("______________________________", centro=True, depois=0)
    w.p("Responsável – {contratada_razao_social}", centro=True)

    destino = DIR / "ordem_servico.docx"
    doc.save(destino)
    print(f"Modelo criado: {destino}")


if __name__ == "__main__":
    DIR.mkdir(parents=True, exist_ok=True)
    contrato()
    ordem_servico()

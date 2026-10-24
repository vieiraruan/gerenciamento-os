"""
Gera um modelo .docx de EXEMPLO com os campos {placeholder} usados pelo gerador.
Os modelos reais da empresa devem substituir este arquivo em templates/.

Uso: python3 scripts/criar_modelo_exemplo.py
"""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

SAIDA = Path(__file__).resolve().parent.parent / "templates" / "assessoria_completa.docx"

doc = Document()
estilo = doc.styles["Normal"]
estilo.font.name = "Calibri"
estilo.font.size = Pt(11)


def par(texto, negrito=False, centro=False):
    p = doc.add_paragraph()
    run = p.add_run(texto)  # um run por parágrafo mantém os {campos} intactos
    run.bold = negrito
    if centro:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return p


par("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA DE EVENTOS", negrito=True, centro=True)
par("")
par("CONTRATADA: {contratada_razao_social}, inscrita no CNPJ sob o nº {contratada_cnpj}, "
    "com sede em {contratada_endereco}, neste ato representada por {contratada_representante}.")
par("CONTRATANTE: {contratante_nome}, CPF nº {contratante_cpf}, residente em "
    "{contratante_endereco}, telefone {contratante_telefone}, e-mail {contratante_email}.")
par("")
par("CLÁUSULA 1ª – DO OBJETO", negrito=True)
par("O presente contrato tem por objeto a prestação de serviços de assessoria completa para o "
    "evento {evento_tipo}, a ser realizado em {evento_data_extenso}, no local {evento_local}, "
    "com estimativa de {evento_convidados} convidados.")
par("")
par("CLÁUSULA 2ª – DO VALOR E FORMA DE PAGAMENTO", negrito=True)
par("Pelos serviços contratados, a CONTRATANTE pagará o valor total de {valor_total_fmt} "
    "({valor_total_extenso}), da seguinte forma:")
par("a) Entrada de {entrada_fmt} ({entrada_extenso}), paga na assinatura deste contrato;")
par("{#tem_parcelas}b) Saldo de {saldo_fmt} ({saldo_extenso}) em {num_parcelas} "
    "({num_parcelas_extenso}) parcelas mensais, conforme abaixo:{/tem_parcelas}")
par("{#parcelas}")
par("    {numero}ª parcela: {valor_fmt} – vencimento em {vencimento}")
par("{/parcelas}")
par("Forma de pagamento: {forma_pagamento}. Chave PIX da CONTRATADA: {contratada_pix}.")
par("")
par("CLÁUSULA 3ª – DAS OBRIGAÇÕES", negrito=True)
par("{observacoes}")
par("")
par("{contratada_cidade}, {data_assinatura_extenso}.", centro=True)
par("")
par("_______________________________                _______________________________", centro=True)
par("{contratada_razao_social}                                    {contratante_nome}", centro=True)

SAIDA.parent.mkdir(parents=True, exist_ok=True)
doc.save(SAIDA)
print(f"Modelo criado: {SAIDA}")

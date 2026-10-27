"""
Gera templates/planilha_financeira.xlsx — a planilha financeira de cada evento.

Abas:
  RESUMO        dados do evento (preenchidos pelo sistema), orçamento e totais
  FORNECEDORES  um contrato por linha; entrada, saldo, parcela, pago, a pagar,
                status e próximo vencimento calculados por fórmula
  PAGAMENTOS    lançamento de cada pagamento (data, fornecedor, valor, comprovante);
                o "total pago" de cada fornecedor vem daqui
  LISTAS        opções das caixas de seleção

Convenção de cores:  azul = preenchido pelo sistema · amarelo = preencher · preto = fórmula

O gerador (src/planilha.js) preenche as células listadas em CELULAS abaixo.
Uso: python3 scripts/criar_planilha.py
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

DESTINO = Path(__file__).resolve().parent.parent / "templates" / "planilha_financeira.xlsx"

MARCA = "824634"
CREME = "F6EEE9"
AMARELO = PatternFill("solid", fgColor="FFF4C2")
FUNDO_CAB = PatternFill("solid", fgColor=MARCA)
FUNDO_CREME = PatternFill("solid", fgColor=CREME)
FONTE = "Arial"
F = lambda **k: Font(name=FONTE, size=k.pop("size", 10), **k)
AZUL = F(color="1F4FBF")
BORDA = Border(*(Side(style="thin", color="E6D3CA"),) * 4)
MOEDA = 'R$ #,##0.00;[Red]-R$ #,##0.00;"-"'
DATA = "DD/MM/YYYY"
PCT = '0%;-0%;"-"'

N_FORN = 50     # linhas de fornecedores
N_PAG = 200     # linhas de pagamentos
L0_F = 5        # primeira linha de dados em FORNECEDORES
L0_P = 5        # primeira linha de dados em PAGAMENTOS
LF = L0_F + N_FORN - 1
LP = L0_P + N_PAG - 1

CATEGORIAS = [
    "001 - Assessoria", "002 - Local", "003 - Buffet", "004 - Drinks", "005 - Bandas", "006 - Foto e filme",
    "007 - Som e estrutura", "008 - Gerador", "009 - Celebrante", "010 - Vestido", "011 - Cabelo e make",
    "012 - Iluminação", "013 - Bolo", "014 - Doces", "015 - Chopp", "016 - Bem casados", "017 - Cadeiras",
    "018 - Cobertas / grid", "019 - Foto lembrança", "020 - Mesa buffet", "021 - Decoração", "099 - Outros",
]
TIPOS = ["Entrada", "Parcela", "Quitação", "Adicional", "Outro"]
MEIOS = ["PIX", "Transferência", "Boleto", "Cartão", "Dinheiro"]


def titulo(ws, texto, sub):
    ws["B1"] = texto
    ws["B1"].font = F(size=16, bold=True, color=MARCA)
    ws["B2"] = sub
    ws["B2"].font = F(size=9, italic=True, color="7B6F6A")
    ws.sheet_view.showGridLines = False


def cabecalho(ws, linha, colunas, larguras):
    for i, (txt, larg) in enumerate(zip(colunas, larguras), start=1):
        c = ws.cell(row=linha, column=i, value=txt)
        c.font = F(bold=True, color="FFFFFF")
        c.fill = FUNDO_CAB
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDA
        ws.column_dimensions[get_column_letter(i)].width = larg
    ws.row_dimensions[linha].height = 32


def listas(wb):
    ws = wb.create_sheet("LISTAS")
    titulo(ws, "Listas", "Opções das caixas de seleção. Pode acrescentar itens no fim de cada coluna.")
    for col, (nome, itens) in enumerate([("Categorias", CATEGORIAS), ("Tipos de pagamento", TIPOS),
                                         ("Meios de pagamento", MEIOS)], start=2):
        c = ws.cell(row=4, column=col, value=nome)
        c.font = F(bold=True, color="FFFFFF")
        c.fill = FUNDO_CAB
        ws.column_dimensions[get_column_letter(col)].width = 28
        for i, v in enumerate(itens, start=5):
            ws.cell(row=i, column=col, value=v).font = F()
    ws.column_dimensions["A"].width = 2
    return ws


def fornecedores(wb):
    ws = wb.create_sheet("FORNECEDORES")
    titulo(ws, "Fornecedores e contratos",
           "Preencha as colunas amarelas. Entrada, parcela, pago, a pagar, status e próximo vencimento são "
           "calculados. Pagamentos são lançados na aba PAGAMENTOS.")
    cols = ["ID", "Categoria", "Fornecedor", "Serviço / descrição", "Valor contratado", "% entrada",
            "Valor da entrada", "Vencimento da entrada", "Nº de parcelas do saldo", "1º vencimento do saldo",
            "Valor da parcela", "Total pago", "A pagar", "Status", "Próximo vencimento", "Chave PIX",
            "Contato", "Observações"]
    larg = [6, 20, 26, 34, 15, 9, 15, 13, 11, 13, 14, 14, 14, 14, 13, 24, 20, 30]
    cabecalho(ws, 4, cols, larg)
    ws.column_dimensions["A"].width = 6

    for r in range(L0_F, LF + 1):
        ws.cell(row=r, column=1, value=f"{r - L0_F + 1:03d}").font = F(bold=True, color=MARCA)
        f = {
            7: f'=IF(E{r}="","",E{r}*F{r})',
            11: f'=IF(E{r}="","",IF(N(I{r})>0,(E{r}-G{r})/I{r},E{r}-G{r}))',
            12: f'=IF(E{r}="","",SUMIFS(PAGAMENTOS!$E${L0_P}:$E${LP},PAGAMENTOS!$B${L0_P}:$B${LP},A{r}))',
            13: f'=IF(E{r}="","",E{r}-L{r})',
            14: f'=IF(E{r}="","",IF(M{r}<=0.005,"QUITADO",IF(L{r}=0,"A PAGAR","EM ANDAMENTO")))',
            # próximo vencimento: entrada enquanto ela não estiver paga; depois, a parcela seguinte
            15: (f'=IF(OR(E{r}="",N(M{r})<=0.005),"",IF(L{r}+0.005<G{r},IF(H{r}="","",H{r}),'
                 f'IF(J{r}="","",IF(N(K{r})<=0,J{r},EDATE(J{r},INT((L{r}-G{r}+0.005)/K{r}))))))'),
        }
        for col in range(2, 19):
            c = ws.cell(row=r, column=col)
            c.border = BORDA
            c.font = F()
            if col in f:
                c.value = f[col]
            elif col in (2, 3, 4, 5, 6, 8, 9, 10, 16, 17, 18):
                c.fill = AMARELO
        for col in (5, 7, 11, 12, 13):
            ws.cell(row=r, column=col).number_format = MOEDA
        ws.cell(row=r, column=6).number_format = PCT
        for col in (8, 10, 15):
            ws.cell(row=r, column=col).number_format = DATA
        ws.cell(row=r, column=14).alignment = Alignment(horizontal="center")

    tot = LF + 1
    ws.cell(row=tot, column=4, value="TOTAL").font = F(bold=True)
    for col in (5, 7, 12, 13):
        L = get_column_letter(col)
        c = ws.cell(row=tot, column=col, value=f"=SUM({L}{L0_F}:{L}{LF})")
        c.font = F(bold=True)
        c.number_format = MOEDA
        c.fill = FUNDO_CREME
    ws.freeze_panes = f"D{L0_F}"

    dv = DataValidation(type="list", formula1=f"=LISTAS!$B$5:$B${4 + len(CATEGORIAS) + 20}", allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"B{L0_F}:B{LF}")
    pct = DataValidation(type="decimal", operator="between", formula1="0", formula2="1", allow_blank=True,
                         error="Use percentual entre 0% e 100% (ex.: 30%).", showErrorMessage=True)
    ws.add_data_validation(pct)
    pct.add(f"F{L0_F}:F{LF}")

    rng = f"N{L0_F}:N{LF}"
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"QUITADO"'],
                                                  font=Font(color="2F7A4F", bold=True),
                                                  fill=PatternFill("solid", fgColor="E6F2EA")))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"EM ANDAMENTO"'],
                                                  font=Font(color="8A5A00", bold=True),
                                                  fill=PatternFill("solid", fgColor="FFF4D6")))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"A PAGAR"'],
                                                  font=Font(color="B3261E", bold=True)))
    # vencido: data passada e ainda há valor a pagar
    ws.conditional_formatting.add(f"O{L0_F}:O{LF}", FormulaRule(
        formula=[f'AND(ISNUMBER(O{L0_F}),O{L0_F}<TODAY(),N(M{L0_F})>0.005)'],
        font=Font(color="FFFFFF", bold=True), fill=PatternFill("solid", fgColor="B3261E")))
    return ws


def pagamentos(wb):
    ws = wb.create_sheet("PAGAMENTOS")
    titulo(ws, "Pagamentos realizados",
           "Um lançamento por pagamento. Escolha o ID do fornecedor (aba FORNECEDORES); o nome aparece sozinho. "
           "Anote o nome do arquivo do comprovante salvo na pasta do fornecedor.")
    cols = ["Data", "ID do fornecedor", "Fornecedor", "Tipo", "Valor pago", "Meio", "Comprovante (arquivo)",
            "Observações"]
    cabecalho(ws, 4, cols, [13, 11, 30, 13, 15, 15, 34, 34])
    for r in range(L0_P, LP + 1):
        for col in range(1, 9):
            c = ws.cell(row=r, column=col)
            c.border = BORDA
            c.font = F()
            if col != 3:
                c.fill = AMARELO
        ws.cell(row=r, column=1).number_format = DATA
        ws.cell(row=r, column=5).number_format = MOEDA
        ws.cell(row=r, column=3).value = (
            f'=IF(B{r}="","",IFERROR(INDEX(FORNECEDORES!$C${L0_F}:$C${LF},'
            f'MATCH(B{r},FORNECEDORES!$A${L0_F}:$A${LF},0)),"ID não encontrado"))')
    tot = LP + 1
    ws.cell(row=tot, column=4, value="TOTAL").font = F(bold=True)
    c = ws.cell(row=tot, column=5, value=f"=SUM(E{L0_P}:E{LP})")
    c.font = F(bold=True)
    c.number_format = MOEDA
    ws.freeze_panes = f"A{L0_P}"
    for faixa, origem in [(f"B{L0_P}:B{LP}", f"=FORNECEDORES!$A${L0_F}:$A${LF}"),
                          (f"D{L0_P}:D{LP}", "=LISTAS!$C$5:$C$20"),
                          (f"F{L0_P}:F{LP}", "=LISTAS!$D$5:$D$20")]:
        dv = DataValidation(type="list", formula1=origem, allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(faixa)
    return ws


# Células do RESUMO preenchidas pelo sistema (src/planilha.js usa os mesmos endereços)
CELULAS = {
    "C5": "Evento", "C6": "Contrato nº", "C7": "Contratante", "C8": "Data do evento",
    "C9": "Local", "C10": "Convidados", "C11": "Serviços da assessoria",
}


def resumo(wb):
    ws = wb.active
    ws.title = "RESUMO"
    titulo(ws, "Planilha financeira do evento", "Tayná Alves Assessoria e Produção")
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 44
    ws.column_dimensions["D"].width = 4
    ws.column_dimensions["E"].width = 44

    ws["B4"] = "EVENTO"
    ws["B4"].font = F(bold=True, color=MARCA)
    for cel, rot in CELULAS.items():
        r = int(cel[1:])
        ws[f"B{r}"] = rot
        ws[f"B{r}"].font = F(bold=True)
        ws[f"B{r}"].fill = FUNDO_CREME
        ws[cel].font = AZUL
        ws[cel].border = BORDA
        ws[f"B{r}"].border = BORDA
    ws["C8"].number_format = DATA
    ws["C11"].alignment = Alignment(wrap_text=True, vertical="top")

    ws["B13"] = "ORÇAMENTO E TOTAIS"
    ws["B13"].font = F(bold=True, color=MARCA)
    linhas = [
        ("Orçamento previsto (teto)", None),
        ("Total contratado", f"=FORNECEDORES!E{LF + 1}"),
        ("Total pago", f"=PAGAMENTOS!E{LP + 1}"),
        ("Total a pagar", "=C15-C16"),
        ("% pago", '=IF(C15>0,C16/C15,"")'),
        ("Saldo do orçamento", '=IF(C14="","",C14-C15)'),
        ("Fornecedores contratados", f'=COUNTIF(FORNECEDORES!E{L0_F}:E{LF},">0")'),
        ("Fornecedores quitados", f'=COUNTIF(FORNECEDORES!N{L0_F}:N{LF},"QUITADO")'),
        ("Pagamentos vencidos", f'=SUMPRODUCT((FORNECEDORES!O{L0_F}:O{LF}<>"")*(FORNECEDORES!O{L0_F}:O{LF}<TODAY())*(FORNECEDORES!M{L0_F}:M{LF}>0.005))'),
        ("Próximo vencimento", f'=IF(COUNT(FORNECEDORES!O{L0_F}:O{LF})=0,"",MIN(FORNECEDORES!O{L0_F}:O{LF}))'),
    ]
    for i, (rot, form) in enumerate(linhas, start=14):
        ws[f"B{i}"] = rot
        ws[f"B{i}"].font = F(bold=True)
        ws[f"B{i}"].fill = FUNDO_CREME
        ws[f"B{i}"].border = BORDA
        c = ws[f"C{i}"]
        c.border = BORDA
        c.font = F(bold=rot in ("Total a pagar",))
        if form:
            c.value = form
        else:
            c.fill = AMARELO
        c.number_format = MOEDA
    ws["C18"].number_format = PCT
    for r in (20, 21, 22):
        ws[f"C{r}"].number_format = "0"
    ws["C23"].number_format = DATA
    ws.conditional_formatting.add("C19", CellIsRule(operator="lessThan", formula=["0"],
                                                    font=Font(color="B3261E", bold=True)))
    ws.conditional_formatting.add("C22", CellIsRule(operator="greaterThan", formula=["0"],
                                                    font=Font(color="FFFFFF", bold=True),
                                                    fill=PatternFill("solid", fgColor="B3261E")))

    # legenda
    ws["E4"] = "COMO USAR"
    ws["E4"].font = F(bold=True, color=MARCA)
    leg = [
        ("Azul", "preenchido pelo sistema ao gerar o contrato", AZUL, None),
        ("Amarelo", "preencha você", F(), AMARELO),
        ("Preto", "fórmula — não editar", F(), None),
        ("1.", "Cadastre cada fornecedor na aba FORNECEDORES.", F(), None),
        ("2.", "Lance cada pagamento na aba PAGAMENTOS.", F(), None),
        ("3.", "Totais, status e vencimentos se atualizam sozinhos.", F(), None),
    ]
    for i, (a, b, fonte, fundo) in enumerate(leg, start=5):
        c = ws[f"E{i}"]
        c.value = f"{a} {b}" if a.endswith(".") else f"{a}: {b}"
        c.font = fonte
        if fundo:
            c.fill = fundo
    return ws


def main():
    wb = Workbook()
    resumo(wb)
    fornecedores(wb)
    pagamentos(wb)
    listas(wb)
    for ws in wb.worksheets:
        ws.sheet_properties.tabColor = MARCA if ws.title != "LISTAS" else "C9B2A6"
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    wb.save(DESTINO)
    print(f"Modelo criado: {DESTINO}")


if __name__ == "__main__":
    main()

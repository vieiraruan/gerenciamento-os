"""
Gera templates/planilha_assessoria.xlsx a partir de uma planilha de assessoria real
(modelo da empresa), limpando os dados do casal e marcando as células que o sistema
preenche com {{CAMPO}}. Formatação, logo, listas (aba Botões), checklist e fórmulas
são mantidos como no modelo.

Uso: python3 scripts/criar_planilha_assessoria.py "NOVA PLANILHA DE ASSESSORIA <casal>.xlsx"
"""
import sys
from pathlib import Path

from openpyxl import load_workbook

DESTINO = Path(__file__).resolve().parent.parent / "templates" / "planilha_assessoria.xlsx"


def main(origem):
    wb = load_workbook(origem)

    # ---- ASSESSORIA: dados do evento + checklist -----------------------------
    a = wb["ASSESSORIA"]
    a["B3"] = "{{NOIVOS}}"
    a["B4"] = "{{DATA}}"
    a["C5"] = "{{CONVIDADOS}}"
    a["E5"] = "{{PADRINHOS}}"
    a["G5"] = "{{CRIANCAS}}"
    a["C6"] = "{{LOCAL}}"
    a["C7"] = "{{HORARIO}}"
    ultima = max(r for r in range(1, 400) if a.cell(row=r, column=3).value)
    for r in range(11, ultima + 1):
        if a.cell(row=r, column=2).value in (None, ""):
            continue  # linha de fase ("12 MESES" etc.)
        for c in range(4, 9):  # STATUS, OBSERVAÇÕES, ESTIMATIVA, VALOR FINAL, FORNECEDOR
            a.cell(row=r, column=c).value = None

    # ---- FINANCEIRO: limpa fornecedores, mantém fórmulas e totais -------------
    f = wb["FINANCEIRO"]
    tot = next(r for r in range(4, 200) if str(f.cell(row=r, column=2).value or "").upper().startswith("TOTAL"))
    for r in range(4, tot):
        for c in range(2, 17):
            v = f.cell(row=r, column=c).value
            if not (isinstance(v, str) and v.startswith("=")):
                f.cell(row=r, column=c).value = None
    for col in "BCDEFIJNOP":
        f[f"{col}4"] = "{{F_" + col + "}}"

    # ---- FINANCEIRO 1 e Lista de Convidados: só dados (mantém fórmulas) -------
    for nome, (r0, c0, c1) in {"FINANCEIRO 1": (4, 2, 27), "Lista de Convidados": (2, 2, 36)}.items():
        ws = wb[nome]
        for r in range(r0, ws.max_row + 1):
            for c in range(c0, c1 + 1):
                v = ws.cell(row=r, column=c).value
                if v is not None and not (isinstance(v, str) and v.startswith("=")) and not isinstance(v, bool):
                    ws.cell(row=r, column=c).value = None

    wb.calculation.fullCalcOnLoad = True
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    wb.save(DESTINO)
    print(f"Modelo criado: {DESTINO} (checklist até a linha {ultima}, totais do financeiro na linha {tot})")


if __name__ == "__main__":
    main(sys.argv[1])

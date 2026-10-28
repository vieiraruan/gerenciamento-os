#!/usr/bin/env python3
"""Monta o instalar-sistema.cmd (arquivo único) a partir de instalador.ps1 + logo/ícone embutidos.

Uso:  python3 scripts/instalador/montar.py
"""
import base64, io, pathlib
from PIL import Image

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
MARCA = RAIZ / 'apps/contract-generator/templates/marca'

def b64png(caminho, largura, modo):
    im = Image.open(caminho).convert(modo)
    im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode()

CABECALHO = r'''<# : -------------------------------------------------------------------------
@echo off
rem ===========================================================================
rem  Instalador / atualizador do sistema Tayna Alves Assessoria
rem
rem  Arquivo unico: copie para qualquer computador Windows e de dois cliques.
rem  Abre uma janela que mostra cada etapa: instala o que faltar (Git, Node.js,
rem  LibreOffice, Google Drive), baixa o projeto do GitHub, instala as
rem  dependencias e cria o atalho. Rodar de novo = atualizar.
rem
rem  Opcoes: [-Destino C:\pasta] [-SemPdf] [-SemDrive] [-SemInterface]
rem  (-SemInterface roda no modo texto, nesta janela)
rem
rem  NAO EDITE AQUI: gerado por scripts\instalador\montar.py a partir de
rem  scripts\instalador\instalador.ps1
rem ===========================================================================
setlocal
set "INSTALADOR=%~f0"
echo.%* | findstr /i /c:"-SemInterface" >nul && goto :texto
start "" powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -Command "& ([scriptblock]::Create([IO.File]::ReadAllText($env:INSTALADOR))) %*"
exit /b 0
:texto
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create([IO.File]::ReadAllText($env:INSTALADOR))) %*"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
#>
'''

ps = (AQUI / 'instalador.ps1').read_text(encoding='utf-8')
ps = ps.replace('__LOGO__', b64png(MARCA / 'logo.png', 200, 'RGB'))
ps = ps.replace('__ICONE__', b64png(MARCA / 'icone.png', 48, 'RGBA'))
saida = (CABECALHO + ps).replace('\r\n', '\n').replace('\n', '\r\n')
(RAIZ / 'instalar-sistema.cmd').write_bytes(saida.encode('utf-8'))  # UTF-8 sem BOM
print('instalar-sistema.cmd gerado:', len(saida), 'caracteres')

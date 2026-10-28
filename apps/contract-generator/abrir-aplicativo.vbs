' ============================================================
'  Abre os aplicativos da Tayna Alves Assessoria em segundo plano,
'  sem janela preta. E o alvo do atalho da Area de Trabalho.
'  Mensagens ficam em %LOCALAPPDATA%\TaynaAlves\aplicativo.log
'  Para encerrar: botao "Encerrar" na tela inicial do aplicativo.
' ============================================================
Option Explicit
Dim sh, fso, pasta, logDir, logArq, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Ja esta aberto? So abre o navegador.
If JaAberto() Then
  sh.Run "http://localhost:3210/", 1, False
  WScript.Quit 0
End If

pasta = fso.GetParentFolderName(WScript.ScriptFullName)
logDir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\TaynaAlves"
If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir
logArq = logDir & "\aplicativo.log"

' 0 = janela escondida; True = espera terminar (para avisar se der erro)
rc = sh.Run("cmd /c """"" & pasta & "\abrir-aplicativo.cmd"" --oculto > """ & logArq & """ 2>&1""", 0, True)

If rc <> 0 Then
  If MsgBox("O aplicativo nao abriu ou foi encerrado com erro (codigo " & rc & ")." & vbCrLf & vbCrLf & _
            "Deseja ver o registro?", vbExclamation + vbYesNo, "Tayna Alves Assessoria") = vbYes Then
    sh.Run "notepad.exe """ & logArq & """", 1, False
  End If
End If

Function JaAberto()
  On Error Resume Next
  Dim h
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  h.setTimeouts 1000, 1000, 1000, 1000
  h.open "GET", "http://127.0.0.1:3210/api/config", False
  h.send
  JaAberto = (Err.Number = 0 And h.status = 200)
  Err.Clear
End Function

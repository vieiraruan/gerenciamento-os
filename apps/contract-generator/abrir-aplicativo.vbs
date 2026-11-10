' ============================================================
'  Abre o Lotus (sistema da Tayna Alves Assessoria) em segundo plano,
'  sem janela preta. E o alvo do atalho da Area de Trabalho.
'  Mensagens ficam em %LOCALAPPDATA%\TaynaAlves\aplicativo.log
'  Para encerrar: botao "Encerrar" na tela inicial do aplicativo.
'  Atualizacao: ao abrir pelo atalho, busca a versao nova no GitHub (mesmo com o Lotus ja aberto).
' ============================================================
Option Explicit
Dim sh, fso, pasta, logDir, logArq, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

pasta = fso.GetParentFolderName(WScript.ScriptFullName)

' Ja esta aberto? Se esta na versao do disco e nao ha versao nova no GitHub, so abre o navegador.
' Senao (codigo atualizado depois que ele abriu, ou novidade no GitHub), encerra e abre de novo:
' o abrir-aplicativo.cmd baixa a atualizacao antes de iniciar.
If JaAberto() Then
  If (VersaoRodando() = "" Or VersaoRodando() = VersaoDisco()) And Not HaAtualizacao() Then
    sh.Run "http://localhost:3210/", 1, False
    WScript.Quit 0
  End If
  Encerrar
End If
logDir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\TaynaAlves"
If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir
logArq = logDir & "\aplicativo.log"

' 0 = janela escondida; True = espera terminar (para avisar se der erro)
rc = sh.Run("cmd /c """"" & pasta & "\abrir-aplicativo.cmd"" --oculto > """ & logArq & """ 2>&1""", 0, True)

If rc <> 0 Then
  If MsgBox("O aplicativo nao abriu ou foi encerrado com erro (codigo " & rc & ")." & vbCrLf & vbCrLf & _
            "Deseja ver o registro?", vbExclamation + vbYesNo, "Lotus") = vbYes Then
    sh.Run "notepad.exe """ & logArq & """", 1, False
  End If
End If

' Ha versao nova no GitHub? (git fetch rapido; sem internet ou com arquivos alterados: nao)
Function HaAtualizacao()
  On Error Resume Next
  Dim raiz, tmp, rc, f, up, sujo
  HaAtualizacao = False
  raiz = fso.GetParentFolderName(fso.GetParentFolderName(pasta))
  tmp = sh.ExpandEnvironmentStrings("%TEMP%") & "\lotus-atualizacao.txt"
  If fso.FileExists(tmp) Then fso.DeleteFile tmp
  sh.Environment("PROCESS")("GIT_TERMINAL_PROMPT") = "0"
  sh.Environment("PROCESS")("GCM_INTERACTIVE") = "never"
  rc = sh.Run("cmd /c git -C """ & raiz & """ -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=8 fetch -q && git -C """ & raiz & _
              """ rev-parse @{u} > """ & tmp & """ && git -C """ & raiz & """ status --porcelain --untracked-files=no >> """ & tmp & """", 0, True)
  If rc <> 0 Or Not fso.FileExists(tmp) Then Exit Function
  Set f = fso.OpenTextFile(tmp, 1)
  up = Trim(f.ReadLine)
  sujo = Not f.AtEndOfStream
  f.Close
  fso.DeleteFile tmp
  If sujo Then Exit Function
  HaAtualizacao = (Len(up) = 40 And up <> VersaoDisco())
  Err.Clear
End Function

Function VersaoRodando()
  On Error Resume Next
  Dim h, t, i
  VersaoRodando = ""
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  h.setTimeouts 1000, 1000, 1000, 1000
  h.open "GET", "http://127.0.0.1:3210/saude", False
  h.send
  If Err.Number <> 0 Then
    Err.Clear
    Exit Function
  End If
  t = h.responseText
  i = InStr(t, """versao"":""")
  If i > 0 Then VersaoRodando = Mid(t, i + 10, 40)
  ' servidor antigo (sem versao): considera desatualizado
  If i = 0 And h.status = 200 Then VersaoRodando = "antiga"
  Err.Clear
End Function

Function VersaoDisco()
  On Error Resume Next
  Dim git, head, ref
  VersaoDisco = ""
  git = fso.GetParentFolderName(fso.GetParentFolderName(pasta)) & "\.git"
  head = Trim(fso.OpenTextFile(git & "\HEAD", 1).ReadLine)
  If Left(head, 4) = "ref:" Then
    ref = Replace(Trim(Mid(head, 5)), "/", "\")
    If fso.FileExists(git & "\" & ref) Then VersaoDisco = Left(Trim(fso.OpenTextFile(git & "\" & ref, 1).ReadLine), 40)
  Else
    VersaoDisco = Left(head, 40)
  End If
  ' sem como ler a versao do disco: nao reinicia
  If VersaoDisco = "" Then VersaoDisco = VersaoRodando()
  Err.Clear
End Function

Sub Encerrar()
  On Error Resume Next
  Dim h, n
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  h.setTimeouts 2000, 2000, 2000, 2000
  h.open "POST", "http://127.0.0.1:3210/api/encerrar", False
  h.setRequestHeader "Content-Type", "application/json"
  h.send "{}"
  Err.Clear
  For n = 1 To 20
    WScript.Sleep 500
    If Not JaAberto() Then Exit For
  Next
End Sub

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

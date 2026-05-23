Set WshShell = WScript.CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")

scriptDir = oFSO.GetParentFolderName(WScript.ScriptFullName)
projectDir = oFSO.GetParentFolderName(scriptDir)
startBat = scriptDir & "\start.bat"

If Not oFSO.FileExists(startBat) Then
    MsgBox "找不到 start.bat，请确保此脚本在 scripts 目录中。", vbCritical, "错误"
    WScript.Quit
End If

desktop = WshShell.SpecialFolders("Desktop")
linkFile = desktop & "\SpeakUp AI.lnk"

Set oLink = WshShell.CreateShortcut(linkFile)
oLink.TargetPath = startBat
oLink.WorkingDirectory = scriptDir
oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll, 14"
oLink.Description = "SpeakUp AI - 社交成长教练"
oLink.WindowStyle = 7 ' Minimized
oLink.Save

MsgBox "桌面快捷方式已创建！" & vbCrLf & vbCrLf & "双击 'SpeakUp AI' 图标即可启动。", vbInformation, "完成"

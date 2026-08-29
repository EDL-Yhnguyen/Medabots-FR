# Pilotage de la fenêtre mGBA : capture d'écran et envoi de touches.
#
#   powershell -File outils/fenetre.ps1 -Action capture -Fichier travail/ecran.png
#   powershell -File outils/fenetre.ps1 -Action touches -Touches "ENTER,x,x,x" -Maintien 120
#
# mGBA (Qt) mappe par défaut : A = X, B = Z, Start = Entrée, Select = Retour
# arrière, croix directionnelle = flèches. Une touche doit être MAINTENUE plus
# d'une image (16 ms) pour que le jeu la voie.

param(
  [string]$Action = 'capture',
  [string]$Fichier = 'travail/ecran.png',
  [string]$Touches = '',
  [int]$Maintien = 120,
  [int]$Pause = 400
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint a, uint b, IntPtr c, uint d);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$proc = Get-Process | Where-Object { $_.ProcessName -match 'mgba' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Output 'ERREUR: aucune fenetre mGBA'; exit 1 }
$h = $proc.MainWindowHandle

# PASSER AU PREMIER PLAN, VRAIMENT.
#
# SetForegroundWindow seul ECHOUE en silence : Windows refuse qu'un processus
# sans focus en vole a celui qui l'a. Il rend $false, la fenetre reste derriere,
# et la suite part de travers sans un mot — les touches vont au terminal, et la
# capture, qui lit l'ECRAN a la position de la fenetre, photographie ce qui se
# trouve par-dessus. C'est arrive deux fois de suite le 25/08 : deux captures du
# terminal Claude prises pour des captures du jeu.
#
# La parade tient a TROIS gestes, et AttachThreadInput seul NE SUFFIT PAS : le
# 29/08, avec deux terminaux ouverts, il rendait encore la fenetre en arriere-plan.
#
#  1. SPI_SETFOREGROUNDLOCKTIMEOUT a 0 leve le delai pendant lequel Windows
#     refuse tout changement de premier plan apres une action de l'utilisateur.
#  2. Une frappe a vide fait passer CE processus pour celui qui vient de recevoir
#     une entree utilisateur — c'est le critere qu'applique Windows pour decider
#     qui a le droit de donner le focus.
#  3. AttachThreadInput rattache notre file d'entree a celle de la fenetre visee.
#
# LA TOUCHE DU POINT 2 EST F24, ET SUREMENT PAS ALT. Avec ALT, le focus etait
# bien pris — mais ALT ouvre la barre de menu de Qt, et TOUTES les touches
# envoyees ensuite allaient au menu au lieu du jeu. Le symptome est muet : le
# script annonce « touches envoyees », et l'ecran-titre ne bouge pas. Le seul
# indice etait le « F » de Fichier souligne sur la capture. F24 n'existe sur
# aucun clavier physique et aucune application n'y reagit.
#
# Et on VERIFIE, parce qu'un echec silencieux est pire qu'une erreur.
[void][Win32]::SystemParametersInfo(0x2001, 0, [IntPtr]::Zero, 3)  # SPI_SETFOREGROUNDLOCKTIMEOUT
[void][Win32]::ShowWindow($h, 9)   # SW_RESTORE
$moi = [Win32]::GetCurrentThreadId()
$lui = [Win32]::GetWindowThreadProcessId($h, [IntPtr]::Zero)
[void][Win32]::AttachThreadInput($moi, $lui, $true)
[Win32]::keybd_event(0x87, 0, 0, [UIntPtr]::Zero)   # F24 enfoncee
[Win32]::keybd_event(0x87, 0, 2, [UIntPtr]::Zero)   # F24 relachee
[void][Win32]::BringWindowToTop($h)
[void][Win32]::SetForegroundWindow($h)
[void][Win32]::AttachThreadInput($moi, $lui, $false)
Start-Sleep -Milliseconds 500
if ([Win32]::GetForegroundWindow() -ne $h) {
  Write-Output 'ERREUR: la fenetre mGBA n est PAS au premier plan. Capture et touches seraient fausses.'
  exit 2
}

if ($Action -eq 'capture') {
  $r = New-Object Win32+RECT
  [void][Win32]::GetWindowRect($h, [ref]$r)
  $l = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap $l, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $bmp.Save($Fichier, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "capture $l x $ht -> $Fichier"
}
elseif ($Action -eq 'touches') {
  $codes = @{
    'ENTER' = 0x0D; 'BACK' = 0x08; 'UP' = 0x26; 'DOWN' = 0x28; 'LEFT' = 0x25; 'RIGHT' = 0x27
    'x' = 0x58; 'z' = 0x5A; 'a' = 0x41; 's' = 0x53
  }
  foreach ($t in $Touches.Split(',')) {
    $t = $t.Trim()
    if (-not $codes.ContainsKey($t)) { Write-Output "touche inconnue: $t"; continue }
    $vk = [byte]$codes[$t]
    [Win32]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds $Maintien
    [Win32]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)   # KEYEVENTF_KEYUP
    Start-Sleep -Milliseconds $Pause
  }
  Write-Output "touches envoyees: $Touches"
}

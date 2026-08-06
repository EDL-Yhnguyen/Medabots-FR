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
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$proc = Get-Process | Where-Object { $_.ProcessName -match 'mgba' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Output 'ERREUR: aucune fenetre mGBA'; exit 1 }
$h = $proc.MainWindowHandle

[void][Win32]::ShowWindow($h, 9)   # SW_RESTORE
[void][Win32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 400

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

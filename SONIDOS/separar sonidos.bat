<# :
@echo off
powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "Invoke-Command -ScriptBlock ([Scriptblock]::Create((Get-Content -Path '%~f0' -Raw)))"
pause
exit /b
#>

# ==============================================================================
# SCRIPT PARA SEPARAR NOTAS (VERSIÓN CORREGIDA SINTAXIS)
# ==============================================================================

# 1. Configuración de Rutas
$rutaDirectorio = "D:\PROYECTOS IA\ESCALAS\SONIDOS\C4 A C6 pad piano"
$archivoEntrada = Join-Path $rutaDirectorio "C4 A C6 pad piano.ogg" 
$carpetaSalida = Join-Path $rutaDirectorio "Notas_Separadas"
$rutaFFmpeg = "E:\SOFTWARE\ffmpeg\bin\ffmpeg.exe" 

# 2. Configuración de Detección 
$umbralValle = "-40dB" 
$duracionValle = "0.15"

if (-not (Test-Path $archivoEntrada)) {
    Write-Host "ERROR CRÍTICO: No se encuentra el archivo '$archivoEntrada'." -ForegroundColor Red
    exit
}

# Crear carpeta de salida
if (-not (Test-Path $carpetaSalida)) {
    New-Item -ItemType Directory -Path $carpetaSalida | Out-Null
}

Write-Host "Paso 1: Analizando picos y valles de volumen en el archivo .ogg..." -ForegroundColor Cyan

# Ejecutar FFmpeg (CORRECCIÓN APLICADA AQUÍ)
$ffmpegArgs = "-i `"$archivoEntrada`" -af `"silencedetect=noise=${umbralValle}:d=${duracionValle}`" -f null -"
$proceso = Start-Process -FilePath $rutaFFmpeg -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$rutaDirectorio\ffmpeg_log.txt"
$analisis = Get-Content "$rutaDirectorio\ffmpeg_log.txt"

# 3. Lógica para extraer solo los puntos de "Ataque" (silence_end)
$ataques = @()
$cultura = [System.Globalization.CultureInfo]::InvariantCulture
$iniciaConSilencio = $false

foreach ($linea in $analisis) {
    if ($linea -match "silence_start:\s+([\d\.]+)") {
        $inicioSilencio = [double]::Parse($matches[1], $cultura)
        if ($inicioSilencio -lt 0.1 -and $ataques.Count -eq 0) {
            $iniciaConSilencio = $true
        }
    }
    if ($linea -match "silence_end:\s+([\d\.]+)") {
        $ataques += $matches[1]
    }
}

# Construir la lista definitiva de cortes
$cortes = @()
if (-not $iniciaConSilencio) {
    $cortes += "0" 
}
$cortes += $ataques

# Si no se detectan cortes, avisar
if ($cortes.Count -le 1) {
    Write-Host "`nADVERTENCIA: No se detectaron cortes." -ForegroundColor Red
    Write-Host "Revisando las últimas líneas del registro de FFmpeg para buscar errores:`n" -ForegroundColor Yellow
    $analisis | Select-Object -Last 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    Write-Host "`nEl archivo de registro completo se ha guardado en: $rutaDirectorio\ffmpeg_log.txt" -ForegroundColor Yellow
    exit
}

# Crear los segmentos de inicio y fin
$segmentos = @()
for ($i = 0; $i -lt $cortes.Count; $i++) {
    $inicio = $cortes[$i]
    $fin = if ($i -lt ($cortes.Count - 1)) { $cortes[$i+1] } else { $null }
    $segmentos += [PSCustomObject]@{ Inicio = $inicio; Fin = $fin }
}

Remove-Item "$rutaDirectorio\ffmpeg_log.txt" -ErrorAction SilentlyContinue

$totalNotas = $segmentos.Count
Write-Host "¡Genial! Se detectaron $totalNotas golpes/notas." -ForegroundColor Green
Write-Host "Procediendo a cortar y exportar..." -ForegroundColor Yellow

# 4. Cortar y exportar cada nota
$contador = 1

foreach ($seg in $segmentos) {
    $nombreSalida = Join-Path $carpetaSalida "Nota_$("{0:D2}" -f $contador).ogg"
    
    if ($null -eq $seg.Fin) {
        $comandoCorte = "-y -i `"$archivoEntrada`" -ss $($seg.Inicio) -c:a libvorbis -q:a 6 `"$nombreSalida`""
    } else {
        $inicioNum = [double]::Parse($seg.Inicio, $cultura)
        $finNum = [double]::Parse($seg.Fin, $cultura)
        $duracion = $finNum - $inicioNum
        $duracionStr = $duracion.ToString($cultura)
        
        $comandoCorte = "-y -i `"$archivoEntrada`" -ss $($seg.Inicio) -t $duracionStr -c:a libvorbis -q:a 6 `"$nombreSalida`""
    }

    Write-Host " -> Exportando: Nota_$("{0:D2}" -f $contador).ogg"
    Start-Process -FilePath $rutaFFmpeg -ArgumentList $comandoCorte -NoNewWindow -Wait
    
    $contador++
}

Write-Host "`n¡Proceso finalizado con éxito!" -ForegroundColor Green
Write-Host "Tus archivos .ogg están en: $carpetaSalida" -ForegroundColor Green
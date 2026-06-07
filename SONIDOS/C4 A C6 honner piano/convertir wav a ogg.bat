<# :
@echo off
:: Esto asegura que la consola se abra exactamente en la ruta donde está el .bat
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "Invoke-Command -ScriptBlock ([Scriptblock]::Create((Get-Content -Path '%~f0' -Raw)))"
pause
exit /b
#>

# ==============================================================================
# SCRIPT PARA CONVERTIR ARCHIVOS WAV A OGG EN LA CARPETA ACTUAL
# ==============================================================================

# Ruta de FFmpeg (tu ruta personalizada)
$rutaFFmpeg = "E:\SOFTWARE\ffmpeg\bin\ffmpeg.exe" 

# Obtener la ruta donde se está ejecutando el script
$rutaActual = $pwd.Path

Write-Host "Buscando archivos .wav en: $rutaActual" -ForegroundColor Cyan

# Buscar archivos WAV en la carpeta
$archivosWav = Get-ChildItem -Path $rutaActual -Filter "*.wav"

# Si no hay archivos, avisar y cerrar
if ($archivosWav.Count -eq 0) {
    Write-Host "`nERROR: No se encontró ningún archivo .wav en esta carpeta." -ForegroundColor Red
    exit
}

Write-Host "Se encontraron $($archivosWav.Count) archivo(s) .wav. Iniciando conversión...`n" -ForegroundColor Yellow

# Convertir cada archivo WAV encontrado
foreach ($wav in $archivosWav) {
    # Crear el nombre del nuevo archivo cambiando la extensión a .ogg
    $rutaOgg = [System.IO.Path]::ChangeExtension($wav.FullName, ".ogg")
    $nombreOgg = Split-Path $rutaOgg -Leaf
    
    Write-Host " -> Convirtiendo: $($wav.Name) a $nombreOgg" -ForegroundColor White
    
    # Argumentos de conversión: calidad 6 (aprox 192kbps)
    $argumentos = "-y -i `"$($wav.FullName)`" -c:a libvorbis -q:a 6 `"$rutaOgg`""
    
    # Ejecutar FFmpeg
    Start-Process -FilePath $rutaFFmpeg -ArgumentList $argumentos -NoNewWindow -Wait
}

Write-Host "`n¡Conversión finalizada con éxito!" -ForegroundColor Green
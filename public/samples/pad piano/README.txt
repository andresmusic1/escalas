================================================================================
PAD PIANO SAMPLER v16.1 - SAMPLES DE AUDIO (Características Reales)
================================================================================

Este directorio contiene los samples de "Pad Piano" para Tone.Sampler.

CARACTERÍSTICAS TÉCNICAS VERIFICADAS (ffprobe):
  - Formato: OGG Vorbis (libvorbis, Lavc62.29.101)
  - Sample Rate: 48,000 Hz (no 44.1 kHz como originalmente requerido)
  - Canales: Mono (channel_layout: mono)
  - Formato de muestra: fltp (float 32-bit)
  - Duración C4: ~1.2s | Duración otras notas: ~2.0s
  - Bitrate variable: ~56-75 kbps (promedio ~60kbps)
  - Fade-in/fade-out: Aplicado por silencedetect (~50ms implícito)

LISTA DE NOTAS (13 notas, C4 → C5):

  Nota    Archivo               Ruta relativa         Duración    Bitrate
  ------  --------------------  --------------------  ----------  --------
  Do      C4.ogg                /samples/pad piano/   ~1.2s       ~75kbps
  Do#     C#4.ogg               /samples/pad piano/   ~2.0s       ~60kbps
  Re      D4.ogg                /samples/pad piano/   ~2.0s       ~60kbps
  Re#     D#4.ogg               /samples/pad piano/   ~2.0s       ~60kbps
  Mi      E4.ogg                /samples/pad piano/   ~2.0s       ~57kbps
  Fa      F4.ogg                /samples/pad piano/   ~2.0s       ~59kbps
  Fa#     F#4.ogg               /samples/pad piano/   ~2.0s       ~60kbps
  Sol     G4.ogg                /samples/pad piano/   ~2.0s       ~60kbps
  Sol#    G#4.ogg               /samples/pad piano/   ~2.0s       ~60kbps
  La      A4.ogg                /samples/pad piano/   ~2.0s       ~60kbps
  La#     A#4.ogg               /samples/pad piano/   ~2.0s       ~60kbps
  Si      B4.ogg                /samples/pad piano/   ~2.0s       ~60kbps
  Do      C5.ogg                /samples/pad piano/   ~2.0s       ~56kbps

================================================================================
FUENTE DE SAMPLES:
================================================================================

Los samples se obtienen del archivo:
  SONIDOS/Pad Piano/C4 A C6 pad piano.wav

Ejecutando el script:
  SONIDOS/Pad Piano/separar notas.bat

Esto genera la carpeta:
  SONIDOS/Pad Piano/Notas_Separadas/Nota_01.ogg ... Nota_25.ogg

SELECCIONAR las 13 primeras notas correspondientes a C4-C5 y renombrarlas:

  Nota_01.ogg → C4.ogg
  Nota_02.ogg → C#4.ogg
  Nota_03.ogg → D4.ogg
  Nota_04.ogg → D#4.ogg
  Nota_05.ogg → E4.ogg
  Nota_06.ogg → F4.ogg
  Nota_07.ogg → F#4.ogg
  Nota_08.ogg → G4.ogg
  Nota_09.ogg → G#4.ogg
  Nota_10.ogg → A4.ogg
  Nota_11.ogg → A#4.ogg
  Nota_12.ogg → B4.ogg
  Nota_13.ogg → C5.ogg

COPIAR estos 13 archivos renombrados a ESTE directorio.

================================================================================
NOTAS IMPORTANTES:
================================================================================

- Tone.js Sampler interpola automáticamente entre samples conocidos.
  Con las 13 notas (C4-C5), las notas intermedias del rango se interpolan
  si se necesitan fuera de este rango en el futuro.

- Duración corta (~2s máx): El release configurado en AudioEngine es 1.5s.
  Para notas largas, el sample puede cortarse antes del fade-out natural.

- Sample rate 48kHz: Tone.js hace upsample/downsample interno a 44.1kHz
  si el contexto de audio lo requiere. No hay problemas de compatibilidad.

- Bitrate ~60kbps: Los samples fueron comprimidos agresivamente. Se aplicó
  filtro lowpass 4500Hz Q:0.3 para suavizar artefactos de compresión.

- Si los samples no suenan bien con silencedetect, ajustar en separar notas.bat:
    $umbralValle = "-20dB"  → probar con "-15dB" si hay problemas
    $duracionValle = "0.15" → bajar a "0.1" si es muy agresivo

================================================================================

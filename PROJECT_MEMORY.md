# 🎵 Escalas Musicales Interactivas - PROJECT MEMORY

> **Última actualización:** 2026-06-08 (Sesión: v17.0 — Exportar Audio a WAV)
> **Versión del proyecto:** v17.0
> **Estado tests:** ✅ TypeScript compilation OK

---

## 📌 ESTADO ACTUAL DEL PROYECTO (Junio 2026)

### 🟢 v17.0 — Exportar Audio a WAV (Tone.Offline)
**Archivos:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts), [`src/App.tsx`](src/App.tsx)

#### Cambio 1: Nuevo módulo `audioExport.ts`
- **Funciones principales:** `exportAudio()`, `exportScale()`, `exportChord()`
- **Utilidades:** `audioBufferToWav()`, `downloadBlob()`, `generateFilename()`
- **Tecnología:** Tone.Offline renderiza audio sin reproducir en tiempo real
- **Formato WAV:** PCM 16-bit, sample rate 48kHz (coincide con samples reales)
- **Interleaving:** Mono/stereo channels interleaved para formato WAV estándar

#### Cambio 2: Función `createOfflineInstrument()`
- Clona la configuración del AudioEngine para usar en Tone.Offline
- Reutiliza INSTRUMENT_MAP para crear PolySynth + efectos idénticos
- Soporta ambos instrumentos: `proPiano` (triangle + compresor + delay + reverb) y `campana` (sine + reverb catedral)

#### Cambio 3: Botón Exportar en UI
- **Ubicación:** Debajo de los botones Play/Stop en tempo-bar
- **Estado visual:** Spinner animado mientras exporta, icono Download cuando listo
- **Texto dinámico:** "Exportar WAV" / "Exportando..." / "Exportar Escala WAV"
- **Deshabilitado:** Durante exportación activa o sin escala/acorde seleccionado

#### Cambio 4: Función `handleExportAudio()` en App.tsx
- Detecta modo escala vs modo acorde automáticamente
- Usa `exportScale()` para escalas (incluye nota raíz octavada al final)
- Usa `exportChord()` para acordes (arpegio + raíz octavada + acorde simultáneo)
- Genera nombre de archivo: `{Root}_{Escala}.wav` o `{Root}_{Acorde}.wav`

### 🟢 v17.1 — AudioEngine revertido a solo Synth
**Archivo:** [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts)

#### Cambio: Eliminado Tone.Sampler, solo PolySynth
- **InstrumentId:** Ahora solo `'proPiano' | 'campana'` (2 opciones)
- **INSTRUMENT_MAP:** Solo SynthInstrumentConfig (sin SamplerInstrumentConfig)
- **Motivo:** Simplificar motor de audio, eliminar dependencias de samples externos

### 🟢 v16.1 — Ruta Samples Actualizada + Parámetros Ajustados
**Archivos:** [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts), `public/samples/pad piano/README.txt`

#### Cambio 1: Renombrado de carpeta `piano` → `pad piano`
- **Ruta base samples:** `/samples/pad piano/` (antes `/samples/piano/`)
- **Motivo:** Preparar infraestructura para otros tipos de sonidos de piano en el futuro

#### Cambio 2: Características reales de los samples verificadas con ffprobe
| Propiedad | Valor real | Requerimiento original |
|-----------|------------|----------------------|
| Sample Rate | **48,000 Hz** | 44.1 kHz |
| Duración C4 | **~1.2s** | 3-5s |
| Duración otras notas | **~2.0s** | 3-5s |
| Bitrate promedio | **~60 kbps** | 96-128 kbps |

#### Cambio 3: Ajuste de parámetros del AudioEngine
- **release:** `1.8s → 1.5s` — ajustado a duración real de samples (~2s máx)
- **filter.frequency:** `5000Hz → 4500Hz` — samples a bitrate ~60kbps necesitan más suavizado
- **volume:** `-4dB → -3dB` — compensar compresión agresiva
- **reverb.decay:** `2.5s → 2.0s` — coherente con samples de duración corta
- **reverb.wet:** `0.40 → 0.35` — menos reverb para evitar sonidos embarrados

#### Cambio 4: Descripción del instrumento
- **Label:** "🎹 Piano Dulce (Samples)" → **"🎹 Pad Piano"**
- **Description:** "Piano Dulce — Samples reales con reverb cálido" → **"Pad Piano — Samples reales (48kHz, mono, Vorbis)"**

### 🟢 v16.0 — Piano Sampler con Tone.Sampler (Samples Reales C4-C5)
**Archivos:** [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts), [`src/App.tsx`](src/App.tsx)

#### Cambio: Nuevo tipo `pianoSampler` con `Tone.Sampler`
- **InstrumentId:** Ahora `'pianoSampler' | 'proPiano' | 'campana'` (3 opciones)
- **Tone.Sampler API:** Usa `urls` + `baseUrl: '/samples/pad piano/'` para mapear 13 notas (C4-C5)
- **SampleMap:** `{ C4: '/samples/pad piano/C4.ogg', ..., C5: '/samples/pad piano/C5.ogg' }`
- **Envelope (v16.1):** `attack: 0.01s, release: 1.5s, curve: 'exponential'` — ajustado a samples ~2s
- **Filtro (v16.1):** lowpass 4500Hz Q:0.3 — samples a ~60kbps Vorbis
- **Volumen (v16.1):** -3dB
- **Efectos (v16.1):** Reverb cálido decay 2.0s, wet 35%, preDelay 0.1s
- Cadena: `Sampler → Filter(lowpass) → Reverb(2.0s/cálido) → Destino`
- **Default instrument:** Cambiado de `'proPiano'` a `'pianoSampler'`
- Menú select muestra: "🎹 Pad Piano", "🎹 Piano Profesional", "🔔 Campana"

#### Arquitectura de InstrumentConfig (v16.0)
Se introdujeron dos tipos de configuración:
- `SamplerInstrumentConfig`: `{ type: 'sampler', samples, envelope, filter, volume, description }`
- `SynthInstrumentConfig`: `{ type: 'synth', oscillatorType, envelope, filter, volume, description }`

Los métodos `playNote()`, `playChord()`, `stopAll()` ahora verifican `this.sampler || this.synth`.

### 🟢 v15.3 — Campana (Bell) Implementada
**Archivo:** [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts)

- ❌ Eliminado `vibratoFlute` (Flauta con Vibrato) completamente
- **InstrumentId:** Ahora solo `'proPiano'`
- **INSTRUMENT_PRESETS:** Solo 1 opción: "🎹 Piano Profesional"
- Propiedad `vibratoLFO` removida de la clase AudioEngine
- Cadena de efectos de piano intacta: `PolySynth → Filter(lowpass 7kHz) → Compressor(-24dB/3:1) → FeedbackDelay(0.143s, wet 7%) → Reverb(1.8s)`

### 🟢 v15.3 — Campana (Bell) Implementada
**Archivos:** [`src/lib/audioEngine.ts`](src/lib/audioengine.ts), [`src/App.tsx`](src/App.tsx)

#### Cambio: Nuevo Instrumento `campana`
- **Oscilador:** `sine` puro — timbre metálico característico
- **Envelope ADSR:** attack 0.001s, decay 2.5s, sustain 0%, release 1.5s
- **Filtro:** lowpass 3500Hz Q:0.4 — suaviza armónicos agudos metálicos
- **Volumen:** -8dB (más bajo que piano)
- **Efectos:** Reverb tipo catedral decay 4.0s, wet 45%, preDelay 0.1s
- Cadena: `PolySynth → Filter(lowpass) → Reverb(4.0s/catedral)`
- Menú select ahora muestra: "🎹 Piano Profesional" + "🔔 Campana"

### 🟢 v15.2 — Delay Reducido + Opción Flauta Eliminada del Select
**Archivos:** [`src/lib/audioEngine.ts`](src/lib/audioengine.ts), [`src/App.tsx`](src/App.tsx)

#### Cambio 1: Reducción de Delay en Piano Profesional
- **FeedbackDelay time:** `0.167s → 0.143s` (más corto, menos percusivo)
- **Feedback constructor:** `0.15 → 0.10`
- **delay.wet.value:** `0.12 (12%) → 0.07 (7%)` — efecto más sutil

#### Cambio 2: Opción Residual Eliminada del Select en App.tsx
- ❌ Removida `<option value="vibratoFlute">🪈 Flauta con Vibrato</option>` de [`src/App.tsx:968`](src/App.tsx:968)

---

### 🟢 v15.0 — Instrumentos Profesionales + Refinamientos UI
**Archivos:** [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts), [`src/App.tsx`](src/App.tsx), [`src/index.css`](src/index.css)

#### Cambio 1: Piano Profesional (proPiano)
Instrumento `cleanPiano` reemplazado por `proPiano` con cadena de efectos Tone.js:
- **Compresor:** Threshold -24dB, Ratio 3:1, Attack 0.01s, Release 0.25s — controla dinámica martillo-cuerda
- **FeedbackDelay:** Time 0.167s (~1/8 nota), Feedback 15%, Wet 12% — profundidad y cuerpo
- **Reverb:** Decay 1.8s, Wet 15% — espacio acústico corto

Cadena de señal: `PolySynth → Filter(lowpass 7kHz) → Compressor → ├→ FeedbackDelay → Reverb → Destino`

#### Cambio 2: Flauta con Vibrato (vibratoFlute) — ELIMINADA EN v15.1
Instrumento `recorder` reemplazado por `vibratoFlute` con modulación LFO:
- **LFO Vibrato:** Frecuencia 5.5Hz, Depth ±80Hz, tipo sinusoidal
- **Reverb Sala Pequeña:** Decay 1.2s, Wet 25%
> ⚠️ Eliminada en v15.1 — solo Piano Profesional permanece

#### Cambio 3: Eliminación de Instrumentos (Historial)
- ❌ Eliminado `rhodesSynth` (Rhodes Cálido) → v15.0
- ❌ Eliminado `organHammon` (Órgano Hammon) → v15.0
- ❌ Eliminado `vibratoFlute` (Flauta con Vibrato) → v15.1
- Menú select: inicialmente 2 opciones, ahora solo "🎹 Piano Profesional"

#### Cambio 4: Refinamientos UI Variados
- **Fondo contenedor Contexto Histórico:** Cambiado de inline style a `className="section-card"` para consistencia visual ( [`src/App.tsx:676`](src/App.tsx:676) )
- **Contenedor Categorías sin scroll:** Removido `maxHeight: '120px'` y `overflowY: 'auto'` ( [`src/App.tsx:584`](src/App.tsx:584) )
- **Panel Acorde en línea única:** Cambiado de `flex-col` a `flex items-center gap-2 flex-wrap` con separadores `\|` dorados ( [`src/App.tsx:831`](src/App.tsx:831) )
- **Colores del panel acorde:** Valores chordName/chordDegree cambiados de rojo `#e53e3e` a dorado `var(--color-gold)`
- **Botones Play:** Texto "Play"/"Stop" agregado en contenedor Tempo ( [`src/App.tsx:925`](src/App.tsx:925) ); iconos actualizados de size=20 a size=24
- **Botones Play verdes:** Gradiente oscurecido `#00ff88→#00cc66`, `#00dd88→#00aa55`; glow reducido en opacidad y radio ( [`src/index.css:366`](src/index.css:366) )

---

### 🟢 v9.3 — Título de Escala sobre Círculo + Relleno Acorde Opaque + Textos Blancos
**Archivo:** [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx)

#### Cambio 1: Gradiente para Relleno del Polígono del Acorde (v9.0+)
Se reemplazó el color sólido `CHORD_TEXT_BG_COLOR` por un gradiente diagonal SVG:

```xml
<!-- Línea ~499-502: Definición del gradiente -->
<linearGradient id="chordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stopColor="#7ea1f5" stopOpacity="0.6" />
  <stop offset="100%" stopColor="#4a90d9" stopOpacity="0.2" />
</linearGradient>
```

```tsx
<!-- Línea ~555: Aplicación del gradiente -->
<polygon fill="url(#chordGradient)" ... />
```

#### Cambio 2: Título de la Escala encima del Círculo (solo modo acorde)
**Línea ~710-727:** Se agregó un `<text>` que muestra el nombre de la escala actual sobre el círculo cromático en modo acorde.

```tsx
{chordName && chordDegree && (
  <text
    x={CENTER}
    y="25" // Posición final tras iteraciones: 42 → 30 → 25
    textAnchor="middle"
    dominantBaseline="central"
    fill="#ffffff"
    fontSize="20"
    fontWeight="bold"
    style={{
      fontFamily: 'Georgia, serif',
      filter: 'drop-shadow(0 0 4px rgba(240, 214, 140, 0.5)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))',
    }}
  >
    {scaleName.replace(/\s*\(Acoustic\)\s*/g, '').trim()}
  </text>
)}
```

- Elimina el sufijo "(Acoustic)" del nombre de escala usando regex.
- Fuente Georgia serif, tamaño 20px (bold), color blanco con glow dorado.

#### Cambio 3: Círculo Cromático Traducido (translate)
**Línea ~458:** Se agregó `<g transform="translate(0, 25)">` para mover todo el contenido SVG hacia abajo 25px, creando espacio visual entre el título de escala y la nota "C" superior.

#### Cambio 4: Relleno del Polígono del Acorde Opaque (fillOpacity=1)
**Línea ~558:** Se cambió `fillOpacity` de `0.85` a `1` para que el polígono del acorde sea completamente sólido y no muestre las líneas del fondo:

```tsx
fillOpacity={chordPolygonComplete ? 1 : 0} // Antes era 0.85
```

#### Cambio 5: Todos los Textos Interiores del Polígono en Blanco
- **Línea ~609:** Grado Romano — `fill="#ffffff"` (antes usaba CHORD_DEGREE_COLOR dorado)
- **Línea ~644:** Notas del acorde — `fill="#ffffff"` (antes usaba CHORD_NOTES_COLOR dorado claro)
- Se actualizó el drop-shadow filter correspondiente para glow blanco.

#### Cambio 6: Eliminado Grado del Acorde Fuera del Círculo
Se eliminó completamente el bloque de líneas ~691-723 que renderizaba el grado romano (I, II°, etc.) en la nota raíz fuera del círculo, ya que era redundante con la visualización centrada dentro del polígono.

---

### 🟢 v9.2 — Fix Altered con Raíces # (Sostenidos)
**Archivo:** [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)

La función `getDoublyAlteredName()` ahora recibe `selectedRootName?: string` como cuarto parámetro y lo pasa a `getHeptatonicSkeleton()`. Esto asegura que las raíces con sostenido (#) muestren correctamente las dobles alteraciones.

**Resultado:** 106/106 tests pasando.

---

### 🟢 v9.3 — Hirajoshi Enarmonía Completada
**Archivo:** [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)

La función `resolveHirajoshiInterval()` fue reescrita con mapeo diatónico:
```typescript
const DIATONIC_MAP = { 0: 0, 2: 1, 3: 2, 7: 4, 8: 5 };
```

**Resultado:** 166/166 tests pasando (100%) — 12 raíces × 5 notas.

---

## 📋 HISTORIAL DE VERSIONES ANTERIORES (Resumen)

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| v17.0 | 2026-06-08 | Exportar Audio a WAV — Tone.Offline, funciones exportScale/exportChord, botón UI |
| v17.1 | 2026-06-08 | AudioEngine revertido a solo Synth (proPiano + campana), eliminado Tone.Sampler |
| v16.1 | 2026-06-08 | Ruta samples → `pad piano/` + parámetros ajustados a características reales (48kHz, ~2s, ~60kbps) |
| v16.0 | 2026-06-08 | Piano Sampler con Tone.Sampler — Samples reales C4-C5 (13 notas .ogg) + 3 instrumentos disponibles |
| v15.3 | 2026-06-07 | Campana implementada + Piano Profesional permanecen |
| v15.1 | 2026-06-07 | Flauta eliminada — Solo Piano Profesional (proPiano) permanece como único instrumento |
| v15.0 | 2026-06-07 | Instrumentos Profesionales (Piano con Compresor+Delay, Flauta con LFO Vibrato) + Refinamientos UI |
| v9.3 | 2026-06-07 | Gradiente Acorde + Título Escala + Relleno Opaque + Textos Blancos + Hirajoshi completada |
| v9.2 | 2026-06-07 | Fix Altered con raíces # — `getDoublyAlteredName()` recibe `selectedRootName` |
| v14.2 | 2026-06-07 | Fix retroceso visual reinicio neón: key={reproductionKey} fuerza reconstrucción DOM |
| v14.1 | 2026-06-07 | Reinicio animación neón: `setChordPolygonComplete(false)` al inicio de playChordTravel() |
| v18.5 | 2026-06-03 | Orden renderización corregido: relleno azul primero (fondo), neón dorado después (encima) |
| v18.4 | 2026-06-03 | Grosor neón aumentado a 3.0px |
| v18.3 | 2026-06-03 | Eliminación capas rojas — solo neón dorado permanece |
| v18.2 | 2026-06-03 | Grosor neón reducido a 1.0px (antes de aumento) |
| v18.1 | 2026-06-03 | Filtro neonGlow reducido (blur1=1.5, blur2=3) |
| v18.0 | 2026-06-03 | Relleno azul del polígono del acorde (#1e3a5f) + colores de texto alto contraste |
| v14.0 | 2026-06-05 | Enarmonía nombre central del acorde CORREGIDA (C# muestra "C#maj7" no "Dbmaj7") |
| v13.4 | 2026-06-05 | Último segmento neón SIMULTÁNEO con última nota del arpegio |
| v13.3 | 2026-06-03 | Polígono neón como marca de agua persistente (chordPolygonComplete) |
| v13.2 | 2026-06-03 | Mini pausa último trazo eliminada — transición siempre activa + will-change |
| v13.0 | 2026-06-02 | Deduplicación Major/Jónico + Minor/Eólico |
| v11.0 | 2026-06-01 | Rediseño UI: controles flotantes top-center sobre SVG |

---

## 🔒 REGLAS INTOCABLES (NO VIOLAR)

### SVG y Visualización
- **NO usar CSS rotation en contenedor SVG** — posicionamiento con matemática trigonométrica en [`CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx).
- Raíz siempre a -90° (12 en punto): `startAngle + ((noteIndex - rootIndex) * angleStep)` donde `angleStep = 2π/12`.
- **CHROMATIC_SCALE es inmutable** — solo las etiquetas visuales pueden cambiar variantes enarmónicas.
- **Tailwind CSS v4 NO genera grid/gap** — usar inline styles: `style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}`.

### Teoría Musical y Enarmonía (CRÍTICO)
- **Protocolo Heptatónico:** Para escalas de 7 notas con raíces naturales, usar exactamente 7 letras A-G una vez cada una.
- **Escalas Hexatónicas (Prometheus y Tritono):** NUNCA usar cálculo algorítmico. Dependen 100% de diccionarios absolutos de 17 claves (`PROMETHEUS_SPELLINGS` y `TRITONE_SPELLINGS`).
- **Escala Aumentada Simétrica:** Depende 100% del diccionario absoluto `AUGMENTED_SPELLINGS`. Naturaleza simétrica requiere repetir letras — NO verificar "letras únicas".
- **Escalas Octatónicas:** Regla de "7 letras + 1 repetición" con `OCTATONIC_MAPPINGS` y `OCTATONIC_EXCEPTIONS`. Cero dobles bemoles/sostenidos.
- **Siempre usar `resolveEnharmonicName()`** — NUNCA duplicar lógica enarmónica en otros componentes.
- **Ortografía musical:** Usar `x` para dobles sostenidos, `bb` para doble bemol. NUNCA usar `##`.

### Audio y Sincronización
- Sincronización rítmica: TODAS las transiciones usan `currentDuration` (BPM-based).
- **UI sync usa setTimeout (NO Tone.Draw)** — deuda técnica documentada en [`App.tsx`](src/App.tsx:184). Futuro: migrar a `Tone.Draw`.
- Control de volumen: `Tone.Destination.volume.value = volume` dentro de un useEffect.

### Reglas de Aislamiento Modo Acorde
- Bajo ninguna circunstancia modificar la lógica del Modo Escala (`isPlaying`, `activeLineIndex`).
- Todo cambio en modo acorde debe estar aislado en estados con prefijo `chord*` o `isChord*`.
- NO tocar código congelado del Modo Escala salvo para ramas condicionales `isChordMode`.

---

## 🎨 CONSTANTES CSS PERSONALIZADAS
**Archivo:** [`src/index.css`](src/index.css)

```css
--color-background: #12161c;
--color-gold: #dfc47f;
--color-red: #e53e3e;
```

### Clases CSS Críticas (Preservar en cualquier refactor)
| Clase | Uso | Estilo clave |
|-------|-----|--------------|
| `mode-button` | Toggle Modo Escala/Acorde | Fondo, padding, border-radius |
| `active-scale` / `active-chord` | Botón activo | Fondo dorado #dfc47f con glow |
| `inactive` | Botón inactivo | Fondo #1a1d24 texto gris |
| `chord-type-button` | Tríada/Cuatríada toggle | Padding, border-radius |
| `active` (en chord) | Tipo de acorde activo | Azul #60a5fa |
| `play-button` | Botón Play grande | Gradientes verde/rojo |
| `playing` | Estado reproducción activo | Animación pulsante |

---

## 📁 Arquitectura del Proyecto

### Archivos Clave
| Archivo | Propósito | Líneas aprox. |
|---------|-----------|---------------|
| [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) | Cerebro musical: 39+ escalas, enarmonía, acordes, intervalos, SCALE_EXTENDED_INFO | ~1816 |
| [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts) | AudioEngine singleton con Tone.js: PolySynth + Compresor + FeedbackDelay + Filter + Reverb (2 instrumentos: proPiano, campana) — v17.1 solo Synth | ~361 |
| [`src/lib/audioExport.ts`](src/lib/audioExport.ts) | Exportar audio a WAV con Tone.Offline: exportScale(), exportChord(), audioBufferToWav() — v17.0 | ~200 |
| [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) | SVG interactivo con matemática trigonométrica, gradientes, filtros neón | ~734 |
| [`src/App.tsx`](src/App.tsx) | Componente principal + motor audio + UI + gestión de estados del acorde + botón Exportar | ~1076 |
| [`src/test-enharmony.ts`](src/test-enharmony.ts) | Validación enarmonía: 166 tests (12 raíces × escalas clave) | ~804 |
| [`src/index.css`](src/index.css) | Tailwind v4 + custom properties + animaciones CSS | - |

### Dependencias
- **React 19** + **TypeScript** + **Vite 7** — Framework base
- **Tone.js v15.1.22** — Motor de audio (PolySynth + Compresor + FeedbackDelay + LFO + Filter + Reverb + Offline)
- **Tailwind CSS v4** — Estilos (NOTA: no genera grid/gap)
- **Lucide React** — Iconos

---

## 🔄 PROMPT DE TRANSFERENCIA PARA NUEVO CHAT

Si continúas en un nuevo chat, copia este archivo PROJECT_MEMORY.md completo.

### Resumen Rápido para la IA:
SPA **React 19 + TypeScript + Vite 7 + Tone.js** — Visualizador de escalas musicales SVG interactivo con modo escala y modo acorde + exportar audio a WAV.

**Estado Actual (v17.0):**

**AudioEngine v17.1:** 2 instrumentos Synth (eliminado Tone.Sampler):
- `proPiano`: PolySynth(triangle) → Filter(lowpass 7kHz) → Compressor(-24dB/3:1) → FeedbackDelay(0.143s, wet 7%) + Reverb(1.8s)
- `campana`: PolySynth(sine) → Filter(lowpass 3.5kHz Q:0.4) → Reverb(3.2s/catedral)

**Exportar Audio v17.0:** Módulo `src/lib/audioExport.ts` con Tone.Offline para renderizar WAV sin reproducir en tiempo real
- Funciones: `exportScale()`, `exportChord()`, `audioBufferToWav()`
- Formato: WAV PCM 16-bit, 48kHz sample rate
- Botón "Exportar WAV" en UI debajo de Play/Stop

**Samples de audio:** `public/samples/pad piano/` — 13 notas OGG (C4 a C5), 48kHz/mono/vorbis, ~2s duración, ~60kbps bitrate. Ver `README.txt`.

**Música:** Sistema de ~48 escalas matemáticamente perfecto. Enarmonía resuelta por:
- Protocolo Heptatónico (algorítmico) para 5-7 notas
- Pivotes (`OCTATONIC_MAPPINGS`) para 8 notas
- Diccionarios 17 Strings (`TRITONE_SPELLINGS`, `PROMETHEUS_SPELLINGS`, `AUGMENTED_SPELLINGS`) para hexatónicas/simétricas
- `SCALE_EXTENDED_INFO` completado para ~30+ escalas con context, degrees y relations

**UI (v11.0+):** Controles flotantes top-center sobre SVG. Panel izquierdo limpio con Categorías → Escalas → Raíz → Audio → Tempo+Play → Escala Actual.

**Samples v16.1:** Ruta `/samples/pad piano/`, 48kHz mono Vorbis, duración corta (~2s), release ajustado a 1.5s
**Modo Acorde (v9.3):**
- Polígono neón dorado `stroke="#FFD700" strokeWidth="3.0"` filtro `neonGlow` (blur1=1.5, blur2=3)
- Relleno con gradiente diagonal (`chordGradient`: #7ea1f5→#4a90d9), fillOpacity=1 (opaque al completar)
- Orden de renderización DOM: relleno primero (fondo), neón después (encima)
- Texto centrado interior en blanco puro (#ffffff): grado romano, nombre acorde, notas
- Título de escala encima del círculo (solo modo acorde): `scaleName.replace(/\s*\(Acoustic\)\s*/g, '').trim()` a y="25" dentro de `<g transform="translate(0, 25)">`

**SVG Crítico:**
- Gradiente escala: `polygonGradient` (línea ~493)
- Gradiente acorde: `chordGradient` (línea ~499)
- Filtros: `glow`, `neonGlow`, `chordGlow` (líneas ~462-491)
- Polígono escala: línea ~509, relleno rojo `#dc2626` (línea 372 en App.tsx)
- Polígono acorde neón: línea ~567, fill=url(#chordGradient) línea ~555

**Características reales de samples (v16.1):** `public/samples/pad piano/` — 48kHz/mono/vorbis, duración ~1.2-2.0s, bitrate ~60kbps
**Bug Documentado (no fixeado):** ROOT_NOTES_SOSTENIDOS index bug en [`App.tsx:394`](src/App.tsx:394) — botón G# usa `[1]` en lugar de `[2]` para rootIndex 8.

---

## 🔍 MÉTODO DE VERIFICACIÓN DE SAMPLES
Usar ffprobe para verificar características técnicas:
`ffprobe -v quiet -print_format json -show_format -show_streams "public/samples/pad piano/C4.ogg"`

## 📋 INSTRUCCIONES PARA ESTA SESIÓN Y FUTURAS
1. **MODO ESCALA NO TOCAR** — Congelado y funcionando perfectamente.
2. **Modo Acorde:** Todo cambio aislado en estados/funciones con prefijo `chord*` o `isChord*`.
3. **NO usar rotación CSS en SVG.**
4. **CHROMATIC_SCALE inmutable.**
5. **Tailwind v4 NO genera grid/gap — inline styles.**
6. **Siempre usar `resolveEnharmonicName()`** para cualquier variante enarmónica.
7. **NUNCA inventar datos musicales** — preguntar al usuario, usar fuentes verificadas.

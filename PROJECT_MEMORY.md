# 🎵 Escalas Musicales Interactivas - PROJECT MEMORY

> **Última actualización:** 2026-06-08 (Sesión: v21.6 — Fix ruta reverb campana + parámetros catedral)
> **Versión del proyecto:** v21.6
> **Estado tests:** ✅ TypeScript compilation OK | ✅ 700/700 enharmony | ✅ 256/256 chords

---

## 📌 ESTADO ACTUAL DEL PROYECTO (Junio 2026)

### 🟢 v21.6 — Fix Ruta Reverb Campana + Parámetros Catedral Ajustados
**Archivo:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Problema resuelto: Cola de resonancia eterna en exportación WAV con campana
**Causa raíz:** La ruta húmeda conectaba el `oscillator` directo al `ConvolverNode`, sin pasar por el `gainNode` con envelope ADSR. El oscillator emitía señal continua al 100%, saturando masivamente el convolver.

#### Acciones realizadas:
1. ✅ **Fix conexión en `connectCampanaNoteToSharedReverb()`:** `oscillator.connect(sharedReverb.convolver)` → `gainNode.connect(sharedReverb.convolver)` (línea ~147)
2. ✅ **Fix conexión en `renderChordBlockWithSharedReverb()`:** `oscillator.connect(sharedReverb.convolver)` → `gainNode.connect(sharedReverb.convolver)` (línea ~186)
3. ✅ **Removido湿Mix de `createReverbImpulse()`:** El wetMix se multiplicaba y luego normalizaba a 1.0 (inútil). Ahora control via wetGain node externo.
4. ✅ **Parámetros catedral real en `createSharedCathedralReverb()`:** decay=3.5s, wet=1.5, preDelay=0.03s (sonido catedral completo)
5. ✅ **Buffer ampliado para campana:** cathedralDecay + releaseTime = 2.0 + 1.5 = 3.5s mínimo extra
6. ⚠️ **Valores reducidos por feedback del usuario:** decay=2.0s, wet=0.6, preDelay=0.015s

#### Parámetros finales de reverb en exportación (v21.6):
| Parámetro | Valor |
|-----------|-------|
| Decay | 2.0s |
| Wet (wetGain) | 0.6 |
| PreDelay | 0.015s (15ms) |

#### Archivos modificados en esta sesión:
- `src/lib/audioExport.ts` — Fix conexión gainNode→convolver, removido湿Mix de impulse response, parámetros catedral ajustados
- `PROJECT_MEMORY.md` — Documentación

### 🟢 v21.5 — ConvolverNode SHARED para Reverb Campana
**Archivo:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Cambio: Un solo ConvolverNode compartido evita acumulación infinita de impulse responses
- Implementado `createSharedCathedralReverb()` — un solo convolver para todas las notas
- Implementado `connectCampanaNoteToSharedReverb()` — conecta cada nota al reverb compartido
- Modificado `renderNativeAudio()` — crea sharedReverb antes del loop, lo pasa a cada nota
- Modificado `renderChordBlock()` — acepta sharedReverb como parámetro opcional

> ⚠️ **Resuelto en v21.6:** La implementación v21.5 tenía el bug de conectar oscillator→convolver (sin envelope). Fixeado con gainNode→convolver.

### 🟢 v21.4 — Parámetros Reverb Ajustados (decay 0.5s, wet 0.10)
**Archivo:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Cambio: Reducidos parámetros de reverb catedral para exportación WAV campana
- Decay: 2.0s → 0.5s
- Wet: 0.30 → 0.10
- PreDelay: 0.003 → 0.001

### 🟢 v21.1 — Reverb Catedral en Exportación WAV Campana
**Archivo:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Cambio: ConvolverNode + impulse response generada para reverb catedral
Se agregaron 4 nuevas funciones al módulo audioExport.ts:
- `createReverbImpulse()` — genera IR con decay exponencial (3.2s, preDelay 0.08s)
- `setupCathedralReverb()` — crea ConvolverNode + wetGain (wet: 0.35)
- `createCampanaSignalChain()` — cadena dry+wet para notas individuales
- `renderChordBlockWithReverb()` — cadena dry+wet para acordes simultáneos

`renderNativeAudio()` ahora condicional: `isCampana ? createCampanaSignalChain() : envelope directo`
`renderChordBlock()` misma lógica condicional.

Buffer ampliado para campana: +2.5s release (antes +1.2s) para incluir cola de reverb catedral.

### 🟢 v21.0 — Octavas Dinámicas en buildChord para Progresión Ascendente
**Archivos:** [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)

#### Problema: Notas de triadas/cuatríadas saltaban octava incorrectamente
La función `buildChord()` calculaba TODAS las notas en octava 4 (`const toneJsOctave = 4`), causando que notas con intervalos amplios (5ta justa, 7ma) cayeran por debajo de notas anteriores del mismo acorde.

**Ejemplo del bug:** Tríada F-A-C en C Jónico (IV grado):
- Antes: F4 → A4 → **C4** ❌ (C4=261Hz < A4=440Hz, rompe progresión ascendente)
- Después: F4 → A4 → **C5** ✅ (C5=523Hz > A4=440Hz, progresión correcta)

**Ejemplo:** Cuatríada G7 en C Jónico (V grado):
- Antes: G4 → B4 → **D4** → **F4** ❌ (D4 < B4, F4 < D5)
- Después: G4 → B4 → **D5** → **F5** ✅

#### Fix aplicado en [`buildChord()`](src/lib/musicLogic.ts:2630):
```typescript
// Función auxiliar para comparar pitches usando MIDI numbers
function noteToMidi(noteIdx: number, oct: number): number {
  return (oct + 1) * 12 + noteIdx;
}

// Pre-calcular octavas dinámicas para progresión ascendente
const chordOctaves: number[] = [];
let lastMidi = 0;

for (let i = 0; i < chordType.intervals.length; i++) {
  const interval = chordType.intervals[i];
  const noteIdx = (rootIndex + interval) % 12;

  if (i === 0) {
    // Primera nota siempre en octava base 4
    chordOctaves.push(4);
    lastMidi = noteToMidi(noteIdx, 4);
  } else {
    const baseMidi = noteToMidi(noteIdx, 4);
    if (baseMidi > lastMidi) {
      // Cabe en la misma octava y es más aguda que la precedente
      chordOctaves.push(4);
      lastMidi = baseMidi;
    } else {
      // Subir una octava para mantener progresión ascendente
      chordOctaves.push(5);
      lastMidi = noteToMidi(noteIdx, 5);
    }
  }
}

// Usar la octava calculada para cada nota
const toneJsOctave = chordOctaves[position];
```

#### Regla de progresión ascendente:
1. Primera nota del acorde siempre en octava base (4)
2. Cada nota subsiguiente se compara con su precedente usando MIDI numbers
3. Si la nota cae por debajo (baseMidi <= lastMidi), se sube una octava (5)
4. Esto garantiza que cada nota sea más aguda que la anterior

#### Impacto:
- **Arpegio en vivo:** Las notas se reproducen en orden ascendente correcto
- **Acorde simultáneo (impacto):** Todas las notas suenan en sus octavas corregidas
- **Exportación WAV:** Usa `toneJsNote` de buildChord, automáticamente corregido

#### Ejemplos de resultados:
| Acorde | Anterior | Nuevo |
|--------|----------|-------|
| F Major (IV en C) | F4-A4-**C4** | F4-A4-**C5** ✅ |
| G7 (V en C) | G4-B4-**D4-F4** | G4-B4-**D5-F5** ✅ |
| C Major (I en C) | C4-E4-G4 | C4-E4-G4 ✅ (sin cambio, ya ascendente) |
| Cmaj7 | C4-E4-G4-B4 | C4-E4-G4-B4 ✅ (sin cambio) |
| maj7(#5) | C4-E4-**G#4**-B4 | C4-E4-**G#4**-B4 ✅ (sin cambio) |

#### Validación:
- ✅ TypeScript compilation: OK
- ✅ Enharmony tests: 700/700 PASSED
- ✅ Chord tests: 256/256 PASSED

### 🟢 v21.1 — Reverb Catedral en Exportación WAV para Campana
**Archivo:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Problema: Al exportar a WAV con instrumento `campana`, los efectos de reverb catedral no se escuchaban
La función `renderNativeAudio()` usaba Web Audio API nativa sin nodos de reverb — solo `OscillatorNode → GainNode → destination`.

En reproducción en vivo (AudioEngine), la campana tiene:
```
PolySynth(sine) → Filter(3500Hz) → Reverb(decay: 3.2s, wet: 0.35, preDelay: 0.08s) → Destino
```

En exportación WAV anterior:
```
Oscillator(sine) → GainNode → destination ❌ (sin reverb)
```

Esto causaba que la campana exportada sonara como un tono sine puro seco — completamente diferente al sonido real de campana con reverb catedral.

#### Fix aplicado: Nuevas funciones en audioExport.ts

1. **`createReverbImpulse()`** — Genera impulse response simulada con decay exponencial:
   - Env: `e^(-6.91 * t / T60)` donde T60 = 3.2s (decay catedral)
   - preDelay: 0.08s de silencio inicial
   - Ruido decorrelacionado con normalización para evitar clipping

2. **`setupCathedralReverb()`** — Crea ConvolverNode + wetGain:
   ```
   source → convolver → wetGain(0.35) → destination (wet)
   source → destination (dry)
   ```

3. **`createCampanaSignalChain()`** — Cadena completa con dry + wet:
   ```
   oscillator → gainNode → destination (dry)
              → convolver(reverb catedral) → destination (wet)
   ```

4. **`renderChordBlockWithReverb()`** — Versión para acordes simultáneos con reverb

5. **Modificación de `renderNativeAudio()`:** Condición `isCampana`:
   - Si `sine`: usa `createCampanaSignalChain()`
   - Si `triangle`: envelope directo sin reverb (como antes)

6. **Modificación de `renderChordBlock()`:** Misma lógica condicional

7. **Buffer ampliado para campana:**
   - Antes: `+1.2s` release
   - Ahora campana: `+2.5s` release + reverb tail (total ~4.5s cola)

#### Equivalencia de parámetros Tone.Reverb → ConvolverNode:
| Parámetro | Tone.Reverb (AudioEngine) | ConvolverNode (audioExport.ts) |
|-----------|--------------------------|-------------------------------|
| decay     | 3.2s                     | e^(-6.91 * t / 3.2)           |
| wet       | 0.35                     | wetGain.gain = 0.35           |
| preDelay  | 0.08s                    | silencio inicial 0.08s        |

#### Validación:
- ✅ TypeScript compilation: OK
- ✅ Campana exportada ahora incluye reverb catedral (decay 3.2s, wet 0.35)
- ✅ Piano exportado sin cambios (triangle directo, sin reverb)

### 🟢 v20.3 — Fix Bemoles en noteNameToFrequency + Fix octava buildChord
**Archivos:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts), [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)

### 🟢 v20.3 — Fix Bemoles en noteNameToFrequency (audioExport.ts)
**Archivos:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts)

#### Bug corregido: Notas con bemol (Eb, Db, Gb, Ab, Bb) calculaban frecuencia incorrecta
La función `noteNameToFrequency()` usaba un array solo con sostenidos:
```typescript
// ANTES (bug):
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
```

Cuando se pasaba `"Eb4"`, `noteNames.indexOf("Eb")` devolvía `-1`, calculando un MIDI número negativo y frecuencia incorrecta:
- Eb4 → noteIndex=-1 → midiNumber=59 → 246.94Hz (B3) ❌
- Eb4 correcto → noteIndex=3 → midiNumber=63 → 311.13Hz ✅

#### Fix aplicado en [`noteNameToFrequency()`](src/lib/audioExport.ts:17):
```typescript
// Ahora soporta bemoles Y sostenidos
const noteNamesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteNamesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let noteIndex = noteNamesFlat.indexOf(noteLetter);
if (noteIndex === -1) {
  noteIndex = noteNamesSharp.indexOf(noteLetter);
}
```

**Impacto:** Todas las escalas con bemoles (Eb Mayor, Ab Menor, C Menor Melódica, etc.) ahora exportan frecuencias correctas.

### 🟢 v20.2 — Fix Octava en buildChord para Acordes (Cuatríadas)
**Archivos:** [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)

#### Bug corregido: Notas de cuatríadas saltaban octava con rootIndex >= 5
La fórmula original `toneJsOctave = Math.floor((48 + rootIndex + interval) / 12)` causaba que notas con `rootIndex + interval >= 12` se calculasen en octava 5 en lugar de octava 4.

**Ejemplo:** D7 (rootIndex=2), 7ma nota:
- Antes: `C5` (554.37Hz) — saltó una octava arriba ❌
- Después: `C4` (261.63Hz) — posición correcta ✅

#### Fix aplicado en [`buildChord()`](src/lib/musicLogic.ts:2650):
```typescript
// Antes: const toneJsOctave = Math.floor((48 + rootIndex + interval) / 12);
// Después: Todas las notas del acorde permanecen en octava base 4
const toneJsOctave = 4;
```

**Motivo:** Los intervalos máximos de cuatríadas son 11 semitonos (maj7), siempre caben dentro de una octava base.

### 🟢 v20.1 — Exportar Audio WAV: Web Audio API Nativa + Acordes Simultáneos
**Archivos:** [`src/lib/audioExport.ts`](src/lib/audioExport.ts), [`src/App.tsx`](src/App.tsx)

#### Implementación actual (v20.1)
- **Enfoque:** Web Audio API nativa pura — `OfflineAudioContext` + `OscillatorNode` + `GainNode`, sin Tone.js
- **Instrumentos soportados:**
  - `proPiano`: oscilador triangle, attack 0.003s, decay 60%, sustain 15%, release 0.8s
  - `campana`: oscilador sine, attack 0.001s, decay 90%, sustain 0%, release 1.5s
- **Escalas:** notas individuales secuenciales + raíz octavada al final (duración 50%)
- **Acordes (triadas/cuatríadas):**
  - Fase 1: Arpegio (notas secuenciales)
  - Fase 1.5: Cierre (raíz una octava arriba)
  - Fase 2: Impacto — TODAS las notas del acorde simultáneamente usando `renderChordBlock()`

#### Estructura del export de acordes:
```
[Arpegio nota1] → [Arpegio nota2] → ... → [Cierre raíz+octava] → [Impacto: todas simultáneo]
```

#### Historial completo de intentos:
| Versión | Enfoque | Resultado |
|---------|---------|-----------|
| v17.0-v17.5 | Tone.Offline + setTimeout — mute | ❌ Sin event loop real |
| v18.0 | Tone.Transport.schedule() — mute | ❌ time como offset incorrecto |
| v19.0 | Tone.Part scheduling — mute | ❌ Tone.js v15.x incompatible con Offline |
| **v20.0** | Web Audio API nativa (OscillatorNode) | ✅ Audio audible funcional |
| **v20.1** | + `chords[]` para acordes simultáneos + presets instrumento | ✅ Triadas y cuatríadas correctas |

### ⏳ PENDIENTE PARA PRÓXIMA SESIÓN
- **Revisar exportación de cuatrías:** Verificar que las 4 notas del arpegio + acorde de 4 notas suenan correctamente
- Validar que el duration del impacto coincide con la reproducción en vivo

### 🟢 v17.0 — Exportar Audio a WAV (Tone.Offline) — Estructura base
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
| v21.1 | 2026-06-08 | Reverb catedral en exportación WAV campana — ConvolverNode + impulse response generada |
| v21.0 | 2026-06-08 | Octavas dinámicas en buildChord — progresión ascendente F4-A4-C5, G4-B4-D5-F5 |
| v20.3 | 2026-06-08 | Fix bemoles en noteNameToFrequency + Fix octava buildChord (tono fijo 4) |
| v20.1 | 2026-06-08 | Web Audio API nativa — chords simultáneos + presets instrumento |
| v20.0 | 2026-06-08 | Web Audio API nativa (OscillatorNode) — audio audible funcional |
| v19.0 | 2026-06-03 | Tone.Part scheduling — mute |
| v18.0 | 2026-06-03 | Tone.Transport.schedule() — mute |
| v17.5 | 2026-06-03 | Tone.Offline + setTimeout — mute |
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

**Estado Actual (v21.0):**

**AudioEngine v17.1:** 2 instrumentos Synth (eliminado Tone.Sampler):
- `proPiano`: PolySynth(triangle) → Filter(lowpass 7kHz) → Compressor(-24dB/3:1) → FeedbackDelay(0.143s, wet 7%) + Reverb(1.8s)
- `campana`: PolySynth(sine) → Filter(lowpass 3.5kHz Q:0.4) → Reverb(3.2s/catedral)

**Exportar Audio v20.1:** Módulo `src/lib/audioExport.ts` con Web Audio API nativa (OfflineAudioContext + OscillatorNode)
- Funciones: `exportScale()`, `exportChord()`, `audioBufferToWav()`
- Formato: WAV PCM 16-bit, 48kHz sample rate
- Botón "Exportar WAV" en UI debajo de Play/Stop

**Samples de audio:** `public/samples/pad piano/` — 13 notas OGG (C4 a C5), 48kHz/mono/vorbis, ~2s duración, ~60kbps bitrate. Ver `README.txt`.

**Música:** Sistema de ~48 escalas matemáticamente perfecto. Enarmonía resuelta por:
- Protocolo Heptatónico (algorítmico) para 5-7 notas
- Pivotes (`OCTATONIC_MAPPINGS`) para 8 notas
- Diccionarios 17 Strings (`TRITONE_SPELLINGS`, `PROMETHEUS_SPELLINGS`, `AUGMENTED_SPELLINGS`) para hexatónicas/simétricas
- `SCALE_EXTENDED_INFO` completado para ~30+ escalas con context, degrees y relations

**UI (v11.0+):** Controles flotantes top-center sobre SVG. Panel izquierdo limpio con Categorías → Escalas → Raíz → Audio → Tempo+Play → Exportar WAV → Escala Actual.

**Samples v16.1:** Ruta `/samples/pad piano/`, 48kHz mono Vorbis, duración corta (~2s), release ajustado a 1.5s
**Modo Acorde (v21.0):**
- Polígono neón dorado `stroke="#FFD700" strokeWidth="3.0"` filtro `neonGlow` (blur1=1.5, blur2=3)
- Relleno con gradiente diagonal (`chordGradient`: #7ea1f5→#4a90d9), fillOpacity=1 (opaque al completar)
- Orden de renderización DOM: relleno primero (fondo), neón después (encima)
- Texto centrado interior en blanco puro (#ffffff): grado romano, nombre acorde, notas
- Título de escala encima del círculo (solo modo acorde): `scaleName.replace(/\s*\(Acoustic\)\s*/g, '').trim()` a y="25" dentro de `<g transform="translate(0, 25)">`
- **Octavas dinámicas (v21.0):** buildChord() calcula octavas basadas en MIDI comparison para progresión ascendente — cada nota más aguda que la precedente

**buildChord() v21.0:**
- Antes: `toneJsOctave = 4` fijo → notas saltaban octava incorrectamente
- Ahora: pre-calcula `chordOctaves[]` comparando MIDI numbers con nota precedente
- Si `baseMidi <= lastMidi`: sube a octava 5 para mantener progresión ascendente

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

## 🏁 CIERRE DE SESIÓN — 2026-06-08 (v21.6)
- **Versión alcanzada:** v21.6
- **Cambio principal:** Fix ruta de conexión reverb campana (gainNode→convolver en lugar de oscillator→convolver) + parámetros catedral ajustados
- **Tests:** ✅ TypeScript compilation OK
- **Archivos modificados:** `src/lib/audioExport.ts`, `PROJECT_MEMORY.md`
- **Estado:** ✅ Cola de resonancia eterna resuelta — reverb catedral funcional con valores reducidos (decay=2.0s, wet=0.6)
- **Listo para commit** — mensaje: "fix: gainNode→convolver ruta reverb campana + parámetros catedral ajustados (v21.6)"

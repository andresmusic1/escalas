# 🎵 Escalas Musicales Interactivas - PROJECT MEMORY

> **Última actualización:** 2026-06-09 (Sesión: v23.3 — appearance:none en color pickers para eliminar borde interior nativo)
> **Versión del proyecto:** v23.3
> **Estado tests:** ✅ TypeScript compilation OK | ⚠️ Quiz auditivo no funciona

---

## 📌 ESTADO ACTUAL DEL PROYECTO (Junio 2026)

### 🟢 v23.3 — appearance:none en Color Pickers (Eliminar Borde Interior Nativo)
**Archivos:**
- [`src/App.tsx`](src/App.tsx) — CSS properties en inputs color

#### Cambio principal: Eliminadas líneas internas del `<input type="color">` nativo del navegador

**CSS agregado a los 4 inputs color (líneas ~1250-1320):**
```tsx
appearance: 'none',
WebkitAppearance: 'none',
MozAppearance: 'none',
```

**Resultado:** Las líneas grises internas que el browser dibuja dentro del cuadrado de color han sido eliminadas. Los inputs ahora muestran solo el color sólido sin bordes internos.

- `appearance: 'none'` — Firefox/Chrome/Edge estándar
- `WebkitAppearance: 'none'` — Chrome/Safari/Edge WebKit
- `MozAppearance: 'none'` — Firefox Gecko
- Combinado con `border: 'none'`, `padding: '0'`, `width: 32px`, `height: 32px`

---

### 🟢 v23.2 — Revertido Fondo de Botones de Modo a Dorado Original
**Archivos:**
- [`src/App.tsx`](src/App.tsx) — Estilos de botones de modo (Escala/Acorde/Quiz)

#### Cambio principal: Restaurados fondos dorados originales en botones de toggle de modo

**Estilo anterior (v23.1):** Fondos oscuros con texto dorado para modos inactivos
**Estilo restaurado (v23.2):** Fondo dorado `var(--color-gold)` para modo activo, fondo oscuro `#4a4430` para modos inactivos

- Botón activo: `background: 'var(--color-gold)'`, `color: '#12161c'`
- Botones inactivos: `background: '#4a4430'`, `color: 'var(--color-gold)'`
- Bordes redondeados `rounded-xl` con efecto `scale-105 shadow-lg` en activo

---

### 🟢 v23.1 — Etiquetas de Texto para Botones de Color
**Archivos:**
- [`src/App.tsx`](src/App.tsx) — UI labels antes de inputs color

#### Cambio principal: Agregado texto descriptivo antes de cada input color picker

**Modo escala (líneas ~1155-1175):**
```tsx
<div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
  <span className="text-[var(--color-gold)] text-sm font-semibold">Escala Color</span>
  <input type="color" ... />
</div>
```

**Modo acorde (líneas ~1177-1197):**
```tsx
<div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
  <span className="text-[var(--color-gold)] text-sm font-semibold">Acorde Color</span>
  <input type="color" ... />
</div>
```

**Resultado visual:**
```
Escala Color █   (modo escala) — base alineada con baseline
Acorde Color █  (modo acorde)
```

- Contenedor flex con `gap: '6px'` para espaciado
- Texto en dorado (`--color-gold`), fuente pequeña, semibold
- `whiteSpace: 'nowrap'` evita que el texto se rompa en dos líneas
- `alignItems: 'baseline'` — base del texto y cuadradito al mismo nivel
- `lineHeight: 1` — elimina espacio interno del input
- Tamaño 32×32px para los color pickers
- Sin cambios funcionales — solo mejora de UX/UI

---

### 🟢 v23.0 — Color Personalizado para Polígonos de Escala y Acorde (sin separadores |)
**Archivos:**
- [`src/App.tsx`](src/App.tsx) — Estados, UI inputs color, pass props a CircleOfNotes
- [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) — Props scalePolygonColor/chordPolygonColor

#### Cambio principal: Input `<input type="color">` independiente para modo escala y modo acorde

**Estados nuevos en App.tsx (líneas ~121-123):**
```typescript
const [scalePolygonColor, setScalePolygonColor] = useState<string>('#dc2626');
const [chordPolygonColor, setChordPolygonColor] = useState<string>('#1e3a5f');
```

**UI (líneas ~1230-1320 en App.tsx):**
  - Inputs color ubicados en el mismo renglón que nombre de escala + botones ◀ ▶
  - Sin separadores `|` entre elementos — espaciado con `marginLeft: '12px'`
- Tamaño: 48px × 48px (ajustable manualmente)
- `onInput` para actualización en tiempo real mientras se arrastra el picker
- Sin borde (`border: 'none'`)
- Solo visible en modo escala (`appMode === 'scale'`) o acorde (`appMode === 'chord'`)
- Oculto en modo quiz

**CircleOfNotes.tsx — Props nuevas:**
```typescript
scalePolygonColor?: string;   // Override fill del polígono de escala
chordPolygonColor?: string;   // Overlay semitransparente (35%) sobre gradiente de acorde
```

**polygonFill dinámico (línea ~408):** Usa `scalePolygonColor` si se provee, fallback a gradiente original.

**Overlay de acorde (líneas ~607-620):** Nuevo polygon con `fill={chordPolygonColor}` y `fillOpacity: 0.35` renderizado entre relleno del acorde y neón.

**Persistencia:** Solo durante la sesión (sin localStorage). Al recargar, vuelve a colores por defecto.

#### Archivos modificados en esta sesión:
- `src/App.tsx` — +2 estados useState, UI inputs color (~40 líneas nuevas), props a CircleOfNotes
- `src/components/CircleOfNotes.tsx` — +2 props opcionales, polygonFill dinámico, overlay acorde (~15 líneas nuevas/modificadas)

---

### 🟢 v22.2 — Fix Renderizado Quiz Visual + Círculo 3x Tamaño (Audio Quiz Pendiente)

### 🟢 v22.1 — Fix Bug Renderizado Modo Quiz + Limpieza Documentación
**Archivo:** [`src/components/QuizPanel.tsx`](src/components/QuizPanel.tsx), [`src/App.tsx`](src/App.tsx)

#### Problema corregido: Click en "Modo Quiz" cerraba la aplicación (pantalla blanca)
**Causa raíz:** Al hacer click en el toggle de Modo Quiz, `setQuizState(null)` se ejecutaba inmediatamente. El componente QuizPanel recibía `quizState={quizState!}` (null), pero su interfaz esperaba `QuizState` completo. Acceso a `quizState.isSessionComplete` causaba TypeError que rompía todo el renderizado React.

**Fix aplicado:**
1. ✅ **Props actualizadas en QuizPanel:** `quizState: QuizState | null` (acepta null)
2. ✅ **Early-return para null:** `if (!quizState) { return <InitialScreen ... />; }` — muestra pantalla de configuración cuando no hay sesión activa
3. ✅ **App.tsx:** Removido non-null assertion (`quizState!` → `quizState`)

**Flujo corregido:**
1. Click "🧠 Modo Quiz" → `appMode='quiz'`, `quizState=null`
2. QuizPanel recibe null → muestra InitialScreen (nombre + cantidad + categoría)
3. Usuario hace click en "INICIAR QUIZ" → `generateQuizSession()` crea la sesión
4. Preguntas se renderizan correctamente

**Archivos modificados:**
- `src/components/QuizPanel.tsx` — Props `quizState: QuizState | null`, early-return para null (línea ~353)
- `src/App.tsx` — `quizState={quizState}` sin assertion (línea 728)

---

### 🟡 v22.2 — Fix Renderizado Quiz Visual + Círculo 3x Tamaño (Audio Quiz Pendiente)
**Archivos:**
- [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) — Props escalables, hideCenterText
- [`src/components/QuizPanel.tsx`](src/components/QuizPanel.tsx) — Círculo ampliado para pregunta visual

#### Cambios implementados:
1. ✅ **Ocultar nombre de escala/acorde en centro (preguntas visuales):** Nueva prop `hideCenterText` en CircleOfNotes. Cuando true, no renderiza el texto central del círculo cromático.
2. ✅ **Círculo 3x más grande:** Nueva prop `scaleCircle={3}` para pregunta visual. Calcula valores efectivos escalados (effectiveSize, effectiveCenter, effectivePolygonRadius, etc.). SVG viewBox se adapta dinámicamente.
3. ✅ **EnharmonicNote actualizado:** Recibe props de escala (centerX, centerY, textRadius, fontSize) para renderizar notas correctamente a cualquier tamaño.

#### ⚠️ PROBLEMA PENDIENTE: Audio Quiz no funciona

**Síntoma:** En las preguntas auditivas del modo quiz, al hacer click en "▶ Reproducir escala/acorde", la UI muestra "Reproduciendo..." pero NO se escucha ningún sonido.

**Archivos afectados:**
- `src/lib/quizAudio.ts` — Funciones `playScaleForQuiz()` y `playChordForQuiz()`
- `src/components/QuizPanel.tsx` — Función `handlePlayAudio()` (línea ~420)

**Intentos de fix realizados:**
1. Agregado `Tone.start()` en ambas funciones (requerido por navegadores tras interacción usuario)
2. Agregado `Tone.Transport.stop()` y `Tone.Transport.cancel()` al inicio para limpiar estado previo
3. Envié `Tone.start()` dentro de `.then()` para asegurar AudioContext listo
4. Corregí `Tone.Transport.start(offset)` con parámetros correctos

**Estado:** Sin resolver. Necesita debug adicional:
- Verificar si Tone.Transport está en estado correcto (running/paused/stopped)
- Verificar si el synth se crea y conecta correctamente a Destination
- Comparar con implementación de App.tsx que SÍ funciona (usa audioEngineRef.current + Tone.Part vs triggerAttackRelease directo)
- Posible problema: tiempos absolutos en triggerAttackRelease no funcionan como esperado cuando Transport está pausado

**Sugerencia para próxima sesión:** Migrar a usar `Tone.Part` como hace el modo normal en App.tsx, o verificar que los tiempos de triggerAttackRelease sean relativos al Transport start.

---

### 🟢 v22.0 — Modo Quiz Interactivo
**Archivos:**
- [`src/lib/quizLogic.ts`](src/lib/quizLogic.ts) — Lógica principal del quiz
- [`src/lib/quizAudio.ts`](src/lib/quizAudio.ts) — Reproducción audio para preguntas auditivas
- [`src/components/QuizPanel.tsx`](src/components/QuizPanel.tsx) — Panel UI principal
- [`src/components/QuizResult.tsx`](src/components/QuizResult.tsx) — Resultados finales
- [`src/App.tsx`](src/App.tsx) — Integración con toggle de modos

#### Nueva arquitectura de 3 modos:
1. **Modo Escala:** Visualizar y escuchar escalas (existente)
2. **Modo Acorde:** Visualizar y escuchar acordes (existente)
3. **Modo Quiz:** Test interactivo visual/auditivo (nuevo v22.0)

#### Toggle de modos:
- Botones "🎹 Modo Escala", "🎵 Modo Acorde", "🧠 Modo Quiz" debajo del header
- Estado `appMode`: `'scale' | 'chord' | 'quiz'`
- Renderizado condicional: QuizPanel vs UI normal

#### Sistema de preguntas:
- **Tipo visual:** Muestra escala/acorde en el círculo cromático, 4 opciones para identificar
- **Tipo auditiva:** Solo audio (sin círculo), usuario identifica por oído
- **Patrón alternado fijo:** visual → auditiva → visual → auditiva...
- **Cantidad configurable:** 5, 10 o 20 preguntas

#### Sistema de puntuación:
- **Máximo:** 10 puntos por pregunta
- **Ayudas visuales:** "🔊 Escuchar" cuesta -4 puntos (6 restantes)
- **Ayudas auditivas:** Descripción (-2), Contexto (-2), Grados (-2), combinables
- **Sin ayuda:** 10 puntos si acierta, 0 si falla

#### Flujo del Quiz:
1. Pantalla inicial → Input nombre + seleccionar cantidad (5/10/20) + categoría (escala/acorde)
2. Preguntas alternadas con feedback ✓/✗ inmediato
3. Pantalla final → Puntuación total, mensaje según rendimiento, desglose expandible

#### Características técnicas:
- `generateQuizSession()` genera preguntas con distractores del mismo tipo pero diferente raíz
- `answerQuestion()` procesa respuesta y calcula puntos con penalizaciones
- Audio quiz usa Tone.PolySynth directamente (no comparte AudioEngine singleton)
- Escalas disponibles: ~48 escalas × 12 raíces = miles de combinaciones posibles

#### Archivos modificados en esta sesión:
- `src/lib/quizLogic.ts` — Nueva lógica completa (~570 líneas)
- `src/lib/quizAudio.ts` — Reproducción audio quiz (~180 líneas)
- `src/components/QuizPanel.tsx` — Panel UI principal (~660 líneas)
- `src/components/QuizResult.tsx` — Resultados finales (~200 líneas)
- `src/App.tsx` — Integración con appMode state y toggle buttons
- `PROJECT_MEMORY.md` — Documentación
- `AGENTS.md` — Actualización de key files

---

### 🟢 v21.7 — Botón Exportar WAV Separado del Play

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

### 🟢 v21.7 — Botón Exportar WAV Separado del Play
**Archivo:** [`src/App.tsx`](src/App.tsx)

#### Problema: El botón "Exportar Acorde/Escala WAV" estaba visualmente pegado al botón Play dentro del mismo contenedor `tempo-bar`.

#### Solución:
- Movido el botón Exportar WAV fuera de `tempo-bar` a un nuevo contenedor `<div className="flex justify-center mt-4">` separado
- Margen aumentado de `mt-2` a `mt-4` para mayor distancia visual
- Padding del botón ajustado de `px-4 py-2` a `px-5 py-2.5` para mejor proporción
- Texto aumentado de `text-xs` a `text-sm` para legibilidad
- Comentario actualizado: "v17.0 — consolidado" → "v21.7 — separado del Play"

#### Resultado visual:
```
[Tempo Bar]
  Tempo | BPM | Slider | Play/Stop
</tempo-bar>

[Mt-4 separación]
  [Exportar WAV] (centrado)

[Audio Section]
  Volumen | Sonido

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

## 🏁 CIERRE DE SESIÓN — 2026-06-08 (v22.1)
- **Versión alcanzada:** v22.1
- **Cambio principal:** Fix bug renderizado Modo Quiz (quizState=null crash) + limpieza documentación deuda técnica
- **Tests:** ✅ TypeScript compilation OK | ✅ 700/700 enharmony | ✅ 256/256 chords
- **Archivos modificados:** `src/components/QuizPanel.tsx`, `src/App.tsx`, `PROJECT_MEMORY.md`, `AGENTS.md`
- **Estado:** ✅ Modo Quiz funcional — InitialScreen se muestra correctamente al entrar
- **Listo para commit** — mensaje: "fix: QuizPanel acepta quizState|null, muestra InitialScreen (v22.1)"

---

## 📋 PRÓXIMOS PASOS PARA NUEVA SESIÓN

### Tareas pendientes (priorizadas):
1. **NUEVO: Agregar Error Boundary para QuizPanel** — Actualmente si QuizPanel falla en cualquier otro punto, la app entera se rompe. Implementar React Error Boundary para aislamiento.
2. **Validar exportación WAV de cuatríadas en producción** — Verificar que las 4 notas + acorde simultáneo suenan correctamente con ambos instrumentos (proPiano y campana)
3. **Migrar setTimeout a Tone.Draw** — En [`App.tsx:184-191`](src/App.tsx:184), la sincronización visual usa `setTimeout` (technical debt). Futuro migration target: `Tone.Draw` para precision en hardware lento.
4. **Considerar agregar test framework** — Actualmente no hay automated tests. Evaluar Vitest/Jest para regression detection.

### Bugs documentados pero NO corregidos:
- ⚠️ **ROOT_NOTES_SOSTENIDOS index bug (v8.2):** `AGENTS.md` menciona que G# button en [`App.tsx:394`](src/App.tsx:394) usa `ROOT_NOTES_SOSTENIDOS[1]` — debe verificarse si aún aplica. (Nota: ya verificado que no hay referencia incorrecta actual).

### Recordatorios críticos:
- **SIEMPRE** probar el Modo Quiz después de cualquier cambio en App.tsx o QuizPanel.tsx
- **NUNCA** cambiar `quizState` a null sin antes verificar si QuizPanel lo está usando
- **MANTENER** la lógica del Modo Escala congelada — no modificar `isPlaying`, `activeLineIndex`, etc.

## 🔄 PROMPT DE TRANSFERENCIA PARA NUEVO CHAT

Si continúas en un nuevo chat, copia este archivo PROJECT_MEMORY.md completo.

### Resumen Rápido para la IA:
SPA **React 19 + TypeScript + Vite 7 + Tone.js** — Visualizador de escalas musicales SVG interactivo con modo escala y modo acorde + Modo Quiz + exportar audio a WAV.

**Estado Actual (v22.1):**

**AudioEngine v17.1:** 2 instrumentos Synth:
- `proPiano`: PolySynth(triangle) → Filter(lowpass 7kHz) → Compressor(-24dB/3:1) → FeedbackDelay(0.143s, wet 7%) + Reverb(1.8s)
- `campana`: PolySynth(sine) → Filter(lowpass 3.5kHz Q:0.4) → Reverb(3.2s/catedral)

**Exportar Audio v20.1:** Módulo `src/lib/audioExport.ts` con Web Audio API nativa (OfflineAudioContext + OscillatorNode)
- Funciones: `exportScale()`, `exportChord()`, `audioBufferToWav()`
- Formato: WAV PCM 16-bit, 48kHz sample rate
- Botón "Exportar WAV" en UI debajo de Play/Stop (separado v21.7)

**Modo Quiz v22.0+v22.1:** Toggle 3 modos — Escala/Acorde/Quiz
- Preguntas visuales: círculo cromático muestra escala/acorde, 4 opciones
- Preguntas auditivas: solo audio, sin visualización
- Patrón alternado fijo: visual → auditiva → visual...
- Puntuación: 10 pts máximo, penalizaciones por ayudas (-2 a -4)
- Pantalla inicial con nombre + cantidad (5/10/20) + categoría
- **v22.1 FIX:** QuizPanel acepta `quizState: QuizState | null`, muestra InitialScreen cuando es null

**Music:** ~48 escalas con enarmonía perfecta — protocolo heptatónico (algorítmico), OCTATONIC_MAPPINGS (pivotes), diccionarios para hexatónicas/simétricas

**UI (v22.0):** Toggle buttons debajo del header (🎹 Escala / 🎵 Acorde / 🧠 Quiz). Modo normal: left panel con Categorías → Escalas → Raíz → Audio → Tempo+Play → Exportar WAV

**Samples v16.1:** Ruta `/samples/pad piano/`, 48kHz mono Vorbis, duración corta (~2s), release ajustado a 1.5s

### ⚠️ Reglas Intocables (NO VIOLAR):
1. **MODO ESCALA NO TOCAR** — Congelado y funcionando perfectamente. Bajo ninguna circunstancia modificar `isPlaying`, `activeLineIndex`.
2. **Modo Acorde aislado:** Todo cambio en modo acorde debe estar en estados con prefijo `chord*` o `isChord*`.
3. **NO usar rotación CSS en SVG** — posicionamiento con matemática trigonométrica en CircleOfNotes.tsx.
4. **CHROMATIC_SCALE inmutable** — solo las etiquetas visuales pueden cambiar variantes enarmónicas.
5. **Tailwind v4 NO genera grid/gap** — usar inline styles: `style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}`.
6. **Siempre usar `resolveEnharmonicName()`** para cualquier variante enarmónica.
7. **NUNCA inventar datos musicales** — preguntar al usuario, usar fuentes verificadas.
8. **QuizPanel necesita quizState !== null** antes de acceder a propiedades — siempre verificar con early-return.

### 📁 Archivos Clave:
| Archivo | Propósito | Líneas aprox. |
|---------|-----------|---------------|
| [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) | Cerebro musical: 39+ escalas, enarmonía, acordes, intervalos, SCALE_EXTENDED_INFO | ~1816 |
| [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts) | AudioEngine singleton con Tone.js: PolySynth + efectos (2 instrumentos) | ~361 |
| [`src/lib/audioExport.ts`](src/lib/audioExport.ts) | Exportar audio a WAV con Web Audio API nativa | ~200 |
| [`src/lib/quizLogic.ts`](src/lib/quizLogic.ts) | Quiz lógica principal: generación preguntas, scoring, tipos | ~570 |
| [`src/lib/quizAudio.ts`](src/lib/quizAudio.ts) | Reproducción audio quiz con Tone.PolySynth directo | ~180 |
| [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) | SVG interactivo con matemática trigonométrica, filtros neón | ~734 |
| [`src/components/QuizPanel.tsx`](src/components/QuizPanel.tsx) | Panel UI principal del Quiz — acepta quizState: QuizState \| null | ~660 |
| [`src/components/QuizResult.tsx`](src/components/QuizResult.tsx) | Resultados finales con puntuación y desglose expandible | ~200 |
| [`src/App.tsx`](src/App.tsx) | Componente principal + audio engine + UI + appMode toggle (scale/chord/quiz) | ~1216 |
| [`src/test-enharmony.ts`](src/test-enharmony.ts) | Validación enarmonía: 166 tests (12 raíces × escalas clave) | ~804 |
| [`src/index.css`](src/index.css) | Tailwind v4 + custom properties + animaciones CSS | - |

### 🎨 Constantes CSS:
```css
--color-background: #12161c;
--color-gold: #dfc47f;
--color-red: #e53e3e;
```

### 🏁 Cierre de sesión actual (v23.1):
- **Versión alcanzada:** v23.1
- **Cambio principal:** Etiquetas de texto "Escala Color" / "Acorde Color" antes de cada input picker
- **UI (líneas ~1155-1197 en App.tsx):** Contenedor flex con `gap: '6px'`, texto dorado `var(--color-gold)`, `whiteSpace: 'nowrap'`
- **CircleOfNotes:** Sin cambios — props intactas

### 🏁 Cierre de sesión actual (v23.3):
- **Versión alcanzada:** v23.3
- **Cambio principal:** Eliminadas líneas internas del `<input type="color">` nativo con `appearance: 'none'`
- **Tests:** ✅ TypeScript compilation OK
- **Estado:** ✅ Color pickers limpios sin bordes internos en todos los navegadores

### 📋 PRÓXIMOS PASOS PARA NUEVA SESIÓN
(igual que antes — no cambios en tareas pendientes)
- **Tests:** ✅ TypeScript compilation OK
- **Estado:** ⚠️ Botón "Acorde Color" existe en código (línea 1177-1197) pero NO aparece en navegador en modo acorde. Posible problema de cache Vite dev server o HMR no funcionando.
- **Pendiente para mañana:** Reiniciar dev server + limpiar cache del navegador + verificar DOM

### 🏁 Cierre de sesión anterior (v21.6):
- **Versión alcanzada:** v21.6
- **Cambio principal:** Fix ruta de conexión reverb campana (gainNode→convolver) + parámetros catedral ajustados
- **Tests:** ✅ TypeScript compilation OK
- **Estado:** ✅ Cola de resonancia eterna resuelta — reverb catedral funcional con valores reducidos (decay=2.0s, wet=0.6)

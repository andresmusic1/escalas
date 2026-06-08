# Plan: Corregir Exportación Audio a WAV — v17.2

## Diagnóstico del Problema

El archivo WAV se descarga (~900KB) pero está completamente mudo. Los logs confirman que las notas se programan correctamente dentro de `Tone.Offline`, pero el audio renderizado es silencio absoluto.

### Análisis Comparativo: Reproducción Real vs Offline

| Aspecto | Reproducción Real (playScale/playChordTravel) | Exportación Actual (exportAudio) |
|---------|-----------------------------------------------|----------------------------------|
| **Motor de audio** | `audioEngineRef.current.playNote(freq, duration, time)` — usa AudioEngine singleton con Synth + efectos | `synth.triggerAttackRelease(noteName, duration, time)` — PolySynth directo |
| **Sincronización temporal** | `Tone.Part` con `scheduleCallback` programado en `Tone.Transport` | `triggerAttackRelease` con tiempo absoluto sin Transport |
| **Contexto de audio** | AudioContext activo del navegador | Tone.Offline crea contexto aislado |
| **Efectos** | Compresor, Delay, Reverb via AudioEngine chain | Sin efectos (cadena simplificada) |

### Root Cause Identificado

`Tone.Offline` en Tone.js v15 requiere que el audio se programe usando `Tone.Part` o `Tone.Transport.schedule`, NO `triggerAttackRelease` con tiempo absoluto dentro del callback. El callback de `Tone.Offline` crea un contexto aislado donde los objetos Tone.js no comparten el mismo Transport que el AudioContext activo.

---

## Arquitectura de la Solución

```
handleExportAudio() [App.tsx]
    │
    ├─ await Tone.start()                    ← Inicializar audio context
    │
    └─ if (escala) → exportScale()
    └─ if (acorde) → exportChord()
                │
                └─ exportAudio(notes, instrumentId, duration) [audioExport.ts]
                            │
                            ├─ Crear Tone.Part con datos de notas programadas en Transport
                            ├─ Dentro de Tone.Offline(callback, duration):
                            │   │
                            │   ├─ const synth = new Tone.PolySynth(...)
                            │   ├─ synth.toDestination()
                            │   ├─ synth.volume.value = -5
                            │   │
                            │   ├─ const partData = notes.map((n, i) => [i * duration, n.noteName])
                            │   ├─ const part = new Tone.Part(scheduleFn, partData)
                            │   ├─ part.start(0)
                            │   │
                            │   ├─ Tone.Transport.start()         ← Iniciar Transport offline
                            │   └─ (esperar duración total)
                            │       Tone.Transport.stop()
                            │       synth.dispose()
                            │
                            └─ audioBufferToWav(audioBuffer) → Blob WAV descargable
```

---

## Plan de Implementación

### Paso 1: Reescribir `exportAudio()` en [`audioExport.ts`](src/lib/audioExport.ts)

**Archivo:** `src/lib/audioExport.ts`  
**Líneas objetivo:** 116-162

Cambiar la implementación para usar `Tone.Part` dentro de `Tone.Offline`:

```typescript
export async function exportAudio(options: ExportAudioOptions): Promise<Blob> {
  const { notes, instrumentId, sampleRate = 48000 } = options;

  if (notes.length === 0) {
    throw new Error('No hay notas para exportar');
  }

  await Tone.start();

  const noteDurationSeconds = options.notes[0]?.duration ?? 0.5;
  const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);

  // Usar Tone.Part dentro de Tone.Offline — API correcta para scheduling offline
  const audioBuffer = await Tone.Offline(async () => {
    // PolySynth básico sin efectos (compatible con offline)
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.003, decay: 0.4, sustain: 0.1, release: 1.0 },
    });

    synth.toDestination();
    synth.volume.value = -5;

    // Construir datos para Tone.Part: [tiempoEnTransport, notaName]
    const partData: Array<[number, string]> = notes.map((note, i) => [
      i * noteDurationSeconds,
      note.noteName
    ]);

    // Schedule function que recibe time del Transport
    const scheduleFn = (time: number, noteName: string) => {
      synth.triggerAttackRelease(noteName, noteDurationSeconds, time);
    };

    // Tone.Part maneja el scheduling automáticamente en el Transport
    const part = new Tone.Part(scheduleFn, partData);
    part.start(0);

    // Iniciar y detener el Transport offline
    Tone.Transport.start();
    
    // Esperar a que todo el audio se procese
    await new Promise(resolve => {
      Tone.Transport.on('stop', resolve);
      Tone.Transport.stop(totalDuration + 1);
    });

    part.dispose();
    synth.dispose();
  }, totalDuration + 0.5, sampleRate);

  return audioBufferToWav(audioBuffer);
}
```

### Paso 2: Verificar `audioBufferToWav()` en [`audioExport.ts`](src/lib/audioExport.ts)

**Archivo:** `src/lib/audioExport.ts`  
**Líneas objetivo:** 14-41

Verificar que la conversión a WAV sigue funcionando correctamente. Esta función ya opera sobre el `AudioBuffer` nativo y no depende del método de renderizado. **Sin cambios esperados.**

### Paso 3: Mantener `exportScale()` y `exportChord()` intactos

**Archivo:** `src/lib/audioExport.ts`  
**Líneas objetivo:** 172-260

Estas funciones ya construyen correctamente el array de `notes` con `noteName`, `frequency` y `duration`. Solo necesitan pasar al nuevo `exportAudio()`. **Sin cambios.**

### Paso 4: Actualizar UI en [`App.tsx`](src/App.tsx)

**Archivo:** `src/App.tsx`  
**Líneas objetivo:** 472-481

Mantener el force de `'proPiano'` como instrumento para exportación (garantiza PolySynth sin dependencias de samples):

```typescript
// Exportar escala/acorde — forzar proPiano (PolySynth) para Tone.Offline
blob = await exportScale(scaleData, 'proPiano' as InstrumentId, noteDuration);
```

---

## Archivos Modificados

| Archivo | Cambio | Líneas estimadas |
|---------|--------|------------------|
| `src/lib/audioExport.ts` | Reescribir `exportAudio()` con Tone.Part | ~116-162 (46 líneas) |
| `src/App.tsx` | Verificar force de proPiano | ~472-481 (9 líneas, ya aplicado) |

---

## Criterios de Éxito

1. [ ] TypeScript compilation: `npx tsc --noEmit` sin errores
2. [ ] Botón "Exportar Escala WAV" genera archivo con audio audible
3. [ ] Botón "Exportar Acorde WAV" genera archivo con audio audible
4. [ ] El WAV reproduce correctamente en cualquier reproductor de audio
5. [ ] No se pierden notas del arpegio en modo acorde
6. [ ] La nota raíz octavada al final se incluye correctamente

---

## Riesgos y Consideraciones

- **Duración de notas:** `exportScale` y `exportChord` pueden enviar arrays con duraciones variables (la nota final tiene `duration * 0.5`). El cálculo de `noteDurationSeconds` debe usar el primer elemento del array.
- **Acorde con arpegio:** `exportChord` envía notas secuenciales + acorde simultáneo. Tone.Part soporta múltiples notas al mismo tiempo mediante el mismo scheduling mechanism.
- **Mismo sampleRate:** El tercer parámetro de `Tone.Offline(callback, duration, sampleRate)` debe pasarse correctamente para que coincida con la conversión WAV.

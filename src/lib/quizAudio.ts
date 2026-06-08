/**
 * quizAudio.ts — Reproducción de audio para preguntas auditivas del Quiz v22.0
 * 
 * Reproduce escalas y acordes usando Tone.PolySynth directamente.
 * Las funciones aceptan callbacks para integrar con React state.
 */

import * as Tone from 'tone';

// ============================================================================
// Constantes de reproducción
// ============================================================================

/** Duración por nota en arpegio (en beats) */
const ARPEGGIO_DURATION = 0.5;

/** Tiempo adicional para la cola del acorde */
const CHORD_RELEASE_TIME = 2.0;

// ============================================================================
// Funciones auxiliares de conversión
// ============================================================================

/** Convierte MIDI number a frecuencia en Hz (440 = A4) */
function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// ============================================================================
// Reproducción de Escala (Ascendente + Descendente)
// ============================================================================

/**
 * Reproduce una escala en modo ascendente + descendente.
 * 
 * @param scaleNotes — Array de índices de semitonos desde C (0-11)
 * @param bpm — Tempo en beats per minute
 */
export function playScaleForQuiz(
  rootIndex: number,
  scaleNotes: number[],
  instrument: 'triangle' | 'sine',
  bpm: number = 120,
  onComplete?: () => void
): void {
  // Detener cualquier transporte previo para evitar conflictos con otros modos
  Tone.Transport.stop();
  Tone.Transport.cancel();

  // Asegurar que el AudioContext esté activo (requerido por navegadores)
  Tone.start().then(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: instrument },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.8,
      },
    }).toDestination();

    // Calcular notas (octava 4)
    const allNotes: { freq: number; time: number }[] = [];
    let currentTime = 0;
    const beatDuration = 60 / bpm;

    // Ascendente
    for (const note of scaleNotes) {
      const midiNum = 60 + rootIndex + ((note + rootIndex) % 12 < rootIndex ? 12 : 0);
      allNotes.push({ freq: midiToFrequency(midiNum), time: currentTime });
      currentTime += beatDuration * ARPEGGIO_DURATION;
    }

    // Descendente (sin repetir raíz final)
    const descend = [...scaleNotes].reverse().slice(1);
    for (const note of descend) {
      const midiNum = 60 + rootIndex + ((note + rootIndex) % 12 < rootIndex ? 12 : 0);
      allNotes.push({ freq: midiToFrequency(midiNum), time: currentTime });
      currentTime += beatDuration * ARPEGGIO_DURATION;
    }

    // Programar notas usando schedule (confiable con Tone.Transport)
    Tone.Transport.bpm.value = bpm;
    
    for (const note of allNotes) {
      synth.triggerAttackRelease(note.freq, '8n', note.time);
    }

    // Iniciar transporte desde segundo 0
    Tone.Transport.start(undefined, currentTime + CHORD_RELEASE_TIME);
    
    const totalTimeMs = (currentTime + CHORD_RELEASE_TIME) * 1000;
    setTimeout(() => {
      Tone.Transport.stop();
      synth.dispose();
      onComplete?.();
    }, totalTimeMs);
  });
}

// ============================================================================
// Reproducción de Acorde
// ============================================================================

/**
 * Reproduce un acorde con notas simultáneas + ligero arpegio.
 */
export function playChordForQuiz(
  rootIndex: number,
  chordNotes: number[],
  instrument: 'triangle' | 'sine',
  bpm: number = 120,
  onComplete?: () => void
): void {
  // Detener cualquier transporte previo para evitar conflictos con otros modos
  Tone.Transport.stop();
  Tone.Transport.cancel();

  // Asegurar que el AudioContext esté activo (requerido por navegadores)
  Tone.start().then(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: instrument },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: CHORD_RELEASE_TIME,
      },
    }).toDestination();

    Tone.Transport.bpm.value = bpm;

    // Notas simultáneas con ligero arpegio inicial
    const beatDuration = 60 / bpm;
    for (let i = 0; i < chordNotes.length; i++) {
      const note = chordNotes[i];
      const midiNum = 60 + rootIndex + ((note + rootIndex) % 12 < rootIndex ? 12 : 0);
      const time = i * beatDuration * 0.15; // arpegio muy rápido
      synth.triggerAttackRelease(midiToFrequency(midiNum), '4n', time);
    }

    Tone.Transport.start(undefined, CHORD_RELEASE_TIME + chordNotes.length * beatDuration * 0.15);
    
    setTimeout(() => {
      Tone.Transport.stop();
      synth.dispose();
      onComplete?.();
    }, (CHORD_RELEASE_TIME + chordNotes.length * beatDuration * 0.15) * 1000);
  });
}

// ============================================================================
// Utilidades
// ============================================================================

/** Detiene cualquier reproducción en curso */
export function stopQuizAudio(): void {
  Tone.Transport.stop();
  Tone.Transport.cancel();
}

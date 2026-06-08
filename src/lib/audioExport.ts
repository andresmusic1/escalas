import type { MusicalNote } from './musicLogic';

// ============================================================
// Exportación de Audio — v20.0 (Web Audio API nativa pura)
// Enfoque: Web Audio API directa SIN Tone.js para scheduling.
// CAUSA RAÍZ v18.0-v19.0: Tone.Transport y Tone.Part NO funcionan
// correctamente dentro de Tone.Offline en Tone.js v15.x — las notas
// se programan pero el audio renderizado es mudo.
// Solución: Usar OscillatorNode + GainNode directamente con
// OfflineAudioContext para renderizar sin intermediarios.
// ============================================================

/**
 * Convierte nombre de nota musical (C4, D#5, etc.) a frecuencia en Hz.
 * A4 = 440Hz como referencia.
 */
function noteNameToFrequency(noteName: string): number {
  // Soporte completo: bemoles Y sostenidos. Los bemoles van primero para que
  // indexOf('Eb') devuelva 3 (no -1). Si la nota tiene #, se busca en segunda posición.
  const noteNamesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const noteNamesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) {
    throw new Error(`Nota inválida para exportación: ${noteName}`);
  }
  
  const noteLetter = match[1];
  const octave = parseInt(match[2]);
  
  // Buscar primero por bemol, luego por sostenido (ambos mapean al mismo MIDI index)
  let noteIndex = noteNamesFlat.indexOf(noteLetter);
  if (noteIndex === -1) {
    noteIndex = noteNamesSharp.indexOf(noteLetter);
  }
  if (noteIndex === -1) {
    throw new Error(`Nota no reconocida en exportación: ${noteLetter}`);
  }
  
  const midiNumber = (octave + 1) * 12 + noteIndex;
  
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

/**
 * Convierte Float32Array a formato WAV estándar (PCM 16-bit).
 */
function floatToWav(samples: Float32Array, length: number, sampleRate: number, numChannels: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Convertir Float32 a Int16
  let pos = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(pos, intSample, true);
    pos += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ============================================================
// Funciones de exportación principal
// ============================================================

export interface ExportAudioOptions {
  notes: Array<{ noteName: string; duration: number }>;
  /** Notas que suenan simultáneamente (chord) — todas al mismo tiempo */
  chords?: Array<{ noteNames: string[]; duration: number }>;
  noteDurationSeconds?: number;
  /** Tipo de oscilador: 'triangle' (piano) o 'sine' (campana) */
  oscillatorType?: OscillatorType;
}

/**
 * Define los presets de sonido para exportación.
 */
interface SoundPreset {
  oscillatorType: OscillatorType;
  attackTime: number;
  decayRatio: number;
  sustainLevel: number;
  releaseTime: number;
  peakVolume: number;
}

const SOUND_PRESETS: Record<string, SoundPreset> = {
  proPiano: {
    oscillatorType: 'triangle',
    attackTime: 0.003,
    decayRatio: 0.6,
    sustainLevel: 0.15,
    releaseTime: 0.8,
    peakVolume: 0.5,
  },
  campana: {
    oscillatorType: 'sine',
    attackTime: 0.001,
    decayRatio: 0.9,
    sustainLevel: 0.0,
    releaseTime: 1.5,
    peakVolume: 0.4,
  },
};

/**
 * Renderiza un bloque de notas simultáneas (chord) con Web Audio API nativa.
 * Todos los osciladores comienzan al mismo tiempo y comparten envelope.
 */
function renderChordBlock(
  offlineCtx: OfflineAudioContext,
  noteNames: string[],
  startTime: number,
  duration: number,
  preset: SoundPreset
): void {
  for (const noteName of noteNames) {
    const frequency = noteNameToFrequency(noteName);
    
    // Crear oscilador para esta nota del acorde
    const oscillator = offlineCtx.createOscillator();
    oscillator.type = preset.oscillatorType;
    oscillator.frequency.value = frequency;
    
    // Crear nodo de ganancia — mismo envelope que las notas individuales
    const gainNode = offlineCtx.createGain();
    
    // Programa el envelope de ganancia
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(preset.peakVolume, startTime + preset.attackTime);
    const decayTime = duration * preset.decayRatio;
    gainNode.gain.exponentialRampToValueAtTime(Math.max(preset.sustainLevel * preset.peakVolume, 0.001), startTime + preset.attackTime + decayTime);
    
    const releaseStart = startTime + duration;
    gainNode.gain.setValueAtTime(Math.max(preset.sustainLevel * preset.peakVolume, 0.001), releaseStart);
    gainNode.gain.exponentialRampToValueAtTime(0.001, releaseStart + preset.releaseTime);
    
    // Conectar y programar
    oscillator.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    oscillator.start(startTime);
    oscillator.stop(releaseStart + preset.releaseTime + 0.1);
  }
}

/**
 * Renderiza audio usando Web Audio API nativa (OscillatorNode + GainNode).
 *
 * v20.0: Sin Tone.js — directamente con OfflineAudioContext.
 * Cada nota se renderiza según el preset de sonido seleccionado.
 */
function renderNativeAudio(
  notes: Array<{ noteName: string; duration: number }>,
  chords: Array<{ noteNames: string[]; duration: number }>,
  noteDurationSeconds: number,
  sampleRate: number,
  oscillatorType: OscillatorType = 'triangle'
): Promise<AudioBuffer> {
  // Calcular duración total + release
  let totalTime = 0;
  for (const note of notes) {
    totalTime += note.duration;
  }
  
  // Calcular duración total incluyendo chords
  let totalTimeWithChords = totalTime;
  if (chords && chords.length > 0) {
    for (const chordBlock of chords) {
      totalTimeWithChords += chordBlock.duration;
    }
  }
  
  const totalSamples = Math.ceil((totalTimeWithChords + 1.2) * sampleRate); // +1.2s para release
  
  console.log(`🔵 [renderNativeAudio] Creando OfflineAudioContext: ${sampleRate}Hz, ${totalSamples} samples (${(totalSamples / sampleRate).toFixed(2)}s)`);
  
  return new Promise((resolve) => {
    // Determinar preset: usar el más cercano al tipo seleccionado
    let preset = SOUND_PRESETS.proPiano; // default
    if (oscillatorType === 'sine') {
      preset = SOUND_PRESETS.campana;
    }
    
    console.log(`🔵 [renderNativeAudio] Preset: oscillatorType=${preset.oscillatorType}`);
    
    // Crear OfflineAudioContext directamente
    const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
    
    let currentTime = 0;
    
    // === Notas individuales secuenciales ===
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const frequency = noteNameToFrequency(note.noteName);
      const duration = Math.min(note.duration, noteDurationSeconds);
      
      console.log(`📝 [renderNativeAudio] Nota #${i}: "${note.noteName}" freq=${frequency.toFixed(2)}Hz t=${currentTime.toFixed(3)}s`);
      
      // Crear oscilador según preset seleccionado
      const oscillator = offlineCtx.createOscillator();
      oscillator.type = preset.oscillatorType;
      oscillator.frequency.value = frequency;
      
      // Crear nodo de ganancia para envelope ADSR
      const gainNode = offlineCtx.createGain();
      
      // Programa el envelope de ganancia según preset
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(preset.peakVolume, currentTime + preset.attackTime); // Attack
      const decayTime = duration * preset.decayRatio;
      gainNode.gain.exponentialRampToValueAtTime(Math.max(preset.sustainLevel * preset.peakVolume, 0.001), currentTime + preset.attackTime + decayTime); // Decay → Sustain
      
      // Release: rampa exponencial a 0
      const releaseStart = currentTime + duration;
      gainNode.gain.setValueAtTime(Math.max(preset.sustainLevel * preset.peakVolume, 0.001), releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.001, releaseStart + preset.releaseTime); // Release
      
      // Conectar: oscillator → gain → destination
      oscillator.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      
      // Programar inicio y parada del oscilador
      oscillator.start(currentTime);
      oscillator.stop(releaseStart + preset.releaseTime + 0.1);
      
      currentTime += note.duration;
    }
    
    // === Chords simultáneos (si existen) ===
    if (chords && chords.length > 0) {
      console.log(`📝 [renderNativeAudio] ${chords.length} chord(s) programado(s)`);
      
      for (const chordBlock of chords) {
        const chordNoteNames = chordBlock.noteNames;
        const chordDuration = Math.min(chordBlock.duration, noteDurationSeconds);
        
        console.log(`🎹 [renderNativeAudio] Chord a t=${currentTime.toFixed(3)}s: ${chordNoteNames.join(', ')}`);
        
        // Renderizar todas las notas del acorde simultáneamente
        renderChordBlock(offlineCtx, chordNoteNames, currentTime, chordDuration, preset);
        
        currentTime += chordDuration;
      }
    }
    
    console.log('🟡 [renderNativeAudio] Todos los osciladores programados — renderizando...');
    
    // Renderizar el buffer de audio
    offlineCtx.startRendering().then(( renderedBuffer) => {
      console.log('🟢 [renderNativeAudio] Render completado — buffer length=', renderedBuffer.length, 'sampleRate=', renderedBuffer.sampleRate);
      resolve(renderedBuffer);
    }).catch((error) => {
      console.error('❌ [renderNativeAudio] Error en renderizado:', error);
      // Retornar buffer vacío en caso de error
      const emptyBuffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
      resolve(emptyBuffer);
    });
  });
}

/**
 * Exporta audio de una secuencia de notas a formato WAV usando Web Audio API nativa.
 */
export async function exportAudio(options: ExportAudioOptions): Promise<Blob> {
  console.log('🔵 [exportAudio v20.1] START — notes=', options.notes.length, 'chords=', (options.chords || []).length, 'noteDuration=', options.noteDurationSeconds, 'oscillatorType=', options.oscillatorType);
  
  const { notes, chords, noteDurationSeconds = 0.5, oscillatorType = 'triangle' } = options;

  if ((notes.length === 0 && (!chords || chords.length === 0))) {
    throw new Error('No hay notas para exportar');
  }

  // Calcular duración total (notas + chords)
  let accumulatedTime = 0;
  for (const note of notes) {
    accumulatedTime += note.duration;
  }
  if (chords && chords.length > 0) {
    for (const chordBlock of chords) {
      accumulatedTime += chordBlock.duration;
    }
  }
  
  console.log('🟡 [exportAudio v20.1] totalDuration=', accumulatedTime, 'notes=', notes.map(n => n.noteName));

  // Renderizar con Web Audio API nativa a 48kHz (mismo sample rate que los samples reales)
  const sampleRate = 48000;
  const audioBuffer = await renderNativeAudio(notes, chords || [], noteDurationSeconds, sampleRate, oscillatorType);
  
  console.log('🟢 [exportAudio v20.0] Audio buffer obtenido — length=', audioBuffer.length, 'duration=', (audioBuffer.length / audioBuffer.sampleRate).toFixed(2), 's');
  
  // Convertir a WAV Blob
  return audioBufferToWav(audioBuffer);
}

/**
 * Convierte un AudioBuffer nativo de Web Audio API a formato WAV (PCM 16-bit).
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  // Interleavar canales
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  const channelData = new Float32Array(length * numChannels);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      channelData[offset++] = channels[c][i];
    }
  }

  return floatToWav(channelData, length, sampleRate, numChannels);
}

/**
 * Exporta una escala musical completa como archivo WAV.
 * @param soundType - 'proPiano' (triangle) o 'campana' (sine)
 */
export async function exportScale(
  scaleNotes: MusicalNote[],
  noteDurationSeconds: number,
  soundType: 'proPiano' | 'campana' = 'proPiano'
): Promise<Blob> {
  const notes: ExportAudioOptions['notes'] = scaleNotes.map(note => ({
    noteName: note.toneJsNote,
    duration: noteDurationSeconds,
  }));

  // Añadir nota raíz una octava arriba al final
  const rootNote = scaleNotes[0];
  notes.push({
    noteName: rootNote.toneJsNote.replace(/(\d+)/, (_, n) => String(parseInt(n) + 1)),
    duration: noteDurationSeconds * 0.5,
  });

  const oscillatorType = soundType === 'campana' ? 'sine' : 'triangle';
  return exportAudio({ notes, noteDurationSeconds, oscillatorType });
}

/**
 * Exporta un acorde musical como archivo WAV.
 * @param soundType - 'proPiano' (triangle) o 'campana' (sine)
 */
export async function exportChord(
  chordNotes: Array<{ toneJsNote: string; frequency: number }>,
  noteDurationSeconds: number,
  soundType: 'proPiano' | 'campana' = 'proPiano'
): Promise<Blob> {
  // === FASE 1: Arpegio (notas individuales secuenciales) ===
  const notes: ExportAudioOptions['notes'] = chordNotes.map(note => ({
    noteName: note.toneJsNote,
    duration: noteDurationSeconds,
  }));

  // === FASE 1.5: Cierre (raíz una octava arriba) ===
  const rootNote = chordNotes[0];
  notes.push({
    noteName: rootNote.toneJsNote.replace(/(\d+)/, (_, n) => String(parseInt(n) + 1)),
    duration: noteDurationSeconds,
  });

  // === FASE 2: Acorde simultáneo (impacto) — TODAS las notas a la vez ===
  const chord = {
    noteNames: chordNotes.map(note => note.toneJsNote),
    duration: noteDurationSeconds,
  };

  const oscillatorType = soundType === 'campana' ? 'sine' : 'triangle';
  return exportAudio({ notes, chords: [chord], noteDurationSeconds, oscillatorType });
}

// ============================================================
// Utilidades de descarga
// ============================================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateFilename(baseName: string, extension: string = 'wav'): string {
  const safeName = baseName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
  return `${safeName}.${extension}`;
}

import * as Tone from 'tone';
import { INSTRUMENT_MAP, type InstrumentId } from './audioEngine';
import type { MusicalNote } from './musicLogic';

// ============================================================
// Exportación de Audio — v17.0 (Tone.Offline + WAV)
// ============================================================

/**
 * Convierte un Tone.ToneAudioBuffer a formato WAV (PCM 16-bit).
 * @param toneBuffer - Buffer de audio de Tone.js
 * @returns Blob con datos WAV
 */
export function audioBufferToWav(toneBuffer: Tone.ToneAudioBuffer): Blob {
  // Obtener el AudioBuffer nativo subyacente
  const nativeBuffer = toneBuffer.get();
  if (!nativeBuffer) {
    throw new Error('ToneAudioBuffer está vacío');
  }
  
  const sampleRate = nativeBuffer.sampleRate;
  const numChannels = nativeBuffer.numberOfChannels;
  const length = nativeBuffer.length;
  
  // Interleavar canales (stereo/mono a formato WAV)
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(nativeBuffer.getChannelData(c));
  }
  
  const channelData = new Float32Array(length * numChannels);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      channelData[offset++] = channels[c][i];
    }
  }
  
  // Codificar a WAV (PCM 16-bit signed)
  return floatToWav(channelData, length, sampleRate, numChannels);
}

/**
 * Convierte Float32Array a formato WAV estándar.
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
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
  view.setUint16(32, numChannels * 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

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
// Crear instrumento virtual para Tone.Offline
// ============================================================

/**
 * Clona la configuración de un instrumento del AudioEngine para usar en Tone.Offline.
 */
function createOfflineInstrument(instrumentId: InstrumentId): {
  synth: Tone.PolySynth;
  destination: Tone.ToneAudioNode;
} {
  const config = INSTRUMENT_MAP[instrumentId];

  // Crear PolySynth
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: config.oscillatorType },
    envelope: config.envelope,
  });

  let outputNode: Tone.ToneAudioNode = synth;

  // Aplicar filtro si existe
  if (config.filter) {
    const filterOptions: { frequency: number; type: 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'notch' | 'allpass' | 'peaking'; Q?: number } = {
      frequency: config.filter.frequency,
      type: config.filter.type,
    };
    if (config.filter.Q !== undefined) {
      filterOptions.Q = config.filter.Q;
    }
    const filter = new Tone.Filter(filterOptions);
    synth.connect(filter);
    outputNode = filter;
  }

  // Configurar efectos según instrumento
  if (instrumentId === 'proPiano') {
    const compressor = new Tone.Compressor({
      threshold: -24, ratio: 3, attack: 0.01, release: 0.25,
    });
    outputNode.connect(compressor);

    const delay = new Tone.FeedbackDelay(0.143, 0.10);
    delay.wet.value = 0.07;
    compressor.connect(delay);
    compressor.toDestination(); // Conectar para captura
    outputNode = delay;
    
    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.15 });
    delay.connect(reverb);
    compressor.connect(reverb);

  } else if (instrumentId === 'campana') {
    const reverb = new Tone.Reverb({ decay: 3.2, wet: 0.35, preDelay: 0.08 });
    outputNode.connect(reverb);
    outputNode.toDestination(); // Conectar para captura

  } else {
    outputNode.toDestination();
  }

  // Ajustar volumen del synth
  synth.volume.value = config.volume;

  return { synth, destination: outputNode };
}

// ============================================================
// Funciones de exportación principal
// ============================================================

export interface ExportAudioOptions {
  /** Notas a reproducir con frecuencia y duración en segundos */
  notes: Array<{ noteName: string; frequency: number; duration: number }>;
  /** Instrumento a usar (debe coincidir con un InstrumentId del AudioEngine) */
  instrumentId: InstrumentId;
  /** Sample rate del WAV resultante (default: 48000, coincide con samples reales) */
  sampleRate?: number;
}

/**
 * Exporta audio de una secuencia de notas a formato WAV usando Tone.Offline.
 * 
 * @param options - Opciones de exportación
 * @returns Promise que resuelve a un Blob WAV descargable
 * 
 * @example
 * // Exportar escala Major en C4 (do mayor)
 * const notes = [
 *   { noteName: 'C4', frequency: 261.63, duration: 0.5 },
 *   { noteName: 'D4', frequency: 293.66, duration: 0.5 },
 *   // ...
 * ];
 * const wavBlob = await exportAudio({ notes, instrumentId: 'proPiano' });
 * downloadBlob(wavBlob, 'Do_Major.wav');
 */
export async function exportAudio(options: ExportAudioOptions): Promise<Blob> {
  const { notes, instrumentId, sampleRate = 48000 } = options;

  if (notes.length === 0) {
    throw new Error('No hay notas para exportar');
  }

  // Calcular duración total
  const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);

  // Renderizar en offline
  const audioBuffer = await Tone.Offline(async () => {
    const { synth } = createOfflineInstrument(instrumentId);
    
    let currentTime = 0;
    for (const note of notes) {
      synth.triggerAttackRelease(note.noteName, note.duration, currentTime);
      currentTime += note.duration;
    }
    
    // Limpiar synth para evitar memory leaks en offline context
    synth.dispose();
  }, totalDuration, sampleRate);

  // Convertir a WAV Blob
  return audioBufferToWav(audioBuffer);
}

/**
 * Exporta una escala musical completa como archivo WAV.
 * 
 * @param scaleNotes - Notas de la escala (de musicLogic)
 * @param instrumentId - Instrumento a usar
 * @param sampleRate - Sample rate del WAV (default: 48000)
 * @returns Promise que resuelve a un Blob WAV descargable
 */
export async function exportScale(
  scaleNotes: MusicalNote[],
  instrumentId: InstrumentId,
  noteDurationSeconds: number,
  sampleRate: number = 48000
): Promise<Blob> {
  const notes: ExportAudioOptions['notes'] = scaleNotes.map(note => ({
    noteName: note.toneJsNote,
    frequency: note.frequency,
    duration: noteDurationSeconds,
  }));

  // Añadir nota raíz una octava arriba al final (como en la reproducción normal)
  const rootNote = scaleNotes[0];
  notes.push({
    noteName: rootNote.toneJsNote.replace(/(\d+)/, (_, n) => String(parseInt(n) + 1)),
    frequency: rootNote.frequency * 2,
    duration: noteDurationSeconds * 0.5,
  });

  return exportAudio({ notes, instrumentId, sampleRate });
}

/**
 * Exporta un acorde musical como archivo WAV.
 * 
 * @param chordNotes - Notas del acorde (de musicLogic)
 * @param instrumentId - Instrumento a usar
 * @param noteDurationSeconds - Duración de cada nota en segundos
 * @param sampleRate - Sample rate del WAV (default: 48000)
 * @returns Promise que resuelve a un Blob WAV descargable
 */
export async function exportChord(
  chordNotes: Array<{ toneJsNote: string; frequency: number }>,
  instrumentId: InstrumentId,
  noteDurationSeconds: number,
  sampleRate: number = 48000
): Promise<Blob> {
  // Arpegio: notas secuenciales + acorde final simultáneo
  const notes: ExportAudioOptions['notes'] = chordNotes.map(note => ({
    noteName: note.toneJsNote,
    frequency: note.frequency,
    duration: noteDurationSeconds,
  }));

  // Añadir nota raíz una octava arriba (como en playChordTravel)
  const rootNote = chordNotes[0];
  notes.push({
    noteName: rootNote.toneJsNote.replace(/(\d+)/, (_, n) => String(parseInt(n) + 1)),
    frequency: rootNote.frequency * 2,
    duration: noteDurationSeconds,
  });

  // Añadir acorde simultáneo final (todas las notas a la vez)
  chordNotes.forEach(note => {
    notes.push({
      noteName: note.toneJsNote,
      frequency: note.frequency,
      duration: noteDurationSeconds,
    });
  });

  return exportAudio({ notes, instrumentId, sampleRate });
}

// ============================================================
// Utilidades de descarga
// ============================================================

/**
 * Descarga un Blob como archivo con nombre dado.
 */
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

/**
 * Genera un nombre de archivo seguro para descarga.
 */
export function generateFilename(baseName: string, extension: string = 'wav'): string {
  const safeName = baseName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
  return `${safeName}.${extension}`;
}

import * as Tone from 'tone';
import type { Chord, ChordNote } from './musicLogic';

// ============================================================
// Tipos y constantes del Motor de Audio — v17.1 (Revertido: solo Synth)
// ============================================================

export type InstrumentId =
  | 'proPiano'
  | 'campana';

export interface EnvelopeSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FilterSettings {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'notch' | 'allpass' | 'peaking';
  frequency: number;
  Q?: number;
  rolloff?: -12 | -24 | -48 | -96;
}

export interface SynthInstrumentConfig {
  type: 'synth';
  oscillatorType: OscillatorType;
  envelope: EnvelopeSettings;
  filter?: FilterSettings;
  volume: number;
  description: string;
}

export type InstrumentConfig = SynthInstrumentConfig;

/**
 * Diccionario de configuraciones para los instrumentos.
 * v17.1 — Revertido: solo PolySynth (proPiano + campana). Eliminado Tone.Sampler.
 */
export const INSTRUMENT_MAP: Record<InstrumentId, InstrumentConfig> = {
  proPiano: {
    type: 'synth',
    oscillatorType: 'triangle',
    envelope: {
      attack: 0.003,       // Martillo cuerdas ultra rápido
      decay: 0.4,          // Decaimiento natural extendido (resonancia caja)
      sustain: 0.1,        // Nivel bajo (cuerdas amortiguadas)
      release: 1.0,        // Cola larga con resonancia
    },
    filter: {
      type: 'lowpass',
      frequency: 7000,     // Armónicos brillantes pero suaves
      Q: 0.3,              // Resonancia mínima para transición natural
    },
    volume: -5,
    description: 'Piano Profesional — Compresor + Delay sutil con cuerpo acústico',
  },
  campana: {
    type: 'synth',
    oscillatorType: 'sine',
    envelope: {
      attack: 0.001,       // Impacto instantáneo del martillo en metal
      decay: 2.5,          // Decaimiento largo — las campanas resonan mucho
      sustain: 0.0,        // Sin sustain — la nota muere naturalmente
      release: 1.5,        // Release corto (lo controla el synth internamente)
    },
    filter: {
      type: 'lowpass',
      frequency: 3500,     // Filtrar armónicos agudos metálicos
      Q: 0.4,              // Suave resonancia para cuerpo
    },
    volume: -8,            // Un poco más bajo que el piano (las campanas son delicadas)
    description: 'Campana — Reverb largo tipo catedral para escalas exóticas',
  },
};

/**
 * Presets para UI — menú desplegable con etiquetas descriptivas.
 */
export const INSTRUMENT_PRESETS: {
  id: InstrumentId;
  label: string;
  description: string;
}[] = [
  { id: 'proPiano', label: '🎹 Piano Profesional', description: INSTRUMENT_MAP.proPiano.description },
  { id: 'campana', label: '🔔 Campana', description: INSTRUMENT_MAP.campana.description },
];

// ============================================================
// Clase AudioEngine — Singleton desacoplado del resto del app
// ============================================================

/**
 * Motor de audio centralizado que gestiona el sintetizador Tone.js.
 * No conoce escalas, notas ni lógica musical — solo recibe frecuencias en Hz.
 */
export class AudioEngine {
  /** PolySynth para instrumentos sintetizados */
  private synth: Tone.PolySynth | null = null;
  private currentInstrument: InstrumentId = 'proPiano';
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  private compressor: Tone.Compressor | null = null;
  private delay: Tone.Delay | null = null;

  /**
   * Referencia al Tone.Part activo del arpegio para poder limpiarlo al stop.
   * v14.0: Usado para cleanup con Transport.schedule.
   */
  private arpPart: Tone.Part | null = null;

  /**
   * Limpiar todos los recursos de audio anteriores.
   */
  private cleanupResources(): void {
    // Liberar notas del synth si existe
    if (this.synth) {
      try { this.synth.releaseAll(); } catch (_e) {}
    }

    // Limpiar filter anterior
    if (this.filter) { this.filter.dispose(); this.filter = null; }
    // Limpiar reverb anterior
    if (this.reverb) { this.reverb.dispose(); this.reverb = null; }
    // Limpiar compressor anterior
    if (this.compressor) { this.compressor.dispose(); this.compressor = null; }
    // Limpiar delay anterior
    if (this.delay) { this.delay.dispose(); this.delay = null; }
  }

  /**
   * Cambiar instrumento activo con transición suave.
   * v17.1 — Solo PolySynth (proPiano, campana). Eliminado Tone.Sampler.
   */
  switchInstrument(instrumentId: InstrumentId): void {
    // 1. Limpiar todos los recursos anteriores
    this.cleanupResources();

    // 2. Obtener configuración del preset
    const config = INSTRUMENT_MAP[instrumentId];

    // === MODO SYNTH (proPiano, campana) ===
    
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: config.oscillatorType,
      },
      envelope: config.envelope,
    });

    // Aplicar filtro si existe
    let outputNode: Tone.ToneAudioNode = this.synth;
    if (config.filter) {
      const filterOptions: { frequency: number; type: 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'notch' | 'allpass' | 'peaking'; Q?: number } = {
        frequency: config.filter.frequency,
        type: config.filter.type,
      };
      if (config.filter.Q !== undefined) {
        filterOptions.Q = config.filter.Q;
      }
      this.filter = new Tone.Filter(filterOptions);
      this.synth.connect(this.filter);
      outputNode = this.filter;
    }

    // Configurar efectos según instrumento
    if (instrumentId === 'proPiano') {
      // === PIANO PROFESIONAL: Compresor → Delay sutil → Reverb corto → Destino ===

      this.compressor = new Tone.Compressor({
        threshold: -24,
        ratio: 3,
        attack: 0.01,
        release: 0.25,
      }).toDestination();
      outputNode.connect(this.compressor);
      outputNode = this.compressor;

      const delay = new Tone.FeedbackDelay(0.143, 0.10).toDestination();
      delay.wet.value = 0.07;
      outputNode.connect(delay);

      this.reverb = new Tone.Reverb({
        decay: 1.8,
        wet: 0.15,
      }).toDestination();
      delay.connect(this.reverb);
      outputNode.connect(this.reverb);

    } else if (instrumentId === 'campana') {
      // === CAMPAÑA: Reverb largo tipo catedral → Destino ===

      this.reverb = new Tone.Reverb({
        decay: 3.2,
        wet: 0.35,
        preDelay: 0.08,
      }).toDestination();

      outputNode.connect(this.reverb);

    } else {
      // Fallback — conectar directamente al destino
      outputNode.toDestination();
    }

    // Ajustar volumen del synth
    this.synth.volume.value = config.volume;

    // 3. Actualizar estado actual
    this.currentInstrument = instrumentId;
  }

  /**
   * Reproducir una nota individual por frecuencia en Hz.
   * @param frequency - Frecuencia en Hz (ej: 440 para A4)
   * @param duration - Duración en segundos (ej: 0.5 para corchea)
   */
  playNote(frequency: number, duration: number, time?: Tone.Unit.Time): void {
    if (!this.synth) return;
    const noteName = this.frequencyToNoteName(frequency);
    this.synth.triggerAttackRelease(noteName, duration, time);
  }

  /**
   * Reproducir múltiples notas simultáneas (acorde).
   * @param frequencies - Array de frecuencias en Hz
   * @param duration - Duración en segundos
   */
  playChord(frequencies: number[], duration: number, time?: Tone.Unit.Time): void {
    if (!this.synth) return;
    const noteNames = frequencies.map(f => this.frequencyToNoteName(f));
    this.synth.triggerAttackRelease(noteNames, duration, time);
  }

  /**
   * Detener todas las notas activas.
   */
  stopAll(): void {
    if (this.synth) {
      try { this.synth.releaseAll(); } catch (_e) {}
    }
  }

  /**
   * Obtener el instrumento actualmente activo.
   */
  getCurrentInstrument(): InstrumentId {
    return this.currentInstrument;
  }

  /**
   * Liberar todos los recursos del motor de audio.
   */
  dispose(): void {
    this.stopAll();
    // Limpiar synth
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    // Limpiar efectos
    if (this.compressor) { this.compressor.dispose(); this.compressor = null; }
    if (this.delay) { this.delay.dispose(); this.delay = null; }
    if (this.filter) { this.filter.dispose(); this.filter = null; }
    if (this.reverb) { this.reverb.dispose(); this.reverb = null; }
  }

  /**
   * Convertir frecuencia Hz a notación Tone.js.
   * Basado en A4 = 440Hz, temperamento igual.
   */
  private frequencyToNoteName(freq: number): string {
    // Convertir frecuencia Hz a notación musical (ej: 'A4', 'C#3')
    // Fórmula: m = 69 + 12 * log2(f / 440)
    const m = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(m);
    
    // Notas en temperamento igual
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    
    return noteNames[noteIndex] + octave.toString();
  }

  // ============================================================
  // v12.0 — Métodos de Arpegio y Acorde
  // ============================================================

  /**
   * Reproduce un arpegio (notas secuenciales) seguido de un impacto (todas juntas).
   *
   * @param chordNotes - Notas del acorde a reproducir
   * @param duration - Duración de cada nota en segundos
   * @param bpm - BPM para calcular el tiempo entre notas del arpegio
   * @returns Promise que se resuelve cuando termina la reproducción
   */
  async playArpegioAndImpact(
    chordNotes: ChordNote[],
    duration: number,
    bpm: number
  ): Promise<void> {
    if (!this.synth) return;
    
    await Tone.start();
    
    const noteDuration = Tone.Time(duration).toSeconds();
    const arpInterval = this.calculateArpInterval(noteDuration, bpm);
    
    // === Limpiar arpegio anterior si existe ===
    if (this.arpPart) {
      this.arpPart.dispose();
      this.arpPart = null;
    }
    
    // === Fase 1: Arpegio (notas secuenciales) programado con Transport ===
    const arpEvents: [string, string][] = chordNotes.map((note, index) => {
      return [(index * arpInterval).toString() + 'i', note.toneJsNote];
    });
    
    this.arpPart = new Tone.Part((time, noteName) => {
      this.synth?.triggerAttackRelease(noteName as string, noteDuration, time);
    }, arpEvents).start(0);
    
    // === Fase 2: Impacto Final (todas las notas juntas) ===
    const impactTime = (chordNotes.length * arpInterval).toString() + 'i';
    const impactNoteNames = chordNotes.map(n => n.toneJsNote);
    
    // Programar el impacto como un acorde
    const impactPart = new Tone.Part((time) => {
      this.synth?.triggerAttackRelease(impactNoteNames, noteDuration, time);
    }, [impactTime]).start(0);
    
    // === Promise que se resuelve cuando termina todo ===
    const totalDuration = (chordNotes.length + 1) * arpInterval + noteDuration;
    return new Promise((resolve) => {
      setTimeout(() => {
        // Limpiar Parts después de que termine la reproducción
        this.arpPart?.dispose();
        this.arpPart = null;
        impactPart.dispose();
        resolve();
      }, totalDuration * 1000);
    });
  }

  /**
   * Calcula el intervalo entre notas del arpegio basado en BPM y duración.
   *
   * @param duration - Duración de cada nota en segundos
   * @param bpm - BPM actual
   * @returns Intervalo en segundos entre notas del arpegio
   */
  private calculateArpInterval(duration: number, bpm: number): number {
    // El intervalo entre notas del arpegio es igual a la duración de la nota
    // Esto mantiene la sincronización con el BPM actual
    return duration;
  }
}

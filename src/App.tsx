import { useState, useEffect, useCallback, useRef } from 'react';
import CircleOfNotes from './components/CircleOfNotes';
import { getRotatedNotePosition, CENTER, POLYGON_RADIUS } from './components/CircleOfNotes';
import {
  buildScaleByIndex,
  CHROMATIC_SCALE,
  ROOT_NOTES_NATURALES,
  ROOT_NOTES_SOSTENIDOS,
  ROOT_NOTES_BMOLES,
  ROOT_NOTES_EXPANDED,
  getRootNoteDisplay,
  SCALE_FORMULAS,
  SCALE_DESCRIPTIONS,
  SCALE_CATEGORIES,
  SCALE_CATEGORY_ORDER,
  SCALE_TO_CATEGORY,
  getScaleDisplayName,
  getScaleBaseName,
  getScaleIntervals,
  getScaleStepFormula,
  getScaleIndices,
  buildChord,
  getDiatonicDegreeSymbol,
  getDiatonicChordFromScale,
  resolveEnharmonicName,
  CHORD_TYPES,
  SCALE_EXTENDED_INFO,
  type Chord,
  type DiatonicChordResult,
  type MusicalNote,
} from './lib/musicLogic';
import type { ScaleName } from './lib/musicLogic';
import { Play, Pause, Music, Download, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { AudioEngine, INSTRUMENT_PRESETS, type InstrumentId } from './lib/audioEngine';
import { exportScale, exportChord, downloadBlob, generateFilename } from './lib/audioExport';
import * as Tone from 'tone';
import { QuizPanel } from './components/QuizPanel';
import { generateQuizSession, answerQuestion, type QuizState, type AppMode, type HintType } from './lib/quizLogic';

// ============================================================
// Estado inicial de la aplicación
// ============================================================
const DEFAULT_SCALE: ScaleName = 'Major (Ionian)';
const DEFAULT_ROOT_INDEX = 0; // C (Do)
const DEFAULT_BPM = 100;
const MIN_BPM = 75;
const MAX_BPM = 150;

// Categorías con emojis para la UI
const CATEGORY_ICONS: Record<string, string> = {
  "Diatónicas Base": "🎼",
  "Modos Griegos": "🏛️",
  "Pentatónicas y Blues": "🎸",
  "Jazz / Bebop": "🎷",
  "Modos de Jazz": "🎹",
  "Exóticas y del Mundo": "🌍",
  "Simétricas y Hexatónicas": "⬡"
};

// === Mapeo de tipo de acorde a sufijo de display (jazz standard) ===
function chordTypeToSuffix(type: string): string {
  const suffixMap: Record<string, string> = {
    "Major": "",
    "Minor": "m",
    "Diminished": "º",
    "Augmented": "+",
    "Dominant 7th": "7",
    "Major 7th": "maj7",
    "Minor 7th": "m7",
    "Minor Major 7th": "m(maj7)",
    "Half-Diminished 7th": "ø7",
    "Diminished 7th": "º7",
    "Major 7#5": "maj7(#5)",
    "Dominant 7#5": "7(#5)",
    "Major 6th": "6",
    "Minor 6th": "m6"
  };
  return suffixMap[type] || "";
}

// ============================================================
// Componente Principal
// ============================================================
const App: React.FC = () => {
  // === Estado de la escala ===
  const [selectedScale, setSelectedScale] = useState<ScaleName>(DEFAULT_SCALE);
  
  // RESTAURADO: Estado que guarda tanto el índice como el nombre exacto (para diferenciar C# de Db)
  const [rootNote, setRootNote] = useState<{ index: number; displayName: string }>({
    index: DEFAULT_ROOT_INDEX,
    displayName: 'C'
  });
  const rootIndex = rootNote.index;
  const selectedRootName = rootNote.displayName;
  
  // === Estado de reproducción ===
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [drawnLineIndices, setDrawnLineIndices] = useState<number[]>([]);
  const [polygonComplete, setPolygonComplete] = useState<boolean>(false);
  const [reproductionKey, setReproductionKey] = useState<number>(0);
  
  // === Estado del acorde ===
  const [isChordMode, setIsChordMode] = useState<boolean>(false);
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);
  const [selectedChordRootIndex, setSelectedChordRootIndex] = useState<number | null>(null);
  const [chordTypeMode, setChordTypeMode] = useState<'triad' | 'quartet'>('triad');
  const [chordDegreeIndex, setChordDegreeIndex] = useState<number>(0); // Grado diatónico seleccionado (0 = raíz de escala)
  
  // === Estado del acorde neón (v17.0) ===
  const [isChordPlaying, setIsChordPlaying] = useState<boolean>(false);
  const [chordDrawnLineIndices, setChordDrawnLineIndices] = useState<number[]>([]);
  const [chordActiveLineIndex, setChordActiveLineIndex] = useState<number>(-1);
  const [chordPolygonComplete, setChordPolygonComplete] = useState<boolean>(false); // v13.3: polígono persistente como marca de agua

  // === Estado de exportación audio (v17.0) ===
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // === v23.0: Color personalizado para polígonos ===
  const [scalePolygonColor, setScalePolygonColor] = useState<string>('#dc2626');
  const [chordPolygonColor, setChordPolygonColor] = useState<string>('#1e3a5f');
  const [borderColor, setBorderColor] = useState<string>('#dfc47f');
  
  // === v24.0: Color personalizado para línea neón animada (trazado nota por nota) ===
  const [neonLineColor, setNeonLineColor] = useState<string>('#ffffff');

  // === Estado del modo Quiz (v22.0) ===
  const [appMode, setAppMode] = useState<AppMode>('scale');
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  // === Estado del sonido ===
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentId>('proPiano');
  const [volume, setVolume] = useState<number>(-10);
  
  // === Estado de UI: categoría activa de pestañas ===
  const [activeCategory, setActiveCategory] = useState<string>(SCALE_CATEGORY_ORDER[0] || '');
  
  // === Estado del acordeón de información expandida (v9.8) ===
  type ExpandedSectionType = 'context' | 'degrees' | 'relations' | null;
  const [expandedSection, setExpandedSection] = useState<ExpandedSectionType>(null);
  
  // === Estado del dropdown de escalas disponibles (v9.4) ===
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // === Refs ===
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const tonePartsRef = useRef<Tone.Part[]>([]);
  const noteDurationSecondsRef = useRef<number>(1);

  // === Inicialización del motor de audio ===
  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    audioEngineRef.current.switchInstrument(selectedInstrument as InstrumentId);
    
    return () => {
      audioEngineRef.current?.dispose();
      Tone.Transport.cancel();
      for (const part of tonePartsRef.current) {
        part.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.switchInstrument(selectedInstrument as InstrumentId);
    }
  }, [selectedInstrument]);

  // === Click-outside para cerrar dropdown de escalas (v9.4) ===
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === Función helper para display de escala (v9.4) ===
  const getScaleDisplayText = useCallback((scaleName: ScaleName): string => {
    return `${getScaleBaseName(scaleName)} — ${getScaleStepFormula(scaleName)}`;
  }, []);

  useEffect(() => {
    if (audioEngineRef.current) {
      Tone.Destination.volume.value = volume;
    }
  }, [volume]);

  // === Calcular duración de nota en segundos basada en BPM ===
  useEffect(() => {
    const secondsPerBeat = 60 / bpm;
    noteDurationSecondsRef.current = secondsPerBeat;
  }, [bpm]);

  // === Construir escala seleccionada ===
  const currentScale = selectedScale;
  const scaleData = currentScale ? buildScaleByIndex(rootIndex, currentScale, selectedRootName) : null;
  const scaleIndices = scaleData ? getScaleIndices(rootIndex, currentScale) : [];
  const scaleName = selectedScale;

  // === Actualizar selectedChord cuando cambia el modo acorde o parámetros ===
  useEffect(() => {
    if (isChordMode && scaleIndices.length > 0) {
      const chordResult = getDiatonicChordFromScale(rootIndex, selectedScale, scaleIndices[chordDegreeIndex] ?? rootIndex, chordTypeMode === 'quartet', selectedRootName);
      if (chordResult) {
        setSelectedChord(chordResult.chord);
        setSelectedChordRootIndex(chordResult.chord.rootIndex);
      }
    } else {
      setSelectedChord(null);
      setSelectedChordRootIndex(null);
      setChordDrawnLineIndices([]);
      setChordActiveLineIndex(-1);
      setActiveNoteIndex(-1);
    }
  }, [isChordMode, selectedScale, rootIndex, chordTypeMode, selectedRootName, chordDegreeIndex, ...scaleIndices]);

  // === Construir nombre del acorde para mostrar (usando selectedChord) ===
  // v14.0: Usar resolveEnharmonicName para preservar la enarmonía seleccionada (C# vs Db, etc.)
  const chordRootName = isChordMode && selectedChord
    ? resolveEnharmonicName(selectedScale, selectedChord.rootIndex, rootIndex, selectedRootName)
    : '';
  const chordName = isChordMode && selectedChord && chordRootName
    ? `${chordRootName}${chordTypeToSuffix(selectedChord.type)}`
    : '';
  
  // === Obtener grado diatónico del acorde seleccionado ===
  const chordDegree = isChordMode && selectedChord
    ? getDiatonicDegreeSymbol(chordDegreeIndex, selectedChord.type)
    : '';

  // === Limpiar estados de reproducción ===
  const stopPlayback = useCallback(() => {
    audioEngineRef.current?.stopAll();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    
    for (const part of tonePartsRef.current) {
      part.dispose();
    }
    tonePartsRef.current = [];
    
    setIsPlaying(false);
    setIsTracing(false);
    setActiveNoteIndex(-1);
    setActiveLineIndex(-1);
    setDrawnLineIndices([]);
    setPolygonComplete(false);
    setIsChordPlaying(false);
    setChordDrawnLineIndices([]);
    setChordActiveLineIndex(-1);
  }, []);

  const switchPlaybackMode = useCallback((nextMode: 'scale' | 'chord') => {
    stopPlayback();
    setIsChordMode(nextMode === 'chord');
  }, [stopPlayback]);

  // === Reproducir escala ===
  const playScale = useCallback(async () => {
    if (isPlaying || !scaleData || scaleIndices.length === 0) return;
    
    await Tone.start();
    
    if (!audioEngineRef.current) return;
    
    stopPlayback();
    
    setDrawnLineIndices([]);
    setActiveNoteIndex(-1);
    setActiveLineIndex(-1);
    setPolygonComplete(false);
    setReproductionKey(prev => prev + 1);
    setIsPlaying(true);
    setIsTracing(true);
    
    const baseTime = Tone.Transport.seconds;
    const currentDuration = noteDurationSecondsRef.current;
    
    // Construir datos de notas
    const noteToFreq = new Map<string, number>();
    scaleData.forEach((note) => {
      noteToFreq.set(note.toneJsNote, note.frequency);
    });
    
    const scheduleCallback = (time: number, noteName: string) => {
      const freq = noteToFreq.get(noteName);
      if (freq && audioEngineRef.current) {
        audioEngineRef.current.playNote(freq, currentDuration, time);
      }
    };
    
    const partData: Array<[number, string]> = scaleData.map((note, i) => [
      baseTime + i * currentDuration,
      note.toneJsNote
    ]);
    
    const scalePart = new Tone.Part(scheduleCallback, partData);
    scalePart.start(0);
    tonePartsRef.current.push(scalePart);
    
    // Programar resaltado visual
    for (let i = 0; i < scaleData.length; i++) {
      const note = scaleData[i];
      const noteTime = baseTime + i * currentDuration;
      
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setActiveNoteIndex(note.index);
          setActiveLineIndex(i);
          setDrawnLineIndices(prev =>
            prev.includes(i) ? prev : [...prev, i]
          );
        }, time);
      }, noteTime);
    }
    
    // Última nota → cierre del polígono
    {
      const lastNote = scaleData[scaleData.length - 1];
      const lastNoteTime = baseTime + (scaleData.length - 1) * currentDuration;
      const closeTime = lastNoteTime + currentDuration;
      
      // Cierre del polígono
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setActiveLineIndex(scaleData.length - 1);
          setDrawnLineIndices(prev =>
            prev.includes(scaleData.length - 1) ? prev : [...prev, scaleData.length - 1]
          );
          setPolygonComplete(true);
        }, time);
      }, closeTime);
      
      // Volver a la primera nota
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setActiveNoteIndex(lastNote.index);
        }, time);
      }, closeTime);

      // === CIERRE: Nota raíz una octava arriba (sincronizada con cierre del polígono) ===
      const rootFreq = noteToFreq.get(scaleData[0].toneJsNote);
      if (rootFreq && audioEngineRef.current) {
        Tone.Transport.schedule((time) => {
          audioEngineRef.current?.playNote(rootFreq * 2, currentDuration * 0.5, time);
        }, closeTime);
      }
    }
    
    // Finalización (octava suena en closeTime con duración 0.5×)
    const totalDuration = scaleData.length * currentDuration + currentDuration * 1.5;
    const endTime = baseTime + totalDuration;
    
    Tone.Transport.scheduleOnce(() => {
      setIsPlaying(false);
      setIsTracing(false);
      setActiveNoteIndex(-1); // Apagar luz roja de la última nota al terminar
    }, endTime);
    
    Tone.Transport.start(undefined, baseTime);
    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
    }, endTime + 0.5);
    
  }, [scaleData, scaleIndices, isPlaying, stopPlayback]);

  // === v17.0: Recorrido Neón por Tríada/Cuatríada ===
  const playChordTravel = useCallback(async () => {
    if (isChordPlaying || !selectedChord || selectedChordRootIndex === null) return;
    
    await Tone.start();
    
    if (!audioEngineRef.current) return;
    
    // Usar stopPlayback() para garantizar limpieza completa y consistencia
    stopPlayback();
    
    // Resetear estado completo del acorde para animación fresca desde cero
    setChordPolygonComplete(false); // v14.2: resetear marca de agua → animación neón completa
    setChordDrawnLineIndices([]);
    setChordActiveLineIndex(-1);
    setActiveNoteIndex(-1);
    
    // v14.2: Incrementar reproductionKey para forzar reconstrucción del polígono neón SVG
    // Esto elimina el "retroceso" visual cuando chordPolygonComplete era true
    setReproductionKey(prev => prev + 1);
    setIsChordPlaying(true);
    
    // Obtener notas del acorde
    const chordNotes = selectedChord.notes;
    const totalChordNotes = chordNotes.length; // 3 (tríada) o 4 (cuatríada)
    
    // === Duración rítmica estricta: todas las transiciones usan currentDuration ===
    const baseTime = Tone.Transport.seconds;
    const currentDuration = noteDurationSecondsRef.current;
    
    // === FASE 1: Arpegio Secuencial ===
    for (let i = 0; i < totalChordNotes; i++) {
      const note = chordNotes[i];
      const noteTime = baseTime + i * currentDuration;
      
      Tone.Transport.schedule((time) => {
        // Sonido individual
        audioEngineRef.current?.playNote(note.frequency, currentDuration, time);
        
        // Visual: Resaltar nota y dibujar línea HACIA la siguiente nota
        Tone.Draw.schedule(() => {
          setActiveNoteIndex(note.index);
          if (i < totalChordNotes - 1) { // Dibuja segmentos intermedios
            setChordActiveLineIndex(i);
            setChordDrawnLineIndices(prev => prev.includes(i) ? prev : [...prev, i]);
          } else if (i === totalChordNotes - 1) {
            // ✅ FIX: Último segmento se dibuja SIMULTÁNEAMENTE con la última nota del arpegio
            // Esto elimina el retraso de un frame que causaba el "lag" visual
            setChordActiveLineIndex(i);
            setChordDrawnLineIndices(prev => prev.includes(i) ? prev : [...prev, i]);
          }
        }, time);
      }, noteTime);
    }
    
    // === FASE 1.5: Cierre (Nota raíz una octava arriba) ===
    const closeTime = baseTime + totalChordNotes * currentDuration;
    const rootNote = chordNotes[0];
    
    Tone.Transport.schedule((time) => {
      // Sonar raíz octavada (frecuencia x 2) — sin actualizar visual, ya que el último segmento
      // y la raíz iluminada ya se dibujaron en FASE 1 con timing sincronizado
      audioEngineRef.current?.playNote(rootNote.frequency * 2, currentDuration, time);
      
      Tone.Draw.schedule(() => {
        setActiveNoteIndex(rootNote.index); // Ilumina la raíz de nuevo
      }, time);
    }, closeTime);
    
    // === FASE 2: Acorde Simultáneo (Impacto) ===
    const impactTime = baseTime + (totalChordNotes + 1) * currentDuration;
    
    Tone.Transport.schedule((time) => {
      // Sonar todas las notas base a la vez
      audioEngineRef.current?.playChord(chordNotes.map(note => note.frequency), currentDuration, time);
      
      Tone.Draw.schedule(() => {
        setActiveNoteIndex(-1); // Apagar luz roja individual, el polígono se encarga
      }, time);
    }, impactTime);
    
    // === FASE 3: Limpieza y Fin ===
    const totalDuration = (totalChordNotes + 2) * currentDuration;
    const endTime = baseTime + totalDuration;
    
    Tone.Transport.scheduleOnce(() => {
      setChordPolygonComplete(true); // v12.0: Impacto final — polígono rojo se llena y brilla
      setIsChordPlaying(false);
    }, endTime);
    
    Tone.Transport.start(undefined, baseTime);
    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
    }, endTime + 0.5);
    
  }, [selectedChord, selectedChordRootIndex, isChordPlaying]);

  // === v17.4: Función de exportar audio a WAV (Tone.Offline) ===
  const handleExportAudio = useCallback(async () => {
    console.log('🔵 [EXPORT] handleExportAudio START');
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      console.log('🟡 [EXPORT] isExporting=true, scaleData=', !!scaleData, 'chord=', !!selectedChord);
      
      let blob: Blob;
      let filename: string;
      const noteDuration = noteDurationSecondsRef.current;
      console.log('🟡 [EXPORT] noteDuration=', noteDuration);
      
      if (!isChordMode && scaleData && scaleIndices.length > 0) {
        console.log('🔵 [EXPORT] Modo ESCALA — llamando exportScale() instrument=', selectedInstrument);
        // Exportar escala con instrumento seleccionado
        blob = await exportScale(scaleData, noteDuration, selectedInstrument as 'proPiano' | 'campana');
        console.log('🟢 [EXPORT] exportScale retornó blob size=', blob.size);
        filename = generateFilename(`${selectedRootName}_${getScaleBaseName(selectedScale)}`);
      } else if (isChordMode && selectedChord && selectedChordRootIndex !== null) {
        console.log('🔵 [EXPORT] Modo ACORDE — llamando exportChord() instrument=', selectedInstrument);
        // Exportar acorde con instrumento seleccionado
        blob = await exportChord(selectedChord.notes, noteDuration, selectedInstrument as 'proPiano' | 'campana');
        console.log('🟢 [EXPORT] exportChord retornó blob size=', blob.size);
        filename = generateFilename(`${selectedRootName}_${chordName}`);
      } else {
        throw new Error('No hay escala o acorde seleccionado para exportar');
      }
      
      console.log('🔵 [EXPORT] Llamando downloadBlob(filename=', filename, ')');
      downloadBlob(blob, filename);
      console.log('🟢 [EXPORT] downloadBlob completado');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error al exportar audio:', error, errorMsg);
      alert(`Error al exportar audio: ${errorMsg}`);
    } finally {
      console.log('🔴 [EXPORT] finally block — isExporting=false');
      setIsExporting(false);
    }
  }, [isExporting, isChordMode, scaleData, selectedChord, selectedRootName, selectedScale, chordName, selectedInstrument]);
  
  // Resetear polygonComplete cuando se seleccione una escala diferente
  useEffect(() => {
    setPolygonComplete(false);
  }, [selectedScale]);
  
  // === v17.0: Resetear trazos del acorde cuando cambia el acorde o la escala ===
  useEffect(() => {
    setChordDrawnLineIndices([]);
    setChordActiveLineIndex(-1);
    setActiveNoteIndex(-1);
    setChordPolygonComplete(false); // v13.3: resetear polígono persistente
  }, [selectedChord, selectedScale, rootIndex]);

  // === Resetear chordDegreeIndex a 0 (raíz de escala) cuando cambia la escala o raíz ===
  useEffect(() => {
    if (isChordMode) {
      setChordDegreeIndex(0);
    }
  }, [selectedScale, rootIndex, isChordMode]);

  // === v20.0: Resetear estados visuales (escala + acorde) cuando cambia la raíz de escala ===
  useEffect(() => {
    setDrawnLineIndices([]);
    setActiveLineIndex(-1);
    setPolygonComplete(false);
  }, [rootIndex]);

  // === v9.8: Resetear acordeón expandido cuando cambia la escala ===
  useEffect(() => {
    setExpandedSection(null);
  }, [selectedScale]);

  // === Manejador de clic en nota del círculo ===
  const handleNoteClick = useCallback((noteIndex: number) => {
    if (!audioEngineRef.current || !scaleData) return;
    
    const note = scaleData.find(n => n.index === noteIndex);
    if (note) {
      audioEngineRef.current.playNote(note.frequency, noteDurationSecondsRef.current);
      setActiveNoteIndex(noteIndex);
      setTimeout(() => setActiveNoteIndex(-1), 300);
    }
  }, [scaleData]);

  // === Manejador de clic en nota del acorde: reproduce nota + selecciona acorde diatónico ===
  const handleChordNoteClick = useCallback((noteIndex: number) => {
    if (!audioEngineRef.current || !scaleData || scaleIndices.length === 0) return;
    
    // Reproducir la nota clickeada
    const note = scaleData.find(n => n.index === noteIndex);
    if (note) {
      audioEngineRef.current.playNote(note.frequency, noteDurationSecondsRef.current);
      setActiveNoteIndex(noteIndex);
      setTimeout(() => setActiveNoteIndex(-1), 300);
    }
    
    // Encontrar el grado diatónico de esta nota en la escala
    const degreeIdx = scaleIndices.indexOf(noteIndex);
    if (degreeIdx !== -1) {
      // Actualizar chordDegreeIndex para seleccionar este acorde
      setChordDegreeIndex(degreeIdx);
      
      // Construir y seleccionar el acorde diatónico
      const chordResult = getDiatonicChordFromScale(rootIndex, selectedScale, noteIndex, chordTypeMode === 'quartet', selectedRootName);
      if (chordResult) {
        setSelectedChord(chordResult.chord);
        setSelectedChordRootIndex(chordResult.chord.rootIndex);
      }
    }
  }, [scaleData, scaleIndices, rootIndex, selectedScale, chordTypeMode, selectedRootName]);

  // === Obtener notas del acorde para la SVG (reutiliza chordName/chordDegree ya calculados arriba) ===
  const chordNotesForSvg = isChordMode && selectedChord
    ? selectedChord.notes.map(n => n.index)
    : [];

  // === Obtener nombres de notas del acorde con contexto enarmónico ===
  const chordNoteNames = isChordMode && selectedChord && selectedChordRootIndex !== null
    ? selectedChord.notes.map(n => resolveEnharmonicName(selectedScale, n.index, rootIndex, selectedRootName))
    : [];

  // === Construir fórmula de la escala ===
  const scaleFormula = selectedScale ? SCALE_FORMULAS[selectedScale] : null;
  const scaleIntervals = selectedScale ? getScaleIntervals(selectedScale) : '';
  const scaleDescription = selectedScale ? SCALE_DESCRIPTIONS[selectedScale] : '';
  const scaleCategory = selectedScale ? SCALE_TO_CATEGORY[selectedScale] : '';

  // === Obtener todas las escalas agrupadas por categoría ===
  const getAllScalesByCategory = () => {
    const categories: Record<string, ScaleName[]> = {};
    for (const scale of Object.keys(SCALE_FORMULAS) as ScaleName[]) {
      const category = SCALE_TO_CATEGORY[scale] || 'Otras';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(scale);
    }
    return categories;
  };

  const scalesByCategory = getAllScalesByCategory();

  // === Escalas de la categoría activa ===
  const activeScales = activeCategory ? (scalesByCategory[activeCategory] || []) : [];

  // === Determinar a qué categoría pertenece la escala actualmente seleccionada ===
  const currentScaleCategory = selectedScale ? SCALE_TO_CATEGORY[selectedScale] : '';

  // === Manejador de cambio de categoría con auto-selección ===
  const handleCategoryChange = useCallback((category: string) => {
    // Si ya estamos en esta categoría, no hacer nada
    if (activeCategory === category) return;
    
    // Detener cualquier reproducción activa
    if (isPlaying || isChordPlaying) {
      stopPlayback();
    }
    
    // Cambiar a la nueva categoría
    setActiveCategory(category);
    
    // Seleccionar automáticamente la primera escala de la nueva categoría
    const firstScale = scalesByCategory[category]?.[0];
    if (firstScale) {
      setSelectedScale(firstScale);
    }
  }, [activeCategory, isPlaying, isChordPlaying, stopPlayback, scalesByCategory]);

  // === Lista plana de TODAS las escalas en orden por categoría (v23.0) ===
  const allScalesFlat: ScaleName[] = [];
  for (const category of SCALE_CATEGORY_ORDER) {
    const scalesInCategory = (scalesByCategory[category] || []) as ScaleName[];
    allScalesFlat.push(...scalesInCategory);
  }

  // === Navegación anterior/siguiente escala infinita (v23.0) ===
  const handlePrevScale = useCallback(() => {
    if (isPlaying || isChordPlaying) return;
    if (appMode !== 'scale') return;
    
    if (allScalesFlat.length === 0) return;
    
    const currentIndex = allScalesFlat.indexOf(selectedScale);
    const newIndex = (currentIndex - 1 + allScalesFlat.length) % allScalesFlat.length;
    const newScale = allScalesFlat[newIndex];
    const newCategory = SCALE_TO_CATEGORY[newScale];
    if (newCategory) {
      setActiveCategory(newCategory);
    }
    setSelectedScale(newScale);
  }, [isPlaying, isChordPlaying, appMode, allScalesFlat, selectedScale]);

  const handleNextScale = useCallback(() => {
    if (isPlaying || isChordPlaying) return;
    if (appMode !== 'scale') return;
    
    if (allScalesFlat.length === 0) return;
    
    const currentIndex = allScalesFlat.indexOf(selectedScale);
    const newIndex = (currentIndex + 1) % allScalesFlat.length;
    const newScale = allScalesFlat[newIndex];
    const newCategory = SCALE_TO_CATEGORY[newScale];
    if (newCategory) {
      setActiveCategory(newCategory);
    }
    setSelectedScale(newScale);
  }, [isPlaying, isChordPlaying, appMode, allScalesFlat, selectedScale]);

  // === Manejadores del Quiz (v22.0) ===
  
  /** Inicia una sesión de quiz */
  const handleStartQuiz = useCallback((playerName: string, totalQuestions: number, category: 'scale' | 'chord') => {
    const config = { playerName, totalQuestions, category };
    const initialState = generateQuizSession(config);
    setQuizState(initialState);
    setIsPlaying(false);
    setIsChordPlaying(false);
    stopPlayback();
  }, [stopPlayback]);

  /** Maneja una respuesta en el quiz */
  const handleQuizAnswer = useCallback((optionId: string, hintsUsed: HintType[], usedAudioHelp: boolean) => {
    if (!quizState || !quizState.currentQuestion) return;
    
    const result = answerQuestion(quizState, optionId, hintsUsed, usedAudioHelp);
    setQuizState(result.newState);
    
    // Si el quiz terminó, no hacer nada más
    if (result.newState.isSessionComplete) {
      setIsPlaying(false);
      stopPlayback();
    }
  }, [quizState, stopPlayback]);

  /** Reinicia el quiz */
  const handleQuizRestart = useCallback(() => {
    setQuizState(null);
  }, []);

  // === Render ===
  return (
    <>
      <div className="min-h-screen bg-[var(--color-background)] text-white flex flex-col items-center p-4">
        
        {/* === 1. Header — título full-width centrado, fuente gigante === */}
        <header className="w-full text-center mb-6" style={{ paddingTop: '0px' }}>
          <h1 className="font-bold text-[var(--color-gold)] uppercase tracking-widest"
              style={{ fontFamily: 'Georgia, serif', fontSize: '2.5rem', letterSpacing: '0.05em', lineHeight: '1.2' }}>
            ESCALAS Y ACORDES MUSICALES INTERACTIVOS
          </h1>
        </header>

        {/* === Botones de Modo (v22.0 — botones independientes con bordes redondeados) === */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => { setAppMode('scale'); setIsChordMode(false); }}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border-2 ${
              appMode === 'scale' ? 'scale-105 shadow-lg' : ''
            }`}
            style={{
              fontSize: '16.7px',
              background: appMode === 'scale' ? 'var(--color-gold)' : '#4a4430',
              color: appMode === 'scale' ? '#12161c' : 'var(--color-gold)',
              borderColor: appMode === 'scale' ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.4)',
            }}
          >
            🎹 Modo Escala
          </button>
          <button
            onClick={() => { setAppMode('chord'); setIsChordMode(true); }}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border-2 ${
              appMode === 'chord' ? 'scale-105 shadow-lg' : ''
            }`}
            style={{
              fontSize: '16.7px',
              background: appMode === 'chord' ? 'var(--color-gold)' : '#4a4430',
              color: appMode === 'chord' ? '#12161c' : 'var(--color-gold)',
              borderColor: appMode === 'chord' ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.4)',
            }}
          >
            🎵 Modo Acorde
          </button>
          <button
            onClick={() => { setAppMode('quiz'); setIsChordMode(false); setQuizState(null); }}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all border-2 ${
              appMode === 'quiz' ? 'scale-105 shadow-lg' : ''
            }`}
            style={{
              fontSize: '16.7px',
              background: appMode === 'quiz' ? 'var(--color-gold)' : '#4a4430',
              color: appMode === 'quiz' ? '#12161c' : 'var(--color-gold)',
              borderColor: appMode === 'quiz' ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.4)',
            }}
          >
            🧠 Modo Quiz
          </button>
        </div>

        {/* === Renderizado condicional: Quiz vs Normal === */}
        {appMode === 'quiz' ? (
          <>
            {/* Footer para modo quiz */}
            <QuizPanel
              quizState={quizState}
              onAnswer={handleQuizAnswer}
              onStartSession={handleStartQuiz}
              onRestart={handleQuizRestart}
              bpm={bpm}
              instrument={selectedInstrument as any}
            />
            <footer className="w-full text-center py-4 border-t border-gray-800 mt-6">
              <div className="flex flex-col items-center gap-1 text-xs" style={{ color: 'var(--color-gold)' }}>
                <p className="text-[var(--color-gold)]/60">Creado por Andrés Eduardo Garzón Polanía</p>
                <p className="text-[var(--color-gold)]/60">andresmusic1@gmail.com · +57 3153159379</p>
              </div>
            </footer>
          </>
        ) : (
          <>
          <div className="w-full max-w-6xl two-column-layout">
          
          {/* ============================================================
              COLUMNA IZQUIERDA: Controles y configuraciones
              ============================================================ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* === 2. Categorías — Pills horizontales con scroll === */}
            <div className="section-card">
              <h3 className="text-base font-semibold text-[var(--color-gold)] mb-3" style={{ fontSize: '16px' }}>📂 Categorías</h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {SCALE_CATEGORY_ORDER.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`category-tab px-3 py-1.5 rounded-full text-xs font-medium
                      ${activeCategory === category ? 'active' : ''}`}
                  >
                    <span className="mr-1">{CATEGORY_ICONS[category] || '🎵'}</span>{category}
                  </button>
                ))}
              </div>
            </div>

            {/* === 3. Escalas Disponibles — Dropdown Custom (v9.4) === */}
            <div className="section-card has-dropdown" ref={dropdownRef}>
              <h3 className="text-base font-semibold text-[var(--color-gold)] mb-3" style={{ fontSize: '16px' }}>🎹 Escalas Disponibles</h3>
              
              <div className="scale-dropdown-container">
                {/* Barra principal — estilo categoría activa */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDropdownOpen && (isPlaying || isChordPlaying)) {
                      stopPlayback();
                    }
                    setIsDropdownOpen(prev => !prev);
                  }}
                  className={`scale-selector-bar ${isDropdownOpen ? 'open' : ''}`}
                >
                  <span>{getScaleDisplayText(selectedScale)}</span>
                  <span className="chevron-icon">▼</span>
                </button>

                {/* Lista desplegable */}
                {isDropdownOpen && (
                  <div className="scale-dropdown-list">
                    {activeScales.map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => {
                          stopPlayback();
                          setSelectedScale(scale);
                          setIsDropdownOpen(false);
                        }}
                        className={`scale-dropdown-item ${selectedScale === scale ? 'selected' : ''}`}
                      >
                        {getScaleDisplayText(scale)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* === 4. Nota Raíz === */}
            <div className="section-card">
              <h3 className="text-sm font-semibold text-[var(--color-gold)] mb-3 text-center">Nota Raíz de Escala</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {ROOT_NOTES_EXPANDED.map((noteOption) => (
                  <button
                    key={`${noteOption.index}-${noteOption.displayName}`}
                    onClick={() => setRootNote(noteOption)}
                    className={`root-note-button py-2.5 text-sm active:scale-95
                      ${rootIndex === noteOption.index && selectedRootName === noteOption.displayName
                        ? 'active'
                        : 'inactive'
                      }`}
                  >
                    {noteOption.displayName}
                  </button>
                ))}
              </div>
            </div>

            {/* === 5. Escala Actual — multi-línea con etiquetas claras (v9.3) === */}
            {scaleData && (
              <div className="section-card">
                <h3 className="text-sm font-semibold text-[var(--color-gold)] mb-2 flex items-center gap-2">
                  <Music size={14} />
                  Escala Actual:
                </h3>
                <div>
                  <p className="scale-name-main">
                    {selectedRootName} {getScaleBaseName(selectedScale)}
                  </p>
                  {scaleFormula && (
                    <p className="scale-formula">{getScaleStepFormula(selectedScale)}</p>
                  )}
                  {/* Descripción reubicada desde la lista de escalas */}
                  {scaleDescription && (
                    <p className="text-sm italic mt-2 mb-3 border-l-2 border-[var(--color-gold)] pl-3" style={{ color: '#e0e0e0' }}>
                      {scaleDescription}
                    </p>
                  )}
                  <div>
                    <span className="text-xs mr-2 font-semibold" style={{ color: 'var(--color-gold)' }}>Notas:</span>
                    <div className="scale-notes-list">
                      {scaleData.map((n, i) => (
                        <span key={i} className="scale-note-item">{n.name}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span className="text-xs mr-2 font-semibold" style={{ color: 'var(--color-gold)' }}>Intervalos:</span>
                    <div className="scale-intervals">
                      {scaleIntervals && scaleIntervals.length > 0 && (typeof scaleIntervals[0] === 'string' ? scaleIntervals : []).map((interval: string, i: number) => (
                        <span key={i} className="scale-interval-item">{interval}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* === Acordeón de Información Expandida (v9.8) — Marco contenedor oscuro === */}
                  {SCALE_EXTENDED_INFO[selectedScale as ScaleName] && (
                    <div className="mt-4 section-card">
                      {/* --- Contexto Histórico --- */}
                      <div className="mb-4 last:mb-0">
                        <button
                          onClick={() => setExpandedSection(expandedSection === 'context' ? null : 'context')}
                          className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg bg-[#1a1d24] hover:bg-[#252830] transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-[var(--color-gold)]">📜 Contexto Histórico</span>
                          <span className="text-xs" style={{ color: '#a0a8b8' }}>{expandedSection === 'context' ? '▲' : '▶'}</span>
                        </button>
                        {expandedSection === 'context' && (
                          <div className="mt-2 px-3 py-2 text-sm italic rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)', borderLeft: '2px solid var(--color-gold)', color: '#e0e0e0' }}>
                            {SCALE_EXTENDED_INFO[selectedScale as ScaleName]!.context}
                          </div>
                        )}
                      </div>

                      {/* --- Grados Funcionales --- */}
                      <div className="mb-4 last:mb-0">
                        <button
                          onClick={() => setExpandedSection(expandedSection === 'degrees' ? null : 'degrees')}
                          className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg bg-[#1a1d24] hover:bg-[#252830] transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-[var(--color-gold)]">🎼 Grados Funcionales</span>
                          <span className="text-xs" style={{ color: '#a0a8b8' }}>{expandedSection === 'degrees' ? '▲' : '▶'}</span>
                        </button>
                        {expandedSection === 'degrees' && (
                          <div className="mt-2 px-3 py-2 text-sm leading-relaxed rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                            <span style={{ color: '#e0e0e0' }}>{SCALE_EXTENDED_INFO[selectedScale as ScaleName]!.degrees.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* --- Relaciones con Otros Modos --- */}
                      <div className="mb-0 last:mb-0">
                        <button
                          onClick={() => setExpandedSection(expandedSection === 'relations' ? null : 'relations')}
                          className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg bg-[#1a1d24] hover:bg-[#252830] transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-[var(--color-gold)]">🔗 Relaciones con Otros Modos</span>
                          <span className="text-xs" style={{ color: '#a0a8b8' }}>{expandedSection === 'relations' ? '▲' : '▶'}</span>
                        </button>
                        {expandedSection === 'relations' && (
                          <div className="mt-2 px-3 py-2 text-sm italic rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)', borderLeft: '2px solid var(--color-gold)', color: '#e0e0e0' }}>
                            {SCALE_EXTENDED_INFO[selectedScale as ScaleName]!.relations}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ============================================================
              COLUMNA DERECHA: Visualización principal (SVG) + Controles flotantes
              ============================================================ */}
          <div className="flex flex-col items-center py-4 gap-4 w-full relative mt-4">
            
            {/* === CONTROLES FLOTANTES TOP-CENTER (conserva estilos originales) === */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-20 w-full max-w-[640px]">
              
              {/* === Contenido Dinámico: MODO ACORDE (Grados + Triada/Cuatriada + Play + Info) === */}
              {isChordMode && scaleIndices.length > 0 && (
                <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
                  
                  {/* Botones de Grados Diatónicos — permite navegar entre acordes de la escala */}
                  <div className="flex flex-wrap justify-center items-center gap-2">
                    {scaleIndices.map((noteIdx, degreeIdx) => {
                      const chordResult = getDiatonicChordFromScale(rootIndex, selectedScale, noteIdx, chordTypeMode === 'quartet', selectedRootName);
                      if (!chordResult) return null;
                      
                      const isActive = chordDegreeIndex === degreeIdx;
                      const degreeSym = chordResult.degreeSymbol;
                      
                      return (
                        <>
                          <button
                            key={`degree-${degreeIdx}`}
                            onClick={() => {
                              setChordDegreeIndex(degreeIdx);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 transform active:scale-95
                              ${isActive
                                ? 'bg-[var(--color-gold)] text-[var(--color-background)] shadow-[0_0_12px_rgba(223,196,127,0.5)] scale-105'
                                : 'bg-[#1a1d24] text-gray-400 border border-gray-700 hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/50'
                              }`}
                            style={{ fontFamily: 'Georgia, serif' }}
                          >
                            {degreeSym}
                          </button>
                          {degreeIdx < scaleIndices.length - 1 && <span className="text-gray-600 mx-1">|</span>}
                        </>
                      );
                    })}
                  </div>

                  {/* === Panel de Info y Reproducción del Acorde === */}
                  <div className="flex flex-col gap-3">
                    {/* Botones Triada/Cuatriada — conserva estilos chord-type-button originales */}
                    <div className="chord-type-selector">
                      <button
                        onClick={() => setChordTypeMode('triad')}
                        className={`chord-type-button ${chordTypeMode === 'triad' ? 'active' : 'inactive'}`}
                      >
                        Triada (3 notas)
                      </button>
                      <button
                        onClick={() => setChordTypeMode('quartet')}
                        className={`chord-type-button ${chordTypeMode === 'quartet' ? 'active' : 'inactive'}`}
                      >
                        Cuatriada (4 notas)
                      </button>
                    </div>

                    {/* Botón de Reproducción de Acorde — conserva estilos play-button originales */}
                    <button
                      onClick={isChordPlaying ? stopPlayback : playChordTravel}
                      disabled={!selectedChord || selectedChord.notes.length === 0}
                      className={`play-button chord-play-button ${isChordPlaying ? 'playing' : ''}`}
                    >
                      <div className="play-icon">
                        {isChordPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </div>
                      <div className="play-text">
                        {isChordPlaying ? 'Stop' : 'Play'}
                      </div>
                    </button>

                    {/* Panel de Información del Acorde — siempre muestra datos cuando hay acorde seleccionado */}
                    {selectedChord && chordName ? (
                      <div className="bg-[#1a0f14] border border-[var(--color-gold)] rounded-md p-3 text-sm flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400">Acorde: <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{chordName}</span></span>
                        <span className="text-[var(--color-gold)]/50">|</span>
                        <span className="text-gray-400">Grado: <span style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>{chordDegree}</span></span>
                        <span className="text-[var(--color-gold)]/50">|</span>
                        <span className="text-gray-400">Notas: <span style={{ color: '#a89475' }}>{selectedChord.notes.map(n => n.name).join(' • ')}</span></span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="relative w-full max-w-[550px] flex justify-center mt-12">
              <CircleOfNotes
                scaleName={selectedScale}
                rootIndex={rootIndex}
                activeNoteIndex={activeNoteIndex}
                activeLineIndex={activeLineIndex}
                noteDurationSeconds={noteDurationSecondsRef.current}
                selectedRootName={selectedRootName}
                polygonComplete={polygonComplete}
                drawnLineIndices={drawnLineIndices}
                isTracing={isTracing}
                reproductionKey={reproductionKey}
                // === v12.0: Modo Acorde ===
                chordNotes={chordNotesForSvg}
                chordNoteNames={chordNoteNames}
                chordName={chordName}
                chordDegree={chordDegree}
                isChordMode={isChordMode}
                isChordPlaying={isChordPlaying}
                // === v17.0: Props para Recorrido Neón ===
                chordDrawnLineIndices={chordDrawnLineIndices}
                chordActiveLineIndex={chordActiveLineIndex}
                chordPolygonComplete={chordPolygonComplete} // v13.3: polígono persistente como marca de agua
                // === v23.0: Color personalizado para polígonos ===
                scalePolygonColor={appMode === 'scale' ? scalePolygonColor : undefined}
                chordPolygonColor={appMode === 'chord' ? chordPolygonColor : undefined}
                borderColor={borderColor}
                // === v24.0: Color personalizado para línea neón animada ===
                neonLineColor={neonLineColor}
                onNoteClick={(noteIndex: number) => {
                  if (isChordMode) {
                    handleChordNoteClick(noteIndex);
                  } else {
                    handleNoteClick(noteIndex);
                  }
                }}
              />
            </div>

            {/* === Navegación anterior/siguiente escala + color picker (v23.0) === */}
            {(appMode === 'scale' || appMode === 'chord') && allScalesFlat.length > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 mb-4">
                {/* Botón Anterior */}
                <button
                  onClick={handlePrevScale}
                  disabled={isPlaying || isChordPlaying}
                  className="w-[72px] h-[72px] flex items-center justify-center rounded-full transition-all border-[3px] hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  style={{
                    backgroundColor: '#dfc47f',
                    borderColor: '#b8942e',
                    color: '#1a1d24'
                  }}
                  title="Escala anterior"
                >
                  <ChevronLeft size={36} />
                </button>
                
                {/* Nombre de escala */}
                <span className="text-2xl font-semibold flex-shrink-0" style={{ color: 'var(--color-gold)' }}>
                  {getScaleBaseName(selectedScale)}
                </span>
                
                {/* Botón Siguiente */}
                <button
                  onClick={handleNextScale}
                  disabled={isPlaying || isChordPlaying}
                  className="w-[72px] h-[72px] flex items-center justify-center rounded-full transition-all border-[3px] hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  style={{
                    backgroundColor: '#dfc47f',
                    borderColor: '#b8942e',
                    color: '#1a1d24'
                  }}
                  title="Siguiente escala"
                >
                  <ChevronRight size={36} />
                </button>
                
                {/* Color picker para modo Escala — inline en mismo renglón, sin separadores | */}
                {appMode === 'scale' && (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', marginLeft: '12px' }}>
                      <span className="text-[var(--color-gold)] text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>Escala Color</span>
                      <input
                        type="color"
                        value={scalePolygonColor}
                        onInput={(e) => setScalePolygonColor(e.currentTarget.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          backgroundColor: scalePolygonColor,
                          border: 'none',
                          padding: '0',
                          lineHeight: 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                        }}
                        title="Color del polígono de escala"
                      />
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', marginLeft: '12px' }}>
                      <span className="text-[var(--color-gold)] text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>Borde Color</span>
                      <input
                        type="color"
                        value={neonLineColor}
                        onInput={(e) => setNeonLineColor(e.currentTarget.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          backgroundColor: neonLineColor,
                          border: 'none',
                          padding: '0',
                          lineHeight: 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                        }}
                        title="Color del borde de la escala"
                      />
                    </span>
                  </>
                )}
                
                {/* Color picker para modo Acorde — inline en mismo renglón, sin separadores | */}
                {appMode === 'chord' && (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', marginLeft: '12px' }}>
                      <span className="text-[var(--color-gold)] text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>Acorde Color</span>
                      <input
                        type="color"
                        value={chordPolygonColor}
                        onInput={(e) => setChordPolygonColor(e.currentTarget.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          backgroundColor: chordPolygonColor,
                          border: 'none',
                          padding: '0',
                          lineHeight: 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                        }}
                        title="Color del polígono de acorde"
                      />
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', marginLeft: '12px' }}>
                      <span className="text-[var(--color-gold)] text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>Borde Color</span>
                      <input
                        type="color"
                        value={neonLineColor}
                        onInput={(e) => setNeonLineColor(e.currentTarget.value)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          backgroundColor: neonLineColor,
                          border: 'none',
                          padding: '0',
                          lineHeight: 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                        }}
                        title="Color del borde del acorde"
                      />
                    </span>
                  </>
                )}
              </div>
            )}

            {/* === Tempo + Reproducción (debajo del círculo) === */}
            <div className="tempo-bar w-full max-w-[550px] mt-6">
              {/* Renglón 1: Textos y BPM */}
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span className="text-[var(--color-gold)] text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>Tempo</span>
                <div className="flex items-center gap-2">
                  <span className="badge" style={{ color: bpm < 60 ? '#60a5fa' : bpm < 80 ? '#4ade80' : '#f87171', backgroundColor: bpm < 60 ? 'rgba(96,165,250,0.15)' : bpm < 80 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }}>
                    {bpm < 60 ? 'Lento' : bpm < 80 ? 'Moderado' : 'Rápido'}
                  </span>
                  <span className="bpm-value">{bpm}</span>
                  <span className="text-sm" style={{ color: '#a0a8b8' }}>BPM</span>
                </div>
              </div>

              {/* Renglón 2: Slider con - y + */}
              <div className="flex items-center" style={{ gap: '8px' }}>
                <button
                  onClick={() => setBpm(Math.max(MIN_BPM, bpm - 5))}
                  className="py-1 px-2.5 rounded bg-[#4a4430] hover:bg-[#5a5440] text-[var(--color-gold)] transition-all border border-[var(--color-gold)]/30 font-bold"
                >
                  −
                </button>
                <input
                  type="range"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  step={5}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="flex-grow accent-[var(--color-gold)]"
                />
                <button
                  onClick={() => setBpm(Math.min(MAX_BPM, bpm + 5))}
                  className="py-1 px-2.5 rounded bg-[#4a4430] hover:bg-[#5a5440] text-[var(--color-gold)] transition-all border border-[var(--color-gold)]/30 font-bold"
                >
                  +
                </button>
              </div>

              {/* Renglón 3: Botón Play centrado debajo del BPM */}
              <div className="flex justify-center mt-2">
                {!isChordMode ? (
                  <button
                    onClick={isPlaying ? stopPlayback : playScale}
                    disabled={!scaleData || scaleIndices.length === 0}
                    className={`play-button chord-play-button ${isPlaying ? 'play-button-playing' : ''}`}
                  >
                    <div className="play-icon">
                      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </div>
                    <div className="play-text">
                      {isPlaying ? 'Stop' : 'Play'}
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={isChordPlaying ? stopPlayback : playChordTravel}
                    disabled={!selectedChord || selectedChord.notes.length === 0}
                    className={`play-button chord-play-button ${isChordPlaying ? 'play-button-playing' : ''}`}
                  >
                    <div className="play-icon">
                      {isChordPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </div>
                    <div className="play-text">
                      {isChordPlaying ? 'Stop' : 'Play'}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* === Botón Exportar Audio (v21.7 — separado del Play) === */}
            <div className="flex justify-center mt-4">
              {((!isChordMode && scaleData && scaleIndices.length > 0) ||
                (isChordMode && selectedChord && selectedChord.notes.length > 0)) && (
                <button
                  onClick={handleExportAudio}
                  disabled={isExporting}
                  className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all border ${
                    isExporting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  style={{
                    backgroundColor: '#4a4430',
                    borderColor: 'var(--color-gold)/30',
                    color: 'var(--color-gold)'
                  }}
                >
                  {isExporting ? (
                    <div className="animate-spin w-5 h-5 border-2 border-[var(--color-gold)] border-t-transparent rounded-full" />
                  ) : (
                    <Download size={18} />
                  )}
                  <span className="text-sm font-medium">
                    {isExporting
                      ? 'Exportando...'
                      : isChordMode
                        ? 'Exportar Acorde WAV'
                        : 'Exportar Escala WAV'
                    }
                  </span>
                </button>
              )}
            </div>

            {/* === Controles de Audio (debajo del círculo) === */}
            <div className="section-card flex flex-col gap-3 w-full max-w-[550px] mt-6">
              <h3 className="text-sm font-semibold text-[var(--color-gold)] text-center">🎧 Audio</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs w-16" style={{ color: '#a0a8b8' }}>Volumen:</span>
                <input
                  type="range" min="-30" max="0" value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[var(--color-gold)]"
                />
                <span className="text-xs text-[var(--color-gold)] font-mono">{volume}dB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-16" style={{ color: '#a0a8b8' }}>Sonido:</span>
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value as InstrumentId)}
                  className="w-full bg-[#4a4430] text-[var(--color-gold)] text-xs p-1.5 rounded outline-none border border-[var(--color-gold)]/30"
                >
                  <option value="proPiano">🎹 Piano Profesional</option>
                  <option value="campana">🔔 Campana</option>
                </select>
              </div>
            </div>
          </div>
          </div>  {/* Fin two-column-layout */}
          <footer className="w-full text-center py-4 border-t border-gray-800 mt-6">
            <div className="flex flex-col items-center gap-1 text-xs" style={{ color: 'var(--color-gold)' }}>
              <p className="text-[var(--color-gold)]/60">Creado por Andrés Eduardo Garzón Polanía</p>
              <p className="text-[var(--color-gold)]/60">andresmusic1@gmail.com · +57 3153159379</p>
            </div>
          </footer>
          </>
        )}
      </div> {/* Fin contenedor principal */}
    </>
  );
};

export default App;

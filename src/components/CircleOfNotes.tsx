import React, { useState, useEffect } from 'react';
import { CHROMATIC_SCALE, getScaleIndices, getEnharmonicLabel, isNoteInScale, getScaleNameLines, type EnharmonicLabel } from '../lib/musicLogic';
import type { ScaleName } from '../lib/musicLogic';

// ============================================================
// Configuración visual del SVG
// ============================================================
const SVG_SIZE = 500;
export const CENTER = SVG_SIZE / 2; // 250
export const CIRCLE_RADIUS = 185;    // Radio para las notas en el perímetro
export const POLYGON_RADIUS = 160;   // Radio ligeramente menor para el polígono interno
export const NOTE_TEXT_RADIUS = 200; // Radio para el texto (un poco más afuera)

// Tamaño de fuente dinámico basado en el contenido
const NOTE_FONT_SIZE = 30;
const SCALE_NAME_FONT_SIZE = 36;

// Configuración para notas apiladas (enarmónicos dobles)
const STACK_OFFSET = 14; // píxeles de separación total entre las dos variantes apiladas
const STACKED_FONT_SIZE = 16; // fontSize ajustado para legibilidad con separación aumentada

// Colores para diferenciación visual: dentro vs fuera de escala (Opción A)
const COLOR_IN_SCALE = '#f0d68c';    // dorado brillante — notas DENTRO de la escala
const COLOR_OUT_OF_SCALE = '#8b9095'; // gris cálido ligeramente más visible — notas FUERA de la escala
const COLOR_ACTIVE = '#e53e3e';      // rojo — nota que está sonando actualmente

// Colores para el texto del acorde centrado (v18.0)
const CHORD_TEXT_BG_COLOR = '#0d6200';    // azul marino medio — fondo sólido detrás del texto
const CHORD_DEGREE_COLOR = '#f0d68c';     // dorado brillante — grado romano sobre azul
const CHORD_NAME_COLOR = '#ffffff';       // blanco puro — nombre del acorde principal
const CHORD_NOTES_COLOR = '#c8b88a';      // dorado claro — notas del acorde debajo

/**
 * Subcomponente para renderizar una nota del círculo con soporte enarmónico doble.
 *
 * Decisiones de diseño (confirmadas por usuario):
 * - Hover: solo la variante bajo el cursor se resalta
 * - Click: alterna entre variantes (no popup)
 * - Transición: fade suave de 200ms
 * - Accesibilidad: un elemento <g> con aria-label combinado
 */
const EnharmonicNote: React.FC<{
  label: EnharmonicLabel;
  isActive: boolean;
  isHovered: boolean;
  noteIdx: number;
  rootIndex: number;
  isInScale: boolean;              // ← NUEVA PROP: indica si la nota pertenece a la escala
  onHover: (noteIdx: number | null) => void;
  centerX: number;
  centerY: number;
  textRadius: number;
  fontSize: number;
}> = ({ label, isActive, isHovered, noteIdx, rootIndex, isInScale, onHover, centerX, centerY, textRadius, fontSize }) => {
  const pos = getRotatedNotePosition(noteIdx, rootIndex, centerX, centerY, textRadius);
  
  const isEmphasized = isActive || isHovered;
  const baseColor = isInScale ? COLOR_IN_SCALE : COLOR_OUT_OF_SCALE;
  const fill = isActive ? COLOR_ACTIVE : baseColor;
  
  if (!label.isStacked) {
    // Nota simple (dentro de escala o natural fuera)
    // Delineado blanco para notas dentro de la escala — mejora distinción visual
    const noteStroke = isInScale && !isActive ? '#e8ff00' : 'none';
    const strokeWidthVal = isInScale && !isActive ? 3 : 0;
    
    return (
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fill}
        fontSize={NOTE_FONT_SIZE}
        fontWeight={isEmphasized ? 'bold' : 'normal'}
        stroke={noteStroke}
        strokeWidth={strokeWidthVal}
        className="transition-all duration-200 select-none cursor-pointer"
        style={{
          paintOrder: isInScale && !isActive ? 'stroke' : 'fill',
          filter: isEmphasized && isInScale ? `drop-shadow(0 0 8px rgba(229, 62, 62, 0.8))` : 'none',
          opacity: isInScale ? (isEmphasized ? 1 : 0.95) : (isEmphasized ? 0.85 : 0.5),
        }}
        onMouseEnter={() => onHover(noteIdx)}
        onMouseLeave={() => onHover(null)}
      >
        {label.primary}
      </text>
    );
  }
  
  // Nota apilada (fuera de escala con ambas variantes)
  // Usamos dominantBaseline="central" para ambos pero con offsets ajustados:
  // - primary se posiciona ligeramente arriba del centro
  // - secondary se posiciona ligeramente abajo del centro
  // Ambos comparten el mismo x=center, creando apilamiento perfecto
  return (
    <g
      className="transition-all duration-200 select-none cursor-pointer"
      aria-label={`${label.primary}/${label.secondary}`}
      onMouseEnter={() => onHover(noteIdx)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Variante primary (arriba) */}
      <text
        x={pos.x}
        y={pos.y - STACK_OFFSET / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fill}
        fontSize={STACKED_FONT_SIZE}
        fontWeight={isActive ? 'bold' : 'normal'}
        className="transition-all duration-200"
        style={{
          filter: isActive && isInScale ? `drop-shadow(0 0 6px rgba(229, 62, 62, 0.6))` : 'none',
          opacity: isInScale ? (isActive ? 1 : 0.85) : (isActive ? 0.85 : 0.7),
        }}
      >
        {label.primary}
      </text>
      {/* Variante secondary (abajo) */}
      <text
        x={pos.x}
        y={pos.y + STACK_OFFSET / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fill}
        fontSize={STACKED_FONT_SIZE}
        fontWeight={isActive ? 'bold' : 'normal'}
        className="transition-all duration-200"
        style={{
          filter: isActive && isInScale ? `drop-shadow(0 0 6px rgba(229, 62, 62, 0.6))` : 'none',
          opacity: isInScale ? (isActive ? 1 : 0.85) : (isActive ? 0.85 : 0.7),
        }}
      >
        {label.secondary}
      </text>
    </g>
  );
};

// ============================================================
// Props del componente CircleOfNotes
// ============================================================
interface CircleOfNotesProps {
  /** Nombre de la escala actual (Major, Minor, Dorian, etc.) */
  scaleName: ScaleName;
  /** Índice de la nota raíz de la escala (0-11) */
  rootIndex: number;
  /** Índice de la nota que está sonando actualmente (-1 si ninguna) */
  activeNoteIndex: number;
  /** Índice de la línea activa del polígono animado (-1 si ninguna) */
  activeLineIndex: number;
  /** Duración de cada nota en segundos (calculada dinámicamente desde BPM) */
  noteDurationSeconds: number;
  /** Nombre visual de la raíz seleccionada para contexto enarmónico (ej: "C#", "Db") */
  selectedRootName?: string;
  /** Indica que el polígono se completó (para activar pulso de cierre) */
  polygonComplete?: boolean;
  /** Índices de líneas ya trazadas para persistencia visual */
  drawnLineIndices?: number[];
  /** Indica que la reproducción/trazado está activo y el polígono debe mostrarse en marca de agua */
  isTracing?: boolean;
  /** Key para forzar reconstrucción del polígono neón en cada reproducción (elimina animación de retroceso) */
  reproductionKey?: number;
  
  // === v12.0: Modo Acorde ===
  /** Índices cromáticos de las notas del acorde seleccionado */
  chordNotes?: number[];
  /** Nombres de las notas del acorde con contexto enarmónico correcto (ej: ["F#", "A#", "C#"], no ["Gb", "Bb", "Db"]) */
  chordNoteNames?: string[];
  /** Nombre del acorde para mostrar en el centro (ej: "Cmaj7", "Dm7") */
  chordName?: string;
  /** Grado diatónico del acorde (I, ii, iii, IV, V, vi, viiº) */
  chordDegree?: string;
  /** Indica que el modo acorde está activo */
  isChordMode?: boolean;
  /** Indica que el acorde se está reproduciendo */
  isChordPlaying?: boolean;
  /** Callback cuando se hace clic en una nota del círculo (para seleccionar acorde) */
  onNoteClick?: (noteIndex: number) => void;

  // === v22.1: Modo Quiz — ocultar texto central para pregunta visual ===
  /** Oculta el nombre de la escala/acorde en el centro del círculo */
  hideCenterText?: boolean;
  /** Factor de escala para el círculo (1 = normal, 3 = grande para quiz visual) */
  scaleCircle?: number;
  
  // === v17.0: Props para Recorrido Neón del Acorde ===
  /** Índices de segmentos del acorde ya trazados */
  chordDrawnLineIndices?: number[];
  /** Índice del segmento activo del acorde */
  chordActiveLineIndex?: number;
  /** Indica que el trazado del acorde terminó y debe mostrarse el impacto rojo fijo */
  chordPolygonComplete?: boolean;
}

/**
 * Calcula la posición rotada de una nota en el círculo cromático.
 * La nota raíz (rootIndex) se posiciona siempre a las 12 en punto (-90°).
 *
 * @param noteIndex - Índice cromático de la nota (0-11)
 * @param rootIndex - Índice de la nota raíz seleccionada (0-11)
 * @param centerX - Coordenada X del centro del SVG
 * @param centerY - Coordenada Y del centro del SVG
 * @param radius - Radio para posicionar la nota
 * @returns Objeto { x, y } con las coordenadas rotadas
 */
/**
 * Calcula la posición rotada de una nota en el círculo cromático.
 * La nota raíz (rootIndex) se posiciona siempre a las 12 en punto (-90°).
 *
 * @param noteIndex - Índice cromático de la nota (0-11)
 * @param rootIndex - Índice de la nota raíz seleccionada (0-11)
 * @param centerX - Coordenada X del centro del SVG
 * @param centerY - Coordenada Y del centro del SVG
 * @param radius - Radio para posicionar la nota
 * @returns Objeto { x, y } con las coordenadas rotadas
 */
export function getRotatedNotePosition(
  noteIndex: number,
  rootIndex: number,
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number } {
  // Ángulo inicial: -90° (parte superior del círculo)
  const startAngle = -Math.PI / 2;
  // Cada nota representa 30 grados (2π radianes / 12 notas)
  const angleStep = (2 * Math.PI) / 12;
  
  // Fórmula de rotación: restamos rootIndex para que la raíz quede arriba
  const angle = startAngle + ((noteIndex - rootIndex) * angleStep);

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Componente principal que renderiza el círculo cromático interactivo.
 *
 * Muestra:
 * - Las 12 notas distribuidas equitativamente en un círculo SVG (rotado dinámicamente)
 * - Un polígono interno que conecta las notas de la escala seleccionada
 * - El nombre de la escala en el centro
 * - Resaltado rojo de la nota activa (que está sonando)
 * - Labels enarmónicos correctos según la escala/raíz actual
 */
const CircleOfNotes: React.FC<CircleOfNotesProps> = ({
  scaleName,
  rootIndex,
  activeNoteIndex,
  activeLineIndex,
  drawnLineIndices = [],
  noteDurationSeconds,
  selectedRootName,
  polygonComplete,
  isTracing = false,
  reproductionKey = 0,
  // === v12.0: Modo Acorde ===
  chordNotes,
  chordNoteNames,
  chordName,
  chordDegree,
  isChordMode = false,
  isChordPlaying = false,
  onNoteClick,
  hideCenterText = false,
  scaleCircle = 1,
  // === v17.0: Props para Recorrido Neón del Acorde ===
  chordDrawnLineIndices = [],
  chordActiveLineIndex = -1,
  chordPolygonComplete = false, // v13.3: polígono persistente como marca de agua
}) => {
  
  // === v22.1: Escala dinámica para modo quiz (3x tamaño) ===
  const effectiveSize = SVG_SIZE * scaleCircle;
  const effectiveCenter = effectiveSize / 2;
  const effectiveCircleRadius = CIRCLE_RADIUS * scaleCircle;
  const effectivePolygonRadius = POLYGON_RADIUS * scaleCircle;
  const effectiveNoteTextRadius = NOTE_TEXT_RADIUS * scaleCircle;
  const effectiveFontSize = Math.round(NOTE_FONT_SIZE * scaleCircle);
  
  // Resetear animación de pulso cuando polygonComplete cambia a false
  const [pulseKey, setPulseKey] = useState<number>(0);
  useEffect(() => {
    if (polygonComplete) {
      setPulseKey(k => k + 1); // Forzar re-render para reiniciar animación CSS
    }
  }, [polygonComplete]);
  
  // Calcular los índices de las notas que pertenecen a la escala actual
  const scaleIndices = getScaleIndices(rootIndex, scaleName);

  // === Redondeo de coordenadas para evitar errores de punto flotante en SVG ===
  // Las diferencias mínimas de punto flotante (dx/dy ~1e-14) causan que el navegador
  // no rasterice correctamente las líneas. Redondeamos a 2 decimales.
  const ROUND_DECIMALS = 2;
  const roundPos = (pos: { x: number; y: number }) => ({
    x: Math.round(pos.x * 10 ** ROUND_DECIMALS) / 10 ** ROUND_DECIMALS,
    y: Math.round(pos.y * 10 ** ROUND_DECIMALS) / 10 ** ROUND_DECIMALS,
  });

  // Generar las coordenadas para el polígono de la escala (con rotación y escala)
  const polygonPoints = scaleIndices
    .map((noteIdx) => {
      const pos = roundPos(getRotatedNotePosition(noteIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius));
      return `${pos.x},${pos.y}`;
    })
    .join(' ');

  // === Animación de trazado: calcular segmentos del polígono ===
  interface PolygonSegment {
    start: { x: number; y: number };
    end: { x: number; y: number };
    length: number;
  }

  const polygonSegments: PolygonSegment[] = [];
  for (let i = 0; i < scaleIndices.length; i++) {
    const fromIdx = scaleIndices[i];
    const toIdx = scaleIndices[(i + 1) % scaleIndices.length];
    const start = roundPos(getRotatedNotePosition(fromIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius));
    const end = roundPos(getRotatedNotePosition(toIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius));
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    polygonSegments.push({ start, end, length });
  }

  // === v17.0: Segmentos del acorde (para polígono neón dorado) ===
  interface ChordSegment {
    start: { x: number; y: number };
    end: { x: number; y: number };
    length: number;
  }

  const chordSegments: ChordSegment[] = [];
  if (chordNotes && chordNotes.length >= 3) {
    for (let i = 0; i < chordNotes.length; i++) {
      const fromIdx = chordNotes[i];
      const toIdx = chordNotes[(i + 1) % chordNotes.length];
      const start = roundPos(
        getRotatedNotePosition(fromIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius)
      );
      const end = roundPos(
        getRotatedNotePosition(toIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius)
      );
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      chordSegments.push({ start, end, length });
    }
  }

  const chordPerimeter = chordSegments.reduce((sum, seg) => sum + seg.length, 0);

  // Longitud trazada: usar chordActiveLineIndex si está activo, sino chordDrawnLineIndices
  // La animación progresiva depende de que chordActiveLineIndex se actualice con Tone.Draw.schedule
  // v13.3: Cuando chordPolygonComplete=true, el polígono está completo → mostrar perímetro total
  const chordDrawnLength = (() => {
    if (chordSegments.length === 0) return 0;
    
    // v13.3: Polígono completo persistente — retorna perímetro total para marca de agua
    if (chordPolygonComplete) return chordPerimeter;
    
    if (chordActiveLineIndex >= 0) {
      return chordSegments.slice(0, chordActiveLineIndex + 1).reduce((sum, seg) => sum + seg.length, 0);
    }
    if (chordDrawnLineIndices.length > 0) {
      return chordSegments.slice(0, chordDrawnLineIndices.length).reduce((sum, seg) => sum + seg.length, 0);
    }
    // Al inicio de la reproducción: mostrar nada hasta que Tone.Draw.schedule actualice chordActiveLineIndex
    return 0;
  })();

  const drawnLineSet = new Set<number>(drawnLineIndices || []);

  const completedRatio = polygonSegments.length > 0 && activeLineIndex >= 0
    ? (activeLineIndex + 1) / polygonSegments.length
    : 0;

  const polygonBaseFillOpacity = polygonComplete
    ? 0.5
    : isTracing
      ? 0.04 + completedRatio * 0.08
      : 0.08;

  const polygonBaseStrokeOpacity = polygonComplete
    ? 1
    : isTracing
      ? 0.18 + completedRatio * 0.22
      : 0.35;

  const polygonStroke = polygonComplete ? "#dc2626" : "#dfc47f";

  const polygonFill = polygonComplete ? "#420092" : "url(#polygonGradient)";
  const polygonFilter = "none";

  // === Calcular strokeDasharray total para el polígono neón ===
  const totalPolygonPerimeter = polygonSegments.reduce((sum, seg) => sum + seg.length, 0);

  // Cálculo SÍNCRONO de la longitud de la línea (elimina el lag de renderizado)
  const drawnLength = activeLineIndex >= 0 && !polygonComplete
    ? polygonSegments.slice(0, activeLineIndex + 1).reduce((sum, seg) => sum + seg.length, 0)
    : polygonComplete
      ? totalPolygonPerimeter
      : 0;

  const scaleTextOpacity = polygonComplete ? 0.95 : isTracing ? 0.35 : 0.8;
  const scaleTextFilter = polygonComplete
    ? 'drop-shadow(0 0 12px rgba(223, 196, 127, 0.8)) drop-shadow(0 0 8px rgba(0, 0, 0, 0.7))'
    : isTracing
      ? 'drop-shadow(0 0 4px rgba(223, 196, 127, 0.25))'
      : 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.7))';

  // Generar las líneas que conectan cada nota adyacente del círculo (borde dorado) — con escala
  const circleLines = CHROMATIC_SCALE.map((_, i) => {
    const nextIdx = (i + 1) % 12;
    const currentPos = getRotatedNotePosition(i, rootIndex, effectiveCenter, effectiveCenter, effectiveCircleRadius);
    const nextPos = getRotatedNotePosition(nextIdx, rootIndex, effectiveCenter, effectiveCenter, effectiveCircleRadius);
    
    return (
      <line
        key={`circle-line-${i}`}
        x1={currentPos.x}
        y1={currentPos.y}
        x2={nextPos.x}
        y2={nextPos.y}
        stroke="#dfc47f"
        strokeWidth="2"
        opacity="0.6"
      />
    );
  });

  // Estado para hover en notas apiladas (resaltar solo la variante bajo el cursor)
  const [hoveredNoteIdx, setHoveredNoteIdx] = useState<number | null>(null);

  // Generar los elementos de nota del círculo cromático usando EnharmonicNote
  const noteElements = CHROMATIC_SCALE.map((_, noteIdx) => {
    const label = getEnharmonicLabel(noteIdx, rootIndex, scaleName, selectedRootName);
    const isActive = activeNoteIndex === noteIdx;
    const isInScale = isNoteInScale(noteIdx, rootIndex, scaleName); // ← NUEVO: verificar si nota pertenece a escala
    
    const handleClick = () => {
      if (onNoteClick) {
        onNoteClick(noteIdx);
      }
    };
    
    return (
      <g
        key={`note-${noteIdx}`}
        onClick={handleClick}
        style={{ cursor: onNoteClick ? 'pointer' : 'default' }}
      >
        <EnharmonicNote
          label={label}
          isActive={isActive}
          isHovered={hoveredNoteIdx === noteIdx}
          noteIdx={noteIdx}
          rootIndex={rootIndex}
          isInScale={isInScale}
          onHover={(idx) => setHoveredNoteIdx(idx)}
          centerX={effectiveCenter}
          centerY={effectiveCenter}
          textRadius={effectiveNoteTextRadius}
          fontSize={effectiveFontSize}
        />
      </g>
    );
  });

  return (
    <div className="flex items-center justify-center w-full">
      {/* SVG con posiciones calculadas dinámicamente por getRotatedNotePosition() */}
      {/* La raíz siempre queda a las 12 en punto sin necesidad de rotación CSS */}
      <svg
        viewBox={`0 0 ${effectiveSize} ${effectiveSize}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl max-w-[500px]"
      >
      {/* Transformar el contenido del SVG hacia abajo */}
      <g transform={`translate(0, 25)`}>
      {/* Definiciones para efectos de filtro */}
          <defs>
            {/* Filtro glow estándar para notas activas */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Filtro neón sutil para líneas animadas */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Filtro glow rojo para acordes (v12.0) */}
            <filter id="chordGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Gradiente para el polígono de la escala */}
            <linearGradient id="polygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#23dc2f" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0.1" />
            </linearGradient>

            {/* Gradiente para el polígono del acorde (Opción A) */}
            <linearGradient id="chordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0baa00" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1e6c6c" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Líneas del círculo cromático (borde dorado) */}
          {circleLines}

          {/* Polígono base que conecta las notas de la escala actual (siempre visible) */}
          <polygon
            key={pulseKey}
            points={polygonPoints}
            fill={polygonFill}
            stroke={polygonStroke}
            strokeWidth="2"
            strokeLinejoin="round"
            className="transition-all duration-300"
            style={{
              animation: polygonComplete ? 'polygonPulse 0.6s ease-out' : 'none',
              fillOpacity: polygonBaseFillOpacity,
              strokeOpacity: polygonBaseStrokeOpacity,
              filter: polygonFilter,
            }}
          />

          {/* === Polígono neón — key fuerza reconstrucción DOM en cada reproducción (elimina animación de retroceso) === */}
          <polygon
            key={`neon-polygon-${reproductionKey}`}
            points={polygonPoints}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray={`${totalPolygonPerimeter} ${totalPolygonPerimeter}`}
            strokeDashoffset={totalPolygonPerimeter - drawnLength}
            filter="url(#neonGlow)"
            // Se hace visible solo cuando isTracing o polygonComplete son true
            opacity={(isTracing || polygonComplete) ? 0.75 : 0}
            style={{
              // La transición usa duración rítmica estricta (BPM-based)
              transition: `stroke-dashoffset ${noteDurationSeconds}s linear, opacity 0.2s ease-in-out`,
            }}
          />

          {/* Notas del círculo cromático (EnharmonicNote) */}
          {noteElements}

          {/* === v18.5: Relleno Azul del Polígono del Acorde — DESPUÉS del neón en DOM (no tapa el neon) === */}
          {/* Se renderiza primero visualmente (fondo), pero se escribe después para no interferir con stroke del neon */}
          {chordNotes && chordNotes.length >= 3 && (
            <polygon
              points={chordNotes
                .map((noteIdx) => {
                  const pos = roundPos(getRotatedNotePosition(noteIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius));
                  return `${pos.x},${pos.y}`;
                })
                .join(' ')}
              fill="url(#chordGradient)"
              fillOpacity={chordPolygonComplete ? 1 : 0}
              stroke="none"
              shape-rendering="geometricPrecision"
              style={{ transition: 'fill-opacity 0.4s ease-out' }}
            />
          )}

          {/* === v17.0: Polígono Neón del Acorde — DESPUÉS del relleno (siempre visible por encima) === */}
          {chordNotes && chordNotes.length >= 3 && chordPerimeter > 0 && (
            <polygon
              key={`chord-neon-${reproductionKey}`}
              points={chordNotes
                .map((noteIdx) => {
                  const pos = roundPos(
                    getRotatedNotePosition(noteIdx, rootIndex, effectiveCenter, effectiveCenter, effectivePolygonRadius)
                  );
                  return `${pos.x},${pos.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.0"
              strokeLinejoin="round"
              strokeDasharray={`${chordPerimeter} ${chordPerimeter}`}
              strokeDashoffset={chordPerimeter - chordDrawnLength}
              filter="url(#neonGlow)"
              opacity={chordPolygonComplete && !isChordPlaying ? 0.65 : (chordDrawnLength > 0 && isChordPlaying) ? 0.75 : 0}
              style={{
                willChange: 'stroke-dashoffset',
                transition: `stroke-dashoffset ${noteDurationSeconds}s linear`,
              }}
            />
          )}

          {/* === v18.3: Capas rojas eliminadas — solo neón dorado + relleno azul (limpio) === */}

          {/* Nombre del acorde o escala en el centro (oculto en modo quiz visual) */}
          {!hideCenterText && (
            <g
              style={{
                animation: polygonComplete ? 'scaleNameGlow 0.8s ease-out' : 'none',
              }}
            >
              {(() => {
                // v12.0: Si hay acorde seleccionado, mostrar nombre del acorde + grado
                if (chordName && chordDegree) {
                  return (
                    <>
                      {/* Grado romano sobre el nombre del acorde */}
                      <text
                        x={effectiveCenter}
                        y={effectiveCenter - 30 * scaleCircle}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="20"
                        fontWeight="bold"
                        className="select-none"
                        style={{
                          fontFamily: 'Georgia, serif',
                          filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))',
                        }}
                      >
                        {chordDegree}
                      </text>
                      {/* Nombre del acorde */}
                      <text
                        x={effectiveCenter}
                        y={effectiveCenter + 5 * scaleCircle}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={CHORD_NAME_COLOR}
                        fontSize={SCALE_NAME_FONT_SIZE}
                        fontWeight="600"
                        opacity={isChordPlaying ? 1 : 0.95}
                        className="select-none"
                        style={{
                          fontFamily: 'Georgia, serif',
                          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.6))',
                        }}
                      >
                        {chordName}
                      </text>
                      {/* Nota del acorde debajo */}
                      <text
                        x={effectiveCenter}
                        y={effectiveCenter + 35 * scaleCircle}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="14"
                        opacity={0.85}
                        className="select-none"
                        style={{
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        {chordNotes?.map((idx, i) => {
                          // ✅ v15.2: Usar chordNoteNames si disponible (con contexto enarmónico correcto)
                          const noteName = chordNoteNames?.[i] ?? CHROMATIC_SCALE[idx];
                          return noteName + (i < chordNotes.length - 1 ? ' • ' : '');
                        })}
                      </text>
                    </>
                  );
                }
                
                // Comportamiento normal: mostrar nombre de la escala — con escala
                const lines = getScaleNameLines(scaleName);
                const lineHeight = SCALE_NAME_FONT_SIZE * 1.2 * scaleCircle;
                const totalHeight = lines.length * lineHeight;
                const startY = effectiveCenter - totalHeight / 2 + lineHeight / 2;
                
                return lines.map((line, idx) => (
                  <text
                    key={idx}
                    x={effectiveCenter}
                    y={startY + idx * lineHeight}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#F5E6C8"
                    fontSize={Math.round(SCALE_NAME_FONT_SIZE * scaleCircle)}
                    fontWeight="light"
                    opacity={scaleTextOpacity}
                    className="select-none"
                    style={{
                      fontFamily: 'Georgia, serif',
                      filter: scaleTextFilter,
                    }}
                  >
                    {line}
                  </text>
                ));
              })()}
            </g>
          )}

          {/* === Grado romano del acorde — solo centrado dentro del polígono (v12.0 eliminado exterior) === */}

          {/* Indicador de nota raíz (pequeño punto) — con escala */}
          {activeNoteIndex >= 0 && (() => {
            const rootPos = getRotatedNotePosition(rootIndex, rootIndex, effectiveCenter, effectiveCenter, effectiveCircleRadius);
            return (
              <circle
                cx={rootPos.x}
                cy={rootPos.y}
                r="4"
                fill="#dfc47f"
                opacity="0.5"
              />
            );
          })()}

          {/* === Título del nombre de escala encima del círculo (solo modo acorde) — con escala === */}
          {chordName && chordDegree && (
            <text
              x={effectiveCenter}
              y={15 * scaleCircle}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize="20"
              fontWeight="bold"
              className="select-none"
              style={{
                fontFamily: 'Georgia, serif',
                filter: 'drop-shadow(0 0 4px rgba(240, 214, 140, 0.5)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))',
              }}
            >
              {scaleName.replace(/\s*\(Acoustic\)\s*/g, '').trim()}
            </text>
          )}
      </g>
      </svg>
    </div>
  );
};

export default CircleOfNotes;

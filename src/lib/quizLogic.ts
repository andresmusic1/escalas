/**
 * quizLogic.ts — Lógica del Modo Quiz v22.0
 * 
 * Generación de preguntas visuales y auditivas para escalas y acordes.
 * Sistema de puntuación con ayudas que restan puntos.
 */

import {
  SCALE_FORMULAS,
  CHORD_TYPES,
  ROOT_NOTES,
  resolveEnharmonicName,
} from './musicLogic';

// ============================================================================
// Tipos
// ============================================================================

export type QuestionType = 'scale-visual' | 'scale-audio' | 'chord-visual' | 'chord-audio';
export type Category = 'scale' | 'chord';
export type AppMode = 'scale' | 'chord' | 'quiz';
export type HintType = 'description' | 'context' | 'degrees';

export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  hintsUsed: HintType[];
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  category: Category;
  correctAnswer: {
    rootIndex: number;
    scaleName?: string;
    chordType?: string;
    label: string; // "{NotaRaíz} {TipoEscala}" o "{NotaRaíz} {TipoAcorde}"
  };
  distractors: Array<{
    rootIndex: number;
    scaleName?: string;
    chordType?: string;
    label: string;
  }>;
  options: Array<{
    id: string;
    rootIndex: number;
    label: string;
    isCorrect: boolean;
  }>;
}

export interface QuizSessionConfig {
  playerName: string;
  totalQuestions: number; // 5, 10 o 20
  category: Category;
}

export interface QuizState {
  playerName: string;
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  answers: QuizAnswer[];
  currentQuestion: QuizQuestion | null;
  selectedOptionId: string | null;
  showFeedback: boolean;
  hintsUsed: HintType[];
  totalQuestions: number;
  isSessionComplete: boolean;
}

// ============================================================================
// Constantes de puntuación
// ============================================================================

const MAX_POINTS_PER_QUESTION = 10;

const HINT_PENALTY: Record<HintType, number> = {
  description: 2,
  context: 2,
  degrees: 2,
};

// Audio visual only penalty (reproduce escala button)
const AUDIO_HELP_VISUAL_PENALTY = 4;

// ============================================================================
// Funciones auxiliares
// ============================================================================

/** Mezcla un array aleatoriamente (Fisher-Yates) */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Genera un ID único simple */
function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Obtiene el nombre de la nota raíz dado su índice (0-11) */
function getRootName(rootIndex: number): string {
  const root = ROOT_NOTES[rootIndex];
  return root?.displayName ?? 'C';
}

/** Construye label "{NotaRaíz} {TipoEscala}" para escalas */
function buildScaleLabel(rootIndex: number, scaleName: string): string {
  const rootName = getRootName(rootIndex);
  
  // Mapeo de nombres largos a cortos para UI
  const SHORT_NAMES: Record<string, string> = {
    "Major (Ionian)": "Jónico",
    "Minor (Aeolian)": "Eólico",
    "Dórico (Dorian)": "Dórico",
    "Frigio (Phrygian)": "Frigio",
    "Lidio (Lydian)": "Lidio",
    "Mixolidio (Mixolydian)": "Mixolidio",
    "Locrio (Locrian)": "Locrio",
    "Locrio #2 (Half-Diminished)": "Locrio #2",
  };

  const shortName = SHORT_NAMES[scaleName] ?? scaleName;
  return `${rootName} ${shortName}`;
}

/** Construye label "{NotaRaíz} {TipoAcorde}" para acordes */
function buildChordLabel(rootIndex: number, chordKey: string): string {
  const rootName = getRootName(rootIndex);
  const chordType = CHORD_TYPES[chordKey];
  const displayName = chordType?.name ?? chordKey;
  return `${rootName} ${displayName}`;
}

// ============================================================================
// Banco de datos para generación de preguntas
// ============================================================================

/** Lista de todas las escalas disponibles */
function getAvailableScales(): string[] {
  return Object.keys(SCALE_FORMULAS);
}

/** Lista de todos los tipos de acorde disponibles */
function getAvailableChords(): string[] {
  return Object.keys(CHORD_TYPES);
}

// ============================================================================
// Generación de distractores (Opción A — Mismo tipo, diferente raíz)
// ============================================================================

/**
 * Genera 3 distractores del MISMO TIPO pero con raíces diferentes.
 * Esto asegura que el usuario identifique la forma/tipo sin importar la raíz.
 */
function generateScaleDistractors(
  correctScaleName: string,
  correctRootIndex: number
): Array<{ rootIndex: number; scaleName: string }> {
  const availableScales = getAvailableScales();
  
  // Filtrar todas las escalas del MISMO tipo pero diferente raíz
  const sameTypeDifferentRoot = [];
  for (let ri = 0; ri < 12; ri++) {
    if (ri === correctRootIndex) continue;
    sameTypeDifferentRoot.push({ rootIndex: ri, scaleName: correctScaleName });
  }

  // Si no hay suficientes del mismo tipo (raro), mezclar con otros tipos de misma longitud
  if (sameTypeDifferentRoot.length < 3) {
    const targetLength = SCALE_FORMULAS[correctScaleName]?.length ?? 7;
    for (const scale of availableScales) {
      if (scale === correctScaleName) continue;
      if (SCALE_FORMULAS[scale]?.length !== targetLength) continue;
      for (let ri = 0; ri < 12; ri++) {
        sameTypeDifferentRoot.push({ rootIndex: ri, scaleName: scale });
      }
    }
  }

  const shuffled = shuffle(sameTypeDifferentRoot);
  return shuffled.slice(0, 3);
}

/** Genera 3 distractores de acorde del MISMO TIPO pero diferente raíz */
function generateChordDistractors(
  correctChordKey: string,
  correctRootIndex: number
): Array<{ rootIndex: number; chordType: string }> {
  const sameTypeDifferentRoot = [];
  for (let ri = 0; ri < 12; ri++) {
    if (ri === correctRootIndex) continue;
    sameTypeDifferentRoot.push({ rootIndex: ri, chordType: correctChordKey });
  }

  const shuffled = shuffle(sameTypeDifferentRoot);
  return shuffled.slice(0, 3);
}

// ============================================================================
// Cálculo de puntuación
// ============================================================================

/**
 * Calcula los puntos obtenidos según las ayudas usadas.
 * 
 * Visual: max = 10, con "🔊 Escuchar" (-4) → queda 6
 * Auditiva: max = 10, con cada ayuda (-2), combinable entre sí
 */
function calculateScore(
  questionType: QuestionType,
  hintsUsed: HintType[],
  usedAudioHelp: boolean // botón "🔊 Escuchar escala" en pregunta visual
): number {
  let penalty = 0;

  if (questionType.includes('visual')) {
    // Visual: solo penalización por escuchar (-4)
    if (usedAudioHelp) {
      penalty += AUDIO_HELP_VISUAL_PENALTY;
    }
  } else {
    // Auditiva: cada ayuda usada resta puntos
    for (const hint of hintsUsed) {
      penalty += HINT_PENALTY[hint];
    }
  }

  return Math.max(0, MAX_POINTS_PER_QUESTION - penalty);
}

// ============================================================================
// Generación de preguntas individuales
// ============================================================================

/** Genera una sola pregunta visual de escala */
function generateScaleVisualQuestion(): QuizQuestion {
  const scales = getAvailableScales();
  const scaleName = scales[Math.floor(Math.random() * scales.length)];
  const rootIndex = Math.floor(Math.random() * 12);
  
  const distractors = generateScaleDistractors(scaleName, rootIndex);

  // Crear opciones mezcladas (1 correcta + 3 distractores)
  const options: QuizQuestion['options'] = [
    {
      id: generateId(),
      rootIndex,
      label: buildScaleLabel(rootIndex, scaleName),
      isCorrect: true,
    },
    ...distractors.map((d) => ({
      id: generateId(),
      rootIndex: d.rootIndex,
      label: buildScaleLabel(d.rootIndex, d.scaleName),
      isCorrect: false,
    })),
  ];

  return {
    id: generateId(),
    type: 'scale-visual',
    category: 'scale',
    correctAnswer: {
      rootIndex,
      scaleName,
      label: buildScaleLabel(rootIndex, scaleName),
    },
    distractors: distractors.map((d) => ({
      ...d,
      label: buildScaleLabel(d.rootIndex, d.scaleName),
    })),
    options: shuffle(options),
  };
}

/** Genera una sola pregunta auditiva de escala */
function generateScaleAudioQuestion(): QuizQuestion {
  const scales = getAvailableScales();
  const scaleName = scales[Math.floor(Math.random() * scales.length)];
  const rootIndex = Math.floor(Math.random() * 12);
  
  const distractors = generateScaleDistractors(scaleName, rootIndex);

  const options: QuizQuestion['options'] = [
    {
      id: generateId(),
      rootIndex,
      label: buildScaleLabel(rootIndex, scaleName),
      isCorrect: true,
    },
    ...distractors.map((d) => ({
      id: generateId(),
      rootIndex: d.rootIndex,
      label: buildScaleLabel(d.rootIndex, d.scaleName),
      isCorrect: false,
    })),
  ];

  return {
    id: generateId(),
    type: 'scale-audio',
    category: 'scale',
    correctAnswer: {
      rootIndex,
      scaleName,
      label: buildScaleLabel(rootIndex, scaleName),
    },
    distractors: distractors.map((d) => ({
      ...d,
      label: buildScaleLabel(d.rootIndex, d.scaleName),
    })),
    options: shuffle(options),
  };
}

/** Genera una sola pregunta visual de acorde */
function generateChordVisualQuestion(): QuizQuestion {
  const chords = getAvailableChords();
  const chordKey = chords[Math.floor(Math.random() * chords.length)];
  const rootIndex = Math.floor(Math.random() * 12);

  const distractors = generateChordDistractors(chordKey, rootIndex);

  const options: QuizQuestion['options'] = [
    {
      id: generateId(),
      rootIndex,
      label: buildChordLabel(rootIndex, chordKey),
      isCorrect: true,
    },
    ...distractors.map((d) => ({
      id: generateId(),
      rootIndex: d.rootIndex,
      label: buildChordLabel(d.rootIndex, d.chordType!),
      isCorrect: false,
    })),
  ];

  return {
    id: generateId(),
    type: 'chord-visual',
    category: 'chord',
    correctAnswer: {
      rootIndex,
      chordType: chordKey,
      label: buildChordLabel(rootIndex, chordKey),
    },
    distractors: distractors.map((d) => ({
      ...d,
      label: buildChordLabel(d.rootIndex, d.chordType!),
    })),
    options: shuffle(options),
  };
}

/** Genera una sola pregunta auditiva de acorde */
function generateChordAudioQuestion(): QuizQuestion {
  const chords = getAvailableChords();
  const chordKey = chords[Math.floor(Math.random() * chords.length)];
  const rootIndex = Math.floor(Math.random() * 12);

  const distractors = generateChordDistractors(chordKey, rootIndex);

  const options: QuizQuestion['options'] = [
    {
      id: generateId(),
      rootIndex,
      label: buildChordLabel(rootIndex, chordKey),
      isCorrect: true,
    },
    ...distractors.map((d) => ({
      id: generateId(),
      rootIndex: d.rootIndex,
      label: buildChordLabel(d.rootIndex, d.chordType!),
      isCorrect: false,
    })),
  ];

  return {
    id: generateId(),
    type: 'chord-audio',
    category: 'chord',
    correctAnswer: {
      rootIndex,
      chordType: chordKey,
      label: buildChordLabel(rootIndex, chordKey),
    },
    distractors: distractors.map((d) => ({
      ...d,
      label: buildChordLabel(d.rootIndex, d.chordType!),
    })),
    options: shuffle(options),
  };
}

// ============================================================================
// Generación de sesión completa
// ============================================================================

/**
 * Genera una sesión de quiz con N preguntas.
 * Distribución alternada: visual → auditiva → visual → auditiva...
 */
function generateQuizSession(config: QuizSessionConfig): QuizState {
  const questions: QuizQuestion[] = [];
  
  for (let i = 0; i < config.totalQuestions; i++) {
    const isVisual = i % 2 === 0; // P1 visual, P2 auditiva, etc.
    
    let question: QuizQuestion;
    
    if (config.category === 'scale') {
      question = isVisual 
        ? generateScaleVisualQuestion()
        : generateScaleAudioQuestion();
    } else {
      question = isVisual
        ? generateChordVisualQuestion()
        : generateChordAudioQuestion();
    }

    questions.push(question);
  }

  return {
    playerName: config.playerName,
    questions,
    currentIndex: 0,
    score: 0,
    answers: [],
    currentQuestion: questions[0] ?? null,
    selectedOptionId: null,
    showFeedback: false,
    hintsUsed: [],
    totalQuestions: config.totalQuestions,
    isSessionComplete: false,
  };
}

/** Responde la pregunta actual y calcula puntos */
function answerQuestion(
  state: QuizState,
  optionId: string,
  hintsUsed: HintType[],
  usedAudioHelp: boolean
): { newState: QuizState; pointsEarned: number; isCorrect: boolean } {
  if (!state.currentQuestion) {
    return { newState: state, pointsEarned: 0, isCorrect: false };
  }

  const question = state.currentQuestion;
  const selectedOption = question.options.find(o => o.id === optionId);
  const isCorrect = selectedOption?.isCorrect ?? false;
  
  // Calcular puntos según tipo de pregunta y ayudas usadas
  let pointsEarned: number;
  
  if (question.type.includes('visual')) {
    pointsEarned = calculateScore(question.type, [], usedAudioHelp);
  } else {
    pointsEarned = calculateScore(question.type, hintsUsed, false);
  }

  // Si es incorrecta, no suma puntos
  if (!isCorrect) {
    pointsEarned = 0;
  }

  const answer: QuizAnswer = {
    questionId: question.id,
    selectedOptionId: optionId,
    isCorrect,
    pointsEarned,
    hintsUsed,
  };

  const newScore = state.score + pointsEarned;
  const newAnswers = [...state.answers, answer];
  const nextIndex = state.currentIndex + 1;
  const isSessionComplete = nextIndex >= state.totalQuestions;

  let newState: QuizState;

  if (isSessionComplete) {
    newState = {
      ...state,
      currentIndex: nextIndex,
      score: newScore,
      answers: newAnswers,
      currentQuestion: null,
      selectedOptionId: optionId,
      showFeedback: true,
      isSessionComplete: true,
    };
  } else {
    newState = {
      ...state,
      currentIndex: nextIndex,
      score: newScore,
      answers: newAnswers,
      currentQuestion: state.questions[nextIndex],
      selectedOptionId: optionId,
      showFeedback: true,
      hintsUsed: [], // reset ayudas para siguiente pregunta
    };
  }

  return { newState, pointsEarned, isCorrect };
}

/** Reinicia la sesión con la misma configuración */
function resetQuizSession(state: QuizState): QuizState {
  const config: QuizSessionConfig = {
    playerName: state.playerName,
    totalQuestions: state.totalQuestions,
    category: state.questions[0]?.category ?? 'scale',
  };

  return generateQuizSession(config);
}

// ============================================================================
// Obtener info extendida para ayudas auditivas
// ============================================================================

import { SCALE_EXTENDED_INFO } from './musicLogic';

/** Obtiene el contexto histórico de una escala (para ayuda "Contexto Histórico") */
function getScaleContext(scaleName: string): string | null {
  return SCALE_EXTENDED_INFO[scaleName as keyof typeof SCALE_EXTENDED_INFO]?.context ?? null;
}

/** Obtiene los grados funcionales de una escala (para ayuda "Grados Funcionales") */
function getScaleDegrees(scaleName: string): string[] | null {
  return SCALE_EXTENDED_INFO[scaleName as keyof typeof SCALE_EXTENDED_INFO]?.degrees ?? null;
}

/** Obtiene las relaciones con otros modos/escalas (ayuda adicional) */
function getScaleRelations(scaleName: string): string | null {
  return SCALE_EXTENDED_INFO[scaleName as keyof typeof SCALE_EXTENDED_INFO]?.relations ?? null;
}

// ============================================================================
// Exportaciones
// ============================================================================

export {
  // Tipos (se exportan implícitamente via TypeScript)
  generateQuizSession,
  answerQuestion,
  resetQuizSession,
  calculateScore,
  getScaleContext,
  getScaleDegrees,
  getScaleRelations,
  buildScaleLabel,
  buildChordLabel,
};

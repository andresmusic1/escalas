/**
 * QuizPanel.tsx — Panel principal del Modo Quiz v22.0
 * 
 * Maneja: pantalla inicial (nombre + configuración), preguntas visuales y auditivas,
 * feedback ✓/✗, sistema de ayudas con penalización, y navegación entre preguntas.
 */

import { useState, useCallback } from 'react';
import { Play, Headphones, BookOpen, ScrollText, Music2 } from 'lucide-react';
import type {
  QuizState,
  QuizQuestion,
  Category,
  HintType,
} from '../lib/quizLogic';
import { playScaleForQuiz, playChordForQuiz, stopQuizAudio } from '../lib/quizAudio';
import CircleOfNotes from './CircleOfNotes';
import { QuizResult } from './QuizResult';
import { SCALE_FORMULAS, CHORD_TYPES } from '../lib/musicLogic';

// ============================================================================
// Props
// ============================================================================

interface QuizPanelProps {
  quizState: QuizState | null;
  onAnswer: (optionId: string, hintsUsed: HintType[], usedAudioHelp: boolean) => void;
  onStartSession: (playerName: string, totalQuestions: number, category: Category) => void;
  onRestart: () => void;
  bpm: number;
  instrument: 'proPiano' | 'campana';
}

// ============================================================================
// Constantes de UI
// ============================================================================

const QUESTION_COUNTS = [5, 10, 20];

// ============================================================================
// Pantalla Inicial (nombre + configuración)
// ============================================================================

function InitialScreen({ onStartSession }: { onStartSession: QuizPanelProps['onStartSession'] }) {
  const [playerName, setPlayerName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [category, setCategory] = useState<Category>('scale');

  const handleStart = () => {
    if (!playerName.trim()) return;
    onStartSession(playerName.trim(), totalQuestions, category);
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <h2
        className="text-2xl font-bold text-center mb-6"
        style={{ color: 'var(--color-gold)' }}
      >
        🎯 Modo Quiz
      </h2>

      {/* Input nombre */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: '#a0a8b8' }}>
          ¿Cuál es tu nombre?
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Escribe tu nombre..."
          className="w-full p-3 rounded-lg outline-none border text-center text-lg font-medium transition-all focus:scale-[1.02]"
          style={{
            background: '#4a4430',
            borderColor: playerName.trim() ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.3)',
            color: 'var(--color-gold)',
          }}
          maxLength={30}
        />
      </div>

      {/* Cantidad de preguntas */}
      <div className="mb-6">
        <label className="block text-sm mb-2" style={{ color: '#a0a8b8' }}>
          ¿Cuántas preguntas?
        </label>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => setTotalQuestions(count)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                totalQuestions === count ? 'scale-105' : ''
              }`}
              style={{
                background: totalQuestions === count ? 'var(--color-gold)' : '#4a4430',
                color: totalQuestions === count ? '#12161c' : 'var(--color-gold)',
                border: `1px solid ${totalQuestions === count ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.3)'}`,
              }}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div className="mb-8">
        <label className="block text-sm mb-2" style={{ color: '#a0a8b8' }}>
          Categoría
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {([
            { key: 'scale' as Category, label: '🎵 Modo Escala', icon: Music2 },
            { key: 'chord' as Category, label: '🎹 Modo Acorde', icon: Headphones },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex-1 p-4 rounded-lg flex items-center gap-2 transition-all ${
                category === key ? 'scale-[1.03]' : ''
              }`}
              style={{
                background: category === key ? 'var(--color-gold)' : '#4a4430',
                color: category === key ? '#12161c' : 'var(--color-gold)',
                border: `1px solid ${category === key ? 'var(--color-gold)' : 'rgba(223, 196, 127, 0.3)'}`,
              }}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botón iniciar */}
      <button
        onClick={handleStart}
        disabled={!playerName.trim()}
        className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 font-bold text-lg transition-all ${
          playerName.trim() ? 'hover:scale-[1.02] active:scale-[0.98]' : ''
        }`}
        style={{
          background: playerName.trim() ? '#00ff88' : '#3a3a3a',
          color: playerName.trim() ? '#12161c' : '#666',
        }}
      >
        <Play size={24} />
        INICIAR QUIZ
      </button>
    </div>
  );
}

// ============================================================================
// Opciones de respuesta (4 botones)
// ============================================================================

interface OptionsProps {
  options: QuizQuestion['options'];
  selectedOptionId: string | null;
  showFeedback: boolean;
  onSelect: (optionId: string) => void;
}

function AnswerOptions({ options, selectedOptionId, showFeedback, onSelect }: OptionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {options.map((option) => {
        let bgColor = '#4a4430';
        let borderColor = 'rgba(223, 196, 127, 0.3)';
        let textColor = 'var(--color-gold)';

        if (showFeedback && selectedOptionId === option.id) {
          if (option.isCorrect) {
            bgColor = 'rgba(74, 222, 128, 0.2)';
            borderColor = '#4ade80';
            textColor = '#4ade80';
          } else {
            bgColor = 'rgba(248, 113, 113, 0.2)';
            borderColor = '#f87171';
            textColor = '#f87171';
          }
        } else if (showFeedback && option.isCorrect) {
          bgColor = 'rgba(74, 222, 128, 0.15)';
          borderColor = '#4ade80';
          textColor = '#4ade80';
        }

        return (
          <button
            key={option.id}
            onClick={() => !showFeedback && onSelect(option.id)}
            disabled={showFeedback}
            className="p-4 rounded-lg font-medium transition-all border text-center"
            style={{
              background: bgColor,
              borderColor,
              color: textColor,
              cursor: showFeedback ? 'default' : 'pointer',
              opacity: showFeedback && selectedOptionId !== option.id && !option.isCorrect ? 0.5 : 1,
            }}
          >
            <div className="text-lg">{option.label}</div>
            {showFeedback && (
              <div className="text-xs mt-1">
                {selectedOptionId === option.id && !option.isCorrect ? '✗ Tu respuesta' : ''}
                {option.isCorrect && showFeedback && '✓ Correcta'}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Ayudas para preguntas auditivas
// ============================================================================

interface AudioHintsProps {
  hintsUsed: HintType[];
  onToggleHint: (hint: HintType) => void;
  question: QuizQuestion | null;
}

const HINT_CONFIG = {
  description: { label: '📝 Contexto Histórico', icon: BookOpen, key: 'context' as const },
  context: { label: '🎼 Relaciones', icon: ScrollText, key: 'relations' as const },
  degrees: { label: '🎵 Grados Funcionales', icon: Music2, key: 'degrees' as const },
};

function AudioHints({ hintsUsed, onToggleHint, question }: AudioHintsProps) {
  if (!question || !question.correctAnswer.scaleName) return null;

  return (
    <div className="space-y-2 mb-4">
      {(Object.entries(HINT_CONFIG) as [HintType, typeof HINT_CONFIG[HintType]][]).map(
        ([hintKey, config]) => {
          const isUsed = hintsUsed.includes(hintKey);

          return (
            <button
              key={hintKey}
              onClick={() => !isUsed && onToggleHint(hintKey)}
              disabled={isUsed}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all border text-sm ${
                isUsed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
              }`}
              style={{
                background: isUsed ? 'rgba(223, 196, 127, 0.1)' : '#4a4430',
                borderColor: isUsed ? 'rgba(223, 196, 127, 0.2)' : 'rgba(223, 196, 127, 0.3)',
                color: isUsed ? '#a0a8b8' : 'var(--color-gold)',
              }}
            >
              <config.icon size={18} />
              <span className="flex-1 text-left font-medium">{config.label}</span>
              {!isUsed && (
                <span className="text-xs" style={{ color: '#f87171' }}>(-2 pts)</span>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}

// ============================================================================
// Círculo de notas para preguntas visuales
// ============================================================================

interface VisualDisplayProps {
  question: QuizQuestion;
  onAudioHelp: () => void;
  usedAudioHelp: boolean;
}

function VisualDisplay({ question, onAudioHelp, usedAudioHelp }: VisualDisplayProps) {
  // Determinar los índices de notas según tipo de pregunta
  let noteIndices: number[] = [];
  let rootIndex = question.correctAnswer.rootIndex ?? 0;

  if (question.category === 'scale' && question.correctAnswer.scaleName) {
    const intervals = SCALE_FORMULAS[question.correctAnswer.scaleName];
    if (intervals) {
      noteIndices = intervals.map((i: number) => (rootIndex + i) % 12);
    }
  } else if (question.category === 'chord' && question.correctAnswer.chordType) {
    const chord = CHORD_TYPES[question.correctAnswer.chordType];
    if (chord) {
      noteIndices = chord.intervals.map((i: number) => (rootIndex + i) % 12);
    }
  }

  return (
    <div className="mb-4">
      {/* Contenedor SVG del círculo — contenedor grande para vista detallada */}
      <div className="flex justify-center mb-3" style={{ width: '750px', margin: '0 auto' }}>
        <CircleOfNotes
          scaleName={question.correctAnswer.scaleName as any || 'Major (Ionian)'}
          rootIndex={rootIndex}
          activeNoteIndex={-1}
          activeLineIndex={-1}
          noteDurationSeconds={0.5}
          chordNotes={noteIndices.length > 2 ? noteIndices : undefined}
          isChordMode={question.category === 'chord'}
          hideCenterText
        />
      </div>

      {/* Botón ayuda auditiva (solo visual) */}
      <button
        onClick={onAudioHelp}
        disabled={usedAudioHelp}
        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border text-sm ${
          usedAudioHelp ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
        }`}
        style={{
          background: usedAudioHelp ? 'rgba(223, 196, 127, 0.1)' : '#4a4430',
          borderColor: 'rgba(223, 196, 127, 0.3)',
          color: usedAudioHelp ? '#a0a8b8' : 'var(--color-gold)',
        }}
      >
        <Headphones size={16} />
        {usedAudioHelp ? '🔊 Escuchado (-4 pts)' : '🔊 Escuchar escala (-4 pts)'}
      </button>
    </div>
  );
}

// ============================================================================
// Componente Principal del Quiz Panel
// ============================================================================

export function QuizPanel({
  quizState,
  onAnswer,
  onStartSession,
  onRestart,
  bpm,
  instrument,
}: QuizPanelProps) {
  // === Early return: sin sesión activa → mostrar pantalla inicial ===
  if (!quizState) {
    return <InitialScreen onStartSession={onStartSession} />;
  }

  // Si sesión completa y no hay pregunta actual → mostrar resultado
  if (quizState.isSessionComplete && !quizState.currentQuestion) {
    return <QuizResult quizState={quizState} onRestart={onRestart} />;
  }

  // Si no hay preguntas (sesión no iniciada) → pantalla inicial
  if (quizState.questions.length === 0) {
    return <InitialScreen onStartSession={onStartSession} />;
  }

  // === Estado local del panel de quiz (después de early returns) ===
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<HintType[]>([]);
  const [usedAudioHelp, setUsedAudioHelp] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const question = quizState.currentQuestion!;
  const isAnswered = showFeedback && selectedOptionId !== null;

  // Manejar selección de opción
  const handleSelectOption = useCallback((optionId: string) => {
    setSelectedOptionId(optionId);
    setShowFeedback(true);
    
    setTimeout(() => {
      onAnswer(optionId, hintsUsed, usedAudioHelp);
    }, 800); // Esperar a ver el feedback antes de avanzar
  }, [onAnswer, hintsUsed, usedAudioHelp]);

  // Toggle ayuda en pregunta auditiva
  const handleToggleHint = useCallback((hint: HintType) => {
    setHintsUsed((prev) => [...prev, hint]);
  }, []);

  // Reproducir audio para pregunta visual (ayuda)
  const handleVisualAudioHelp = useCallback(() => {
    if (usedAudioHelp || isPlaying) return;

    const scaleName = question.correctAnswer.scaleName ?? 'Major (Ionian)';
    const chordKey = question.correctAnswer.chordType;

    let notes: number[] = [];
    
    if (question.category === 'scale') {
      const intervals = SCALE_FORMULAS[scaleName];
      notes = intervals?.map((i: number) => i) ?? [0, 2, 4, 5, 7, 9, 11];
    } else if (chordKey && CHORD_TYPES[chordKey]) {
      const chordIntervals = CHORD_TYPES[chordKey].intervals;
      notes = [...chordIntervals];
    }

    setUsedAudioHelp(true);
    setIsPlaying(true);

    const instrumentType = instrument === 'campana' ? 'sine' : 'triangle';
    
    if (question.category === 'scale') {
      playScaleForQuiz(question.correctAnswer.rootIndex, notes, instrumentType, bpm, () => {
        setIsPlaying(false);
      });
    } else {
      playChordForQuiz(question.correctAnswer.rootIndex, notes, instrumentType, bpm, () => {
        setIsPlaying(false);
      });
    }
  }, [usedAudioHelp, isPlaying, question, instrument, bpm]);

  // Reproducir audio para pregunta auditiva (sin costo)
  const handlePlayAudio = useCallback(() => {
    if (isPlaying) return;

    const scaleName = question.correctAnswer.scaleName ?? 'Major (Ionian)';
    const chordKey = question.correctAnswer.chordType;

    let notes: number[] = [];
    
    if (question.category === 'scale') {
      const intervals = SCALE_FORMULAS[scaleName];
      notes = intervals?.map((i: number) => i) ?? [0, 2, 4, 5, 7, 9, 11];
    } else if (chordKey && CHORD_TYPES[chordKey]) {
      const chordIntervals = CHORD_TYPES[chordKey].intervals;
      notes = [...chordIntervals];
    }

    setIsPlaying(true);

    const instrumentType = instrument === 'campana' ? 'sine' : 'triangle';
    
    if (question.category === 'scale') {
      playScaleForQuiz(question.correctAnswer.rootIndex, notes, instrumentType, bpm, () => {
        setIsPlaying(false);
      });
    } else {
      playChordForQuiz(question.correctAnswer.rootIndex, notes, instrumentType, bpm, () => {
        setIsPlaying(false);
      });
    }
  }, [isPlaying, question, instrument, bpm]);

  // Calcular puntos actuales (para mostrar al usuario)
  const currentPoints = isAnswered
    ? quizState.answers[quizState.answers.length - 1]?.pointsEarned ?? 0
    : null;

  return (
    <div className="max-w-[650px] mx-auto">
      {/* Header de pregunta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(223, 196, 127, 0.2)',
              color: 'var(--color-gold)',
            }}
          >
            Pregunta {quizState.currentIndex + 1}/{quizState.totalQuestions}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: question.type.includes('visual')
                ? 'rgba(96, 165, 250, 0.2)'
                : 'rgba(248, 113, 113, 0.2)',
              color: question.type.includes('visual') ? '#60a5fa' : '#f87171',
            }}
          >
            {question.type.includes('visual') ? '👁 Visual' : '🎧 Auditiva'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#a0a8b8' }}>Puntos:</span>
          {currentPoints !== null ? (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(74, 222, 128, 0.2)',
                color: '#4ade80',
              }}
            >
              +{currentPoints}
            </span>
          ) : (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(223, 196, 127, 0.2)',
                color: 'var(--color-gold)',
              }}
            >
              {quizState.score}/{quizState.totalQuestions * 10}
            </span>
          )}
        </div>
      </div>

      {/* Área de visualización */}
      <div className="mb-6 p-4 rounded-xl border" style={{ background: '#1a1d24', borderColor: 'rgba(223, 196, 127, 0.2)' }}>
        {question.type.includes('visual') ? (
          /* ===== PREGUNTA VISUAL ===== */
          <div>
            <VisualDisplay
              question={question}
              onAudioHelp={handleVisualAudioHelp}
              usedAudioHelp={usedAudioHelp}
            />
          </div>
        ) : (
          /* ===== PREGUNTA AUDITIVA ===== */
          <div className="text-center">
            {/* Botón reproducir audio */}
            <button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={`px-8 py-4 rounded-lg flex items-center gap-3 mx-auto transition-all ${
                isPlaying ? 'opacity-50' : 'hover:scale-105'
              }`}
              style={{
                background: isPlaying ? '#2a4a2a' : '#4a4430',
                color: '#00ff88',
                border: '1px solid rgba(0, 255, 136, 0.3)',
              }}
            >
              {isPlaying ? (
                <>
                  <div className="animate-spin w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full" />
                  Reproduciendo...
                </>
              ) : (
                <>
                  <Play size={24} />
                  ▶ Reproducir escala/acorde
                </>
              )}
            </button>
            <p className="text-xs mt-2" style={{ color: '#a0a8b8' }}>
              Escucha la escala o acorde y selecciona la respuesta correcta
            </p>

            {/* Ayudas */}
            {isAnswered ? null : (
              <AudioHints
                hintsUsed={hintsUsed}
                onToggleHint={handleToggleHint}
                question={question}
              />
            )}
          </div>
        )}
      </div>

      {/* Instrucción */}
      <p className="text-center text-sm mb-4" style={{ color: '#a0a8b8' }}>
        {question.type.includes('visual')
          ? '¿Qué escala/acorde se muestra?'
          : 'Selecciona la escala/acorde que escuchaste:'}
      </p>

      {/* Opciones de respuesta */}
      <AnswerOptions
        options={question.options}
        selectedOptionId={selectedOptionId}
        showFeedback={showFeedback}
        onSelect={handleSelectOption}
      />

      {/* Indicador de ayuda usada en visual */}
      {question.type.includes('visual') && usedAudioHelp && !isAnswered && (
        <p className="text-center text-xs mt-3" style={{ color: '#f87171' }}>
          ⚠ Usaste la ayuda auditiva. Obtendrás 6/10 puntos si aciertas.
        </p>
      )}

      {/* Indicador de ayudas usadas en auditiva */}
      {question.type.includes('audio') && hintsUsed.length > 0 && !isAnswered && (
        <p className="text-center text-xs mt-3" style={{ color: '#f87171' }}>
          ⚠ Ayudas usadas: {hintsUsed.length} × (-2) = -{hintsUsed.length * 2} puntos. Máximo: {10 - hintsUsed.length * 2}/10 si aciertas.
        </p>
      )}

      {/* Feedback mensaje */}
      {isAnswered && (
        <div className="text-center mt-4">
          {(() => {
            const lastAnswer = quizState.answers[quizState.answers.length - 1];
            if (!lastAnswer) return null;
            
            return lastAnswer.isCorrect ? (
              <p className="text-lg font-semibold" style={{ color: '#4ade80' }}>
                ✓ ¡Correcto! +{lastAnswer.pointsEarned} puntos
              </p>
            ) : (
              <p className="text-lg font-semibold" style={{ color: '#f87171' }}>
                ✗ Incorrecto — La respuesta correcta era:{' '}
                {question.correctAnswer.label}
              </p>
            );
          })()}
        </div>
      )}

      {/* Siguiente pregunta (aparece tras responder) */}
      {isAnswered && quizState.currentIndex < quizState.totalQuestions - 1 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              setSelectedOptionId(null);
              setShowFeedback(false);
              setHintsUsed([]);
              setUsedAudioHelp(false);
            }}
            className="px-8 py-3 rounded-lg flex items-center gap-2 font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--color-gold)',
              color: '#12161c',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Finalizar (última pregunta respondida) */}
      {isAnswered && quizState.currentIndex >= quizState.totalQuestions - 1 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              // Forzar recarga para mostrar resultado final limpio
              window.location.reload();
            }}
            className="px-8 py-3 rounded-lg flex items-center gap-2 font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: '#00ff88',
              color: '#12161c',
            }}
          >
            Ver Resultado Final 🏆
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizPanel;

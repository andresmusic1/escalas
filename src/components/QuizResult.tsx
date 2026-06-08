/**
 * QuizResult.tsx — Pantalla de resultado final del Quiz v22.0
 * 
 * Muestra el nombre del usuario, puntuación total y porcentaje.
 */

import { useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import type { QuizState, QuizAnswer } from '../lib/quizLogic';

interface QuizResultProps {
  quizState: QuizState;
  onRestart: () => void;
}

/** Calcula el porcentaje de puntuación */
function calculatePercentage(score: number, totalQuestions: number): number {
  const maxScore = totalQuestions * 10;
  return Math.round((score / maxScore) * 100);
}

/** Obtiene emoji según porcentaje */
function getPerformanceEmoji(percentage: number): string {
  if (percentage >= 90) return '🏆';
  if (percentage >= 70) return '🎉';
  if (percentage >= 50) return '👍';
  if (percentage >= 30) return '💪';
  return '📚';
}

/** Obtiene mensaje según porcentaje */
function getPerformanceMessage(percentage: number): string {
  if (percentage >= 90) return '¡Extraordinario! Eres un maestro de la teoría musical.';
  if (percentage >= 70) return '¡Muy bien! Tienes un gran conocimiento musical.';
  if (percentage >= 50) return '¡Buen trabajo! Sigue practicando para mejorar.';
  if (percentage >= 30) return 'No está mal, pero puedes mejorar con más práctica.';
  return 'Sigue estudiando las escalas y acordes. ¡Tú puedes!';
}

export function QuizResult({ quizState, onRestart }: QuizResultProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const percentage = calculatePercentage(quizState.score, quizState.totalQuestions);
  const correctCount = quizState.answers.filter(a => a.isCorrect).length;
  const emoji = getPerformanceEmoji(percentage);
  const message = getPerformanceMessage(percentage);

  return (
    <div
      className="max-w-[600px] mx-auto p-8 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, #1a1d24 0%, #2a2d34 100%)',
        borderColor: 'rgba(223, 196, 127, 0.3)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <Trophy size={48} color="#dfc47f" style={{ marginBottom: '12px' }} />
        <h2
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--color-gold)' }}
        >
          ¡Quiz Completado!
        </h2>
      </div>

      {/* Nombre del usuario */}
      <div
        className="text-center p-4 rounded-lg mb-6"
        style={{ background: 'rgba(223, 196, 127, 0.1)' }}
      >
        <p className="text-sm mb-1" style={{ color: '#a0a8b8' }}>Jugador</p>
        <p
          className="text-xl font-semibold"
          style={{ color: 'var(--color-gold)' }}
        >
          {emoji} {quizState.playerName}
        </p>
      </div>

      {/* Puntuación principal */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div
            className="text-5xl font-bold"
            style={{ color: 'var(--color-gold)' }}
          >
            {quizState.score}
          </div>
          <div className="text-left">
            <p className="text-sm" style={{ color: '#a0a8b8' }}>de {quizState.totalQuestions * 10} puntos</p>
            <p className="text-2xl font-semibold" style={{ color: percentage >= 50 ? '#4ade80' : '#f87171' }}>
              {percentage}%
            </p>
          </div>
        </div>
        <p className="text-sm mt-2" style={{ color: '#a0a8b8' }}>
          Correctas: {correctCount}/{quizState.totalQuestions}
        </p>
      </div>

      {/* Mensaje de rendimiento */}
      <div
        className="text-center p-4 rounded-lg mb-6"
        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
      >
        <p className="text-sm italic" style={{ color: '#e0e0e0' }}>{message}</p>
      </div>

      {/* Detalle expandible */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-2 rounded-lg mb-4 transition-all border text-sm"
        style={{
          background: showDetails ? 'rgba(223, 196, 127, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(223, 196, 127, 0.3)',
          color: 'var(--color-gold)',
        }}
      >
        {showDetails ? '▲ Ocultar detalle' : '▼ Ver detalle por pregunta'}
      </button>

      {showDetails && (
        <div className="mb-6 space-y-2">
          {quizState.answers.map((answer: QuizAnswer, index: number) => (
            <div
              key={answer.questionId}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{
                background: answer.isCorrect
                  ? 'rgba(74, 222, 128, 0.1)'
                  : 'rgba(248, 113, 113, 0.1)',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: answer.isCorrect ? '#4ade80' : '#f87171' }}>
                  {answer.isCorrect ? '✓' : '✗'}
                </span>
                <span className="text-sm" style={{ color: '#e0e0e0' }}>
                  Pregunta {index + 1}
                </span>
              </div>
              <span className="text-sm font-mono" style={{ color: 'var(--color-gold)' }}>
                +{answer.pointsEarned} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Botón reiniciar */}
      <div className="flex justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-3 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'var(--color-gold)',
            color: '#12161c',
            fontWeight: 'bold',
          }}
        >
          <RotateCcw size={20} />
          Reiniciar Quiz
        </button>
      </div>
    </div>
  );
}

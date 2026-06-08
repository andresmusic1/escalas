# 🎵 Plan: Modo Quiz — v22.0

## Resumen
Implementar un **tercer modo independiente** (junto a Modo Escala y Modo Acorde) que permita al usuario poner a prueba sus conocimientos sobre escalas y acordes mediante preguntas visuales y auditivas con sistema de puntuación.

---

## Arquitectura General

### Modo Quiz como tercer toggle
```
[Modo Escala] [Modo Acorde] [Modo Quiz] ← nuevo botón toggle
```

El estado se gestiona en `App.tsx` con un nuevo state:
```typescript
type AppMode = 'scale' | 'chord' | 'quiz';
const [appMode, setAppMode] = useState<AppMode>('scale');
```

### Estructura de archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/lib/quizLogic.ts` | Lógica del quiz: generación de preguntas, distractores, scoring |
| `src/components/QuizPanel.tsx` | Panel UI del quiz (pregunta, opciones, feedback, puntuación) |
| `src/components/QuizResult.tsx` | Pantalla de resultado final al terminar las N preguntas |

### Modificaciones a archivos existentes

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Nuevo state `appMode`, botón toggle, renderizado condicional del QuizPanel |
| `src/lib/musicLogic.ts` | Exportar funciones auxiliares para generación de distractores (ya existen: `SCALE_FORMULAS`, `CHORD_TYPES`) |

---

## Modelo de Datos

### Tipo de Pregunta
```typescript
type QuestionType = 'scale-visual' | 'scale-audio' | 'chord-visual' | 'chord-audio';

interface QuizQuestion {
  id: string;              // unique ID
  type: QuestionType;       // tipo de pregunta
  category: 'scale' | 'chord';
  
  // Datos de la respuesta correcta
  correctAnswer: {
    rootIndex: number;      // 0-11 (C=0, C#=1, ...)
    scaleName: string;      // "Jónico", "Dórico", ... / "Mayor", "Menor", "maj7", ...
    chordType?: string;     // para modo acorde
  };
  
  // Distractores (3 opciones incorrectas)
  distractors: Array<{
    rootIndex: number;
    scaleName: string;
    chordType?: string;
  }>;
  
  // Opciones mezcladas para mostrar al usuario
  options: Array<{
    id: string;
    rootIndex: number;
    label: string;          // "C Jónico", "D Dórico", ...
    isCorrect: boolean;
  }>;
}
```

### Estado del Quiz
```typescript
interface QuizState {
  playerName: string;             // nombre del usuario (requerido antes de iniciar)
  questions: QuizQuestion[];      // banco de preguntas de la sesión
  currentIndex: number;           // índice pregunta actual (0..N-1)
  score: number;                  // puntuación acumulada
  answers: Array<{               // historial de respuestas
    questionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    pointsEarned: number;
    hintsUsed: HintType[];       // ['description', 'context', 'degrees']
  }>;
  
  // Estado actual de la pregunta
  currentQuestion: QuizQuestion | null;
  selectedOptionId: string | null;
  showFeedback: boolean;          // true = mostró ✓/✗
  hintsUsed: HintType[];          // ['description', 'context', 'degrees']
  
  // Configuración de la sesión
  totalQuestions: number;         // 5, 10 o 20
  isSessionComplete: boolean;     // true = terminó todas las preguntas
}

type HintType = 'description' | 'context' | 'degrees';
```

---

## Generación de Preguntas

### Banco Total Disponible
- **Escalas:** ~48 escalas × 12 raíces = ~576 combinaciones posibles
- **Acordes:** todos los tipos de tríada + cuatríada × 12 raíces

### Selección Aleatoria
- Se seleccionan N preguntas aleatorias del banco sin repetición
- Distribución alternada: P1 visual, P2 auditiva, P3 visual...
- Para modo escala: solo `scale-visual` y `scale-audio`
- Para modo acorde: solo `chord-visual` y `chord-audio`

### Generación de Distractores (Opción A — Mismo tipo, diferente raíz)
Para mantener el enfoque en **identificar el tipo de escala/acorde sin importar la raíz**:

```typescript
function generateDistractors(
  correctAnswer: { scaleName: string; rootIndex: number },
  category: 'scale' | 'chord',
  pool: Array<{ scaleName: string; rootIndex: number }>
): Array<{ scaleName: string; rootIndex: number }> {
  // Filtrar todas las escalas/acordes del MISMO TIPO pero diferente raíz
  const sameTypeDifferentRoot = pool.filter(
    item => item.scaleName === correctAnswer.scaleName && 
            item.rootIndex !== correctAnswer.rootIndex
  );
  
  // Seleccionar 3 aleatorios
  return shuffle(sameTypeDifferentRoot).slice(0, 3);
}
```

**Ejemplo:** Si la correcta es "C Jónico", los distractores podrían ser:
- "G Dórico" (diferente tipo + diferente raíz) — NO, usamos mismo tipo
- "D Jónico", "G Jónico", "F Jónico" — MISMO TIPO, diferente raíz ✓

### Label de Opciones
Cada opción se muestra como: **"{NotaRaíz} {TipoEscala}"**
- Ejemplo: `"C Jónico"`, `"D Dórico"`, `"G Mayor"`

---

## UI del Quiz Panel

### Pantalla Inicial (antes de empezar)
```
┌─────────────────────────────────┐
│         🎯 MODO QUIZ            │
│                                 │
│  ¿Cuál es tu nombre?            │
│  ┌───────────────────────────┐  │
│  │ [Escribe tu nombre...]    │  │ ← input texto requerido
│  └───────────────────────────┘  │
│                                 │
│  ¿Cuántas preguntas?            │
│  [ 5 ]  [ 10 ]  [ 20 ]          │
│                                 │
│  Categoría:                     │
│  [ Modo Escala ] [ Modo Acorde ]│
│                                 │
│         [ ▶ INICIAR QUIZ ]      │ ← habilitado solo con nombre
└─────────────────────────────────┘
```

### Pantalla de Pregunta (durante el quiz)

#### Tipo Visual (Escala o Acorde)
```
┌─────────────────────────────────┐
│  Pregunta 3/10     Score: 45/100│
├─────────────────────────────────┤
│                                 │
│    [CÍRCULO CROMÁTICO SVG]      │ ← muestra notas + polígono
│    de la escala/acorde          │
│                                 │
├─────────────────────────────────┤
│  🔊 Escuchar (-5 pts)           │ ← botón ayuda visual
│                                 │
│  Selecciona la escala:          │
│  ┌───────────────────────────┐  │
│  │ [ C Jónico ]         ✓   │  │ ← correcta (marcada verde)
│  │ [ D Jónico ]             │  │
│  │ [ G Jónico ]             │  │
│  │ [ F Jónico ]         ✗   │  │ ← incorrecta (marcada rojo)
│  └───────────────────────────┘  │
│                                 │
│          [ Siguiente → ]        │
└─────────────────────────────────┘
```

#### Tipo Auditivo
```
┌─────────────────────────────────┐
│  Pregunta 4/10     Score: 52/100│
├─────────────────────────────────┤
│                                 │
│    [CÍRCULO OCULTO]             │ ← no se muestra nada
│                                 │
├─────────────────────────────────┤
│  ▶ Reproducir escala            │ ← botón para escuchar (sin costo)
│     (ascendente + descendente)  │
│                                 │
│  Ayudas:                        │
│  [📝 Descripción -2]            │
│  [📖 Contexto Histórico -2]     │
│  [🎼 Grados Funcionales -2]     │
│                                 │
│  Selecciona la escala:          │
│  ┌───────────────────────────┐  │
│  │ [ C Dórico ]             │  │
│  │ [ E Dórico ]         ✓   │  ← correcta (marcada verde)
│  │ [ A Dórico ]             │  │
│  │ [ B Dórico ]         ✗   │  ← incorrecta (marcada rojo)
│  └───────────────────────────┘  │
│                                 │
│          [ Siguiente → ]        │
└─────────────────────────────────┘
```

### Pantalla de Resultado Final
```
┌─────────────────────────────────┐
│         🏆 RESULTADO FINAL      │
│                                 │
│  👤 {playerName}                │ ← nombre del usuario
│  Puntuación: 72/100 (72%)       │
│  Correctas: 8/10                │
│                                 │
│         [ 🔄 REINICIAR QUIZ ]   │
└─────────────────────────────────┘
```

---

## Reproducción de Audio (Auditivo)

### Función de reproducción para preguntas auditivas
En `src/lib/quizAudio.ts` (nuevo archivo):

```typescript
/**
 * Reproduce una escala/acorde en modo ascendente + descendente
 * Usando Tone.js PolySynth del AudioEngine existente
 */
function playScaleForQuiz(
  rootIndex: number,
  scaleName: string,
  instrument: InstrumentId,
  bpm: number
): Promise<void>;

/**
 * Reproduce un acorde para pregunta auditiva
 */
function playChordForQuiz(
  rootIndex: number,
  chordType: string,
  instrument: InstrumentId,
  bpm: number
): Promise<void>;
```

**Implementación:** 
- Reutilizar `AudioEngine` existente (no crear nuevo)
- Escala: arpegio ascendente + descendente con duración BPM-based
- Acorde: notas simultáneas + arpegio breve

---

## Flujo de Ejecución

### 1. Inicio del Quiz
```
Usuario hace clic en "Modo Quiz"
  → UI muestra pantalla inicial del Quiz
  → Selecciona cantidad (5/10/20) y categoría (Escala/Acorde)
  → Clic en "Iniciar Quiz"
    → generateQuizSession(totalQuestions, category)
      → Crea banco de N preguntas aleatorias
      → Distribución alternada: visual, auditiva, visual...
    → setQuizState(initialState)
    → mostrar primera pregunta
```

### 2. Respondiendo una Pregunta Visual
```
Pregunta visual mostrada (círculo con notas)
  → Usuario puede hacer clic en "🔊 Escuchar" (-4 pts si usa)
  → Usuario selecciona una opción
    → Si ya respondió, mostrar feedback ✓/✗
    → Calcular puntos: 10 - ayudaEscucha(4) = 6 o 10
    → Resaltar correcta en verde, incorrecta en rojo
    → Mostrar botón "Siguiente →"
```

### 3. Respondiendo una Pregunta Auditiva
```
Pregunta auditiva mostrada (sin círculo)
  → Usuario puede hacer clic en "▶ Reproducir escala" (sin costo)
  → Usuario puede revelar ayudas (-2 pts cada una):
    - Descripción: muestra SCALE_EXTENDED_INFO.description
    - Contexto Histórico: muestra SCALE_EXTENDED_INFO.context
    - Grados Funcionales: muestra SCALE_EXTENDED_INFO.degrees
  → Usuario selecciona una opción
    → Calcular puntos: 10 - descripción(2) - contexto(2) - grados(2) = mínimo 4
    → Resaltar correcta en verde, incorrecta en rojo
    → Mostrar botón "Siguiente →"
```

### 4. Finalización del Quiz
```
Última pregunta respondida
  → Calcular puntuación total
  → Mostrar pantalla de resultado final
  → Opción de reiniciar con misma configuración o cambiar cantidad
```

---

## Integración con App.tsx

### Estado principal añadido
```typescript
// En App.tsx — nuevo state para el modo Quiz
const [appMode, setAppMode] = useState<'scale' | 'chord' | 'quiz'>('scale');
const [quizState, setQuizState] = useState<QuizState | null>(null);
```

### Toggle de modos en UI existente
```tsx
{/* Modificar el toggle existente de Modo Escala/Acorde */}
<button 
  className={`mode-button ${appMode === 'scale' ? 'active-scale' : 'inactive'}`}
  onClick={() => setAppMode('scale')}
>
  Modo Escala
</button>
<button 
  className={`mode-button ${appMode === 'chord' ? 'active-chord' : 'inactive'}`}
  onClick={() => setAppMode('chord')}
>
  Modo Acorde
</button>
<button 
  className={`mode-button ${appMode === 'quiz' ? 'active-quiz' : 'inactive'}`}
  onClick={() => setAppMode('quiz')}
>
  🎯 Modo Quiz
</button>
```

### Renderizado condicional
```tsx
{appMode === 'scale' && <ScalePanel />}
{appMode === 'chord' && <ChordPanel />}
{appMode === 'quiz' && quizState && <QuizPanel />}
```

---

## CSS Necesario (src/index.css)

### Nuevas clases CSS
```css
/* Modo Quiz toggle button */
.mode-button.quiz-active {
  background: var(--color-gold);
  box-shadow: 0 0 10px rgba(240, 214, 140, 0.5);
}

/* Opciones de respuesta */
.quiz-option {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.quiz-option:hover { transform: scale(1.02); }

/* Feedback correcto */
.quiz-option.correct {
  background: rgba(74, 222, 128, 0.3) !important;
  border-color: #4ade80 !important;
}

/* Feedback incorrecto */
.quiz-option.incorrect {
  background: rgba(248, 113, 113, 0.3) !important;
  border-color: #f87171 !important;
}

/* Panel de ayudas */
.hint-button {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s ease;
}
```

---

## Scoring Detallado

### Tabla de Puntuación

| Tipo | Ayudas Usadas | Puntos |
|------|---------------|--------|
| Visual | Sin ayuda | 10 pts |
| Visual | 🔊 Escuchar (-4) | 6 pts |
| Auditiva | Sin ayuda | 10 pts |
| Auditiva | Descripción (-2) | 8 pts |
| Auditiva | Contexto Histórico (-2) | 8 pts |
| Auditiva | Grados Funcionales (-2) | 8 pts |
| Auditiva | Descripción + Contexto (-4) | 6 pts |
| Auditiva | Todas las ayudas (-6) | 4 pts |

### Máximo posible por sesión
- **5 preguntas:** 50 puntos
- **10 preguntas:** 100 puntos
- **20 preguntas:** 200 puntos

---

## Reglas de Aislamiento

1. **TODO el código del Quiz debe estar aislado** en estados con prefijo `quiz*` o `appMode === 'quiz'`
2. **NO modificar la lógica del Modo Escala/Acorde existente** — solo agregar ramas condicionales
3. **Reutilizar AudioEngine existente** — no crear nuevas instancias de synth
4. **Reutilizar SCALE_EXTENDED_INFO y CHORD_TYPES existentes** — no duplicar datos musicales

---

## Orden de Implementación

### Fase 1: Lógica del Quiz (`src/lib/quizLogic.ts`)
- [ ] Definir tipos TypeScript (incluyendo `playerName`)
- [ ] Función `generateQuizSession(totalQuestions, category)`
- [ ] Función `generateDistractors(correctAnswer, pool)`
- [ ] Función `calculateScore(hintsUsed, questionType)`

### Fase 2: Audio del Quiz (`src/lib/quizAudio.ts`)
- [ ] Función `playScaleForQuiz(rootIndex, scaleName, ...)`
- [ ] Función `playChordForQuiz(rootIndex, chordType, ...)`
- [ ] Integración con AudioEngine existente

### Fase 3: Componente QuizPanel (`src/components/QuizPanel.tsx`)
- [ ] Pantalla inicial (nombre input + selección cantidad/categoría)
- [ ] Validación de nombre requerido antes de iniciar
- [ ] Renderizado de pregunta visual (círculo + opciones)
- [ ] Renderizado de pregunta auditiva (sin círculo + botones ayuda)
- [ ] Sistema de feedback ✓/✗
- [ ] Botón "Siguiente →"

### Fase 4: Componente QuizResult (`src/components/QuizResult.tsx`)
- [ ] Pantalla de resultado final con nombre del usuario
- [ ] Puntuación total y porcentaje
- [ ] Botón reiniciar

### Fase 5: Integración en App.tsx
- [ ] Nuevo state `appMode` + toggle buttons
- [ ] Renderizado condicional QuizPanel
- [ ] Estado quizState gestionado en App.tsx
- [ ] CSS adicional para modos de feedback

---

## Archivos a Crear

| Archivo | Líneas aprox. | Descripción |
|---------|---------------|-------------|
| `src/lib/quizLogic.ts` | ~200 | Generación de preguntas y distractores |
| `src/lib/quizAudio.ts` | ~150 | Reproducción para preguntas auditivas |
| `src/components/QuizPanel.tsx` | ~450 | Panel principal del quiz (incluye input nombre) |
| `src/components/QuizResult.tsx` | ~120 | Pantalla de resultado final con nombre |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | +~80 líneas: nuevo state, toggle buttons, renderizado condicional |
| `src/index.css` | +~60 líneas: nuevas clases CSS para quiz |

---

## Validación Post-Implementación

1. ✅ TypeScript compilation: OK (`npx tsc --noEmit`)
2. ✅ Modo Escala sigue funcionando sin cambios
3. ✅ Modo Acorde sigue funcionando sin cambios  
4. ✅ Modo Quiz inicia y muestra pantalla de configuración
5. ✅ Preguntas visuales muestran círculo correctamente
6. ✅ Preguntas auditivas reproducen audio correctamente
7. ✅ Sistema de puntuación calcula correctamente
8. ✅ Feedback ✓/✗ se muestra al responder
9. ✅ Resultado final muestra puntuación total
10. ✅ Reiniciar quiz funciona correctamente

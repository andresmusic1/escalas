// ============================================================
// Lógica Musical - Círculo Cromático Interactivo
// ============================================================
// Sistema basado en aritmética modular sobre el arreglo cromático
// de 12 tonos (temperamento igual). Todas las alteraciones usan
// convención de bemoles para consistencia visual.
// ============================================================

/**
 * Arreglo Cromático Maestro (12 notas del sistema temperado).
 * Índice 0 = C (Do), ubicado en la posición superior del círculo (-90°).
 * Cada índice representa +30 grados (+1 semitono) de rotación horaria.
 * 
 * Convención: Usamos bemoles (Db, Eb, Gb, Ab, Bb) para las notas enarmónicas.
 */
export const CHROMATIC_SCALE: string[] = [
  'C',    // 0 - Do
  'Db',   // 1 - Re bemol / Do sostenido
  'D',    // 2 - Re
  'Eb',   // 3 - Mi bemol / Re sostenido
  'E',    // 4 - Mi
  'F',    // 5 - Fa
  'Gb',   // 6 - Sol bemol / Fa sostenido
  'G',    // 7 - Sol
  'Ab',   // 8 - La bemol / Sol sostenido
  'A',    // 9 - La
  'Bb',   // 10 - Si bemol / La sostenido
  'B',    // 11 - Si
];

/**
 * Frecuencias en Hz de las notas en la octava 4.
 * Calculadas usando: f = 440 * 2^((n-69)/12) donde n es el número MIDI.
 */
const FREQUENCIES_OCTAVE_4: number[] = [
  261.63, // C4
  277.18, // Db4
  293.66, // D4
  311.13, // Eb4
  329.63, // E4
  349.23, // F4
  369.99, // Gb4
  392.00, // G4
  415.30, // Ab4
  440.00, // A4 (referencia estándar)
  466.16, // Bb4
  493.88, // B4
];

/**
 * Índices naturales de las letras musicales (sin alteraciones).
 */
const NATURAL_INDICES: Record<string, number> = { 'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11 };

/**
 * Genera el esqueleto heptatónico de letras para una raíz dada.
 * Sigue el protocolo: 7 letras correlativas desde la raíz.
 */
function getHeptatonicSkeleton(rootIndex: number, selectedRootName?: string): string[] {
  const letters = ['C','D','E','F','G','A','B'];
  const rootNote = getEffectiveRootForSkeleton(selectedRootName, rootIndex);
  const rootNoteClean = rootNote.replace(/#/g, '').replace(/b/g, '').replace(/x/g, '');
  const start = letters.indexOf(rootNoteClean);
  if (start === -1) throw new Error(`Invalid root letter: ${rootNoteClean}`);
  return letters.slice(start).concat(letters.slice(0, start));
}

/**
 * Genera el esqueleto de letras para la escala Whole Tone (6 notas).
 * Sigue la regla de oro: 6 letras correlativas desde la raíz, sin repetir.
 * v9.4 RIGOR ACADÉMICO: Permite dobles sostenidos para mantener unicidad de letras.
 */
function getWholeToneSkeleton(rootIndex: number, selectedRootName?: string): string[] {
  // v9.5 FIX: Las 7 letras naturales A-G. Para Whole Tone (6 notas), tomamos 6 consecutivas desde la raíz.
  // El array anterior ['C','D','E','F','G','A'] omitía 'B', causando que D WT devolviera ['D','E','F','G','A','C'].
  // FIX v9.5b: allLetters.slice(start, start+6) no hace wrap-around. Para Eb (start=2), slice(2,8) devuelve solo 5 elementos.
  // Solución: duplicar el array para permitir ciclo sin problemas de índice.
  const allLetters = ['C','D','E','F','G','A','B'];
  const doubled = allLetters.concat(allLetters); // ['C','D','E','F','G','A','B','C','D','E','F','G','A','B']
  const rootNote = getEffectiveRootForSkeleton(selectedRootName, rootIndex);
  const rootNoteClean = rootNote.replace(/#/g, '').replace(/b/g, '').replace(/x/g, '');
  const start = allLetters.indexOf(rootNoteClean);
  if (start === -1) throw new Error(`Invalid root letter for Whole Tone: ${rootNoteClean}`);
  // Tomar siempre 6 letras consecutivas con wrap-around garantizado por el array duplicado
  return doubled.slice(start, start + 6);
}


/**
 * Fórmula de intervalos absolutos para cada escala musical.
 * Los números representan semitonos de distancia desde la nota raíz (índice 0).
 * 
 * Algoritmo de generación: targetIndex = (rootIndex + intervalo) % 12
 */
export const SCALE_FORMULAS: Record<string, number[]> = {
  // ---------------------------------------------------
  // 1. ESCALAS DIATÓNICAS BASE
  // ---------------------------------------------------
  "Major (Ionian)":               [0, 2, 4, 5, 7, 9, 11],
  "Minor (Aeolian)":              [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor":               [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor":                [0, 2, 3, 5, 7, 9, 11],
  "Harmonic Major":               [0, 2, 4, 5, 7, 8, 11],

  // ---------------------------------------------------
  // 2. MODOS GRIEGOS (Derivados de la Escala Mayor)
  // ---------------------------------------------------
  "Dórico (Dorian)":              [0, 2, 3, 5, 7, 9, 10],
  "Frigio (Phrygian)":            [0, 1, 3, 5, 7, 8, 10],
  "Lidio (Lydian)":               [0, 2, 4, 6, 7, 9, 11],
  "Mixolidio (Mixolydian)":       [0, 2, 4, 5, 7, 9, 10],
  "Locrio (Locrian)":             [0, 1, 3, 5, 6, 8, 10],

  // ---------------------------------------------------
  // 3. PENTATÓNICAS Y BLUES (Fundamentales en Guitarra)
  // ---------------------------------------------------
  "Major Pentatonic":             [0, 2, 4, 7, 9],
  "Minor Pentatonic":             [0, 3, 5, 7, 10],
  "Suspended Pentatonic":         [0, 2, 5, 7, 10],
  "Minor Blues":                  [0, 3, 5, 6, 7, 10], // Pentatónica menor + b5 (blue note)
  "Major Blues":                  [0, 2, 3, 4, 7, 9],  // Pentatónica mayor + b3 como nota de paso (Country Blues - Adrian Clark)
  "Dominant Pentatonic":          [0, 2, 4, 7, 10],    // Pentatónica Dominante — 3ra mayor + b7 (contiene acorde 7 y 9)

  // ---------------------------------------------------
  // 4. JAZZ / BEBOP (Escalas Octatónicas)
  // ---------------------------------------------------
  "Bebop Dominant":               [0, 2, 4, 5, 7, 9, 10, 11],
  "Bebop Major":                  [0, 2, 4, 5, 7, 8, 9, 11],
  "Bebop Dorian":                 [0, 2, 3, 4, 5, 7, 9, 10],

  // ---------------------------------------------------
  // 5. MODOS DE JAZZ (Derivados de la Menor Melódica)
  // ---------------------------------------------------
  "Lydian Dominant (Acoustic)":   [0, 2, 4, 6, 7, 9, 10], // 4to modo, muy usado en Acordes 7(#11)
  "Lydian Augmented":             [0, 2, 4, 6, 8, 9, 11], // 3er modo, sobre acordes Maj7(#5)
  "Mixolydia b6":                 [0, 2, 4, 5, 7, 8, 10], // 5to modo de Menor Melódica — Bossa/Samba
  "Locrian #2 (Half-Diminished)": [0, 2, 3, 5, 6, 8, 10], // 6to modo, sobre acordes m7(b5)
  "Altered (Super Locrian)":      [0, 1, 3, 4, 6, 8, 10], // 7mo modo, sobre acordes 7 alterados

  // ---------------------------------------------------
  // 6. EXÓTICAS Y DEL MUNDO (Ideales para Polígonos SVG Asimétricos)
  // ---------------------------------------------------
  "Phrygian Dominant":            [0, 1, 4, 5, 7, 8, 10], // Flamenco / Spanish Gypsy
  "Double Harmonic (Byzantine)":  [0, 1, 4, 5, 7, 8, 11], // Árabe / Flamenco Oriental
  "Hungarian Minor":              [0, 2, 3, 6, 7, 8, 11], // Gitana Menor (Neoclásico)
  "Dórica #4":                    [0, 2, 3, 6, 7, 9, 10],  // 4to modo de Harmonic Minor — Klezmer/Progresive Metal
  "Hungarian Major":              [0, 3, 4, 6, 7, 9, 10],
  "Hirajoshi":                    [0, 2, 3, 7, 8],        // Pentatónica Japonesa tradicional
  "Insen":                        [0, 1, 5, 7, 10],       // Koto Japonés (Tensión oriental)
  "In":                           [0, 1, 4, 7, 8],        // Escala Japonesa 'In' — modo de Hirajoshi (folk koto/shamisen)
  "Neapolitan Minor":             [0, 1, 3, 5, 7, 8, 11],
  "Neapolitan Major":             [0, 1, 3, 5, 7, 9, 11],
  "Persian":                      [0, 1, 4, 5, 6, 8, 11],
  "Enigmatic":                    [0, 1, 4, 6, 8, 10, 11], // Inventada por Verdi, usada por Joe Satriani

  // ---------------------------------------------------
  // 7. SIMÉTRICAS Y HEXATÓNICAS
  // ---------------------------------------------------
  "Whole Tone":                   [0, 2, 4, 6, 8, 10],    // Saltos de tono completo (Hexágono perfecto)
  "Diminished Half-Whole":        [0, 1, 3, 4, 6, 7, 9, 10], // Octatónica H-W
  "Diminished Whole-Half":        [0, 2, 3, 5, 6, 8, 9, 11], // Octatónica W-H
  "Tritone Scale":                [0, 1, 4, 6, 7, 10],       // Hexatónica basada en 2 triadas
  "Prometheus":                   [0, 2, 4, 6, 9, 10],        // Escala del compositor Scriabin
  "Augmented":                    [0, 3, 4, 7, 8, 11],        // Aumentada Simétrica: dos tríadas aumentadas a distancia de 3ra menor (1, b3, 3, 5, #5, 7)
  
  // === HEXATÓNICAS FOLK — Adrian Clark "Escalas Exóticas" v10.7 ===
  "Major Hexatonic (7a omitida)": [0, 2, 4, 5, 7, 9],         // Mayor sin séptima — folk escocés/irlandés
  "Lydian Hexatonic (4a omitida)":[0, 2, 3, 6, 8, 10],        // Lidio sin cuarta — folk con carácter exótico
  
  // === OKINAWAN SCALE — Adrian Clark "Escalas Exóticas" v10.16 ===
  "Okinawan": [0, 2, 3, 7, 10],                                  // Pentatónica de Okinawa (islas Ryukyu) — semitono en b3 y b7
  
  // === PENTATÓNICA SEXTA MENOR — Adrian Clark "Escalas Exóticas" v10.19 ===
  "Minor Sixth Pentatonic": [0, 2, 3, 7, 9],                       // Pentatónica Dórica — 3ra menor + 6ta mayor (equivalente pentatónica del modo Dórico)
   
  // === RAGA DESH (ASCENDENTE) — Adrian Clark "Escalas Exóticas" v10.20 ===
  "Raga Desh (Ascendente)": [0, 2, 5, 7, 11]                       // Pentatónica exótica hindú — subida del Arohana,
};

/**
 * Categorías de escalas para agrupamiento en la UI.
 * Cada clave corresponde a un grupo visual (pestaña o <optgroup>).
 */
export const SCALE_CATEGORIES: Record<string, string[]> = {
  "Diatónicas Base": [
    "Major (Ionian)", "Harmonic Major", "Minor (Aeolian)", "Harmonic Minor", "Melodic Minor"
  ],
  "Modos Griegos": [
    "Major (Ionian)", "Dórico (Dorian)", "Frigio (Phrygian)", "Lidio (Lydian)", "Mixolidio (Mixolydian)", "Minor (Aeolian)", "Locrio (Locrian)"
  ],
  "Pentatónicas y Blues": [
    "Major Pentatonic", "Minor Pentatonic", "Suspended Pentatonic",
    "Minor Blues", "Major Blues", "Dominant Pentatonic", "Minor Sixth Pentatonic"
  ],
  "Jazz / Bebop": [
    "Bebop Dominant", "Bebop Major", "Bebop Dorian"
  ],
  "Modos de Jazz": [
    "Mixolydia b6",
    "Lydian Dominant (Acoustic)", "Lydian Augmented",
    "Locrian #2 (Half-Diminished)", "Altered (Super Locrian)"
  ],
  "Exóticas y del Mundo": [
    "Phrygian Dominant", "Double Harmonic (Byzantine)", "Hungarian Minor",
    "Dórica #4", "Hungarian Major", "Hirajoshi", "Insen", "In", "Neapolitan Minor",
    "Neapolitan Major", "Persian", "Enigmatic", "Okinawan", "Raga Desh (Ascendente)"
  ],
  "Hexátonicas Folk": [
    "Major Hexatonic (7a omitida)", "Lydian Hexatonic (4a omitida)"
  ],
  "Simétricas y Hexatónicas": [
    "Whole Tone", "Diminished Half-Whole", "Diminished Whole-Half",
    "Tritone Scale", "Prometheus", "Augmented"
  ]
};

/**
 * Lista ordenada de categorías para renderizado en la UI.
 */
export const SCALE_CATEGORY_ORDER: string[] = Object.keys(SCALE_CATEGORIES);

/**
 * Mapa inverso: escala → categoría
 */
export const SCALE_TO_CATEGORY: Record<string, string> = {};
for (const [category, scales] of Object.entries(SCALE_CATEGORIES)) {
  for (const scale of scales) {
    SCALE_TO_CATEGORY[scale] = category;
  }
}

/**
 * Tipo para los nombres de escalas disponibles.
 */
export type ScaleName = keyof typeof SCALE_FORMULAS;

/**
 * Descripción legible de cada escala para mostrar en la UI.
 */
export const SCALE_DESCRIPTIONS: Record<string, string> = {
  // === DIATÓNICAS BASE ===
  "Major (Ionian)":               "La piedra angular de la música occidental; un equilibrio perfecto de brillo y estabilidad.",
  "Harmonic Minor":               "Una escala mayor \"romántica\" que toma prestado el 6to grado menor para añadir un matiz trágico.",
  "Melodic Minor":                "La \"escala de los compositores\"; combina la dulzura mayor con la profundidad menor para líneas fluidas.",
  "Minor (Aeolian)":              "La esencia de la melancolía clásica; oscura, suave y puramente sentimental.",
  "Harmonic Major":               "Una escala mayor \"romántica\" que toma prestado el 6to grado menor para añadir un matiz trágico.",
  
  // === MODOS GRIEGOS ===
  "Dórico (Dorian)":              "Sonido sofisticado y jazzy; una escala menor que nunca se siente del todo triste.",
  "Frigio (Phrygian)":            "Puro sabor español y flamenco; una escala oscura definida por su \"caída\" inmediata de semitono.",
  "Lidio (Lydian)":               "Sonido etéreo y cinematográfico; la escala más brillante posible, evocando mundos de ensueño.",
  "Mixolidio (Mixolydian)":       "El alma del Blues y el Rock; una escala mayor con un toque rebelde y dominante.",
  "Locrio (Locrian)":             "La escala más inestable de todas; vive en el mundo de lo disminuido y la tensión constante.",
  
  // === PENTATÓNICAS Y BLUES ===
  "Major Pentatonic":             "Universal y amigable; cinco notas que omiten toda tensión para una melodía infalible.",
  "Minor Pentatonic":             "La espina dorsal del Blues; simple, cruda y la herramienta definitiva de expresión.",
  "Suspended Pentatonic":         "Una variante moderna que flota entre lo mayor y menor sin definirse, muy usada en el Jazz.",
  "Minor Blues":                  "La pentatónica menor con una \"nota de paso\" (b5) que añade el picante cromático del Blues.",
  "Major Blues":                  "Combina la alegría del campo con el lamento urbano usando la 3ra menor como adorno cromático.",
  "Dominant Pentatonic":          "Una pentatónica con tercera mayor y séptima menor; contiene el acorde de séptima dominante y también deletrea un arpegio 9na. La única diferencia con la pentatónica mayor es que la 6ta se eleva hasta la b7.",
  
  // === JAZZ / BEBOP ===
  "Bebop Dominant":               "El motor del jazz clásico; añade una nota de paso para que los tonos del acorde caigan siempre en el pulso.",
  "Bebop Major":                  "Diseñada para el swing; utiliza el 6to grado bemol como \"aceite\" para líneas melódicas infinitas.",
  "Bebop Dorian":                 "Proporciona un flujo rítmico perfecto sobre acordes menores, unificando la melodía con el ritmo de 4/4.",
  
  // === MODOS DE JAZZ (Menor Melódica) ===
  "Lydian Dominant (Acoustic)":   "Una mezcla fascinante entre brillo (#4) y blues (b7); imita los armónicos naturales del sonido.",
  "Mixolydia b6":                 "Un modo Mixolidio con sexta menor; combina la estabilidad mayor con un toque de tensión en la 6ta, perfecto para Bossa/Samba.",
  "Lydian Augmented":             "Sonido futurista y complejo; una escala mayor con una tensión \"hacia arriba\" que nunca parece resolver.",
  "Locrian #2 (Half-Diminished)": "Una versión \"reparada\" del locrio; añade una nota natural para un sonido disminuido más elegante y moderno.",
  "Altered (Super Locrian)":      "La escala de tensión máxima en Jazz; contiene todas las alteraciones posibles sobre un acorde dominante.",
  
  // === EXÓTICAS Y DEL MUNDO ===
  "Phrygian Dominant":            "El corazón del flamenco; una escala mayor exótica que evoca desiertos y pasión antigua.",
  "Double Harmonic (Byzantine)":  "Un palíndromo musical perfecto; posee dos segundas aumentadas que crean un equilibrio exótico extremo.",
  "Hungarian Minor":              "Una menor armónica \"vitaminada\"; añade un tritono que le da ese carácter gitano y misterioso.",
  "Hungarian Major":              "Rara y cautivadora; combina la alegría mayor con un intervalo de segunda aumentada muy inusual.",
  "Hirajoshi":                    "La afinación tradicional del Koto japonés; minimalista, nostálgica y profundamente serena.",
  "Insen":                        "Pentatónica japonesa de carácter melancólico; evoca paisajes urbanos nocturnos y soledad.",
  "In":                           "Escala pentatónica japonesa usada en música para koto y shamisen; su falta de tercera la hace ambigua entre mayor y menor, con un sonido zen minimalista.",
  "Neapolitan Minor":             "Un drama europeo en miniatura; utiliza el segundo grado bajo para una resolución intensamente emocional.",
  "Neapolitan Major":             "Un drama europeo en miniatura; utiliza el segundo grado bajo para una resolución intensamente emocional.",
  "Persian":                      "Una danza de semitonos; su estructura única crea una atmósfera de misterio y antigüedad.",
  "Enigmatic":                    "Inventada por Verdi como un acertijo musical; carece de anclas tonales, sonando surrealista e inestable.",
  "Okinawan":                     "Una pentatónica única de las islas Ryukyu en el sur de Japón; tiene intervalos de semitono que ofrecen un sonido completamente diferente a la pentatónica mayor habitual.",
  "Minor Sixth Pentatonic":       "Una pentatónica menor con una sexta mayor en lugar de séptima menor; conserva el carácter melódico pero crea un intervalo de tritono disonante entre la tercera menor y la sexta mayor, añadiendo 'condimento' único.",
  "Raga Desh (Ascendente)":       "Pentatónica exótica de la música clásica india; su subida (Arohana) captura el sabor distintivo de esta Raga asociada con las últimas horas antes de la media noche.",
  
  // === SIMÉTRICAS Y HEXATÓNICAS ===
  "Whole Tone":                   "La escala de los impresionistas; al no tener semitonos, crea un efecto de \"flotación\" sin principio ni fin.",
  "Diminished Half-Whole":        "El lenguaje del misterio en el Jazz; una alternancia matemática de tensión y reposo.",
  "Diminished Whole-Half":        "El lenguaje del misterio en el Jazz; una alternancia matemática de tensión y reposo.",
  "Tritone Scale":                "La suma de dos triadas mayores separadas por un tritono; fusión armónica perfecta.",
  "Prometheus":                   "Basada en el \"Acorde Místico\"; diseñada para evocar revelaciones espirituales y éxtasis.",
  "Augmented":                    "Una escala simétrica formada por dos tríadas aumentadas entrelazadas; su estructura inestable y ambigua genera un sonido expansivo que se adapta a acordes mayores, maj7 y dominantes 7(#5).",
  
  // === HEXATÓNICAS FOLK ===
  "Major Hexatonic (7a omitida)": "Una hexátona 'con huecos' muy común en la música folk tradicional escocesa e irlandesa; funciona como una escala mayor con la nota séptima ausente, creando un sonido abierto y misterioso.",
  "Lydian Hexatonic (4a omitida)":"Una hexátona 'con huecos' que elimina la cuarta de la escala mayor; la eliminación de la cuarta desdibuja la distinción entre mayor y Lidia, funcionando tanto para progresiones mayores como mixolidias."
};

// ============================================================
// Mapeo de Display Names con Fórmulas T/S
// ============================================================
// Estos nombres se usan SOLO para visualización en UI y SVG.
// Los keys originales de SCALE_FORMULAS se mantienen intactos para compatibilidad.

export const SCALE_DISPLAY_NAMES: Record<string, string> = {
  // Modos Griegos — claves internas en inglés, display en español
  "Major (Ionian)":         "Jónico (Ionian)",
  "Minor (Aeolian)":        "Eólico (Aeolian)",
  "Dórico (Dorian)":        "Dórico (Dorian)",
  "Frigio (Phrygian)":      "Frigio (Phrygian)",
  "Lidio (Lydian)":         "Lidio (Lydian)",
  "Mixolidio (Mixolydian)": "Mixolidio (Mixolydian)",
  "Locrio (Locrian)":       "Locrio (Locrian)",
  // Escalas base
  "Harmonic Minor":         "Menor Armónica",
  "Melodic Minor":          "Menor Melódica",
  "Harmonic Major":         "Mayor Armónica",
  // Pentatónicas y Blues
  "Major Pentatonic":       "Mayor Pentatónica",
  "Minor Pentatonic":       "Menor Pentatónica",
  "Suspended Pentatonic":   "Pentatónica Suspensa",
  "Minor Blues":            "Blues Menor",
  "Major Blues":            "Blues Mayor",
  "Dominant Pentatonic":    "Pentatónica Dominante",
  // Jazz / Bebop
  "Bebop Dominant":         "Bebop Dominante",
  "Bebop Major":            "Bebop Mayor",
  "Bebop Dorian":           "Bebop Dórico",
  // Modos de Jazz
  "Mixolydia b6":               "Mixolidia b6",
  "Lydian Dominant (Acoustic)": "Lidio Dominante",
  "Lydian Augmented":       "Lidio Aumentado",
  "Locrian #2 (Half-Diminished)": "Locrio #2",
  "Altered (Super Locrian)": "Alterado",
  // Exóticas y del Mundo
  "Phrygian Dominant":            "Frigio Dominante",
  "Double Harmonic (Byzantine)":  "Doble Armónica",
  "Hungarian Minor":              "Menor Húngara",
  "Hungarian Major":              "Mayor Húngara",
  "Hirajoshi":                    "Hirajoshi",
  "Insen":                        "Insen",
  "In":                           "In (Japonesa)",
  "Neapolitan Minor":             "Napolitana Menor",
  "Neapolitan Major":             "Napolitana Mayor",
  "Persian":                      "Persa",
  "Enigmatic":                    "Enigmática",
  // Simétricas y Hexatónicas
  "Whole Tone":                 "Tono Completo (Hexatonía)",
  "Diminished Half-Whole":      "Simétrica Disminuída (S - T)",
  "Diminished Whole-Half":      "Simétrica Disminuída (T - S)",
  "Tritone Scale":              "Tritono (Hexatónica dual)",
  "Prometheus":                 "Prometheus (Scriabin / Lidia b6)",
  "Augmented":                  "Aumentada (Simétrica)",
  
  // === HEXATÓNICAS FOLK ===
  "Major Hexatonic (7a omitida)": "Mayor Hexatónica (7a omitida)",
  "Lydian Hexatonic (4a omitida)": "Lidia Hexatónica (4a omitida)",
  
  // === OKINAWAN SCALE ===
  "Okinawan": "Okinawan",
  
  // === PENTATÓNICA SEXTA MENOR — Adrian Clark v10.19 ===
  "Minor Sixth Pentatonic": "Pentatónica Sexta Menor",
  
  // === RAGA DESH (ASCENDENTE) — Adrian Clark v10.20 ===
  "Raga Desh (Ascendente)": "Raga Desh (Ascendente)"
};

/**
 * Obtiene el nombre visual de una escala (con fórmula T/S si aplica).
 * Para las escalas configuradas: muestra "Nombre — T-S-T..." calculado dinámicamente.
 * Para las demás: mantiene el nombre original.
 */
export function getScaleStepFormula(scaleName: string): string {
  const formula = SCALE_FORMULAS[scaleName];
  if (!formula || formula.length === 0) return "";

  const steps: string[] = [];
  // Recorremos cada nota para calcular la distancia con la siguiente
  for (let i = 0; i < formula.length; i++) {
    // Si es la última nota del arreglo, calculamos la distancia hacia la octava (12)
    const nextNoteIndex = (i === formula.length - 1) ? 12 : formula[i + 1];
    const diff = nextNoteIndex - formula[i];

    if (diff === 1) steps.push("S");
    else if (diff === 2) steps.push("T");
    else if (diff === 3) steps.push("TS");
    else if (diff === 4) steps.push("2T");
    else steps.push(diff.toString()); // Fallback de seguridad
  }
  
  return steps.join(" - ");
}

export function getScaleDisplayName(scaleKey: ScaleName): string {
  const displayName = SCALE_DISPLAY_NAMES[scaleKey];
  if (displayName) {
    const formula = getScaleStepFormula(scaleKey);
    if (formula) {
      return `${displayName} — ${formula}`;
    }
  }
  // Fallback: usar el key original para otras escalas
  return scaleKey;
}

/**
 * Obtiene SOLO el nombre base sin fórmula T/S (para mostrar en SVG centrado).
 */
export function getScaleBaseName(scaleKey: ScaleName): string {
  return SCALE_DISPLAY_NAMES[scaleKey] || scaleKey;
}

/**
 * Divide un nombre de escala en líneas para renderizado multi-línea en el SVG.
 * Retorna un array de strings que representan cada línea.
 *
 * Reglas de división:
 * - "(Nombre)" → separa el nombre principal del paréntesis
 * - "/ " o " / " → separa por barras (ej: Scriabin / Lidia b6)
 * - "Disminuída (T - S)" / "Disminuída (S - T)" → mantiene junto si cabe, sino divide
 * - Longitud > 20 caracteres → fuerza división en punto medio
 */
export function getScaleNameLines(scaleKey: ScaleName): string[] {
  const baseName = getScaleBaseName(scaleKey);
  
  // Regla 1: Separar contenido entre paréntesis al final
  const parenMatch = baseName.match(/^(.+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return [parenMatch[1].trim(), `(${parenMatch[2]})`];
  }
  
  // Regla 2: Separar por barra inclinada
  const slashParts = baseName.split(/\s*\/\s*/);
  if (slashParts.length > 1) {
    return slashParts.map(p => p.trim()).filter(Boolean);
  }
  
  // Regla 3: Si tiene "b6" o similar al final, separar
  const specialMatch = baseName.match(/^(.+?)\s+b(\d+)$/);
  if (specialMatch && baseName.length > 18) {
    return [specialMatch[1], `b${specialMatch[2]}`];
  }
  
  // Regla 4: División por longitud (>20 caracteres divide en ~60%)
  if (baseName.length > 20) {
    const splitPoint = Math.floor(baseName.length * 0.55);
    // Buscar espacio más cercano hacia atrás para no cortar palabra
    let actualSplit = splitPoint;
    for (let i = splitPoint; i >= baseName.length * 0.3; i--) {
      if (baseName[i] === ' ') {
        actualSplit = i;
        break;
      }
    }
    return [baseName.slice(0, actualSplit).trim(), baseName.slice(actualSplit + 1).trim()];
  }
  
  // Fallback: una sola línea
  return [baseName];
}

/**
 * Lista de nombres de escalas disponibles para el selector UI.
 */
export const AVAILABLE_SCALES: ScaleName[] = Object.keys(SCALE_FORMULAS) as ScaleName[];

// ============================================================
// Sistema de Enarmonía Inteligente v2.0 - Basado en Circle of Fifths
// ============================================================
// Reglas de teoría musical para determinar cuándo usar # vs ♭
// según el contexto armónico de cada escala.
// Generación automática de nombres enarmónicos correctos.
// ============================================================

/**
 * Mapeo de índices cromáticos → nombre con sostenido equivalente.
 * Usado para convertir bemoles a sostenidos en Lydian modes (línea 436).
 */
const INDEX_TO_SHARP: Record<number, string> = {
  1: 'C#',   // Db → C#
  3: 'D#',   // Eb → D#
  6: 'F#',   // Gb → F#
  8: 'G#',   // Ab → G#
  10: 'A#',  // Bb → A#
};

/**
 * Devuelve el nombre estándar para un índice cromático dado.
 * Usa CHROMATIC_SCALE — mantiene compatibilidad con tests existentes.
 */
function getDefaultRootName(rootIndex: number): string {
  return CHROMATIC_SCALE[rootIndex];
}

/**
 * Devuelve la raíz armónica por defecto para un índice cromático dado (Círculo de Quintas).
 * Se usa como Auto-Contexto cuando no se pasa selectedRootName y se necesita contexto de sostenidos.
 */
export function getSharpContextRoot(rootIndex: number): string {
  const defaults: Record<number, string> = {
    0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
    6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
  };
  return defaults[rootIndex];
}

/**
 * Obtiene el nombre de raíz efectivo para generar skeletons.
 * Si selectedRootName es provisto, lo usa; si no, usa Círculo de Quintas por defecto:
 * - Naturales: C, D, E, F, G, A, B
 * - Sostenido por defecto: 6→F# (más común que Gb)
 * - Bemoles por defecto: 1→Db, 3→Eb, 8→Ab, 10→Bb
 */
function getEffectiveRootForSkeleton(selectedRootName: string | undefined, rootIndex: number): string {
  if (selectedRootName) return selectedRootName;
  return getSharpContextRoot(rootIndex);
}

// ============================================================
// Enarmónicos Dobles Decorativos — Notas apiladas en el círculo
// ============================================================
// Las notas FUERA de la escala se muestran con ambas variantes
// enarmónicas apiladas verticalmente (C#/Db, D#/Eb, etc.)
// ============================================================

/**
 * Representa una etiqueta de nota con posibilidad de variante enarmónica doble.
 */
export interface EnharmonicLabel {
  /** Nombre principal de la nota (ej: 'C#', 'F', 'Bb') */
  primary: string;
  /** Variante enarmónica opcional (ej: 'Db' cuando primary es 'C#') */
  secondary?: string;
  /** Indica si esta nota tiene ambas variantes visibles (fuera de escala) */
  isStacked: boolean;
}

/**
 * Índices cromáticos que tienen variante enarmónica alterable.
 */
const ENHARMONIC_INDICES = new Set([1, 3, 6, 8, 10]);

/**
 * Determina si un noteIndex está dentro de los intervalos de una escala.
 * Exportado para uso en CircleOfNotes component (diferenciación visual).
 */
export function isNoteInScale(noteIndex: number, rootIndex: number, scaleName: ScaleName): boolean {
  const intervals = SCALE_FORMULAS[scaleName];
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  return intervals.includes(intervalFromRoot);
}

/**
 * Determina si una escala usa sostenidos (#) como su "familia enarmónica".
 * Retorna true para escalas con alteraciones en sostenido.
 * Retorna false para escalas con alteraciones en bemol.
 * Para C Mayor (sin alteraciones), retorna true por defecto.
 *
 * Si selectedRootName contiene '#', fuerza retorno de true inmediatamente
 * (el usuario eligió explícitamente una nota con sostenido).
 */
function scaleUsesSharps(scaleName: ScaleName, rootIndex: number, selectedRootName?: string): boolean {
  // NUEVO: Si el usuario seleccionó explícitamente una nota con '#', forzar sostenidos
  if (selectedRootName && selectedRootName.includes('#')) {
    return true;
  }
  
  const sharpCategories = [
    "Diatónicas Base", "Modos Griegos", "Pentatónicas y Blues",
    "Jazz / Bebop", "Modos de Jazz"
  ];
  
  const category = SCALE_TO_CATEGORY[scaleName];
  
  if (category && sharpCategories.includes(category)) {
    if (scaleName === "Major (Ionian)") {
      const sharpKeys = [7, 2, 9, 4, 11, 6, 1]; // G, D, A, E, B, F#, C#
      const flatKeys = [5, 10, 3, 8, 1];       // F, Bb, Eb, Ab, Db
      
      if (sharpKeys.includes(rootIndex)) return true;
      if (flatKeys.includes(rootIndex)) return false;
      return true; // C Major → default #
    }
    
    // Minor (Aeolian): determinar por relativo Mayor (+3 semitonos)
    if (scaleName === "Minor (Aeolian)") {
      const relativeMajorRoot = (rootIndex + 3) % 12;
      const sharpKeys = [7, 2, 9, 4, 11, 6, 1]; // G, D, A, E, B, F#, C#
      const flatKeys = [5, 10, 3, 8, 1];        // F, Bb, Eb, Ab, Db
      
      if (sharpKeys.includes(relativeMajorRoot)) return true;
      if (flatKeys.includes(relativeMajorRoot)) return false;
      return true; // default
    }
    
    if (scaleName === "Harmonic Minor" || scaleName === "Melodic Minor") {
      return true;
    }
    
    if (scaleName === "Harmonic Major") {
      const flatKeys = [5, 10, 3, 8, 1]; // F, Bb, Eb, Ab, Db
      if (flatKeys.includes(rootIndex)) return false;
      return true;
    }
    
    // Modos Griegos: determinar por la clave mayor relativa
    let relativeRoot: number;
    
    if (scaleName === "Dórico (Dorian)") relativeRoot = (rootIndex - 2 + 12) % 12;
    else if (scaleName === "Frigio (Phrygian)") relativeRoot = (rootIndex - 3 + 12) % 12;
    else if (scaleName === "Lidio (Lydian)") relativeRoot = (rootIndex - 6 + 12) % 12;
    else if (scaleName === "Mixolidio (Mixolydian)") relativeRoot = (rootIndex - 7 + 12) % 12;
    else if (scaleName === "Locrio (Locrian)") relativeRoot = (rootIndex - 9 + 12) % 12;
    else return true;
    
    const sharpKeys = [7, 2, 9, 4, 11, 6, 1]; // G, D, A, E, B, F#, C#
    const flatKeys = [5, 10, 3, 8, 1];        // F, Bb, Eb, Ab, Db
    
    if (sharpKeys.includes(relativeRoot)) return true;
    if (flatKeys.includes(relativeRoot)) return false;
    return true; // C Major → default #
  }
  
  // Para otras categorías (exóticas, simétricas), default # hasta revisar matices
  return true;
}

/**
 * Calcula la etiqueta enarmónica (con posible variante doble apilada) para una nota.
 *
 * Reglas:
 * - Nota DENTRO de escala → primary simple, isStacked: false
 * - Nota FUERA de escala con alteración → primary + secondary, isStacked: true
 * - Nota FUERA de escala natural → primary simple, isStacked: false
 */
export function getEnharmonicLabel(
  noteIndex: number,
  rootIndex: number,
  scaleName: ScaleName,
  selectedRootName?: string
): EnharmonicLabel {
  // Paso 1: Determinar si la nota está DENTRO de la escala
  const inScale = isNoteInScale(noteIndex, rootIndex, scaleName);
  
  if (inScale) {
    // Nota dentro de la escala → etiqueta simple (comportamiento actual)
    return {
      primary: resolveEnharmonicName(scaleName, noteIndex, rootIndex, selectedRootName),
      isStacked: false
    };
  }
  
  // Nota FUERA de la escala
  if (!ENHARMONIC_INDICES.has(noteIndex)) {
    // Nota natural sin variante enarmónica → etiqueta simple
    return {
      primary: CHROMATIC_SCALE[noteIndex],
      isStacked: false
    };
  }
  
  // Nota alterable fuera de escala → mostrar ambas variantes apiladas
  const usesSharps = scaleUsesSharps(scaleName, rootIndex, selectedRootName);
  const sharpName = INDEX_TO_SHARP[noteIndex];
  const flatName = CHROMATIC_SCALE[noteIndex]; // ya viene con bemol por defecto
  
  if (usesSharps) {
    return { primary: sharpName!, secondary: flatName, isStacked: true };
  } else {
    return { primary: flatName, secondary: sharpName!, isStacked: true };
  }
}

/**
 * VACÍO — El Protocolo Heptatónico universal resuelve todas las escalas algorítmicamente.
 * Ningún diccionario legado debe sobrescribir el cálculo matemático de letras y alteraciones.
 */
const NON_MAJOR_ENHARMONICS: Record<string, Record<number, string>> = {};

/**
 * Conjunto de escalas que NO siguen el protocolo diatónico estándar.
 * Incluye escalas con intervalos no-diatónicos (4+, 5+) o estructuras especiales.
 */
/**
 * Conjunto de escalas que NO siguen el protocolo diatónico estándar.
 * VACÍO — El protocolo matemático universal resuelve todas las escalas sin excepciones.
 */
const NON_DIATONIC_SCALES: Set<string> = new Set([]);

// ============================================================
// Regla de 7 Letras + 1 Repetición Específica (v9.7 — Anti-dobles)
// ============================================================
// Para escalas de 8 notas: usar las 7 letras A-G una vez,
// repitiendo exactamente UNA letra según el tipo de escala.
// Si la repetición fija generaría dobles alteraciones (bb o x),
// se pivota a otra posición que evite esto.

/** Letras musicales naturales para cálculo de esqueletos diatónicos. */
const DIATONIC_LETTERS = ['C','D','E','F','G','A','B'];

/**
 * Configuración base: mapeo preferido de posición en el esqueleto para cada escala octatónica.
 * positionMap: array de 8 elementos que mapea cada nota (por intervalo) a una posición del esqueleto (0-6).
 *
 * Mapeos alternativos (altMaps): cuando el mapeo principal generaría dobles alteraciones,
 * se usan estos mapeos alternativos que repiten una posición diferente.
 */
interface OctatonicMapping {
  /** Mapeo preferido (genera III repetida para S-T/Dom, VI repetida para T-S/Maj) */
  primary: number[];
  /** Mapeos alternativos si el primario genera dobles alteraciones */
  altMaps: number[][];
}

/**
 * Mapeo explícito de posición en el esqueleto para cada escala octatónica.
 *
 * S-T (Diminished Half-Whole): [0,1,3,4,6,7,9,10]
 *   Primary: repite III (posición 2) → [0,1,2,2,3,4,5,6]
 *   Alt1:    repite I (posición 0) → [0,0,1,2,3,4,5,6]
 *   Alt2:    repite VII (posición 6) → [0,1,2,3,4,5,6,6]
 *
 * T-S (Diminished Whole-Half): [0,2,3,5,6,8,9,11]
 *   Primary: repite VI (posición 5) → [0,1,2,3,4,5,5,6]
 *   Alt1:    repite I (posición 0) → [0,0,1,2,3,4,5,6]
 *   Alt2:    repite VII (posición 6) → [0,1,2,3,4,5,6,6]
 */
/**
 * Mapeos específicos por raíz para T-S (Diminished Whole-Half).
 * Estrategia de Doble Acorde Disminuido: mantener consistencia con familia de la raíz.
 * Para raíces bemol (b): usar bemoles y naturales, evitar sostenidos.
 * Para raíces # (D#, F#, G#, A#, C): usar sostenidos y naturales, evitar bemoles.
 */
const T_ROOT_SPECIFIC_MAPPINGS: Record<number, number[]> = {
  // Eb (rootIndex=3): Eb - F - Gb - Ab - A - Bb - C - D → repite 'A' en pos 4
  // Esqueleto desde Eb: [Eb, F, Gb, Ab, Bb, C, Db]
  // Mapeo: [0,1,2,3,4,4,5,6] → repite V (Bb) para evitar B natural que requiere alteración
  3: [0, 1, 2, 3, 4, 4, 5, 6], // Eb T-S específico
  
  // Gb (rootIndex=6): Gb - Ab - A - B - C - D - Eb - F → repite 'A' en pos 1
  // Esqueleto desde G: [G,A,B,C,D,E,F]
  // Mapeo: [0,1,1,2,3,4,5,6] → repite posición 1 (A) para posiciones 1 y 2
  6: [0, 1, 1, 2, 3, 4, 5, 6], // Gb T-S específico
  
  // Ab (rootIndex=8): Ab - Bb - Cb - Db - D - Eb - F - G → repite 'D' en pos 4
  // Esqueleto desde Ab: [Ab, Bb, Cb, Db, Eb, F, Gb]
  // Mapeo: [0,1,2,3,4,4,5,6] → repite V (Eb) para evitar E natural
  8: [0, 1, 2, 3, 4, 4, 5, 6], // Ab T-S específico
  
  // Bb (rootIndex=10): Bb - C - Db - Eb - E - F - G - A → repite 'E' en pos 4
  // Esqueleto desde Bb: [Bb, C, Db, Eb, F, G, Ab]
  // Mapeo: [0,1,2,3,4,4,5,6] → repite V (F) para evitar... espera
};

/**
 * Mapeos específicos por raíz para T-S con notas negras (familia bemol).
 * Cada mapeo define qué posición del esqueleto usar para cada nota de la escala.
 * Formato: [skeletonPos_for_interval_0, skeletonPos_for_interval_2, ..., skeletonPos_for_interval_11]
 */
const T_FLAT_ROOT_TSMAPPINGS: Record<number, number[]> = {
  // Eb (rootIndex=3): Eb(0) - F(2) - Gb(3) - Ab(5) - A(8) - Bb(9) - C(11) - D(1)
  // Esqueleto Eb: [Eb, F, Gb, Ab, Bb, C, Db] → índices [0,1,2,3,4,5,6]
  // Notas: Eb→skeleton[0], F→skeleton[1], Gb→skeleton[2], Ab→skeleton[3], A→skeleton[4](Bb+bb? no), Bb→skeleton[4], C→skeleton[5], D→skeleton[6](Db+#? no)
  // Solución correcta: [0,1,2,3,?,4,5,?] donde ? = notas que necesitan ajuste especial
  // Intervalos T-S: [0,2,3,5,6,8,9,11]
  // Eb: pos0=interval0=noteIndex3→Eb=skeleton[0]✓
  // F: pos1=interval2=noteIndex5→F=skeleton[1]✓
  // Gb: pos2=interval3=noteIndex6→Gb=skeleton[2]✓
  // Ab: pos3=interval5=noteIndex8→Ab=skeleton[3]✓
  // A: pos4=interval6=noteIndex9→A natural, skeleton[4]=Bb, diff=(9-4+12)%12=5... no funciona directamente
  //
  // La clave es que para A (noteIndex=9), necesitamos baseLetter='A' con diff=0.
  // Pero el esqueleto desde Eb [Eb,F,Gb,Ab,Bb,C,Db] no tiene 'A'.
  // Solución: usar mapeo alternativo que repita una posición diferente.
  //
  // Para mantener consistencia bemol y evitar dobles alteraciones:
  // A = G## (doble sostenido) o Bbb (bemol doble) — ambos problemáticos
  // La estrategia del sistema dice: usar A natural, repetir 'A'
  // Esto significa que necesitamos un mapeo donde skeletonPos para interval 6 apunte a una posición con letra 'A'
  // Pero el esqueleto heptatónico desde Eb no tiene 'A' — las letras son E,F,G,A,B,C,D → limpias: E,F,G,A,B,C,D
  //
  // ¡Espera! El esqueleto usa LETRAS LIMPIAS, no notas del chromatic scale.
  // rootLetterClean para Eb = 'E', rootLetterIdx = 4 (posición de E en DIATONIC_LETTERS)
  // skeleton: [DIATONIC_LETTERS[4], DIATONIC_LETTERS[5], ...] = ['E','F','G','A','B','C','D']
  // ¡Sí tiene 'A'! En posición 3.
  
  // Entonces para Eb T-S con esqueleto [E,F,G,A,B,C,D]:
  // Eb(noteIndex=3): skeletonPos=0→baseLetter='E', naturalIndex=4, diff=(3-4+12)%12=11→'Eb'✓
  // F(noteIndex=5): skeletonPos=1→baseLetter='F', naturalIndex=5, diff=(5-5)=0→'F'✓
  // Gb(noteIndex=6): skeletonPos=2→baseLetter='G', naturalIndex=4, diff=(6-4)=2→'Gx'✗ (doble sostenido)
  //
  // El problema es que Gb (noteIndex=6) no puede representarse como 'G' con alteración simple desde el esqueleto.
  // G natural = index 4, Gb = index 6, diff = 2 → doble sostenido.
  // Necesitamos baseLetter='Ab' para Gb: Ab naturalIndex=8, diff=(6-8+12)%12=10→'Abb' (bemol doble)
  // O baseLetter='F#' para Gb: F# no está en el esqueleto...
  
  // La solución real es que el mapeo debe apuntar a skeletonPos donde la letra sea compatible.
  // Para Gb (interval 3): necesitamos noteIndex=6. Si skeletonPos=3→baseLetter='A', naturalIndex=9, diff=(6-9+12)%12=9→'Abb'✗
  // Si skeletonPos=0→baseLetter='E', naturalIndex=4, diff=(6-4)=2→'Ex'✗
  
  // El sistema actual usa CHROMATIC_SCALE como fallback cuando diff no es 0,1,2,3,10,11.
  // diff=9 → fallback a CHROMATIC_SCALE[6] = 'Gb'. ¡Eso funciona!
  
  // Para la implementación correcta, necesitamos mapeos que minimicen los fallbacks a CHROMATIC_SCALE.
  // La estrategia del sistema es clara: para raíces bemol, priorizar familia de raíz.
  // Implementaremos esto como un override directo en resolveOctatonicName.
};

/**
 * Mapeos específicos T-S por rootIndex — Estrategia de Doble Acorde Disminuido.
 * Cada entrada define el mapeo exacto [pos0,pos1,...,pos7] para los 8 intervalos de la escala.
 * Los mapeos están optimizados para evitar mezcla #/b y mantener consistencia visual.
 */
const T_ROOT_SPECIFIC: Record<number, number[]> = {
  // Eb (rootIndex=3): Eb - F - Gb - Ab - A - Bb - C - D
  // Esqueleto letras limpias desde E: [E,F,G,A,B,C,D]
  // Mapeo: [0,1,2,3,4,4,5,6] → repite posición 4 (B) para notas A y Bb
  // Eb→E(b), F→F(nat), Gb→G(b), Ab→A(nat), A→B(bb? no)...
  // En realidad: usamos CHROMATIC_SCALE como fallback cuando diff es problemático.
  // El mapeo [0,1,2,3,4,4,5,6] funciona porque:
  //   pos4 (interval 6=A): skeleton[4]=B, naturalIndex=9, diff=(9-9)=0→'A'? No, noteIndex para A es 9.
  //   Espera: interval 6 desde Eb(rootIndex=3) → noteIndex = (3+6)%12 = 9 = A ✓
  //   skeletonPos=4 → baseLetter='B', naturalIndex=9, diff=(9-9)=0→'B'? No debería ser 'A'.
  //
  // El error está en que el esqueleto de letras no coincide con las notas.
  // Para que A (noteIndex=9) sea correcta: baseLetter debe tener naturalIndex=9 → baseLetter='A'
  // 'A' está en skeleton[3]. Entonces pos4 necesita skeletonPos=3.
  //
  // Mapeo correcto para Eb T-S: [0,1,2,3,3,4,5,6] → repite posición 3 (A)
  // Eb→E(b), F→F(nat), Gb→G(b), Ab→A(nat via fallback o A con diff=3?), A→A(nat), Bb→B(b), C→C(nat), D→D(#)...
  //
  // Verificación detallada:
  // pos0: interval=0, noteIndex=3(Eb), skeletonPos=0→baseLetter='E', natIdx=4, diff=(3-4+12)%12=11→'Eb' ✓
  // pos1: interval=2, noteIndex=5(F), skeletonPos=1→baseLetter='F', natIdx=5, diff=0→'F' ✓
  // pos2: interval=3, noteIndex=6(Gb), skeletonPos=2→baseLetter='G', natIdx=4, diff=2→'Gx' ✗ (doble sostenido)
  //   → fallback a CHROMATIC_SCALE[6]='Gb' ✓
  // pos3: interval=5, noteIndex=8(Ab), skeletonPos=3→baseLetter='A', natIdx=9, diff=(8-9+12)%12=11→'Ab' ✓
  // pos4: interval=6, noteIndex=9(A), skeletonPos=3→baseLetter='A', natIdx=9, diff=0→'A' ✓
  // pos5: interval=8, noteIndex=11(C), skeletonPos=4→baseLetter='B', natIdx=9, diff=(11-9)=2→'Bx' ✗
  //   → fallback a CHROMATIC_SCALE[11]='B'? No, noteIndex=11 es B. CHROMATIC_SCALE[11]='B'. Pero queremos 'C'.
  //   Espera: interval 8 desde Eb(3) → (3+8)%12 = 11 = B, no C.
  //   La escala T-S [0,2,3,5,6,8,9,11] desde Eb: Eb(3), F(5), Gb(6), Ab(8), A(9), Bb(10), C(11)... espera
  //   (3+0)%12=3=Eb, (3+2)%12=5=F, (3+3)%12=6=Gb, (3+5)%12=8=Ab, (3+6)%12=9=A, (3+8)%12=11=B, (3+9)%12=0=C, (3+11)%12=2=D
  //   Entonces pos5=interval8→noteIndex=11=B, no C. Y pos6=interval9→noteIndex=0=C.
  //
  // Revisando el output esperado del sistema: Eb - F - Gb - Ab - A - Bb - C - D
  // Las notas son: Eb(3), F(5), Gb(6), Ab(8), A(9), Bb(10), C(11? no, C=0), D(2)
  // Pero interval 8 desde Eb(3) = (3+8)%12 = 11 = B, NO Bb(10).
  //
  // ¡Hay un error en mi entendimiento! La escala T-S [0,2,3,5,6,8,9,11] son INTERVALOS desde la raíz.
  // Desde Eb(3): notas en índices [3,5,6,8,9,11,0,2] = [Eb,F,Gb,Ab,A,B,Cb,D]
  // Pero el sistema dice: Eb - F - Gb - Ab - A - Bb - C - D
  // Eso sería índices [3,5,6,8,9,10,0,2] → intervalos [0,2,3,5,6,7,9,11] — ¡NO es T-S!
  
  // Revisando el output actual del test: Eb: Eb - F - Gb - Ab - A - B - C - D
  // Índices: [3,5,6,8,9,11,0,2] → intervalos desde Eb: [0,2,3,5,6,8,9,11] ✓ es T-S correcto.
  // La nota en posición 5 es B (interval 8), no Bb.
  
  // Entonces el output esperado del sistema para Eb T-S parece incorrecto.
  // El output actual `Eb - F - Gb - Ab - A - B - C - D` es musicalmente correcto para T-S.
  //
  // El problema real es Gb: `Gb - G# - A - B - C - D - Eb - F` tiene G# (sostenido) con raíz bemol.
  // Debería ser `Gb - Ab - ...` manteniendo consistencia.
  
  // Para Gb T-S (rootIndex=6): índices [6,8,9,11,0,2,3,5] = [Gb,Ab,A,B,Cb,Db,Eb,F]
  // Actual: Gb - G# - A - B - C - D - Eb - F → los índices son [6,7,9,11,0,2,3,5] — ¡posición 1 es G(7)=G#, no Ab(8)!
  
  // El problema está en el mapeo. Para interval 2 desde Gb(6) = noteIndex 8 = Ab.
  // Con mapeo primario [0,1,2,3,4,5,5,6]: skeletonPos=1 → baseLetter desde esqueleto de Gb.
  // rootLetterClean='G', rootLetterIdx=6 (posición de G en DIATONIC_LETTERS=['C','D','E','F','G','A','B'])
  // Espera: DIATONIC_LETTERS = ['C','D','E','F','G','A','B'], G está en índice 4.
  // skeleton: [DIATONIC_LETTERS[4], DIATONIC_LETTERS[5], ...] = ['G','A','B','C','D','E','F']
  // pos1: skeletonPos=1 → baseLetter='A', natIdx=9, noteIndex=(6+2)%12=8=Ab, diff=(8-9+12)%12=11→'Ab' ✓
  
  // Entonces con el mapeo primario debería funcionar para Gb... ¿por qué muestra G#?
  // Voy a verificar si mappingWouldCauseDoubleAlteration está rechazando el primario para Gb.
};

/**
 * Mapeos específicos T-S por rootIndex — Estrategia de Doble Acorde Disminuido.
 * Para raíces con notas negras (bemol): mapeos que eviten sostenidos y mantengan consistencia.
 */
const TS_FLAT_ROOT_OVERRIDES: Record<number, number[]> = {
  // Gb (rootIndex=6): Gb - Ab - Bbb - Cb - Db - Eb - Fb - Gb (ideal pero tiene Bbb/Fb/Gb dobles)
  // Versión práctica del sistema: Gb - Ab - A - B - C - D - Eb - F
  // Letras: G,A,A,B,C,D,E,F → repite 'A' en posición 2
  // Esqueleto desde G: [G,A,B,C,D,E,F] — ¡tiene 'A' en posición 1!
  // Mapeo: [0,1,1,2,3,4,5,6] → repite posición 1 (A) para posiciones 2 y...
  // No, necesitamos que pos2 (interval 3 = Bb = noteIndex 9? no, (6+3)%12=9=A)
  // interval 3 desde Gb(6): (6+3)%12 = 9 = A. Entonces pos2 apunta a A.
  // skeletonPos para pos2: queremos baseLetter='A', natIdx=9, diff=(9-9)=0→'A' ✓
  // 'A' está en skeleton[1]. Entonces TS_FLAT_OVERRIDES[6] = [?, ?, 1, ?, ?, ?, ?, ?]
  
  // Verificación completa Gb T-S con mapeo [0,1,1,2,3,4,5,6]:
  // pos0: interval=0, noteIndex=6(Gb), skeletonPos=0→baseLetter='G', natIdx=7, diff=(6-7+12)%12=11→'Gb' ✓
  // pos1: interval=2, noteIndex=8(Ab), skeletonPos=1→baseLetter='A', natIdx=9, diff=(8-9+12)%12=11→'Ab' ✓
  // pos2: interval=3, noteIndex=9(A), skeletonPos=1→baseLetter='A', natIdx=9, diff=0→'A' ✓
  // pos3: interval=5, noteIndex=11(B), skeletonPos=2→baseLetter='B', natIdx=11, diff=0→'B' ✓
  // pos4: interval=6, noteIndex=0(C), skeletonPos=3→baseLetter='C', natIdx=0, diff=0→'C' ✓
  // pos5: interval=8, noteIndex=2(Db), skeletonPos=4→baseLetter='D', natIdx=2, diff=0→'D'? No, noteIndex=2 es D natural.
  //   Espera: (6+8)%12 = 14%12 = 2 = D. Pero la escala debería tener Db...
  //   T-S intervalos [0,2,3,5,6,8,9,11]: desde Gb(6): [6,8,9,11,0,2,3,5]
  //   Índice 2 = D natural. Pero en clave de Gb menor disminuido, esto debería ser Db...
  //   En temperamento igual, D natural (index 2) es lo que da la fórmula T-S. No hay error aquí.
  //
  //   skeletonPos=4→baseLetter='D', natIdx=2, diff=(2-2)=0→'D' ✓
  // pos6: interval=9, noteIndex=3(Eb), skeletonPos=5→baseLetter='E', natIdx=4, diff=(3-4+12)%12=11→'Eb' ✓
  // pos7: interval=11, noteIndex=5(F), skeletonPos=6→baseLetter='F', natIdx=5, diff=0→'F' ✓
  
  // Resultado: Gb - Ab - A - B - C - D - Eb - F ← ¡Exactamente lo que quiere el sistema!
  6: [0, 1, 1, 2, 3, 4, 5, 6], // repite posición 1 (A) para pos1 y pos2... espera
  
  // Revisión: el mapeo [0,1,1,2,3,4,5,6] tiene skeletonPos=1 dos veces (pos1 y pos2).
  // pos1 → interval 2 = Ab → 'Ab' ✓
  // pos2 → interval 3 = A → 'A' ✓
  // ¡Pero estamos repitiendo la letra 'A', no la posición del esqueleto!
  // En el esqueleto [G,A,B,C,D,E,F], posición 1 es 'A'. Entonces sí, repetimos 'A'.
  
  // Esto funciona. Ahora para las otras raíces:
};

/**
 * Mapeos override específicos T-S para raíces con notas negras (bemol).
 * Estrategia: mantener consistencia visual evitando mezcla #/b.
 */
const TS_FLAT_OVERRIDE_MAPS: Record<number, number[]> = {
  // Gb (rootIndex=6): Gb - Ab - A - B - C - D - Eb - F
  // Esqueleto letras desde G: [G,A,B,C,D,E,F]
  // Mapeo: [0,1,1,2,3,4,5,6] → repite 'A' (posición 1)
  6: [0, 1, 1, 2, 3, 4, 5, 6],
  
  // Ab (rootIndex=8): Ab - Bb - Cb - Db - D - Eb - F - G
  // Esqueleto letras desde A: [A,B,C,D,E,F,G]
  // Notas T-S desde Ab(8): [8,10,11,1,2,3,5,7] = [Ab,Bb,B,Cb,Db,Eb,F,Gb]?
  // (8+0)%12=8=Ab, (8+2)%12=10=Bb, (8+3)%12=11=B, (8+5)%12=1=Cb? no, Cb=11... espera
  // CHROMATIC_SCALE[1]=Db, [2]=D, [3]=Eb, [4]=E, [5]=F, [6]=Gb, [7]=G, [8]=Ab, [9]=A, [10]=Bb, [11]=B
  // (8+0)%12=8→CHROMATIC[8]='Ab' ✓
  // (8+2)%12=10→CHROMATIC[10]='Bb' ✓
  // (8+3)%12=11→CHROMATIC[11]='B' → pero el sistema dice Cb...
  //
  // Espera, el output actual es: Ab - Bb - Cb - Db - D - E - F - G
  // Índices: [8,10,11? no, Cb=11=B en chromatic... pero Cb debería ser index 11]
  // CHROMATIC_SCALE[11] = 'B'. Pero Cb es enharmónico de B. resolveEnharmonicName debería devolver 'Cb' para esta nota.
  //
  // El output actual dice "Cb" en posición 2, lo cual es correcto musicalmente (es la b3 en escala de Ab).
  // Pero el sistema quiere: Ab - Bb - Cb - Db - D - Eb - F - G
  // Índices esperados: [8,10,11,1,2,3,5,7]...
  // (8+5)%12 = 13%12 = 1 = Db. Pero el sistema dice Db en posición 3 ✓
  // (8+6)%12 = 14%12 = 2 = D. Sistema dice "D" en posición 4 ✓
  // (8+8)%12 = 16%12 = 4 = E. Sistema quiere "Eb"...
  //
  // Revisando: el output actual es `Ab - Bb - Cb - Db - D - E - F - G`
  // El sistema quiere: `Ab - Bb - Cb - Db - D - Eb - F - G`
  // La diferencia está en posición 5 (interval 8): E → Eb
  // Y posición 6 (interval 9): F... (8+9)%12=5=F. Sistema quiere "F" ✓
  // Posición 7 (interval 11): (8+11)%12=7=G. Sistema quiere "G" ✓
  
  // Entonces para Ab T-S, el cambio es: posición 5 (interval 8 = E natural) → Eb
  // noteIndex para interval 8 desde Ab(8) = (8+8)%12 = 4 = E
  // Esqueleto desde A: [A,B,C,D,E,F,G]
  // Para que E(noteIndex=4) sea 'Eb': baseLetter debe tener natIdx tal que diff=(4-natIdx+12)%12=11→bemol
  // natIdx=4 → baseLetter='E', diff=0→'E'. No funciona.
  // natIdx=5 → baseLetter='F', diff=(4-5+12)%12=11→'Eb' ✓
  // 'F' está en skeleton[5]. Entonces pos5 necesita skeletonPos=5.
  
  // Verificación completa Ab T-S con mapeo [0,1,2,3,4,5,6,0]:
  // pos0: interval=0, noteIndex=8(Ab), skelPos=0→baseLetter='A', natIdx=9, diff=(8-9+12)%12=11→'Ab' ✓
  // pos1: interval=2, noteIndex=10(Bb), skelPos=1→baseLetter='B', natIdx=9, diff=(10-9)=1→'B#' ✗
  //   → fallback CHROMATIC_SCALE[10]='Bb' ✓ (pero no ideal)
  
  // Hmm, el mapeo [0,1,2,3,4,5,6,?] con skeletonPos=1 para pos1 da B# en vez de Bb.
  // El output actual ya muestra "Bb" correctamente porque usa CHROMATIC_SCALE fallback.
  //
  // El problema real es solo posición 5 (interval 8 = E → debería ser Eb).
  // Mapeo alternativo: [0,1,2,3,4,5,6,?] donde pos5→skelPos=5(F) para obtener Eb.
  
  // Pero también necesito verificar que las otras posiciones sigan funcionando:
  // pos2: interval=3, noteIndex=11(B), skelPos=2→baseLetter='C', natIdx=0, diff=(11-0+12)%12=11→'Cb' ✓
  // pos3: interval=5, noteIndex=1(Db), skelPos=3→baseLetter='D', natIdx=2, diff=(1-2+12)%12=11→'Db' ✓
  // pos4: interval=6, noteIndex=2(D), skelPos=4→baseLetter='E', natIdx=4, diff=0→'D'? No!
  //   noteIndex=2=D natural. baseLetter='E', natIdx=4, diff=(2-4+12)%12=10→'Eb' ✗ (queremos D natural)
  
  // El mapeo [0,1,2,3,4,...] no funciona para pos4 con noteIndex=2.
  // Para D(noteIndex=2): necesitamos diff=0 → baseLetter natIdx=2 → baseLetter='D' → skeleton[3]
  // Entonces pos4 necesita skelPos=3.
  
  // Mapeo revisado: [0,1,2,3,3,5,6,?]
  // pos4: interval=6, noteIndex=2(D), skelPos=3→baseLetter='D', natIdx=2, diff=0→'D' ✓
  // pos5: interval=8, noteIndex=4(E), skelPos=5→baseLetter='F', natIdx=5, diff=(4-5+12)%12=11→'Eb' ✓
  
  // Ahora verificamos las demás:
  // pos0: Ab(8)→A(natIdx9), diff=11→'Ab' ✓
  // pos1: Bb(10)→B(natIdx9), diff=1→'B#' ✗ → fallback CHROMATIC[10]='Bb' ✓
  // pos2: B(11)→C(natIdx0), diff=11→'Cb' ✓
  // pos3: Db(1)→D(natIdx2), diff=11→'Db' ✓
  // pos4: D(2)→D(natIdx2), diff=0→'D' ✓
  // pos5: E(4)→F(natIdx5), diff=11→'Eb' ✓
  // pos6: F(5)→G(natIdx7), diff=(5-7+12)%12=10→'Gbb' ✗ → fallback CHROMATIC[5]='F' ✓
  // pos7: G(7)→?... necesitamos skelPos para pos7
  
  // Para pos7 (interval 11, noteIndex=7=G):
  // Con skelPos=6→baseLetter='G', natIdx=7, diff=0→'G' ✓
  
  // Mapeo final Ab: [0,1,2,3,3,5,6,6] → repite posición 3 (D) y posición 6 (G)
  // Letras usadas: A,B,C,D,D,F,G,G → ¡repetimos D y G! Pero el sistema dice "repite D".
  // En realidad [0,1,2,3,3,5,6,6] repite skeletonPos 3 y 6.
  
  // El output esperado: Ab - Bb - Cb - Db - D - Eb - F - G
  // Letras limpias: A,B,C,D,D,E,F,G → ¡repetimos D! Correcto según el sistema.
  // Pero mi mapeo da: Ab, B#(fallback→Bb), Cb, Db, D, Eb, F(bb fallback→F), G
  // El resultado visual sería: Ab - Bb - Cb - Db - D - Eb - F - G ← ¡Correcto!
  8: [0, 1, 2, 3, 3, 5, 6, 6],
  
  // Bb (rootIndex=10): Bb - C - Db - Eb - E - F - G - A
  // Esqueleto letras desde B: [B,C,D,E,F,G,A]
  // Notas T-S desde Bb(10): [10,0,1,3,4,5,7,9] = [Bb,C,Db,Eb,E,F,G,A]
  // (10+0)%12=10=Bb, (10+2)%12=0=C, (10+3)%12=1=Db, (10+5)%12=3=Eb, (10+6)%12=4=E, (10+8)%12=5=F, (10+9)%12=7=G, (10+11)%12=9=A
  
  // Verificación nota por nota:
  // Bb(10): baseLetter='B'(natIdx11), diff=(10-11+12)%12=11→'Bb' ✓
  // C(0): baseLetter='C'(natIdx0), diff=0→'C' ✓
  // Db(1): baseLetter='D'(natIdx2), diff=(1-2+12)%12=11→'Db' ✓
  // Eb(3): baseLetter='E'(natIdx4), diff=(3-4+12)%12=11→'Eb' ✓
  // E(4): baseLetter='E'(natIdx4), diff=0→'E' ✓ → ¡repetimos 'E'!
  // F(5): baseLetter='F'(natIdx5), diff=0→'F' ✓
  // G(7): baseLetter='G'(natIdx7), diff=0→'G' ✓
  // A(9): baseLetter='A'(natIdx9), diff=0→'A' ✓
  
  // Mapeo: [0,1,2,3,3,4,5,6] → repite posición 3 (E)
  // pos0→skel[0]=B, pos1→skel[1]=C, pos2→skel[2]=D, pos3→skel[3]=E, pos4→skel[3]=E(repetido), pos5→skel[4]=F, pos6→skel[5]=G, pos7→skel[6]=A
  10: [0, 1, 2, 3, 3, 4, 5, 6],
  
  // Eb (rootIndex=3): Eb - F - Gb - Ab - A - B - C - D
  // Actual output ya es correcto: Eb - F - Gb - Ab - A - B - C - D
  // El sistema dice quiere: Eb - F - Gb - Ab - A - Bb - C - D
  // Pero interval 8 desde Eb(3) = (3+8)%12 = 11 = B, NO Bb(10).
  // La escala T-S [0,2,3,5,6,8,9,11] desde Eb produce B natural en posición 5.
  // El output actual del sistema es correcto según la fórmula. No necesita cambio.
};

/**
 * Configuración de mapeos para escalas octatónicas (8 notas).
 */
const OCTATONIC_MAPPINGS: Record<string, OctatonicMapping> = {
  "Diminished Half-Whole": {
    primary: [0, 1, 2, 2, 3, 4, 5, 6], // repite III (como S-T)
    altMaps: [
      [0, 0, 1, 2, 3, 4, 5, 6],        // repite I
      [0, 1, 2, 3, 4, 5, 6, 6],        // repite VII
    ]
  },
  "Diminished Whole-Half": {
    primary: [0, 1, 2, 3, 4, 5, 5, 6], // repite VI (como T-S/Maj)
    altMaps: [
      [0, 0, 1, 2, 3, 4, 5, 6],        // repite I
      [0, 1, 2, 3, 4, 5, 6, 6],        // repite VII
    ]
  },
  "Bebop Dominant": {
    primary: [0, 1, 2, 3, 4, 5, 6, 6], // repite VII
    altMaps: [
      [0, 1, 2, 2, 3, 4, 5, 6],        // repite III (como S-T)
      [0, 0, 1, 2, 3, 4, 5, 6],        // repite I
    ]
  },
  "Bebop Major": {
    primary: [0, 1, 2, 3, 4, 5, 5, 6], // repite VI
    altMaps: [
      [0, 1, 2, 2, 3, 4, 5, 6],        // repite III
      [0, 0, 1, 2, 3, 4, 5, 6],        // repite I
    ]
  },
  "Bebop Dorian": {
    primary: [0, 1, 2, 2, 3, 4, 5, 6], // repite III
    altMaps: [
      [0, 0, 1, 2, 3, 4, 5, 6],        // repite I
      [0, 1, 2, 3, 4, 5, 6, 6],        // repite VII
    ]
  }
};

/**
 * Excepciones manuales para Diminished Whole-Half (T-S) con claves string.
 * Para raíces específicas con bemoles, devuelve las notas completas predefinidas.
 * Esto evita cálculos erróneos y garantiza ortografía correcta.
 *
 * Formato: scaleName → Record<selectedRootName, array de 8 notas>
 */
const OCTATONIC_EXCEPTIONS: Record<string, Record<string, string[]>> = {
  "Diminished Whole-Half": {
    'Eb': ['Eb', 'F', 'Gb', 'Ab', 'A', 'B', 'C', 'D'],
    'Gb': ['Gb', 'Ab', 'A', 'B', 'C', 'D', 'Eb', 'F'],
    'Ab': ['Ab', 'Bb', 'Cb', 'Db', 'D', 'E', 'F', 'G'],
    'Bb': ['Bb', 'C', 'Db', 'Eb', 'E', 'Gb', 'G', 'A'],
  }
};

/**
 * Diccionario explícito de ortografía para Tritone Scale — 17 claves (una por botón de raíz).
 * La escala Tritone se forma entrelazando dos tríadas mayores a distancia de tritono.
 * Para algunas raíces, la segunda tríada comparte una nota con la primera (repetición de letra).
 *
 * Explicación matemática:
 * - Db Tritone = Db Mayor (Db,F,Ab) + G Mayor (G,B,D) → repite 'D'
 * - Gb Tritone = Gb Mayor (Gb,Bb,Db) + C Mayor (C,E,G) → repite 'G'
 * - Ab Tritone = Ab Mayor (Ab,C,Eb) + D Mayor (D,F#,A) → repite 'A'
 * - C# Tritone = C# Mayor (C#,E#,G#) + G Mayor (G,B,D) → usa E# para familia sostenida
 * - F# Tritone = F# Mayor (F#,A#,C#) + C Mayor (C,E,G) → repite 'C'
 * - G# Tritone = Enarmónico para evitar B# (doble sostenido)
 * - A# Tritone = Enarmónico para evitar Cx (doble sostenido)
 */
const TRITONE_SPELLINGS: Record<string, string[]> = {
  'C':  ['C', 'Db', 'E', 'Gb', 'G', 'Bb'],
  'C#': ['C#', 'D', 'E#', 'G', 'G#', 'B'],     // C# Maj + G Maj
  'Db': ['Db', 'D', 'F', 'G', 'Ab', 'B'],      // Db Maj + G Maj (repite D)
  'D':  ['D', 'Eb', 'F#', 'Ab', 'A', 'C'],
  'D#': ['D#', 'E', 'G', 'A', 'A#', 'C#'],     // Enarmónico para evitar Fx (doble sostenido)
  'Eb': ['Eb', 'E', 'G', 'A', 'Bb', 'C#'],
  'E':  ['E', 'F', 'G#', 'Bb', 'B', 'D'],
  'F':  ['F', 'F#', 'A', 'B', 'C', 'D#'],
  'F#': ['F#', 'G', 'A#', 'C', 'C#', 'E'],     // F# Maj + C Maj (repite C)
  'Gb': ['Gb', 'G', 'Bb', 'C', 'Db', 'E'],     // Gb Maj + C Maj (repite G)
  'G':  ['G', 'Ab', 'B', 'Db', 'D', 'F'],
  'G#': ['G#', 'A', 'C', 'D', 'D#', 'F#'],     // Enarmónico para evitar B#
  'Ab': ['Ab', 'A', 'C', 'D', 'Eb', 'F#'],     // Ab Maj + D Maj (repite A)
  'A':  ['A', 'Bb', 'C#', 'Eb', 'E', 'G'],
  'A#': ['A#', 'B', 'D', 'E', 'E#', 'G#'],     // Enarmónico para evitar Cx
  'Bb': ['Bb', 'B', 'D', 'E', 'F', 'G#'],      // Bb Maj + E Maj (repite B)
  'B':  ['B', 'C', 'D#', 'F', 'F#', 'A']
};

/**
 * Diccionario absoluto de ortografía para la escala Prometheus (Scriabin).
 * Grados: 1, 2, 3, #4, 6, b7 — Lidia Dominante omitiendo la 5ta justa.
 *
 * Reglas aplicadas:
 * - 6 letras únicas A-G, saltando siempre la 5ta letra desde la tónica
 * - Evitar dobles sostenidos (x) y dobles bemoles (bb) con excepciones controladas
 * - Raíces F#, G#, B usan #4 real (B#, E#) según teoría de Scriabin
 * - Raíces C#, D#, A# repiten una letra para evitar dobles alteraciones
 *
 * v9.7 Scriabin: Basado en partitura original — grados 1,2,3,#4,6,b7 con ortografía académica.
 */
const PROMETHEUS_SPELLINGS: Record<string, string[]> = {
  'C':  ['C', 'D', 'E', 'F#', 'A', 'Bb'],      // Salta la G
  'C#': ['C#', 'D#', 'E#', 'G', 'A#', 'B'],    // Excepción: G en lugar de Fx (evita doble sostenido)
  'Db': ['Db', 'Eb', 'F', 'G', 'Bb', 'Cb'],    // Salta la Ab
  'D':  ['D', 'E', 'F#', 'G#', 'B', 'C'],      // Salta la A
  'D#': ['D#', 'E#', 'G', 'A', 'C', 'C#'],     // Excepción: Evita Fx, Cx (repite C)
  'Eb': ['Eb', 'F', 'G', 'A', 'C', 'Db'],      // Salta la Bb
  'E':  ['E', 'F#', 'G#', 'A#', 'C#', 'D'],    // Salta la B
  'F':  ['F', 'G', 'A', 'B', 'D', 'Eb'],       // Salta la C
  'F#': ['F#', 'G#', 'A#', 'B#', 'D#', 'E'],   // Salta la C# (B# es el #4 real)
  'Gb': ['Gb', 'Ab', 'Bb', 'C', 'Eb', 'Fb'],   // Salta la Db
  'G':  ['G', 'A', 'B', 'C#', 'E', 'F'],       // Salta la D
  'G#': ['G#', 'A#', 'C', 'D', 'F', 'F#'],     // Excepción: Evita B#, Cx, E# (repite F)
  'Ab': ['Ab', 'Bb', 'C', 'D', 'F', 'Gb'],     // Salta la Eb
  'A':  ['A', 'B', 'C#', 'D#', 'F#', 'G'],     // Salta la E
  'A#': ['A#', 'C', 'D', 'E', 'G', 'G#'],      // Excepción: Evita B#, Cx, Dx, Fx (repite G)
  'Bb': ['Bb', 'C', 'D', 'E', 'G', 'Ab'],      // Salta la F
  'B':  ['B', 'C#', 'D#', 'E#', 'G#', 'A']     // Salta la F# (E# es el #4 real)
};

/**
 * Diccionario absoluto de ortografía para la escala Aumentada Simétrica.
 * Dos tríadas aumentadas a distancia de 3ra menor (1, b3, 3, 5, #5, 7).
 *
 * v10.2: Reemplazado por diccionario académico del usuario — entrelaza dos tríadas aug.
 * Ejemplo C: C aug (C-E-G#) + Eb aug (Eb-G-Bb) → C - Eb - E - G - G# - B
 */
const AUGMENTED_SPELLINGS: Record<string, string[]> = {
  'C':  ['C', 'Eb', 'E', 'G', 'G#', 'B'],
  'C#': ['C#', 'E', 'E#', 'G#', 'A', 'C'],     // Combina C# aug + E aug
  'Db': ['Db', 'E', 'F', 'Ab', 'A', 'C'],      // Combina Db aug + E aug (Fb enarmónico a E para legibilidad)
  'D':  ['D', 'F', 'F#', 'A', 'Bb', 'C#'],
  'D#': ['D#', 'F#', 'G', 'A#', 'B', 'D'],
  'Eb': ['Eb', 'Gb', 'G', 'Bb', 'B', 'D'],
  'E':  ['E', 'G', 'G#', 'B', 'C', 'D#'],
  'F':  ['F', 'Ab', 'A', 'C', 'C#', 'E'],
  'F#': ['F#', 'A', 'A#', 'C#', 'D', 'F'],
  'Gb': ['Gb', 'A', 'Bb', 'Db', 'D', 'F'],     // Combina Gb aug + A aug (Bbb enarmónico a A)
  'G':  ['G', 'Bb', 'B', 'D', 'D#', 'F#'],
  'G#': ['G#', 'B', 'C', 'D#', 'E', 'G'],
  'Ab': ['Ab', 'B', 'C', 'Eb', 'E', 'G'],
  'A':  ['A', 'C', 'C#', 'E', 'F', 'G#'],
  'A#': ['A#', 'C#', 'D', 'F', 'F#', 'A'],
  'Bb': ['Bb', 'Db', 'D', 'F', 'F#', 'A'],
  'B':  ['B', 'D', 'D#', 'F#', 'G', 'A#']
};

/**
 * Diccionario absoluto de ortografía para Major Hexatonic (7a omitida).
 * Grados: 1, 2, 3, 4, 5, 6 — seis letras correlativas desde la raíz.
 *
 * v10.7: Folk hexatónica escocés/irlandés — Adrian Clark "Escalas Exóticas".
 */
const MAJOR_HEXATONIC_SPELLINGS: Record<string, string[]> = {
  'C':  ['C', 'D', 'E', 'F', 'G', 'A'],       // C D E F G A (sin B)
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#'], // C# D# E# F# G# A# (sin B#) — familia sostenida
  'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb'],  // Db Eb F Gb Ab Bb (no Cb)
  'D':  ['D', 'E', 'F#', 'G', 'A', 'B'],      // D E F# G A B (sin C#)
  'D#': ['D#', 'E#', 'G', 'A', 'A#', 'C#'],   // Excepción: evita Fx, B# — repite letra para mantener legibilidad
  'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C'],    // Eb F G Ab Bb C (no Db)
  'E':  ['E', 'F#', 'G#', 'A', 'B', 'C#'],    // E F# G# A B C# (sin D)
  'F':  ['F', 'G', 'A', 'Bb', 'C', 'D'],      // F G A Bb C D (no Eb)
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#'],  // F# G# A# B C# D# (sin E)
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb'], // Gb Ab Bb Cb Db Eb (no Dbb) — Cb enarmónico a B para legibilidad
  'G':  ['G', 'A', 'B', 'C', 'D', 'E'],       // G A B C D E (no F#)
  'G#': ['G#', 'A#', 'C', 'D', 'D#', 'F#'],   // Excepción: evita B#, Cx — repite letra para mantener legibilidad
  'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F'],   // Ab Bb C Db Eb F (no Gb)
  'A':  ['A', 'B', 'C#', 'D', 'E', 'F#'],     // A B C# D E F# (no G#)
  'A#': ['A#', 'C', 'D', 'E', 'F', 'G#'],     // Excepción: evita B#, Dx — repite letra para mantener legibilidad
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G'],     // Bb C D Eb F G (no Ab)
  'B':  ['B', 'C#', 'D#', 'E', 'F#', 'G#']    // B C# D# E F# G# (sin A)
};

/**
 * Diccionario absoluto de ortografía para Lydian Hexatonic (4a omitida).
 * Grados: 1, 2, b3, #4, #5, b6 — hexatónica con carácter exótico.
 *
 * v10.7: Folk hexatónica lidia — Adrian Clark "Escalas Exóticas".
 */
const LYDIAN_HEXATONIC_SPELLINGS: Record<string, string[]> = {
  'C':  ['C', 'D', 'Eb', 'F#', 'G#', 'A#'],   // C D Eb F# G# A# (sin E) — lidio con b3 y omitida 4ta
  'C#': ['C#', 'D#', 'E', 'G', 'A', 'B'],     // Excepción: evita Fx, B#, Dx — repite letra para mantener legibilidad
  'Db': ['Db', 'Eb', 'Fb', 'G', 'A', 'Cb'],   // Db Eb Fb G A Cb (sin E) — Fb enarmónico a E
  'D':  ['D', 'E', 'F#', 'G#', 'A#', 'C'],    // D E F# G# A# C (sin B) — repite letra para mantener legibilidad
  'D#': ['D#', 'E#', 'G', 'A', 'B', 'C#'],    // Excepción: evita Fx, Cx — repite letra para mantener legibilidad
  'Eb': ['Eb', 'F', 'G', 'A', 'B', 'Db'],     // Eb F G A B Db (sin C) — repite letra para mantener legibilidad
  'E':  ['E', 'F#', 'G#', 'A#', 'C#', 'D'],   // E F# G# A# C# D (sin B) — repite letra para mantener legibilidad
  'F':  ['F', 'G', 'A', 'B', 'C', 'Eb'],      // F G A B C Eb (sin D) — repite letra para mantener legibilidad
  'F#': ['F#', 'G#', 'A#', 'B#', 'D#', 'E'],  // F# G# A# B# D# E (sin C#) — B# es el #4 real
  'Gb': ['Gb', 'Ab', 'Bb', 'C', 'D', 'Fb'],   // Excepción: evita Cx, Dx — repite letra para mantener legibilidad
  'G':  ['G', 'A', 'B', 'C#', 'D#', 'E'],     // G A B C# D# E (sin F#) — repite letra para mantener legibilidad
  'G#': ['G#', 'A#', 'C', 'D', 'F', 'F#'],    // Excepción: evita B#, Cx, E# — repite letra para mantener legibilidad
  'Ab': ['Ab', 'Bb', 'C', 'D', 'F', 'Gb'],    // Ab Bb C D F Gb (no Eb) — repite letra para mantener legibilidad
  'A':  ['A', 'B', 'C#', 'D#', 'F#', 'G'],    // A B C# D# F# G (sin E) — repite letra para mantener legibilidad
  'A#': ['A#', 'C', 'D', 'E', 'G', 'G#'],     // Excepción: evita B#, Cx, Dx, Fx — repite letra para mantener legibilidad
  'Bb': ['Bb', 'C', 'D', 'E', 'G', 'Ab'],     // Bb C D E G Ab (no F) — repite letra para mantener legibilidad
  'B':  ['B', 'C#', 'D#', 'E#', 'G#', 'A']    // B C# D# E# G# A (sin F#) — E# es el #4 real
};

/**
 * Verifica si un mapeo genera dobles alteraciones (bb o x) para una escala dada.
 */
function mappingWouldCauseDoubleAlteration(
  positionMap: number[],
  rootIndex: number,
  scaleIntervals: number[]
): boolean {
  // Obtener la letra limpia de la raíz
  const rootLetterClean = CHROMATIC_SCALE[rootIndex].replace(/[#b]/g, '');
  const rootLetterIdx = DIATONIC_LETTERS.indexOf(rootLetterClean);
  if (rootLetterIdx === -1) return false;
  
  // Generar esqueleto
  const skeleton: string[] = [];
  for (let i = 0; i < 7; i++) {
    skeleton.push(DIATONIC_LETTERS[(rootLetterIdx + i) % 7]);
  }
  
  // Verificar cada nota de la escala
  for (let pos = 0; pos < scaleIntervals.length; pos++) {
    const interval = scaleIntervals[pos];
    const noteIndex = (rootIndex + interval) % 12;
    const skeletonPos = positionMap[pos];
    const baseLetter = skeleton[skeletonPos];
    const naturalIndex = NATURAL_INDICES[baseLetter];
    const diff = (noteIndex - naturalIndex + 12) % 12;
    
    // Si diff es 10 (bb) o 2 (x), este mapeo genera dobles alteraciones
    if (diff === 10 || diff === 2) return true;
  }
  
  return false;
}

/**
 * Resuelve el nombre enarmónico para escalas octatónicas (8 notas).
 * Implementa la "Regla de 7 Letras + 1 Repetición Específica" con pivotado anti-dobles.
 *
 * v9.3c: Usa OCTATONIC_EXCEPTIONS[selectedRootName] con claves string.
 */
function resolveOctatonicName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  const mappingConfig = OCTATONIC_MAPPINGS[scaleName];
  if (!mappingConfig) return CHROMATIC_SCALE[noteIndex];
  
  const { primary, altMaps } = mappingConfig;
  const scaleIntervals = SCALE_FORMULAS[scaleName];
  if (!scaleIntervals) return CHROMATIC_SCALE[noteIndex];
  
  // === PRIORIDAD 0: Verificar excepciones manuales (OCTATONIC_EXCEPTIONS) ===
  // Si existe una entrada predefinida para esta escala y raíz, devolver nota directa
  const exceptionNotes = OCTATONIC_EXCEPTIONS[scaleName]?.[selectedRootName];
  if (exceptionNotes && Array.isArray(exceptionNotes)) {
    // Encontrar la posición de esta nota en los intervalos de la escala
    const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
    const scalePosition = scaleIntervals.indexOf(intervalFromRoot);
    if (scalePosition >= 0 && scalePosition < exceptionNotes.length) {
      return exceptionNotes[scalePosition];
    }
  }
  
  // === OVERRIDE ESPECÍFICO POR RAÍZ para T-S (Diminished Whole-Half) ===
  // Estrategia de Doble Acorde Disminuido: consistencia visual con familia de la raíz
  // Claves string: 'Eb', 'Gb', 'Ab', 'Bb'
  const TS_ROOT_OVERRIDES: Record<string, number[]> = {
    // Eb (selectedRootName='Eb'): Eb - F - Gb - Ab - A - B - Cb - D → repite 'A' en pos 4
    // Esqueleto letras desde E: [E,F,G,A,B,C,D]
    // Mapeo: [0,1,2,3,3,4,5,6] → repite posición 3 (A) para intervalos 6 y 8
    'Eb': [0, 1, 2, 3, 3, 4, 5, 6],
    
    // Gb (selectedRootName='Gb'): Gb - Ab - A - B - C - D - Eb - F → repite 'A' en pos 1
    // Esqueleto letras desde G: [G,A,B,C,D,E,F]
    // Mapeo: [0,1,1,2,3,4,5,6] → repite posición 1 (A) para intervalos 2 y 3
    'Gb': [0, 1, 1, 2, 3, 4, 5, 6],
    
    // Ab (selectedRootName='Ab'): Ab - Bb - Cb - Db - D - Eb - F - G → repite 'D' en pos 3
    // Esqueleto letras desde A: [A,B,C,D,E,F,G]
    // Intervalos T-S: [0,2,3,5,6,8,9,11] → notas [8,10,11,1,2,4,5,7] = [Ab,Bb,B,Db,D,E,F,G]
    // pos0: Ab(8)→A(natIdx9), diff=11→'Ab' ✓
    // pos1: Bb(10)→B(natIdx11), diff=11→'Bb' ✓
    // pos2: B(11)→C(natIdx0), diff=11→'Cb' ✓
    // pos3: Db(1)→D(natIdx2), diff=11→'Db' ✓
    // pos4: D(2)→D(natIdx2), diff=0→'D' ✓ (repetimos posición 3)
    // pos5: E(4)→F(natIdx5), diff=11→'Eb' ✓
    // pos6: F(5)→F(natIdx5), diff=0→'F' ✓ (repetimos posición 5)
    // pos7: G(7)→G(natIdx7), diff=0→'G' ✓
    // Mapeo: [0,1,2,3,3,5,5,6] → repite posición 3 (D) y 5 (F)
    'Ab': [0, 1, 2, 3, 3, 5, 5, 6],
    
    // Bb (selectedRootName='Bb'): Bb - C - Db - Eb - E - F - G - A → repite 'E' en pos 3
    // Esqueleto letras desde B: [B,C,D,E,F,G,A]
    // Intervalos T-S: [0,2,3,5,6,8,9,11] → notas [10,0,1,3,4,5,7,9] = [Bb,C,Db,Eb,E,F,G,A]
    // pos0: Bb(10)→B(natIdx11), diff=11→'Bb' ✓
    // pos1: C(0)→C(natIdx0), diff=0→'C' ✓
    // pos2: Db(1)→D(natIdx2), diff=11→'Db' ✓
    // pos3: Eb(3)→E(natIdx4), diff=11→'Eb' ✓
    // pos4: E(4)→E(natIdx4), diff=0→'E' ✓ (repetimos posición 3)
    // pos5: F(5)→F(natIdx5), diff=0→'F' ✓
    // pos6: G(7)→G(natIdx7), diff=0→'G' ✓
    // pos7: A(9)→A(natIdx9), diff=0→'A' ✓
    // Mapeo: [0,1,2,3,3,4,5,6] → repite posición 3 (E) para intervalos 3 y 6
    'Bb': [0, 1, 2, 3, 3, 4, 5, 6],
  };
  
  // Para T-S con raíces bemol ('Eb', 'Gb', 'Ab', 'Bb'), usar override específico
  let positionMap: number[] = primary;
  if (scaleName === 'Diminished Whole-Half' && selectedRootName in TS_ROOT_OVERRIDES) {
    positionMap = TS_ROOT_OVERRIDES[selectedRootName];
  } else {
    // Seleccionar el mapeo: usar primario si no genera dobles alteraciones, sino primero alternativo
    if (mappingWouldCauseDoubleAlteration(primary, rootIndex, scaleIntervals)) {
      for (const alt of altMaps) {
        if (!mappingWouldCauseDoubleAlteration(alt, rootIndex, scaleIntervals)) {
          positionMap = alt;
          break;
        }
      }
    }
  }
  
  // Obtener la letra limpia de la raíz (sin alteraciones # o b)
  const rootLetterClean = selectedRootName.replace(/[#b]/g, '');
  const rootLetterIdx = DIATONIC_LETTERS.indexOf(rootLetterClean);
  if (rootLetterIdx === -1) return CHROMATIC_SCALE[noteIndex];
  
  // Generar esqueleto de 7 letras correlativas desde la raíz
  const skeleton: string[] = [];
  for (let i = 0; i < 7; i++) {
    skeleton.push(DIATONIC_LETTERS[(rootLetterIdx + i) % 7]);
  }
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = scaleIntervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= positionMap.length) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Obtener la posición del esqueleto desde el mapeo seleccionado
  const skeletonPos = positionMap[scalePosition];
  const baseLetter = skeleton[skeletonPos];
  
  // Calcular la alteración: distancia entre el naturalIndex de la letra y el noteIndex real
  const naturalIndex = NATURAL_INDICES[baseLetter];
  const diff = (noteIndex - naturalIndex + 12) % 12;
  
  // Aplicar alteración según diff
  if (diff === 0) return baseLetter;                    // nota natural
  if (diff === 1) return baseLetter + '#';              // aumentado +1
  if (diff === 2) return baseLetter + 'x';              // doble sostenido (no debería pasar con pivot)
  if (diff === 11) return baseLetter + 'b';             // disminuido -1 (bemol)
  if (diff === 10) return baseLetter + 'bb';            // disminuido -2 (doble bemol — no debería pasar)
  
  // Fallback de seguridad
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Resuelve el nombre enarmónico para la escala Tritone (Hexatónica dual).
 * Intervalos: [0, 1, 4, 6, 7, 10].
 *
 * v9.3c: Usa TRITONE_SPELLINGS[selectedRootName] con 17 claves string
 * (una por cada botón de raíz en la UI) para ortografía perfecta.
 */
function resolveHexatonicName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  // Solo procesar Tritone Scale
  if (scaleName !== 'Tritone Scale') return CHROMATIC_SCALE[noteIndex];
  
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Verificar que la nota esté en la escala
  if (!intervals.includes(intervalFromRoot)) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = intervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= 6) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // === PRIORIDAD 0: Verificar diccionario explícito TRITONE_SPELLINGS ===
  // Usar selectedRootName como clave (17 entradas: C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B)
  const spelling = TRITONE_SPELLINGS[selectedRootName];
  if (spelling && Array.isArray(spelling)) {
    if (scalePosition >= 0 && scalePosition < spelling.length) {
      return spelling[scalePosition];
    }
  }
  
  // Fallback de seguridad (no debería llegar aquí con TRITONE_SPELLINGS completo)
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Resuelve el nombre enarmónico para la escala Prometheus (Hexatónica Lidia b6).
 * Intervalos: [0, 2, 4, 6, 9, 10].
 *
 * v9.6: Usa PROMETHEUS_SPELLINGS[selectedRootName] con 17 claves string
 * para ortografía perfecta de Jazz — sin cálculo matemático.
 */
function resolvePrometheusName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  // Solo procesar Prometheus
  if (scaleName !== 'Prometheus') return CHROMATIC_SCALE[noteIndex];
  
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Verificar que la nota esté en la escala
  if (!intervals.includes(intervalFromRoot)) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = intervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= 6) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // === PRIORIDAD 0: Verificar diccionario explícito PROMETHEUS_SPELLINGS ===
  const spelling = PROMETHEUS_SPELLINGS[selectedRootName];
  if (spelling && Array.isArray(spelling)) {
    if (scalePosition >= 0 && scalePosition < spelling.length) {
      return spelling[scalePosition];
    }
  }
  
  // Fallback de seguridad (no debería llegar aquí con PROMETHEUS_SPELLINGS completo)
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Resuelve el nombre enarmónico para la escala Aumentada.
 * Grados: 1, b3, 3, 5, #5, 7 — dos tríadas aumentadas entrelazadas.
 *
 * v10.1: Usa AUGMENTED_SPELLINGS[selectedRootName] con 17 claves string
 * para ortografía perfecta de la escala simétrica aumentada.
 */
function resolveAugmentedName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  // Solo procesar Augmented
  if (scaleName !== 'Augmented') return CHROMATIC_SCALE[noteIndex];
  
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Verificar que la nota esté en la escala
  if (!intervals.includes(intervalFromRoot)) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = intervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= 6) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // === PRIORIDAD 0: Verificar diccionario explícito AUGMENTED_SPELLINGS ===
  const spelling = AUGMENTED_SPELLINGS[selectedRootName];
  if (spelling && Array.isArray(spelling)) {
    if (scalePosition >= 0 && scalePosition < spelling.length) {
      return spelling[scalePosition];
    }
  }
  
  // Fallback de seguridad
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Resuelve el nombre enarmónico para Major Hexatonic (7a omitida).
 * Grados: 1, 2, 3, 4, 5, 6 — seis letras correlativas desde la raíz.
 *
 * v10.7: Usa MAJOR_HEXATONIC_SPELLINGS[selectedRootName] con 17 claves string.
 */
function resolveMajorHexatonicName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  // Solo procesar Major Hexatonic
  if (scaleName !== 'Major Hexatonic (7a omitida)') return CHROMATIC_SCALE[noteIndex];
  
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Verificar que la nota esté en la escala
  if (!intervals.includes(intervalFromRoot)) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = intervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= 6) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // === PRIORIDAD 0: Verificar diccionario explícito MAJOR_HEXATONIC_SPELLINGS ===
  const spelling = MAJOR_HEXATONIC_SPELLINGS[selectedRootName];
  if (spelling && Array.isArray(spelling)) {
    if (scalePosition >= 0 && scalePosition < spelling.length) {
      return spelling[scalePosition];
    }
  }
  
  // Fallback de seguridad
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Resuelve el nombre enarmónico para Lydian Hexatonic (4a omitida).
 * Grados: 1, 2, b3, #4, #5, b6 — hexatónica con carácter exótico.
 *
 * v10.7: Usa LYDIAN_HEXATONIC_SPELLINGS[selectedRootName] con 17 claves string.
 */
function resolveLydianHexatonicName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName: string
): string {
  // Solo procesar Lydian Hexatonic
  if (scaleName !== 'Lydian Hexatonic (4a omitida)') return CHROMATIC_SCALE[noteIndex];
  
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];
  
  // Encontrar el intervalo desde la raíz para esta nota
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Verificar que la nota esté en la escala
  if (!intervals.includes(intervalFromRoot)) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // Encontrar la posición en el arreglo de intervalos de la escala
  const scalePosition = intervals.indexOf(intervalFromRoot);
  if (scalePosition === -1 || scalePosition >= 6) {
    return CHROMATIC_SCALE[noteIndex];
  }
  
  // === PRIORIDAD 0: Verificar diccionario explícito LYDIAN_HEXATONIC_SPELLINGS ===
  const spelling = LYDIAN_HEXATONIC_SPELLINGS[selectedRootName];
  if (spelling && Array.isArray(spelling)) {
    if (scalePosition >= 0 && scalePosition < spelling.length) {
      return spelling[scalePosition];
    }
  }
  
  // Fallback de seguridad
  return CHROMATIC_SCALE[noteIndex];
}

// ============================================================
// Funciones Auxiliares de Enarmonía Extendida — v9.5 Herencia
// ============================================================

/** Verifica si una escala es algún modo Lydian. */
function isLydianMode(scaleName: string): boolean {
  return scaleName.includes('Lydian');
}

/**
 * Obtiene el nombre con doble alteración si aplica (Altered, Harmonic Minor).
 * Usa el Protocolo Heptatónico para cálculo dinámico — sin diccionarios.
 */
function getDoublyAlteredName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName?: string
): string | null {
  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  
  // Altered (Super Locrian): genera dobles alteraciones dinámicamente
  if (scaleName === 'Altered (Super Locrian)') {
    const alteredIntervals = [0, 1, 3, 4, 6, 8, 10];
    const position = alteredIntervals.indexOf(intervalFromRoot);
    if (position >= 0) {
      const skeleton = getHeptatonicSkeleton(rootIndex, selectedRootName);
      const baseLetter = skeleton[position];
      const naturalIndex = NATURAL_INDICES[baseLetter];
      const targetIndex = (rootIndex + intervalFromRoot) % 12;
      const diff = (targetIndex - naturalIndex + 12) % 12;
      
      if (diff === 0) return baseLetter;
      if (diff === 1) return baseLetter + '#';
      if (diff === 2) return baseLetter + 'x';
      if (diff === 3) return baseLetter + '#x';
      if (diff === 11) return baseLetter + 'b';
      if (diff === 10) return baseLetter + 'bb';
      if (diff === 9) return baseLetter + 'bbb';
    }
  }
  
  // Harmonic Minor: la 7ma aumentada (intervalo 11) usa doble sostenido cuando aplica
  if (scaleName === 'Harmonic Minor' && intervalFromRoot === 11) {
    const skeleton = getHeptatonicSkeleton(rootIndex, selectedRootName);
    const baseLetter = skeleton[6]; // posición 6 = 7ma en escala heptatónica
    const naturalIndex = NATURAL_INDICES[baseLetter];
    const diff = (noteIndex - naturalIndex + 12) % 12;
    
    if (diff === 0) return baseLetter;
    if (diff === 1) return baseLetter + '#';
    if (diff === 2) return baseLetter + 'x';
    if (diff === 3) return baseLetter + '#x'; // Triple sostenido
    if (diff === 11) return baseLetter + 'b';
    if (diff === 10) return baseLetter + 'bb';
    if (diff === 9) return baseLetter + 'bbb';
    return CHROMATIC_SCALE[noteIndex];
  }
  
  return null;
}

/**
 * Calcula el nombre enarmónico correcto para una nota en cualquier escala.
 * Implementa la Herencia Algorítmica: escalas de 5-8 notas heredan de heptatónicas.
 */
export function resolveEnharmonicName(
  scaleName: ScaleName,
  noteIndex: number,
  rootIndex: number,
  selectedRootName?: string
): string {
  // Alias de compatibilidad — normalizar todos los nombres a claves en SCALE_FORMULAS
  if (scaleName === "Lydian" as any) scaleName = "Lidio (Lydian)" as any;
  if (scaleName === "Major" as any) scaleName = "Major (Ionian)" as any;
  if (scaleName === "Minor" as any) scaleName = "Minor (Aeolian)" as any;
  if (scaleName === "Menor Armónica" as any) scaleName = "Harmonic Minor" as any;

  const intervalFromRoot = (noteIndex - rootIndex + 12) % 12;
  // Deducir el nombre efectivo para skeleton según el Círculo de Quintas
  const effectiveRootName = getEffectiveRootForSkeleton(selectedRootName, rootIndex);
  const rootNote = effectiveRootName;
  const isSharpContext = rootNote.includes('#');
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return CHROMATIC_SCALE[noteIndex];

  // PRIORIDAD 0: Dobles alteraciones explícitas (Safety Net) — pasar effectiveRootName para skeleton correcto
  const doublyAltered = getDoublyAlteredName(scaleName, noteIndex, rootIndex, effectiveRootName);
  if (doublyAltered) return doublyAltered;

  // === PRIORIDAD 0.5: Regla de 7 Letras + 1 Repetición (v9.6) — Escalas Octatónicas ===
  // Para escalas de 8 notas: Bebop y Diminished, usar ortografía limpia con letra repetida específica
  const octatonicScales = new Set([
    "Diminished Half-Whole", "Diminished Whole-Half",
    "Bebop Dominant", "Bebop Major", "Bebop Dorian"
  ]);
  if (octatonicScales.has(scaleName)) {
    return resolveOctatonicName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }

  // === PRIORIDAD 0.6: Escala Tritone (Hexatónica dual) — v9.3 ===
  // Usa mapeo de skeleton [0,1,2,3,4,6] para garantizar 6 letras únicas A-G
  if (scaleName === 'Tritone Scale') {
    return resolveHexatonicName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }

  // === PRIORIDAD 0.7: Escala Prometheus (Hexatónica Lidia b6) — v9.6 ===
  // Usa diccionario absoluto PROMETHEUS_SPELLINGS para ortografía perfecta de Jazz
  if (scaleName === 'Prometheus') {
    return resolvePrometheusName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }

  // === PRIORIDAD 0.8: Escala Aumentada (Simétrica) — v10.1 ===
  // Usa diccionario absoluto AUGMENTED_SPELLINGS para ortografía perfecta de tríadas entrelazadas
  if (scaleName === 'Augmented') {
    return resolveAugmentedName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }

  // === PRIORIDAD 0.9: Hexatónicas Folk — Adrian Clark v10.7 ===
  // Usa diccionarios absolutos MAJOR_HEXATONIC_SPELLINGS y LYDIAN_HEXATONIC_SPELLINGS
  
  // Major Hexatonic (7a omitida) — folk escocés/irlandés
  if (scaleName === 'Major Hexatonic (7a omitida)') {
    return resolveMajorHexatonicName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }
  
  // Lydian Hexatonic (4a omitida) — folk con carácter exótico
  if (scaleName === 'Lydian Hexatonic (4a omitida)') {
    return resolveLydianHexatonicName(scaleName, noteIndex, rootIndex, effectiveRootName);
  }

  // === PROTOCOLO ALGORÍTMICO DE HERENCIA (para escalas NO octatónicas) ===
  let parentHeptatonicIntervals = intervals;
  let isPassingTone = false;

  // Herencia para Pentatónicas, Blues y Japonesas (5-6 notas) → heredan de heptatónicas
  if (scaleName.includes("Pentatonic") || scaleName.includes("Blues") ||
      scaleName === "Hirajoshi" || scaleName === "Insen") {
    if (scaleName.includes("Major")) {
      parentHeptatonicIntervals = SCALE_FORMULAS["Major (Ionian)"];
    } else if (scaleName === "Insen") {
      // Insen tiene una 2da menor (intervalo 1), hereda de Frigio para cálculo correcto
      parentHeptatonicIntervals = SCALE_FORMULAS["Frigio (Phrygian)"];
    } else {
      // Menores y Hirajoshi heredan de Eólico maravillosamente
      parentHeptatonicIntervals = SCALE_FORMULAS["Minor (Aeolian)"];
    }
    // Si la nota actual no está en la escala padre, es una nota de paso (ej: blue note)
    if (!parentHeptatonicIntervals.includes(intervalFromRoot)) isPassingTone = true;
  }
  // 4. Herencia para Pentatónicas, Blues y Japonesas (5-6 notas) → heredan de heptatónicas
  else if (scaleName.includes("Pentatonic") || scaleName.includes("Blues") ||
           scaleName === "Hirajoshi" || scaleName === "Insen") {
    if (scaleName.includes("Major")) {
      parentHeptatonicIntervals = SCALE_FORMULAS["Major (Ionian)"];
    } else if (scaleName === "Insen") {
      // Insen tiene una 2da menor (intervalo 1), hereda de Frigio para cálculo correcto
      parentHeptatonicIntervals = SCALE_FORMULAS["Frigio (Phrygian)"];
    } else {
      // Menores y Hirajoshi heredan de Eólico maravillosamente
      parentHeptatonicIntervals = SCALE_FORMULAS["Minor (Aeolian)"];
    }
    // Si la nota actual no está en la escala padre, es una nota de paso (ej: blue note)
    if (!parentHeptatonicIntervals.includes(intervalFromRoot)) isPassingTone = true;
  }

  // === EJECUCIÓN DEL PROTOCOLO HEPTATÓNICO ===
  const isHeptOrWT = parentHeptatonicIntervals.length === 7 || scaleName === "Whole Tone";
  const hasSpecialRules = NON_MAJOR_ENHARMONICS[scaleName] && Object.keys(NON_MAJOR_ENHARMONICS[scaleName]).length > 0;
  
  if (!isPassingTone && isHeptOrWT && parentHeptatonicIntervals.includes(intervalFromRoot) && !hasSpecialRules && !NON_DIATONIC_SCALES.has(scaleName)) {
    
    const skeleton = scaleName === "Whole Tone"
      ? getWholeToneSkeleton(rootIndex, effectiveRootName)
      : getHeptatonicSkeleton(rootIndex, effectiveRootName);
      
    const position = parentHeptatonicIntervals.indexOf(intervalFromRoot);
    const baseLetter = skeleton[position];
    const naturalIndex = NATURAL_INDICES[baseLetter];
    const targetIndex = (rootIndex + intervalFromRoot) % 12;
    
    const diff = (targetIndex - naturalIndex + 12) % 12;
    
    if (diff === 0) return baseLetter;
    if (diff === 1) return baseLetter + '#';
    if (diff === 2) return baseLetter + 'x';
    if (diff === 3) return baseLetter + '#x'; // Triple Sostenido
    if (diff === 11) return baseLetter + 'b';
    if (diff === 10) return baseLetter + 'bb';
    if (diff === 9) return baseLetter + 'bbb';
    
    throw new Error(`Diferencia enharmónica inválida: ${diff} en ${scaleName}`);
  }

  // === FALLBACKS INTELIGENTES PARA NOTAS DE PASO Y SIMÉTRICAS ===
  
  // Regla dinámica Lidia/Disminuida (#11 / 4+)
  const needsAugmentedFourth = isLydianMode(scaleName) || scaleName.includes("Diminished");
  if (needsAugmentedFourth && intervalFromRoot === 6) {
    const targetIndex = (rootIndex + 6) % 12;
    return INDEX_TO_SHARP[targetIndex] || CHROMATIC_SCALE[targetIndex];
  }

  // Mapeos especiales exóticos (Hungarian Minor, Persian, etc.)
  const customMap = NON_MAJOR_ENHARMONICS[scaleName];
  if (customMap && customMap[intervalFromRoot]) return customMap[intervalFromRoot];

  // Fallback: nota de paso Bebop/Blues → usar bemol para notas cromáticas adicionales
  if (isPassingTone) {
    const targetIndex = (rootIndex + intervalFromRoot) % 12;
    // Para notas de paso, usamos CHROMATIC_SCALE que tiene los nombres correctos por defecto
    return CHROMATIC_SCALE[targetIndex];
  }

  // Fallback según contexto de la raíz (limpio, sin dobles alteraciones)
  if (isSharpContext) return INDEX_TO_SHARP[noteIndex] || CHROMATIC_SCALE[noteIndex];
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Valida que una escala heptatónica use letras únicas A-G según el protocolo musical.
 * Lanza error si hay repeticiones o omisiones de letras.
 */
export function validateHeptatonicScale(scaleName: ScaleName, rootIndex: number = 0): void {
  const intervals = SCALE_FORMULAS[scaleName];
  if (intervals.length !== 7) {
    throw new Error(`La escala ${scaleName} no es heptatónica (tiene ${intervals.length} notas)`);
  }

  const notes = buildScaleByIndex(rootIndex, scaleName);
  const letters = notes.map(note => note.name.replace(/#/g, '').replace(/b/g, ''));
  const uniqueLetters = new Set(letters);

  if (uniqueLetters.size !== 7) {
    throw new Error(`Escala ${scaleName} viola la regla de letra única: letras usadas: ${letters.join(', ')}`);
  }

  const expectedLetters = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  const usedLetters = new Set(letters);
  const expectedArray = Array.from(expectedLetters).sort();
  const usedArray = Array.from(usedLetters).sort();
  if (expectedArray.join(',') !== usedArray.join(',')) {
    throw new Error(`Escala ${scaleName} no usa exactamente las letras A-G: usadas ${usedArray.join(', ')}`);
  }
}

// ============================================================
// Función de Etiqueta de Visualización (Objetivo 2: Gramática Enarmónica)
// ============================================================
// Esta función determina cómo se debe mostrar cada nota en el círculo cromático,
// usando resolveEnharmonicName para obtener el nombre enarmónico correcto.
// Cada nota individual usa su nombre # o ♭ según corresponda a la escala/raíz actual.

/**
 * Calcula la etiqueta de visualización para cualquier nota del círculo cromático.
 * Usa resolveEnharmonicName para determinar si usar # o ♭ según el contexto.
 *
 * @param noteIndex - Índice cromático de la nota (0-11)
 * @param rootIndex - Índice de la nota raíz seleccionada (0-11)
 * @param scaleName - Nombre de la escala actual
 * @returns Etiqueta para mostrar en el SVG (ej: 'F#', 'Bb', 'C')
 */
export function getDisplayLabel(
  noteIndex: number,
  rootIndex: number,
  scaleName: ScaleName,
  selectedRootName?: string
): string {
  // Usar resolveEnharmonicName para obtener el nombre enarmónico correcto
  return resolveEnharmonicName(scaleName, noteIndex, rootIndex, selectedRootName);
}

// ============================================================
// Selector de Nota Raíz con Enarmónicos Expandido — 17 botones
// ============================================================
// Cada nota alterada aparece DOS veces como botón independiente:
// una con sostenido (C#, D#, F#, G#, A#) y otra con bemol (Db, Eb, Gb, Ab, Bb).
// Las notas naturales (C, D, E, F, G, A, B) aparecen una sola vez.
// Total: 7 naturales + 5×2 enarmónicos = 17 botones.
// Todos comparten el mismo index cromático para audio/cálculos.

/**
 * Interfaz expandida para una opción de nota raíz individual.
 * Cada entrada representa un botón independiente del selector.
 */
export interface RootNoteOption {
  /** Índice cromático inmutable (0-11) — usado para audio y cálculos */
  index: number;
  /** Nombre a mostrar en el botón (C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B) */
  displayName: string;
}

/**
 * Array original de 12 opciones (una por índice cromático).
 * Se mantiene para compatibilidad con funciones existentes.
 */
export const ROOT_NOTES: RootNoteOption[] = [
  { index: 0, displayName: 'C' },   // C (natural)
  { index: 1, displayName: 'Db' },  // Db / C# — valor por defecto
  { index: 2, displayName: 'D' },   // D (natural)
  { index: 3, displayName: 'Eb' },  // Eb / D# — valor por defecto
  { index: 4, displayName: 'E' },   // E (natural)
  { index: 5, displayName: 'F' },   // F (natural)
  { index: 6, displayName: 'Gb' },  // Gb / F# — valor por defecto
  { index: 7, displayName: 'G' },   // G (natural)
  { index: 8, displayName: 'Ab' },  // Ab / G# — valor por defecto
  { index: 9, displayName: 'A' },   // A (natural)
  { index: 10, displayName: 'Bb' }, // Bb / A# — valor por defecto
  { index: 11, displayName: 'B' },  // B (natural)
];

/**
 * Array expandido de 17 opciones para el selector UI.
 * Cada nota alterada aparece dos veces con su variante enarmónica independiente.
 * Orden: C | C#| Db| D | D#| Eb| E | F | F#| Gb| G | G#| Ab| A | A#| Bb| B
 */
export const ROOT_NOTES_EXPANDED: RootNoteOption[] = [
  { index: 0, displayName: 'C' },    // 0 — natural
  { index: 1, displayName: 'C#' },   // 1 — sostenido
  { index: 1, displayName: 'Db' },   // 1 — bemol
  { index: 2, displayName: 'D' },    // 2 — natural
  { index: 3, displayName: 'D#' },   // 3 — sostenido
  { index: 3, displayName: 'Eb' },   // 3 — bemol
  { index: 4, displayName: 'E' },    // 4 — natural
  { index: 5, displayName: 'F' },    // 5 — natural
  { index: 6, displayName: 'F#' },   // 6 — sostenido
  { index: 6, displayName: 'Gb' },   // 6 — bemol
  { index: 7, displayName: 'G' },    // 7 — natural
  { index: 8, displayName: 'G#' },   // 8 — sostenido
  { index: 8, displayName: 'Ab' },   // 8 — bemol
  { index: 9, displayName: 'A' },    // 9 — natural
  { index: 10, displayName: 'A#' },  // 10 — sostenido
  { index: 10, displayName: 'Bb' },  // 10 — bemol
  { index: 11, displayName: 'B' },   // 11 — natural
];

/**
 * Array de notas naturales ordenadas musicalmente (C D E F G A B).
 * Usado para la primera fila del selector de raíz.
 */
export const ROOT_NOTES_NATURALES: RootNoteOption[] = [
  { index: 0, displayName: 'C' },
  { index: 2, displayName: 'D' },
  { index: 4, displayName: 'E' },
  { index: 5, displayName: 'F' },
  { index: 7, displayName: 'G' },
  { index: 9, displayName: 'A' },
  { index: 11, displayName: 'B' },
];

/**
 * Array de notas con sostenidos ordenadas por quintas (C# G# D# A# F#).
 * Usado para la segunda fila del selector de raíz.
 */
export const ROOT_NOTES_SOSTENIDOS: RootNoteOption[] = [
  { index: 1, displayName: 'C#' },
  { index: 8, displayName: 'G#' },
  { index: 3, displayName: 'D#' },
  { index: 10, displayName: 'A#' },
  { index: 6, displayName: 'F#' },
];

/**
 * Array de notas con bemoles ordenadas por quintas (Db Gb Ab Eb Bb).
 * Usado para la tercera fila del selector de raíz.
 */
export const ROOT_NOTES_BMOLES: RootNoteOption[] = [
  { index: 1, displayName: 'Db' },
  { index: 6, displayName: 'Gb' },
  { index: 8, displayName: 'Ab' },
  { index: 3, displayName: 'Eb' },
  { index: 10, displayName: 'Bb' },
];

/**
 * Interfaz para las variantes enarmónicas de una nota (usado por getRootNoteDisplay).
 */
interface RootNoteEnharmonicMap {
  /** Índice cromático inmutable (0-11) */
  index: number;
  /** Nombre con bemol (Db, Eb, Gb, Ab, Bb) o nombre natural */
  flatName: string;
  /** Nombre con sostenido (C#, D#, F#, G#, A#) o nombre natural */
  sharpName: string;
  /** Nombre natural (C, D, E, F, G, A, B) — para notas sin alteración */
  naturalName: string;
}

/**
 * Mapa de las 12 notas con sus tres variantes enarmónicas.
 * Se usa como fuente de verdad para getRootNoteDisplay().
 */
const ROOT_NOTE_ENHARMONICS: RootNoteEnharmonicMap[] = [
  { index: 0, flatName: 'C',   sharpName: 'C',   naturalName: 'C' },
  { index: 1, flatName: 'Db',  sharpName: 'C#',  naturalName: 'Db' },
  { index: 2, flatName: 'D',   sharpName: 'D',   naturalName: 'D' },
  { index: 3, flatName: 'Eb',  sharpName: 'D#',  naturalName: 'Eb' },
  { index: 4, flatName: 'E',   sharpName: 'E',   naturalName: 'E' },
  { index: 5, flatName: 'F',   sharpName: 'F',   naturalName: 'F' },
  { index: 6, flatName: 'Gb',  sharpName: 'F#',  naturalName: 'Gb' },
  { index: 7, flatName: 'G',   sharpName: 'G',   naturalName: 'G' },
  { index: 8, flatName: 'Ab',  sharpName: 'G#',  naturalName: 'Ab' },
  { index: 9, flatName: 'A',   sharpName: 'A',   naturalName: 'A' },
  { index: 10, flatName: 'Bb', sharpName: 'A#',  naturalName: 'Bb' },
  { index: 11, flatName: 'B',  sharpName: 'B',   naturalName: 'B' },
];

/**
 * Obtiene el nombre de la nota raíz para mostrar en el selector UI.
 * Si la escala/raíz actual requiere sostenidos para esta nota, muestra C#/D#/F#/G#/A#.
 * Si requiere bemoles, muestra Db/Eb/Gb/Ab/Bb.
 * Para notas naturales (C, D, E, F, G, A, B) siempre muestra el nombre natural.
 *
 * @param index - Índice cromático de la nota (0-11)
 * @param scaleName - Nombre de la escala actual (opcional, para contexto enarmónico)
 * @param currentRootIndex - Índice de la raíz actualmente seleccionada (opcional)
 * @returns Nombre para mostrar en el botón del selector (ej: 'C#', 'Db', 'G')
 */
export function getRootNoteDisplay(
  index: number,
  scaleName?: ScaleName,
  currentRootIndex?: number
): string {
  const enharmonic = ROOT_NOTE_ENHARMONICS[index];
  
  if (!enharmonic) return CHROMATIC_SCALE[index] || String(index);
  
  // Verificar si esta nota tiene variante enarmónica (sharpName !== flatName)
  const hasEnharmonicVariant = enharmonic.sharpName !== enharmonic.flatName;
  
  // Si no tiene variante enarmónica, siempre mostrar nombre natural
  if (!hasEnharmonicVariant) {
    return enharmonic.naturalName;
  }
  
  // Si no hay contexto de escala, usar bemol por defecto (conservar comportamiento actual)
  if (!scaleName || currentRootIndex === undefined) {
    return enharmonic.flatName;
  }
  
  // Usar resolveEnharmonicName para determinar si esta nota lleva # o ♭ en este contexto
  const resolved = resolveEnharmonicName(scaleName, index, currentRootIndex);
  
  // Si el nombre resuelto contiene '#', mostrar la variante con sostenido
  if (resolved.includes('#')) {
    return enharmonic.sharpName;
  }
  
  // Si el nombre resuelto contiene '##' o 'x' (doble alteración aguda), también #
  if (resolved.includes('##') || resolved.includes('x')) {
    return enharmonic.sharpName;
  }
  
  // Por defecto, mostrar bemol (para notas que tienen alternativa)
  return enharmonic.flatName;
}

// ============================================================
// Algoritmos de Generación Musical
// ============================================================

/**
 * Construye una escala a partir de una nota raíz y un tipo de escala.
 * Usa aritmética modular sobre el arreglo cromático maestro.
 * 
 * @param rootNote - Nota raíz (ej: 'C', 'G', 'Db')
 * @param scaleName - Nombre de la escala (ej: 'Major', 'Minor')
 * @returns Array de objetos con información completa de cada nota en la escala
 */
function getAccidentalOffset(noteName: string): number {
  let offset = 0;
  for (let i = 1; i < noteName.length; i++) {
    const char = noteName[i];
    if (char === '#') offset += 1;
    if (char === 'b') offset -= 1;
    if (char === 'x') offset += 2;
  }
  return offset;
}

export function buildScale(rootNote: string, scaleName: ScaleName, selectedRootName?: string): MusicalNote[] {
  // Paso 1: Encontrar el índice de la nota raíz en el arreglo cromático
  const rootIndex = CHROMATIC_SCALE.indexOf(rootNote);
  if (rootIndex === -1) {
    throw new Error(`Nota raíz "${rootNote}" no encontrada en el arreglo cromático.`);
  }

  // Paso 2: Obtener la fórmula de intervalos de la escala seleccionada
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) {
    throw new Error(`Escala "${scaleName}" no encontrada en el diccionario de escalas.`);
  }

  // Paso 3: Calcular los índices finales usando aritmética modular
  // Fórmula: targetIndex = (rootIndex + intervalo) % 12
  return intervals.map((interval, position) => {
    const targetIndex = (rootIndex + interval) % 12;

    // Calcular la altura absoluta en semitonos a partir de C0,
    // asumiendo que la raíz está en la octava 4.
    const absoluteSemitones = 12 * 4 + rootIndex + interval;

    // Usar nombre enarmónico correcto para esta escala
    const noteName = resolveEnharmonicName(scaleName, targetIndex, rootIndex, selectedRootName);

    // Calcular la octava en notación científica según la letra escrita de la nota,
    // no solo según su clase de tono absoluta.
    const baseLetter = noteName[0];
    const accidentalOffset = getAccidentalOffset(noteName);
    const octave = Math.floor((absoluteSemitones - (NATURAL_INDICES[baseLetter] + accidentalOffset)) / 12);

    // Para Tone.js usamos el índice cromático base, ignorando la enarmonía compleja
    // La matemática de absoluteSemitones calcula la octava perfectamente cruzando el límite de C
    const toneJsOctave = Math.floor(absoluteSemitones / 12);
    const toneJsNote = `${CHROMATIC_SCALE[targetIndex]}${toneJsOctave}`;

    // Frecuencia calculada desde la nota final, usando equal temperament.
    const frequency = getFrequency(targetIndex, toneJsOctave);

    return {
      name: noteName,                         // Nombre enarmónico correcto (F# no Gb)
      index: targetIndex,                     // Índice en el círculo cromático (0-11)
      octave: toneJsOctave,                   // Octava actual según la nota enviada a Tone.js
      toneJsNote: toneJsNote,                 // Formato para Tone.js ("C4", "F#5")
      frequency: Math.round(frequency * 100) / 100, // Frecuencia en Hz
      intervalFromRoot: interval,             // Intervalo absoluto desde la raíz
      positionInScale: position,              // Posición dentro de la escala (0 para la tónica)
    };
  });
}

/**
 * Sobrecarga de buildScale que usa el índice de la nota raíz directamente.
 * @param rootIndex - Índice de la nota raíz (0-11)
 * @param scaleName - Nombre de la escala
 * @param selectedRootName - Nombre visual de la raíz seleccionada (ej: "C#", "Db") para contexto enarmónico
 */
export function buildScaleByIndex(rootIndex: number, scaleName: ScaleName, selectedRootName?: string): MusicalNote[] {
  // Usar CHROMATIC_SCALE para encontrar el índice (nombres que existen en el arreglo)
  const rootNote = CHROMATIC_SCALE[rootIndex];
  // Si no se pasa selectedRootName explícito, usar Círculo de Quintas como contexto por defecto
  const effectiveSelectedRootName = selectedRootName || getSharpContextRoot(rootIndex);
  return buildScale(rootNote, scaleName, effectiveSelectedRootName);
}

/**
 * Interfaz para una nota musical con toda su información contextual.
 */
export interface MusicalNote {
  name: string;           // Nombre de la nota (C, Db, D, etc.)
  index: number;          // Índice en el círculo cromático (0-11)
  octave: number;         // Octava (4, 5, etc.)
  toneJsNote: string;     // Formato para Tone.js ("C4", "Db5")
  frequency: number;      // Frecuencia en Hz
  intervalFromRoot: number;    // Intervalo absoluto desde la raíz
  positionInScale: number;     // Posición dentro de la escala (0 = tónica)
}

// ============================================================
// Funciones de Utilidad Geométrica / Visual
// ============================================================

/**
 * Calcula la posición (x, y) de una nota en el círculo cromático.
 * 
 * Matemática:
 * - El ángulo inicial es -90° (-π/2 radianes) para colocar C en la parte superior
 * - Cada nota representa un paso de 30° (2π / 12 = π/6 radianes)
 * - x = centerX + radius * cos(angle)
 * - y = centerY + radius * sin(angle)
 * 
 * @param noteIndex - Índice de la nota en el arreglo cromático (0-11)
 * @param centerX - Coordenada X del centro del SVG
 * @param centerY - Coordenada Y del centro del SVG
 * @param radius - Radio del círculo para posicionar las notas
 * @returns Objeto { x, y } con las coordenadas calculadas
 */
export function getNotePosition(
  noteIndex: number,
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number } {
  // Ángulo inicial: -90° (parte superior del círculo)
  const startAngle = -Math.PI / 2;
  
  // Cada nota representa 30 grados (2π radianes / 12 notas)
  const angleStep = (2 * Math.PI) / 12;
  
  // Calcular el ángulo final para esta nota
  const angle = startAngle + noteIndex * angleStep;

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Calcula las coordenadas de un punto para el polígono interno de la escala.
 * El polígono usa un radio ligeramente menor que el círculo de notas
 * para que se vea visualmente contenido dentro del perímetro.
 */
export function getPolygonPosition(
  noteIndex: number,
  centerX: number,
  centerY: number,
  polygonRadius: number
): { x: number; y: number } {
  return getNotePosition(noteIndex, centerX, centerY, polygonRadius);
}

/**
 * Obtiene los índices de las notas que pertenecen a una escala.
 * Útil para generar los puntos del polígono SVG.
 */
export function getScaleIndices(rootIndex: number, scaleName: ScaleName): number[] {
  const intervals = SCALE_FORMULAS[scaleName];
  return intervals.map((interval) => (rootIndex + interval) % 12);
}

/**
 * Obtiene la frecuencia de cualquier nota dada su índice y octava.
 * Fórmula: f = 440 * 2^((semitonesDesdeA4) / 12)
 */
export function getFrequency(noteIndex: number, octave: number = 4): number {
  // A4 (índice 9, octava 4) es la referencia a 440Hz
  const semitonesDesdeA4 = (octave - 4) * 12 + (noteIndex - 9);
  return 440 * Math.pow(2, semitonesDesdeA4 / 12);
}

// ============================================================
// SISTEMA DE INTERVALOS MUSICALES CON ENARMONÍA CONTEXTUAL
// ============================================================

/**
 * Escalas que usan 6m (Sexta menor) en vez de 5+ (Quinta aumentada) para el índice de 8 semitonos.
 * Regla alfabética: cuando la escala tiene G natural (quinta justa), el grado de 8 semitonos
 * debe usar la letra A → Sexta menor (Ab).
 */
const SCALES_WITH_6M: Set<string> = new Set([
  // Menores
  "Minor (Aeolian)", "Harmonic Minor", "Melodic Minor",
  // Mayores / Diatónicas
  "Major (Ionian)", "Harmonic Major",
  // Pentatónicas / Blues
  "Major Pentatonic", "Minor Pentatonic", "Suspended Pentatonic",
  "Minor Blues", "Major Blues",
  // Bebop
  "Bebop Dominant", "Bebop Major", "Bebop Dorian",
  // Modos de Jazz con 5ta justa
  "Lydian Dominant (Acoustic)", "Locrian #2 (Half-Diminished)",
  // Exóticas con 6ta grado
  "Napolitana Mayor", "Napolitana Menor", "Hirajoshi", "Insen",
  "Persa", "Enigmática", "Mayor Húngara", "Menor Húngara", "Doble Armónica",
]);

/**
 * Escalas que usan 5j (Quinta disminuída) para el índice de 6 semitonos.
 * Regla alfabética: cuando la escala tiene Gb (quarta aumentada = quinta disminuída).
 */
const SCALES_WITH_5_DIM: Set<string> = new Set([
  "Locrio (Locrian)", "Locrian #2 (Half-Diminished)",
]);

/**
 * Escalas que usan 4+ (Cuarta aumentada / Lydian #11) para el índice de 6 semitonos.
 * Regla alfabética: cuando la escala tiene F# en lugar de Gb → Cuarta aumentada.
 */
const SCALES_WITH_4_PLUS: Set<string> = new Set([
  "Lidio (Lydian)", "Lydian Dominant (Acoustic)", "Lydian Augmented",
]);

/**
 * Escalas que usan 5+ (Quinta aumentada) para el índice de 8 semitonos.
 * Regla alfabética: cuando la escala tiene G# en lugar de Ab → Quinta aumentada.
 */
const SCALES_WITH_5_PLUS: Set<string> = new Set([
  "Whole Tone", // Escala Tonal Completa
]);

/**
 * Determina la abreviatura de un intervalo musical basado en semitonos y contexto de escala.
 *
 * @param semitones - Distancia en semitonos desde la raíz (0-12)
 * @param scaleName - Nombre de la escala para determinar enarmonía contextual
 * @returns Abreviatura del intervalo: 2M, 3m, 3M, 4J, 4+, 5J, 5j, 5+, 6m, 6M, 7m, 7M
 *
 * Reglas enarmónicas:
 * - Índice 6 semitonos: 4+ (Lydian) vs 5j (Locrian)
 * - Índice 8 semitonos: 5+ (Whole Tone) vs 6m (Minor/Major estándar)
 */
export function getIntervalName(semitones: number, scaleName: string): string {
  // El primer intervalo (raíz consigo misma) se omite
  if (semitones === 0) return '';
  
  // Octava perfecta
  if (semitones === 12) return '8J';
  
  // Intervalos inmutables (no tienen variación enarmónica contextual)
  // NOTA: 10 y 11 se manejan con lógica especial abajo para contexto Enigmatic
  switch (semitones) {
    case 1: return '2m';   // Segunda menor
    case 2: return '2M';   // Segunda mayor
    case 3: return '3m';   // Tercera menor
    case 4: return '3M';   // Tercera mayor
    case 5: return '4J';   // Cuarta justa
    case 7: return '5J';   // Quinta justa
    case 9: return '6M';   // Sexta mayor
  }
  
  // === Intervalos con variación enarmónica contextual ===
  
  // Índice 6 semitonos: Cuarta aumentada (4+) vs Quinta disminuída (5j)
  if (semitones === 6) {
    if (SCALES_WITH_5_DIM.has(scaleName)) return '5j';
    if (SCALES_WITH_4_PLUS.has(scaleName)) return '4+';
    // Fallback: Cuarta aumentada es más común en contextos de tensión
    return '4+';
  }
  
  // Índice 8 semitonos: Quinta aumentada (5+) vs Sexta menor (6m)
  if (semitones === 8) {
    // Solo estas escalas alteradas usan genuinamente el #5 (5+)
    const usesAugmentedFifth = [
      "Whole Tone",
      "Lydian Augmented",
      "Altered (Super Locrian)",
      "Enigmatic" // <-- Añadida: la Enigmática usa 5+ (intervalo 8)
    ].includes(scaleName);
    
    if (usesAugmentedFifth) return '5+';
    
    // Para el 90% de las demás escalas (Locrio, Menores, Frigio, Disminuidas, etc.)
    return '6m';
  }
  
  // Índice 10 semitonos: Séptima menor (7m) vs Sexta aumentada (6+)
  if (semitones === 10) {
    if (scaleName === "Enigmatic") return '6+'; // La Enigmática usa #6 (intervalo 10)
    return '7m';
  }
  
  // Índice 11 semitonos: Séptima mayor (7M)
  if (semitones === 11) return '7M';
  
  // Fallback por seguridad
  return `${semitones}°`;
}

/**
 * Obtiene el array completo de intervalos musicales para una escala.
 *
 * @param scaleName - Nombre de la escala
 * @returns Array de abreviaturas de intervalos (sin el primer intervalo "1J")
 *
 * Ejemplo: Major (Ionian) → ['2M', '3M', '4J', '5J', '6M', '7M']
 */
export function getScaleIntervals(scaleName: string): string[] {
  const intervals = SCALE_FORMULAS[scaleName];
  if (!intervals) return [];
  
  return intervals
    .map(semitone => getIntervalName(semitone, scaleName))
    .filter(name => name !== ''); // Filtrar el primer intervalo (raíz)
}

// ============================================================
// v12.0 — Estructuras de Datos para Acordes (Tríadas y Cuatríadas)
// ============================================================

/**
 * Define un tipo de acorde por sus intervalos desde la raíz.
 * Ej: Mayor = [0, 4, 7] → 1ra, 3ra mayor, 5ta justa
 */
export interface ChordType {
  /** Nombre legible: "Mayor", "Menor", "Disminuida", etc. */
  name: string;
  /** Abreviatura estándar: "M", "m", "dim", "aug", "7", "m7", "maj7", etc. */
  abbreviation: string;
  /** Intervalos en semitonos desde la raíz */
  intervals: number[];
  /** Categoría del acorde */
  category: 'triad' | '7th';
  /** Descripción musical */
  description: string;
}

/**
 * Nota dentro de un acorde, con información completa.
 */
export interface ChordNote {
  /** Índice cromático de la nota (0-11) */
  index: number;
  /** Nombre de la nota (ej: "C", "F#", "Db") */
  name: string;
  /** Posición en el acorde: 1, 3, 5, 7 (grado del acorde) */
  chordDegree: number;
  /** Nombre del intervalo desde la raíz del acorde (ej: "3M", "5J", "7m") */
  intervalName: string;
  /** Frecuencia en Hz */
  frequency: number;
  /** Nota en formato Tone.js (ej: "C4", "F#4") */
  toneJsNote: string;
}

/**
 * Representa un acorde construido sobre una nota específica.
 */
export interface Chord {
  /** Nota raíz del acorde (ej: "C", "F#", "Db") */
  root: string;
  /** Índice cromático de la raíz (0-11) */
  rootIndex: number;
  /** Tipo de acorde (key de CHORD_TYPES) */
  type: string;
  /** Abreviatura estándar (ej: "M", "m7", "dim7") */
  abbreviation: string;
  /** Notas del acorde con toda su información */
  notes: ChordNote[];
  /** Categoría: 'triad' o '7th' */
  category: 'triad' | '7th';
  /** Nombre completo para display (ej: "Cmaj7", "Dm7", "G7") */
  fullName: string;
  /** Grado diatónico (I, ii, iii, IV, V, vi, viiº) */
  diatonicDegree?: string;
}

/**
 * Diccionario completo de tipos de acorde soportados.
 * Basado en la especificación del usuario: 4 tríadas + 10 cuatríadas = 14 tipos.
 */
export const CHORD_TYPES: Record<string, ChordType> = {
  // === TRÍADAS (3 notas) ===
  "Major": {
    name: "Mayor",
    abbreviation: "M",
    intervals: [0, 4, 7],
    category: "triad",
    description: "Acorde Mayor: brillante y estable"
  },
  "Minor": {
    name: "Menor",
    abbreviation: "m",
    intervals: [0, 3, 7],
    category: "triad",
    description: "Acorde Menor: oscuro y melancólico"
  },
  "Diminished": {
    name: "Disminuida",
    abbreviation: "dim",
    intervals: [0, 3, 6],
    category: "triad",
    description: "Acorde Disminuida: tenso e inestable"
  },
  "Augmented": {
    name: "Aumentada",
    abbreviation: "aug",
    intervals: [0, 4, 8],
    category: "triad",
    description: "Acorde Aumentada: suspendido y expansivo"
  },

  // === CUATRÍADAS (4 notas) ===
  "Dominant 7th": {
    name: "Dominante 7ª",
    abbreviation: "7",
    intervals: [0, 4, 7, 10],
    category: "7th",
    description: "Acorde Dominante 7ª: resolución hacia I"
  },
  "Major 7th": {
    name: "Mayor 7ª",
    abbreviation: "maj7",
    intervals: [0, 4, 7, 11],
    category: "7th",
    description: "Acorde Mayor 7ª: dulce y jazzy"
  },
  "Minor 7th": {
    name: "Menor 7ª",
    abbreviation: "m7",
    intervals: [0, 3, 7, 10],
    category: "7th",
    description: "Acorde Menor 7ª: suave y sofisticado"
  },
  "Minor Major 7th": {
    name: "Menor-Major 7ª",
    abbreviation: "m(Maj7)",
    intervals: [0, 3, 7, 11],
    category: "7th",
    description: "Acorde Menor-Major 7ª: tensión cinematográfica"
  },
  "Half-Diminished 7th": {
    name: "Semi-Disminuído 7ª",
    abbreviation: "m7b5",
    intervals: [0, 3, 6, 10],
    category: "7th",
    description: "Semi-Disminuído 7ª: tensión elegante (viº en menor)"
  },
  "Diminished 7th": {
    name: "Disminuído 7ª",
    abbreviation: "dim7",
    intervals: [0, 3, 6, 9],
    category: "7th",
    description: "Disminuído 7ª: simétrico y tenso"
  },
  "Major 7#5": {
    name: "Mayor 7ª (#5)",
    abbreviation: "maj7(#5)",
    intervals: [0, 4, 8, 11],
    category: "7th",
    description: "Acorde Mayor 7ª con 5ta aumentada"
  },
  "Dominant 7#5": {
    name: "Dominante 7ª (#5)",
    abbreviation: "7(#5)",
    intervals: [0, 4, 8, 10],
    category: "7th",
    description: "Acorde Dominante 7ª con 5ta aumentada"
  },
  "Major 6th": {
    name: "Mayor 6ª",
    abbreviation: "6",
    intervals: [0, 4, 7, 9],
    category: "7th",
    description: "Acorde Mayor 6ª: color jazz clásico"
  },
  "Minor 6th": {
    name: "Menor 6ª",
    abbreviation: "m6",
    intervals: [0, 3, 7, 9],
    category: "7th",
    description: "Acorde Menor 6ª: tono suave y cálido"
  },
};

/**
 * Construye el nombre estándar de un acorde (ej: "Cmaj7", "Dm7", "G7", "Bm7b5").
 */
function buildChordFullName(rootName: string, chordType: ChordType): string {
  const abbr = chordType.abbreviation;
  
  if (chordType.category === 'triad') {
    if (abbr === 'M') return rootName;  // Mayor: solo raíz
    if (abbr === 'm') return `${rootName}m`;
    if (abbr === 'dim') return `${rootName}dim`;
    if (abbr === 'aug') return `${rootName}aug`;
  }
  
  if (chordType.category === '7th') {
    if (abbr === '7') return `${rootName}7`;
    if (abbr === 'maj7') return `${rootName}maj7`;
    if (abbr === 'm7') return `${rootName}m7`;
    if (abbr === 'm(Maj7)') return `${rootName}m(Maj7)`;
    if (abbr === 'm7b5') return `${rootName}m7b5`;
    if (abbr === 'dim7') return `${rootName}dim7`;
    if (abbr === 'maj7(#5)') return `${rootName}maj7(#5)`;
    if (abbr === '7(#5)') return `${rootName}7(#5)`;
    if (abbr === '6') return `${rootName}6`;
    if (abbr === 'm6') return `${rootName}m6`;
  }
  
  // Fallback
  return `${rootName} ${chordType.name}`;
}

/**
 * Construye un acorde (tríada o cuatríada) a partir de una nota raíz.
 *
 * @param rootIndex - Índice cromático de la raíz (0-11)
 * @param chordTypeKey - Clave de CHORD_TYPES (ej: "Major", "Minor 7th")
 * @param selectedRootName - Nombre visual de la raíz para contexto enarmónico
 * @returns Objeto Chord con todas las notas y metadatos
 *
 * Ejemplo:
 * buildChord(0, "Major") → Chord { root: "C", type: "Major", notes: [C4, E4, G4], ... }
 * buildChord(2, "Minor 7th") → Chord { root: "D", type: "Minor 7th", notes: [D4, F4, A4, C4], ... }
 */
export function buildChord(
  rootIndex: number,
  chordTypeKey: string,
  selectedRootName?: string,
  scaleName?: string,
  scaleRootIndex?: number,
  scaleRootName?: string
): Chord {
  const chordType = CHORD_TYPES[chordTypeKey];
  if (!chordType) {
    throw new Error(`Tipo de acorde "${chordTypeKey}" no encontrado.`);
  }

  const rootNote = selectedRootName || getDefaultRootName(rootIndex);
  
  // Construir las notas del acorde usando los intervalos
  const notes: ChordNote[] = chordType.intervals.map((interval, position) => {
    const noteIndex = (rootIndex + interval) % 12;
    
    // Usar resolveEnharmonicName para nombre enarmónico correcto
    // Si se proporciona scaleName, usarlo como contexto; si no, usar "Major (Ionian)" como fallback
    const chordScaleName = scaleName || "Major (Ionian)";
    // Usar scaleRootIndex (raíz de la escala) para buscar en MAJOR_FLAT_MAP, no rootIndex (raíz del acorde)
    const contextRootIndex = scaleRootIndex ?? rootIndex;
    // Usar scaleRootName (nombre de la raíz de la escala) para contexto enarmónico, no selectedRootName (raíz del acorde)
    const contextRootName = scaleRootName ?? selectedRootName;
    const noteName = resolveEnharmonicName(
      chordScaleName as any,
      noteIndex,
      contextRootIndex,
      contextRootName
    );
    
    // === Aritmética estricta para garantizar ascensión monofónica sin saltos de octava ===
    const absoluteSemitones = 12 * 4 + rootIndex + interval;
    const toneJsOctave = Math.floor(absoluteSemitones / 12);
    
    const toneJsNote = `${CHROMATIC_SCALE[noteIndex]}${toneJsOctave}`;
    const frequency = getFrequency(noteIndex, toneJsOctave);
    
    // Calcular el grado del acorde (1, 3, 5, 7) — grados diatónicos reales
    // Mapeo: intervalo 0→1, 2→2, 4→3, 5→4, 7→5, 9→6, 11→7
    // Fórmula: Math.floor((interval + 1) / 2) + 1
    const chordDegree = Math.floor((interval + 1) / 2) + 1;
    
    // Calcular el nombre del intervalo
    const intervalName = getIntervalName(interval, "Major (Ionian)");
    
    return {
      index: noteIndex,
      name: noteName,
      chordDegree: chordDegree,
      intervalName: intervalName,
      frequency: Math.round(frequency * 100) / 100,
      toneJsNote: toneJsNote,
    };
  });

  // Construir el nombre completo (ej: "Cmaj7", "Dm7", "G7")
  const fullName = buildChordFullName(rootNote, chordType);

  return {
    root: rootNote,
    rootIndex: rootIndex,
    type: chordTypeKey,
    abbreviation: chordType.abbreviation,
    notes: notes,
    category: chordType.category,
    fullName: fullName,
  };
}

/**
 * Detecta el nombre de un acorde dado sus intervalos.
 *
 * @param intervals - Array de intervalos en semitonos desde la raíz
 * @returns Clave de CHORD_TYPES o null si no coincide
 *
 * Ejemplo:
 * detectChordName([0, 4, 7]) → "Major"
 * detectChordName([0, 3, 7, 10]) → "Minor 7th"
 */
export function detectChordName(intervals: number[]): string | null {
  const intervalsStr = intervals.join(',');
  
  for (const [key, chordType] of Object.entries(CHORD_TYPES)) {
    const typeStr = chordType.intervals.join(',');
    if (intervalsStr === typeStr) {
      return key;
    }
  }
  
  return null;
}

/**
 * Determina el símbolo del grado diatónico.
 *
 * Reglas de la teoría musical:
 * - Grado mayor → numeral romano MAYÚSCULA (I, IV, V)
 * - Grado menor → numeral romano minúscula (ii, iii, vi)
 * - Grado disminuído → numeral romano minúscula + º (viiº)
 * - Grado aumentado → numeral romano + # (III#)
 *
 * @param degreeIndex - Índice del grado en la escala (0-6 para heptatónicas)
 * @param chordTypeKey - Tipo de acorde para determinar mayúscula/minúscula
 * @returns Símbolo del grado diatónico
 */
export function getDiatonicDegreeSymbol(degreeIndex: number, chordTypeKey: string): string {
  // ✅ v18.0: Cifrado Berklee/Jazz — TODOS los romanos en MAYÚSCULA (I, II, III, IV, V, VI, VII)
  // La calidad del acorde se determina exclusivamente por el sufijo
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const numeral = numerals[degreeIndex % 7];
  
  // === Tríadas ===
  if (chordTypeKey === "Major") return numeral;
  if (chordTypeKey === "Minor") return numeral + 'm';
  if (chordTypeKey === "Diminished") return numeral + 'º';
  if (chordTypeKey === "Augmented") return numeral + '+';
  
  // === Cuatríadas (Séptimas) ===
  if (chordTypeKey === "Dominant 7th") return numeral + '7';
  if (chordTypeKey === "Major 7th") return numeral + 'maj7';
  if (chordTypeKey === "Minor 7th") return numeral + 'm7';
  if (chordTypeKey === "Minor Major 7th") return numeral + 'm(maj7)';
  
  // Disminuidos y Semidisminuidos
  if (chordTypeKey === "Half-Diminished 7th") return numeral + 'ø7';
  if (chordTypeKey === "Diminished 7th") return numeral + 'º7';
  
  // Acordes con 5ta alterada
  if (chordTypeKey === "Major 7#5") return numeral + 'maj7(#5)';
  if (chordTypeKey === "Dominant 7#5") return numeral + '7(#5)';
  
  // Sextas
  if (chordTypeKey === "Major 6th") return numeral + '6';
  if (chordTypeKey === "Minor 6th") return numeral + 'm6';
  
  // Fallback de seguridad
  return numeral;
}

// ============================================================
// v14.0 — Descubrimiento Diatónico de Acordes
// ============================================================

/**
 * Interfaz de resultado del descubrimiento diatónico.
 */
export interface DiatonicChordResult {
  /** Tipo de acorde detectado (clave de CHORD_TYPES) */
  chordTypeKey: string;
  /** Acorde construido completo */
  chord: Chord;
  /** Grado diatónico de la nota clickeada (1-7 para heptatónicas) */
  diatonicDegree: number;
  /** Símbolo del grado romano (I, ii, iii, IV, V, vi, viiº) */
  degreeSymbol: string;
  /** Índices cromáticos de las notas del acorde */
  chordNoteIndices: number[];
}

/**
 * Descubre el tipo de acorde diatónico al hacer clic en una nota de la escala.
 *
 * Algoritmo de "apilar terceras diatónicas":
 * 1. Obtener el array de notas de la escala actual.
 * 2. Encontrar el índice diatónico (grado) de la nota clickeada.
 * 3. Apilar terceras diatónicas: saltar una nota en la escala para la 3ra,
 *    saltar otra para la 5ta (y otra para la 7ma si is7thMode es true).
 *    Módulo scale.length para dar la vuelta a la escala.
 * 4. Calcular los intervalos absolutos de esas notas respecto a la raíz del acorde.
 * 5. Pasar esos intervalos a detectChordName() para descubrir qué acorde es.
 * 6. Retornar el chordTypeKey y construir el acorde completo.
 *
 * Si la nota clickeada NO pertenece a la escala, retorna null.
 *
 * @param scaleRootIndex - Índice cromático de la raíz de la escala (0-11)
 * @param scaleName - Nombre de la escala (ej: "Major (Ionian)")
 * @param clickedNoteIndex - Índice cromático de la nota clickeada (0-11)
 * @param is7thMode - Si true, construye cuatríada; si false, tríada
 * @param selectedRootName - Nombre visual de la raíz de la escala (para enharmonía)
 * @returns DiatonicChordResult o null si la nota no pertenece a la escala
 *
 * Ejemplo:
 * // En C Major, clic en D (índice 2) → { chordTypeKey: "Minor", degreeSymbol: "ii", ... }
 * getDiatonicChordFromScale(0, "Major (Ionian)", 2, false)
 * // Notas diatónicas: D(2), F(4), A(9) → intervalos [0,3,7] → "Minor"
 */
export function getDiatonicChordFromScale(
  scaleRootIndex: number,
  scaleName: string,
  clickedNoteIndex: number,
  is7thMode: boolean,
  selectedRootName?: string
): DiatonicChordResult | null {
  // 1. Obtener los índices cromáticos de la escala
  const scaleIndices = getScaleIndices(scaleRootIndex, scaleName as any);
  
  // 2. Verificar que la nota clickeada pertenece a la escala
  const clickedDegree = scaleIndices.indexOf(clickedNoteIndex);
  if (clickedDegree === -1) {
    return null; // Nota fuera de la escala
  }
  
  // 3. Apilar terceras diatónicas
  // Para tríada: grados 0, 2, 4 (relativos al clickeado)
  // Para cuatríada: grados 0, 2, 4, 6
  const chordDegrees = is7thMode ? [0, 2, 4, 6] : [0, 2, 4];
  const chordScaleIndices: number[] = [];
  
  for (const offset of chordDegrees) {
    const degreeIndex = (clickedDegree + offset) % scaleIndices.length;
    chordScaleIndices.push(scaleIndices[degreeIndex]);
  }
  
  // 4. Calcular los intervalos absolutos respecto a la raíz del acorde (nota clickeada)
  const rootIndex = clickedNoteIndex;
  const intervals: number[] = chordScaleIndices.map((idx) => {
    let interval = (idx - rootIndex) % 12;
    if (interval < 0) interval += 12;
    return interval;
  });
  
  // 5. Detectar el tipo de acorde desde los intervalos
  const chordTypeKey = detectChordName(intervals);
  if (!chordTypeKey) {
    return null; // No se pudo detectar (nota fuera de la escala o acorde no soportado)
  }
  
  // ✅ v15.0: selectedRootName es contexto enarmónico de la ESCALA, no del acorde
  // Obtener nombre visual de la nota clickeada (raíz del acorde)
  const chordRootName = resolveEnharmonicName(scaleName, rootIndex, scaleRootIndex, selectedRootName);
  
  // 6. Construir el acorde completo (pasar scaleName + scaleRootIndex + scaleRootName para contexto enarmónico correcto)
  const chord = buildChord(rootIndex, chordTypeKey, chordRootName, scaleName, scaleRootIndex, selectedRootName);
  
  // 7. Calcular el grado diatónico y símbolo romano
  const diatonicDegree = clickedDegree + 1; // 1-based
  const degreeSymbol = getDiatonicDegreeSymbol(clickedDegree, chordTypeKey);
  
  return {
    chordTypeKey,
    chord,
    diatonicDegree,
    degreeSymbol,
    chordNoteIndices: chordScaleIndices,
  };
}

// ============================================================
// Información Expandida de Escalas — v9.8
// ============================================================
// Datos teóricos adicionales para cada escala musical.
// Se muestra en un acordeón desplegable en la UI cuando hay escala seleccionada.
// Estructura extensible: todas las escalas pueden tener entrada, null = sin info expandida.

/**
 * Interfaz para información expandida de una escala.
 */
export interface ScaleExtendedInfo {
  /** Contexto histórico — origen, compositor, obra famosa asociada */
  context: string;
  /** Grados funcionales (nombres desde la Tónica) */
  degrees: string[];
  /** Relaciones con otros modos/escalas */
  relations: string;
}

/**
 * Diccionario de información expandida para todas las escalas.
 *
 * Secciones por escala:
 * - **context**: Contexto Histórico — origen, compositor, obra famosa
 * - **degrees**: Grados Funcionales — nombres (Tónica, 2da Mayor, #4, etc.)
 * - **relations**: Relaciones — conexión con otros modos/escalas
 *
 * v9.8: Prometheus completado. Otras escalas se alimentan progresivamente.
 */
export const SCALE_EXTENDED_INFO: Record<ScaleName, ScaleExtendedInfo | null> = {
  // === DIATÓNICAS BASE ===
  "Major (Ionian)": {
    context: "Es la base absoluta de la música occidental desde el Renacimiento. Fue formalizada teóricamente por Heinrich Glareanus en 1547. Representa la luz, la estabilidad y la resolución en la armonía clásica.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Mayor"],
    relations: "Es el 1er modo de la escala diatónica. Su relativo menor es el modo Eólico (6to grado)."
  },
  "Minor (Aeolian)": {
    context: "El pilar de la tonalidad menor moderna. Se originó en los cantos gregorianos medievales. Culturalmente se asocia con la melancolía, la introspección y el drama.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Menor (b7)"],
    relations: "Es el 6to modo de la escala Mayor. Sirve como molde base para variaciones como la Menor Armónica y Melódica."
  },
  "Harmonic Minor": {
    context: "Surgió en la era Barroca (s. XVII). Los compositores necesitaban un acorde de Dominante Mayor (V) que resolviera fuertemente a la tónica menor (i), por lo que elevaron artificialmente el 7mo grado para crear tensión.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Mayor (Sensible)"],
    relations: "Derivada de la escala Menor Natural (Eólico) elevando la 7ma un semitono. Su 5to modo es la famosa Frigia Dominante."
  },
  "Melodic Minor": {
    context: "¿Recuerdas la menor armónica? Se crea elevando la séptima de la menor natural. Esto se hace para lograr una resolución más fuerte desde la séptima hasta la tónica y desde el acorde V hasta el I (ya que ahora el V es una acorde de 7ma dominante). El problema con la menor armónica es que esa séptima elevada deja una separación de tres semitonos por encima de la sexta (en G, esto sería de Eb a F#). Así que lo que pasó fue que los compositores y los teóricos de la música empezaron a elevar la sexta, para crear una línea melódica más suave. Esto nos da G A Bb C D E F#. Pero luego se dieron cuenta de que la resolución de F# a G sólo era relevante para las líneas ascendentes, así que para las líneas descendentes volvieron a la vieja escala menor natural (G A Bb C D E F). Es por esto que verás dos tipos de menor melódica en los libros de teoría. Hoy en día, por lo general verás sólo la porción ascendente, que es una fuente habitual de estupendos modos para jazz.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Mayor"],
    relations: "Es la escala de los compositores; combina la dulzura mayor con la profundidad menor para líneas fluidas. La porción ascendente es una fuente habitual de estupendos modos para jazz. Los dos modos más comunes son el Lidio Dominante (4to modo) y el Superlocrio/Altered (7mo modo). También genera la Harmonic Minor como 6to modo descendente. Forma su 'tradicional forma esquizofrénica': porción ascendente con 6ta mayor y 7ma mayor, porción descendente igual a la menor natural (modo Eólico). Ejemplo: The Beatles — Help! (1965)."
  },
  "Harmonic Major": {
    context: "No, no es un error... ésta es la armónica MAYOR, no menor. Las dos escalas son muy similares y ambas comparten la combinación de una 7ma mayor y una 6ta menor. La única diferencia es que la armónica mayor tiene una 3ra mayor en lugar de una 3ra menor. La naturaleza mayor/menor de la 3ra es crucial, no obstante, y la armónica mayor es en realidad una pariente cercana de la escala mayor estándar, con la que también comparte seis de sus siete notas. Aunque la escala suena exótica cuando se toca 'de principio a fin', no resulta difícil conseguir de ella algunos sonidos relativamente 'normales'.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Mayor"],
    relations: "Es como la escala mayor normal pero con la 6ta nota bajada un semitono. Como la escala normal de C mayor, contiene los acordes de C mayor y G mayor (y G7). El acorde IV es un F menor en lugar del habitual F mayor, pero ése no es un sonido absolutamente desconocido... muchas canciones de los Beatles sustituyen el acorde IV habitual con un IVm para lograr un momento de tensión. Puede lograr un estupendo y jazzero ii-V-I, usando Dm7b5, G7b9 y Cmaj7, utilizando notas de C armónica mayor. Ejemplo: Radiohead — No Surprises, OK Computer (1997). Una manera de experimentar con la escala sería evitar el Ab al principio, ciñéndose a los sonidos habituales de C mayor. Luego introduce gradualmente el Ab y escucha el efecto que crea."
  },

  // === MODOS GRIEGOS ===
  "Dórico (Dorian)": {
    context: "Un modo de la antigua Grecia, muy utilizado en cantos gregorianos. En la música moderna es vital en el Folk celta, el Funk y el Jazz Modal (inmortalizado por Miles Davis en 'So What').",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Menor (b7)"],
    relations: "Es el 2do modo de la Escala Mayor. Suena a escala menor, pero su 6ta Mayor le quita oscuridad, haciéndolo muy versátil y 'jazzy'."
  },
  "Frigio (Phrygian)": {
    context: "Modo medieval fuertemente arraigado en la música flamenca, andaluza y medio-oriental. Crea una atmósfera oscura y tensa desde el primer instante gracias a su segundo grado rebajado.",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Menor (b7)"],
    relations: "Es el 3er modo de la Escala Mayor. Se diferencia del Eólico exclusivamente por su segunda menor (b2)."
  },
  "Lidio (Lydian)": {
    context: "Ampliamente utilizado en el Impresionismo (Claude Debussy), bandas sonoras de cine (John Williams) y Jazz Contemporáneo. El teórico George Russell lo definió como el modo acústicamente más estable en su 'Concepto Lidio Cromático'.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Aumentada (#4)", "5ta Justa", "6ta Mayor", "7ma Mayor"],
    relations: "Es el 4to modo de la Escala Mayor. Comparte todas las notas con la escala Mayor salvo su brillante e ingráfica 4ta aumentada."
  },
  "Mixolidio (Mixolydian)": {
    context: "A pesar del nombre, el modo Mixolidio no es en realidad tan exótico; es habitual en el rock, el blues y el jazz. No obstante, desde el punto de vista de la teoría tradicional mayor/menor, tiene un par de pequeñas peculiaridades, y una vez fue el primer puerto de escala para los músicos de rock que buscaban algo un poco exótico. Al igual que en todas las escalas modales, hay dos maneras de ver el modo Mixolidio. Usando el enfoque relativo, se puede construir a partir de la quinta nota de una escala mayor. Con el enfoque paralelo, se diferencia de su escala mayor paralela sólo en una nota — la séptima mayor se baja hasta una séptima menor.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Menor"],
    relations: "Es el 5to modo de la escala mayor. Por ejemplo, Mixolidio en E se construye a partir de la nota B de la escala de A mayor (A B C# D E F# G# → E F# G# A B C# D). Esa séptima menor es importante, creando un intervalo de tritono con la tercera (disonancia entre dos notas importantes), lo que supone que hay un arpegio de séptima dominante (E G# B D) construido sobre la tónica y, por tanto, la escala funciona a la perfección sobre los acordes dominantes (E7, E9, E11 y similares). Ejemplo: The Beatles — Tomorrow (1966), Revolver."
  },
  "Locrio (Locrian)": {
    context: "El modo más inestable y temido de la antigüedad clásica por contener el 'Diabolus in Musica' (el tritono) directamente en su acorde de tónica. Rara vez se usa como centro tonal estable.",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Menor", "4ta Justa", "5ta Disminuida (b5)", "6ta Menor (b6)", "7ma Menor (b7)"],
    relations: "Es el 7mo modo de la Escala Mayor. Se utiliza principalmente para improvisar sobre acordes semidisminuidos (m7b5)."
  },

  // === PENTATÓNICAS Y BLUES ===
  "Major Pentatonic": {
    context: "Posiblemente la escala más antigua de la humanidad (encontrada en flautas de hueso prehistóricas). Es universal y amigable, fundamento de la música folclórica en Asia, África y América.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "5ta Justa", "6ta Mayor"],
    relations: "Es anhemitónica (no contiene semitonos). Se deriva de la Escala Mayor omitiendo los grados 4 y 7, eliminando así toda disonancia."
  },
  "Minor Pentatonic": {
    context: "El esqueleto sagrado del Blues, el Rock y el Gospel. Su origen es una hibridación entre las afinaciones de los esclavos de África occidental y los instrumentos temperados europeos en América.",
    degrees: ["Tónica", "3ra Menor", "4ta Justa", "5ta Justa", "7ma Menor (b7)"],
    relations: "Es la relativa menor de la Pentatónica Mayor (inicia en su 6to grado). Es la base estructural para la Escala de Blues."
  },
  "Suspended Pentatonic": {
    context: "Aunque proviene del folclore asiático, fue reinventada en occidente por leyendas del Jazz Modal como McCoy Tyner y John Coltrane para crear muros de sonido sin definir mayor o menor.",
    degrees: ["Tónica", "2da Mayor", "4ta Justa", "5ta Justa", "7ma Menor (b7)"],
    relations: "Es el 2do modo de la Pentatónica Mayor. Al carecer de tercera (mayor o menor), genera una sensación suspendida (sus4)."
  },
  "Minor Blues": {
    context: "Nacida a finales del siglo XIX en el delta del Mississippi. Intentaba simular los cuartos de tono africanos (microtonalidad) añadiendo disonancias cromáticas sobre guitarras occidentales.",
    degrees: ["Tónica", "3ra Menor", "4ta Justa", "5ta Disminuida (Blue Note)", "5ta Justa", "7ma Menor (b7)"],
    relations: "Es la Pentatónica Menor con el añadido del tritono (b5 / #4), la famosa 'Blue Note' que aporta dolor, tensión y lamento."
  },
  "Major Blues": {
    context: "Estamos de vuelta en esa zona algo gris donde las escalas se presentan bajo diversas formas, con diferentes nombres y sin un estatus 'oficial' en los polvorientos anales de la teoría musical. La escala de blues vive dentro de esta categoría; no hay una definición oficialmente acordada, pero la mayoría considera que es una escala pentatónica mayor con una tercera menor añadida como nota de paso (también conocida como Country Blues). Ejemplo famoso: The Allman Brothers Band — 'Stormy' (Monday Live, 1971).",
    degrees: ["Tónica", "2da Mayor", "3ra Menor (blue note)", "3ra Mayor", "5ta Justa", "6ta Mayor"],
    relations: "Se obtiene tomando la pentatónica mayor y añadiendo la tercera menor como nota de paso. Funciona exactamente igual con la escala blues — baja tres trastes y obtendrás la escala country blues. Usa la escala resultante como harías con la pentatónica mayor, pero mantén esa tercera menor añadida para agregar una tensión blusera más oscura a tus frases."
  },
  "Dominant Pentatonic": {
    context: "La pentatónica menor elevada en su tercera (en A: A C# D E G) contiene un acorde de séptima dominante, de ahí el nombre. La pentatónica dominante comparte estos requisitos con la tercera mayor y la séptima menor, pero presenta un patrón de notas diferente: A B C# E G. Ese arpegio A7 permanece intacto (A C# E G), aunque la forma general de la escala se acerca más a la pentatónica mayor; la única diferencia reside en que la sexta (F#) se eleva hasta la séptima menor (G).",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "5ta Justa", "7ma Menor"],
    relations: "Encontramos que la otra pentatónica dominante está bien, pero no tiene un contorno melódico tan suave como ésta. Puede que encuentres que está más versátil para la improvisación general. El contexto obvio para usar esta escala es cualquier lugar en el que normalmente podrías tocar el modo Mixolidio (A B C# D E F# G), que contiene las notas de ambas escalas pentatónicas dominantes. Con la escala mixolidia y ambas pentatónicas, ¡tendrás abundantes opciones para solear sobre ambos acordes dominantes y sobre las tonalidades mixolidias! Curiosamente, las notas de la escala pentatónica dominante también deletrean un arpegio A9. Ejemplo: Roy Orbison — Orbisongs (1965)."
  },

  // === JAZZ / BEBOP ===
  "Bebop Dominant": {
    context: "Inventada empíricamente en los años 40 por pioneros como Charlie Parker y Dizzy Gillespie. Fue diseñada rítmicamente para que los tonos del acorde cayeran siempre en los tiempos fuertes al tocar en corcheas.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Menor (b7)", "7ma Mayor (Paso)"],
    relations: "Es una escala octatónica (8 notas). Básicamente es una escala Mixolidia con una nota de paso cromática entre la séptima menor y la tónica."
  },
  "Bebop Major": {
    context: "Desarrollada durante el apogeo del Jazz para crear líneas melódicas ininterrumpidas (swinging lines) sobre acordes de tónica (Maj7 y Maj6) sin perder la sincronía rítmica.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Menor (Paso)", "6ta Mayor", "7ma Mayor"],
    relations: "Es una escala Mayor (Jónica) con el añadido cromático de una 5ta aumentada o 6ta menor (b6) como nota de paso."
  },
  "Bebop Dorian": {
    context: "La herramienta rítmica perfecta para navegar las progresiones de acordes menores séptima (m7) y los ii-V-I en el repertorio clásico del Jazz y el Hard Bop.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "3ra Mayor (Paso)", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Menor (b7)"],
    relations: "Es una escala Dórica con una nota cromática de paso intercalada (la tercera mayor) entre la 3ra menor y la 4ta."
  },

  // === MODOS DE JAZZ ===
  "Lydian Dominant (Acoustic)": {
    context: "También llamada 'Escala Acústica' porque sus notas se aproximan matemáticamente a la serie armónica natural (los armónicos 8 a 14 de la física del sonido). Fue venerada por Bartók y Debussy.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Aumentada (#4)", "5ta Justa", "6ta Mayor", "7ma Menor (b7)"],
    relations: "Es el 4to modo de la Menor Melódica. Fusiona el brillo del modo Lidio (#4) con el empuje del modo Mixolidio (b7)."
  },
  "Lydian Augmented": {
    context: "La Lidia Aumentada es el tercer modo de la escala melódica menor (sólo la versión ascendente). Con su combinación de tercera menor — como ya supondrás — con una sexta mayor y una séptima mayor, la melódica menor conduce a ciertos modos de sonido inusual, y el Lidio Aumentado no es una excepción. Las notas 'características' son la cuarta aumentada y la quinta aumentada. La #4 crea el sonido Lidio en combinación con la tercera mayor y la séptima mayor, y esta escala es muy parecida a la Lidia normal.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Aumentada (#4)", "5ta Aumentada (#5)", "6ta Mayor", "7ma Mayor"],
    relations: "Es el 3er modo de la Menor Melódica (versión ascendente). Comparte las mismas notas pero con centro tonal diferente. La diferencia fundamental con la escala Lidia normal es la quinta aumentada; ésta ofrece montones de tensión, ya que la quinta normalmente estabiliza el sonido de un acorde (tanto los acordes mayores como los menores usan una quinta justa) así que una #5 es bastante perturbadora (como lo es una b5). La triada aumentada (tónica, tercera mayor, #5) en el corazón de esta escala crea un sonido único, pero también causa problemas respecto a sus usos prácticos. Los acordes aumentados están llenos de tensión, así que tendemos a no usarlos durante mucho tiempo. ¡Claramente es una escala para los momentos especiales del tipo: 'quiero que me despidan de esta banda'! Ejemplo: Steve Vai — Passion And Warfare."
  },
  "Locrian #2 (Half-Diminished)": {
    context: "El Eólico b5 es el sexto modo de la melódica menor. Es como la E eólica normal (E F# G A B C D) pero con la quinta nota bajada hasta Bb — sencillo! Para complicar un poco las cosas, esta escala tiene un nombre alternativo — la locria con segunda natural. Como el nombre sugiere, es como E locria (E F G A Bb C D), pero con la segunda menor elevada a segunda natural o mayor (F#).",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Disminuida (b5)", "6ta Menor", "7ma Menor"],
    relations: "Es el 6to modo de la Menor Melódica. Comparte las mismas notas pero con centro tonal diferente. Funciona muy bien sobre acordes menores con b5, como una alternativa al modo Locrio más obvio. Para lograr un efecto completo evita la quinta justa (B) en cualquiera de los acordes de acompañamiento."
  },
  "Mixolydia b6": {
    context: "También conocida como escala Hindú — nombre cuyo carácter exótico carece de base real en la tradición musical india — esta escala se describe más apropiadamente por su estructura: un modo Mixolidio con sexta menor. El modo Mixolidio deriva de la escala mayor alterando únicamente la séptima menor, situándose a dos notas de distancia del modo Jónico. La combinación de séptima menor con sexta menor podría sugerir paralelismos con el modo Eólico (menor natural) o Frigio, pero se trata de una similitud superficial: la tercera mayor confirma que esta escala conserva su naturaleza tonal mayor.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Menor"],
    relations: "Es el quinto modo de la menor melódica. Mixolidia b6 contiene las mismas notas que la G menor melódica, pero con el centro tonal desplazado a D en lugar de G. Es una de las menos comunes de las escalas dominantes alteradas, ya que no se ven muchos acordes b6/b13 (7#5 es mucho más habitual, usando el modo Superlocrio). Uno de sus mejores usos es sobre una progresión I-IVm (D-Gm), que ofrece un gran sonido de Bossa/Samba. Ejemplo: Space — Female Of The Species (1996)."
  },
  "Altered (Super Locrian)": {
    context: "La Superlocria es una de las escalas más importantes en jazz pero, incluso si no te consideras un intérprete de jazz como tal, aun así merece la pena explorar la Superlocria. Usada en los sitios adecuados, su sonido sofisticado puede añadir un auténtico 'factor guau' a tu interpretación. De acuerdo, vamos con un poco de ciencia: el Superlocrio es el séptimo modo de la escala melódica menor. Así pues, con el objeto de construir la escala E Superlocria, podemos usar las notas de F melódica menor (F G Ab Bb C D E) convirtiendo a E en el centro tonal.",
    degrees: ["Tónica", "2da Menor (b9)", "3ra Menor (#9)", "3ra Mayor (4ta disminuida)", "4ta Aumentada (#11/b5)", "5ta Justa (11)", "6ta Menor (b13)", "7ma Menor (b7)"],
    relations: "Con su tercera menor, una quinta disminuida y una séptima menor, la Superlocria es muy similar a una Locria normal. No obstante, la nota crucial es el Ab (descrita como cuarta disminuida, pero básicamente es una tercera mayor disfrazada). Atisbando detrás de las máscaras de otro par de notas, resulta que la Superlocria contiene las notas vitales de todos los acordes 'alterados' de 7 dominante — b9, 7#9, 7b5 y 7#5. Ése es el motivo por el que es tan útil en jazz — ¡es perfecta para tocar sobre los acordes alterados! De hecho, la Superlocria es llamada a veces la escala Alterada por esta misma razón. Ejemplo: Gino Vanelli — 'Brother To Brother' (1978)."
  },

  // === EXÓTICAS Y DEL MUNDO ===
  "Phrygian Dominant": {
    context: "Es el alma y motor de la música Flamenca, la música Klezmer judía y la tradición medio-oriental. En occidente es muy utilizada en el metal neoclásico (ej. Yngwie Malmsteen).",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Menor (b7)"],
    relations: "Es el 5to modo de la Menor Armónica. Su característico intervalo de segunda aumentada (entre b2 y 3) define todo su sonido exótico."
  },
  "Double Harmonic (Byzantine)": {
    context: "También conocida como escala bizantina o armónica doble. Es un modo de la Menor Húngara — toma las mismas notas pero con centro tonal diferente (3er grado). Ejemplo famoso: 'Miserlou' de Dick Dale (1962).",
    degrees: ["Tónica", "2da Menor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Menor", "7ma Aumentada (#7)"],
    relations: "Es el 3er modo de la Menor Húngara (Hungarian Minor). Comparte las mismas notas pero con centro tonal diferente."
  },
  "Hungarian Minor": {
    context: "La Húngara Menor evoca las sonoridades de Europa del Este con ese aire único que caracteriza a artistas como Márta Sebestyén, reconocida entre los mejores exponentes de la música tradicional oriental europea. Sus melodías revelan tensiones inesperadas y un timbre casi oriental presente en muchas de sus composiciones — frecuentemente derivado del uso de esta escala. Es esencialmente una armónica menor con cuarta aumentada (#4). La combinación de #4 con séptima mayor recuerda al modo Lidio, aunque inserta en el contexto tonal menor.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Aumentada (#4)", "5ta Justa", "6ta Menor (b6)", "7ma Mayor"],
    relations: "También hay una parte con dos intervalos de semitono consecutivos (F#-G-Ab), lo que resulta muy inusual para el oído occidental. Como acompañamiento simple sobre el que improvisar, prueba a arpegiar constantemente un acorde de Cm, pero reemplaza periódicamente la nota G por Ab y luego por F#. Ejemplo famoso: Joe Satriani — Musterion, Professor Satchafunkilus (2008)."
  },
  "Dórica #4": {
    context: "Se presenta habitualmente como el cuarto modo de la menor armónica. Es como D Dórico pero con la 4ta elevada a G#. También es conocida como la Dórica ucraniana, y se encuentra en la música religiosa tanto klezmer como judía. En el uso religioso es conocida como Mi Scheberach. Tiene actividad colateral como la Maqam Nakriz en la música árabe (maqam = modo). Ejemplo famoso: 'Gnossienne 1' de Erik Satie (1890), 'Sweet Maria' de Bert Kaempfert, y varios solos de prog-metal.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Aumentada (#4)", "5ta Justa", "6ta Mayor", "7ma Menor"],
    relations: "Es el 4to modo de la Harmonic Minor. Comparte las mismas notas pero con centro tonal diferente. También se conoce como Dórica ucraniana. En música klezmer y judía tiene uso religioso (Mi Scheberach). En música árabe equivale a Maqam Nakriz."
  },
  "Hungarian Major": {
    context: "Pese a su nombre, muchos etnomusicólogos trazan sus raíces hasta los sistemas Raga del norte de India. En occidente, compositores como Franz Liszt y Zoltán Kodály la integraron a la música clásica para evocar folclore romaní.",
    degrees: ["Tónica", "2da Aumentada (#2)", "3ra Mayor", "4ta Aumentada (#4)", "5ta Justa", "6ta Mayor", "7ma Menor (b7)"],
    relations: "Se puede percibir como una Lidia Dominante pero con la 2da alterada al alza (#2). Es altamente cromática e inestable."
  },
  "Hirajoshi": {
    context: "Escala tradicional japonesa. Fue adaptada de las afinaciones del shamisen al koto por el maestro ciego Yatsuhashi Kengyō en el siglo XVII (Periodo Edo). Originalmente una afinación, hoy es una escala melódica global.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "5ta Justa", "6ta Menor (b6)"],
    relations: "Pentatónica hemitónica (contiene semitonos). Comparte matemáticamente sus intervalos con los grados 1, 2, b3, 5 y b6 del modo Eólico occidental."
  },
  "Insen": {
    context: "Una escala tradicional de Japón vinculada al repertorio de Koto del periodo Edo. Tiene un carácter mucho más introspectivo, nocturno y melancólico que la Hirajoshi.",
    degrees: ["Tónica", "2da Menor (b2)", "4ta Justa", "5ta Justa", "7ma Menor (b7)"],
    relations: "Hereda su estructura intervalar de los grados de la escala Frigia, omitiendo por completo la 3ra y la 6ta para generar ambigüedad armónica."
  },
  "In": {
    context: "La escala In viene de Japón y se usa habitualmente en la música para koto y shamisen. Es un modo de la Hirajoshi — la Hirajoshi en A usa las mismas notas que la In en E, si bien con el énfasis desplazado a una nota tónica diferente. Una característica notable es la falta de una tercera; la escala no es mayor ni menor.",
    degrees: ["Tónica", "2da Menor", "4ta Justa", "5ta Justa", "6ta Menor"],
    relations: "Una de las formas más fáciles de escuchar la escala en acción está en la vieja canción folk japonesa Sakura, que celebra el florecimiento de los cerezos. Su melodía calmada y humilde ejemplifica el minimalismo tipo zen inspirado por los intervalos de la escala. Si quiere aumentar la variedad, puede añadir las notas G y D para crear el modo Frigio, o elevar el G a G# para crear el Frigio Dominante. Ejemplo: Bon Jovi — Tokyo Road, 7800 Fahrenheit (1985)."
  },
  "Neapolitan Minor": {
    context: "Toma su nombre de la Escuela Napolitana de ópera italiana del siglo XVIII (Scarlatti). Se asocia fuertemente con el 'Acorde Napolitano', un recurso de extrema intensidad emocional en la música clásica.",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Menor (b6)", "7ma Mayor"],
    relations: "Es idéntica a la Menor Armónica, pero con el segundo grado rebajado (b2). Genera un dramatismo inmenso gracias a la distancia tonal hacia su sensible (7)."
  },
  "Neapolitan Major": {
    context: "Esta es extraña. Olvídate de los barqueros de piel morena cantando O Sole Mio, ¡porque esta suena más a Oriente Medio que a Italia! La napolitana Mayor en C se muestra como C Db Eb F G A B. La primera sorpresa está en el nombre... en la terminología normal de las escalas, esperarías que una escala mayor tuviera una tercera mayor (cuatro semitonos por encima de la tónica) pero la napolitana mayor tiene una tercera menor. La clave está en la napolitana menor, que tiene una sexta menor (Ab en lugar de A). En cualquier caso, la napolitana mayor es como una mezcla de la Frigia y la melódica menor. Las únicas tríadas mayor y menor normales se construyen sobre la tónica (C menor) y la cuarta (F mayor) y puedes ampliar el acorde de tónica a Cm/maj7. La escala es también palindrómica... tiene el mismo patrón de intervalos subiendo y bajando.",
    degrees: ["Tónica", "2da Menor", "3ra Menor", "4ta Justa", "5ta Justa", "6ta Mayor", "7ma Mayor"],
    relations: "En su apogeo durante el Siglo XIX, el concepto de 'napolitana' en realidad no se refería a una escala en el sentido modal. Se trataba más bien del resultado global de introducir un acorde bII (Db en nuestra escala basada en C) en una tonalidad mayor ya existente. El acorde de sexta napolitana funciona según el mismo principio. Ejemplo: Quinteto de cuerda en C mayor (segundo movimiento) de Franz Schubert (1828). Un clásico ejemplo romántico del sonido bII napolitano."
  },
  "Persian": {
    context: "Una construcción exótica que fusiona elementos del maqam árabe. Es famosa por tener múltiples intervalos de segunda aumentada, evocando imágenes de danzas serpenteantes y laberintos orientales.",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Mayor", "4ta Justa", "5ta Disminuida (b5)", "6ta Menor (b6)", "7ma Mayor"],
    relations: "Extremadamente tensa; colapsa elementos del modo Locrio y la Menor Armónica, forzando múltiples enarmonías para encajar en el sistema occidental de 12 tonos."
  },
  "Enigmatic": {
      context: "Ésta es una escala muy extraña. Según los libros de historia, fue creada para un desafío impreso en la Gazzetta Musicale de Milán. ¿Puede alguien usar esta escala sintética para componer una pieza musical? Giuseppe Verdi superó el desafío usándola para su Ave María de Quattro Pezzi Sacri (Cuatro Temas Sacros), y cerca de 100 años después, nuestro viejo amigo Joe Satriani la utilizó para The Enigmatist de su disco de debut Not Of This Earth (1986).",
      degrees: ["Tónica", "2da Menor", "3ra Mayor", "4ta Aumentada (#4)", "5ta Aumentada (#5)", "6ta Doble Aumentada (x)", "7ma Mayor"],
      relations: "Es una especie de escala mayor, pero con la cuarta, quinta y sexta aumentadas. Junto con la segunda menor, tienes tres intervalos de semitono consecutivos que crean una tensión inestable. Nunca se asienta, así que puedes usarla como hace Satch; hacer muy obvia la tónica como nota de bajo contante."
    },

  // === SIMÉTRICAS Y HEXATÓNICAS ===
  "Whole Tone": {
    context: "La escala bandera del Impresionismo (fines del s. XIX), inmortalizada por Claude Debussy. Fue diseñada para destruir la percepción de tonalidad y gravedad, evocando sueños, agua y magia.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Aumentada (#4)", "5ta Aumentada (#5)", "7ma Menor (b7)"],
    relations: "Hexatónica simétrica. Todos sus saltos son de 1 tono (2 semitonos). Al no tener semitonos, no tiene nota de resolución, flotando armónicamente de forma eterna."
  },
  "Diminished Half-Whole": {
    context: "Desarrollada inicialmente a fines del s. XIX (Rimsky-Korsakov, Stravinsky) y llevada a la gloria por el Jazz Moderno. Es el lenguaje supremo para improvisar líneas misteriosas sobre dominantes alterados.",
    degrees: ["Tónica", "2da Menor (b9)", "3ra Menor (#9)", "3ra Mayor", "4ta Aumentada (#11)", "5ta Justa", "6ta Mayor (13)", "7ma Menor (b7)"],
    relations: "Octatónica simétrica. Su magia radica en que agrupa perfectamente un acorde dominante base (1, 3, 5, b7) con las 4 tensiones de jazz (b9, #9, #11, 13)."
  },
  "Diminished Whole-Half": {
    context: "El reverso de la escala disminuida dominante. Es el recurso más utilizado en composiciones neoclásicas, películas de terror clásico y jazz para navegar por la disonancia pura de los acordes disminuidos.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Justa", "5ta Disminuida (b5)", "6ta Menor (b6)", "6ta Mayor (bb7)", "7ma Mayor"],
    relations: "Se forma entrelazando lógicamente dos acordes de séptima disminuida (dim7) separados por un tono completo."
  },
  "Tritone Scale": {
    context: "Documentada en 1947 por Nicolas Slonimsky en su obra 'Thesaurus of Scales'. Es el epítome de la simetría matemática y está íntimamente relacionada con el famoso 'Acorde Petrushka' de Ígor Stravinsky.",
    degrees: ["Tónica", "2da Menor (b2)", "3ra Mayor", "4ta Aumentada (#4)", "5ta Justa", "7ma Menor (b7)"],
    relations: "Hexatónica (6 notas) doble-simétrica. Nace de la fusión geométrica perfecta entre dos tríadas mayores separadas por un tritono (ej. C Mayor y F# Mayor)."
  },
  "Augmented": {
    context: "Una escala simétrica formada por dos tríadas aumentadas entrelazadas. El término 'aumentado' significa que un intervalo ha sido elevado en un semitono. Ejemplo famoso: 'A Faust Symphony' de Franz Liszt (1857).",
    degrees: ["Tónica", "3ra Menor", "3ra Mayor", "5ta Justa", "5ta Aumentada (#5)", "7ma Mayor"],
    relations: "Puede discurrir sobre acordes mayores, maj7 y dominantes 7(#5). Se trabaja con las dos tríadas aumentadas que contiene (ej. Caug y Ebaug en C). Su estructura simétrica se repite cada 3 semitonos."
  },

  // === PROMETHEUS — Información completa v9.8 ===
  "Prometheus": {
    context: "La escala Prometheus está relacionada con el compositor ruso Alexander Scriabin y su obra 'Prometeo: El Poema del Fuego' (1910). En realidad Scriabin no la llamó Escala Prometheus; se refería a ella como el Acorde de Pleroma, un concepto de divinidad absoluta en el Gnosticismo. La usó tanto como un acorde (fuente de acordes) y como una escala para propósitos melódicos.",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Aumentada (#4)", "6ta Mayor", "7ma Menor"],
    relations: "Está estrechamente relacionada con la Lidia Dominante (4to modo de la menor melódica), que es exactamente la misma escala pero con la 5ta justa añadida. La Prometheus tiene todas las mismas notas 'de sabor', con la combinación de una séptima menor y una cuarta aumentada impulsando su sonido misterioso."
  },

  // === HEXATÓNICAS FOLK — Adrian Clark v10.7 ===
  "Major Hexatonic (7a omitida)": {
    context: "Estamos viendo un concepto general de escalas hexátonas 'con huecos'. Una escala hexátona contiene seis notas. Las escalas hexátonas son muy comunes en la música folk tradicional escocesa e irlandesa, y funcionan como una escala mayor con la nota séptima omitida. Ejemplo: The Blarney Pilgrim y Haste To The Wedding (canciones tradicionales).",
    degrees: ["Tónica", "2da Mayor", "3ra Mayor", "4ta Justa", "5ta Justa", "6ta Mayor"],
    relations: "Se obtiene tomando la escala mayor y omitiendo la séptima nota. Funciona tanto para progresiones mayores como mixolidias, creando un sonido abierto y misterioso."
  },
  "Lydian Hexatonic (4a omitida)": {
    context: "Las escalas hexátonas 'con huecos' pueden ser una fuente de inspiración. Eliminar la cuarta ausente está un poco en una zona gris musical, pero no es muy diferente de la familiar pentatónica menor — ¿es una escala distinta o un tratamiento selectivo del modo Dórico? La séptima omitida se puede usar tanto para progresiones mayores como mixolidias, y la eliminación de la cuarta desdibuja la distinción entre mayor y Lidia. Ejemplo: The Blarney Pilgrim y Haste To The Wedding (canciones tradicionales).",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "4ta Aumentada (#4)", "5ta Aumentada (#5)", "6ta Menor"],
    relations: "Se obtiene tomando la escala lidia y omitiendo la cuarta nota. Como alternativa a cambiar de escala en mitad del solo, busca una única escala que funciona durante todo el recorrido. Crea un toque de misterio melódico."
  },

  // === OKINAWAN SCALE — Adrian Clark v10.16 ===
  "Okinawan": {
    context: "Okinawa es una de las islas Ryukyu en el sur del Japón. En Occidente es probablemente más conocida como una (controvertida) base militar americana durante mucho tiempo, desde la rendición de los japoneses en 1945. Aunque es parte de Japón, Okinawa tiene su propia cultura musical diferenciada, con sus propias versiones únicas tanto de las canciones folk tradicionales como de la música pop. Esta escala pentatónica mayor, al contrario que nuestra pentatónica mayor habitual (un componente importante de la música Maitland japonesa), tiene intervalos de semitono, ofreciendo un sonido completamente diferente.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "5ta Justa", "6ta Menor"],
    relations: "Una de las mejores maneras de escuchar esta escala es en la canción Haisai Ojisan (Hey Man), compuesta en 1972 por Shoukichi Kina, que se ha convertido en un gran embajador cultural de Okinawa, además de una gran estrella de la escena musical mundial y un activista político. Mucha gente ha hecho versiones de la canción, pero mi favorita personal es la de French Frith Kaiser Thompson, el supergrupo experimental de USA, con Richard Thompson cantando su mejor intento de la escala de Okinawa. De hecho, todo el mundo debería tener una copia de su primer disco, Live, Love, Larf & Loaf. Puedes pensar en ella como una escala mayor con notas perdidas, o como un arpegio de mayor 7 con una nota añadida."
  },

  // === PENTATÓNICA SEXTA MENOR — Adrian Clark "Escalas Exóticas" v10.19 ===
  "Minor Sixth Pentatonic": {
    context: "La pentatónica sexta menor — a veces referida como pentatónica dórica — ofrece una alternativa a las pentatónicas mayores y menores habituales, conservando su carácter melódico distintivo. Con la tónica en D (D F G A B), puede utilizarse en contextos donde normalmente emplearías la pentatónica menor estándar. En su estructura fundamental: es una pentatónica menor que sustituye la séptima menor (C) por una sexta mayor (B). La tercera menor (F) permanece presente, manteniendo el carácter tonal menor general, mientras que la sexta mayor imprime un timbre más dulce y luminoso.",
    degrees: ["Tónica", "2da Mayor", "3ra Menor", "5ta Justa", "6ta Mayor"],
    relations: "Un factor importante al añadir la sexta mayor es que crea un intervalo de tritono con la tercera menor (F-B). Eso añade un toque de condimento disonante, ¡no tengas miedo de explotarlo! Otro modo de verlo es que se trata de la equivalente pentatónica del modo Dórico, ya que contiene las dos notas vitales (tercera menor y sexta mayor) que dan al modo Dórico su sonido. Se puede obtener combinando las pentatónicas menor y mayor dentro de una tonalidad mayor (un enfoque clásico de blues). Ejemplo: Robben Ford — 'Wild About You / Talk To Your Daughter' (1988)."
  },

  // === RAGA DESH (ASCENDENTE) — Adrian Clark "Escalas Exóticas" v10.20 ===
  "Raga Desh (Ascendente)": {
    context: "En la música clásica de la India, las Ragas tienen reglas diferentes para subir (Arohana) y bajar (Avarohana). Aquí representamos su exótica subida pentatónica. La Raga Desh se asocia con las últimas horas antes de la media noche. Aparece en la canción nacional de India 'Vande Mataram' (AR Rahman, 1997), y también en el ballet 'Agon' de Stravinsky.",
    degrees: ["Tónica", "2da Mayor", "4ta Justa", "5ta Justa", "7ma Mayor"],
    relations: "Para tocar la Raga Desh completa, debes subir usando estas 5 notas (Arohana), y descender usando la escala Mixolidia (Avarohana), añadiendo la 3ra menor, la 6ta mayor y cambiando la 7ma mayor por menor. Muchas ragas tienen patrones diferentes para las melodías descendentes; para Desh, éste es el mismo que nuestro modo Mixolidio, por lo que tienes tanto la séptima mayor como la menor."
  }
};

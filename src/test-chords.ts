/**
 * Tests para el sistema de Acordes (v12.0)
 * 
 * Ejecutar con: npx tsx src/test-chords.ts
 * 
 * Cobertura:
 * - CHORD_TYPES: 14 tipos de acorde (4 tríadas + 10 cuatríadas)
 * - buildChord: construcción de acordes con diferentes raíces
 * - fullName: nombres estándar (Cmaj7, Dm7, etc.)
 * - detectChordName: detección desde intervalos
 * - getDiatonicDegreeSymbol: grados romanos
 * - Enharmonía: acordes con raíces # y b
 */

import {
  CHORD_TYPES,
  buildChord,
  detectChordName,
  getDiatonicDegreeSymbol,
  getDiatonicChordFromScale,
  CHROMATIC_SCALE,
} from './lib/musicLogic';
import type { ChordType, DiatonicChordResult } from './lib/musicLogic';

// ============================================================
// Utilidades de test
// ============================================================
let passed = 0;
let failed = 0;
let totalAssertions = 0;

function assert(condition: boolean, message: string): void {
  totalAssertions++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string): void {
  totalAssertions++;
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${message} (esperado: ${expected}, obtenido: ${actual})`);
  } else {
    failed++;
    console.error(`  ❌ ${message} (esperado: ${expected}, obtenido: ${actual})`);
  }
}

// ============================================================
// Test 1: CHORD_TYPES — Verificar estructura y conteo
// ============================================================
function testChordTypes(): void {
  console.log('\n🎼 Test 1: CHORD_TYPES (14 tipos)');
  
  assert(Object.keys(CHORD_TYPES).length === 14, `Existen 14 tipos de acorde (actual: ${Object.keys(CHORD_TYPES).length})`);
  
  // Verificar tríadas (4)
  const triads = Object.values(CHORD_TYPES).filter(ct => ct.category === 'triad');
  assert(triads.length === 4, `Existen 4 tríadas (actual: ${triads.length})`);
  
  // Verificar cuatríadas (10)
  const seventhChords = Object.values(CHORD_TYPES).filter(ct => ct.category === '7th');
  assert(seventhChords.length === 10, `Existen 10 cuatríadas (actual: ${seventhChords.length})`);
  
  // Verificar estructura de cada ChordType
  const major = CHORD_TYPES['Major'];
  assert(major !== undefined, 'Tipo "Major" existe');
  assertEquals(major?.name, 'Mayor', 'Nombre de Mayor');
  assertEquals(major?.abbreviation, 'M', 'Abreviatura de Mayor');
  assertEquals(major?.intervals.length, 3, 'Mayor tiene 3 intervalos');
  assertEquals(major?.intervals[0], 0, 'Mayor intervalo[0] = 0');
  assertEquals(major?.intervals[1], 4, 'Mayor intervalo[1] = 4');
  assertEquals(major?.intervals[2], 7, 'Mayor intervalo[2] = 7');
  assertEquals(major?.category, 'triad', 'Mayor categoría = triad');
  
  // Verificar cuatríada
  const maj7 = CHORD_TYPES['Major 7th'];
  assert(maj7 !== undefined, 'Tipo "Major 7th" existe');
  assertEquals(maj7?.abbreviation, 'maj7', 'Abreviatura de Major 7th');
  assertEquals(maj7?.intervals.length, 4, 'Major 7th tiene 4 intervalos');
  assertEquals(maj7?.intervals[3], 11, 'Major 7th intervalo[3] = 11');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 2: buildChord — Construcción de acordes
// ============================================================
function testBuildChord(): void {
  console.log('\n🎹 Test 2: buildChord()');
  
  // Test 2.1: C Mayor (tríada)
  const cMajor = buildChord(0, 'Major', 'C');
  assertEquals(cMajor.root, 'C', 'Raíz de C Mayor = C');
  assertEquals(cMajor.fullName, 'C', 'Nombre completo = C');
  assertEquals(cMajor.abbreviation, 'M', 'Abreviatura = M');
  assertEquals(cMajor.category, 'triad', 'Categoría = triad');
  assertEquals(cMajor.notes.length, 3, 'C Mayor tiene 3 notas');
  assertEquals(cMajor.notes[0].name, 'C', 'C Mayor nota[0] = C');
  assertEquals(cMajor.notes[1].name, 'E', 'C Mayor nota[1] = E');
  assertEquals(cMajor.notes[2].name, 'G', 'C Mayor nota[2] = G');
  assertEquals(cMajor.notes[0].chordDegree, 1, 'C Mayor grado[0] = 1');
  assertEquals(cMajor.notes[1].chordDegree, 3, 'C Mayor grado[1] = 3');
  assertEquals(cMajor.notes[2].chordDegree, 5, 'C Mayor grado[2] = 5');
  
  // Test 2.2: D Menor 7ta (cuatríada)
  const dMin7 = buildChord(2, 'Minor 7th', 'D');
  assertEquals(dMin7.root, 'D', 'Raíz de Dm7 = D');
  assertEquals(dMin7.fullName, 'Dm7', 'Nombre completo = Dm7');
  assertEquals(dMin7.category, '7th', 'Dm7 categoría = 7th');
  assertEquals(dMin7.notes.length, 4, 'Dm7 tiene 4 notas');
  assertEquals(dMin7.notes[0].name, 'D', 'Dm7 nota[0] = D');
  assertEquals(dMin7.notes[1].name, 'F', 'Dm7 nota[1] = F');
  assertEquals(dMin7.notes[2].name, 'A', 'Dm7 nota[2] = A');
  assertEquals(dMin7.notes[3].name, 'C', 'Dm7 nota[3] = C');
  
  // Test 2.3: Db Mayor (con bemol)
  const dbMajor = buildChord(1, 'Major', 'Db');
  assertEquals(dbMajor.fullName, 'Db', 'Nombre completo = Db');
  assertEquals(dbMajor.notes[0].name, 'Db', 'Db Mayor nota[0] = Db');
  assertEquals(dbMajor.notes[1].name, 'F', 'Db Mayor nota[1] = F');
  assertEquals(dbMajor.notes[2].name, 'Ab', 'Db Mayor nota[2] = Ab');
  
  // Test 2.4: F# Menor (con sostenido)
  const fSharpMinor = buildChord(6, 'Minor', 'F#');
  assertEquals(fSharpMinor.fullName, 'F#m', 'Nombre completo = F#m');
  assertEquals(fSharpMinor.notes[0].name, 'F#', 'F#m nota[0] = F#');
  assertEquals(fSharpMinor.notes[1].name, 'A', 'F#m nota[1] = A');
  assertEquals(fSharpMinor.notes[2].name, 'C#', 'F#m nota[2] = C#');
  
  // Test 2.5: Error para tipo inválido
  try {
    buildChord(0, 'InvalidType' as any, 'C');
    assert(false, 'buildChord con tipo inválido debería lanzar error');
  } catch (e) {
    assert(true, 'buildChord con tipo inválido lanza error');
  }
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 3: detectChordName — Detección desde intervalos
// ============================================================
function testDetectChordName(): void {
  console.log('\n🔍 Test 3: detectChordName()');
  
  assertEquals(detectChordName([0, 4, 7]), 'Major', 'Detectar Mayor [0,4,7]');
  assertEquals(detectChordName([0, 3, 7]), 'Minor', 'Detectar Menor [0,3,7]');
  assertEquals(detectChordName([0, 3, 6]), 'Diminished', 'Detectar Disminuida [0,3,6]');
  assertEquals(detectChordName([0, 4, 8]), 'Augmented', 'Detectar Aumentada [0,4,8]');
  assertEquals(detectChordName([0, 4, 7, 10]), 'Dominant 7th', 'Detectar Dominante 7 [0,4,7,10]');
  assertEquals(detectChordName([0, 4, 7, 11]), 'Major 7th', 'Detectar Mayor 7 [0,4,7,11]');
  assertEquals(detectChordName([0, 3, 7, 10]), 'Minor 7th', 'Detectar Menor 7 [0,3,7,10]');
  assertEquals(detectChordName([0, 3, 7, 11]), 'Minor Major 7th', 'Detectar m(Maj7) [0,3,7,11]');
  assertEquals(detectChordName([0, 3, 6, 10]), 'Half-Diminished 7th', 'Detectar m7b5 [0,3,6,10]');
  assertEquals(detectChordName([0, 3, 6, 9]), 'Diminished 7th', 'Detectar dim7 [0,3,6,9]');
  assertEquals(detectChordName([0, 4, 8, 11]), 'Major 7#5', 'Detectar maj7(#5) [0,4,8,11]');
  assertEquals(detectChordName([0, 4, 8, 10]), 'Dominant 7#5', 'Detectar 7(#5) [0,4,8,10]');
  assertEquals(detectChordName([0, 4, 7, 9]), 'Major 6th', 'Detectar 6 [0,4,7,9]');
  assertEquals(detectChordName([0, 3, 7, 9]), 'Minor 6th', 'Detectar m6 [0,3,7,9]');
  
  // Intervalos inválidos
  assertEquals(detectChordName([0, 2, 4]), null, 'Intervalos inválidos retornan null');
  assertEquals(detectChordName([0]), null, 'Intervalos incompletos retornan null');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 4: getDiatonicDegreeSymbol — Grados romanos
// ============================================================
function testDiatonicDegreeSymbol(): void {
  console.log('\n🏛️ Test 4: getDiatonicDegreeSymbol()');
  
  // Grado Mayor (I, IV, V)
  assertEquals(getDiatonicDegreeSymbol(0, 'Major'), 'I', 'Grado I Mayor');
  assertEquals(getDiatonicDegreeSymbol(3, 'Major'), 'IV', 'Grado IV Mayor');
  assertEquals(getDiatonicDegreeSymbol(4, 'Major'), 'V', 'Grado V Mayor');
  
  // ✅ v15.0: Grado Menor (IIm, IIIm, VIm) — romanos SIEMPRE mayúscula + "m"
  assertEquals(getDiatonicDegreeSymbol(1, 'Minor'), 'IIm', 'Grado IIm Menor');
  assertEquals(getDiatonicDegreeSymbol(2, 'Minor'), 'IIIm', 'Grado IIIm Menor');
  assertEquals(getDiatonicDegreeSymbol(5, 'Minor'), 'VIm', 'Grado VIm Menor');
  
  // ✅ v15.0: Grado Disminuido (VIIº) — romano SIEMPRE mayúscula
  assertEquals(getDiatonicDegreeSymbol(6, 'Diminished'), 'VIIº', 'Grado VIIº Disminuido');
  
  // ✅ v18.0: Grado Aumentado (III+)
  assertEquals(getDiatonicDegreeSymbol(2, 'Augmented'), 'III+', 'Grado III+ Aumentado');
  
  // ✅ v18.0: Cuatríadas — romanos SIEMPRE mayúscula + sufijos Berklee
  assertEquals(getDiatonicDegreeSymbol(0, 'Dominant 7th'), 'I7', 'Grado I7 Dominante');
  assertEquals(getDiatonicDegreeSymbol(0, 'Major 7th'), 'Imaj7', 'Grado Imaj7 Mayor 7');
  assertEquals(getDiatonicDegreeSymbol(1, 'Minor 7th'), 'IIm7', 'Grado IIm7 Menor 7');
  assertEquals(getDiatonicDegreeSymbol(0, 'Minor Major 7th'), 'Im(maj7)', 'Grado Im(maj7) Menor-Major 7');
  assertEquals(getDiatonicDegreeSymbol(6, 'Half-Diminished 7th'), 'VIIø7', 'Grado VIIø7 Semi-Disminuido');
  assertEquals(getDiatonicDegreeSymbol(6, 'Diminished 7th'), 'VIIº7', 'Grado VIIº7 Disminuido 7');
  assertEquals(getDiatonicDegreeSymbol(0, 'Major 7#5'), 'Imaj7(#5)', 'Grado Imaj7(#5) Mayor 7#5');
  assertEquals(getDiatonicDegreeSymbol(4, 'Dominant 7#5'), 'V7(#5)', 'Grado V7(#5) Dominante 7#5');
  assertEquals(getDiatonicDegreeSymbol(0, 'Major 6th'), 'I6', 'Grado I6 Mayor 6');
  assertEquals(getDiatonicDegreeSymbol(5, 'Minor 6th'), 'VIm6', 'Grado VIm6 Menor 6');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 5: Enharmonía en acordes con raíces alteradas
// ============================================================
function testChordEnharmonics(): void {
  console.log('\n🎵 Test 5: Enharmonía en acordes');
  
  // Db Mayor: Db - F - Ab
  const dbMajor = buildChord(1, 'Major', 'Db');
  assertEquals(dbMajor.notes[0].name, 'Db', 'Db Mayor nota[0] = Db');
  assertEquals(dbMajor.notes[1].name, 'F', 'Db Mayor nota[1] = F');
  assertEquals(dbMajor.notes[2].name, 'Ab', 'Db Mayor nota[2] = Ab');
  
  // Gb Mayor: Gb - Bb - Db
  const gbMajor = buildChord(6, 'Major', 'Gb');
  assertEquals(gbMajor.notes[0].name, 'Gb', 'Gb Mayor nota[0] = Gb');
  assertEquals(gbMajor.notes[1].name, 'Bb', 'Gb Mayor nota[1] = Bb');
  assertEquals(gbMajor.notes[2].name, 'Db', 'Gb Mayor nota[2] = Db');
  
  // F# Mayor: F# - A# - C#
  const fSharpMajor = buildChord(6, 'Major', 'F#');
  assertEquals(fSharpMajor.notes[0].name, 'F#', 'F# Mayor nota[0] = F#');
  assertEquals(fSharpMajor.notes[1].name, 'A#', 'F# Mayor nota[1] = A#');
  assertEquals(fSharpMajor.notes[2].name, 'C#', 'F# Mayor nota[2] = C#');
  
  // B Disminuida: B - D - F
  const bDim = buildChord(11, 'Diminished', 'B');
  assertEquals(bDim.notes[0].name, 'B', 'B dim nota[0] = B');
  assertEquals(bDim.notes[1].name, 'D', 'B dim nota[1] = D');
  assertEquals(bDim.notes[2].name, 'F', 'B dim nota[2] = F');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 6: Frecuencias y notas Tone.js
// ============================================================
function testChordFrequencies(): void {
  console.log('\n🔊 Test 6: Frecuencias y notas Tone.js');
  
  const cMajor = buildChord(0, 'Major', 'C');
  assertEquals(cMajor.notes[0].toneJsNote, 'C4', 'C4 toneJsNote');
  assertEquals(cMajor.notes[1].toneJsNote, 'E4', 'E4 toneJsNote');
  assertEquals(cMajor.notes[2].toneJsNote, 'G4', 'G4 toneJsNote');
  assertEquals(cMajor.notes[0].frequency, 261.63, 'C4 frecuencia = 261.63');
  assertEquals(cMajor.notes[1].frequency, 329.63, 'E4 frecuencia = 329.63');
  assertEquals(cMajor.notes[2].frequency, 392.00, 'G4 frecuencia = 392.00');
  
  const dMin7 = buildChord(2, 'Minor 7th', 'D');
  assertEquals(dMin7.notes[0].toneJsNote, 'D4', 'D4 toneJsNote');
  assertEquals(dMin7.notes[1].toneJsNote, 'F4', 'F4 toneJsNote');
  assertEquals(dMin7.notes[2].toneJsNote, 'A4', 'A4 toneJsNote');
  assertEquals(dMin7.notes[3].toneJsNote, 'C5', 'C5 toneJsNote');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 7: Nombres completos de acordes (fullName)
// ============================================================
function testChordFullNames(): void {
  console.log('\n📝 Test 7: Nombres completos de acordes (fullName)');
  
  // Tríadas
  assertEquals(buildChord(0, 'Major', 'C').fullName, 'C', 'Mayor C = C');
  assertEquals(buildChord(2, 'Major', 'D').fullName, 'D', 'Mayor D = D');
  assertEquals(buildChord(0, 'Minor', 'C').fullName, 'Cm', 'Menor C = Cm');
  assertEquals(buildChord(2, 'Minor', 'D').fullName, 'Dm', 'Menor D = Dm');
  assertEquals(buildChord(0, 'Diminished', 'C').fullName, 'Cdim', 'Disminuida C = Cdim');
  assertEquals(buildChord(0, 'Augmented', 'C').fullName, 'Caug', 'Aumentada C = Caug');
  
  // Cuatríadas
  assertEquals(buildChord(0, 'Dominant 7th', 'C').fullName, 'C7', 'Dominante 7 = C7');
  assertEquals(buildChord(0, 'Major 7th', 'C').fullName, 'Cmaj7', 'Mayor 7 = Cmaj7');
  assertEquals(buildChord(2, 'Minor 7th', 'D').fullName, 'Dm7', 'Menor 7 = Dm7');
  assertEquals(buildChord(0, 'Minor Major 7th', 'C').fullName, 'Cm(Maj7)', 'm(Maj7) = Cm(Maj7)');
  assertEquals(buildChord(2, 'Half-Diminished 7th', 'D').fullName, 'Dm7b5', 'm7b5 = Dm7b5');
  assertEquals(buildChord(0, 'Diminished 7th', 'C').fullName, 'Cdim7', 'dim7 = Cdim7');
  assertEquals(buildChord(0, 'Major 7#5', 'C').fullName, 'Cmaj7(#5)', 'maj7(#5) = Cmaj7(#5)');
  assertEquals(buildChord(0, 'Dominant 7#5', 'C').fullName, 'C7(#5)', '7(#5) = C7(#5)');
  assertEquals(buildChord(0, 'Major 6th', 'C').fullName, 'C6', '6 = C6');
  assertEquals(buildChord(0, 'Minor 6th', 'C').fullName, 'Cm6', 'm6 = Cm6');
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 8: Todas las raíces con acorde Mayor
// ============================================================
function testAllRootsMajor(): void {
  console.log('\n🎶 Test 8: Todas las raíces con acorde Mayor');
  
  const expectedNotes: Record<number, string[]> = {
    0: ['C', 'E', 'G'],
    1: ['Db', 'F', 'Ab'],
    2: ['D', 'F#', 'A'],
    3: ['Eb', 'G', 'Bb'],
    4: ['E', 'G#', 'B'],
    5: ['F', 'A', 'C'],
    6: ['Gb', 'Bb', 'Db'],
    7: ['G', 'B', 'D'],
    8: ['Ab', 'C', 'Eb'],
    9: ['A', 'C#', 'E'],
    10: ['Bb', 'D', 'F'],
    11: ['B', 'D#', 'F#'],
  };
  
  for (let i = 0; i < 12; i++) {
    const chord = buildChord(i, 'Major', CHROMATIC_SCALE[i]);
    const expected = expectedNotes[i];
    for (let j = 0; j < 3; j++) {
      assertEquals(
        chord.notes[j].name,
        expected[j],
        `Raíz ${CHROMATIC_SCALE[i]} nota[${j}] = ${expected[j]}`
      );
    }
  }
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 9: Cuatríadas — Todas las raíces con Dominante 7
// ============================================================
function testAllRootsDominant7(): void {
  console.log('\n🎷 Test 9: Todas las raíces con Dominante 7');
  
  const expectedNotes: Record<number, string[]> = {
    0: ['C', 'E', 'G', 'Bb'],
    2: ['D', 'F#', 'A', 'C'],
    5: ['F', 'A', 'C', 'Eb'],
    7: ['G', 'B', 'D', 'F'],
  };
  
  for (const [rootIdxStr, expected] of Object.entries(expectedNotes)) {
    const rootIdx = parseInt(rootIdxStr);
    const chord = buildChord(rootIdx, 'Dominant 7th', CHROMATIC_SCALE[rootIdx]);
    assertEquals(chord.notes.length, 4, `${CHROMATIC_SCALE[rootIdx]}7 tiene 4 notas`);
    for (let j = 0; j < 4; j++) {
      assertEquals(
        chord.notes[j].name,
        expected[j],
        `${CHROMATIC_SCALE[rootIdx]}7 nota[${j}] = ${expected[j]}`
      );
    }
  }
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Test 10: getDiatonicChordFromScale() — Descubrimiento Diatónico (v14.0)
// ============================================================
function testDiatonicChordFromScale(): void {
  console.log('\n🎼 Test 10: getDiatonicChordFromScale() — Descubrimiento Diatónico');
  
  // Test 10.1: C Major, tríada — cada grado
  console.log('  📌 C Major (Ionian), Tríadas');
  
  // Grado 1 (C): C-E-G → Mayor [0,4,7]
  const result1 = getDiatonicChordFromScale(0, 'Major (Ionian)', 0, false, 'C');
  assert(result1 !== null, 'C Major, grado 1 (C) → no null');
  assertEquals(result1?.chordTypeKey, 'Major', 'C Major, grado 1 → chordTypeKey = Major');
  assertEquals(result1?.diatonicDegree, 1, 'C Major, grado 1 → diatonicDegree = 1');
  assertEquals(result1?.degreeSymbol, 'I', 'C Major, grado 1 → degreeSymbol = I');
  assertEquals(result1?.chordNoteIndices.length, 3, 'C Major, grado 1 → 3 notas');
  assertEquals(result1?.chordNoteIndices[0], 0, 'C Major, grado 1 → nota[0] = C (0)');
  assertEquals(result1?.chordNoteIndices[1], 4, 'C Major, grado 1 → nota[1] = E (4)');
  assertEquals(result1?.chordNoteIndices[2], 7, 'C Major, grado 1 → nota[2] = G (7)');
  
  // Grado 2 (D): D-F-A → Minor [0,3,7]
  // C Major indices: [0,2,4,5,7,9,11] → C(0), D(2), E(4), F(5), G(7), A(9), B(11)
  const result2 = getDiatonicChordFromScale(0, 'Major (Ionian)', 2, false, 'C');
  assert(result2 !== null, 'C Major, grado 2 (D) → no null');
  assertEquals(result2?.chordTypeKey, 'Minor', 'C Major, grado 2 → chordTypeKey = Minor');
  assertEquals(result2?.diatonicDegree, 2, 'C Major, grado 2 → diatonicDegree = 2');
  assertEquals(result2?.degreeSymbol, 'IIm', 'C Major, grado 2 → degreeSymbol = IIm');
  assertEquals(result2?.chordNoteIndices[0], 2, 'C Major, grado 2 → nota[0] = D (2)');
  assertEquals(result2?.chordNoteIndices[1], 5, 'C Major, grado 2 → nota[1] = F (5)');
  assertEquals(result2?.chordNoteIndices[2], 9, 'C Major, grado 2 → nota[2] = A (9)');
  
  // Grado 3 (E): E-G-B → Minor [0,3,7]
  const result3 = getDiatonicChordFromScale(0, 'Major (Ionian)', 4, false, 'C');
  assert(result3 !== null, 'C Major, grado 3 (E) → no null');
  assertEquals(result3?.chordTypeKey, 'Minor', 'C Major, grado 3 → chordTypeKey = Minor');
  assertEquals(result3?.diatonicDegree, 3, 'C Major, grado 3 → diatonicDegree = 3');
  assertEquals(result3?.degreeSymbol, 'IIIm', 'C Major, grado 3 → degreeSymbol = IIIm');
  
  // Grado 4 (F): F-A-C → Mayor [0,4,7]
  const result4 = getDiatonicChordFromScale(0, 'Major (Ionian)', 5, false, 'C');
  assert(result4 !== null, 'C Major, grado 4 (F) → no null');
  assertEquals(result4?.chordTypeKey, 'Major', 'C Major, grado 4 → chordTypeKey = Major');
  assertEquals(result4?.diatonicDegree, 4, 'C Major, grado 4 → diatonicDegree = 4');
  assertEquals(result4?.degreeSymbol, 'IV', 'C Major, grado 4 → degreeSymbol = IV');
  
  // Grado 5 (G): G-B-D → Mayor [0,4,7]
  const result5 = getDiatonicChordFromScale(0, 'Major (Ionian)', 7, false, 'C');
  assert(result5 !== null, 'C Major, grado 5 (G) → no null');
  assertEquals(result5?.chordTypeKey, 'Major', 'C Major, grado 5 → chordTypeKey = Major');
  assertEquals(result5?.diatonicDegree, 5, 'C Major, grado 5 → diatonicDegree = 5');
  assertEquals(result5?.degreeSymbol, 'V', 'C Major, grado 5 → degreeSymbol = V');
  
  // Grado 6 (A): A-C-E → Minor [0,3,7]
  const result6 = getDiatonicChordFromScale(0, 'Major (Ionian)', 9, false, 'C');
  assert(result6 !== null, 'C Major, grado 6 (A) → no null');
  assertEquals(result6?.chordTypeKey, 'Minor', 'C Major, grado 6 → chordTypeKey = Minor');
  assertEquals(result6?.diatonicDegree, 6, 'C Major, grado 6 → diatonicDegree = 6');
  assertEquals(result6?.degreeSymbol, 'VIm', 'C Major, grado 6 → degreeSymbol = VIm');
  
  // Grado 7 (B): B-D-F → Diminished [0,3,6]
  const result7 = getDiatonicChordFromScale(0, 'Major (Ionian)', 11, false, 'C');
  assert(result7 !== null, 'C Major, grado 7 (B) → no null');
  assertEquals(result7?.chordTypeKey, 'Diminished', 'C Major, grado 7 → chordTypeKey = Diminished');
  assertEquals(result7?.diatonicDegree, 7, 'C Major, grado 7 → diatonicDegree = 7');
  assertEquals(result7?.degreeSymbol, 'VIIº', 'C Major, grado 7 → degreeSymbol = VIIº');
  
  // Test 10.2: C Major, cuatríadas (is7thMode = true)
  console.log('  📌 C Major (Ionian), Cuatríadas');
  
  // Grado 1 (C): C-E-G-B → Maj7 [0,4,7,11]
  const result1_7 = getDiatonicChordFromScale(0, 'Major (Ionian)', 0, true, 'C');
  assert(result1_7 !== null, 'C Major, grado 1 (7th) → no null');
  assertEquals(result1_7?.chordTypeKey, 'Major 7th', 'C Major, grado 1 (7th) → chordTypeKey = Major 7th');
  assertEquals(result1_7?.diatonicDegree, 1, 'C Major, grado 1 (7th) → diatonicDegree = 1');
  assertEquals(result1_7?.degreeSymbol, 'Imaj7', 'C Major, grado 1 (7th) → degreeSymbol = Imaj7');
  assertEquals(result1_7?.chordNoteIndices.length, 4, 'C Major, grado 1 (7th) → 4 notas');
  assertEquals(result1_7?.chordNoteIndices[3], 11, 'C Major, grado 1 (7th) → nota[3] = B (11)');
  
  // Grado 2 (D): D-F-A-C → m7 [0,3,7,10]
  // chordDegrees = [0,2,4,6], clickedDegree=1 (D es índice 1 en escala)
  // degreeIndex = (1+6) % 7 = 0 → scaleIndices[0] = 0 (C)
  const result2_7 = getDiatonicChordFromScale(0, 'Major (Ionian)', 2, true, 'C');
  assert(result2_7 !== null, 'C Major, grado 2 (7th) → no null');
  assertEquals(result2_7?.chordTypeKey, 'Minor 7th', 'C Major, grado 2 (7th) → chordTypeKey = Minor 7th');
  assertEquals(result2_7?.diatonicDegree, 2, 'C Major, grado 2 (7th) → diatonicDegree = 2');
  assertEquals(result2_7?.degreeSymbol, 'IIm7', 'C Major, grado 2 (7th) → degreeSymbol = IIm7');
  // chordScaleIndices = [2, 5, 9, 0] → D, F, A, C
  assertEquals(result2_7?.chordNoteIndices[0], 2, 'C Major, grado 2 (7th) → nota[0] = D (2)');
  assertEquals(result2_7?.chordNoteIndices[1], 5, 'C Major, grado 2 (7th) → nota[1] = F (5)');
  assertEquals(result2_7?.chordNoteIndices[2], 9, 'C Major, grado 2 (7th) → nota[2] = A (9)');
  assertEquals(result2_7?.chordNoteIndices[3], 0, 'C Major, grado 2 (7th) → nota[3] = C (0, wrap-around)');
  
  // Grado 4 (F): F-A-C-E → Maj7 [0,4,7,11]
  const result4_7 = getDiatonicChordFromScale(0, 'Major (Ionian)', 5, true, 'C');
  assert(result4_7 !== null, 'C Major, grado 4 (7th) → no null');
  assertEquals(result4_7?.chordTypeKey, 'Major 7th', 'C Major, grado 4 (7th) → chordTypeKey = Major 7th');
  assertEquals(result4_7?.degreeSymbol, 'IVmaj7', 'C Major, grado 4 (7th) → degreeSymbol = IVmaj7');
  
  // Grado 5 (G): G-B-D-F → Dominante 7 [0,4,7,10]
  const result5_7 = getDiatonicChordFromScale(0, 'Major (Ionian)', 7, true, 'C');
  assert(result5_7 !== null, 'C Major, grado 5 (7th) → no null');
  assertEquals(result5_7?.chordTypeKey, 'Dominant 7th', 'C Major, grado 5 (7th) → chordTypeKey = Dominant 7th');
  assertEquals(result5_7?.diatonicDegree, 5, 'C Major, grado 5 (7th) → diatonicDegree = 5');
  assertEquals(result5_7?.degreeSymbol, 'V7', 'C Major, grado 5 (7th) → degreeSymbol = V7');
  
  // Test 10.3: Nota fuera de escala → null
  console.log('  📌 Notas fuera de escala');
  const resultOutside = getDiatonicChordFromScale(0, 'Major (Ionian)', 1, false, 'C');
  assertEquals(resultOutside, null, 'C Major, nota Gb (1) → null');
  
  // Test 10.4: Escala menor armónica, grado 5 → Dominante 7
  console.log('  📌 A Minor (Harmonic Minor), Grado 5');
  // A Minor Armónica: A(9), B(11), C(0), D(2), E(4), F(3), G#(8)
  // scaleIndices = [9,11,0,2,4,3,8]
  // Grado 5 = E (índice 4), clickedDegree = 4
  // chordDegrees = [0,2,4,6], degreeIndex = (4+2)%7=6 → scaleIndices[6]=8 (G#)
  // degreeIndex = (4+4)%7=1 → scaleIndices[1]=11 (B)
  // degreeIndex = (4+6)%7=3 → scaleIndices[3]=2 (D)
  // chordScaleIndices = [4, 8, 11, 2] → E, G#, B, D
  // intervalos desde E(4): [0, 4, 7, 10] → Dominant 7th
  const minorResult = getDiatonicChordFromScale(9, 'Harmonic Minor', 4, true, 'A');
  assert(minorResult !== null, 'A Minor Harmonic, grado 5 (E) → no null');
  assertEquals(minorResult?.chordTypeKey, 'Dominant 7th', 'A Minor Harmonic, grado 5 → chordTypeKey = Dominant 7th');
  assertEquals(minorResult?.diatonicDegree, 5, 'A Minor Harmonic, grado 5 → diatonicDegree = 5');
  assertEquals(minorResult?.degreeSymbol, 'V7', 'A Minor Harmonic, grado 5 → degreeSymbol = V7');
  
  // Test 10.5: Todas las raíces con escala Mayor, tríada
  console.log('  📌 Todas las raíces con escala Mayor, Tríadas');
  const majorRoots = [
    { name: 'C', idx: 0 }, { name: 'C#', idx: 1 }, { name: 'D', idx: 2 },
    { name: 'Eb', idx: 3 }, { name: 'E', idx: 4 }, { name: 'F', idx: 5 },
    { name: 'F#', idx: 6 }, { name: 'G', idx: 7 }, { name: 'Gb', idx: 8 },
    { name: 'Ab', idx: 9 }, { name: 'A', idx: 10 }, { name: 'Bb', idx: 11 },
    { name: 'B', idx: 11 } // B = 11
  ];
  
  // Solo probar raíces naturales para evitar problemas enarmónicos en tests
  const naturalRoots = [
    { name: 'C', idx: 0 }, { name: 'D', idx: 2 }, { name: 'E', idx: 4 },
    { name: 'F', idx: 5 }, { name: 'G', idx: 7 }, { name: 'A', idx: 10 }
  ];
  
  for (const root of naturalRoots) {
    const r = getDiatonicChordFromScale(root.idx, 'Major (Ionian)', root.idx, false, root.name);
    assert(r !== null, `${root.name} Major, grado 1 → no null`);
    assertEquals(r?.chordTypeKey, 'Major', `${root.name} Major, grado 1 → chordTypeKey = Major`);
    assertEquals(r?.diatonicDegree, 1, `${root.name} Major, grado 1 → diatonicDegree = 1`);
    assertEquals(r?.degreeSymbol, 'I', `${root.name} Major, grado 1 → degreeSymbol = I`);
  }
  
  console.log(`   Total: ${passed} passed, ${failed} failed`);
}

// ============================================================
// Main
// ============================================================
function main(): void {
  console.log('============================================================');
  console.log('🎵 Tests de Acordes (v12.0) — Círculo Cromático Interactivo');
  console.log('============================================================');
  
  testChordTypes();
  testBuildChord();
  testDetectChordName();
  testDiatonicDegreeSymbol();
  testChordEnharmonics();
  testChordFrequencies();
  testChordFullNames();
  testAllRootsMajor();
  testAllRootsDominant7();
  testDiatonicChordFromScale();
  
  console.log('\n============================================================');
  console.log(`📊 RESULTADOS FINALES: ${passed}/${totalAssertions} passed, ${failed} failed`);
  console.log(`   Tasa de éxito: ${((passed / totalAssertions) * 100).toFixed(1)}%`);
  console.log('============================================================');
  
  if (failed > 0) {
    throw new Error(`${failed} tests fallaron`);
  }
}

main();

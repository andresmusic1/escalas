/**
 * Script de análisis para escalas octatónicas (8 notas).
 */

import { buildScaleByIndex } from './lib/musicLogic';

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

console.log('\n' + BOLD + '═══ ANÁLISIS ACTUAL — ESCALAS OCTATÓNICAS ═══' + RESET);

// Diminished Half-Whole (S-T): [0, 1, 3, 4, 6, 7, 9, 10]
console.log(`\n${BOLD}Diminished Half-Whole (S - T): [0, 1, 3, 4, 6, 7, 9, 10]${RESET}`);
const htRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
for (let i = 0; i < 12; i++) {
  const scale = buildScaleByIndex(i, 'Diminished Half-Whole', htRoots[i]);
  const names = scale.map(n => n.name).join(' - ');
  console.log(`  ${htRoots[i]}: ${CYAN}${names}${RESET}`);
}

// Diminished Whole-Half (T-S): [0, 2, 3, 5, 6, 8, 9, 11]
console.log(`\n${BOLD}Diminished Whole-Half (T - S): [0, 2, 3, 5, 6, 8, 9, 11]${RESET}`);
for (let i = 0; i < 12; i++) {
  const scale = buildScaleByIndex(i, 'Diminished Whole-Half', htRoots[i]);
  const names = scale.map(n => n.name).join(' - ');
  console.log(`  ${htRoots[i]}: ${CYAN}${names}${RESET}`);
}

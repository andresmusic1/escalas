# 17 Escalas Alteradas (Super Locrian / Altered)

**Fórmula:** `[0, 1, 3, 4, 6, 8, 10]`  
**Intervalos:** `1 - b9 - #9 - 4+/b5 - 5+/b6 - b7 - 7M`  
**Fórmula T/S:** `S - T - S - T - T - T - T` (suma 12 semitonos ✓)

---

## Listado completo desde las 17 notas raíz

| # | Raíz | Notas de la escala | Enarmonía usada |
|---|------|-------------------|-----------------|
| 1 | **C Alterado** | C - Db - Eb - E - Gb - Ab - Bb | bemoles |
| 2 | **C# Alterado** | C# - D - E - F - G - A - B | sostenidos |
| 3 | **Db Alterado** | Db - D - E - F - G - A - B | bemoles |
| 4 | **D Alterado** | D - Eb - F - Gb - Ab - Bb - C | bemoles |
| 5 | **D# Alterado** | D# - E - F# - G - A - B - C# | sostenidos |
| 6 | **Eb Alterado** | Eb - E - Gb - G - A - B - Db | bemoles |
| 7 | **E Alterado** | E - F - G - Ab - Bb - C - D | bemoles |
| 8 | **F Alterado** | F - Gb - Ab - A - B - Db - Eb | bemoles |
| 9 | **F# Alterado** | F# - G - A - A# - C - D - E | sostenidos |
| 10 | **Gb Alterado** | Gb - G - A - Bb - C - D - E | bemoles |
| 11 | **G Alterado** | G - Ab - Bb - B - Db - Eb - F | bemoles |
| 12 | **G# Alterado** | G# - A - B - C - D - E - F# | sostenidos |
| 13 | **Ab Alterado** | Ab - A - B - C - D - E - Gb | bemoles |
| 14 | **A Alterado** | A - Bb - C - Db - Eb - F - G | bemoles |
| 15 | **A# Alterado** | A# - B - C# - D - E - F# - G# | sostenidos |
| 16 | **Bb Alterado** | Bb - B - Db - D - E - Gb - Ab | bemoles |
| 17 | **B Alterado** | B - C - D - Eb - F - G - A | bemoles |

---

## Validación de fórmula T/S (calculada dinámicamente)

Para la escala Alterada con raíz en C:
- `0→1` = 1 semitono → **S**
- `1→3` = 2 semitonos → **T**
- `3→4` = 1 semitono → **S**
- `4→6` = 2 semitonos → **T**
- `6→8` = 2 semitonos → **T**
- `8→10` = 2 semitonos → **T**
- `10→12` = 2 semitonos → **T** (cierra en la octava)

**Resultado:** `S - T - S - T - T - T - T` ✓ (7 pasos, 12 semitonos totales)

---

## Notas importantes

- La escala Alterada es el **7mo modo de la Menor Melódica**.
- Se usa principalmente sobre **acordes dominantes alterados** (7alt / 7±5).
- Las notas alteradas respecto a la escala mayor son: **b9, #9, b5/b13, #5/b13, b7**.
- El sistema de enarmonía actual usa `CHROMATIC_SCALE` con bemoles por defecto. Para raíces con sostenido (C#, D#, F#, G#, A#), las notas se muestran con la convención correspondiente según el contexto del selector expandido.

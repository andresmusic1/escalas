# Plan: Botón "Acorde Color" + Eliminar Duplicación de Botones de Modo

## Fecha
9/6/2026

## Problema Identificado

### 1. Dos Pares de Botones de Modo (Duplicación)
Actualmente existen **DOS conjuntos** de botones que controlan `appMode` y `isChordMode`:

**A) Botones superiores full-width (líneas ~650-680 en App.tsx):**
```tsx
<button onClick={() => { setAppMode('scale'); setIsChordMode(false); }}>🎹 Modo Escala</button>
<button onClick={() => { setAppMode('chord'); setIsChordMode(true); }}>🎵 Modo Acorde</button>
<button onClick={() => { setAppMode('quiz'); ... }}>🧠 Modo Quiz</button>
```
✅ Estos SÍ muestran el botón "Acorde Color" correctamente.

**B) Botones en columna derecha arriba del círculo (líneas ~950-960):**
```tsx
<button onClick={() => switchPlaybackMode('scale')}>Modo Escala</button>
<button onClick={() => switchPlaybackMode('chord')}>Modo Acorde</button>
```
❌ Estos NO muestran el botón "Acorde Color".

### 2. Botón "Escala Color" en modo acorde (no deseado)
Después del cambio anterior, "Escala Color" ahora aparece siempre (línea ~1155). El usuario quiere revertir esto: solo visible en modo escala.

### 3. Ausencia de botón para gradiente del acorde
El polígono de triada/cuatriada usa un gradiente de 2 colores definido en CircleOfNotes.tsx:
```xml
<linearGradient id="chordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stopColor="#0baa00" stopOpacity="0.6" />
  <stop offset="100%" stopColor="#1e6c6c" stopOpacity="0.2" />
</linearGradient>
```
No hay UI para modificar este gradiente.

---

## Solución Propuesta

### Paso 1: Eliminar botones de modo duplicados en columna derecha

**Archivo:** `src/App.tsx` (líneas ~950-960)

Eliminar el bloque de toggle "Modo Escala"/"Modo Acorde" que está dentro del contenedor `CONTROLES FLOTANTES TOP-CENTER`, ya que los botones principales están en la parte superior:

```tsx
// ELIMINAR ESTE BLOQUE (líneas ~950-960):
<div className="flex gap-4">
  <button onClick={() => switchPlaybackMode('scale')}>Modo Escala</button>
  <button onClick={() => switchPlaybackMode('chord')}>Modo Acorde</button>
</div>
```

**Nota:** `switchPlaybackMode` también limpia reproducción activa. Si se elimina, mover esa lógica al toggle de acorde individual o integrar en los botones superiores.

### Paso 2: Revertir "Escala Color" a solo modo escala

**Archivo:** `src/App.tsx` (líneas ~1155-1168)

Cambiar de:
```tsx
{/* Input color para polígono de escala — siempre visible (v23.0 expandido) */}
<div style={{ ... }}>Escala Color<input type="color" .../></div>
```

A:
```tsx
{/* Input color para polígono de escala (solo modo escala) */}
{appMode === 'scale' && (
  <div style={{ ... }}>Escala Color<input type="color" .../></div>
)}
```

### Paso 3: Asegurar "Acorde Color" visible en modo acorde

**Archivo:** `src/App.tsx` (líneas ~1169-1185)

Verificar que el botón "Acorde Color" esté condicionado a `appMode === 'chord'`:
```tsx
{appMode === 'chord' && (
  <div style={{ ... }}>Acorde Color<input type="color" value={chordPolygonColor} .../></div>
)}
```

### Paso 4: Implementar control de gradiente del acorde (opcional, futuro)

**Opción A — Simple:** Dos inputs de color separados para los stops del gradiente.

**Opción B — Avanzada:** Un solo color que modifica el stop principal del gradiente (`#0baa00`), manteniendo el segundo stop fijo o calculado automáticamente.

**Archivos a modificar:**
- `src/App.tsx`: Agregar estado para colores del gradiente
- `src/components/CircleOfNotes.tsx`: Recibir colores como props y aplicar al `<linearGradient id="chordGradient">`

Ejemplo de nueva prop en CircleOfNotes:
```tsx
interface CircleOfNotesProps {
  // ... existentes
  chordGradientColor1?: string; // default '#0baa00'
  chordGradientColor2?: string; // default '#1e6c6c'
}
```

---

## Resumen de Cambios por Archivo

### `src/App.tsx`
| Línea | Cambio |
|-------|--------|
| ~950-960 | Eliminar toggle "Modo Escala"/"Modo Acorde" duplicado |
| ~1155-1168 | Revertir "Escala Color" a `{appMode === 'scale' && ...}` |
| ~1169-1185 | Verificar "Acorde Color" como `{appMode === 'chord' && ...}` |

### `src/components/CircleOfNotes.tsx` (futuro)
| Línea | Cambio |
|-------|--------|
| 200-201 | Agregar props `chordGradientColor1`, `chordGradientColor2` |
| 536-545 | Usar props en `<linearGradient id="chordGradient">` |

---

## Verificación Post-Implementación

1. ✅ En modo escala: solo aparece "Escala Color"
2. ✅ En modo acorde: solo aparece "Acorde Color"
3. ✅ No hay botones duplicados de modo
4. ✅ El botón superior "🎵 Modo Acorde" y el toggle en columna derecha (si se mantiene) ambos muestran "Acorde Color"

---

## Notas Técnicas

### Estructura actual del gradiente del acorde:
```xml
<linearGradient id="chordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stopColor="#0baa00" stopOpacity="0.6" />   <!-- Verde -->
  <stop offset="100%" stopColor="#1e6c6c" stopOpacity="0.2" />  <!-- Azul verdoso -->
</linearGradient>
```

### Relleno actual del polígono de acorde (línea 600):
```tsx
fill="url(#chordGradient)"
```

### Overlay de color personalizado (línea 609-623):
```tsx
{chordPolygonColor && (
  <polygon fill={chordPolygonColor} fillOpacity={0.35} .../>
)}
```
Este overlay se superpone al gradiente, creando el efecto visual actual de 2 capas.

### Decisión de diseño:
- `chordPolygonColor` (estado en App.tsx) controla un **overlay** sobre el gradiente
- El gradiente mismo (`chordGradient`) es fijo con 2 colores
- Para hacer el gradiente configurable, necesitaríamos modificar los `<stop>` elements dinámicamente
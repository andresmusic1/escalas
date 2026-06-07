# Plan: Reescritura de Contextos Históricos con Referencias Temporales Obsoletas

## 📋 Resumen del Problema

Cuatro contextos históricos en [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) contienen referencias temporales que asumen un punto de vista temporal específico (publicación original de Adrian Clark). Estas frases como `"hace unos pocos meses"`, `"este mes"` y `"el pasado mes"` resultan obsoletas e incorrectas cuando el contenido se visualiza en cualquier momento posterior.

### Referencias Temporales Identificadas

| Línea | Escala | Referencia Obsoleta | Tipo |
|-------|--------|---------------------|------|
| 2976 | Dominant Pentatonic | `"Examinamos una pentatónica dominante hace unos pocos meses..."` + `"La escala de este mes también cumple..."` | Dual (2 referencias) |
| 3015 | Mixolydia b6 | `"La escala de este mes también es conocida como escala Hindú..."` | Temporal relativo |
| 3037 | Hungarian Minor | `"Este mes nos dirigimos a Europa del Este..."` | Temporal relativo |
| 3142 | Minor Sixth Pentatonic | `"El pasado mes analizamos nuestro segundo ejemplo de una pentatónica dominante..."` | Temporal relativo |

---

## 🎯 Objetivos de Reescritura

1. **Eliminar TODAS las referencias temporales relativas** (`este mes`, `el pasado mes`, `hace unos pocos meses`)
2. **Mantener el contenido informativo**: ejemplos musicales, datos teóricos, contexto cultural
3. **Adoptar tono explorativo e informativo**: orientado al descubrimiento musical autónomo del usuario
4. **Preservar la integridad técnica**: intervalos, grados, relaciones modales intactos

---

## ✍️ Propuestas de Reescritura por Escala

### 1. Dominant Pentatonic (Línea 2976)

#### Referencias temporales detectadas:
- `"Examinamos una pentatónica dominante hace unos pocos meses"` → Referencia a contenido previo
- `"La escala de este mes también cumple los requisitos dominantes"` → Referencia temporal presente

#### Texto original completo:
> "Examinamos una pentatónica dominante hace unos pocos meses, cuando tomamos la pentatónica menor y elevamos la tercera menor hasta una tercera mayor (en A, esta es A C# D E G). Ésta contiene un acorde de séptima dominante, de ahí el nombre. La escala de este mes también cumple los requisitos dominantes, con la tercera mayor y la séptima menor, pero tiene un patrón de notas diferentes: A B C# E G. Ese arpegio A7 aun está ahí (A C# E G), pero la forma general de la escala está más cerca de la pentatónica mayor; de hecho, la única diferencia es que la sexta (F#) se eleva hasta la b7 (G)."

#### Propuesta de reescritura:
> "La pentatónica menor elevada en su tercera (en A: A C# D E G) contiene un acorde de séptima dominante, de ahí el nombre. La pentatónica dominante comparte estos requisitos con la tercera mayor y la séptima menor, pero presenta un patrón de notas diferente: A B C# E G. Ese arpegio A7 permanece intacto (A C# E G), aunque la forma general de la escala se acerca más a la pentatónica mayor; la única diferencia reside en que la sexta (F#) se eleva hasta la séptima menor (G)."

**Cambios realizados:**
- ❌ Eliminado: `"Examinamos una pentatónica dominante hace unos pocos meses, cuando tomamos"`
- ✅ Reemplazado por presentación directa de la escala como concepto
- ❌ Eliminado: `"La escala de este mes también cumple los requisitos dominantes"`
- ✅ Integrado como afirmación sobre las propiedades inherentes de la escala

---

### 2. Mixolydia b6 (Línea 3015)

#### Referencias temporales detectadas:
- `"La escala de este mes también es conocida como escala Hindú..."` → Referencia temporal presente

#### Texto original completo:
> "La escala de este mes también es conocida como escala Hindú, pero ése parece ser uno de esos falsos nombres exóticos que no tienen mucha base en la realidad, así que nos quedamos con el descriptivo. Éste es un modo Mixolidio con una sexta menor. Como puede que sepas, la Mixolidia es como la escala mayor pero con una séptima menor, así que ahora estamos distanciados en dos notas de la escala mayor. La combinación de la séptima menor y la sexta menor podría llevarte a establecer paralelismos con los modos Eólico (menor natural) o Frigio, pero esa es sólo una similitud superficial... la tercera mayor significa que ésta sigue siendo una escala de tipo mayor."

#### Propuesta de reescritura:
> "También conocida como escala Hindú — nombre cuyo carácter exótico carece de base real en la tradición musical india — esta escala se describe más apropiadamente por su estructura: un modo Mixolidio con sexta menor. El modo Mixolidio deriva de la escala mayor alterando únicamente la séptima menor, situándose a dos notas de distancia del modo Jónico. La combinación de séptima menor con sexta menor podría sugerir paralelismos con el modo Eólico (menor natural) o Frigio, pero se trata de una similitud superficial: la tercera mayor confirma que esta escala conserva su naturaleza tonal mayor."

**Cambios realizados:**
- ❌ Eliminado: `"La escala de este mes también es conocida como"`
- ✅ Reemplazado por presentación directa del alias con contexto crítico
- ❌ Eliminado: `"Como puede que sepas, la Mixolidia es..."` + `"ahora estamos distanciados en dos notas"`
- ✅ Reformulado como explicación objetiva de la relación modal

---

### 3. Hungarian Minor (Línea 3037)

#### Referencias temporales detectadas:
- `"Este mes nos dirigimos a Europa del Este..."` → Referencia temporal presente

#### Texto original completo:
> "Este mes nos dirigimos a Europa del Este. Si alguna vez has escuchado a Márta Sebestyén (y deberías; ella está entre los mejores exponentes de la música tradicional de Europa Oriental) puede que te hayas preguntado qué le da a sus melodías ese aire único. Hay tensiones donde no las esperarías y un sonido casi del Oriente Medio en algunas de las canciones. En muchos casos la respuesta es la Húngara Menor. Ésta es esencialmente una armónica menor con una cuarta aumentada. La combinación de la #4 y la séptima mayor recuerda al modo Lidio, pero aquí estamos en el contexto de una escala menor."

#### Propuesta de reescritura:
> "La Húngara Menor evoca las sonoridades de Europa del Este con ese aire único que caracteriza a artistas como Márta Sebestyén, reconocida entre los mejores exponentes de la música tradicional oriental europea. Sus melodías revelan tensiones inesperadas y un timbre casi oriental presente en muchas de sus composiciones — frecuentemente derivado del uso de esta escala. Es esencialmente una armónica menor con cuarta aumentada (#4). La combinación de #4 con séptima mayor recuerda al modo Lidio, aunque inserta en el contexto tonal menor."

**Cambios realizados:**
- ❌ Eliminado: `"Este mes nos dirigimos a Europa del Este."` (oración completa)
- ✅ Reemplazado por descripción contextual integrada directamente
- ❌ Eliminada la estructura retórica `"puede que te hayas preguntado... En muchos casos la respuesta es..."`
- ✅ Reformulado como afirmación directa sobre el uso musical

---

### 4. Minor Sixth Pentatonic (Línea 3142)

#### Referencias temporales detectadas:
- `"El pasado mes analizamos nuestro segundo ejemplo de una pentatónica dominante..."` → Referencia a contenido previo

#### Texto original completo:
> "El pasado mes analizamos nuestro segundo ejemplo de una pentatónica dominante, mostrando cómo puedes encontrar alternativas a las pentatónicas mayores y menores habituales, que conservan el carácter melódico de esas escalas. He aquí otra, basada en el mismo principio: la pentatónica sexta menor, a la que a veces se alude como la pentatónica dórica. Si no te sientes cómodo con el material teórico y solo quieres ponerte a tocar, abajo muestro la escala con la tónica en D (D F G A B). Puedes usarla más o menos en cualquier lado en el que normalmente usarías la pentatónica menor estándar. Hurgando más profundamente, esta es una pentatónica menor con una sexta mayor (B) en lugar de una séptima menor (C). La tercera menor (F) aún está ahí, manteniendo el sonido menor general, pero la sexta mayor crea un carácter diferente, es 'más dulce'."

#### Propuesta de reescritura:
> "La pentatónica sexta menor — a veces referida como pentatónica dórica — ofrece una alternativa a las pentatónicas mayores y menores habituales, conservando su carácter melódico distintivo. Con la tónica en D (D F G A B), puede utilizarse en contextos donde normalmente emplearías la pentatónica menor estándar. En su estructura fundamental: es una pentatónica menor que sustituye la séptima menor (C) por una sexta mayor (B). La tercera menor (F) permanece presente, manteniendo el carácter tonal menor general, mientras que la sexta mayor imprime un timbre más dulce y luminoso."

**Cambios realizados:**
- ❌ Eliminado: `"El pasado mes analizamos nuestro segundo ejemplo de una pentatónica dominante, mostrando cómo puedes encontrar alternativas a las pentatónicas mayores y menores habituales"`
- ✅ Reemplazado por presentación directa como alternativa melódica
- ❌ Eliminada la estructura narrativa `"He aquí otra, basada en el mismo principio"`
- ✅ Reformulado como definición conceptual autónoma

---

## 📊 Matriz de Cambios Resumen

| Escala | Línea Original | Referencias Eliminas | Frases Nuevas Clave | Contenido Preservado |
|--------|---------------|---------------------|---------------------|---------------------|
| Dominant Pentatonic | 2976 | 2 | Presentación directa de la escala | Ejemplo A, arpegio A7, comparación con Mixolidia |
| Mixolydia b6 | 3015 | 1 | Descripción del alias Hindú | Explicación modal, relación Eólico/Frigio |
| Hungarian Minor | 3037 | 1 | Contexto cultural directo | Márta Sebestyén, #4 + b7, comparación Lidia |
| Minor Sixth Pentatonic | 3142 | 1 | Definición conceptual autónoma | Ejemplo D, relación dórica, carácter "dulce" |

---

## 🔧 Plan de Implementación

### Paso 1: Backup (si aplica)
- Verificar que el estado actual del repositorio está en un commit limpio

### Paso 2: Aplicar modificaciones en [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts)
Realizar 4 bloques de búsqueda/reemplazo exactos en el archivo:

1. **Línea 2976**: Reemplazar bloque `context` de `"Dominant Pentatonic"`
2. **Línea 3015**: Reemplazar bloque `context` de `"Mixolydia b6"`
3. **Línea 3037**: Reemplazar bloque `context` de `"Hungarian Minor"`
4. **Línea 3142**: Reemplazar bloque `context` de `"Minor Sixth Pentatonic"`

### Paso 3: Validación
- Ejecutar `npx tsc --noEmit` para verificar compilación TypeScript
- Verificar que el dev server sigue funcionando (`npm run dev`)
- Confirmar visualización correcta en navegador (5173)

---

## ✅ Criterios de Aceptación

- [ ] Todas las referencias `"este mes"` eliminadas (3 instancias)
- [ ] Todas las referencias `"el pasado mes"` eliminadas (1 instancia)
- [ ] Todas las referencias `"hace unos pocos meses"` eliminadas (1 instancia)
- [ ] Contenido teórico intacto (grados, intervalos, relaciones modales)
- [ ] Ejemplos musicales preservados (Roy Orbison, Space, Márta Sebestyén, Joe Satriani, Robben Ford)
- [ ] Compilación TypeScript sin errores (`tsc --noEmit` exitoso)
- [ ] Tono explorativo coherente en los 4 contextos

---

## 📝 Notas Adicionales

### Estilo de escritura recomendado:
- **Voz**: Objetiva y descriptiva (tercera persona), evitando `"nosotros"` o `"este mes"`
- **Tono**: Exploratorio e informativo, orientado al descubrimiento musical autónomo
- **Estructura**: Definición → Explicación teórica → Contexto cultural → Ejemplo práctico
- **Longitud**: Mantener proporción similar al original (~2-3 oraciones por contexto)

### Consideraciones técnicas:
- Los textos `context` se renderizan en el UI probablemente en un tooltip o panel informativo
- No modificar los campos `degrees` ni `relations` — solo `context`
- Preservar comillas dobles y formato JSON del objeto original
- Mantener la indentación consistente con el resto del archivo

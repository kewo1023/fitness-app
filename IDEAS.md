# Ideas de diseño

Lista de espera. **Anotar aquí no es comprometerse a construirlo**: es no
perder la idea ni la razón por la que se le ocurrió.

Regla acordada el 1/09: la idea se dice **apenas se le ocurre a alguien**, sin
filtrar por tamaño. Se anota aquí y se ejecuta cuando toque. Decirla es gratis;
construirla en el momento equivocado no.

Cada idea lleva **por qué** — la razón se olvida antes que la idea, y sin
ella dentro de un mes no se sabe si vale la pena.

---

## Estructura o flujo
_Cambian qué se construye. Estas se atienden apenas aparecen: mover algo de
pantalla después de construirlo cuesta diez veces más que antes._

_(vacío)_

## Superficie
_Color, espaciado, iconos, textos, animación. Se acumulan y se hacen de una,
normalmente al final de una fase. Casi todo sale de `theme.css`._

### Paleta — APROBADA E IMPLEMENTADA (1/09)

**Porqué:** se pidió una estética cercana a silBe pero con otra familia de
color. Se revisaron las capturas reales de la App Store antes de proponer.

Lo que silBe hace y vale la pena copiar: fondo **greige cálido** en vez de
blanco, tinta **cacao** en vez de negro, un acento **desaturado** (rosa palo),
pestañas en **píldora** con relleno tintado suave, mucho aire, y etiquetas
pequeñas en mayúscula con letra espaciada.

Lo que se cambia: el rosa palo es la firma de esa marca y el público de esta
app es mixto. Se propone **oliva profundo** como acento y se mueve el naranja
actual a **cobre tostado** para la racha. Así se mantiene la regla de un solo
lugar que grita, y sobre un fondo cálido el oliva y el cobre se separan bien.

| Variable | Claro | Oscuro |
|---|---|---|
| `--fondo` | `#F1EEE8` greige | `#14120F` |
| `--superficie` | `#FAF8F4` | `#1D1A16` |
| `--superficie-2` | `#E7E2D9` | `#26221D` |
| `--linea` | `#DAD4C8` | `#332E27` |
| `--tinta` | `#2E2721` cacao | `#EFEAE2` |
| `--tinta-media` | `#6B6258` | `#A9A196` |
| `--acento` | `#5A6B45` oliva | `#9DB47C` |
| `--senal` (racha) | `#B26234` cobre | `#D9915C` |

### Liquid glass — APROBADO E IMPLEMENTADO (1/09)

**Porqué:** se pidió el efecto de iOS al cambiar de pestaña.

- Barra de abajo: `backdrop-filter: blur(20px) saturate(180%)` sobre una
  superficie translúcida, con una línea de un pixel arriba.
- Transición entre pestañas: fundido corto + 2% de escala + desplazamiento
  leve hacia arriba.
- **Riesgo real que hay que medir:** `backdrop-filter` es caro en Android de
  gama baja, que es buena parte del público. Mitigación: el desenfoque va
  SOLO en la barra fija (área pequeña, se compone una vez), nunca sobre el
  contenido que hace scroll. Fallback sólido con
  `@supports not (backdrop-filter: blur(1px))`, y todo apagado bajo
  `prefers-reduced-motion`.
- **Pendiente: medirlo en el Android real.** Si va a tirones, se cae el
  desenfoque y queda la transición sola.

### Tres niveles de decoración — IMPLEMENTADO (1/09)

**Porqué:** se planteó hacer dos versiones de la app, una para gama alta y
otra para gama baja. Se descartó: cada función habría que construirla,
probarla y arreglarla dos veces, y con 6–10 h/semana eso no es el doble de
trabajo, es el punto donde el proyecto se abandona. Peor aún, si las
versiones difieren en algo que no sea decoración aparece *"mi amiga tiene un
botón que yo no tengo"*.

En su lugar: **una sola app con tres niveles de decoración**, que cambian
solo cómo se ve.

| | alto | medio | bajo |
|---|---|---|---|
| `--desenfoque` | 14px | 8px | sin filtro |
| `--entrada` | 190ms con escala | 150ms solo fundido | 110ms |
| `--sombra` | completa | reducida | plana |

Detección: `prefers-reduced-motion` manda sobre todo; después RAM ≤ 4 GB o
≤ 4 núcleos → bajo; ≤ 6 → medio; el resto y quien no reporta nada (Safari)
→ alto.

**Pendiente para la Fase 8 — medidor de cuadros.** `deviceMemory` y
`hardwareConcurrency` son señales crudas: un celular bueno con el procesador
caliente va lento y uno barato recién prendido va bien. Lo único que no
miente es medir los cuadros por segundo durante los primeros segundos de uso
y bajar de nivel si se caen. Son unas 20 líneas con `requestAnimationFrame`.
Por eso `nivelDetectado()` está separada de `aplicarNivel()` en
`dispositivo.js`: cuando llegue el medidor, solo llama a la segunda.

## Descartadas
_Con la razón. Para no reproponerlas dentro de tres meses._

_(vacío)_

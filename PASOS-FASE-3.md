# Fase 3 — La biblioteca de ejercicios

**Estado al 4 de septiembre de 2026. Construida entera.** No falta
código para que el entrenador llene su biblioteca. Falta que devuelva la
hoja.

## Lo que YA está hecho

- El catálogo (pestaña **Ejercicios**), que abre en una **portada de 7
  grupos musculares** con su dibujo. El buscador queda arriba: escribir
  se salta la portada.
- El panel del entrenador (Perfil → **Tu biblioteca**): crear, editar y
  archivar.
- **La carga masiva** (Tu biblioteca → *Cargar desde una hoja de
  cálculo*). Pega la hoja, ve una vista previa con los errores señalados
  por número de fila, y solo entonces se guarda. Sirve pegando desde
  Excel o Google Sheets, y también con el contenido de un `.csv`.
- El bucket `ejercicios` con sus políticas verificadas.
- **La app se instala de verdad en Android** (manifest + iconos +
  service worker).

## Lo único que FALTA de esta fase

| Falta | Bloqueado por | Estimado |
|---|---|---|
| Compresión y subida de imágenes | tener imágenes | ~2 h |

Y no corre prisa: la app se ve bien sin foto, que fue el motivo entero
de meter las ilustraciones el 2/09.

---

## LO ÚNICO QUE TIENES QUE HACER TÚ

**Mandarle `plantilla-ejercicios.csv`** (está en la raíz del proyecto) y
pedirle que la devuelva editada.

Se le manda una hoja YA LLENA y no una vacía a propósito: armar una hoja
desde cero son dos horas de trabajo sin recompensa visible para él, y eso
no vuelve. Editar una llena, sí. Trae los 30 ejercicios de ejemplo ya
clasificados, y son justo los que tienen dibujo en la app, así que lo que
él conserve se ve completo desde el primer día sin una sola foto.

**Lo que tiene que hacer él, en este orden:**

1. Borrar los que no usa.
2. Agregar los suyos.
3. **Llenar la columna `indicaciones`**, que va vacía. Ver más abajo por
   qué esa columna es la importante.

Las columnas son estas. Los nombres exactos no importan —la app reconoce
"Ejercicio", "Músculo", "Dificultad" y varios más—; el contenido sí:

| Columna | Obligatoria | Qué va | Valores posibles |
|---|---|---|---|
| `nombre` | **sí** | Como él lo llama | texto libre, sin repetir |
| `grupo` | **sí** | El músculo | pecho, espalda, pierna, hombro, brazo, core, cardio |
| `movimiento` | no | El patrón | empuje, jalon, sentadilla, bisagra, zancada, core, cardio |
| `equipo` | no | Qué hace falta | ninguno, mancuernas, banda, barra, maquina, polea, kettlebell, banco |
| `nivel` | no | Para quién | principiante, intermedio, avanzado |
| `indicaciones` | no | Las 2 o 3 correcciones que él repite siempre | texto libre |

**No tiene que venir perfecta.** La app ya sabe normalizar: acepta
"Pecho", "PECHO" y "pecho ", entiende "Jalón" con tilde aunque la base
guarde "jalon", y junta los espacios dobles. Lo que no puede adivinar es
un valor que no existe: si escribe "pesas" en vez de "mancuernas", la
vista previa se lo va a señalar con el número de fila antes de guardar
nada.

**Dos cosas que vale la pena decirle a él, no a la hoja:**

**Los dos ejes son a propósito.** `grupo` es el músculo y `movimiento`
es el patrón, y son columnas separadas porque él los piensa a la vez. Si
te dice "eso es lo mismo", no lo es: un press de banca y unas flexiones
son los dos *empuje* de *pecho*, pero una sentadilla es *sentadilla* de
*pierna* y un peso muerto es *bisagra* de *pierna*. Sirve para responder
"¿qué puede hacer este cliente con lo que tiene en la casa?".

**Las indicaciones son lo que hace la app distinta de YouTube.** Un
catálogo de ejercicios lo tiene cualquiera. Lo que no tiene nadie es lo
que él le corrige a la gente. Si esa columna llega vacía, la app queda
igual a todas.

**Y hay una razón más urgente que esa.** Los 30 ejercicios que están hoy
en la app tienen indicaciones **inventadas** — se escribieron como
contenido de prueba y quedaron en la base real, donde un visitante las
lee. Son consejos de técnica física que no escribió ningún entrenador y
que la app muestra como si fueran de él.

No se borraron desde el código a propósito: el contenido es dominio de
él. Pero si la URL va a circular antes de que devuelva la hoja, la
opción segura es vaciarlas hasta que tenga las suyas. Vale la pena
decírselo tal cual, sin adornos.

### Y las imágenes

- Una por ejercicio, **con el nombre del ejercicio como nombre del
  archivo** (`sentadilla-goblet.jpg`). Así se emparejan solas con la
  hoja y no toca hacerlo a mano 150 veces.
- Que no falte ninguna no es requisito. **La app se ve bien sin imagen**,
  y hoy los 30 ejercicios de ejemplo no tienen ninguna.
- Puede mandarlas como salgan del celular. La app las comprime antes de
  subirlas.

**Y lo más importante de decirle, que no es técnico:**

> Las fotos tienen que ser **de él mismo, de alguien que le haya dado
> permiso, o ilustraciones. Nunca la foto de un cliente.**

El bucket es público: cualquiera con la dirección ve la imagen, sin
cuenta, y la dirección se arma con el nombre del archivo, así que se
adivina. La imagen de una persona identificable es un dato personal bajo
la Ley 1581, y publicarla sin autorización escrita lo pone a él en un
problema que no se arregla borrando el archivo después.

No basta con que salga de espaldas o cortada: la ley no pide que no se
le vea la cara, pide que no sea identificable. Si tiene dudas con alguna
foto, esa foto no va.

Esto conviene decírselo **antes** de que empiece a recopilar, no cuando
ya tenga 150 fotos tomadas en sus sesiones.

**Si no quiere o no puede tomar fotos**, hay una alternativa evaluada el
2/09: ilustraciones libres en vez de fotos. Está en `BITACORA.md`, en la
entrada "Imágenes libres". Resuelve el problema de raíz porque un dibujo
no es la foto de nadie.

---

## Lo que pasa cuando pegue la hoja

Ya está construido, así que esto es lo que va a ver:

1. **Se detecta cómo está separada la hoja.** Al copiar celdas de Excel
   el portapapeles entrega tabulaciones, y un CSV exportado desde un
   Excel en español usa punto y coma. La app lo dice en pantalla: si
   pegó 80 filas y le dice "1 fila leída", el separador que detectó no
   era el suyo.
2. **Una vista previa antes de guardar nada**, con cuántos entran,
   cuántos ya tenía, cuántos están repetidos dentro de su propia hoja y
   cuáles no se pueden guardar — estos últimos con el número de fila y
   la razón ("la fila 47 dice 'pesas' y eso no existe").
3. **Solo agrega.** Nunca modifica ni borra lo que ya está. Por eso
   puede volver a pegar la hoja entera las veces que quiera sin duplicar
   nada, y por eso si quiere cambiar un ejercicio que ya existe lo edita
   desde *Tu biblioteca*, uno por uno.
4. **Tres filas malas no detienen las otras 147.**

Lo que todavía NO está: la compresión y subida de imágenes (~2 h), que
espera a que haya imágenes.

La validación es la MISMA función que usa el formulario del panel
(`src/lib/ejercicios.js`), así que la hoja y el formulario no pueden
aceptar cosas distintas.

## La prueba que cierra la Fase 3

1. El entrenador entra con su cuenta, pega su hoja y sus ejercicios
   quedan en la app con sus imágenes.
2. Un cliente los ve. Un visitante también — el catálogo es el gancho.
3. **Ninguno de los dos puede editarlos ni borrarlos**, ni desde la app
   ni consultando la base directo.
4. Se corre otra vez la carga completa y **no se duplica nada**.

El punto 3 se verifica suplantando los tres roles en el SQL Editor, igual
que en el paso 8 de `PASOS-FASE-2.md`. **Y entrando a la app con cada uno**
— contar filas dice que las políticas están bien, no que el código sepa
usarlas. Es la lección del 2/09.

---

## Antes de darle la URL a gente que no conoces

No bloquea esta fase, pero que no se te olvide: **falta la puerta de edad.**

El artículo 7 de la Ley 1581 prohíbe tratar datos de menores salvo
excepciones, y con registro abierto van a entrar. Falta preguntarlo en el
registro y decidir qué pasa con un menor. El artículo 12 del Decreto 1377,
que regula cómo se hace bien, quedó **sin verificar** — la fuente oficial
no abrió.

Mientras la app la usen el entrenador y sus clientes, que él conoce uno por
uno, esto no aprieta. El día que la URL circule, sí.

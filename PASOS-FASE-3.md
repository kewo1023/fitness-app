# Fase 3 — La biblioteca de ejercicios

**Estado al 2 de septiembre de 2026.** La mitad de la fase está hecha y
en producción. Lo que falta está bloqueado por una sola cosa: la hoja de
cálculo del entrenador.

## Lo que YA está hecho

- El catálogo de ejercicios (pestaña **Ejercicios**), con buscador y
  filtros por grupo y por equipo. Se ve bien sin imagen.
- El panel del entrenador (Perfil → **Tu biblioteca**): crear, editar y
  archivar.
- El bucket `ejercicios` de Storage, creado y con sus políticas
  (`05-storage.sql`) corridas y verificadas: el admin sube, un cliente
  recibe `42501` si lo intenta.
- La versión visible y el aviso de derechos.

## Lo que FALTA, y qué lo desbloquea

| Falta | Bloqueado por | Estimado |
|---|---|---|
| Carga masiva desde hoja de cálculo | la hoja del entrenador | ~2,5 h |
| Compresión y subida de imágenes | tener imágenes | ~2 h |

---

## LO ÚNICO QUE TIENES QUE HACER TÚ

Pedirle al entrenador **una hoja de cálculo con sus ejercicios**, una
fila por ejercicio, con estas columnas. Los nombres exactos no importan;
el orden y el contenido sí:

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

## Lo que hago yo cuando llegue la hoja

1. La carga masiva: pegas el CSV, ves una vista previa con los errores
   señalados por fila, y solo entonces se guarda. El índice único
   `ux_ejercicios_nombre` ya existe justo para esto: si la carga se cae a
   la mitad, se vuelve a correr entera y las filas que ya estaban se
   ignoran.
2. La compresión de imágenes en el navegador antes de subir (~150 KB por
   foto; una de celular pesa 3 a 5 MB y tu público abre esto con datos
   móviles).
3. El emparejado automático entre el nombre del archivo y el nombre del
   ejercicio.

La validación ya está escrita y probada (`src/lib/ejercicios.js`, 21
pruebas). La carga masiva la reusa, así que el formulario y la hoja no
pueden aceptar cosas distintas.

---

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

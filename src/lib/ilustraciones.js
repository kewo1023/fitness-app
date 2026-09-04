/* =====================================================================
   ilustraciones.js — qué dibujo le toca a cada ejercicio y a cada receta
   =====================================================================

   POR QUÉ EXISTE ESTE ARCHIVO. El entrenador arranca sin fotos, y una
   rejilla de treinta huecos grises se ve como una app rota aunque no lo
   esté. Estos dibujos rellenan mientras él construye su biblioteca.

   LA REGLA QUE MANDA SOBRE TODO LO DEMÁS: la foto del entrenador SIEMPRE
   gana. El dibujo es relleno, no reemplazo. El día que él suba la foto
   de un ejercicio, el dibujo de ese ejercicio desaparece solo y nadie
   tiene que acordarse de borrarlo. Esa decisión está en BITACORA.md
   (2/09) y el orden se ve en el código de Ejercicios.jsx.

   POR QUÉ UN DIBUJO Y NO UNA FOTO DE BANCO DE IMÁGENES. Una foto de un
   ejercicio es, por definición, la foto de una persona. La licencia de
   derechos de autor de la foto NO es la autorización de quien sale en
   ella, y esa autorización es la que exige la Ley 1581. Un dibujo no es
   la foto de nadie: el problema no se mitiga, desaparece. Estas figuras
   además no tienen cara.

   POR QUÉ EL EMPAREJADO ESTÁ ESCRITO A MANO Y NO SE CALCULA.
   La tentación obvia es traducir el nombre y buscar el archivo que
   coincida. No funciona, y conviene entender por qué antes de
   "arreglarlo":

     "Pájaros con banda"    NO es "birds with band"  -> rear-delt-fly
     "Fondos entre bancos"  NO es "bottoms between benches" -> bench-dip
     "Jalón al pecho"       NO es "pull to the chest" -> lat-pulldown

   El vocabulario de gimnasio en español no es la traducción literal del
   inglés; es otro vocabulario. Y encima varía por país. Así que esto es
   una tabla de equivalencias escrita por alguien que conoce los dos
   idiomas, revisada mirando cada dibujo.

   Es el BUSCARV de toda la vida: una hoja de equivalencias al lado, y
   la fórmula trae el valor. Lo que no existe es la fórmula que adivine
   la hoja.

   ESTE ARCHIVO NO TOCA LA BASE DE DATOS, igual que ejercicios.js y por
   la misma razón: así se puede probar en un clon recién bajado, sin
   credenciales. Ver el comentario largo de ejercicios.js.
   ===================================================================== */

import { claveNombre } from './ejercicios.js'


/* De dónde salen los archivos. Van en public/, no en Supabase Storage,
 * y no es un detalle:
 *
 *  1. El color lo pone el CSS (ver .lamina en app.css), y para eso el
 *     archivo tiene que poder enmascararse. Una imagen servida desde
 *     Storage dentro de un <img> se pinta en su propio mundo y no se
 *     deja teñir: se vería blanca sobre blanco, que es exactamente como
 *     vienen estos archivos.
 *  2. Storage es donde vive lo del ENTRENADOR. Mezclar ahí material de
 *     terceros haría que un día alguien borre lo que no debe.
 *  3. Servido desde el mismo sitio que la app, entra en la caché del
 *     navegador y en la de la PWA, sin gastar tráfico de Supabase. */
const BASE = '/ilustraciones'


/* ---------------------------------------------------------------------
   EJERCICIOS
   ---------------------------------------------------------------------
   La llave es el nombre del ejercicio pasado por claveNombre(), o sea
   en minúsculas y sin tildes. Es la misma llave con la que la carga
   masiva decide si dos filas son el mismo ejercicio, y usarla aquí
   también significa que "Sentadilla goblet", "sentadilla  Goblet" y
   "SENTADILLA GOBLET" encuentran el mismo dibujo.

   El valor es el nombre del archivo dentro de ejercicios/.

   COBERTURA: los 30 ejercicios de supabase/04-ejemplo.sql. Los que el
   entrenador agregue no van a estar aquí hasta que se agreguen a mano,
   y eso está bien: sin dibujo la tarjeta se ve como se veía antes.
   No es un error, es el caso normal.

   DOS EMPAREJADOS QUE NO SON EXACTOS, y se dejan a propósito porque el
   MOVIMIENTO es el correcto aunque el implemento no:
     - "Pájaros con banda" muestra el mismo gesto con mancuernas; no
       existe la versión con banda en la biblioteca.
     - "Elevación de talones" muestra la versión de pie sin peso.
   Si al entrenador le molesta cualquiera de los dos, se quita la línea
   y esa tarjeta vuelve al hueco neutro. */
export const ILUSTRACIONES_EJERCICIOS = {
  'flexiones de pecho':             'push-up',
  'press de banca con barra':       'bench-press',
  'press inclinado con mancuernas': 'incline-dumbbell-press',
  'aperturas en banco':             'dumbbell-fly',
  'fondos entre bancos':            'bench-dip',

  'remo con mancuerna a una mano':  'one-arm-dumbbell-row',
  'jalon al pecho en polea':        'lat-pulldown',
  'dominadas asistidas':            'assisted-pull-up',
  'remo con barra':                 'barbell-row',
  'face pull con banda':            'banded-face-pull',

  'sentadilla libre':               'bodyweight-squat',
  'sentadilla con barra':           'squat',
  'sentadilla goblet':              'goblet-squat',
  'prensa de piernas':              'leg-press',
  'peso muerto rumano':             'dumbbell-romanian-deadlift',
  'puente de gluteo':               'glute-bridge',
  'zancadas caminando':             'walking-lunge',
  'zancada bulgara':                'bulgarian-split-squat',
  'elevacion de talones':           'calf-raise',

  'press militar con mancuernas':   'standing-dumbbell-press',
  'elevaciones laterales':          'lateral-raise',
  'pajaros con banda':              'rear-delt-fly',

  'curl de biceps con mancuernas':  'bicep-curl',
  'extension de triceps en polea':  'tricep-pushdown',

  'plancha frontal':                'plank',
  'plancha lateral':                'side-plank',
  'dead bug':                       'dead-bug',
  'elevacion de piernas colgado':   'hanging-leg-raise',

  'caminata inclinada':             'treadmill-incline-walk',
  'saltos de cuerda':               'jump-rope'
}


/* ---------------------------------------------------------------------
   RECETAS
   ---------------------------------------------------------------------
   Aquí el problema es otro y la solución también.

   No hay biblioteca libre de dibujos de comida que sirva, y una foto de
   un plato tampoco resuelve nada útil: habría que conseguir una por
   receta, y el día que el entrenador cambie los ingredientes la foto
   miente.

   Así que estas cuatro son DE AUTORÍA PROPIA —dibujadas para esta app—
   y no van por receta sino por MOMENTO del día, que es una columna que
   la tabla ya tiene. Cuatro archivos cubren todas las recetas que
   existan, hoy y las que vengan.

   Consecuencia práctica que vale más que el dibujo: al no ser de
   terceros, no deben atribución ni arrastran licencia ajena. La
   pantalla de créditos habla solo de los ejercicios.

   Se leen como una MARCA DE CATEGORÍA, no como la foto del plato, y
   por eso se pintan pequeñas y centradas (ver .lamina-marca en
   app.css). Un icono estirado a tamaño de foto se lee como una foto que
   no cargó. */
export const ILUSTRACIONES_RECETAS = {
  desayuno: 'desayuno',
  almuerzo: 'almuerzo',
  cena:     'cena',
  snack:    'snack'
}


/* ---------------------------------------------------------------------
   Las dos funciones que usa la interfaz
   ---------------------------------------------------------------------
   Las dos devuelven null cuando no hay dibujo, y null es una respuesta
   normal, no un fallo: la pantalla sabe pintar el hueco neutro. */

export function ilustracionDeEjercicio (nombre) {
  const archivo = ILUSTRACIONES_EJERCICIOS[claveNombre(nombre)]
  return archivo ? `${BASE}/ejercicios/${archivo}.svg` : null
}

export function ilustracionDeMomento (momento) {
  const archivo = ILUSTRACIONES_RECETAS[claveNombre(momento)]
  return archivo ? `${BASE}/recetas/${archivo}.svg` : null
}

/* ---------------------------------------------------------------------
   GRUPOS MUSCULARES — la única que SÍ se calcula
   ---------------------------------------------------------------------
   Arriba está escrito con mayúsculas que el emparejado de ejercicios no
   se calcula traduciendo. Esta función lo calcula, y conviene entender
   por qué no se contradicen.

   Allá el problema es que "Jalón al pecho" y `lat-pulldown` son dos
   vocabularios distintos, escritos por gente distinta, y ninguna regla
   lleva de uno al otro. Aquí no hay dos vocabularios: los siete
   archivos se dibujaron para esta app y se les puso EL MISMO NOMBRE que
   tienen los grupos en `ejercicios.js` (`pecho.svg`, `espalda.svg`…).
   No es una traducción, es el mismo nombre a los dos lados.

   La consecuencia práctica, y es la razón de hacerlo así: el día que el
   entrenador pida un grupo nuevo, se agrega a GRUPOS en `ejercicios.js`
   y se dibuja el archivo con ese nombre. No hay una tercera lista que
   se pueda quedar atrás. Si el archivo todavía no existe la portada
   muestra el hueco neutro, que es la misma respuesta de siempre. */
export function ilustracionDeGrupo (grupo) {
  const clave = claveNombre(grupo)
  return clave ? `${BASE}/grupos/${clave}.svg` : null
}


/* ---------------------------------------------------------------------
   El crédito, que NO es opcional
   ---------------------------------------------------------------------
   Los dibujos de los ejercicios son de Everkinetic y están bajo
   CC BY-SA 4.0. Esa licencia permite usarlos, incluso modificados,
   incluso en algo que se cobre, pero exige tres cosas:

     1. Nombrar al autor.
     2. Enlazar la licencia.
     3. Decir que se modificaron, si se modificaron. Aquí sí: se les
        cambió el color (venían blancos y sobre fondo blanco no se ven)
        y se les redondearon las coordenadas para que pesen un tercio
        menos.

   Por eso existe la pantalla de créditos en Perfil. No es cortesía: sin
   ella el uso es una infracción, y este repositorio es público.

   Y por eso el LICENSE tiene una sección de terceros. El "todos los
   derechos reservados" del proyecto no puede cubrir material ajeno.

   Lo que el share-alike SÍ alcanza: los dibujos modificados, que quedan
   bajo la misma licencia. Lo que NO alcanza: la app que los muestra.
   El código no se contagia por enseñar una imagen. */
export const CREDITO_ILUSTRACIONES = {
  autor:    'Everkinetic',
  fuente:   'https://github.com/everkinetic/data',
  normaliz: 'Workout Guide (Bryl Lim)',
  licencia: 'CC BY-SA 4.0',
  enlace:   'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
  cambios:  'Se les cambió el color y se redondearon las coordenadas para que pesen menos.'
}

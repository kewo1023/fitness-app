/* =====================================================================
   acceso.js — qué pantalla ve quien abrió la app
   =====================================================================

   Es la decisión más importante de la app y hasta hoy vivía suelta en
   un `if` dentro de `App.jsx`. Se sacó aquí por una razón concreta: no
   se podía probar, y es justo el sitio donde ya se pagaron dos bugs.

   NO TOCA LA BASE. Recibe el estado y devuelve un nombre. Eso la hace
   probable sin credenciales, igual que `ejercicios.js`, `hoja.js` y
   `plan.js`.

   =====================================================================
   EL ERROR QUE ESTA FUNCIÓN EXISTE PARA IMPEDIR
   =====================================================================

   `perfil` no tiene dos estados, tiene TRES, y confundir dos de ellos
   es lo que causó los dos bugs:

     undefined -> TODAVÍA NO SE SABE. La consulta no ha terminado, o
                  terminó mal. No es una respuesta.
     null      -> SE PREGUNTÓ Y NO TIENE. Es alguien registrado que no
                  ha canjeado su código. Estado normal y esperado.
     objeto    -> tiene perfil.

   El bug del 2/09: la consulta fallaba para el admin, el error se
   traducía a `null`, y la app leía eso como "no se ha activado" y le
   mostraba la pantalla de activación al dueño de la app. Se arregló la
   CAUSA de que fallara (un `.eq('id')` que faltaba), pero no que un
   fallo se leyera como una respuesta.

   El bug del 4/09, que es el mismo de fondo: al abrir la app con la
   sesión guardada, Supabase avisa primero con el token viejo. Esa
   primera consulta falla, `perfil` cae en `null`, y la pantalla de
   "pide un código" aparece medio segundo antes de que el token se
   refresque y todo se arregle solo. Duraba poco, pero le decía al
   entrenador que no tenía cuenta cada vez que abría su propia app.

   **La regla que sale de los dos: un fallo NUNCA es una respuesta.**
   Si no se sabe, la pantalla es "cargando" o "error", nunca una que
   afirme algo sobre el usuario.

   Analogía de Excel: es la diferencia entre una celda VACÍA y una que
   dice #N/D. Las dos "no tienen valor", pero tratarlas igual es lo que
   hace que un informe diga "cliente sin plan" cuando lo que pasó es
   que el BUSCARV no encontró la hoja.
   ===================================================================== */

export const PANTALLAS = {
  CARGANDO: 'cargando',
  ACCESO: 'acceso',
  ACTIVAR: 'activar',
  ERROR_PERFIL: 'errorPerfil',
  APP: 'app'
}

/**
 * @param {object} estado
 * @param {boolean} estado.cargando  todavía se está preguntando por la sesión
 * @param {object|null} estado.sesion
 * @param {object|null|undefined} estado.perfil  ver los tres estados arriba
 * @param {boolean} [estado.errorPerfil]  se agotaron los reintentos
 */
export function pantallaPara ({ cargando, sesion, perfil, errorPerfil }) {
  if (cargando) return PANTALLAS.CARGANDO

  // Sin sesión no hay nada más que decidir: ni siquiera sabemos quién es.
  if (!sesion) return PANTALLAS.ACCESO

  /* AQUÍ ESTÁ TODO. Se pregunta por `undefined` ANTES que por `null`, y
   * el orden es la corrección: `undefined` es "no sabemos" y `null` es
   * "sabemos que no tiene". Con `if (!perfil)`, que es como estaba, los
   * dos caen en el mismo sitio y el que no sabe termina afirmando. */
  if (errorPerfil) return PANTALLAS.ERROR_PERFIL
  if (perfil === undefined) return PANTALLAS.CARGANDO
  if (perfil === null) return PANTALLAS.ACTIVAR

  return PANTALLAS.APP
}


/* ---------------------------------------------------------------------
   ¿Hay que volver a preguntar por el perfil?
   ---------------------------------------------------------------------
   Se saca aquí para poder probarla, porque es donde estuvo el error del
   primer intento de arreglo (4/09, segunda vuelta).

   AQUEL ARREGLO REINTENTABA SOLO CUANDO LA CONSULTA FALLABA. Y resulta
   que el caso que de verdad pasa no falla: **devuelve cero filas sin
   error.**

   Por qué. Las políticas de `perfiles` dicen `id = auth.uid()`. Si la
   consulta sale antes de que la librería tenga el token del usuario
   puesto, `auth.uid()` es nulo, ninguna fila cumple la condición, y
   PostgREST responde 200 con una lista vacía. Para el código eso es
   `data = null, error = null`: una respuesta perfectamente válida que
   dice "esta persona no tiene perfil". Y ahí es donde la app le
   enseñaba la pantalla de activación al entrenador.

   O sea: el error del 2/09 fue confundir un fallo con una respuesta, y
   este es confundir una respuesta VACÍA con una respuesta. La misma
   familia.

   Por eso se reintenta también con la lista vacía. El costo es que un
   visitante que de verdad no tiene perfil espera unos cientos de
   milisegundos de más antes de ver la pantalla de activación — que es
   el lado barato en el que equivocarse.
   --------------------------------------------------------------------- */
export function hayQueReintentar ({ error, data, intento, maximo }) {
  if (intento >= maximo - 1) return false   // ya no quedan intentos
  return Boolean(error) || data == null
}

/* Qué significa el resultado FINAL, agotados los reintentos.
 *
 *   error  -> undefined: seguimos sin saber. Nunca null, que afirmaría.
 *   vacío  -> null: se preguntó bien varias veces y no hay perfil.
 *   fila   -> la fila. */
export function resultadoPerfil ({ error, data }) {
  if (error) return undefined
  return data ?? null
}


/* ---------------------------------------------------------------------
   Qué estado queda cuando cambia la sesión
   ---------------------------------------------------------------------
   TERCER Y ÚLTIMO CAMINO DEL MISMO BUG (4/09). Los dos arreglos
   anteriores no lo tocaron porque no había ninguna respuesta
   involucrada: el `null` era UN SOBRANTE.

   La secuencia, que se repite en cada apertura de la app:

     1. Supabase avisa por primera vez CON SESIÓN NULA, mientras
        todavía está restaurando la sesión guardada. El código entra en
        la rama "sin sesión" y deja `perfil = null` y `cargando = false`.
        Correcto: sin sesión, null sí es una respuesta.

     2. Avisa otra vez, ahora con la sesión. `setSesion` se aplica de
        inmediato, ANTES de que la consulta del perfil empiece siquiera.
        En ese instante el estado es: hay sesión, `perfil = null` —el
        sobrante del paso 1— y `cargando = false`.

        Eso es, exactamente, la definición de la pantalla de activación.

     3. Llega el perfil y todo se arregla solo. El parpadeo dura lo que
        tarde la consulta.

   LA REGLA QUE FALTABA: `perfil` describe A LA SESIÓN ACTUAL. En cuanto
   la sesión cambia, lo que se sabía del perfil deja de aplicar, y hay
   que decir "no se sabe" ANTES de ir a preguntar. Un dato viejo que
   sobrevive a su contexto miente aunque en su momento fuera cierto.

   LA EXCEPCIÓN QUE HAY QUE CONSERVAR: si la sesión nueva es del MISMO
   usuario, el perfil se conserva. Supabase refresca el token cada
   cierto tiempo y eso dispara este mismo evento; sin la excepción, la
   app se pondría en blanco sola cada hora mientras alguien la usa.
   --------------------------------------------------------------------- */
export function alCambiarSesion (nuevaSesion, perfilActual) {
  // Sin sesión no hay a quién buscarle perfil. Aquí null SÍ es una
  // respuesta, y es la única rama donde lo es.
  if (!nuevaSesion) {
    return { sesion: null, perfil: null, errorPerfil: false, cargando: false }
  }

  const mismoUsuario = Boolean(
    perfilActual && perfilActual.id && perfilActual.id === nuevaSesion.user?.id
  )

  return {
    sesion: nuevaSesion,
    // undefined, nunca null: cambió la sesión, así que no sabemos.
    perfil: mismoUsuario ? perfilActual : undefined,
    errorPerfil: false,
    // Solo se vuelve a "cargando" si de verdad no sabemos. Si es el
    // mismo usuario la app sigue viéndose y el perfil se refresca por
    // detrás.
    cargando: !mismoUsuario
  }
}

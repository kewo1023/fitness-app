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

/* =====================================================================
   plan.js — en qué punto del plan está el cliente HOY
   =====================================================================

   Una sola pregunta, y de ella cuelga toda la pantalla de Hoy: dado un
   plan que arrancó el día X y dura N semanas, ¿qué semana y qué día le
   toca a esta persona hoy?

   NO TOCA LA BASE DE DATOS, igual que `ejercicios.js` y `hoja.js` y por
   la misma razón: así se prueba en un clon recién bajado, sin
   credenciales. Y esta en particular TIENE que ser probable sin
   conexión, porque es aritmética de fechas y la regla 5 de CLAUDE.md
   existe justamente porque aquí es donde se rompen las cosas en
   silencio.

   =====================================================================
   LA DECISIÓN QUE HAY QUE ENTENDER ANTES DE TOCAR ESTO
   =====================================================================

   `plan_dias` guarda `semana` (1, 2, 3…) y `dia` (1 a 7). El `dia` es
   el DÍA DE LA SEMANA —1 es lunes— porque así piensa el entrenador:
   "los lunes, Empuje A". No es "el día 5 desde que empezó".

   Eso obliga a que las semanas del plan sean SEMANAS DE CALENDARIO, de
   lunes a domingo. Si la semana 1 fueran "los primeros 7 días desde el
   inicio", un plan que arranca un miércoles tendría su semana 1
   corriendo de miércoles a martes, y el lunes de por medio pertenecería
   a la semana 1 y a la 2 al mismo tiempo. La rutina del lunes se
   mostraría dos veces o ninguna.

   **Consecuencia que hay que aceptar, y decirle al entrenador:** si
   asigna un plan un miércoles, la semana 1 le queda de 5 días. No es un
   error, es lo que pasa cuando alguien empieza a mitad de semana. Si
   quiere las 4 semanas completas, que lo arranque un lunes.

   Analogía de Excel: es la diferencia entre `NUM.DE.SEMANA()` —que
   corta el año en semanas fijas de calendario— y restar dos fechas y
   dividir entre 7. Lo segundo es más simple y da la respuesta
   equivocada en cuanto la primera semana no arranca en lunes.
   ===================================================================== */

import {
  hoyBogota, diaSemanaBogota, inicioSemanaBogota, diasEntre
} from '../data/fechas.js'


/**
 * En qué semana y qué día del plan cae una fecha.
 *
 * Devuelve `{ semana, dia, estado }`. `estado` es lo que decide qué
 * pinta la pantalla, y son tres:
 *
 *   'enCurso'    — el plan está corriendo. `semana` y `dia` sirven.
 *   'noEmpieza'  — el plan arranca en el futuro. Pasa cuando el
 *                  entrenador lo asigna hoy para el lunes que viene, que
 *                  es lo normal, no una rareza.
 *   'terminado'  — se acabaron las semanas. No es un error: el cliente
 *                  cumplió su ciclo y le toca uno nuevo.
 *
 * Los tres tienen que existir aquí y no resolverse con un `if` suelto en
 * la pantalla, porque los tres se ven distinto y ninguno es "no hay
 * nada". "No hay nada" solo es no tener plan.
 */
export function puntoDelPlan (plan, fecha = hoyBogota()) {
  if (!plan || !plan.inicio) return null

  /* Se comparan los LUNES de cada semana, no las fechas sueltas. Es lo
   * que hace que la cuenta sea exacta sin importar en qué día de la
   * semana arrancó el plan: dos lunes siempre están separados por un
   * múltiplo de 7. */
  const lunesInicio = inicioSemanaBogota(plan.inicio)
  const lunesAhora = inicioSemanaBogota(fecha)

  const semana = Math.floor(diasEntre(lunesInicio, lunesAhora) / 7) + 1
  const dia = diaSemanaBogota(fecha)

  // Antes del arranque se compara contra la FECHA de inicio, no contra
  // su lunes. Si el plan empieza el miércoles, el martes anterior
  // todavía no empezó aunque los dos caigan en la misma semana.
  if (diasEntre(plan.inicio, fecha) < 0) {
    return { semana: 1, dia, estado: 'noEmpieza' }
  }

  if (semana > (plan.semanas || 0)) {
    return { semana, dia, estado: 'terminado' }
  }

  return { semana, dia, estado: 'enCurso' }
}


/**
 * De la lista de días del plan, el que toca en ese punto.
 *
 * Devuelve la fila de `plan_dias`, o null. Y null tiene DOS
 * significados que la pantalla distingue:
 *
 *   - existe la fila con `rutina_id` en null  -> día de DESCANSO, que
 *     el entrenador programó a propósito.
 *   - no existe la fila                        -> ese día no está
 *     programado.
 *
 * Los dos se ven igual desde afuera y no son lo mismo. Por eso esta
 * función devuelve la fila entera y no la rutina: quien decide qué
 * decir es la pantalla, con la fila en la mano.
 */
export function diaDelPlan (dias, punto) {
  if (!punto || punto.estado !== 'enCurso') return null
  return (dias || []).find(
    d => d.semana === punto.semana && d.dia === punto.dia
  ) || null
}


/**
 * Cuántas sesiones lleva completadas esta semana, contra su meta.
 *
 * LA META ES POR CLIENTE, nunca una constante. Sale de
 * `planes.meta_semanal`, y esa decisión está en `BITACORA.md` desde el
 * 1/09: los días a la semana varían según la persona. Un 3 escrito en
 * el código volvería a todos iguales.
 *
 * `sesiones` son las fechas (texto "2026-09-04") de las sesiones
 * completadas. Se cuentan DÍAS DISTINTOS, no filas — ver el comentario
 * de abajo.
 *
 * Se filtran contra el lunes de ESTA semana, en hora de Bogotá, que es
 * la razón entera de la regla 5. Calculado con el reloj del computador
 * de quien programa, alguien en Bogotá vería su racha saltar a las 7 de
 * la noche.
 */
export function rachaSemanal (plan, sesiones = [], fecha = hoyBogota()) {
  const meta = plan?.meta_semanal || 0
  const lunes = inicioSemanaBogota(fecha)

  /* SE CUENTAN DÍAS DISTINTOS, no sesiones.
   *
   * `meta_semanal` son "los días a la semana que entrena esta persona"
   * (BITACORA, 1/09), así que dos entrenamientos el mismo martes son UN
   * día cumplido, no dos. Contando sesiones, alguien que entrena dos
   * veces un día llegaría a su meta de 3 en dos días y la racha diría
   * que cumplió una semana que no cumplió.
   *
   * Y de paso tapa el otro lado del mismo problema: si por lo que sea
   * llegaran dos filas del mismo día —un doble toque, un reintento—, la
   * racha no se infla. El Set es lo que en Excel sería quitar
   * duplicados antes de contar, en vez de contar la columna entera. */
  const hechas = new Set(
    sesiones.filter(f => diasEntre(lunes, f) >= 0 && diasEntre(f, fecha) >= 0)
  ).size

  return {
    meta,
    hechas,
    // Se recorta a la meta: 5 sesiones con meta 3 muestran "3 / 3", no
    // "5 / 3". La racha mide si cumplió, no cuánto se pasó, y un
    // número mayor que el total se lee como un error de la app.
    mostradas: Math.min(hechas, meta),
    faltan: Math.max(0, meta - hechas),
    cumplida: meta > 0 && hechas >= meta
  }
}

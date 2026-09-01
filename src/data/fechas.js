/* =====================================================================
   fechas.js — TODO lo que tenga que ver con "qué día es" pasa por aquí.
   =====================================================================

   Por qué existe este archivo (regla 5 de CLAUDE.md):

   Los usuarios viven en Colombia (UTC−5, sin horario de verano). El
   desarrollo se hace desde una zona que sí tiene horario de verano, así
   que la diferencia entre las dos cambia de 1 hora a 0 y de vuelta, dos
   veces al año.

   Y hay un problema peor, que no depende de dónde esté nadie: a las 7 de
   la noche en Bogotá, en UTC ya es el día siguiente. Si preguntas
   new Date().toISOString() a esa hora, te contesta MAÑANA. Un usuario
   que entrenó el martes a las 8 p.m. quedaría registrado el miércoles,
   y la racha se rompe sola.

   Solución: nunca preguntar "qué día es" a secas. Siempre preguntarlo
   en la zona de Bogotá. Eso es lo que hacen estas funciones.

   Analogía de Excel: HOY() en Excel te da el día del computador donde
   se abre el archivo. Si el archivo lo abre alguien en otro país, el
   número cambia. Aquí estamos forzando que HOY() siempre responda con
   el reloj de Bogotá, sin importar quién pregunte.
   ===================================================================== */

export const ZONA = 'America/Bogota'

/**
 * El día de hoy en Bogotá, como texto "2026-09-01".
 *
 * El truco está en el idioma 'en-CA': es el único que formatea las
 * fechas como año-mes-día con ceros adelante, que es justo el formato
 * que entiende Postgres. Así lo que sale de aquí se puede guardar en la
 * base tal cual.
 */
export function hoyBogota () {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

/**
 * Convierte un instante cualquiera (lo que sale de la base, que viene en
 * UTC) al día que era en Bogotá. Mismo formato "2026-09-01".
 */
export function diaEnBogota (instante) {
  const d = instante instanceof Date ? instante : new Date(instante)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d)
}

/**
 * Qué día de la semana es en Bogotá. 1 = lunes ... 7 = domingo.
 *
 * Ojo: JavaScript numera el domingo como 0 y el lunes como 1. Aquí lo
 * corregimos para que la semana empiece el lunes, que es como cuenta
 * una rutina de entrenamiento ("3 de 4 días de la semana").
 */
export function diaSemanaBogota (fechaTexto = hoyBogota()) {
  const [a, m, d] = fechaTexto.split('-').map(Number)
  // Date.UTC + getUTCDay: se construye la fecha en UTC y se lee en UTC.
  // Así el resultado no depende del reloj del computador de nadie.
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return js === 0 ? 7 : js
}

/**
 * El lunes de la semana a la que pertenece esa fecha, en Bogotá.
 * Es la base de la racha semanal: "esta semana" arranca aquí.
 */
export function inicioSemanaBogota (fechaTexto = hoyBogota()) {
  const [a, m, d] = fechaTexto.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1, d))
  base.setUTCDate(base.getUTCDate() - (diaSemanaBogota(fechaTexto) - 1))
  return base.toISOString().slice(0, 10)
}

/** Cuántos días hay entre dos fechas "2026-09-01". Siempre entero. */
export function diasEntre (desde, hasta) {
  const n = t => Date.UTC(...t.split('-').map((v, i) => i === 1 ? +v - 1 : +v))
  return Math.round((n(hasta) - n(desde)) / 86400000)
}

/**
 * "2026-09-01" -> "01/09/2026". El formato que se usa en Colombia.
 * Se hace partiendo el texto a mano, no con new Date(): pasarle esa
 * cadena a Date la interpreta como UTC y en América retrocede un día.
 * Es el mismo bug que se pagó en nosotros-app.
 */
export function formatearFecha (fechaTexto) {
  const [a, m, d] = fechaTexto.split('-')
  return `${d}/${m}/${a}`
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves',
              'viernes', 'sábado', 'domingo']

/** "lunes", "martes"... para el día de la semana (1 a 7). */
export function nombreDia (n) {
  return DIAS[n - 1] ?? ''
}

/** "Lunes 1 de septiembre" — el encabezado de la pantalla de Hoy. */
export function fechaLarga (fechaTexto = hoyBogota()) {
  const [a, m, d] = fechaTexto.split('-').map(Number)
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
                 'diciembre']
  const dia = nombreDia(diaSemanaBogota(fechaTexto))
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d} de ${meses[m - 1]}`
}

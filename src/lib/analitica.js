/* =====================================================================
   analitica.js — cómo se LEEN los números que calcula la base.
   =====================================================================

   OJO CON LO QUE NO ESTÁ AQUÍ, que es casi todo: ninguna cuenta.

   La adherencia, la racha, los minutos y los logros los calcula
   Postgres en `supabase/08-analitica.sql`. Es la decisión del 31/08 y
   la que CLAUDE.md marca como la que no se sacrifica. Este archivo
   convierte esos números en frases, y nada más.

   La diferencia importa el día que alguien quiera cambiar cuándo se
   considera que un cliente está al día: se toca un sitio, no dos. Si
   una fórmula vive en la base Y en el navegador, tarde o temprano las
   dos dicen cosas distintas y nadie sabe cuál creerle.

   Está aparte de las pantallas por la misma razón que `gamificacion.js`:
   así se puede probar. Son frases que va a leer el entrenador sobre sus
   clientes, y una frase mal calculada aquí le hace escribirle a la
   persona equivocada.
   ===================================================================== */


/**
 * Minutos a algo que se pueda leer de un vistazo.
 *
 * Por qué no se muestran los minutos pelados: "1240 minutos" obliga a
 * dividir mentalmente entre 60 para saber si eso es mucho. "20 h 40" se
 * entiende sin hacer nada. La cifra grande de una pantalla de progreso
 * existe para dar una sensación, no para hacer cuentas.
 */
export function formatearMinutos (minutos) {
  const n = Number(minutos)
  if (!Number.isFinite(n) || n <= 0) return '0 min'

  const horas = Math.floor(n / 60)
  const resto = Math.round(n % 60)

  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas} h`
  return `${horas} h ${resto}`
}


/**
 * "Hace cuánto entrenó" en palabras.
 *
 * `dias` viene de la base ya calculado en hora de Bogotá — es la resta
 * que hace `adherencia_clientes`. Aquí NO se vuelve a calcular contra
 * el reloj del celular: ese reloj está en la zona horaria de quien mira,
 * y el entrenador podría estar en otra. La regla 5 no se aplica solo al
 * guardar; se aplica también al contar hacia atrás.
 *
 * `null` significa que nunca entrenó, y eso NO es lo mismo que cero.
 */
export function textoDesdeUltima (dias) {
  if (dias === null || dias === undefined) return 'Nunca ha entrenado'

  const n = Number(dias)
  if (!Number.isFinite(n) || n < 0) return 'Nunca ha entrenado'

  if (n === 0) return 'Entrenó hoy'
  if (n === 1) return 'Entrenó ayer'
  if (n < 7) return `Hace ${n} días`
  if (n < 14) return 'Hace más de una semana'
  if (n < 31) return `Hace ${Math.floor(n / 7)} semanas`
  return 'Hace más de un mes'
}


/* Los dos cortes de la adherencia.
 *
 * Están escritos aquí arriba y con nombre para que se vean: son un
 * juicio, no un hecho. Decir que por debajo de 50% alguien "se perdió"
 * es una decisión de producto, y el día que el entrenador diga que su
 * gente entrena distinto, se cambian estos dos números y ya. */
export const CORTE_AL_DIA = 80
export const CORTE_IRREGULAR = 50

/**
 * En qué está un cliente, según su porcentaje de cumplimiento.
 *
 * Devuelve una clave —para el CSS— y un texto. El texto describe el
 * DATO, nunca a la persona: "va al día" y no "es cumplido", "sin
 * registros" y no "abandonó". El entrenador va a leer esto al lado del
 * nombre de alguien que conoce, y la app no está para calificar a
 * nadie: está para decirle a quién le sirve una llamada.
 */
export function nivelDeAdherencia (porcentaje) {
  /* El `null` va comprobado aparte y no vale confiarse del isFinite de
   * abajo: `Number(null)` es CERO, no NaN. Sin esta línea, un cliente
   * del que no hay dato caía en el peor tramo y aparecía en la lista
   * como el que menos entrena — que es exactamente lo contrario de "no
   * sabemos". Lo encontró su prueba, no la pantalla. */
  if (porcentaje === null || porcentaje === undefined) {
    return { clave: 'sin-datos', texto: 'Sin registros' }
  }

  const n = Number(porcentaje)
  if (!Number.isFinite(n) || n < 0) return { clave: 'sin-datos', texto: 'Sin registros' }

  if (n >= CORTE_AL_DIA)    return { clave: 'al-dia',    texto: 'Al día' }
  if (n >= CORTE_IRREGULAR) return { clave: 'irregular', texto: 'Irregular' }
  return { clave: 'flojo', texto: 'Muy por debajo' }
}


/**
 * Rellena las semanas que faltan, para que la barra no mienta.
 *
 * `v_semanas_cliente` solo devuelve las semanas en las que la persona
 * entrenó: una semana en blanco no existe como fila. Pintando eso tal
 * cual, ocho barras seguidas se verían como ocho semanas seguidas
 * entrenando aunque haya tres meses de hueco entre dos de ellas.
 *
 * Esto arma la lista de lunes del calendario y le pega a cada uno lo
 * que haya. Es lo mismo que hace `generate_series` del lado del SQL en
 * `retencion_semanal`, y por la misma razón: la lista de semanas sale
 * del calendario, no de los datos.
 *
 * `lunes` es el lunes de la semana en curso, en texto "2026-09-01", y
 * viene de `inicioSemanaBogota()`. No se calcula aquí: esta función no
 * sabe qué día es hoy, y así se puede probar sin fingir un reloj.
 */
export function semanasSeguidas (filas, lunes, cuantas = 8) {
  const porLunes = new Map(
    (filas || []).map(f => [String(f.lunes), f])
  )

  const salida = []
  // Se recorre hacia atrás desde el lunes de esta semana y al final se
  // da vuelta, para que la más vieja quede a la izquierda.
  const cursor = new Date(`${lunes}T00:00:00Z`)

  for (let i = 0; i < cuantas; i++) {
    const clave = cursor.toISOString().slice(0, 10)
    const fila = porLunes.get(clave)
    salida.push({
      lunes: clave,
      dias: fila?.dias || 0,
      meta: fila?.meta || 0,
      cumplida: Boolean(fila?.cumplida)
    })
    cursor.setUTCDate(cursor.getUTCDate() - 7)
  }

  return salida.reverse()
}

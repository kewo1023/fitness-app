/* =====================================================================
   series.js — registrar peso y repeticiones, serie por serie
   =====================================================================

   LA CONDICIÓN QUE MANDA SOBRE TODO ESTE ARCHIVO, y está escrita en el
   esquema desde el 1/09: esta pantalla se usa **con el celular en la
   mano, sudado y a media serie**. Tiene que funcionar a un toque.

   De ahí sale casi todo lo de abajo. Prellenar el peso no es una
   comodidad: teclear "72,5" con una mano y el pulso alterado, ocho
   veces por entrenamiento, es exactamente lo que hace que alguien deje
   de registrar a la tercera sesión. Y una tabla de series a medio
   llenar es peor que ninguna, porque la métrica de ejercicios saltados
   se alimenta de ella.

   No toca la base, igual que `plan.js` y `ejercicios.js`: así se prueba
   en un clon recién bajado, sin credenciales.
   ===================================================================== */


/* Los topes vienen de la base, no de una opinión. `peso_kg` es
 * `numeric(6,2)`: seis dígitos en total, dos de ellos decimales, o sea
 * 9999.99 como máximo. Escribir más no da un error bonito, da un error
 * de Postgres en la cara del usuario a media serie. */
export const PESO_MAXIMO = 9999.99
export const REPS_MAXIMAS = 999


/**
 * Qué pide el plan para esta serie, leído del texto del entrenador.
 *
 * `rutina_ejercicios.reps` es TEXTO a propósito (esquema, archivo 01):
 * admite "12" y también "8-10", porque así lo escribe él. Aquí se
 * intenta entenderlo, y cuando no se puede se dice que no en vez de
 * adivinar.
 *
 * Devuelve `{ exacto }`, `{ min, max }` o `null`.
 *
 * DELIBERADAMENTE ESTRICTO. "12 por lado", "al fallo" o "AMRAP"
 * devuelven null y no un 12 sacado de la primera cifra que aparezca. El
 * número que salga de aquí va a acabar PRELLENADO en un campo que la
 * persona puede guardar sin mirar, y de ahí a su historial. Un dato
 * inventado en la tabla que mide si de verdad entrenó vale menos que un
 * campo vacío.
 */
export function objetivoReps (texto) {
  const t = String(texto ?? '').trim()
  if (!t) return null

  const exacto = t.match(/^(\d{1,3})$/)
  if (exacto) return { exacto: Number(exacto[1]) }

  // "8-10", "8 - 10", "8 a 10". El guion largo también, que es lo que
  // mete el teclado del celular al escribir rápido.
  const rango = t.match(/^(\d{1,3})\s*(?:-|–|—|a)\s*(\d{1,3})$/i)
  if (rango) {
    const min = Number(rango[1])
    const max = Number(rango[2])
    // "10-8" está al revés. Se ordena en vez de rechazarlo: es un error
    // de tecleo del entrenador, no una intención distinta.
    return { min: Math.min(min, max), max: Math.max(min, max) }
  }

  return null
}


/**
 * Con qué llegan los dos campos antes de que la persona toque nada.
 *
 * EL PESO SÍ SE PRELLENA, Y LAS REPETICIONES CASI NUNCA. No es una
 * inconsistencia, es la diferencia entre los dos datos:
 *
 *   - El peso de hoy es, casi siempre, el mismo de la última vez. Es un
 *     hecho sobre lo que hay en la barra, y equivocarse es barato: se
 *     ve el número mal y se corrige.
 *   - Las repeticiones son lo que ACABA de pasar y es justo lo que
 *     varía. Prellenarlas con lo que hizo la semana pasada es escribir
 *     su historial por él, y es el dato que la app existe para medir.
 *
 * La única excepción son las repeticiones cuando el plan pide un número
 * exacto ("12"): ahí el prellenado no es una suposición sobre lo que
 * hizo, es lo que el entrenador le pidió. Si el plan dice "8-10", el
 * campo llega vacío: elegir el 8 o el 10 por él sería inventar.
 */
export function valoresPrellenados ({ ultima, pesoSugerido, objetivo } = {}) {
  const peso = ultima?.peso_kg ?? pesoSugerido ?? null

  return {
    peso: peso === null || peso === undefined ? '' : String(peso),
    reps: objetivo?.exacto ? String(objetivo.exacto) : ''
  }
}


/**
 * Revisa lo que se va a guardar y lo convierte a números.
 *
 * LOS DOS CAMPOS PUEDEN IR VACÍOS, y eso no es un error: la fila
 * significa "hice esta serie". Alguien que entrena sin pesas, o que
 * simplemente no quiere anotar números, tiene que poder marcar la serie
 * igual. Si guardar exigiera escribir algo, la mitad de la gente
 * dejaría de marcar — y entonces la métrica de ejercicios saltados
 * empezaría a medir quién anota en vez de qué se salta.
 *
 * LA COMA DECIMAL SE ACEPTA. En Colombia se escribe 72,5 y no 72.5. Sin
 * esta línea, la mitad de los pesos se rechazarían por escribirlos como
 * se escriben allá.
 */
export function validarSerie ({ peso, reps } = {}) {
  const errores = []
  const valores = { peso_kg: null, reps: null }

  const textoPeso = String(peso ?? '').trim().replace(',', '.')
  if (textoPeso) {
    const n = Number(textoPeso)
    if (!Number.isFinite(n)) {
      errores.push('El peso tiene que ser un número.')
    } else if (n < 0) {
      errores.push('El peso no puede ser negativo.')
    } else if (n > PESO_MAXIMO) {
      errores.push(`El peso no puede pasar de ${PESO_MAXIMO} kg.`)
    } else {
      // Se redondea a dos decimales en vez de rechazar: la columna
      // guarda dos, y quien escriba 72,555 quiso decir 72,56, no
      // cometer un error.
      valores.peso_kg = Math.round(n * 100) / 100
    }
  }

  const textoReps = String(reps ?? '').trim()
  if (textoReps) {
    const n = Number(textoReps)
    if (!Number.isInteger(n)) {
      errores.push('Las repeticiones tienen que ser un número entero.')
    } else if (n < 0) {
      errores.push('Las repeticiones no pueden ser negativas.')
    } else if (n > REPS_MAXIMAS) {
      errores.push(`Las repeticiones no pueden pasar de ${REPS_MAXIMAS}.`)
    } else {
      valores.reps = n
    }
  }

  return { valido: errores.length === 0, errores, valores }
}


/**
 * Cuánto lleva hecho del entrenamiento.
 *
 * `planeadas` es la suma de `rutina_ejercicios.series` de la rutina, y
 * `registradas` son las filas que ya existen. Sirve para la barra de
 * arriba y para saber si ofrecer el botón de terminar.
 *
 * SE RECORTA AL TOTAL. Si alguien hace una serie de más —el entrenador
 * le dijo por WhatsApp que subiera una— el contador diría "13 de 12" y
 * eso se lee como un error de la app. Es el mismo criterio que la racha
 * de `plan.js`: mide si cumplió, no cuánto se pasó.
 */
export function progresoSesion (registradas = 0, planeadas = 0) {
  const hechas = Math.max(0, Number(registradas) || 0)
  const total = Math.max(0, Number(planeadas) || 0)

  return {
    hechas,
    total,
    mostradas: Math.min(hechas, total),
    // Sin nada planeado no hay nada que completar. Sin este caso, una
    // rutina vacía saldría como "completa" y ofrecería terminar un
    // entrenamiento que no existe.
    completo: total > 0 && hechas >= total,
    porcentaje: total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0
  }
}


/**
 * El texto que describe lo que pide el plan, para mostrarlo al lado.
 *
 * Sale de aquí y no del JSX para que la pantalla no tenga que saber
 * cuándo el objetivo es un rango y cuándo no.
 */
export function textoObjetivo (series, reps) {
  const n = Number(series) || 0
  const t = String(reps ?? '').trim()
  if (!n) return t
  return t ? `${n} × ${t}` : `${n} series`
}

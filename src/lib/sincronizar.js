/* =====================================================================
   sincronizar.js — subir lo que se hizo sin señal.
   =====================================================================

   Es la única parte de la Fase 8 que habla con la base. Lo que decide
   —el orden, a qué sesión apunta cada cosa, qué error significa "no hay
   red"— vive en `cola.js` y está probado; aquí solo se ejecuta.

   =====================================================================
   TRES REGLAS QUE NO SE PUEDEN CAMBIAR SIN ROMPER ALGO
   =====================================================================

   1. DE UNA EN UNA Y EN ORDEN. Nada de `Promise.all`. Las series
      necesitan el número de sesión que devuelve el insert anterior, así
      que en paralelo llegarían antes que la fila a la que apuntan.

   2. SE BORRA DESPUÉS DE QUE LA BASE CONFIRME, nunca antes. Un corte
      justo en medio deja la entrada puesta y se reintenta; al revés,
      perdería el entrenamiento. Que se pueda repetir es a propósito:
      las series van con `upsert` y terminar está protegido por el
      índice único de `06-sesiones.sql`.

   3. AL PRIMER FALLO DE RED SE PARA. Sin esto, quedarse sin señal a
      mitad de la cola haría cincuenta intentos fallidos seguidos y
      dejaría la mitad de las entradas marcadas como intentadas sin que
      ninguna hubiera llegado. Se para y se vuelve luego, con todo el
      resto intacto.
   ===================================================================== */

import { supabase } from './supabase.js'
import { leerCola, sacarDeLaCola } from './almacen.js'
import {
  ordenarCola, resolverSesion, esFalloDeRed, EMPEZAR, SERIE, TERMINAR
} from './cola.js'

/** Sube lo que haya pendiente.
 *
 *  Devuelve `{ subidas, quedan, cortadoPorRed }`. Quien llama lo usa
 *  para decir qué pasó — y para no decir nada cuando no había nada.
 */
export async function sincronizar (clienteId) {
  const pendientes = ordenarCola(await leerCola())
  if (pendientes.length === 0) return { subidas: 0, quedan: 0, cortadoPorRed: false }

  /* De clave local al número que le tocó en la base. Se llena durante
   * esta misma pasada: la sesión se inserta primero y las series de
   * después ya salen con su número de verdad. */
  const mapa = {}
  let subidas = 0

  for (const entrada of pendientes) {
    try {
      const hecho = await subirUna(entrada, clienteId, mapa)

      if (hecho === 'red') {
        // Regla 3: se para. Lo que queda sigue en la cola, entero.
        return { subidas, quedan: pendientes.length - subidas, cortadoPorRed: true }
      }

      /* `descartar` es para lo que NUNCA va a poder subir: una serie
       * cuya sesión no se sabe cuál es. Dejarla daría vueltas para
       * siempre y el aviso de "te falta subir" no se apagaría nunca. */
      await sacarDeLaCola(entrada.clave)
      if (hecho === 'ok') subidas += 1
    } catch (e) {
      // Un fallo raro no puede tumbar el resto de la cola.
      console.error('No se pudo subir una entrada de la cola:', entrada.clave, e)
      return { subidas, quedan: pendientes.length - subidas, cortadoPorRed: false }
    }
  }

  return { subidas, quedan: 0, cortadoPorRed: false }
}

/** Sube una. Devuelve 'ok', 'red' (parar) o 'descartar'. */
async function subirUna (entrada, clienteId, mapa) {
  if (entrada.tipo === EMPEZAR) {
    const { data, error } = await supabase
      .from('sesiones')
      .insert({
        cliente_id: clienteId,
        plan_dia_id: entrada.datos.plan_dia_id,
        rutina_id: entrada.datos.rutina_id,
        /* LA HORA REAL DEL MOMENTO, no la de ahora. Es lo que evita que
         * el entrenamiento del martes por la noche aparezca el
         * miércoles, y con él la racha de esa semana. La columna tiene
         * `default now()` justamente para el caso con señal; aquí se
         * manda a mano porque "ahora" es varias horas después. */
        iniciada_en: entrada.datos.iniciada_en
      })
      .select('id')
      .maybeSingle()

    if (error) return esFalloDeRed(error) ? 'red' : sonar(error, entrada)
    mapa[entrada.sesionLocal] = data.id
    return 'ok'
  }

  const sesionId = resolverSesion(entrada, mapa)
  if (sesionId == null) {
    /* No se puede saber a qué sesión iba. Pasa si la entrada de
     * "empezar" se descartó por un error de verdad: sin ella, esto no
     * tiene dónde colgarse y no lo va a tener nunca. */
    console.error('Entrada sin sesión a la que apuntar, se descarta:', entrada.clave)
    return 'descartar'
  }

  if (entrada.tipo === SERIE) {
    const { error } = await supabase
      .from('series_registradas')
      .upsert({
        sesion_id: sesionId,
        ejercicio_id: entrada.datos.ejercicio_id,
        serie: entrada.datos.serie,
        reps: entrada.datos.reps,
        peso_kg: entrada.datos.peso_kg
      }, { onConflict: 'sesion_id,ejercicio_id,serie' })

    if (error) return esFalloDeRed(error) ? 'red' : sonar(error, entrada)
    return 'ok'
  }

  if (entrada.tipo === TERMINAR) {
    const { error } = await supabase
      .from('sesiones')
      .update({
        completada: true,
        terminada_en: entrada.datos.terminada_en   // la de verdad, otra vez
      })
      .eq('id', sesionId)
      .eq('cliente_id', clienteId)     // regla 13

    if (error) {
      if (esFalloDeRed(error)) return 'red'
      /* 23505 es el índice único de 06-sesiones.sql: este día del plan
       * ya estaba completado. No es un fallo — es la protección haciendo
       * su trabajo, casi siempre porque esto ya se subió antes y el
       * borrado no llegó a correr. Se saca de la cola como lo que es:
       * algo que ya está. */
      if (error.code === '23505') return 'ok'
      return sonar(error, entrada)
    }
    return 'ok'
  }

  console.error('Tipo de entrada desconocido, se descarta:', entrada.tipo)
  return 'descartar'
}

/* Un error que NO es de red. Se descarta la entrada y queda en la
 * consola: dejarla la reintentaría para siempre en silencio, y el aviso
 * de "te falta subir" no se apagaría nunca sin que nadie supiera por
 * qué. Es la misma idea que `esFalloDeRed`: lo que está mal tiene que
 * verse, no acumularse. */
function sonar (error, entrada) {
  console.error('No se pudo subir (y no es la red), se descarta:',
                entrada.clave, error)
  return 'descartar'
}

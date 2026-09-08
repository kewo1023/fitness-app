/* =====================================================================
   cola.js — lo que se hizo sin señal y todavía no está en la base.
   =====================================================================

   El paso 1 de la Fase 8 dejó ver la rutina sin conexión. Esto es la
   otra mitad: poder ENTRENARLA. Empezar, anotar las series y terminar,
   con el celular sin una raya, y que todo aparezca solo cuando vuelva.

   =====================================================================
   POR QUÉ ESTO NO ES "SINCRONIZACIÓN" EN EL SENTIDO CARO
   =====================================================================

   No hay conflictos que resolver, y esa es la razón por la que esto
   cuesta lo que cuesta. Nadie más escribe las sesiones de un cliente:
   ni el entrenador, ni otro dispositivo salvo el suyo. La cola solo
   INSERTA. No hay que decidir quién gana porque nunca hay dos versiones
   de la misma fila.

   =====================================================================
   EL PROBLEMA DE VERDAD: EL ID QUE TODAVÍA NO EXISTE
   =====================================================================

   `sesiones.id` es `bigint generated always as identity`: lo pone
   Postgres al insertar. Y `series_registradas.sesion_id` lo necesita.

   O sea que sin señal no se puede anotar una serie "de la sesión 84",
   porque el 84 no existe todavía y no se puede inventar. Por eso una
   sesión creada sin conexión lleva una CLAVE LOCAL —un texto, no un
   número— y las series apuntan a esa clave. Al subir, se inserta la
   sesión primero, se guarda qué número le tocó, y las series se mandan
   ya con el número de verdad.

   Es todo el truco, y es la parte que hay que entender antes de tocar
   nada de aquí.
   ===================================================================== */

/* Los tres tipos de cosa que se pueden encolar. Son los tres momentos
 * del entrenamiento y no hay un cuarto. */
export const EMPEZAR  = 'sesion.empezar'
export const SERIE    = 'serie.guardar'
export const TERMINAR = 'sesion.terminar'

/** Una clave local para una sesión que todavía no tiene número.
 *
 *  El prefijo `local:` no es decorativo: hace imposible confundirla con
 *  un id de la base mirando el valor, que es exactamente el error que
 *  acabaría mandando la palabra "local:8f3a" a una columna bigint. */
export function nuevaClaveLocal (aleatorio = Math.random) {
  return 'local:' + Date.now().toString(36) + ':' +
         Math.floor(aleatorio() * 1e9).toString(36)
}

/* ---------------------------------------------------------------------
   QUÉ ERROR SIGNIFICA "NO HAY SEÑAL" Y CUÁL SIGNIFICA "ESTO ESTÁ MAL"
   ---------------------------------------------------------------------

   Es la decisión más importante de este archivo, y equivocarse tiene
   dos formas y las dos son malas:

     - Encolar lo que NO es un fallo de red esconde un problema de
       verdad. Un error de permisos guardado en la cola se reintenta
       para siempre, en silencio, y la persona cree que su
       entrenamiento está a salvo cuando no lo va a estar nunca.
     - No encolar un fallo de red de verdad pierde el entrenamiento, que
       es justo lo que esto viene a evitar.

   Así que la lista es corta y va por lo que SÍ es red. Cualquier otra
   cosa se muestra como error, que es lo que hace que se descubra. */
export function esFalloDeRed (error) {
  if (!error) return false

  // Sin `navigator` no hay nada que preguntar (pruebas, servidor).
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  const m = (error.message || '').toLowerCase()
  return m.includes('failed to fetch') ||
         m.includes('networkerror') ||
         m.includes('network request failed') ||
         m.includes('load failed')          // así lo dice Safari
}

/* ---------------------------------------------------------------------
   LAS ENTRADAS
   ---------------------------------------------------------------------
   `orden` es lo que mantiene el entrenamiento en su sitio: primero
   empezar, después las series, al final terminar. Es un número que solo
   sube, y se guarda en la propia entrada porque IndexedDB no promete
   devolver nada en el orden en que se escribió. */

let contador = 0

/** El siguiente número de orden. Lleva el reloj delante para que dos
 *  sesiones distintas del mismo celular no se mezclen si la app se
 *  reinició en medio y el contador volvió a cero. */
export function siguienteOrden (ahora = Date.now()) {
  contador += 1
  return ahora * 1000 + (contador % 1000)
}

export function entradaEmpezar (claveLocal, datos, ahora = Date.now()) {
  return {
    clave: claveLocal,
    tipo: EMPEZAR,
    orden: siguienteOrden(ahora),
    sesionLocal: claveLocal,
    datos
  }
}

export function entradaSerie (referencia, datos, ahora = Date.now()) {
  const local = esClaveLocal(referencia)
  return {
    /* La clave de la entrada ES la de la serie —sesión, ejercicio y
     * número— y no un valor suelto. Así, corregir una serie ya anotada
     * PISA la entrada anterior en vez de encolar dos, que al subir
     * escribirían dos veces y dejarían el valor viejo si el orden se
     * torciera. Es el mismo `unique (sesion_id, ejercicio_id, serie)`
     * de la tabla, aplicado en el celular. */
    clave: `serie:${referencia}:${datos.ejercicio_id}:${datos.serie}`,
    tipo: SERIE,
    orden: siguienteOrden(ahora),
    sesionLocal: local ? referencia : null,
    sesionId: local ? null : referencia,
    datos
  }
}

export function entradaTerminar (referencia, datos, ahora = Date.now()) {
  const local = esClaveLocal(referencia)
  return {
    // Una sola por sesión: terminar dos veces es terminar una vez.
    clave: `terminar:${referencia}`,
    tipo: TERMINAR,
    orden: siguienteOrden(ahora),
    sesionLocal: local ? referencia : null,
    sesionId: local ? null : referencia,
    datos
  }
}

export function esClaveLocal (referencia) {
  return typeof referencia === 'string' && referencia.startsWith('local:')
}

/** El orden en que hay que subirlas. */
export function ordenarCola (entradas) {
  return [...(entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

/** A qué sesión de la base apunta esta entrada, ya con lo que se subió
 *  en esta misma pasada.
 *
 *  Devuelve null cuando no se puede saber, y quien llama TIENE que
 *  parar: mandar una serie con `sesion_id` nulo la rechaza la base por
 *  la llave foránea, y reintentarlo no lo va a arreglar nunca. */
export function resolverSesion (entrada, mapa = {}) {
  if (!entrada) return null
  if (entrada.sesionId != null) return entrada.sesionId
  if (entrada.sesionLocal && mapa[entrada.sesionLocal] != null) {
    return mapa[entrada.sesionLocal]
  }
  return null
}

/** Qué hay pendiente, en palabras. Va en el aviso de la pantalla.
 *
 *  SE CUENTAN LAS SERIES Y LOS ENTRENAMIENTOS POR SEPARADO porque no
 *  pesan lo mismo: "3 cosas por subir" no le dice a nadie si lo que está
 *  en riesgo es un dato suelto o el entrenamiento entero. */
export function resumenCola (entradas) {
  const lista = entradas || []
  if (lista.length === 0) return null

  const sesiones = lista.filter(e => e.tipo === EMPEZAR).length
  const series = lista.filter(e => e.tipo === SERIE).length

  const partes = []
  if (sesiones) partes.push(sesiones === 1 ? '1 entrenamiento' : `${sesiones} entrenamientos`)
  if (series) partes.push(series === 1 ? '1 serie' : `${series} series`)
  // Solo un "terminar" pendiente, sin nada más: pasa si se empezó con
  // señal y se terminó sin ella.
  if (partes.length === 0) return 'Te falta subir el final de tu entrenamiento.'

  return `Te falta subir ${partes.join(' y ')}.`
}

/* ---------------------------------------------------------------------
   EN QUÉ ESTADO ESTÁ EL ENTRENAMIENTO DE HOY, MIRANDO LA COLA
   ---------------------------------------------------------------------

   El paquete del disco se guardó la última vez que hubo señal, así que
   no sabe nada de lo que se hizo después. Sin esto pasa lo siguiente, y
   es el escenario normal y no uno raro:

     Entrenas sin señal. Cierras la app entre un ejercicio y otro —que
     es lo que hace todo el mundo. La vuelves a abrir, todavía sin
     señal, y la pantalla dice que no has empezado.

   Y no es solo que se vea mal: volver a darle a "empezar" encolaría una
   SEGUNDA sesión con otra clave local, y al subir quedarían dos
   entrenamientos del mismo día. El índice único de `06-sesiones.sql`
   frena el segundo al completarlo, pero para entonces las series ya
   están repartidas entre dos sesiones.

   Así que el estado de hoy es lo guardado MÁS lo que haya en la cola,
   en ese orden. */
export function estadoDeSesion (entradas, planDiaId, sesionGuardada = null) {
  const lista = ordenarCola(entradas)

  /* De dónde sale la sesión: la que ya venía en el paquete (empezó con
   * señal) o una que se encoló después (empezó sin ella). */
  let sesion = sesionGuardada
  if (!sesion && planDiaId != null) {
    const empezada = lista.find(
      e => e.tipo === EMPEZAR && e.datos && e.datos.plan_dia_id === planDiaId
    )
    if (empezada) {
      sesion = {
        id: empezada.sesionLocal,
        completada: false,
        iniciada_en: empezada.datos.iniciada_en
      }
    }
  }

  if (!sesion) return null

  // Y encima, si se terminó sin señal, terminada está.
  const cerrada = lista.some(
    e => e.tipo === TERMINAR &&
         (e.sesionLocal === sesion.id || e.sesionId === sesion.id)
  )

  return cerrada ? { ...sesion, completada: true } : sesion
}

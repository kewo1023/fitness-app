/* =====================================================================
   almacen.js — el disco del celular. La fontanería, nada más.
   =====================================================================

   Aquí no se decide nada: qué se guarda y cuándo deja de servir vive en
   `paquete.js`, que sí se puede probar. Esto solo abre, escribe, lee y
   borra.

   POR QUÉ INDEXEDDB Y NO `localStorage`. Dos razones, y la segunda es
   la que manda:

     1. `localStorage` guarda texto y tiene un techo de unos 5 MB. Un
        plan con sus rutinas cabe de sobra, pero la cola de series de la
        Fase 8 crece con cada entrenamiento sin señal.
     2. `localStorage` es SÍNCRONO: cada lectura y cada escritura congela
        la pantalla hasta que el disco conteste. En un celular de gama
        baja —que es el de la mayoría de los clientes— eso se siente.

   =====================================================================
   TODO FALLA EN SILENCIO, Y ES A PROPÓSITO
   =====================================================================

   IndexedDB no siempre está. En modo privado algunos navegadores la
   apagan, el disco se puede llenar, y Safari borra lo guardado de sitios
   que no se visitan en semanas.

   Ninguno de esos casos puede tumbar la app: guardar es una comodidad,
   no el camino principal. Si falla, la app funciona igual — con señal.
   Por eso cada función devuelve `null` o `false` en vez de lanzar, y
   quien llama no tiene que envolver nada en un `try`.
   ===================================================================== */

const BASE = 'entrena'
const VERSION_BASE = 1

/* Dos almacenes. El segundo todavía no se usa: lo va a llenar la cola
 * de "entrenar sin señal". Se crea ahora porque agregar un almacén
 * después obliga a subir la versión de la base y a escribir una
 * migración, y crearlo vacío no cuesta nada. */
const PAQUETES = 'paquetes'
const COLA = 'cola'

/* UNA SOLA LLAVE, y esto es una decisión de privacidad, no de
 * comodidad. Guardando por cliente, el celular acabaría con el plan de
 * cada persona que haya entrado alguna vez, cada uno esperando en su
 * casilla. Con una sola, entrar con otra cuenta PISA lo anterior y en
 * el aparato nunca hay más de una persona. */
const LLAVE = 'hoy'

function hayIndexedDB () {
  return typeof indexedDB !== 'undefined' && indexedDB !== null
}

function abrir () {
  return new Promise((resolver) => {
    if (!hayIndexedDB()) return resolver(null)

    let peticion
    try {
      peticion = indexedDB.open(BASE, VERSION_BASE)
    } catch (_) {
      return resolver(null)
    }

    peticion.onupgradeneeded = () => {
      const db = peticion.result
      if (!db.objectStoreNames.contains(PAQUETES)) db.createObjectStore(PAQUETES)
      if (!db.objectStoreNames.contains(COLA)) {
        db.createObjectStore(COLA, { keyPath: 'clave' })
      }
    }
    peticion.onsuccess = () => resolver(peticion.result)
    peticion.onerror = () => resolver(null)
    // Pasa cuando otra pestaña tiene la base abierta con otra versión.
    // Mejor seguir sin disco que dejar la promesa colgada para siempre.
    peticion.onblocked = () => resolver(null)
  })
}

function enTransaccion (db, almacen, modo, hacer) {
  return new Promise((resolver) => {
    let tx
    try {
      tx = db.transaction(almacen, modo)
    } catch (_) {
      return resolver(null)
    }
    const peticion = hacer(tx.objectStore(almacen))
    tx.oncomplete = () => resolver(peticion ? peticion.result : true)
    tx.onerror = () => resolver(null)
    tx.onabort = () => resolver(null)
  })
}

/** Guarda el paquete de `Hoy`. Devuelve si se pudo. */
export async function guardarPaquete (paquete) {
  const db = await abrir()
  if (!db) return false
  const r = await enTransaccion(db, PAQUETES, 'readwrite',
                                s => s.put(paquete, LLAVE))
  db.close()
  return r !== null
}

/** Lo último guardado, o null. Quien lo lee TIENE que pasarlo por
 *  `paqueteUtil` antes de pintarlo: esto no comprueba de quién es. */
export async function leerPaquete () {
  const db = await abrir()
  if (!db) return null
  const r = await enTransaccion(db, PAQUETES, 'readonly', s => s.get(LLAVE))
  db.close()
  return r || null
}

/** Vacía TODO lo guardado en este aparato.
 *
 *  Se llama al cerrar sesión, y eliminar la cuenta cierra sesión, así
 *  que el derecho de supresión de la Ley 1581 también pasa por aquí.
 *  Borrar la base entera y no almacén por almacén es a propósito: lo
 *  que se agregue mañana queda cubierto sin que nadie se acuerde. */
export function olvidarTodo () {
  return new Promise((resolver) => {
    if (!hayIndexedDB()) return resolver(false)
    let peticion
    try {
      peticion = indexedDB.deleteDatabase(BASE)
    } catch (_) {
      return resolver(false)
    }
    peticion.onsuccess = () => resolver(true)
    peticion.onerror = () => resolver(false)
    /* `onblocked` salta si queda otra pestaña con la base abierta. No se
     * espera: el borrado queda encolado y ocurre en cuanto se cierre.
     * Dejar la promesa colgada aquí congelaría el cierre de sesión. */
    peticion.onblocked = () => resolver(true)
  })
}

/* ---------------------------------------------------------------------
   LA COLA — lo que se hizo sin señal y todavía no está en la base
   ---------------------------------------------------------------------
   Qué va en cada entrada y en qué orden se suben vive en `cola.js`, que
   sí se puede probar. Esto solo escribe y lee.

   El almacén usa `keyPath: 'clave'`, así que `put` PISA la entrada que
   tenga la misma clave. No es un detalle: es lo que hace que corregir
   una serie ya anotada deje una sola cosa por subir en vez de dos. */

/** Mete o reemplaza una entrada. Devuelve si se pudo.
 *
 *  QUIEN LLAMA TIENE QUE MIRAR ESTO. Es la única función del archivo
 *  cuyo fallo no se puede tragar: si no se pudo encolar, el
 *  entrenamiento de alguien no está en ningún sitio, y decirle que
 *  quedó guardado sería mentirle. */
export async function encolar (entrada) {
  const db = await abrir()
  if (!db) return false
  const r = await enTransaccion(db, COLA, 'readwrite', s => s.put(entrada))
  db.close()
  return r !== null
}

/** Todo lo pendiente, sin ordenar. El orden lo pone `ordenarCola`. */
export async function leerCola () {
  const db = await abrir()
  if (!db) return []
  const r = await enTransaccion(db, COLA, 'readonly', s => s.getAll())
  db.close()
  return r || []
}

/** Saca una entrada, ya subida.
 *
 *  Se llama DESPUÉS de que la base confirme, nunca antes. Al revés, un
 *  corte en medio perdería el dato para siempre; así, lo peor que pasa
 *  es que se vuelva a intentar algo que ya estaba — y las tres
 *  operaciones aguantan repetirse (las series por su `upsert`, terminar
 *  por el índice único de 06-sesiones.sql). */
export async function sacarDeLaCola (clave) {
  const db = await abrir()
  if (!db) return false
  const r = await enTransaccion(db, COLA, 'readwrite', s => s.delete(clave))
  db.close()
  return r !== null
}

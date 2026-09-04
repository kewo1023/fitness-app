/* =====================================================================
   notificaciones.js — pedir el permiso y guardar la suscripción
   =====================================================================

   Lo que decide QUÉ se manda y A QUIÉN está en la base
   (`10-notificaciones.sql`). Este archivo hace lo único que solo puede
   hacer el navegador: pedirle permiso a la persona y conseguir la
   dirección a la que su celular escucha.

   =====================================================================
   EL PROBLEMA DEL IPHONE, QUE ES LA MITAD DE ESTE ARCHIVO
   =====================================================================

   En Android una app instalada recibe notificaciones y ya. En iPhone
   **solo funcionan si la app está agregada a la pantalla de inicio**
   (iOS 16.4 o superior): abierta en una pestaña de Safari, no hay
   notificaciones y no las va a haber.

   Y no hay ningún aviso automático que se lo diga a nadie: hay que ir a
   Compartir → Agregar a inicio, a mano, sabiendo que existe.

   Eso obliga a que la app distinga tres situaciones y NO las junte en
   un "no disponible":

     'listo'                 -> se puede pedir el permiso.
     'requiere-instalacion'  -> es un iPhone en el navegador. Hay que
                                explicarle cómo instalar la app, porque
                                después de hacerlo SÍ va a funcionar.
     'no-soportado'          -> este navegador no puede, y punto.

   Decirle "no disponible" a alguien del segundo grupo es cerrarle una
   puerta que estaba abierta. Y como el 95% de los clientes están en
   Android y el resto en iPhone, ese grupo no es un caso raro: es una
   parte real de la gente.
   ===================================================================== */


/**
 * Qué se puede hacer en este navegador.
 *
 * Recibe lo que ve del entorno en vez de mirarlo por su cuenta, para
 * poder probar las tres respuestas sin fingir un navegador entero. Los
 * valores reales los lee `entorno()`, aquí abajo.
 */
export function estadoDeSoporte ({ tieneSW, tienePush, esIOS, instalada } = {}) {
  // El iPhone se comprueba PRIMERO, y ese orden es la función entera.
  //
  // En un iPhone sin instalar, `tienePush` es falso — pero por una
  // razón que tiene arreglo. Si se mirara `tienePush` antes, ese caso
  // caería en 'no-soportado' y la app le diría que no se puede a
  // alguien que está a dos toques de que sí se pueda.
  if (esIOS && !instalada) return 'requiere-instalacion'

  if (!tieneSW || !tienePush) return 'no-soportado'

  return 'listo'
}


/** Lo que de verdad hay en este navegador. Se separa de la decisión de
 *  arriba porque esto no se puede probar y aquello sí. */
export function entorno () {
  if (typeof window === 'undefined') return {}

  const ua = window.navigator.userAgent || ''

  return {
    tieneSW: 'serviceWorker' in window.navigator,
    tienePush: 'PushManager' in window,

    /* El iPad se declara como Mac desde iPadOS 13, así que no basta con
     * buscar "iPad" en el user agent: se comprueba además si la pantalla
     * responde al tacto. Es el truco estándar y no hay uno mejor. */
    esIOS: /iPad|iPhone|iPod/.test(ua) ||
           (ua.includes('Macintosh') && 'ontouchend' in document),

    /* Instalada. Se comprueban las dos formas porque son de mundos
     * distintos: `display-mode` es el estándar y `navigator.standalone`
     * es lo de Safari, que es justo el que importa aquí. */
    instalada: window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
               window.navigator.standalone === true
  }
}


/**
 * La llave pública de VAPID, de texto a los bytes que pide el navegador.
 *
 * `pushManager.subscribe` no acepta la llave como texto: pide un
 * `Uint8Array`. Y la llave viaja en base64 "url-safe", que cambia dos
 * caracteres del base64 normal (`-` por `+` y `_` por `/`) y se come el
 * relleno del final.
 *
 * Es la función que más se copia mal de internet, y fallar aquí da un
 * error que no dice nada ("InvalidCharacterError"), así que va con sus
 * pruebas.
 */
export function llaveABytes (base64) {
  const texto = String(base64 || '').trim()
  if (!texto) throw new Error('Falta la llave pública de las notificaciones.')

  // El relleno hasta un múltiplo de 4, que es lo que `atob` exige.
  const relleno = '='.repeat((4 - (texto.length % 4)) % 4)
  const normal = (texto + relleno).replace(/-/g, '+').replace(/_/g, '/')

  const crudo = window.atob(normal)
  const bytes = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes
}


/**
 * La suscripción del navegador, en las tres columnas de la tabla.
 *
 * `subscription.toJSON()` devuelve `{ endpoint, keys: { p256dh, auth } }`
 * y la tabla las guarda separadas, porque el `endpoint` es la identidad
 * de la suscripción y lleva su índice único.
 */
export function aFilas (suscripcion, clienteId) {
  const j = typeof suscripcion?.toJSON === 'function'
    ? suscripcion.toJSON()
    : suscripcion

  if (!j?.endpoint || !j?.keys?.p256dh || !j?.keys?.auth) {
    throw new Error('La suscripción llegó incompleta.')
  }

  return {
    cliente_id: clienteId,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth
  }
}


/**
 * Pide el permiso y guarda la suscripción.
 *
 * EL PERMISO SE PIDE DESPUÉS DE UN TOQUE DE LA PERSONA, nunca al
 * cargar la app. Un navegador que ve el aviso aparecer solo lo entierra
 * o lo bloquea, y el permiso de notificaciones **solo se puede pedir
 * una vez**: si dice que no, el navegador no vuelve a preguntar y
 * recuperarlo exige ir a los ajustes del sistema. Por eso quien llama a
 * esto es un botón, y por eso al lado del botón está escrito para qué
 * es.
 *
 * Y ANTES DEL PERMISO DEL NAVEGADOR VA EL CONSENTIMIENTO DE LA LEY, que
 * son cosas distintas: el del navegador es técnico y el otro es la
 * autorización del titular. Lo guarda quien llama a esta función, en
 * `consentimientos`, y el envío lo vuelve a comprobar.
 */
export async function suscribir (supabase, clienteId, llavePublica) {
  const permiso = await window.Notification.requestPermission()
  if (permiso !== 'granted') return { ok: false, motivo: permiso }

  const registro = await window.navigator.serviceWorker.ready

  /* Si ya había una suscripción se REUSA en vez de crear otra. El mismo
   * celular suscrito dos veces recibiría todo dos veces — y aunque el
   * único del `endpoint` lo impide en la base, pedirla de nuevo sin
   * necesidad puede devolver una distinta y dejar la vieja huérfana. */
  const suscripcion = await registro.pushManager.getSubscription() ||
    await registro.pushManager.subscribe({
      /* Obligatorio en true, y no es una preferencia: los navegadores
       * rechazan una suscripción que se reserve el derecho de mandar
       * mensajes silenciosos. Toda notificación tiene que verse. */
      userVisibleOnly: true,
      applicationServerKey: llaveABytes(llavePublica)
    })

  const { error } = await supabase
    .from('suscripciones_push')
    .upsert(aFilas(suscripcion, clienteId), { onConflict: 'endpoint' })

  if (error) {
    console.error('No se pudo guardar la suscripción:', error)
    return { ok: false, motivo: 'guardado' }
  }

  return { ok: true }
}


/**
 * Apagar las notificaciones en este dispositivo.
 *
 * Se borra la fila Y se cancela la suscripción en el navegador. Las dos
 * cosas: borrar solo la fila dejaría al celular suscrito a un servicio
 * que ya no le escribe, y cancelar solo en el navegador dejaría en la
 * base una dirección muerta a la que se le escribiría todos los días
 * hasta acumular cinco fallos.
 *
 * El orden importa. Primero la base: si se cancela primero y falla el
 * borrado, queda una fila que ya no se puede identificar porque la
 * suscripción que tenía su endpoint ya no existe.
 */
export async function desuscribir (supabase, clienteId) {
  const registro = await window.navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()

  if (suscripcion) {
    const { error } = await supabase
      .from('suscripciones_push')
      .delete()
      .eq('cliente_id', clienteId)        // regla 13
      .eq('endpoint', suscripcion.endpoint)

    if (error) {
      console.error('No se pudo borrar la suscripción:', error)
      return { ok: false }
    }

    await suscripcion.unsubscribe()
  }

  return { ok: true }
}


/* Las tres franjas, con el texto que las explica.
 *
 * La hora que va al lado NO se inventa aquí: es la misma que devuelve
 * `hora_recordatorio()` en la base. Están escritas en los dos sitios
 * porque el usuario tiene que poder leerlas antes de elegir, y por eso
 * la prueba de este archivo comprueba que coincidan con el SQL. Si
 * alguna vez dejan de coincidir, la app le prometería una hora y le
 * llegaría otra. */
export const FRANJAS = [
  { clave: 'manana', nombre: 'En la mañana', hora: 6,  pie: 'Te avisamos a las 6:00 a.m.' },
  { clave: 'tarde',  nombre: 'En la tarde',  hora: 12, pie: 'Te avisamos a las 12:00 m.' },
  { clave: 'noche',  nombre: 'En la noche',  hora: 17, pie: 'Te avisamos a las 5:00 p.m.' }
]

/** La hora por defecto, para quien no ha dicho su franja. Es el `else`
 *  de `hora_recordatorio()` en `10-notificaciones.sql`. */
export const HORA_POR_DEFECTO = 7

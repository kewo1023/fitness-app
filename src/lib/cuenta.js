/* =====================================================================
   cuenta.js — qué se puede cambiar de tu registro, y qué pasó al
   cambiarlo.
   =====================================================================

   El nombre, el correo y la contraseña son las tres cosas que la
   persona escribió al entrar y que hasta el 8/09 no podía volver a
   tocar. Los datos de salud sí se editaban desde el primer día; su
   propio nombre, no.

   POR QUÉ LAS COMPROBACIONES VIVEN AQUÍ Y NO DENTRO DE LA PANTALLA.
   Porque las tres deciden si se manda o no una escritura que cambia
   cómo entra alguien a su cuenta, y eso se prueba sin fingir un
   navegador. Es la misma razón de `hayQueRecargarPerfil` en `acceso.js`
   y de `cruzarLogros` en `gamificacion.js`.

   NADA DE AQUÍ TOCA LA BASE. Recibe texto y devuelve un veredicto.
   ===================================================================== */

/** Lo mismo que pide el registro en `Acceso`. Si algún día cambia, que
 *  cambie en un solo sitio: dos mínimos distintos harían que una clave
 *  válida al crear la cuenta fuera inválida al cambiarla. */
export const CLAVE_MINIMA = 8

/* Deliberadamente flojo: un arroba, algo antes, algo después y un
 * punto. Validar correos "bien" con una expresión regular es un
 * problema sin final —hay direcciones legales que parecen falsas— y el
 * que manda es el servidor, que lo comprueba de verdad. Esto solo
 * atrapa el dedazo evidente antes de gastar una llamada. */
const PARECE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** ¿Se puede mandar este nombre? Devuelve el motivo, o null si sí.
 *
 *  La base lo tiene como `not null`, así que un nombre vacío no es un
 *  detalle de presentación: lo rechaza Postgres con un mensaje que no
 *  se le puede enseñar a nadie. */
export function revisarNombre (nuevo) {
  const n = (nuevo || '').trim()
  if (!n) return 'El nombre no puede quedar vacío.'
  if (n.length > 80) return 'Ese nombre es demasiado largo.'
  return null
}

/** ¿Cambió de verdad? Es OTRA pregunta que si es válido, y por eso va
 *  aparte: sin preguntarla, tocar "Guardar" sin haber tocado nada
 *  escribe igual en la base y contesta "Guardado" — mentira de las que
 *  no se notan, y una escritura por cada visita. */
export function cambioNombre (nuevo, actual) {
  return (nuevo || '').trim() !== (actual || '').trim()
}

/** ¿Se puede mandar este correo? */
export function revisarCorreo (nuevo, actual) {
  const c = (nuevo || '').trim()
  if (!c) return 'El correo no puede quedar vacío.'
  if (!PARECE_CORREO.test(c)) return 'Ese correo no parece estar bien escrito.'
  return null
}

export function cambioCorreo (nuevo, actual) {
  // Sin distinguir mayúsculas: los correos no las distinguen, y mandar
  // "Ana@x.com" teniendo "ana@x.com" haría que la app dijera "revisa tu
  // correo" por un cambio que no existe.
  return (nuevo || '').trim().toLowerCase() !== (actual || '').trim().toLowerCase()
}

/** ¿Se puede mandar esta contraseña? Se piden dos veces a propósito.
 *
 *  UN DEDAZO AQUÍ NO SE PUEDE DESHACER: el campo va oculto, así que
 *  nadie ve lo que escribió, y si se guarda con una letra de más la
 *  persona queda fuera de su propia cuenta sin saber por qué. En el
 *  formulario de entrar un dedazo solo cuesta reintentar; aquí cuesta
 *  la cuenta. */
export function revisarClave (nueva, repetida) {
  if (!nueva) return 'Escribe la contraseña nueva.'
  if (nueva.length < CLAVE_MINIMA) {
    return `La contraseña necesita al menos ${CLAVE_MINIMA} caracteres.`
  }
  if (nueva !== repetida) return 'Las dos contraseñas no son iguales.'
  return null
}

/* ---------------------------------------------------------------------
   QUÉ PASÓ AL CAMBIAR EL CORREO
   ---------------------------------------------------------------------

   Es la función más importante de este archivo y la menos obvia.

   Supabase tiene dos comportamientos según cómo esté configurado el
   proyecto, y desde el navegador se ven casi iguales:

     1. Con confirmación: NO cambia el correo todavía. Manda un enlace y
        deja la dirección nueva esperando en `new_email`. Quien no abra
        ese enlace sigue entrando con el correo viejo.
     2. Sin confirmación: lo cambia en el acto.

   Decir "listo" en el caso 1 es el error caro: la persona cree que su
   correo cambió, cierra sesión, y al volver no puede entrar porque el
   que sirve es el otro — el que acaba de dar por viejo.

   `new_email` es lo que separa los dos casos, y por eso esto es una
   función con pruebas y no un `if` dentro de la pantalla. */
export function resultadoDeCambioDeCorreo (usuario) {
  const pendiente = usuario && usuario.new_email

  if (pendiente) {
    return {
      estado: 'pendiente',
      correoEnUso: usuario.email,
      mensaje: `Te mandamos un enlace a ${pendiente}. Ábrelo desde ese ` +
               'correo para terminar el cambio. Mientras tanto sigues ' +
               `entrando con ${usuario.email}.`
    }
  }

  return {
    estado: 'hecho',
    correoEnUso: usuario ? usuario.email : null,
    mensaje: 'Listo. A partir de ahora entras con ese correo.'
  }
}

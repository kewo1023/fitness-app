/* =====================================================================
   consentimientos.js — los textos de las autorizaciones y su versión.
   =====================================================================

   POR QUÉ ESTO ES CÓDIGO Y NO UN PDF.

   La Ley 1581 de 2012 no pide "un documento de política de datos". Pide
   que la persona autorice, informada, ANTES de que trates sus datos. Y
   pide algo que casi nadie hace: **finalidades separadas.** Una sola
   casilla que diga "acepto todo" no es autorización válida, porque no
   se puede aceptar una cosa y rechazar otra.

   Por eso aquí hay cuatro autorizaciones distintas y cada una se guarda
   como su propia fila en la tabla `consentimientos`, con su fecha y su
   versión. Dos son necesarias para usar la app; dos son de verdad
   opcionales — y "de verdad" significa que decir que no NO bloquea nada.

   LA VERSIÓN es lo que hace que esto sirva de prueba. Si mañana cambia
   el texto, se sube el número: las autorizaciones viejas siguen
   diciendo a qué se dio permiso EN SU MOMENTO, y las nuevas dicen otra
   cosa. Sin versión, un texto reescrito borraría hacia atrás el
   significado de todos los "sí" ya dados.

   Analogía de Excel: es como guardar el archivo con la fecha en el
   nombre en vez de sobrescribirlo. Cuando alguien pregunte "¿a qué
   dije que sí en septiembre?", hay una respuesta.

   CUÁNDO SE PIDE CADA UNA:
     - las dos primeras, al activar la cuenta
     - `datos_sensibles`, solo si la persona decide llenar sus datos de
       salud, en la pantalla "Mis datos". Se pide en el momento en que
       se van a dar los datos, no antes y en bloque con lo demás.
   ===================================================================== */

// Se sube cuando cambie cualquiera de los textos de abajo.
export const VERSION_CONSENTIMIENTO = '2026-09-02'

export const CONSENTIMIENTOS = {
  datos_personales: {
    titulo: 'Tratamiento de mis datos',
    texto: 'Autorizo guardar mi nombre, mi correo y mi actividad dentro ' +
           'de la app para poder usarla y para que mi entrenador vea mi ' +
           'progreso. Los datos se guardan en servidores en Estados ' +
           'Unidos.',
    obligatorio: true
  },

  descargo_ejercicio: {
    titulo: 'Sobre entrenar',
    texto: 'Entiendo que entrenar tiene riesgos, que decido hacerlo por ' +
           'mi cuenta y que si tengo alguna condición de salud debo ' +
           'consultarlo con un médico antes. La app no da diagnósticos ' +
           'ni tratamientos.',
    obligatorio: true
  },

  notificaciones: {
    titulo: 'Avisos',
    texto: 'Quiero recibir recordatorios del entrenamiento del día.',
    obligatorio: false
  },

  // Este no se muestra al activar. Va en "Mis datos", junto al
  // formulario que pide estos datos, porque preguntarlo antes de que
  // existan sería pedir permiso para nada.
  datos_sensibles: {
    titulo: 'Datos de salud',
    texto: 'Autorizo guardar mi peso, mi estatura, mi objetivo y mis ' +
           'lesiones para que mi entrenador pueda armar mi rutina. ' +
           'Responder esto es OPCIONAL: puedo dejarlo vacío y usar la ' +
           'app igual, y puedo borrarlo cuando quiera.',
    obligatorio: false
  }
}

/** Traduce los errores de Supabase, que vienen en inglés.
 *
 * Regla 3 de CLAUDE.md: lo que sale en pantalla lo leen el entrenador y
 * sus clientes. "Invalid login credentials" no le dice nada a nadie, y
 * además es texto técnico en otro idioma. El detalle exacto va a la
 * consola para quien tenga que depurarlo. */
export function mensajeDeError (error) {
  if (!error) return null
  const m = (error.message || '').toLowerCase()
  console.error('Error de Supabase:', error)

  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('user already registered') ||
      m.includes('already been registered'))   return 'Ya hay una cuenta con ese correo. Entra en vez de crear una.'
  if (m.includes('password should be at least')) return 'La contraseña es muy corta.'
  if (m.includes('unable to validate email'))  return 'Ese correo no parece estar bien escrito.'
  if (m.includes('rate limit') ||
      m.includes('too many requests'))         return 'Demasiados intentos seguidos. Espera un momento.'
  if (m.includes('failed to fetch') ||
      m.includes('networkerror'))              return 'No hay conexión. Revisa tus datos o el wifi.'

  // Los que vienen de nuestras funciones (03-funciones.sql) ya están
  // escritos en español y pensados para leerse: se muestran tal cual.
  if (error.message && /[áéíóúñ¿]/i.test(error.message)) return error.message

  return 'Algo salió mal. Intenta de nuevo.'
}

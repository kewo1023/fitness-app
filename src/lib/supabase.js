/* =====================================================================
   supabase.js — la conexión con la base de datos.
   =====================================================================

   Un solo objeto para toda la app, creado una vez. Si cada pantalla
   creara el suyo, cada una tendría su propia idea de quién inició
   sesión, y la app se contradiría a sí misma.

   Analogía de Excel: es la conexión de datos externa del libro. La
   defines una vez en un sitio y todas las hojas consultan por ahí; no
   abres una conexión nueva en cada celda.

   QUÉ ES LA LLAVE QUE VA AQUÍ, porque asusta verla en el código:
   la `publishable` está hecha para vivir dentro del navegador de
   cualquiera. No es una contraseña: solo dice "soy esta app". Lo que
   separa los datos de un cliente de los de otro son las políticas de
   RLS que corren dentro de Postgres (supabase/02-politicas.sql), y esas
   no se pueden saltar desde afuera por más que se tenga la llave.

   La que NUNCA puede aparecer aquí es la `secret`. Esa sí ignora todas
   las políticas. Si algún día alguien la pega en un archivo del
   proyecto, no basta con borrarla: hay que rotarla en Supabase.
   ===================================================================== */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/* Falla temprano y en claro.
 *
 * Sin esto, faltar una variable no da error: da un cliente a medias que
 * responde "Failed to fetch" en cada consulta, desde cualquier
 * pantalla, sin decir por qué. Es el error más caro de diagnosticar al
 * conectar una base por primera vez — y el caso típico es haber puesto
 * las variables en el computador y haber olvidado ponerlas en Vercel.
 *
 * El mensaje va a la CONSOLA, no a la pantalla: quien abre la app es el
 * entrenador o un cliente, y "VITE_SUPABASE_URL" no significa nada para
 * ellos (regla 3 de CLAUDE.md). */
if (!url || !llave) {
  throw new Error(
    'Faltan las credenciales de Supabase. En local van en .env.local; ' +
    'en Vercel, en Settings -> Environment Variables. Las dos empiezan ' +
    'por VITE_ y hay que volver a desplegar despues de agregarlas.'
  )
}

// Un error frecuente al copiar del panel: pegar el endpoint REST
// (termina en /rest/v1/) en vez de la URL del proyecto. La libreria
// agrega esa parte sola, asi que con la cola pegada TODAS las consultas
// irian a /rest/v1/rest/v1/... y devolverian 404 sin explicar nada.
if (/\/rest\/v\d/.test(url)) {
  throw new Error(
    'VITE_SUPABASE_URL tiene /rest/v1/ al final. Debe ser solo ' +
    'https://TU-PROYECTO.supabase.co'
  )
}

export const supabase = createClient(url, llave, {
  auth: {
    // La sesión sobrevive a cerrar la app. Es lo que hace que un
    // cliente entre una vez y no vuelva a ver la pantalla de acceso:
    // esta app se abre en el gimnasio, con el celular en la mano, y
    // pedir la contraseña cada vez sería motivo suficiente para dejar
    // de usarla.
    persistSession: true,
    autoRefreshToken: true,

    // La app no usa enlaces mágicos por correo ni entrada con Google,
    // así que no hay nada que leer de la URL al abrir. Apagarlo evita
    // que la librería se quede mirando el # de la dirección en cada
    // arranque.
    detectSessionInUrl: false
  }
})

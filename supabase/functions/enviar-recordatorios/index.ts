/* =====================================================================
   enviar-recordatorios — la única parte de la app que corre en un
   servidor.
   =====================================================================

   La dispara `pg_cron` una vez por hora (ver PASOS-FASE-7.md). Pregunta
   a la base a quién le toca un recordatorio en ESTA hora de Bogotá,
   cifra el mensaje y lo entrega al servicio de push del navegador de
   cada persona.

   =====================================================================
   LO QUE ESTE ARCHIVO **NO** DECIDE
   =====================================================================

   A quién se le manda. Eso lo decide `destinatarios_push()` en
   `10-notificaciones.sql`: quién tiene rutina hoy, quién ya entrenó,
   quién dijo que sí a las notificaciones y a qué hora entrena cada uno.

   Es la misma regla de la capa de analítica y por la misma razón: lo
   que decide algo sobre una persona vive en la base, donde se puede
   leer, probar y auditar con una consulta. Aquí solo se cifra y se
   manda. Si mañana hay que cambiar a qué hora le llega a quien entrena
   de noche, se cambia una función SQL y no se despliega nada.

   =====================================================================
   POR QUÉ `jsr:@negrel/webpush` Y NO EL `web-push` DE NPM
   =====================================================================

   El de npm es de Node: arrastra `crypto` y `https` de Node y no está
   pensado para Deno, que es lo que corre aquí. Este implementa los
   mismos RFC (8291 para el cifrado, 8292 para VAPID) sobre la Web
   Crypto API, que Deno tiene nativa. Sin capas de compatibilidad en el
   medio.

   =====================================================================
   LOS TRES SECRETOS, Y NINGUNO ESTÁ EN ESTE REPOSITORIO
   =====================================================================

   Se configuran con `supabase secrets set` (PASOS-FASE-7.md):

     VAPID_KEYS      el par de llaves, en JSON. La PRIVADA firma cada
                     envío: quien la tenga puede mandarle notificaciones
                     a los clientes haciéndose pasar por la app.
     CONTACTO_PUSH   un mailto:. Lo exige el RFC 8292 para que Google o
                     Mozilla puedan avisar si algo va mal.
     CRON_SECRETO    ver abajo, y no es opcional.

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase
   solo. La de servicio se salta el RLS, que es justo lo que hace falta
   aquí y justo por lo que esta función tiene que estar cerrada.
   ===================================================================== */

import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/* La zona horaria de toda la app. Aquí se usa para saber qué hora es en
 * Bogotá, que es la pregunta que se le hace a la base. El servidor
 * corre en UTC y el cron también: sin esta conversión, a la gente le
 * llegaría el recordatorio cinco horas antes. */
const ZONA = 'America/Bogota'

function horaEnBogota (): number {
  const texto = new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA, hour: 'numeric', hour12: false
  }).format(new Date())
  // El 24 existe: algunos entornos formatean la medianoche como "24".
  return Number(texto) % 24
}

/* El texto que va a leer la persona. Está aquí y no en SQL porque es
 * texto de interfaz, y la regla 3 vale igual en una notificación: nada
 * de tablas, de "sesiones" ni de nombres técnicos.
 *
 * Se arma con los datos que devolvió la base, no con lógica propia. */
function mensaje (d: Destinatario) {
  if (d.motivo === 'racha') {
    const faltan = d.faltan ?? 0
    return {
      titulo: 'Te falta poco para cerrar la semana',
      cuerpo: faltan === 1
        ? 'Con un entrenamiento más cumples tu meta de esta semana.'
        : `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} para cumplir tu meta de esta semana.`
    }
  }

  return {
    titulo: `Hoy te toca ${d.rutina}`,
    cuerpo: `${d.nombre.split(' ')[0]}, tu entrenamiento de hoy está listo en la app.`
  }
}

interface Destinatario {
  cliente_id: string
  nombre: string
  motivo: 'entrenamiento' | 'racha'
  rutina: string | null
  faltan: number | null
  endpoint: string
  p256dh: string
  auth: string
}

Deno.serve(async (req: Request) => {
  /* =================================================================
     LA PUERTA. No es opcional y no se puede quitar "para probar".
     =================================================================

     Una Edge Function se invoca con la llave publicable, y esa llave
     vive dentro del navegador de todo el mundo: está en el JavaScript
     de la app, cualquiera la lee. Sin esta comprobación, cualquiera
     que abra la app puede disparar la función las veces que quiera.

     No mandaría notificaciones repetidas —de eso se encarga el único
     de `envios_push`— pero sí gastaría el cupo del proyecto y llenaría
     los registros. El secreto lo manda `pg_cron` en una cabecera.

     La comparación es la simple a propósito: aquí no hay un atacante
     midiendo microsegundos, hay una llave pública que no debería poder
     disparar esto. */
  const secreto = Deno.env.get('CRON_SECRETO')
  if (!secreto || req.headers.get('x-cron-secreto') !== secreto) {
    return new Response('No autorizado', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const vapidKeys = await webpush.importVapidKeys(
    JSON.parse(Deno.env.get('VAPID_KEYS')!),
    { extractable: false }
  )

  const servidor = await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get('CONTACTO_PUSH')!,
    vapidKeys
  })

  const hora = horaEnBogota()

  const { data, error } = await supabase.rpc('destinatarios_push', {
    p_hora: hora
  })

  if (error) {
    console.error('No se pudo pedir la lista de destinatarios:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  const destinatarios = (data ?? []) as Destinatario[]
  let enviados = 0
  let muertas = 0
  const fallos: string[] = []

  for (const d of destinatarios) {
    /* SE APUNTA ANTES DE MANDAR, NO DESPUÉS.
     *
     * Si se apuntara después y el envío se cayera a la mitad —o el
     * proceso se muriera entre el push y el insert— la próxima vuelta
     * del cron volvería a mandarlo. Apuntando primero, el peor caso es
     * que alguien no reciba una notificación; al revés, el peor caso
     * es que la reciba en bucle. Entre esos dos errores no hay
     * empate: el segundo hace que apague las notificaciones para
     * siempre, y eso no se recupera.
     *
     * El `duplicate key` que devuelve el único no es un error: es otra
     * vuelta del cron encontrándose con lo ya hecho. Se salta callando. */
    const { error: yaEnviado } = await supabase
      .from('envios_push')
      .insert({
        cliente_id: d.cliente_id,
        motivo: d.motivo,
        // El día en Bogotá, calculado igual que en la base.
        fecha: new Intl.DateTimeFormat('en-CA', {
          timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())
      })

    if (yaEnviado) {
      if (yaEnviado.code !== '23505') {
        console.error('No se pudo apuntar el envío:', yaEnviado)
      }
      continue
    }

    const { titulo, cuerpo } = mensaje(d)

    try {
      const suscriptor = servidor.subscribe({
        endpoint: d.endpoint,
        keys: { p256dh: d.p256dh, auth: d.auth }
      })

      await suscriptor.pushTextMessage(
        JSON.stringify({ titulo, cuerpo, url: '/' }),
        {}
      )
      enviados++

      /* Volvió a funcionar: se reinicia el contador de fallos. Sin
       * esto, cinco caídas del servicio de push repartidas en meses
       * apagarían una suscripción que está perfectamente viva.
       *
       * El `.gt('fallos', 0)` evita escribir en la base de todos los
       * que van bien, que son casi todos. */
      await supabase.from('suscripciones_push')
        .update({ fallos: 0, ultimo_fallo_en: null })
        .eq('endpoint', d.endpoint)
        .gt('fallos', 0)
    } catch (e) {
      /* 404 y 410 significan que esa dirección ya no existe: la app se
       * desinstaló o se borraron los datos del navegador. No es un
       * fallo temporal y no tiene sentido reintentarlo nunca más, así
       * que la fila se borra.
       *
       * Y borrarla es además lo correcto con la Ley 1581: un dato que
       * ya no sirve para su finalidad no se guarda "por si acaso". */
      const estado = (e as { response?: Response })?.response?.status
      if (estado === 404 || estado === 410) {
        await supabase.from('suscripciones_push')
          .delete().eq('endpoint', d.endpoint)
        muertas++
      } else {
        /* Cualquier otra cosa sí puede ser temporal —el servicio de
         * push caído, la red— así que solo se cuenta. A los cinco
         * seguidos, `destinatarios_push` deja de incluirla. */
        await supabase.rpc('sumar_fallo_push', { p_endpoint: d.endpoint })
        fallos.push(`${estado ?? 'sin estado'}`)
        console.error('No se pudo enviar:', e)
      }
    }
  }

  const resumen = { hora, candidatos: destinatarios.length, enviados, muertas, fallos: fallos.length }
  console.log('Recordatorios:', JSON.stringify(resumen))

  return new Response(JSON.stringify(resumen), {
    headers: { 'Content-Type': 'application/json' }
  })
})

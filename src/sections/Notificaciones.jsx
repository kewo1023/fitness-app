import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { VERSION_CONSENTIMIENTO, CONSENTIMIENTOS } from '../lib/consentimientos.js'
import {
  entorno, estadoDeSoporte, suscribir, desuscribir, FRANJAS, HORA_POR_DEFECTO
} from '../lib/notificaciones.js'

/* =====================================================================
   Notificaciones — el recordatorio del entrenamiento del día
   =====================================================================

   Esta pantalla se usa en DOS sitios: aquí, desde Perfil, y —cuando
   exista— dentro de la configuración inicial que ve alguien que acaba
   de canjear su código. Por eso el cuerpo está en un componente aparte
   (`Ajustes`, abajo) y esta pantalla solo lo envuelve.

   Es la razón de que se haya construido así desde el principio: si la
   configuración inicial fuera una copia de esta pantalla, el día que se
   agregue una franja habría que acordarse de tocar las dos.

   =====================================================================
   DOS PERMISOS DISTINTOS QUE LA GENTE CONFUNDE, Y NO SON LO MISMO
   =====================================================================

   1. EL DEL NAVEGADOR. Técnico. Lo pide el sistema con su propio aviso
      y **solo se puede pedir una vez**: si alguien dice que no, el
      navegador no vuelve a preguntar nunca y recuperarlo obliga a ir a
      los ajustes del teléfono.

      Por eso no se pide al abrir la app, sino después de que la persona
      toca un botón que dice para qué es. Un aviso que aparece solo se
      rechaza por reflejo, y ese reflejo no tiene vuelta atrás.

   2. EL DE LA LEY 1581. La autorización del titular, que ya existe
      desde la Fase 2 como `notificaciones` y es opcional de verdad.

   Se guardan los dos, y el envío comprueba el segundo en cada vuelta
   (`destinatarios_push` en 10-notificaciones.sql). Apagar aquí inserta
   un consentimiento nuevo que dice `false` — no se edita el viejo,
   porque esa tabla solo crece: lo que quedó registrado en su momento es
   la prueba de que hubo autorización.
   ===================================================================== */

export default function Notificaciones ({ perfil, alVolver }) {
  return (
    <Pantalla
      titulo="Avisos"
      bajada="El recordatorio de tu entrenamiento"
      accion={
        <button type="button" className="enlace" onClick={alVolver}>Volver</button>
      }
    >
      <Ajustes perfil={perfil} />
    </Pantalla>
  )
}


/* El cuerpo, sin encabezado. Lo reutiliza la configuración inicial. */
export function Ajustes ({ perfil, alTerminar }) {
  const [soporte, setSoporte] = useState(null)
  const [activas, setActivas] = useState(false)
  const [franja, setFranja] = useState(perfil.franja_entrenamiento || '')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setSoporte(estadoDeSoporte(entorno()))

      /* Si ya hay una fila suya, están activas. Se pregunta a la base y
       * no al navegador porque lo que decide si le llega algo es la
       * fila: un celular con permiso concedido pero sin fila no recibe
       * nada, y enseñar "activadas" ahí sería mentir. */
      const { data } = await supabase
        .from('suscripciones_push')
        .select('id')
        .eq('cliente_id', perfil.id)      // regla 13
        .limit(1)

      if (!vivo) return
      setActivas((data || []).length > 0)
    })()
    return () => { vivo = false }
  }, [perfil.id])

  async function encender () {
    setOcupado(true)
    setAviso(null)

    const llave = import.meta.env.VITE_VAPID_PUBLICA
    if (!llave) {
      // Regla 3: el texto no habla de variables de entorno. El detalle
      // técnico, a la consola.
      console.error('Falta VITE_VAPID_PUBLICA en el entorno.')
      setOcupado(false)
      setAviso({ tipo: 'error', texto: 'Los avisos no están disponibles todavía.' })
      return
    }

    try {
      const { ok, motivo } = await suscribir(supabase, perfil.id, llave)

      if (!ok) {
        setOcupado(false)
        setAviso({
          tipo: 'error',
          texto: motivo === 'denied'
            /* El caso que no se puede arreglar desde la app, y por eso
             * el texto dice dónde se arregla. Decir solo "no se pudo"
             * dejaría a la persona tocando un botón que nunca va a
             * funcionar. */
            ? 'Tu teléfono tiene bloqueados los avisos de esta app. Se cambia desde los ajustes del teléfono, en la sección de notificaciones.'
            : 'No se pudieron activar. Inténtalo otra vez.'
        })
        return
      }

      /* LA AUTORIZACIÓN DE LA LEY, con su versión. Va DESPUÉS de que la
       * suscripción quedó guardada: registrar que autorizó algo que
       * después falló dejaría un "sí" en la tabla sin nada detrás. */
      await supabase.from('consentimientos').insert({
        perfil_id: perfil.id,
        tipo: 'notificaciones',
        version: VERSION_CONSENTIMIENTO,
        aceptado: true
      })

      setActivas(true)
      setAviso({ tipo: 'ok', texto: 'Listo. Te avisamos el día que te toque entrenar.' })
    } catch (e) {
      console.error('No se pudieron activar los avisos:', e)
      setAviso({ tipo: 'error', texto: 'No se pudieron activar. Inténtalo otra vez.' })
    }
    setOcupado(false)
  }

  async function apagar () {
    setOcupado(true)
    setAviso(null)

    const { ok } = await desuscribir(supabase, perfil.id)
    if (!ok) {
      setOcupado(false)
      setAviso({ tipo: 'error', texto: 'No se pudieron apagar. Inténtalo otra vez.' })
      return
    }

    /* Se inserta el "no", no se borra el "sí". La tabla de
     * consentimientos solo crece: lo que quedó escrito es la prueba de
     * que en su momento autorizó, y borrarlo borraría esa prueba. */
    await supabase.from('consentimientos').insert({
      perfil_id: perfil.id,
      tipo: 'notificaciones',
      version: VERSION_CONSENTIMIENTO,
      aceptado: false
    })

    setActivas(false)
    setOcupado(false)
    setAviso({ tipo: 'ok', texto: 'Apagados. No te vamos a escribir más.' })
  }

  async function guardarFranja (valor) {
    setFranja(valor)
    const { error } = await supabase
      .from('perfiles')
      .update({ franja_entrenamiento: valor || null })
      .eq('id', perfil.id)              // regla 13

    if (error) {
      console.error('No se pudo guardar la franja:', error)
      setAviso({ tipo: 'error', texto: 'No se pudo guardar. Revisa la conexión.' })
    }
  }

  const elegida = FRANJAS.find(f => f.clave === franja)

  return (
    <>
      {aviso && (
        <p className={'aviso' + (aviso.tipo === 'error' ? ' es-error' : ' es-ok')}>
          {aviso.texto}
        </p>
      )}

      {/* EL IPHONE SIN INSTALAR. No se le dice "no disponible": se le
          dice cómo, porque después de instalar SÍ funciona. Los pasos
          van escritos y no en un enlace a una guía: quien está aquí
          está en el teléfono, no en un computador con dos pestañas. */}
      {soporte === 'requiere-instalacion' && (
        <section className="tarjeta">
          <h2 className="chico">Primero agrega la app a tu inicio</h2>
          <p className="meta">
            En iPhone los avisos solo llegan si abres esta app desde tu
            pantalla de inicio, no desde el navegador. Es un momento:
          </p>
          <ol className="pasos">
            <li>Toca el botón de <strong>Compartir</strong>, el cuadrito
                con la flecha hacia arriba.</li>
            <li>Baja y toca <strong>Agregar a inicio</strong>.</li>
            <li>Abre la app desde el icono que quedó y vuelve aquí.</li>
          </ol>
        </section>
      )}

      {soporte === 'no-soportado' && (
        <section className="tarjeta">
          <h2 className="chico">Este navegador no puede mandarte avisos</h2>
          <p className="meta">
            Puedes seguir usando la app igual. Si tienes otro teléfono a
            mano, prueba desde ahí.
          </p>
        </section>
      )}

      {soporte === 'listo' && (
        <section className="tarjeta">
          <h2 className="chico">
            {activas ? 'Los avisos están encendidos' : 'Recordatorio del entrenamiento'}
          </h2>
          {/* El texto del consentimiento, palabra por palabra el mismo
              que se guarda en la tabla. No se reescribe aquí "para que
              suene mejor": lo que la persona lee tiene que ser lo que
              queda registrado que autorizó. */}
          <p className="meta">{CONSENTIMIENTOS.notificaciones.texto}</p>
          <p className="pista">
            Solo el día que te toque entrenar, y solo si no lo has hecho
            todavía. Puedes apagarlos cuando quieras.
          </p>

          {activas ? (
            <button type="button" className="enlace" disabled={ocupado}
                    onClick={apagar}>
              {ocupado ? 'Un momento…' : 'Apagar los avisos'}
            </button>
          ) : (
            <button type="button" className="boton-principal" disabled={ocupado}
                    onClick={encender}>
              {ocupado ? 'Un momento…' : 'Activar los avisos'}
            </button>
          )}
        </section>
      )}

      {/* LA FRANJA SE PREGUNTA AUNQUE LOS AVISOS ESTÉN APAGADOS.
          Es un dato sobre cómo entrena, no sobre cómo quiere que le
          escriban, y el día que los encienda ya está contestado. */}
      <h3 className="titulillo">¿Cuándo entrenas normalmente?</h3>
      <p className="pista">
        Sirve para avisarte antes, no después. Si no lo dices, te
        escribimos a las {HORA_POR_DEFECTO}:00 de la mañana.
      </p>

      <ul className="lista">
        {FRANJAS.map(f => (
          <li key={f.clave}
              className={'fila' + (franja === f.clave ? ' es-elegida' : '')}>
            <span className="fila-datos">
              <strong>{f.nombre}</strong>
              <small>{f.pie}</small>
            </span>
            <button type="button" className="enlace enlace-fila"
                    onClick={() => guardarFranja(f.clave)}>
              {franja === f.clave ? 'Elegida' : 'Elegir'}
            </button>
          </li>
        ))}
      </ul>

      {elegida && (
        <button type="button" className="enlace"
                onClick={() => guardarFranja('')}>
          Quitar mi respuesta
        </button>
      )}

      {/* Solo aparece dentro de la configuración inicial, que es quien
          pasa `alTerminar`. Desde Perfil no hace falta: se sale con
          "Volver". */}
      {alTerminar && (
        <button type="button" className="boton-principal" onClick={alTerminar}>
          Continuar
        </button>
      )}
    </>
  )
}

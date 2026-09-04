import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearFecha } from '../data/fechas.js'
import { textoDesdeUltima, nivelDeAdherencia } from '../lib/analitica.js'
import { etiqueta } from '../lib/ejercicios.js'

/* =====================================================================
   Cómo van tus clientes — el panel de adherencia.
   =====================================================================

   ES LA FUNCIÓN QUE ÉL PIDIÓ SIN PEDIRLA. En el cuestionario del 1/09
   dijo que no se entera de si sus clientes entrenan y que pregunta dos
   o tres veces por semana. Esta pantalla es esa pregunta, contestada
   sola y sin tener que escribirle a nadie.

   Responde en este orden, que es el orden de lo que puede hacer con la
   respuesta:

     1. A QUIÉN LE ESCRIBO HOY  -> la lista, ordenada por quien lleva
                                   más tiempo sin aparecer.
     2. ¿LA APP ESTÁ SIRVIENDO? -> la retención semana a semana.
     3. ¿QUÉ NO ESTÁN HACIENDO? -> los ejercicios más saltados.
     4. ¿CUÁNDO LES ESCRIBO?    -> las franjas horarias.

   =====================================================================
   AQUÍ NO SE CALCULA NADA, Y ESO ES EL DISEÑO
   =====================================================================

   Los cuatro bloques son cuatro llamadas a funciones de Postgres
   (`08-analitica.sql` y `09-series.sql`). El navegador no descarga ni
   una sesión.

   No es elegancia: son datos de salud de quince personas. Calcular la
   adherencia en el navegador obligaría a bajarse el historial completo
   de TODOS los clientes a un celular para producir un porcentaje. Menos
   dato viajando es menos dato expuesto, y aquí lo que viaja es el
   número ya hecho.

   Y hay una segunda razón, la del 2/09: las funciones comprueban
   `es_admin()` DENTRO de la base. Que esta pantalla solo se muestre con
   rol admin es comodidad, no seguridad — quien tenga el navegador puede
   reescribir esa condición. Si un cliente llegara hasta aquí a la
   fuerza, las cuatro llamadas le responderían "Solo un administrador…".
   ===================================================================== */

/* Cuatro semanas porque él trabaja en ciclos de cuatro (bitácora, 1/09).
 * La ventana de la adherencia coincide con la del plan, así que el
 * porcentaje se lee como "cómo va en ESTE ciclo" y no como un promedio
 * de una ventana arbitraria. */
const SEMANAS_ADHERENCIA = 4

/* Ocho para la retención, que es el doble: la retención se mira para
 * ver una tendencia, y una tendencia de cuatro puntos no es una
 * tendencia. */
const SEMANAS_RETENCION = 8

/* Los saltados miran la misma ventana que la retención. Con cuatro
 * semanas y quince clientes, un ejercicio programado tres veces daría
 * porcentajes de 33 en 33: demasiado grueso para decidir nada. */
const SEMANAS_SALTADOS = 8

export default function PanelClientes ({ alVolver }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [clientes, setClientes] = useState([])
  const [retencion, setRetencion] = useState([])
  const [horas, setHoras] = useState([])
  const [saltados, setSaltados] = useState([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [a, r, h, s] = await Promise.all([
        supabase.rpc('adherencia_clientes', { p_semanas: SEMANAS_ADHERENCIA }),
        supabase.rpc('retencion_semanal',   { p_semanas: SEMANAS_RETENCION }),
        supabase.rpc('horas_tipicas'),
        supabase.rpc('ejercicios_saltados', { p_semanas: SEMANAS_SALTADOS })
      ])

      if (!vivo) return

      /* Los mensajes de nuestras funciones ya vienen escritos en
       * español y pensados para leerse (regla 3): se muestran tal cual.
       * El detalle técnico va a la consola, no a la pantalla.
       *
       * Y los saltados quedan FUERA de esta comprobación a propósito:
       * son la última función que se agregó (archivo 09) y la única que
       * puede no existir todavía en una base que no lo haya corrido.
       * Que falte esa sección no puede tumbar las otras tres, que sí
       * están. */
      const fallo = a.error || r.error || h.error
      if (fallo) {
        console.error('No se pudo leer el panel:', fallo)
        setError(fallo.message && /[áéíóúñ¿]/i.test(fallo.message)
          ? fallo.message
          : 'No se pudo cargar. Revisa la conexión e inténtalo otra vez.')
        setCargando(false)
        return
      }

      setClientes(a.data || [])
      setRetencion(r.data || [])
      setHoras(h.data || [])
      if (s.error) console.error('No se pudieron leer los saltados:', s.error)
      setSaltados(s.error ? null : (s.data || []))
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [])

  const volver = (
    <button type="button" className="enlace" onClick={alVolver}>Volver</button>
  )

  if (cargando) {
    return (
      <Pantalla titulo="Cómo van tus clientes" accion={volver}>
        <p className="meta">Cargando…</p>
      </Pantalla>
    )
  }

  if (error) {
    return (
      <Pantalla titulo="Cómo van tus clientes" accion={volver}>
        <p className="aviso es-error">{error}</p>
      </Pantalla>
    )
  }

  const topeRetencion = Math.max(1, ...retencion.map(r => r.activos))
  const topeHoras = Math.max(1, ...horas.map(h => h.sesiones))

  return (
    <Pantalla
      titulo="Cómo van tus clientes"
      bajada={`Últimas ${SEMANAS_ADHERENCIA} semanas`}
      accion={volver}
    >
      {clientes.length === 0 && (
        <section className="tarjeta">
          <h2 className="chico">Todavía no hay a quién medir</h2>
          <p className="meta">
            Esta lista muestra a los clientes que tienen un plan activo.
            Asígnale uno a alguien desde tu biblioteca y aparece aquí.
          </p>
        </section>
      )}

      {clientes.length > 0 && (
        <>
          {/* EL ORDEN LO DA LA BASE, y es el de quién lleva más tiempo
              sin venir. No se reordena aquí: la lista está pensada para
              leerse de arriba abajo y parar cuando ya no haga falta
              llamar a nadie más. */}
          <ul className="lista">
            {clientes.map(c => {
              const nivel = nivelDeAdherencia(c.adherencia)
              return (
                <li key={c.cliente_id} className="fila">
                  <span className="fila-datos">
                    <strong>{c.nombre}</strong>
                    <small>
                      {textoDesdeUltima(c.dias_sin_venir)}
                      {' · '}
                      {c.dias_hechos} de {c.dias_esperados} días
                    </small>
                  </span>
                  <span className={`marca es-${nivel.clave}`}>
                    {c.adherencia === null ? '—' : `${c.adherencia}%`}
                    <small>{nivel.texto}</small>
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="pista">
            El porcentaje es contra la meta de cada uno, no contra un
            número igual para todos: quien entrena dos días a la semana y
            los cumple está al 100%.
          </p>
        </>
      )}

      <h3 className="titulillo">
        Cuánta gente viene <span className="tenue">por semana</span>
      </h3>

      <section className="semanas" aria-hidden="true">
        {retencion.map(r => (
          <span key={r.lunes} className="semana">
            <span className="semana-barra"
                  style={{ '--alto': `${Math.round((r.activos / topeRetencion) * 100)}%` }} />
            <small>{formatearFecha(r.lunes).split(' ')[0]}</small>
          </span>
        ))}
      </section>

      <ul className="lista oculto-visual">
        {retencion.map(r => (
          <li key={r.lunes}>
            Semana del {formatearFecha(r.lunes)}: {r.activos} clientes,
            {' '}{r.sesiones} entrenamientos.
          </li>
        ))}
      </ul>

      <p className="meta">
        {retencion.length > 0 && (() => {
          const ultima = retencion[retencion.length - 1]
          return ultima.activos === 0
            ? 'Esta semana no ha entrenado nadie todavía.'
            : `Esta semana han entrenado ${ultima.activos} ` +
              `${ultima.activos === 1 ? 'persona' : 'personas'}.`
        })()}
      </p>

      {/* LOS EJERCICIOS QUE SE SALTAN. Es la cuarta métrica y la última
          que llegó, porque hasta que existió la pantalla de registrar
          series no había con qué calcularla.

          `saltados` en null significa que la función no respondió —una
          base sin el archivo 09 corrido—. La sección no se pinta y el
          detalle queda en la consola: mejor que no esté a que muestre
          una lista vacía que se leería como "no se salta nada". */}
      {saltados !== null && (
        <>
          <h3 className="titulillo">
            Lo que se saltan <span className="tenue">últimas {SEMANAS_SALTADOS} semanas</span>
          </h3>

          {saltados.length === 0 ? (
            <p className="meta">
              De lo que programaste, tus clientes no se están saltando
              nada. Esto solo cuenta los entrenamientos en los que
              anotaron sus series.
            </p>
          ) : (
            <>
              <ul className="lista">
                {saltados.map(e => (
                  <li key={e.ejercicio_id} className="fila">
                    <span className="fila-datos">
                      <strong>{e.nombre}</strong>
                      <small>
                        {etiqueta(e.grupo)} · lo programaste {e.programado}
                        {e.programado === 1 ? ' vez' : ' veces'}
                      </small>
                    </span>
                    <span className="marca es-flojo">
                      {e.porcentaje}%
                      <small>se lo saltan</small>
                    </span>
                  </li>
                ))}
              </ul>

              {/* SIN ESTA FRASE EL NÚMERO SE MALINTERPRETA, y es la
                  diferencia entre que le sirva y que le haga cambiar
                  algo que estaba bien. Un ejercicio muy saltado casi
                  nunca es gente floja: es que no se entiende, o pide un
                  equipo que no tienen en la casa. */}
              <p className="pista">
                Un ejercicio que se salta mucha gente suele ser uno que no
                se entiende o que pide algo que no tienen a mano, no gente
                sin ganas. Solo cuenta los entrenamientos en los que
                anotaron series.
              </p>
            </>
          )}
        </>
      )}

      <h3 className="titulillo">A qué hora entrenan</h3>

      <ul className="lista">
        {horas.map(f => (
          <li key={f.franja} className="fila">
            <span className="fila-datos">
              <strong>{f.franja}</strong>
              <small>{etiquetaFranja(f.desde)}</small>
            </span>
            <span className="barra-fila">
              <span className="barra-relleno"
                    style={{ '--ancho': `${Math.round((f.sesiones / topeHoras) * 100)}%` }} />
              <small>{f.sesiones}</small>
            </span>
          </li>
        ))}
      </ul>

      {/* POR QUÉ ESTO NO DICE QUIÉN. No es una limitación técnica: es
          una decisión, y va escrita en pantalla para que se sepa que es
          a propósito y no un dato que falta.

          Lo que tus clientes autorizaron es que veas su PROGRESO. La
          hora a la que cada uno entra al gimnasio todos los días es su
          rutina de vida, y saberla persona por persona no te ayuda a
          programar mejor a nadie. Agregado sirve igual. */}
      <p className="pista">
        Esto va sin nombres a propósito. Sirve para saber cuándo mandar
        un recordatorio, no para saber a qué hora entrena cada persona.
      </p>
    </Pantalla>
  )
}

/* La hora en palabras, para que la franja no dependa de que alguien
 * recuerde qué es "Tarde". Sale del `desde` que devuelve la base, así
 * que si allá se cambian los cortes, esto los sigue solo. */
function etiquetaFranja (desde) {
  const FIN = { 4: '8 a.m.', 8: '12 m.', 12: '6 p.m.', 18: '11 p.m.' }
  const INICIO = { 4: '4 a.m.', 8: '8 a.m.', 12: '12 m.', 18: '6 p.m.' }
  return `De ${INICIO[desde] || `${desde}h`} a ${FIN[desde] || ''}`
}

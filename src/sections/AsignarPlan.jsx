import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { hoyBogota, diaSemanaBogota, fechaLarga } from '../data/fechas.js'

/* =====================================================================
   Asignar un plan a un cliente
   =====================================================================

   La pantalla que convierte la app en una app de entrenamiento. Hasta
   hoy el entrenador podía llenar la biblioteca, pero no podía darle una
   rutina a nadie: `Hoy` mostraba datos falsos porque no había forma de
   crear un plan de verdad.

   =====================================================================
   AQUÍ NO SE ESCRIBE EN LA BASE. SE LLAMA A UNA FUNCIÓN.
   =====================================================================

   Todo el trabajo lo hace `clonar_plantilla`, que ya estaba escrita en
   `supabase/03-funciones.sql` desde la Fase 2. Esta pantalla solo la
   invoca. No es pereza: hay cosas que la app NO PUEDE hacer bien desde
   el navegador, y esta es una.

   Asignar un plan son tres escrituras que tienen que pasar juntas o no
   pasar: archivar el plan anterior, crear el nuevo, y copiar sus días.
   Si se hicieran con tres llamadas desde el navegador y la señal se cae
   en la segunda, el cliente queda SIN plan activo y con un plan a
   medias. Dentro de la función es una sola transacción: pasa todo o no
   pasa nada.

   Y además la función valida en el servidor que quien llama sea admin.
   Que esta pantalla solo se vea con rol admin es comodidad, no
   seguridad — quien tenga el navegador puede reescribir esa condición.

   =====================================================================
   POR QUÉ EL PLAN SE COPIA Y NO SE ENLAZA
   =====================================================================

   Al asignar, la plantilla se COPIA y el plan queda independiente. Si
   después el entrenador cambia el molde, los planes ya entregados no se
   mueven. Está decidido desde el 1/09 y la razón es de producto, no
   técnica: nadie quiere que a un cliente le cambie sola la rutina de
   ayer.
   ===================================================================== */

/* El lunes que viene, en hora de Bogotá.
 *
 * Es el valor por defecto de la fecha de inicio, y no es un capricho:
 * las semanas del plan son semanas de calendario (ver `plan.js`), así
 * que un plan que arranca un miércoles tiene una primera semana de
 * cinco días. Empezando en lunes, las cuatro semanas salen completas.
 * Se puede cambiar — a veces alguien quiere empezar hoy mismo — pero lo
 * que se ofrece primero es lo que casi siempre conviene. */
function proximoLunes () {
  const hoy = hoyBogota()
  const faltan = 8 - diaSemanaBogota(hoy)      // 1 (lunes) -> 7 días
  const d = new Date(`${hoy}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (faltan === 7 ? 7 : faltan))
  return d.toISOString().slice(0, 10)
}

export default function AsignarPlan ({ alVolver }) {
  const [clientes, setClientes] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [conPlan, setConPlan] = useState({})     // cliente_id -> nombre del plan
  const [cargando, setCargando] = useState(true)

  const [cliente, setCliente] = useState('')
  const [plantilla, setPlantilla] = useState('')
  const [inicio, setInicio] = useState(proximoLunes)
  const [meta, setMeta] = useState('')

  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)

  async function cargar () {
    /* `.eq('rol', 'cliente')` NO es opcional. La política de `perfiles`
     * termina en `or es_admin()`, así que para el entrenador es
     * verdadera en todas las filas: sin este filtro, la lista de
     * "clientes" traería también a los dos administradores, y
     * `clonar_plantilla` rechazaría la asignación con un error que en
     * pantalla no explicaría nada. Regla 13. */
    const [{ data: cs }, { data: ps }, { data: pl }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre')
        .eq('rol', 'cliente').order('nombre'),
      supabase.from('plantillas')
        .select('id, nombre, semanas, dias_semana, nivel').order('nombre'),
      // Los planes ACTIVOS, para poder avisar antes de reemplazar uno.
      // Mismo caso: la política de `planes` también lleva or es_admin().
      supabase.from('planes').select('cliente_id, nombre').eq('activo', true)
    ])

    setClientes(cs || [])
    setPlantillas(ps || [])
    setConPlan(Object.fromEntries(
      (pl || []).map(p => [p.cliente_id, p.nombre])
    ))
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  async function asignar (ev) {
    ev.preventDefault()
    setAviso(null)

    if (!cliente || !plantilla) {
      setAviso({ tipo: 'error', texto: 'Elige un cliente y una plantilla.' })
      return
    }

    setOcupado(true)
    const { error } = await supabase.rpc('clonar_plantilla', {
      p_plantilla: Number(plantilla),
      p_cliente: cliente,
      p_inicio: inicio,
      // Vacío = que la función use la sugerencia de la plantilla. La
      // meta NUNCA se manda con un número fijo desde aquí: es por
      // cliente, y la decisión de dónde sale vive en la base.
      p_meta_semanal: meta === '' ? null : Number(meta),
      p_nombre: null
    })
    setOcupado(false)

    if (error) {
      console.error('No se pudo asignar el plan:', error)
      setAviso({
        tipo: 'error',
        texto: 'No se pudo asignar el plan. Revisa la conexión e inténtalo otra vez.'
      })
      return
    }

    const nombre = clientes.find(c => c.id === cliente)?.nombre || 'El cliente'
    setAviso({
      tipo: 'ok',
      texto: `Listo. ${nombre} ya ve su plan en la pantalla de Hoy.`
    })
    setCliente('')
    setPlantilla('')
    cargar()
  }

  const elegida = plantillas.find(p => String(p.id) === String(plantilla))
  const reemplaza = cliente && conPlan[cliente]

  return (
    <Pantalla
      titulo="Asignar un plan"
      bajada="Copia una plantilla y se la entrega a un cliente"
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      {aviso && (
        <p className={'aviso' + (aviso.tipo === 'error' ? ' es-error' : ' es-ok')}>
          {aviso.texto}
        </p>
      )}

      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && clientes.length === 0 && (
        <p className="meta">
          Todavía no tienes clientes. Un visitante se vuelve cliente cuando
          canjea un código de invitación.
        </p>
      )}

      {!cargando && plantillas.length === 0 && clientes.length > 0 && (
        <p className="meta">
          Todavía no hay plantillas. Una plantilla es el molde de 4 semanas
          que se copia y se ajusta para cada persona.
        </p>
      )}

      {!cargando && clientes.length > 0 && plantillas.length > 0 && (
        <form className="formulario" onSubmit={asignar}>
          <label className="campo">
            <span>Cliente</span>
            <select value={cliente} onChange={e => setCliente(e.target.value)}>
              <option value="">Elige uno</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{conPlan[c.id] ? ' — ya tiene plan' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* SE AVISA ANTES, NO DESPUÉS. Un cliente solo puede tener un
              plan activo: al asignar uno nuevo, el anterior se archiva.
              No se pierde nada —el historial de entrenamientos cuelga
              del plan viejo y sigue ahí— pero el cliente va a ver otra
              rutina mañana, y eso hay que decirlo antes de tocar el
              botón. */}
          {reemplaza && (
            <p className="aviso">
              Ahora mismo tiene «{reemplaza}». Al asignar el nuevo, ese se
              archiva y deja de verlo. Su historial no se borra.
            </p>
          )}

          <label className="campo">
            <span>Plantilla</span>
            <select value={plantilla} onChange={e => setPlantilla(e.target.value)}>
              <option value="">Elige una</option>
              {plantillas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {p.semanas} semanas
                </option>
              ))}
            </select>
            <span className="pista">
              Se copia. Si después cambias la plantilla, este plan no se
              mueve.
            </span>
          </label>

          <label className="campo">
            <span>Empieza el</span>
            <input type="date" value={inicio} min={hoyBogota()}
                   onChange={e => setInicio(e.target.value)} />
            <span className="pista">
              {diaSemanaBogota(inicio) === 1
                ? 'Un lunes: las semanas salen completas.'
                : 'Ojo: al no empezar en lunes, la primera semana queda más corta.'}
            </span>
          </label>

          <label className="campo">
            <span>Días por semana <span className="opcional">opcional</span></span>
            <input type="number" min="1" max="7" value={meta}
                   placeholder={elegida?.dias_semana
                     ? String(elegida.dias_semana) : '3'}
                   onChange={e => setMeta(e.target.value)} />
            <span className="pista">
              Contra esto se mide su racha. Si lo dejas vacío se usa lo que
              sugiere la plantilla.
            </span>
          </label>

          <button type="submit" className="boton-principal" disabled={ocupado}>
            {ocupado ? 'Asignando…' : 'Asignar el plan'}
          </button>

          {inicio && (
            <p className="pista">
              Va a ver su primera rutina el {fechaLarga(inicio).toLowerCase()}.
            </p>
          )}
        </form>
      )}
    </Pantalla>
  )
}

import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { NIVELES, etiqueta } from '../lib/ejercicios.js'
import { nombreDia } from '../data/fechas.js'
import {
  clave, mapaDeDias, diasParaGuardar, diasDeEntrenoPorSemana
} from '../lib/rutinas.js'

/* =====================================================================
   El constructor de plantillas
   =====================================================================

   Una PLANTILLA es el molde de varias semanas: qué rutina toca cada día.
   No es el plan de nadie — es lo que se COPIA para crear el plan de un
   cliente, y al copiarse queda independiente. Si después se cambia el
   molde, los planes ya entregados no se mueven. Decisión del 1/09:
   nadie quiere que a un cliente le cambie sola la rutina de ayer.

   POR QUÉ EXISTEN. Con 6 a 15 clientes, armar cada plan de 4 semanas
   desde cero sería más lento que el PDF que el entrenador usa hoy — o
   sea, la app sería peor que no tenerla.

   LAS PLANTILLAS NO LAS VE NINGÚN CLIENTE. Su política es solo de admin
   (02-politicas.sql): que un cliente vea el molde del que salió su
   rutina no le aporta y sí le quita valor al trabajo del entrenador.

   =====================================================================
   LA REJILLA, Y EL DETALLE QUE NO SE PUEDE PERDER
   =====================================================================

   Cada celda tiene TRES estados, no dos:

     una rutina  -> ese día entrena eso.
     descanso    -> el entrenador puso descanso a propósito.
     vacío       -> ese día no está programado.

   Descanso y vacío se ven casi igual y NO son lo mismo: la pantalla de
   Hoy le dice al cliente "el descanso es parte del plan" en el primer
   caso y "no tienes rutina hoy" en el segundo. Si aquí se colapsaran,
   allá se perdería la diferencia.
   ===================================================================== */

const NUEVA = {
  nombre: '', semanas: 4, nivel: '', dias_semana: '', notas: ''
}

/* El valor del desplegable para el descanso. Es una cadena rara a
 * propósito: tiene que poder distinguirse de "" (que es "sin
 * programar") dentro de un <select>, donde todo es texto. */
const DESCANSO = 'descanso'

export default function Plantillas ({ alVolver }) {
  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState(null)

  async function cargar () {
    const { data } = await supabase
      .from('plantillas')
      .select('id, nombre, semanas, nivel, dias_semana, notas')
      .order('nombre')
    setPlantillas(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  if (editando) {
    return (
      <Editor
        inicial={editando}
        alCerrar={() => setEditando(null)}
        alGuardar={(nombre) => {
          setEditando(null)
          setAviso({ tipo: 'ok', texto: `«${nombre}» quedó guardada.` })
          cargar()
        }}
      />
    )
  }

  return (
    <Pantalla
      titulo="Tus plantillas"
      bajada={cargando ? undefined : `${plantillas.length} moldes`}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      {aviso && <p className="aviso es-ok">{aviso.texto}</p>}

      <button type="button" className="boton-principal"
              onClick={() => setEditando(NUEVA)}>
        Armar una plantilla
      </button>

      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && plantillas.length === 0 && (
        <p className="meta">
          Todavía no tienes plantillas. Una plantilla es el molde de
          varias semanas que copias para cada cliente y después ajustas.
        </p>
      )}

      <ul className="lista">
        {plantillas.map(p => (
          <li key={p.id} className="fila">
            <span className="fila-datos">
              <strong>{p.nombre}</strong>
              <small>
                {p.semanas} {p.semanas === 1 ? 'semana' : 'semanas'}
                {p.nivel && ` · ${etiqueta(p.nivel)}`}
                {p.dias_semana && ` · ${p.dias_semana} días/semana`}
              </small>
            </span>
            <span className="fila-acciones">
              <button type="button" className="enlace enlace-fila"
                      onClick={() => setEditando(p)}>
                Editar
              </button>
            </span>
          </li>
        ))}
      </ul>

      <p className="pista">
        Para entregarle una a un cliente, vuelve y entra en «Asignar un
        plan». Al asignarla se copia: si después cambias el molde, lo que
        ya entregaste no se mueve.
      </p>
    </Pantalla>
  )
}


/* ---------------------------------------------------------------------
   El editor
   --------------------------------------------------------------------- */
function Editor ({ inicial, alCerrar, alGuardar }) {
  const esNueva = !inicial.id
  const [datos, setDatos] = useState({
    nombre: inicial.nombre || '',
    semanas: inicial.semanas || 4,
    nivel: inicial.nivel || '',
    dias_semana: inicial.dias_semana ?? '',
    notas: inicial.notas || ''
  })
  const [mapa, setMapa] = useState({})
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState([])
  const [ocupado, setOcupado] = useState(false)

  const cambiar = (campo, valor) => setDatos(d => ({ ...d, [campo]: valor }))

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [{ data: rs }, dias] = await Promise.all([
        supabase.from('rutinas').select('id, nombre').order('nombre'),
        inicial.id
          ? supabase.from('plantilla_dias')
              .select('semana, dia, rutina_id')
              .eq('plantilla_id', inicial.id)
          : Promise.resolve({ data: [] })
      ])
      if (!vivo) return
      setRutinas(rs || [])
      setMapa(mapaDeDias(dias.data || []))
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [inicial.id])

  const semanas = Math.max(1, Math.min(12, Number(datos.semanas) || 1))
  const porSemana = diasDeEntrenoPorSemana(mapa, semanas)

  function ponerDia (s, d, valor) {
    setMapa(m => {
      const copia = { ...m }
      const k = clave(s, d)
      if (valor === '') delete copia[k]              // sin programar
      else if (valor === DESCANSO) copia[k] = null   // descanso a propósito
      else copia[k] = Number(valor)
      return copia
    })
  }

  async function guardar (ev) {
    ev.preventDefault()
    setErrores([])

    const nombre = (datos.nombre || '').replace(/\s+/g, ' ').trim()
    if (!nombre) { setErrores(['La plantilla necesita un nombre.']); return }

    const dias = diasParaGuardar(mapa, semanas)
    if (dias.length === 0) {
      setErrores(['Marca al menos un día con una rutina.'])
      return
    }

    setOcupado(true)
    const { error } = await supabase.rpc('guardar_plantilla', {
      p_id: inicial.id ?? null,
      p_nombre: nombre,
      p_semanas: semanas,
      p_nivel: datos.nivel || null,
      p_dias_semana: datos.dias_semana === '' ? null : Number(datos.dias_semana),
      p_notas: (datos.notas || '').trim() || null,
      p_dias: dias
    })
    setOcupado(false)

    if (error) {
      console.error('No se pudo guardar la plantilla:', error)
      setErrores(['No se pudo guardar. Revisa la conexión e inténtalo otra vez.'])
      return
    }
    alGuardar(nombre)
  }

  return (
    <Pantalla
      titulo={esNueva ? 'Nueva plantilla' : 'Editar plantilla'}
      accion={
        <button type="button" className="enlace" onClick={alCerrar}>
          Cancelar
        </button>
      }
    >
      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && rutinas.length === 0 && (
        <p className="aviso es-error">
          Primero necesitas al menos una rutina. Vuelve y entra en «Tus
          rutinas»: una plantilla se arma con rutinas, no con ejercicios
          sueltos.
        </p>
      )}

      {!cargando && rutinas.length > 0 && (
        <form className="formulario" onSubmit={guardar}>
          {errores.length > 0 && (
            <div className="aviso es-error">
              {errores.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <label className="campo">
            <span>Nombre</span>
            <input value={datos.nombre} autoComplete="off"
                   placeholder="Fuerza principiante, 4 semanas"
                   onChange={e => cambiar('nombre', e.target.value)} />
          </label>

          <div className="rejilla-campos">
            <label className="campo">
              <span>Semanas</span>
              <input type="number" min="1" max="12" value={datos.semanas}
                     onChange={e => cambiar('semanas', e.target.value)} />
            </label>

            <label className="campo">
              <span>Nivel <span className="opcional">opcional</span></span>
              <select value={datos.nivel}
                      onChange={e => cambiar('nivel', e.target.value)}>
                <option value="">Sin especificar</option>
                {NIVELES.map(n => (
                  <option key={n} value={n}>{etiqueta(n)}</option>
                ))}
              </select>
            </label>
          </div>

          {/* LA REJILLA. Una sección por semana en vez de una tabla de
              7 columnas: en un celular de 360 px, siete desplegables en
              fila salen de 40 px cada uno y no se pueden tocar. */}
          {Array.from({ length: semanas }, (_, si) => {
            const s = si + 1
            return (
              <section key={s} className="tarjeta">
                <h3 className="titulillo">
                  Semana {s}{' '}
                  <span className="tenue">
                    {porSemana[si]} {porSemana[si] === 1 ? 'día' : 'días'}
                  </span>
                </h3>

                {Array.from({ length: 7 }, (_, di) => {
                  const d = di + 1
                  const k = clave(s, d)
                  const actual = k in mapa
                    ? (mapa[k] === null ? DESCANSO : String(mapa[k]))
                    : ''
                  return (
                    <label key={d} className="campo">
                      <span>{nombreDia(d)}</span>
                      <select value={actual}
                              onChange={e => ponerDia(s, d, e.target.value)}>
                        {/* Los TRES estados, con los nombres que
                            significan algo para el entrenador. "Sin
                            programar" y "Descanso" se leen distinto a
                            propósito: en la app del cliente producen
                            dos mensajes distintos. */}
                        <option value="">Sin programar</option>
                        <option value={DESCANSO}>Descanso</option>
                        {rutinas.map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    </label>
                  )
                })}
              </section>
            )
          })}

          <label className="campo">
            <span>Días por semana <span className="opcional">opcional</span></span>
            <input type="number" min="1" max="7" value={datos.dias_semana}
                   placeholder={String(Math.max(...porSemana, 0) || 3)}
                   onChange={e => cambiar('dias_semana', e.target.value)} />
            <span className="pista">
              Es la sugerencia con la que arranca la meta del cliente, y
              contra ella se mide su racha. Si lo dejas vacío se usa lo
              que marcaste arriba. Al asignar el plan se puede cambiar
              por persona.
            </span>
          </label>

          <label className="campo">
            <span>Notas <span className="opcional">opcional</span></span>
            <textarea rows="3" value={datos.notas}
                      onChange={e => cambiar('notas', e.target.value)} />
          </label>

          <button type="submit" className="boton-principal" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar la plantilla'}
          </button>

          {!esNueva && (
            <p className="pista">
              Los planes que ya entregaste NO se mueven: al asignarla se
              copió. Este cambio solo afecta a los que asignes de ahora
              en adelante.
            </p>
          )}
        </form>
      )}
    </Pantalla>
  )
}

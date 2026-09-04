import { useState, useEffect, useMemo } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { GRUPOS, NIVELES, etiqueta } from '../lib/ejercicios.js'
import { mover, validarRutina, resumenRutina } from '../lib/rutinas.js'

/* =====================================================================
   El constructor de rutinas
   =====================================================================

   Una RUTINA es UNA sesión: "Empuje A", "Pierna 2". Es reutilizable —
   la misma puede estar en el plan de ocho clientes— y es la pieza con
   la que se arman las plantillas.

   HASTA HOY (4/09) ESTA PANTALLA NO EXISTÍA, y era el hueco que dejaba
   la app inservible: el entrenador podía llenar su biblioteca de
   ejercicios y asignar planes, pero las rutinas que asignaba salían del
   seed de ejemplo. Podía mostrar la app; no podía usarla.

   EL GUARDADO PASA POR UNA FUNCIÓN, no por tres escrituras sueltas.
   `guardar_rutina` (07-constructores.sql) graba la rutina, borra sus
   ejercicios anteriores y mete los nuevos en orden, todo en una
   transacción. Si la señal se cae en medio —y el público entra con
   datos móviles— con tres llamadas la rutina se quedaría SIN
   ejercicios. Mismo argumento que `clonar_plantilla`.
   ===================================================================== */

const NUEVA = {
  nombre: '', nivel: '', duracion_min: '', notas: '', publica: false
}

export default function Rutinas ({ alVolver }) {
  const [rutinas, setRutinas] = useState([])
  const [cuentas, setCuentas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState(null)

  async function cargar () {
    const [{ data: rs }, { data: re }] = await Promise.all([
      supabase.from('rutinas')
        .select('id, nombre, nivel, duracion_min, notas, publica')
        .order('nombre'),
      // Solo para contar cuántos ejercicios tiene cada una. Se piden los
      // ids y se cuenta aquí en vez de pedir un count por rutina: son
      // pocas filas y así es UNA consulta en vez de una por rutina.
      supabase.from('rutina_ejercicios').select('rutina_id')
    ])

    const c = {}
    for (const f of re || []) c[f.rutina_id] = (c[f.rutina_id] || 0) + 1

    setRutinas(rs || [])
    setCuentas(c)
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
      titulo="Tus rutinas"
      bajada={cargando ? undefined : `${rutinas.length} sesiones armadas`}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      {aviso && <p className="aviso es-ok">{aviso.texto}</p>}

      <button type="button" className="boton-principal"
              onClick={() => setEditando({ ...NUEVA, ejercicios: [] })}>
        Armar una rutina
      </button>

      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && rutinas.length === 0 && (
        <p className="meta">
          Todavía no tienes rutinas. Una rutina es una sesión —«Empuje
          A», «Pierna 2»— y es la pieza con la que después armas las
          plantillas.
        </p>
      )}

      <ul className="lista">
        {rutinas.map(r => (
          <li key={r.id} className="fila">
            <span className="fila-datos">
              <strong>{r.nombre}</strong>
              <small>
                {resumenRutina(r, cuentas[r.id] || 0)}
                {/* Que una rutina sea PÚBLICA no es un detalle: es la
                    muestra gratis que ve cualquiera que abra la app sin
                    ser cliente. Se dice en la lista para que no se le
                    olvide cuál dejó abierta. */}
                {r.publica && ' · muestra gratis'}
              </small>
            </span>
            <span className="fila-acciones">
              <button type="button" className="enlace enlace-fila"
                      onClick={() => setEditando(r)}>
                Editar
              </button>
            </span>
          </li>
        ))}
      </ul>
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
    nivel: inicial.nivel || '',
    duracion_min: inicial.duracion_min ?? '',
    notas: inicial.notas || '',
    publica: Boolean(inicial.publica)
  })
  const [lista, setLista] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [errores, setErrores] = useState([])
  const [ocupado, setOcupado] = useState(false)

  const cambiar = (campo, valor) => setDatos(d => ({ ...d, [campo]: valor }))

  useEffect(() => {
    let vivo = true
    ;(async () => {
      /* El catálogo, solo los ACTIVOS. El `.eq('activo', true)` es la
       * regla 13: la política de `ejercicios` termina en `or
       * es_admin()`, así que para el entrenador es verdadera en todas
       * las filas y sin esta línea podría meter en una rutina nueva un
       * ejercicio que él mismo archivó. */
      const { data: cat } = await supabase
        .from('ejercicios')
        .select('id, nombre, grupo, equipo')
        .eq('activo', true)
        .order('grupo').order('nombre')

      let actuales = []
      if (inicial.id) {
        const { data } = await supabase
          .from('rutina_ejercicios')
          .select('ejercicio_id, series, reps, descanso_seg, nota, orden, ' +
                  'ejercicios ( nombre, grupo )')
          .eq('rutina_id', inicial.id)
          .order('orden')

        actuales = (data || []).map(f => ({
          ejercicio_id: f.ejercicio_id,
          nombre: f.ejercicios?.nombre || '',
          grupo: f.ejercicios?.grupo || '',
          series: f.series,
          reps: f.reps,
          descanso_seg: f.descanso_seg,
          nota: f.nota || ''
        }))
      }

      if (!vivo) return
      setCatalogo(cat || [])
      setLista(actuales)
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [inicial.id])

  function agregar (ej) {
    /* Los valores de arranque salen de lo que hace un entrenador el 90%
     * de las veces, no de ceros. Un formulario que empieza vacío obliga
     * a llenar tres campos por ejercicio; uno que empieza en 3×10 con
     * 60 s de descanso se corrige solo donde haga falta. */
    setLista(l => [...l, {
      ejercicio_id: ej.id, nombre: ej.nombre, grupo: ej.grupo,
      series: 3, reps: '10', descanso_seg: 60, nota: ''
    }])
    setBuscando(false)
  }

  const cambiarFila = (i, campo, valor) =>
    setLista(l => l.map((e, j) => j === i ? { ...e, [campo]: valor } : e))

  async function guardar (ev) {
    ev.preventDefault()
    setErrores([])

    const { valido, errores: fallos, rutina } = validarRutina(datos, lista)
    if (!valido) { setErrores(fallos); return }

    setOcupado(true)
    const { error } = await supabase.rpc('guardar_rutina', {
      p_id: inicial.id ?? null,
      p_nombre: rutina.nombre,
      p_nivel: rutina.nivel,
      p_duracion: rutina.duracion_min,
      p_notas: rutina.notas,
      p_publica: rutina.publica,
      p_ejercicios: rutina.ejercicios
    })
    setOcupado(false)

    if (error) {
      console.error('No se pudo guardar la rutina:', error)
      setErrores([
        error.code === '23505'
          ? 'Ya tienes una rutina con ese nombre.'
          : 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.'
      ])
      return
    }
    alGuardar(rutina.nombre)
  }

  if (buscando) {
    return (
      <Catalogo
        ejercicios={catalogo}
        yaPuestos={new Set(lista.map(e => e.ejercicio_id))}
        alElegir={agregar}
        alCerrar={() => setBuscando(false)}
      />
    )
  }

  return (
    <Pantalla
      titulo={esNueva ? 'Nueva rutina' : 'Editar rutina'}
      accion={
        <button type="button" className="enlace" onClick={alCerrar}>
          Cancelar
        </button>
      }
    >
      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && (
        <form className="formulario" onSubmit={guardar}>
          {errores.length > 0 && (
            <div className="aviso es-error">
              {errores.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <label className="campo">
            <span>Nombre</span>
            <input value={datos.nombre} autoComplete="off"
                   placeholder="Empuje A"
                   onChange={e => cambiar('nombre', e.target.value)} />
            <span className="pista">
              Cómo la llamas tú. Es lo que va a leer tu cliente en su
              pantalla de hoy.
            </span>
          </label>

          <div className="rejilla-campos">
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

            <label className="campo">
              <span>Minutos <span className="opcional">opcional</span></span>
              <input type="number" min="1" value={datos.duracion_min}
                     placeholder="45"
                     onChange={e => cambiar('duracion_min', e.target.value)} />
            </label>
          </div>

          <h3 className="titulillo">
            Los ejercicios{' '}
            <span className="tenue">{lista.length}</span>
          </h3>

          {lista.length === 0 && (
            <p className="meta">
              Todavía no hay ninguno. Agrégalos abajo, en el orden en que
              quieres que los haga.
            </p>
          )}

          <ul className="lista">
            {lista.map((e, i) => (
              <li key={`${e.ejercicio_id}-${i}`} className="fila">
                <span className="fila-datos">
                  <strong>{i + 1}. {e.nombre}</strong>
                  <small>{etiqueta(e.grupo)}</small>

                  {/* LAS ETIQUETAS VAN VISIBLES, no solo para el lector
                      de pantalla. Tres cajas numéricas seguidas sin
                      rótulo son adivinanza: nadie sabe si el 60 son
                      segundos de descanso o repeticiones. */}
                  <span className="rejilla-tres">
                    <label className="campo">
                      <span>Series</span>
                      <input type="number" min="1" max="20" value={e.series}
                             aria-label={`Series de ${e.nombre}`}
                             onChange={ev => cambiarFila(i, 'series', ev.target.value)} />
                    </label>
                    <label className="campo">
                      {/* type="text" y no number: la base guarda TEXTO
                          porque "8-10" es una respuesta válida, y un
                          campo numérico no la deja escribir. */}
                      <span>Reps</span>
                      <input type="text" inputMode="numeric" value={e.reps}
                             placeholder="8-10"
                             aria-label={`Repeticiones de ${e.nombre}`}
                             onChange={ev => cambiarFila(i, 'reps', ev.target.value)} />
                    </label>
                    <label className="campo">
                      <span>Descanso</span>
                      <input type="number" min="0" max="600" step="15"
                             value={e.descanso_seg}
                             aria-label={`Descanso de ${e.nombre} en segundos`}
                             onChange={ev => cambiarFila(i, 'descanso_seg', ev.target.value)} />
                    </label>
                  </span>
                </span>

                {/* SUBIR Y BAJAR, NO ARRASTRAR. En un celular el gesto
                    de arrastrar es el mismo con el que se desplaza la
                    página; dos botones funcionan al primer toque y un
                    lector de pantalla los lee solos. Está explicado en
                    rutinas.js. */}
                <span className="fila-acciones">
                  <button type="button" className="enlace enlace-fila"
                          disabled={i === 0}
                          aria-label={`Subir ${e.nombre}`}
                          onClick={() => setLista(l => mover(l, i, -1))}>
                    ↑
                  </button>
                  <button type="button" className="enlace enlace-fila"
                          disabled={i === lista.length - 1}
                          aria-label={`Bajar ${e.nombre}`}
                          onClick={() => setLista(l => mover(l, i, 1))}>
                    ↓
                  </button>
                  <button type="button" className="enlace enlace-fila tenue"
                          aria-label={`Quitar ${e.nombre}`}
                          onClick={() => setLista(l => l.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <button type="button" className="boton-principal"
                  onClick={() => setBuscando(true)}>
            Agregar un ejercicio
          </button>

          <label className="campo">
            <span>Notas <span className="opcional">opcional</span></span>
            <textarea rows="3" value={datos.notas}
                      placeholder="Descansos cortos. Prioridad a la técnica."
                      onChange={e => cambiar('notas', e.target.value)} />
          </label>

          {/* LO QUE MÁS SE PUEDE HACER MAL DE ESTA PANTALLA, y por eso
              lleva el texto completo al lado en vez de solo una etiqueta:
              una rutina pública la ve CUALQUIERA que abra la app, sin
              ser cliente. Es la muestra gratis, y regalar la equivocada
              es regalar el trabajo. */}
          <label className="permiso">
            <input type="checkbox" checked={datos.publica}
                   onChange={e => cambiar('publica', e.target.checked)} />
            <span>
              <strong>Usarla como muestra gratis</strong>
              La va a ver cualquiera que abra la app, sin ser cliente
              tuyo. Sirve de gancho; conviene que sea una de casa y sin
              equipo. El resto de tus rutinas solo las ven tus clientes.
            </span>
          </label>

          <button type="submit" className="boton-principal" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar la rutina'}
          </button>
        </form>
      )}
    </Pantalla>
  )
}


/* ---------------------------------------------------------------------
   Elegir un ejercicio del catálogo
   ---------------------------------------------------------------------
   Pantalla aparte y no un desplegable: con 150 ejercicios un `select`
   nativo es una lista de 150 renglones sin buscador, y encima el mismo
   nombre puede repetirse entre grupos.
   --------------------------------------------------------------------- */
function Catalogo ({ ejercicios, yaPuestos, alElegir, alCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [grupo, setGrupo] = useState('')

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return ejercicios.filter(e => {
      if (grupo && e.grupo !== grupo) return false
      return !t || (e.nombre || '').toLowerCase().includes(t)
    })
  }, [ejercicios, busqueda, grupo])

  const conContenido = useMemo(() => {
    const hay = new Set(ejercicios.map(e => e.grupo))
    return GRUPOS.filter(g => hay.has(g))
  }, [ejercicios])

  return (
    <Pantalla
      titulo="Agregar un ejercicio"
      accion={
        <button type="button" className="enlace" onClick={alCerrar}>
          Volver
        </button>
      }
    >
      <label className="campo">
        <span className="oculto-visual">Buscar un ejercicio</span>
        <input type="search" value={busqueda} autoComplete="off"
               placeholder="Buscar por nombre"
               onChange={e => setBusqueda(e.target.value)} />
      </label>

      <div className="filtro" role="group" aria-label="Grupo">
        <button type="button"
                className={'pastilla-boton' + (grupo === '' ? ' es-activa' : '')}
                aria-pressed={grupo === ''}
                onClick={() => setGrupo('')}>
          Todos
        </button>
        {conContenido.map(g => (
          <button key={g} type="button"
                  className={'pastilla-boton' + (grupo === g ? ' es-activa' : '')}
                  aria-pressed={grupo === g}
                  onClick={() => setGrupo(grupo === g ? '' : g)}>
            {etiqueta(g)}
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="meta">Ninguno coincide con lo que buscas.</p>
      )}

      <ul className="lista">
        {visibles.map(e => (
          <li key={e.id} className="fila">
            <span className="fila-datos">
              <strong>{e.nombre}</strong>
              <small>
                {etiqueta(e.grupo)}
                {e.equipo && ` · ${etiqueta(e.equipo)}`}
              </small>
            </span>
            <span className="fila-acciones">
              {/* Se puede agregar dos veces a propósito: repetir un
                  ejercicio al final de la sesión es normal en una
                  rutina. Solo se avisa, no se bloquea. */}
              <button type="button" className="enlace enlace-fila"
                      onClick={() => alElegir(e)}>
                {yaPuestos.has(e.id) ? 'Otra vez' : 'Agregar'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Pantalla>
  )
}

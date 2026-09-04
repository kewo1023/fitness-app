import { useState, useEffect, useMemo, useRef } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { etiqueta } from '../lib/ejercicios.js'
import {
  objetivoReps, valoresPrellenados, validarSerie, progresoSesion, textoObjetivo
} from '../lib/series.js'

/* =====================================================================
   El entrenamiento en curso — donde se registra peso y repeticiones
   =====================================================================

   LA CONDICIÓN QUE MANDA, escrita en el esquema desde el 1/09: esto se
   usa con el celular en la mano, sudado y a media serie. Tiene que
   funcionar a un toque.

   Todo lo raro de esta pantalla sale de ahí:

   - **Un toque abre la serie con el peso ya escrito.** Quien levanta lo
     mismo que la semana pasada —que es casi siempre— solo confirma. La
     única tecla que de verdad tiene que tocar es la de las
     repeticiones, que es el dato que cambia.
   - **Guardar una serie salta sola a la siguiente.** Encadenar cuatro
     series son cuatro confirmaciones, no cuatro búsquedas del botón.
   - **Se guarda serie por serie, no al final.** Si se cae la señal o
     cierra la app a la mitad, lo anotado ya está. Un formulario que se
     envía entero al terminar pierde el entrenamiento completo, y a
     nadie se le olvida ese día.
   - **Registrar es OPCIONAL.** Se puede terminar el entrenamiento sin
     anotar nada. Si guardar exigiera escribir números, la mitad de la
     gente dejaría de marcar — y la métrica de ejercicios saltados
     acabaría midiendo quién anota en vez de qué se salta.

   =====================================================================
   LO QUE ESTA PANTALLA **NO** HACE: terminar el entrenamiento
   =====================================================================

   El botón está aquí, pero la función es la de `Hoy`. El XP lo paga un
   trigger al completar la sesión y hay que releerlo para poder decir el
   número de verdad; con esa lógica escrita en dos sitios, un día los
   dos avisos dirían cosas distintas. Aquí se llama a `alTerminar`, y de
   contarlo se encarga quien sabe.
   ===================================================================== */

export default function Entrenamiento ({
  sesion, rutina, ejercicios, perfil, alVolver, alTerminar, ocupado
}) {
  const [cargando, setCargando] = useState(true)
  /* Las series ya anotadas, indexadas por "ejercicio:serie". Un objeto
   * plano y no un array porque la pregunta que se hace en cada pintada
   * es "¿esta serie concreta está?", y buscarla en un array por cada
   * chip es recorrer la lista entera unas cuarenta veces. */
  const [hechas, setHechas] = useState({})
  const [ultimas, setUltimas] = useState({})
  const [editando, setEditando] = useState(null)   // {ejercicioId, serie}
  const [campos, setCampos] = useState({ peso: '', reps: '' })
  const [errores, setErrores] = useState([])
  const [guardando, setGuardando] = useState(false)

  /* El campo de repeticiones se enfoca solo al abrir una serie. Es el
   * único que casi siempre hay que escribir —el peso llega prellenado—
   * así que ahorra un toque por serie. Con ocho series por sesión, eso
   * es la diferencia entre usar la función y abandonarla. */
  const campoReps = useRef(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [reg, ult] = await Promise.all([
        supabase.from('series_registradas')
          .select('ejercicio_id, serie, reps, peso_kg')
          .eq('sesion_id', sesion.id),

        /* El peso de la última vez, para prellenar. La vista lleva
         * `security_invoker`, así que el RLS se aplica de verdad — y
         * como la política de `sesiones` termina en `or es_admin()`,
         * para el entrenador devolvería las de todos. El
         * `.eq('cliente_id')` es la regla 13, otra vez. */
        supabase.from('v_ultima_serie')
          .select('ejercicio_id, peso_kg, reps')
          .eq('cliente_id', perfil.id)
      ])

      if (!vivo) return
      if (reg.error) console.error('No se pudieron leer las series:', reg.error)
      if (ult.error) console.error('No se pudo leer el histórico:', ult.error)

      const mapa = {}
      for (const f of reg.data || []) mapa[`${f.ejercicio_id}:${f.serie}`] = f
      setHechas(mapa)

      const porEjercicio = {}
      for (const f of ult.data || []) porEjercicio[f.ejercicio_id] = f
      setUltimas(porEjercicio)

      setCargando(false)
    })()
    return () => { vivo = false }
  }, [sesion.id, perfil.id])

  useEffect(() => {
    if (editando && campoReps.current) campoReps.current.focus()
  }, [editando])

  const planeadas = useMemo(
    () => (ejercicios || []).reduce((s, e) => s + (Number(e.series) || 0), 0),
    [ejercicios]
  )
  const progreso = progresoSesion(Object.keys(hechas).length, planeadas)

  /* Abrir una serie. Aquí es donde se decide con qué llega cada campo,
   * y esa decisión vive en `series.js` para poder probarla: el peso de
   * la última vez, y las repeticiones SOLO si el plan pide un número
   * exacto. Con un objetivo de "8-10", elegir por él sería inventar. */
  function abrir (re, serie) {
    const clave = `${re.ejercicios.id}:${serie}`
    const yaHecha = hechas[clave]
    setErrores([])
    setEditando({ ejercicioId: re.ejercicios.id, serie, reId: re.id })

    if (yaHecha) {
      // Una serie ya anotada se abre con LO QUE ANOTÓ, no con el
      // prellenado: viene a corregir, no a empezar de cero.
      setCampos({
        peso: yaHecha.peso_kg === null ? '' : String(yaHecha.peso_kg),
        reps: yaHecha.reps === null ? '' : String(yaHecha.reps)
      })
      return
    }

    setCampos(valoresPrellenados({
      ultima: ultimas[re.ejercicios.id],
      pesoSugerido: re.peso_sugerido,
      objetivo: objetivoReps(re.reps)
    }))
  }

  async function guardar () {
    if (!editando) return
    const { valido, errores: fallos, valores } = validarSerie(campos)
    if (!valido) { setErrores(fallos); return }

    setGuardando(true)
    /* `upsert` y no `insert` por el único de la tabla
     * `(sesion_id, ejercicio_id, serie)`: volver a tocar una serie ya
     * anotada tiene que corregirla, no fallar con un error de duplicado
     * que además no significa nada para quien lo lee. */
    const { data, error } = await supabase
      .from('series_registradas')
      .upsert({
        sesion_id: sesion.id,
        ejercicio_id: editando.ejercicioId,
        serie: editando.serie,
        reps: valores.reps,
        peso_kg: valores.peso_kg
      }, { onConflict: 'sesion_id,ejercicio_id,serie' })
      .select('ejercicio_id, serie, reps, peso_kg')
      .maybeSingle()
    setGuardando(false)

    if (error) {
      console.error('No se pudo guardar la serie:', error)
      setErrores(['No se pudo guardar. Revisa la conexión.'])
      return
    }

    const clave = `${editando.ejercicioId}:${editando.serie}`
    setHechas(h => ({ ...h, [clave]: data || { ...valores, serie: editando.serie } }))

    /* SALTA SOLA A LA SIGUIENTE SERIE del mismo ejercicio. Es el
     * comportamiento que hace que anotar cuatro series sean cuatro
     * confirmaciones y no cuatro búsquedas de botón. En la última se
     * cierra: seguir abriendo una serie que no existe sería empujarlo a
     * hacer una de más. */
    const re = ejercicios.find(x => x.id === editando.reId)
    const siguiente = editando.serie + 1
    if (re && siguiente <= (Number(re.series) || 0)) {
      abrir(re, siguiente)
    } else {
      setEditando(null)
    }
  }

  if (cargando) {
    return (
      <Pantalla titulo={rutina?.nombre || 'Entrenamiento'}>
        <p className="meta">Cargando…</p>
      </Pantalla>
    )
  }

  return (
    <Pantalla
      titulo={rutina?.nombre || 'Entrenamiento'}
      bajada={progreso.total > 0
        ? `${progreso.mostradas} de ${progreso.total} series`
        : undefined}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Salir
        </button>
      }
    >
      {/* La barra de arriba. Es la única señal de "voy por aquí" en una
          pantalla donde se pasan cuarenta minutos, y por eso está fija
          en el encabezado y no al final de la lista. */}
      {progreso.total > 0 && (
        <div className="progreso-barra" aria-hidden="true">
          <span style={{ '--ancho': `${progreso.porcentaje}%` }} />
        </div>
      )}

      <p className="pista">
        Anotar es opcional: puedes terminar el entrenamiento sin escribir
        nada. Lo que anotes queda guardado al momento.
      </p>

      {(ejercicios || []).map(re => {
        const ej = re.ejercicios || {}
        const total = Number(re.series) || 0
        const anotadas = Array.from({ length: total }, (_, i) =>
          hechas[`${ej.id}:${i + 1}`]).filter(Boolean).length

        return (
          <section key={re.id} className="tarjeta ejercicio-bloque">
            <div className="ejercicio-cab">
              <div>
                <h2 className="chico">{ej.nombre}</h2>
                <p className="meta">
                  {textoObjetivo(re.series, re.reps)}
                  {ej.equipo && ` · ${etiqueta(ej.equipo)}`}
                  {re.peso_sugerido && ` · sugerido ${re.peso_sugerido} kg`}
                </p>
              </div>
              {anotadas > 0 && (
                <span className={'estado' + (anotadas >= total ? ' es-ok' : '')}>
                  {anotadas}/{total}
                </span>
              )}
            </div>

            {/* La nota del entrenador para ESTE ejercicio dentro de ESTA
                rutina. Va aquí y no escondida: es lo que él le diría al
                lado si estuviera presente. */}
            {re.nota && <p className="pista">{re.nota}</p>}

            <div className="series">
              {Array.from({ length: total }, (_, i) => {
                const serie = i + 1
                const f = hechas[`${ej.id}:${serie}`]
                const abierta = editando?.ejercicioId === ej.id &&
                                editando?.serie === serie
                return (
                  <button
                    key={serie}
                    type="button"
                    className={'serie' + (f ? ' es-hecha' : '') +
                               (abierta ? ' es-abierta' : '')}
                    onClick={() => abrir(re, serie)}
                  >
                    <strong>{serie}</strong>
                    {/* Lo anotado se ve SIN abrir la serie. Es lo que
                        deja mirar de reojo qué levantó en la anterior
                        para decidir la siguiente, que es lo que uno
                        hace de verdad entre serie y serie. */}
                    <small>
                      {f
                        ? [f.peso_kg ? `${f.peso_kg} kg` : null,
                           f.reps ? `${f.reps}` : null]
                            .filter(Boolean).join(' · ') || '✓'
                        : '—'}
                    </small>
                  </button>
                )
              })}
            </div>

            {editando?.ejercicioId === ej.id && (
              <div className="serie-form">
                {errores.length > 0 && (
                  <div className="aviso es-error">
                    {errores.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}

                <div className="rejilla-campos">
                  <label className="campo">
                    <span>Peso (kg)</span>
                    {/* `inputMode` y no `type="number"`: el number del
                        navegador trae flechitas que en un celular no
                        sirven de nada y rechaza la coma decimal, que es
                        como se escribe 72,5 en Colombia. */}
                    <input inputMode="decimal" autoComplete="off"
                           value={campos.peso}
                           onChange={e => setCampos(c => ({ ...c, peso: e.target.value }))} />
                  </label>
                  <label className="campo">
                    <span>Repeticiones</span>
                    <input ref={campoReps} inputMode="numeric" autoComplete="off"
                           value={campos.reps}
                           onChange={e => setCampos(c => ({ ...c, reps: e.target.value }))} />
                  </label>
                </div>

                <button type="button" className="boton-principal"
                        disabled={guardando} onClick={guardar}>
                  {guardando ? 'Guardando…' : `Guardar serie ${editando.serie}`}
                </button>
                <button type="button" className="enlace"
                        onClick={() => { setEditando(null); setErrores([]) }}>
                  Cerrar
                </button>
              </div>
            )}
          </section>
        )
      })}

      {/* Terminar va AL FINAL de la lista y no arriba, a propósito: para
          llegar hasta él hay que pasar por todos los ejercicios. No es
          un obstáculo —son tres deslizadas— pero evita el toque
          accidental que da por terminado un entrenamiento a la
          segunda serie. */}
      <button type="button" className="boton-principal"
              disabled={ocupado} onClick={alTerminar}>
        {ocupado ? 'Guardando…' : 'Terminar entrenamiento'}
      </button>
    </Pantalla>
  )
}

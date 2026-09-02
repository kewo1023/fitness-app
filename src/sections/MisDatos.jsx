import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CONSENTIMIENTOS, VERSION_CONSENTIMIENTO, mensajeDeError
} from '../lib/consentimientos.js'

/* =====================================================================
   "Mis datos" — la Ley 1581 implementada, no prometida.
   =====================================================================

   La ley colombiana le da al titular tres derechos, y esta pantalla es
   los tres:

     CONOCER      ver qué tiene la app sobre ti
     ACTUALIZAR   corregirlo
     SUPRIMIR     que lo borren

   Casi todo el mundo cumple esto con un correo y un proceso manual: el
   plazo legal para responder una consulta son 10 días hábiles. Aquí es
   un botón, y el plazo pasa a ser un segundo — sin depender de que
   alguien se acuerde de revisar un buzón.

   LO QUE HAY QUE ENTENDER DE LOS DATOS DE SALUD:
   son datos SENSIBLES, y la ley exige dos cosas que aquí son diseño,
   no un párrafo escondido en un PDF:

     1. Autorización aparte, con su propia finalidad. No vale que la
        casilla de "acepto los términos" cubra también esto.
     2. Hay que informar que responder es FACULTATIVO. Y facultativo de
        verdad: todos estos campos se pueden dejar vacíos y la app
        funciona igual.

   Por eso el permiso de datos de salud NO se pide al activar la cuenta
   junto con lo demás: se pide aquí, en el momento en que se van a dar
   los datos. Pedirlo antes sería pedir permiso para nada.
   ===================================================================== */

const VACIO = { fecha_nac: '', peso_kg: '', altura_cm: '', objetivo: '', lesiones: '' }

export default function MisDatos ({ perfil, alVolver, alSalir }) {
  const [salud, setSalud] = useState(VACIO)
  const [autoriza, setAutoriza] = useState(false)
  const [yaAutorizo, setYaAutorizo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [confirmaBorrado, setConfirmaBorrado] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data } = await supabase.from('perfil_salud').select('*').maybeSingle()
      const { data: cons } = await supabase
        .from('consentimientos')
        .select('aceptado')
        .eq('tipo', 'datos_sensibles')
        .order('fecha', { ascending: false })
        .limit(1)

      if (!vivo) return

      if (data) {
        setSalud({
          fecha_nac:  data.fecha_nac || '',
          // OJO: peso_kg es `numeric` y Postgres lo devuelve como TEXTO
          // ("72.50"), no como número. Si se usara directo en una suma,
          // JavaScript concatenaría en vez de sumar. Aquí solo se
          // muestra, pero se deja el String() explícito para que quede
          // claro que es texto y no se olvide al hacer cuentas.
          peso_kg:    data.peso_kg    != null ? String(data.peso_kg)    : '',
          altura_cm:  data.altura_cm  != null ? String(data.altura_cm)  : '',
          objetivo:   data.objetivo   || '',
          lesiones:   data.lesiones   || ''
        })
      }
      const acepto = cons && cons.length > 0 && cons[0].aceptado
      setYaAutorizo(acepto)
      setAutoriza(acepto)
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [])

  const cambiar = (campo, valor) => setSalud(s => ({ ...s, [campo]: valor }))

  async function guardar (e) {
    e.preventDefault()
    setError(null); setMensaje(null); setOcupado(true)

    // Primero la autorización, después el dato. En ese orden y no al
    // revés: guardar un dato sensible y pedir permiso después es
    // exactamente lo que la ley no permite.
    if (autoriza && !yaAutorizo) {
      await supabase.from('consentimientos').insert({
        perfil_id: perfil.id,
        tipo: 'datos_sensibles',
        version: VERSION_CONSENTIMIENTO,
        aceptado: true
      })
      setYaAutorizo(true)
    }

    // Los vacíos van como null, no como cadena vacía. Un peso de ""
    // rompería la columna numérica, y más importante: null significa
    // "no lo dijo", que es distinto de "dijo cero".
    const limpio = v => (v === '' ? null : v)

    const { error: err } = await supabase.from('perfil_salud').upsert({
      perfil_id:  perfil.id,
      fecha_nac:  limpio(salud.fecha_nac),
      peso_kg:    limpio(salud.peso_kg),
      altura_cm:  limpio(salud.altura_cm),
      objetivo:   limpio(salud.objetivo),
      lesiones:   limpio(salud.lesiones),
      actualizado_en: new Date().toISOString()
    })

    if (err) setError(mensajeDeError(err))
    else setMensaje('Guardado.')
    setOcupado(false)
  }

  /* DERECHO DE CONOCER. mis_datos() devuelve TODO lo que la app sabe de
   * quien pregunta, en un solo objeto. La función no recibe parámetros
   * a propósito: no se puede pedir "los datos de otro". */
  async function descargar () {
    setError(null)
    const { data, error: err } = await supabase.rpc('mis_datos')
    if (err) { setError(mensajeDeError(err)); return }

    const archivo = new Blob([JSON.stringify(data, null, 2)],
                             { type: 'application/json' })
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    // Sin esto el navegador se queda con el archivo en memoria hasta
    // que se cierre la pestaña.
    URL.revokeObjectURL(url)
    setMensaje('Descargado.')
  }

  /* DERECHO DE SUPRIMIR. Borra la cuenta de acceso, y de ahí cae en
   * cascada todo: perfil, salud, consentimientos, planes, sesiones,
   * series y logros. No hay vuelta atrás, por eso hay que escribir la
   * palabra: un botón suelto se toca sin querer con el pulgar. */
  async function eliminar () {
    if (confirmaBorrado !== 'ELIMINAR') return
    setOcupado(true)
    const { error: err } = await supabase.rpc('eliminar_mi_cuenta')
    if (err) { setError(mensajeDeError(err)); setOcupado(false); return }
    await supabase.auth.signOut()
    alSalir()
  }

  if (cargando) return <div className="cargando" aria-busy="true" />

  return (
    <main className="pantalla">
      <header className="pantalla-cab">
        <div>
          <h1>Mis datos</h1>
          <p className="bajada">Todo lo que la app sabe de ti, y qué puedes hacer con eso.</p>
        </div>
      </header>

      <button type="button" className="enlace" onClick={alVolver}>← Volver al perfil</button>

      {/* --- 1. CONOCER ------------------------------------------------ */}
      <section className="tarjeta">
        <h2 className="chico">Descargar mis datos</h2>
        <p className="meta">
          Te bajas un archivo con tu perfil, tus autorizaciones, tus planes,
          tus entrenamientos y tus registros. Todo, en el momento.
        </p>
        <button type="button" className="boton-principal" onClick={descargar}>
          Descargar
        </button>
      </section>

      {/* --- 2. ACTUALIZAR --------------------------------------------- */}
      <section className="tarjeta">
        <h2 className="chico">Datos de salud</h2>
        <p className="meta">
          <strong>Responder esto es opcional.</strong> Puedes dejarlo todo
          vacío y usar la app igual. Le sirve a tu entrenador para armar
          tu rutina, y solo lo ve él.
        </p>

        <form className="formulario" onSubmit={guardar}>
          <label className="permiso">
            <input type="checkbox" checked={autoriza}
                   onChange={e => setAutoriza(e.target.checked)} />
            <span>
              <strong>{CONSENTIMIENTOS.datos_sensibles.titulo}</strong>
              {CONSENTIMIENTOS.datos_sensibles.texto}
            </span>
          </label>

          <div className="rejilla-campos">
            <label className="campo">
              <span>Peso <em className="opcional">kg</em></span>
              <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
                     value={salud.peso_kg} disabled={!autoriza}
                     onChange={e => cambiar('peso_kg', e.target.value)} />
            </label>
            <label className="campo">
              <span>Estatura <em className="opcional">cm</em></span>
              <input type="number" inputMode="numeric" min="100" max="250"
                     value={salud.altura_cm} disabled={!autoriza}
                     onChange={e => cambiar('altura_cm', e.target.value)} />
            </label>
          </div>

          <label className="campo">
            <span>Fecha de nacimiento</span>
            <input type="date" value={salud.fecha_nac} disabled={!autoriza}
                   onChange={e => cambiar('fecha_nac', e.target.value)} />
          </label>

          <label className="campo">
            <span>Qué buscas</span>
            <input type="text" value={salud.objetivo} disabled={!autoriza}
                   placeholder="Bajar de peso, ganar fuerza…"
                   onChange={e => cambiar('objetivo', e.target.value)} />
          </label>

          <label className="campo">
            <span>Lesiones o molestias</span>
            <textarea rows="3" value={salud.lesiones} disabled={!autoriza}
                      placeholder="Rodilla derecha, hombro…"
                      onChange={e => cambiar('lesiones', e.target.value)} />
          </label>

          {mensaje && <p className="aviso es-ok" role="status">{mensaje}</p>}
          {error && <p className="aviso es-error" role="alert">{error}</p>}

          <button type="submit" className="boton-principal"
                  disabled={!autoriza || ocupado}>
            {ocupado ? 'Un momento…' : 'Guardar'}
          </button>
        </form>
      </section>

      {/* --- 3. SUPRIMIR ------------------------------------------------ */}
      <section className="tarjeta peligro">
        <h2 className="chico">Eliminar mi cuenta</h2>
        <p className="meta">
          Se borra todo: tu perfil, tus datos de salud, tus entrenamientos y
          tu historial. <strong>No se puede deshacer.</strong> Si quieres
          guardar algo, descárgalo antes.
        </p>
        <label className="campo">
          <span>Escribe ELIMINAR para confirmar</span>
          <input type="text" value={confirmaBorrado} className="mono"
                 autoCapitalize="characters" autoComplete="off"
                 onChange={e => setConfirmaBorrado(e.target.value.toUpperCase())} />
        </label>
        <button type="button" className="boton-peligro"
                disabled={confirmaBorrado !== 'ELIMINAR' || ocupado}
                onClick={eliminar}>
          Eliminar mi cuenta
        </button>
      </section>
    </main>
  )
}

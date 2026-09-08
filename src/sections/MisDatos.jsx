import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CONSENTIMIENTOS, VERSION_CONSENTIMIENTO, mensajeDeError
} from '../lib/consentimientos.js'
import {
  revisarNombre, cambioNombre, revisarCorreo, cambioCorreo,
  revisarClave, resultadoDeCambioDeCorreo, CLAVE_MINIMA
} from '../lib/cuenta.js'
import { diaEnBogota, formatearFecha } from '../data/fechas.js'

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

   EL 8/09 SE COMPLETÓ EL DERECHO DE ACTUALIZAR, que estaba a medias y
   se notaba poco: los datos de salud se editaban desde el primer día,
   pero el nombre, el correo y la contraseña —las tres cosas que la
   persona escribió para entrar— no se podían tocar desde ninguna
   pantalla. "Actualizar" no es un derecho sobre parte de los datos.

   El correo no vive en `perfiles` sino en la tabla de acceso de
   Supabase, así que se pide y se cambia por otro camino
   (`supabase.auth`) y no con un `update`. Ver el comentario de
   `guardarRegistro`.
   ===================================================================== */

const VACIO = { fecha_nac: '', peso_kg: '', altura_cm: '', objetivo: '', lesiones: '' }

/* El mismo que usa `Perfil`. Se repite en vez de compartirse porque son
   siete palabras: un archivo nuevo para esto costaría más leerlo que
   escribirlo dos veces. Si algún día son cinco roles, se comparte. */
const NOMBRE_DEL_ROL = {
  admin:     'Entrenador',
  cliente:   'Cliente',
  visitante: 'Invitado'
}

export default function MisDatos ({ perfil, alVolver, alSalir, recargarPerfil }) {
  const [salud, setSalud] = useState(VACIO)

  /* Tu registro: lo que escribiste para entrar.
   *
   * `correoEnUso` es el que HOY sirve para entrar, y no siempre es el
   * que se ve en el campo: si el proyecto pide confirmación, el correo
   * nuevo se queda esperando y el viejo sigue siendo el bueno. Por eso
   * son dos cosas distintas y no una. */
  const [nombre, setNombre] = useState(perfil.nombre || '')
  const [correo, setCorreo] = useState('')
  const [correoEnUso, setCorreoEnUso] = useState('')
  const [msgRegistro, setMsgRegistro] = useState(null)
  const [errRegistro, setErrRegistro] = useState(null)

  /* La contraseña va detrás de un botón y no a la vista. Esta pantalla
   * ya es larga, y dos campos más que casi nadie usa la vuelven más
   * larga para todo el mundo. */
  const [cambiandoClave, setCambiandoClave] = useState(false)
  const [claveNueva, setClaveNueva] = useState('')
  const [claveRepetida, setClaveRepetida] = useState('')
  const [errClave, setErrClave] = useState(null)
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
      /* LOS DOS .eq('perfil_id', ...) SON OBLIGATORIOS. Es el mismo bug
       * del 2/09 que dejaba al entrenador fuera de la app (ver el
       * comentario largo en useSesion.js), pero aquí las consecuencias
       * son peores.
       *
       * Las políticas de `perfil_salud` y de `consentimientos` dicen
       * "tu fila O eres admin". Sin filtrar, el entrenador pedía "los
       * datos de salud" y la base le devolvía los de TODOS sus
       * clientes; maybeSingle() reventaba, o peor, con un solo cliente
       * con datos le habría mostrado el peso y las lesiones de esa
       * persona dentro de su propia pantalla de "Mis datos".
       *
       * Eso no es un fallo de presentación: es un dato sensible de un
       * tercero apareciendo donde no debe. Que la política PERMITA al
       * entrenador leerlo (lo necesitará en la Fase 5 para programar)
       * no significa que quepa en esta pantalla, que es la del titular
       * sobre sí mismo. */
      const { data } = await supabase
        .from('perfil_salud')
        .select('*')
        .eq('perfil_id', perfil.id)
        .maybeSingle()

      /* El correo NO está en `perfiles`: vive en la tabla de acceso de
       * Supabase, que esta app no consulta directo. `getUser()` lo pide
       * al servidor en vez de leer la copia guardada en el celular —
       * que puede estar vieja, exactamente por lo mismo que el bug de
       * los dos perfiles del 4/09. */
      const { data: usuario } = await supabase.auth.getUser()

      const { data: cons } = await supabase
        .from('consentimientos')
        .select('aceptado')
        .eq('perfil_id', perfil.id)
        .eq('tipo', 'datos_sensibles')
        .order('fecha', { ascending: false })
        .limit(1)

      if (!vivo) return

      if (usuario && usuario.user) {
        setCorreo(usuario.user.email || '')
        setCorreoEnUso(usuario.user.email || '')
      }

      if (data) {
        setSalud({
          fecha_nac:  data.fecha_nac || '',
          // El String() es para el <input>, no por el tipo: un campo de
          // texto quiere una cadena, y pasarle un número hace que React
          // avise en la consola.
          //
          // CORREGIDO EL 2/09: aquí decía que un `numeric` vuelve como
          // TEXTO desde Postgres. Es falso por la API de Supabase, que
          // lo entrega como número de verdad (74.5). Lo que sí devuelve
          // texto es el driver de Node conectado directo a la base, que
          // no es el caso de esta app.
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
  }, [perfil.id])

  const cambiar = (campo, valor) => setSalud(s => ({ ...s, [campo]: valor }))

  /* DERECHO DE ACTUALIZAR, la parte que faltaba: el nombre y el correo.
   *
   * SON DOS ESCRITURAS EN DOS SITIOS DISTINTOS, y por eso no es un solo
   * `update`. El nombre está en `perfiles`, una tabla normal. El correo
   * está en la tabla de acceso de Supabase, que ninguna política de
   * esta app gobierna: se cambia con `auth.updateUser` y el servidor
   * decide si hace falta confirmar.
   *
   * Se manda solo lo que cambió. Sin esa comprobación, abrir la
   * pantalla y tocar "Guardar" mandaría un correo de confirmación por
   * un cambio que no existe. */
  async function guardarRegistro (e) {
    e.preventDefault()
    setErrRegistro(null); setMsgRegistro(null)

    const malNombre = revisarNombre(nombre)
    if (malNombre) { setErrRegistro(malNombre); return }
    const malCorreo = revisarCorreo(correo)
    if (malCorreo) { setErrRegistro(malCorreo); return }

    const tocaNombre = cambioNombre(nombre, perfil.nombre)
    const tocaCorreo = cambioCorreo(correo, correoEnUso)
    if (!tocaNombre && !tocaCorreo) {
      setMsgRegistro('No cambiaste nada.')
      return
    }

    setOcupado(true)
    const hechos = []

    if (tocaNombre) {
      const { error: err } = await supabase.from('perfiles')
        .update({ nombre: nombre.trim() })
        .eq('id', perfil.id)     // regla 13: la política dice lo mismo,
                                 // el filtro se escribe igual
      if (err) { setErrRegistro(mensajeDeError(err)); setOcupado(false); return }
      hechos.push('Tu nombre quedó actualizado.')
      // Sin esto la app entera sigue saludando con el nombre viejo hasta
      // la próxima vez que se abra.
      if (recargarPerfil) recargarPerfil()
    }

    if (tocaCorreo) {
      const { data, error: err } = await supabase.auth.updateUser({
        email: correo.trim()
      })
      if (err) {
        /* El nombre pudo haberse guardado ya. Mostrar solo el fallo
         * sería falso y llevaría a intentarlo otra vez sin necesidad. */
        if (hechos.length) setMsgRegistro(hechos.join(' '))
        setErrRegistro(mensajeDeError(err))
        setOcupado(false)
        return
      }
      const r = resultadoDeCambioDeCorreo(data && data.user)
      // El campo se deja como lo escribió la persona; lo que se
      // actualiza es cuál sirve HOY para entrar, que puede ser el viejo.
      if (r.correoEnUso) setCorreoEnUso(r.correoEnUso)
      hechos.push(r.mensaje)
    }

    setMsgRegistro(hechos.join(' '))
    setOcupado(false)
  }

  /* La contraseña. Se pide dos veces y se comprueba ANTES de mandarla:
   * el campo va oculto, así que un dedazo no se ve, y guardado deja a
   * la persona fuera de su propia cuenta. Ver `revisarClave`. */
  async function guardarClave (e) {
    e.preventDefault()
    setErrClave(null)

    const mal = revisarClave(claveNueva, claveRepetida)
    if (mal) { setErrClave(mal); return }

    setOcupado(true)
    const { error: err } = await supabase.auth.updateUser({ password: claveNueva })
    if (err) { setErrClave(mensajeDeError(err)); setOcupado(false); return }

    // Se vacían y se cierra el bloque: dejar la contraseña escrita en
    // pantalla después de guardarla no aporta nada y sí queda a la vista
    // de quien pase por al lado.
    setClaveNueva(''); setClaveRepetida(''); setCambiandoClave(false)
    setMsgRegistro('Tu contraseña quedó cambiada.')
    setOcupado(false)
  }

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

    /* EL CORREO SE AGREGA AQUÍ, y no es un adorno: sin él el archivo
     * estaría incompleto, y un archivo incompleto no cumple el derecho
     * de conocer.
     *
     * `mis_datos()` no lo trae porque no puede: el correo vive en el
     * esquema de acceso de Supabase y la función solo mira el nuestro.
     * Abrirle ese esquema a una función `security definer` por un dato
     * que el navegador ya tiene en la mano sería agrandar la superficie
     * para nada. */
    const completo = { ...data, correo: correoEnUso || null }

    const archivo = new Blob([JSON.stringify(completo, null, 2)],
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

      {/* --- 0. TU REGISTRO --------------------------------------------
          VA DE PRIMERO, antes que la descarga, porque es la respuesta a
          la primera pregunta que alguien se hace al abrir esta pantalla:
          con qué correo entré. Lo demás son datos SOBRE ti; esto eres
          tú. */}
      <section className="tarjeta">
        <h2 className="chico">Tu registro</h2>
        <p className="meta">
          Lo que escribiste para entrar. Todo se puede cambiar.
        </p>

        <form className="formulario" onSubmit={guardarRegistro}>
          <label className="campo">
            <span>Tu nombre</span>
            <input type="text" value={nombre} autoComplete="name"
                   onChange={e => setNombre(e.target.value)} />
            <small className="pista">
              Es el que ve tu entrenador y con el que te saluda la app.
            </small>
          </label>

          <label className="campo">
            <span>Tu correo</span>
            <input type="email" value={correo}
                   autoComplete="email" inputMode="email" autoCapitalize="none"
                   onChange={e => setCorreo(e.target.value)} />
            <small className="pista">
              {/* Se dice ANTES de tocar el campo, no después de guardar.
                  Que cambiar esto cambia por dónde entras no es un
                  detalle: es la consecuencia entera. */}
              Con este correo entras a la app. Si lo cambias, puede que
              te mandemos un enlace para confirmarlo; hasta que lo abras,
              sigues entrando con el de ahora.
            </small>
          </label>

          {msgRegistro && <p className="aviso es-ok" role="status">{msgRegistro}</p>}
          {errRegistro && <p className="aviso es-error" role="alert">{errRegistro}</p>}

          <button type="submit" className="boton-principal" disabled={ocupado}>
            {ocupado ? 'Un momento…' : 'Guardar cambios'}
          </button>
        </form>

        {/* La contraseña, detrás de un botón. Es la única de las tres que
            no se puede MOSTRAR —nadie guarda una contraseña legible, ni
            nosotros ni Supabase—, así que no es un campo que se corrige:
            es una acción que se hace. */}
        {!cambiandoClave && (
          <button type="button" className="enlace"
                  onClick={() => { setCambiandoClave(true); setErrClave(null) }}>
            Cambiar mi contraseña
          </button>
        )}

        {cambiandoClave && (
          <form className="formulario formulario-aparte" onSubmit={guardarClave}>
            <label className="campo">
              <span>Contraseña nueva</span>
              <input type="password" value={claveNueva}
                     autoComplete="new-password"
                     onChange={e => setClaveNueva(e.target.value)} />
              <small className="pista">Mínimo {CLAVE_MINIMA} caracteres.</small>
            </label>

            <label className="campo">
              <span>Escríbela otra vez</span>
              <input type="password" value={claveRepetida}
                     autoComplete="new-password"
                     onChange={e => setClaveRepetida(e.target.value)} />
              <small className="pista">
                {/* La razón, dicha en la pantalla y no solo en el código:
                    el campo va oculto y un dedazo no se ve. */}
                Va dos veces porque no se puede leer lo que escribes. Si
                se guardara con una letra de más, quedarías fuera de tu
                cuenta.
              </small>
            </label>

            {errClave && <p className="aviso es-error" role="alert">{errClave}</p>}

            <button type="submit" className="boton-principal" disabled={ocupado}>
              {ocupado ? 'Un momento…' : 'Cambiar contraseña'}
            </button>
            <button type="button" className="enlace"
                    onClick={() => {
                      setCambiandoClave(false)
                      setClaveNueva(''); setClaveRepetida(''); setErrClave(null)
                    }}>
              Dejarlo como está
            </button>
          </form>
        )}

        {/* Los dos datos que NO se editan, y se dice por qué en vez de
            esconderlos. El rol lo da el código del entrenador, no la
            persona; la fecha es un hecho. */}
        <p className="pista">
          Entraste como <strong>{NOMBRE_DEL_ROL[perfil.rol] || 'Cliente'}</strong>
          {perfil.creado_en &&
            <> · en la app desde el {formatearFecha(diaEnBogota(perfil.creado_en))}</>}
        </p>
      </section>

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

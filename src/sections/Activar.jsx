import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CONSENTIMIENTOS, VERSION_CONSENTIMIENTO, mensajeDeError
} from '../lib/consentimientos.js'
import { puertaDeEdad, fechaMaximaDeMayor, MAYORIA_DE_EDAD } from '../lib/edad.js'

/* El paso entre "tengo cuenta" y "puedo usar la app".
 *
 * Aquí pasan tres cosas, en este orden y no en otro:
 *
 *   1. La persona dice su nombre, y si tiene código lo canjea.
 *   2. Se crea su PERFIL (visitante o cliente, según el código).
 *   3. Se guardan sus autorizaciones.
 *
 * El orden importa: los consentimientos apuntan al perfil con una
 * llave foránea, así que no pueden existir antes que él. Si se
 * intentara al revés, la base los rechazaría.
 *
 * LA PUERTA DE EDAD VA ANTES QUE TODO LO DEMÁS (4/09). El artículo 7
 * de la Ley 1581 prohíbe tratar datos de niños y adolescentes, y el
 * artículo 12 del Decreto 1377 exige que, cuando se permite, autorice
 * el representante legal. Esta app guarda datos de SALUD: montar el
 * flujo del representante a medias sería dejar la apariencia de
 * cumplimiento sin el cumplimiento. Así que la puerta BLOQUEA.
 *
 * Y bloquea AQUÍ y no en el registro por una razón concreta: el
 * registro solo crea un correo y una clave, y sin perfil eso no da
 * acceso a nada. Este es el momento en que la app empieza a tratar
 * datos de una persona — su nombre, y detrás su plan y su salud.
 *
 * La fecha NO SE GUARDA. Se pregunta, se calcula y se descarta. Ver el
 * comentario largo de src/lib/edad.js.
 *
 * SOBRE EL CÓDIGO: es opcional a propósito. Sin él se entra como
 * visitante y se ve el catálogo de ejercicios y el contenido público;
 * con él se entra como cliente y aparece el plan. Es la puerta que
 * convierte la app de herramienta de entrega en un canal por donde
 * llegan clientes nuevos.
 */
export default function Activar ({ alActivar, alSalir }) {
  const [nombre, setNombre] = useState('')
  const [nacimiento, setNacimiento] = useState('')
  const [codigo, setCodigo] = useState('')
  const [avisos, setAvisos] = useState(false)
  const [aceptaDatos, setAceptaDatos] = useState(false)
  const [aceptaRiesgo, setAceptaRiesgo] = useState(false)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const puerta = puertaDeEdad(nacimiento)

  /* Faltan los tres de siempre Y que la puerta diga que sí. `mayor` a
   * secas y no `!== 'menor'`: quien todavía no ha contestado tampoco
   * puede seguir, y con la comparación negada sí podría. */
  const listo = nombre.trim() && aceptaDatos && aceptaRiesgo &&
                puerta.estado === 'mayor'

  /* La salida para quien no puede entrar.
   *
   * A esta persona ya se le creó una cuenta de acceso —correo y clave—
   * en la pantalla anterior. Dejarla ahí sería quedarse con el correo
   * de un menor, que es exactamente el dato que la puerta existe para
   * no tratar. Así que se le ofrece borrarla en el mismo sitio donde se
   * le dice que no puede seguir, sin que tenga que buscar cómo.
   *
   * `eliminar_mi_cuenta` es la misma función del habeas data
   * (03-funciones.sql). No hay una versión especial para este caso: el
   * derecho de supresión es el mismo. */
  async function borrarCuenta () {
    setOcupado(true)
    const { error: err } = await supabase.rpc('eliminar_mi_cuenta')
    if (err) {
      console.error('No se pudo eliminar la cuenta:', err)
      setError('No se pudo eliminar la cuenta. Inténtalo otra vez.')
      setOcupado(false)
      return
    }
    await supabase.auth.signOut()
  }

  async function enviar (e) {
    e.preventDefault()
    setError(null)

    /* SE VUELVE A COMPROBAR AQUÍ aunque el botón ya esté deshabilitado.
     * Un botón deshabilitado es una cortesía visual: se quita desde la
     * consola en dos segundos, y este formulario crea un perfil. La
     * comprobación que vale es la que corre justo antes de escribir. */
    if (puertaDeEdad(nacimiento).estado !== 'mayor') {
      setError('Necesitamos confirmar tu fecha de nacimiento para continuar.')
      return
    }

    setOcupado(true)

    // 1 y 2. Con código -> cliente. Sin código -> visitante.
    // Las dos funciones viven en la base (03-funciones.sql) y validan
    // por su cuenta: el navegador no decide quién es cliente.
    const conCodigo = codigo.trim().length > 0
    const { error: err } = conCodigo
      ? await supabase.rpc('vincular_con_codigo', {
          p_codigo: codigo.trim(), p_nombre: nombre.trim()
        })
      : await supabase.rpc('crear_perfil_visitante', {
          p_nombre: nombre.trim()
        })

    if (err) { setError(mensajeDeError(err)); setOcupado(false); return }

    // 3. Las autorizaciones, una fila por finalidad.
    //
    // Van DESPUÉS y en su propia llamada, no dentro de la función de
    // arriba, por una razón concreta: la tabla no acepta cambios ni
    // borrados, solo inserciones. Cada "sí" y cada "no" queda escrito
    // con su fecha y su versión, y eso es lo que sirve de prueba de
    // que hubo autorización informada.
    //
    // Fíjate que 'notificaciones' se guarda TAMBIÉN cuando la persona
    // dijo que no (aceptado: false). Un "no" registrado vale tanto como
    // un "sí": es la diferencia entre "dijo que no" y "nunca se le
    // preguntó".
    const { data: { user } } = await supabase.auth.getUser()

    const { error: errC } = await supabase.from('consentimientos').insert(
      [
        ['datos_personales',   true],
        ['descargo_ejercicio', true],
        ['notificaciones',     avisos]
      ].map(([tipo, aceptado]) => ({
        perfil_id: user.id,
        tipo,
        version: VERSION_CONSENTIMIENTO,
        aceptado
      }))
    )

    // Si esto falla, la cuenta ya quedó creada. No se le puede echar
    // atrás a la persona por un fallo nuestro: entra igual y queda el
    // rastro en la consola.
    if (errC) console.error('No se guardaron los consentimientos:', errC)

    await alActivar()
  }

  return (
    <main className="acceso">
      <div className="acceso-caja">
        <header className="acceso-cab">
          <h1>Ya casi</h1>
          <p className="bajada">Dinos cómo te llamas para terminar.</p>
        </header>

        <form className="formulario" onSubmit={enviar}>
          <label className="campo">
            <span>Tu nombre</span>
            <input
              type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              autoComplete="given-name" required
            />
          </label>

          <label className="campo">
            <span>Tu fecha de nacimiento</span>
            <input
              type="date" value={nacimiento} required
              /* `max` es COMODIDAD, no seguridad: el calendario del
                 celular no deja pasar de ahí, así que el caso normal se
                 resuelve sin que nadie vea un error. Quien decide es
                 puertaDeEdad — un atributo del HTML lo cambia
                 cualquiera desde la consola. */
              max={fechaMaximaDeMayor()}
              onChange={e => setNacimiento(e.target.value)}
            />
            <small className="pista">
              No la guardamos. Solo sirve para confirmar que eres mayor
              de {MAYORIA_DE_EDAD} años, que es lo que la ley nos exige
              antes de tratar tus datos.
            </small>
          </label>

          {/* Se dice apenas se sabe, no al tocar "Entrar". Llenar el
              resto del formulario para que al final le digan que no
              podía es la peor forma de dar esta noticia. */}
          {puerta.estado === 'menor' && (
            <div className="aviso es-error" role="alert">
              <p>
                <strong>Todavía no puedes usar la app.</strong>
              </p>
              <p>
                La ley colombiana no nos deja guardar los datos de
                menores de {MAYORIA_DE_EDAD} años sin la autorización de
                tu representante legal, y la app todavía no tiene forma
                de recogerla. Habla con tu entrenador: él puede seguir
                entrenándote, lo que no podemos es guardar tus datos aquí.
              </p>
              <p>
                Ya creamos una cuenta con tu correo. Si quieres, la
                borramos ahora mismo.
              </p>
              <button type="button" className="boton-peligro"
                      disabled={ocupado} onClick={borrarCuenta}>
                {ocupado ? 'Borrando…' : 'Borrar mi cuenta'}
              </button>
            </div>
          )}

          <label className="campo">
            <span>Código de tu entrenador <em className="opcional">opcional</em></span>
            <input
              type="text" value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              autoCapitalize="characters" autoComplete="off"
              /* Ancho fijo por carácter: así los 10 del código quedan
                 parejos y se revisan de un vistazo contra el papel o el
                 WhatsApp donde vienen. */
              className="mono"
            />
            <small className="pista">
              Si no tienes, déjalo vacío. Entras igual y ves los ejercicios
              y las recetas; el plan de entrenamiento es para clientes.
            </small>
          </label>

          <fieldset className="permisos">
            <legend>Antes de entrar</legend>

            <label className="permiso">
              <input type="checkbox" checked={aceptaDatos}
                     onChange={e => setAceptaDatos(e.target.checked)} />
              <span>
                <strong>{CONSENTIMIENTOS.datos_personales.titulo}</strong>
                {CONSENTIMIENTOS.datos_personales.texto}
              </span>
            </label>

            <label className="permiso">
              <input type="checkbox" checked={aceptaRiesgo}
                     onChange={e => setAceptaRiesgo(e.target.checked)} />
              <span>
                <strong>{CONSENTIMIENTOS.descargo_ejercicio.titulo}</strong>
                {CONSENTIMIENTOS.descargo_ejercicio.texto}
              </span>
            </label>

            <label className="permiso">
              <input type="checkbox" checked={avisos}
                     onChange={e => setAvisos(e.target.checked)} />
              <span>
                <strong>{CONSENTIMIENTOS.notificaciones.titulo}</strong>
                {CONSENTIMIENTOS.notificaciones.texto}
                {' '}<em className="opcional">Opcional. Puedes cambiarlo después.</em>
              </span>
            </label>
          </fieldset>

          {error && <p className="aviso es-error" role="alert">{error}</p>}

          <button type="submit" className="boton-principal"
                  disabled={!listo || ocupado}>
            {ocupado ? 'Un momento…' : 'Entrar'}
          </button>
        </form>

        <button type="button" className="enlace" onClick={alSalir}>
          Salir de esta cuenta
        </button>
      </div>
    </main>
  )
}

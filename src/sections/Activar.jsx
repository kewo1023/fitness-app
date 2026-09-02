import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CONSENTIMIENTOS, VERSION_CONSENTIMIENTO, mensajeDeError
} from '../lib/consentimientos.js'

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
 * SOBRE EL CÓDIGO: es opcional a propósito. Sin él se entra como
 * visitante y se ve el catálogo de ejercicios y el contenido público;
 * con él se entra como cliente y aparece el plan. Es la puerta que
 * convierte la app de herramienta de entrega en un canal por donde
 * llegan clientes nuevos.
 */
export default function Activar ({ alActivar, alSalir }) {
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [avisos, setAvisos] = useState(false)
  const [aceptaDatos, setAceptaDatos] = useState(false)
  const [aceptaRiesgo, setAceptaRiesgo] = useState(false)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const listo = nombre.trim() && aceptaDatos && aceptaRiesgo

  async function enviar (e) {
    e.preventDefault()
    setError(null)
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

import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { mensajeDeError } from '../lib/consentimientos.js'

/* La puerta de la calle: entrar o crear una cuenta.
 *
 * Aquí SOLO se maneja el correo y la contraseña. Decir tu nombre y
 * canjear el código de tu entrenador es el paso siguiente, en
 * Activar.jsx, y esa separación es a propósito:
 *
 *   - Quien se acaba de registrar y quien se registró la semana pasada
 *     y nunca terminó llegan al mismo sitio, por un solo camino.
 *   - Si el registro y la activación fueran una sola pantalla, un fallo
 *     a mitad de camino dejaría cuentas a medias sin forma de
 *     recuperarlas.
 *
 * Como la confirmación por correo está apagada en Supabase, al crear la
 * cuenta la sesión queda abierta de una: no hay que ir al correo. Es
 * deliberado — el correo que trae Supabase manda 2 mensajes por hora, y
 * lo que valida a un cliente es su código, no su correo.
 */
export default function Acceso () {
  const [modo, setModo] = useState('entrar')      // 'entrar' | 'crear'
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const creando = modo === 'crear'

  async function enviar (e) {
    e.preventDefault()
    setError(null)

    if (creando && clave.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
      return
    }

    setOcupado(true)
    const credenciales = { email: correo.trim(), password: clave }

    const { error: err } = creando
      ? await supabase.auth.signUp(credenciales)
      : await supabase.auth.signInWithPassword(credenciales)

    // Si salió bien no se hace nada más: useSesion está escuchando el
    // cambio de sesión y la app se mueve sola a la pantalla siguiente.
    if (err) { setError(mensajeDeError(err)); setOcupado(false) }
  }

  return (
    <main className="acceso">
      <div className="acceso-caja">
        <header className="acceso-cab">
          <h1>Entrena</h1>
          <p className="bajada">
            {creando
              ? 'Crea tu cuenta. Si tu entrenador te dio un código, lo pones en el paso siguiente.'
              : 'Entra con tu correo y tu contraseña.'}
          </p>
        </header>

        <form className="formulario" onSubmit={enviar}>
          <label className="campo">
            <span>Correo</span>
            <input
              type="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              required
            />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              /* Le dice al gestor de contraseñas si debe ofrecer una
                 guardada o proponer una nueva. Sin esto, al crear cuenta
                 el navegador rellena la vieja y la persona no entiende
                 por qué falla. */
              autoComplete={creando ? 'new-password' : 'current-password'}
              required
            />
            {creando && <small className="pista">Mínimo 8 caracteres.</small>}
          </label>

          {/* role="alert" hace que el lector de pantalla lo lea apenas
              aparece. Sin eso, alguien que no ve la pantalla se queda
              esperando sin saber que hubo un error. */}
          {error && <p className="aviso es-error" role="alert">{error}</p>}

          <button type="submit" className="boton-principal" disabled={ocupado}>
            {ocupado ? 'Un momento…' : creando ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          className="enlace"
          onClick={() => { setModo(creando ? 'entrar' : 'crear'); setError(null) }}
        >
          {creando ? 'Ya tengo cuenta' : 'No tengo cuenta todavía'}
        </button>
      </div>
    </main>
  )
}

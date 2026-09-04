import { useState } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { mensajeDeError } from '../lib/consentimientos.js'

/* =====================================================================
   Canjear un código — de invitado a cliente
   =====================================================================

   ESTA PANTALLA TAPA UN CALLEJÓN SIN SALIDA, y vale la pena que quede
   escrito por qué existió.

   `vincular_con_codigo` está pensada desde el 1/09 para dos casos: crear
   el perfil de quien llega con código, y **ascender a cliente a quien ya
   entró como visitante**. Su propio comentario lo dice.

   Pero la única pantalla que la llamaba era `Activar`, y `Activar` solo
   se muestra cuando la persona NO tiene perfil (`acceso.js`). Un
   visitante sí tiene perfil, así que nunca volvía a verla: la app le
   decía en Perfil "con un código de tu entrenador se abren tu plan" y no
   había dónde escribirlo.

   La función de la base llevaba semanas lista para algo que la interfaz
   nunca ofreció. Es el tipo de hueco que no da ningún error: cada mitad
   funciona bien por su lado.

   =====================================================================
   POR QUÉ AQUÍ NO SE VUELVE A PEDIR NADA MÁS
   =====================================================================

   Ni la fecha de nacimiento ni las autorizaciones. No es un atajo:

   - La puerta de edad ya la pasó en `Activar`. Se aplica a los dos
     caminos, con código y sin él, así que un visitante ya está
     confirmado como mayor. Volver a preguntarlo sería pedir un dato que
     ya tenemos para no usarlo.
   - Las autorizaciones que firmó cubren esto. `datos_personales` dice
     "para que mi entrenador vea mi progreso": tener plan es
     exactamente esa finalidad, no una nueva. Si algún día canjear un
     código habilitara una finalidad distinta, ahí sí habría que
     preguntar de nuevo y subir la versión.
   ===================================================================== */

export default function Canjear ({ perfil, alVolver, recargarPerfil }) {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar (e) {
    e.preventDefault()
    setError(null)

    if (codigo.trim().length === 0) {
      setError('Escribe el código que te dio tu entrenador.')
      return
    }

    setOcupado(true)

    /* El nombre que ya tiene. La función lo exige porque también sirve
     * para crear el perfil desde cero, y en ese caso no hay ninguno.
     * Aquí sí lo hay, así que se manda el suyo en vez de pedírselo otra
     * vez — y así tampoco se le puede cambiar sin querer. */
    const { error: err } = await supabase.rpc('vincular_con_codigo', {
      p_codigo: codigo.trim(),
      p_nombre: perfil.nombre
    })

    if (err) { setError(mensajeDeError(err)); setOcupado(false); return }

    /* No se navega a ningún lado: se recarga el perfil y la app entera
     * cambia sola. El rol pasa a `cliente`, y con eso aparecen el plan
     * en Hoy, el progreso y los avisos. Es lo que hace `useSesion`. */
    if (recargarPerfil) recargarPerfil()
    alVolver()
  }

  return (
    <Pantalla
      titulo="Tengo un código"
      accion={
        <button type="button" className="enlace" onClick={alVolver}>Volver</button>
      }
    >
      <section className="tarjeta">
        <h2 className="chico">Escribe el código de tu entrenador</h2>
        <p className="meta">
          Son 10 letras y números. Con él se abren tu plan de
          entrenamiento, tu progreso y tus rutinas de la semana.
        </p>
      </section>

      <form className="formulario" onSubmit={enviar}>
        <label className="campo">
          <span>Código</span>
          <input
            type="text" value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            /* Igual que en Activar: en mayúsculas y con ancho fijo por
               carácter, para poder revisarlo de un vistazo contra el
               WhatsApp donde viene. La base lo normaliza igual, pero
               verlo parejo evita que alguien crea que se equivocó. */
            autoCapitalize="characters" autoComplete="off"
            className="mono"
            inputMode="text"
          />
          <small className="pista">
            El código no lleva la letra O ni la I: lo que parece una O es
            un cero y lo que parece una I es un uno.
          </small>
        </label>

        {error && <p className="aviso es-error" role="alert">{error}</p>}

        <button type="submit" className="boton-principal" disabled={ocupado}>
          {ocupado ? 'Un momento…' : 'Activar mi plan'}
        </button>
      </form>

      <p className="pista">
        Si no tienes código, pídeselo a tu entrenador. Mientras tanto
        puedes seguir viendo los ejercicios y las recetas abiertas.
      </p>
    </Pantalla>
  )
}

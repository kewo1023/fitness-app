import { useState } from 'react'
import Navegacion from './components/Navegacion.jsx'
import Hoy from './sections/Hoy.jsx'
import Ejercicios from './sections/Ejercicios.jsx'
import Progreso from './sections/Progreso.jsx'
import Recetas from './sections/Recetas.jsx'
import Perfil from './sections/Perfil.jsx'
import Acceso from './sections/Acceso.jsx'
import Activar from './sections/Activar.jsx'
import { useSesion } from './hooks/useSesion.js'

/* El cerebro de la app.
 *
 * Decide una sola cosa, pero es la más importante: QUÉ PANTALLA VE
 * QUIEN ABRIÓ LA APP. Hay cuatro respuestas, y salen de los dos datos
 * que devuelve useSesion.
 *
 *   cargando               -> nada todavía, un instante en blanco
 *   sin sesión             -> Acceso: entrar o crear cuenta
 *   con sesión, sin perfil -> Activar: nombre y código
 *   con sesión y perfil    -> la app
 *
 * El tercer caso es el que no es obvio y el que sostiene la seguridad:
 * estar autenticado NO es tener acceso. Alguien puede registrarse y
 * quedarse ahí para siempre — y desde la base no ve ni una fila,
 * porque todas las políticas se apoyan en tener perfil.
 *
 * Analogía de Excel: useSesion es la fórmula que mira dos celdas, y
 * esto es el SI() anidado que decide qué hoja mostrar.
 */

/* La pestaña que antes era "Programas" ahora es "Ejercicios".
 *
 * No es un cambio de nombre: es que la pantalla vieja mostraba un
 * catálogo de programas a los que el cliente se inscribía, y ese modelo
 * está descartado desde el 1/09 — aquí cada cliente tiene SU rutina,
 * armada por el entrenador. Era una pestaña que la base de datos no
 * podía llenar nunca.
 *
 * El plan de la semana del cliente entra en la Fase 4, y su sitio
 * natural es "Hoy", que ya es la pantalla del día. */
const SECCIONES = {
  hoy: Hoy,
  ejercicios: Ejercicios,
  progreso: Progreso,
  recetas: Recetas,
  perfil: Perfil
}

export default function App () {
  const [pestana, setPestana] = useState('hoy')
  const { sesion, perfil, cargando, recargarPerfil, salir } = useSesion()

  // Un instante, mientras se le pregunta a Supabase si hay sesión
  // guardada. Va en blanco a propósito: un mensaje de "cargando" que
  // aparece y desaparece en 200 ms se lee como un parpadeo, no como
  // información.
  if (cargando) return <div className="cargando" aria-busy="true" />

  if (!sesion) return <Acceso />

  if (!perfil) {
    return <Activar alActivar={recargarPerfil} alSalir={salir} />
  }

  const Seccion = SECCIONES[pestana]

  return (
    <div className="app">
      {/* key hace que React desmonte y vuelva a montar la sección al
          cambiar de pestaña. Sin eso, el scroll de una sección se queda
          pegado al entrar a la siguiente. */}
      <Seccion key={pestana} perfil={perfil} alSalir={salir}
               recargarPerfil={recargarPerfil} />
      <Navegacion activa={pestana} alCambiar={setPestana} />
    </div>
  )
}

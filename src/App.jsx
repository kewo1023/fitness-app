import { useState } from 'react'
import Navegacion from './components/Navegacion.jsx'
import Hoy from './sections/Hoy.jsx'
import Programas from './sections/Programas.jsx'
import Progreso from './sections/Progreso.jsx'
import Recetas from './sections/Recetas.jsx'
import Perfil from './sections/Perfil.jsx'

/* El cerebro de la app.
 *
 * Hoy hace una sola cosa: recordar qué pestaña está abierta y pintar la
 * sección que toca. En la Fase 2 aquí entra el estado de quién está
 * usando la app (cargando -> acceso -> app), igual que en nosotros-app.
 *
 * Analogía de Excel: useState es una celda que guarda un valor. Cuando
 * el valor cambia, todo lo que la referenciaba se vuelve a calcular
 * solo. La diferencia con Excel es que aquí, en vez de recalcular
 * fórmulas, se vuelve a dibujar la pantalla.
 */

const SECCIONES = {
  hoy: Hoy,
  programas: Programas,
  progreso: Progreso,
  recetas: Recetas,
  perfil: Perfil
}

export default function App () {
  const [pestana, setPestana] = useState('hoy')
  const Seccion = SECCIONES[pestana]

  return (
    <div className="app">
      {/* key hace que React desmonte y vuelva a montar la sección al
          cambiar de pestaña. Sin eso, el scroll de una sección se queda
          pegado al entrar a la siguiente. */}
      <Seccion key={pestana} />
      <Navegacion activa={pestana} alCambiar={setPestana} />
    </div>
  )
}

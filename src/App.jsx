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
import { pantallaPara, PANTALLAS } from './lib/acceso.js'

/* El cerebro de la app.
 *
 * Decide una sola cosa, pero es la más importante: QUÉ PANTALLA VE
 * QUIEN ABRIÓ LA APP.
 *
 * LA DECISIÓN YA NO VIVE AQUÍ. Está en `src/lib/acceso.js`, que es una
 * función pura y probada. Se sacó el 4/09 después del segundo bug
 * seguido en estas cuatro líneas: no se podían probar, y es el sitio
 * donde un error se ve como un cambio de pantalla en vez de como un
 * error.
 *
 * Este archivo se quedó con lo que de verdad le toca: traer el estado y
 * pintar lo que la función diga.
 *
 * El caso que no es obvio y que sostiene la seguridad: estar
 * autenticado NO es tener acceso. Alguien puede registrarse y quedarse
 * ahí para siempre — y desde la base no ve ni una fila, porque todas
 * las políticas se apoyan en tener perfil.
 *
 * Analogía de Excel: useSesion trae los datos y acceso.js es el SI()
 * anidado. Antes la fórmula estaba escrita dentro de la celda que
 * pinta; ahora está en su propia hoja y se puede auditar.
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
  const {
    sesion, perfil, errorPerfil, cargando, recargarPerfil, salir
  } = useSesion()

  const pantalla = pantallaPara({ cargando, sesion, perfil, errorPerfil })

  // Un instante, mientras se le pregunta a Supabase si hay sesión
  // guardada. Va en blanco a propósito: un mensaje de "cargando" que
  // aparece y desaparece en 200 ms se lee como un parpadeo, no como
  // información.
  if (pantalla === PANTALLAS.CARGANDO) {
    return <div className="cargando" aria-busy="true" />
  }

  if (pantalla === PANTALLAS.ACCESO) return <Acceso />

  /* No se pudo confirmar quién es, ni siquiera reintentando.
   *
   * Antes este caso terminaba en la pantalla de Activar, o sea que la
   * app le decía "canjea un código para unirte a un entrenador" a
   * alguien que ya tiene cuenta. Un problema de conexión se veía como
   * una afirmación sobre el usuario, y encima una falsa.
   *
   * El texto no habla de tablas ni de la base (regla 3): dice qué pasó
   * y qué hacer. */
  if (pantalla === PANTALLAS.ERROR_PERFIL) {
    return (
      <div className="acceso">
        <div className="acceso-caja">
          <h1>No pudimos cargar tu cuenta</h1>
          <p className="meta">
            Puede ser la conexión. Inténtalo otra vez.
          </p>
          <button type="button" className="boton-principal"
                  onClick={recargarPerfil}>
            Reintentar
          </button>
          <button type="button" className="enlace" onClick={salir}>
            Salir de la cuenta
          </button>
        </div>
      </div>
    )
  }

  if (pantalla === PANTALLAS.ACTIVAR) {
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

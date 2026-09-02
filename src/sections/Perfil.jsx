import { useState } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import MisDatos from './MisDatos.jsx'
import { nivelDesdeXp } from '../lib/gamificacion.js'
import { LOGROS } from '../data/mock.js'

/* El perfil. Ya con el usuario REAL de la base.
 *
 * Es la primera pantalla de la app que no inventa nada: el nombre, el
 * rol y el XP salen de la fila de `perfiles` que trae useSesion.
 *
 * Los logros siguen saliendo de mock.js. Se conectan en la Fase 5,
 * cuando existan sesiones completadas que otorgarlos — hoy la tabla
 * `logros_obtenidos` está vacía para todo el mundo y una lista vacía no
 * enseña nada.
 */

const NOMBRE_DEL_ROL = {
  admin:     'Entrenador',
  cliente:   'Cliente',
  visitante: 'Invitado'
}

export default function Perfil ({ perfil, alSalir }) {
  const [viendoDatos, setViendoDatos] = useState(false)

  if (viendoDatos) {
    return <MisDatos perfil={perfil}
                     alVolver={() => setViendoDatos(false)}
                     alSalir={alSalir} />
  }

  const nivel = nivelDesdeXp(perfil.xp)
  const esVisitante = perfil.rol === 'visitante'
  const obtenidos = LOGROS.filter(l => l.obtenido).length

  return (
    <Pantalla titulo="Perfil">
      <section className="tarjeta perfil-cab">
        <div className="avatar" aria-hidden="true">
          {/* Un nombre podría llegar vacío si alguien lo forzara por
              fuera del formulario. Sin esta guarda, leer [0] de una
              cadena vacía deja el avatar en blanco sin decir por qué. */}
          {(perfil.nombre || '?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="chico">{perfil.nombre}</h2>
          <p className="meta">
            {NOMBRE_DEL_ROL[perfil.rol] || 'Cliente'}
            {!esVisitante && ` · Nivel ${nivel} · ${perfil.xp} XP`}
          </p>
        </div>
      </section>

      {/* El visitante ve QUÉ se está perdiendo y CÓMO se desbloquea. Una
          función bloqueada sin explicación se lee como que la app está
          rota; con explicación, es una invitación. */}
      {esVisitante && (
        <section className="tarjeta">
          <h2 className="chico">Estás como invitado</h2>
          <p className="meta">
            Puedes ver los ejercicios y las recetas abiertas. Con un código
            de tu entrenador se abren tu plan de entrenamiento, tu progreso
            y la posibilidad de escribirle directo.
          </p>
        </section>
      )}

      {!esVisitante && (
        <>
          <h3 className="titulillo">
            Logros <span className="tenue">{obtenidos} de {LOGROS.length}</span>
          </h3>
          <ul className="lista">
            {LOGROS.map(l => (
              <li key={l.clave}
                  className={'fila' + (l.obtenido ? '' : ' es-bloqueado')}>
                <span className="fila-datos">
                  <strong>{l.nombre}</strong>
                  <small>{l.desc}</small>
                </span>
                <span className={'estado' + (l.obtenido ? ' es-ok' : '')}>
                  {l.obtenido ? 'listo' : 'pendiente'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="titulillo">Tu cuenta</h3>
      <ul className="lista">
        <li className="fila">
          <span className="fila-datos">
            <strong>Mis datos</strong>
            <small>Descargar, corregir o eliminar tu información</small>
          </span>
          <button type="button" className="enlace enlace-fila"
                  onClick={() => setViendoDatos(true)}>Abrir</button>
        </li>
        <li className="fila es-proxima">
          <span className="fila-datos">
            <strong>Notificaciones</strong>
            <small>Recordatorio del entrenamiento del día</small>
          </span>
          <span className="estado">Fase 7</span>
        </li>
      </ul>

      <button type="button" className="enlace" onClick={alSalir}>
        Cerrar sesión
      </button>
    </Pantalla>
  )
}

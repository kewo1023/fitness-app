import Pantalla from '../components/Pantalla.jsx'
import { USUARIO, LOGROS } from '../data/mock.js'

/* El perfil y los logros.
 *
 * De aquí van a colgar dos cosas en la Fase 2: la pantalla "Mis datos"
 * (descargar, corregir y eliminar lo suyo, que es el canal de habeas
 * data que exige la Ley 1581) y la entrada al panel del entrenador para
 * los que tengan rol admin.
 */
export default function Perfil () {
  const obtenidos = LOGROS.filter(l => l.obtenido).length

  return (
    <Pantalla titulo="Perfil">
      <section className="tarjeta perfil-cab">
        <div className="avatar" aria-hidden="true">
          {USUARIO.nombre[0]}
        </div>
        <div>
          <h2 className="chico">{USUARIO.nombre}</h2>
          <p className="meta">Nivel {USUARIO.nivel} · {USUARIO.xp} XP</p>
        </div>
      </section>

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

      <h3 className="titulillo">Tu cuenta</h3>
      <ul className="lista">
        <li className="fila es-proxima">
          <span className="fila-datos">
            <strong>Mis datos</strong>
            <small>Descargar, corregir o eliminar tu información</small>
          </span>
          <span className="estado">Fase 2</span>
        </li>
        <li className="fila es-proxima">
          <span className="fila-datos">
            <strong>Notificaciones</strong>
            <small>Recordatorio del entrenamiento del día</small>
          </span>
          <span className="estado">Fase 7</span>
        </li>
      </ul>
    </Pantalla>
  )
}

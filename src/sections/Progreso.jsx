import Pantalla from '../components/Pantalla.jsx'
import { HISTORIAL, USUARIO } from '../data/mock.js'
import { formatearFecha, nombreDia, diaSemanaBogota } from '../data/fechas.js'

/* Lo que ya hizo. En la Fase 5 los números salen de la base con SQL;
 * hoy vienen de mock.js.
 */
export default function Progreso ({ perfil }) {
  const hechas = HISTORIAL.filter(s => s.completada)
  const minutos = hechas.reduce((suma, s) => suma + s.duracion, 0)

  return (
    <Pantalla titulo="Progreso" bajada="Lo que llevas hecho">
      <section className="cifras">
        <div className="cifra">
          <strong>{hechas.length}</strong>
          <small>entrenamientos</small>
        </div>
        <div className="cifra">
          <strong>{minutos}</strong>
          <small>minutos</small>
        </div>
        <div className="cifra">
          <strong>{USUARIO.nivel}</strong>
          <small>nivel</small>
        </div>
      </section>

      <h3 className="titulillo">Historial</h3>
      <ul className="lista">
        {HISTORIAL.map(s => (
          <li key={s.fecha} className="fila">
            <span className="fila-datos">
              <strong>{s.rutina}</strong>
              <small>
                {nombreDia(diaSemanaBogota(s.fecha))} {formatearFecha(s.fecha)}
              </small>
            </span>
            <span className={'estado' + (s.completada ? ' es-ok' : '')}>
              {s.completada ? `${s.duracion} min` : 'sin terminar'}
            </span>
          </li>
        ))}
      </ul>
    </Pantalla>
  )
}

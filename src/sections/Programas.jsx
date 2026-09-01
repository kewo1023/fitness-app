import Pantalla from '../components/Pantalla.jsx'
import { PROGRAMAS } from '../data/mock.js'

/* La biblioteca. Un programa es un plan de varias semanas, no una rutina
 * suelta: el cliente se inscribe a uno y la app le dice qué toca cada
 * día. Menos decisiones para él, más adherencia.
 */
export default function Programas () {
  const inscrito = PROGRAMAS.find(p => p.inscrito)
  const resto = PROGRAMAS.filter(p => !p.inscrito)

  return (
    <Pantalla titulo="Programas" bajada="Planes de varias semanas">
      {inscrito && (
        <>
          <h3 className="titulillo">En curso</h3>
          <article className="tarjeta destacada">
            <p className="etiqueta">
              Semana {inscrito.semanaActual} de {inscrito.semanas}
            </p>
            <h2>{inscrito.nombre}</h2>
            <p className="meta">{inscrito.descripcion}</p>
            <div className="barra" role="img"
                 aria-label={`Semana ${inscrito.semanaActual} de ${inscrito.semanas}`}>
              <span style={{
                width: `${(inscrito.semanaActual / inscrito.semanas) * 100}%`
              }} />
            </div>
          </article>
        </>
      )}

      <h3 className="titulillo">Disponibles</h3>
      <div className="rejilla">
        {resto.map(p => (
          <article key={p.id} className="tarjeta">
            <h2 className="chico">{p.nombre}</h2>
            <p className="meta">{p.descripcion}</p>
            <p className="pastillas">
              <span className="pastilla">{p.semanas} semanas</span>
              <span className="pastilla">{p.dias} días</span>
              <span className="pastilla">{p.nivel}</span>
            </p>
          </article>
        ))}
      </div>
    </Pantalla>
  )
}

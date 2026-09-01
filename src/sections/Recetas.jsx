import Pantalla from '../components/Pantalla.jsx'
import { RECETAS } from '../data/mock.js'

/* Recetas y hábitos.
 *
 * OJO antes de agregarle nada a esta pantalla (regla 1 de PARAR en
 * CLAUDE.md): el contenido es GENÉRICO, igual para todos. Nada de
 * asignar un plan a una persona ni de calcular calorías según su peso.
 * En Colombia eso es función reservada al nutricionista con tarjeta
 * profesional, y ejercerla sin licencia es materia penal.
 *
 * Por eso tampoco aparece la palabra "nutricional" en ningún texto de
 * esta pantalla, ni debe aparecer.
 */
export default function Recetas () {
  return (
    <Pantalla titulo="Recetas" bajada="Ideas simples para la semana">
      <div className="rejilla">
        {RECETAS.map(r => (
          <article key={r.id} className="tarjeta">
            {/* En la Fase 6 aquí va la foto del plato. */}
            <div className="foto-vacia" aria-hidden="true" />
            <h2 className="chico">{r.nombre}</h2>
            <p className="pastillas">
              <span className="pastilla">{r.momento}</span>
              <span className="pastilla">{r.minutos} min</span>
            </p>
          </article>
        ))}
      </div>

      <p className="descargo">
        Esto es información general de cocina, no una recomendación
        individual. Si tienes alguna condición de salud, consúltalo con un
        profesional.
      </p>
    </Pantalla>
  )
}

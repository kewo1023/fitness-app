import Pantalla from '../components/Pantalla.jsx'
import { fechaLarga } from '../data/fechas.js'
import { USUARIO, META_SEMANAL, RUTINA_DE_HOY } from '../data/mock.js'

/* La pantalla de entrada. Responde una sola pregunta: ¿qué hago hoy?
 *
 * MEDIO CONECTADA: el saludo ya trae el nombre real de la base. La
 * rutina y la racha siguen saliendo de mock.js porque dependen del plan
 * del cliente y de sus sesiones, que son la Fase 4 y la Fase 5. No se
 * dejaron a medias por descuido: mostrar una racha calculada sobre
 * cero sesiones diría "0 / 3" a todo el mundo, y eso se lee como que la
 * app está rota.
 *
 * Todo lo demás de la app está a un toque de distancia. Esta pantalla no
 * ofrece opciones, ofrece EL entrenamiento del día. Es la diferencia
 * entre una app que se usa y un catálogo que se abre una vez.
 */
export default function Hoy ({ perfil }) {
  const r = RUTINA_DE_HOY
  const faltan = Math.max(0, META_SEMANAL - USUARIO.racha)

  return (
    <Pantalla
      titulo={`Hola, ${perfil.nombre}`}
      bajada={fechaLarga()}
    >
      {/* La racha. Único lugar donde aparece el naranja de señal. */}
      <section className="racha">
        <div className="racha-texto">
          <p className="racha-cifra">
            {USUARIO.racha}<span> / {META_SEMANAL}</span>
          </p>
          <p className="racha-pie">
            {faltan === 0
              ? 'Semana cumplida. Bien ahí.'
              : `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} esta semana`}
          </p>
        </div>
        <div className="racha-puntos" aria-hidden="true">
          {Array.from({ length: META_SEMANAL }, (_, i) => (
            <span key={i}
                  className={'punto' + (i < USUARIO.racha ? ' es-lleno' : '')} />
          ))}
        </div>
      </section>

      <section className="tarjeta destacada">
        <p className="etiqueta">{r.programa} · Semana {r.semana}</p>
        <h2>{r.nombre}</h2>
        <p className="meta">
          {r.ejercicios.length} ejercicios · {r.duracionMin} min
        </p>
        <button className="boton-principal">Empezar entrenamiento</button>
      </section>

      <h3 className="titulillo">Los ejercicios</h3>
      <ol className="lista-ejercicios">
        {r.ejercicios.map((e, i) => (
          <li key={e.id} className="ejercicio">
            {/* En la Fase 3 este cuadro es el video de 30 s. Hoy es un
                marcador de posición con el número, para poder ver la
                proporción real de la fila. */}
            <span className="ejercicio-video" aria-hidden="true">{i + 1}</span>
            <span className="ejercicio-datos">
              <strong>{e.nombre}</strong>
              <small>{e.grupo} · {e.equipo}</small>
            </span>
            <span className="ejercicio-series">
              {e.series} × {e.reps}
            </span>
          </li>
        ))}
      </ol>
    </Pantalla>
  )
}

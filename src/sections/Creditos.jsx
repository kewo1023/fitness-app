import Pantalla from '../components/Pantalla.jsx'
import { CREDITO_ILUSTRACIONES } from '../lib/ilustraciones.js'

/* =====================================================================
   Creditos.jsx — la atribución que la licencia EXIGE
   =====================================================================

   ESTA PANTALLA NO ES CORTESÍA. Los dibujos de los ejercicios están bajo
   CC BY-SA 4.0, que permite usarlos —incluso modificados— a cambio de
   tres cosas: nombrar al autor, enlazar la licencia y decir que se
   modificaron. Sin esto, el uso es una infracción.

   Y este repositorio es público, así que la infracción sería pública.

   Va colgada de Perfil y no en una sexta pestaña, por lo mismo que el
   panel del entrenador: la barra de abajo queda igual para todos.

   QUÉ NO VA AQUÍ. Las marcas de las recetas son de autoría propia,
   dibujadas para esta app, así que no deben atribución a nadie. Meterlas
   aquí daría a entender que son de un tercero, que es justo lo contrario
   de lo que pasa.

   Tampoco va el contenido del entrenador: los ejercicios, las
   indicaciones y las recetas son obra suya, y eso lo dice el aviso de
   derechos del pie de Perfil, que es donde corresponde.
   ===================================================================== */
export default function Creditos ({ alVolver }) {
  const c = CREDITO_ILUSTRACIONES

  return (
    <Pantalla
      titulo="Créditos"
      bajada="De dónde salen las ilustraciones"
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      <section className="tarjeta">
        <h3 className="titulillo">Ilustraciones de los ejercicios</h3>
        <p className="meta">
          Son obra de <strong>{c.autor}</strong> y se usan bajo la licencia{' '}
          <a href={c.enlace} target="_blank" rel="noopener noreferrer">
            {c.licencia}
          </a>
          , que permite usarlas y adaptarlas. Vienen de{' '}
          <a href={c.fuente} target="_blank" rel="noopener noreferrer">
            su repositorio público
          </a>
          , normalizadas por {c.normaliz}.
        </p>
        <p className="meta">
          <strong>Se modificaron:</strong> {c.cambios}
        </p>
      </section>

      <section className="tarjeta">
        <h3 className="titulillo">Por qué son dibujos y no fotos</h3>
        <p className="meta">
          La foto de un ejercicio es la foto de una persona, y usar la
          imagen de alguien necesita su permiso, no solo el permiso de
          quien tomó la foto. Un dibujo no es la foto de nadie.
        </p>
        <p className="meta">
          Las fotos que vayas viendo aparecer son de tu entrenador, y
          reemplazan al dibujo apenas él las sube.
        </p>
      </section>

      <section className="tarjeta">
        <h3 className="titulillo">Las de recetas</h3>
        <p className="meta">
          Están dibujadas para esta app y no son de nadie más.
        </p>
      </section>
    </Pantalla>
  )
}

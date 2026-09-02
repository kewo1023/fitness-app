import { useState } from 'react'
import Icono from './Iconos.jsx'
import { temaActual, alternarTema } from '../lib/tema.js'

/* El botón para cambiar entre claro y oscuro.
 *
 * DELIBERADAMENTE DISCRETO. Va arriba a la derecha, del tamaño de una
 * uña y en el color más tenue de la paleta. No es una función de la
 * app: es un ajuste. Si tuviera el peso visual de un botón de verdad,
 * competiría con el título de la pantalla, que sí es lo que importa.
 *
 * Por qué useState y no leer el <html> en cada dibujo: React necesita
 * que le AVISEN que algo cambió para volver a pintar. Cambiar el
 * atributo del <html> a mano no le avisa; el estado sí.
 *
 * Analogía de Excel: el atributo del <html> es la celda donde queda el
 * valor, y el estado es la fórmula que la está mirando. Sin la fórmula,
 * la celda cambia y nadie se entera.
 *
 * Accesibilidad: el área tocable son 40px aunque el dibujo sea de 17.
 * Lo recomendado son 44, y aquí se baja a 40 a propósito por lo de
 * "discreto" — es un control secundario que se usa una vez y nunca
 * más. Bajar de 40 sí sería un error: en un celular sostenido con una
 * mano, un blanco más chico se falla.
 */
export default function BotonTema () {
  const [tema, setTema] = useState(() => temaActual())
  const oscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      className="boton-tema"
      onClick={() => setTema(alternarTema())}
      /* El texto dice qué VA A PASAR, no en qué tema estás. Es lo que
         lee en voz alta el lector de pantalla, y "cambiar a tema claro"
         es una instrucción; "tema oscuro" sería un dato suelto. */
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      <Icono nombre={oscuro ? 'sol' : 'luna'} tam={17} />
    </button>
  )
}

/* =====================================================================
   Ilustracion.jsx — pinta un dibujo que obedece al tema de la app
   =====================================================================

   EL TRUCO, Y POR QUÉ NO ES UN <img>.

   Los dibujos vienen blancos sobre fondo transparente. Sobre el fondo
   blanco de la app son literalmente invisibles, así que hay que
   colorearlos. Un <img> no se deja: el navegador pinta la imagen en su
   propio mundo y el CSS de afuera no entra.

   Lo que sí funciona es usar el dibujo como PLANTILLA (mask-image) en
   vez de como imagen: el elemento se pinta del color que le diga el
   CSS, y el dibujo solo decide POR DÓNDE se pinta.

   Analogía: un stencil. El dibujo es la lámina recortada; la pintura la
   elige uno. Por eso el mismo archivo sirve en tema claro y en oscuro
   sin duplicar nada, y por eso el color puede salir de una variable de
   theme.css como manda la regla 1.

   SI EL NAVEGADOR NO SABE HACERLO no pasa nada malo: el @supports de
   app.css esconde la lámina y queda el mismo hueco neutro de antes.
   Nunca un icono roto.
   ===================================================================== */

/* `clase` existe para una sola cosa: la pantalla de detalle usa
 * .foto-grande, que cambia la proporción de 4/3 a 3/2. Sin esto, el
 * dibujo del detalle mediría distinto que la foto del detalle y la
 * pantalla daría un salto según el ejercicio tuviera foto o no. */
export default function Ilustracion ({ ruta, alt, marca = false, clase = '' }) {
  // Sin ruta no hay dibujo, y eso es normal: el ejercicio que el
  // entrenador acaba de crear todavía no tiene lámina. Se devuelve el
  // mismo hueco que se veía antes de que existiera este componente.
  if (!ruta) return <div className={`foto-vacia ${clase}`.trim()} aria-hidden="true" />

  return (
    <div className={`foto-vacia lamina-caja ${clase}`.trim()}>
      <span
        className={marca ? 'lamina lamina-marca' : 'lamina'}
        /* La ruta entra por una variable de CSS y no por la hoja de
         * estilos porque cambia en cada tarjeta. Es el único sitio de
         * la app donde un estilo va en línea, y es por eso. */
        style={{ '--lamina-img': `url("${ruta}")` }}
        /* Decorativa cuando el nombre ya está escrito al lado; con
         * etiqueta cuando es la imagen principal de la pantalla. */
        {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      />
    </div>
  )
}

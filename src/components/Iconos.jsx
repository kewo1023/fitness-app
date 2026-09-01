/* Iconos de la navegación.
 *
 * Van dibujados aquí como SVG en vez de usar una librería de iconos.
 * Razón: una librería trae cientos de iconos para usar cinco, y eso son
 * kilobytes que el cliente descarga con datos móviles cada vez que abre
 * la app. Cinco dibujos de tres líneas pesan prácticamente nada.
 *
 * currentColor hace que el icono tome el color del texto que lo rodea,
 * así se pinta solo cuando la pestaña está activa.
 */

const TRAZOS = {
  hoy: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  programas: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  progreso: 'M3 3v18h18M7 15l4-5 3 3 5-7',
  recetas: 'M7 2v9a3 3 0 0 0 6 0V2M10 11v11M17 2c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6ZM17 11v11',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'
}

export default function Icono ({ nombre, tam = 22 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

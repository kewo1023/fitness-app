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
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',

  // Los dos del botón de tema. Se muestra el del tema al que se VA a
  // cambiar, no el actual: el icono dice qué pasa si lo tocas, que es
  // lo que la gente espera de un botón.
  sol: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  luna: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z'
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

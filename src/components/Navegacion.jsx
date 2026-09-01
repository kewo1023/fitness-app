import Icono from './Iconos.jsx'

/* La barra de abajo. Cinco pestañas, siempre visibles.
 *
 * Por qué abajo y no arriba: en un celular el pulgar llega cómodo a la
 * parte baja de la pantalla, no a la de arriba. Y en Android la barra
 * de gestos vive ahí, por eso la barra respeta var(--sab).
 */

const PESTANAS = [
  { id: 'hoy',       titulo: 'Hoy' },
  { id: 'programas', titulo: 'Programas' },
  { id: 'progreso',  titulo: 'Progreso' },
  { id: 'recetas',   titulo: 'Recetas' },
  { id: 'perfil',    titulo: 'Perfil' }
]

export default function Navegacion ({ activa, alCambiar }) {
  return (
    <nav className="nav" aria-label="Secciones">
      {PESTANAS.map(p => (
        <button
          key={p.id}
          className={'nav-boton' + (activa === p.id ? ' es-activa' : '')}
          onClick={() => alCambiar(p.id)}
          aria-current={activa === p.id ? 'page' : undefined}
        >
          <Icono nombre={p.id} />
          <span>{p.titulo}</span>
        </button>
      ))}
    </nav>
  )
}

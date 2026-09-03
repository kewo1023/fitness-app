import { useState, useEffect, useMemo } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { GRUPOS, EQUIPOS, etiqueta } from '../lib/ejercicios.js'
import { urlDeImagen } from '../lib/imagenes.js'
import { ilustracionDeEjercicio } from '../lib/ilustraciones.js'
import Ilustracion from '../components/Ilustracion.jsx'

/* =====================================================================
   El catálogo de ejercicios. La primera pantalla que lo muestra.
   =====================================================================

   Reemplaza a la vieja pantalla de "Programas", que enseñaba una lista
   de programas a los que el cliente se inscribía. Ese modelo está
   DESCARTADO desde el 1/09: aquí cada cliente tiene su propia rutina,
   armada por el entrenador, y no hay catálogo al que apuntarse. La
   pantalla mostraba algo que la base de datos no puede representar.

   ESTA ES LA PANTALLA QUE VE UN DESCONOCIDO. Un visitante no tiene
   plan, no tiene progreso y no tiene logros: esto es lo único con
   contenido de verdad que puede abrir, y es el gancho de la app. Por
   eso el catálogo está abierto para él en las políticas de la base.

   ESTA PANTALLA ES IDÉNTICA PARA LOS TRES ROLES, y es una decisión, no
   una casualidad. El entrenador ve aquí exactamente lo que ven sus
   clientes —los ejercicios activos, ni uno más— porque este es el sitio
   donde comprueba su propio trabajo. Ver de más lo obligaría a
   descontar mentalmente en cada revisión.

   Lo que separa un rol de otro sigue estando en la base, no aquí: la
   política es la que decide, por ejemplo, que un visitante vea 2
   recetas y un cliente 6. Si ese filtro viviera en el navegador,
   cualquiera lo quitaría desde la consola.

   TIENE QUE VERSE BIEN SIN IMAGEN. Hoy los 30 ejercicios de ejemplo no
   tienen ninguna, y ese es el caso real del primer día: el entrenador
   carga sus nombres e indicaciones primero y va agregando fotos
   después. Una tarjeta rota por falta de foto sería la app rota el día
   del estreno.
   ===================================================================== */

/* "todos" no es un grupo de la base: es la opción de no filtrar. Va
 * aparte para que no se cuele en la lista de valores válidos. */
const TODOS = 'todos'

export default function Ejercicios ({ perfil }) {
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [grupo, setGrupo] = useState(TODOS)
  const [equipo, setEquipo] = useState(TODOS)
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      /* EL .eq('activo', true) ES OBLIGATORIO AUNQUE LA POLÍTICA YA
       * FILTRE. Tercera vez que aparece la misma trampa el 2/09.
       *
       * `ejercicios_select` dice `using (activo or es_admin())`, así que
       * a un cliente le esconde los archivados sola. Pero para el
       * entrenador es verdadera en todas las filas, y sin esta línea él
       * veía aquí los ejercicios que acababa de archivar.
       *
       * Y NO se arregla mostrándole una etiqueta de "archivado": se
       * arregla no mostrándolos. Esta pantalla es la que ven sus
       * clientes, y que sea EXACTAMENTE la que ven sus clientes es lo
       * que la hace útil para él — es donde comprueba su propio
       * trabajo. Si aquí viera cosas de más, tendría que acordarse de
       * descontarlas mentalmente cada vez, y archivar dejaría de tener
       * un efecto visible.
       *
       * Los archivados los ve en "Tu biblioteca", que es su pantalla, y
       * ahí salen apagados y con el botón de restaurar.
       *
       * La regla otra vez: RLS decide qué se PUEDE ver, no qué se
       * QUIERE ver. */
      const { data, error } = await supabase
        .from('ejercicios')
        .select('id, nombre, grupo, movimiento, equipo, nivel, ' +
                'indicaciones, imagen_url')
        .eq('activo', true)
        .order('grupo')
        .order('nombre')

      if (!vivo) return
      // El detalle técnico va a la consola: en pantalla, la lista vacía
      // ya cuenta la historia (regla 3 de CLAUDE.md).
      if (error) console.error('No se pudieron leer los ejercicios:', error)
      setEjercicios(data || [])
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [])

  /* Los filtros que SE MUESTRAN salen de lo que hay en la base, no de
   * la lista completa de valores posibles. Si el entrenador no tiene ni
   * un ejercicio de polea, ofrecer el filtro "polea" es prometer una
   * pantalla vacía.
   *
   * El orden sí sale de la lista fija: así "pecho, espalda, pierna…"
   * aparece siempre igual y no se reordena solo cuando él agrega uno.
   */
  const gruposConContenido = useMemo(() => {
    const hay = new Set(ejercicios.map(e => e.grupo))
    return GRUPOS.filter(g => hay.has(g))
  }, [ejercicios])

  const equiposConContenido = useMemo(() => {
    const hay = new Set(ejercicios.map(e => e.equipo).filter(Boolean))
    return EQUIPOS.filter(q => hay.has(q))
  }, [ejercicios])

  /* El filtrado va en useMemo y no suelto en el cuerpo del componente.
   * Sin él, recorrer 150 ejercicios se repetiría en cada tecla que se
   * escribe en el buscador. Con 150 no se nota; el día que sean 400 en
   * un Android de gama baja, sí.
   *
   * En Excel es la diferencia entre una tabla dinámica que se
   * actualiza cuando cambian los datos y una que recalcula el libro
   * entero cada vez que tocas una celda cualquiera. */
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return ejercicios.filter(e => {
      if (grupo !== TODOS && e.grupo !== grupo) return false
      if (equipo !== TODOS && e.equipo !== equipo) return false
      if (!texto) return true
      return (e.nombre || '').toLowerCase().includes(texto)
    })
  }, [ejercicios, grupo, equipo, busqueda])

  if (abierto) {
    return <Detalle ejercicio={abierto} alVolver={() => setAbierto(null)} />
  }

  const esVisitante = perfil?.rol === 'visitante'
  const hayFiltro = grupo !== TODOS || equipo !== TODOS || busqueda.trim()

  return (
    <Pantalla titulo="Ejercicios" bajada="La biblioteca del entrenador">
      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && ejercicios.length === 0 && (
        <p className="meta">Todavía no hay ejercicios publicados.</p>
      )}

      {!cargando && ejercicios.length > 0 && (
        <>
          {/* El buscador va primero porque con 150 ejercicios buscar por
              nombre es más rápido que filtrar dos veces. type="search"
              hace que Android muestre la tecla de lupa y ofrezca la X
              para limpiar. */}
          <label className="campo">
            <span className="oculto-visual">Buscar un ejercicio</span>
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre"
              autoComplete="off"
            />
          </label>

          <Filtro titulo="Grupo" valores={gruposConContenido}
                  activo={grupo} alElegir={setGrupo} />

          {/* El filtro de equipo es el que responde la pregunta que de
              verdad se hace un cliente: "¿qué puedo hacer hoy con lo que
              tengo en la casa?". Por eso existen los dos ejes. */}
          {equiposConContenido.length > 1 && (
            <Filtro titulo="Equipo" valores={equiposConContenido}
                    activo={equipo} alElegir={setEquipo} />
          )}

          <h3 className="titulillo">
            {visibles.length === ejercicios.length ? 'Todos' : 'Resultados'}
            {/* El {' '} no sobra: JSX se traga el salto de línea y la
                sangría que hay entre una expresión y el elemento
                siguiente, así que sin él quedaría "Resultados9 de 30"
                pegado. Es un espacio escrito a mano a propósito. */}
            {' '}
            <span className="tenue">
              {visibles.length} de {ejercicios.length}
            </span>
          </h3>

          {visibles.length === 0 && (
            <p className="meta">
              Ninguno coincide con lo que buscas.
              {hayFiltro && ' Prueba quitando un filtro.'}
            </p>
          )}

          <div className="rejilla">
            {visibles.map(e => (
              <Tarjeta key={e.id} ejercicio={e}
                       alAbrir={() => setAbierto(e)} />
            ))}
          </div>
        </>
      )}

      {esVisitante && !cargando && ejercicios.length > 0 && (
        <p className="meta">
          Los ejercicios los ve cualquiera. Con un código de tu entrenador
          se abren tu plan, tu progreso y tus rutinas de la semana.
        </p>
      )}
    </Pantalla>
  )
}


/* Una fila de píldoras que filtran. Es un grupo de radio disfrazado:
 * `role="group"` y `aria-pressed` le dicen al lector de pantalla que
 * son botones de estado y no enlaces, que es lo que parecen a la vista. */
function Filtro ({ titulo, valores, activo, alElegir }) {
  return (
    <div className="filtro" role="group" aria-label={titulo}>
      <button type="button"
              className={'pastilla-boton' + (activo === TODOS ? ' es-activa' : '')}
              aria-pressed={activo === TODOS}
              onClick={() => alElegir(TODOS)}>
        Todos
      </button>
      {valores.map(v => (
        <button key={v} type="button"
                className={'pastilla-boton' + (activo === v ? ' es-activa' : '')}
                aria-pressed={activo === v}
                onClick={() => alElegir(activo === v ? TODOS : v)}>
          {etiqueta(v)}
        </button>
      ))}
    </div>
  )
}


function Tarjeta ({ ejercicio: e, alAbrir }) {
  const imagen = urlDeImagen(e.imagen_url)
  const lamina = ilustracionDeEjercicio(e.nombre)

  return (
    <button type="button" className="tarjeta tarjeta-boton" onClick={alAbrir}>
      {/* TRES NIVELES, Y EL ORDEN ES LA DECISIÓN:

          1. La FOTO del entrenador, si la subió. Siempre gana. El
             dibujo es relleno mientras él arma su biblioteca, no un
             reemplazo, así que el día que suba la foto de este
             ejercicio el dibujo desaparece solo.
          2. El DIBUJO, si este ejercicio tiene uno.
          3. El hueco neutro de siempre.

          El tercero sigue existiendo y va a seguir apareciendo: los
          ejercicios que el entrenador cree no van a tener dibujo hasta
          que se agreguen a la tabla de ilustraciones.js. Se decidió NO
          poner ahí un icono ni la palabra "sin foto": un hueco neutro
          se lee como "todavía no", y un icono de imagen rota se lee
          como que la app falló. */}
      {imagen
        ? <img className="foto" src={imagen} alt="" loading="lazy" />
        : <Ilustracion ruta={lamina} />}

      <h2 className="chico">{e.nombre}</h2>
      <p className="pastillas">
        <span className="pastilla">{etiqueta(e.grupo)}</span>
        {e.equipo && <span className="pastilla">{etiqueta(e.equipo)}</span>}
      </p>
    </button>
  )
}


/* El detalle. Vive en el mismo archivo porque no se usa en ningún otro
 * sitio; el día que se use, se saca a src/components/. */
function Detalle ({ ejercicio: e, alVolver }) {
  const imagen = urlDeImagen(e.imagen_url)
  const lamina = ilustracionDeEjercicio(e.nombre)

  return (
    <Pantalla
      titulo={e.nombre}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      {/* Mismo orden que en la tarjeta. La diferencia es que aquí el
          dibujo SÍ lleva etiqueta: en la tarjeta el nombre va pegado
          debajo y repetirlo sería ruido para quien usa lector de
          pantalla, pero aquí es la imagen principal de la pantalla. */}
      {imagen
        ? <img className="foto foto-grande" src={imagen} alt={e.nombre} />
        : <Ilustracion ruta={lamina} clase="foto-grande"
                       alt={`Ilustración de ${e.nombre}`} />}

      <p className="pastillas">
        <span className="pastilla">{etiqueta(e.grupo)}</span>
        {e.movimiento && <span className="pastilla">{etiqueta(e.movimiento)}</span>}
        {e.equipo && <span className="pastilla">{etiqueta(e.equipo)}</span>}
        {e.nivel && <span className="pastilla">{etiqueta(e.nivel)}</span>}
      </p>

      {/* ESTO ES LO QUE HACE LA APP DISTINTA DE YOUTUBE. Un catálogo de
          ejercicios lo tiene cualquiera; lo que no tiene nadie es lo que
          este entrenador le corrige a la gente. Por eso las
          indicaciones van en su propia tarjeta y no como un renglón
          más de la lista. */}
      {e.indicaciones ? (
        <section className="tarjeta">
          <h3 className="titulillo">Cómo se hace bien</h3>
          <p className="meta">{e.indicaciones}</p>
        </section>
      ) : (
        <p className="meta">Este ejercicio todavía no tiene indicaciones.</p>
      )}

      {/* En la Fase 4 aquí va "en qué rutinas tuyas aparece". Hoy no,
          porque los planes todavía no están conectados. */}

      <p className="descargo">
        Si algo te duele, para. Ante una molestia o una lesión, consúltalo
        con tu entrenador antes de seguir.
      </p>
    </Pantalla>
  )
}

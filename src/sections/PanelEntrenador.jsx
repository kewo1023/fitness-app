import { useState, useEffect, useMemo } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import {
  GRUPOS, MOVIMIENTOS, EQUIPOS, NIVELES, etiqueta, validarEjercicio
} from '../lib/ejercicios.js'
import CargaMasiva from './CargaMasiva.jsx'

/* =====================================================================
   El panel del entrenador. La primera pantalla que existe solo para él.
   =====================================================================

   Hasta ahora todo lo que hay en la app la ve un cliente. Esto no: es
   la herramienta con la que él llena su biblioteca sin pedirle nada a
   nadie, que es el objetivo entero de la Fase 3.

   POR QUÉ SE ENTRA DESDE "PERFIL" Y NO ES UNA SEXTA PESTAÑA. Dos
   razones. La primera es de pantalla: seis pestañas en un Android de
   360 px de ancho dejan cada una en 60 px, y los textos se parten. La
   segunda importa más — la barra de abajo queda IDÉNTICA para todo el
   mundo. Si el entrenador viera una pestaña que sus clientes no ven, la
   primera pregunta de un cliente sería "¿por qué mi app es distinta?".

   ESTA PANTALLA NO ES LA QUE PROTEGE NADA. Se muestra solo con rol
   admin, pero eso es comodidad, no seguridad: quien tenga el navegador
   puede reescribir esa condición. Lo que de verdad impide que un
   cliente edite un ejercicio es la política `ejercicios_admin` de la
   base, que exige es_admin() en el servidor. Si un cliente llegara
   hasta aquí a la fuerza, vería el formulario y el guardado le fallaría.

   TODO LO QUE SE MUESTRA ESTÁ EXPLICADO EN PANTALLA. Es la consecuencia
   de la decisión del 31/08 de tener dos administradores: el entrenador
   no va a leer un documento, así que lo que necesite saber tiene que
   estar donde lo va a usar.
   ===================================================================== */

const NUEVO = {
  nombre: '', grupo: '', movimiento: '', equipo: '', nivel: '',
  indicaciones: ''
}

export default function PanelEntrenador ({ alVolver }) {
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)   // null = no hay formulario
  const [cargandoHoja, setCargandoHoja] = useState(false)
  const [aviso, setAviso] = useState(null)

  async function cargar () {
    const { data, error } = await supabase
      .from('ejercicios')
      .select('id, nombre, grupo, movimiento, equipo, nivel, ' +
              'indicaciones, imagen_url, activo')
      .order('nombre')

    if (error) console.error('No se pudieron leer los ejercicios:', error)
    setEjercicios(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return ejercicios
    return ejercicios.filter(e =>
      (e.nombre || '').toLowerCase().includes(texto) ||
      (e.grupo  || '').toLowerCase().includes(texto)
    )
  }, [ejercicios, busqueda])

  /* Archivar y no borrar, y no es un detalle de comodidad.
   *
   * `rutina_ejercicios` apunta a `ejercicios` sin borrado en cascada: si
   * un ejercicio está dentro de la rutina de alguien, la base se niega a
   * borrarlo y hace bien. Borrarlo dejaría rutinas con huecos y
   * sesiones viejas apuntando a nada, o sea el historial de un cliente
   * corrompido por una limpieza.
   *
   * Archivado, desaparece del catálogo de todos —la política solo
   * entrega los activos a quien no es admin— y las rutinas donde ya
   * está siguen enteras. */
  async function alternarArchivo (e) {
    setAviso(null)
    const { error } = await supabase
      .from('ejercicios')
      .update({ activo: !e.activo })
      .eq('id', e.id)

    if (error) {
      console.error('No se pudo archivar:', error)
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio.' })
      return
    }
    setAviso({
      tipo: 'ok',
      texto: e.activo
        ? `"${e.nombre}" quedó archivado. Ya no lo ven tus clientes.`
        : `"${e.nombre}" volvió al catálogo.`
    })
    cargar()
  }

  if (editando) {
    return (
      <Formulario
        inicial={editando}
        alCerrar={() => setEditando(null)}
        alGuardar={() => { setEditando(null); cargar() }}
      />
    )
  }

  /* La carga masiva vive en su propia pantalla y no en un cuadro
   * dentro de esta. Es un proceso de dos pasos —revisar y guardar— con
   * una lista larga en el medio, y meterlo aquí obligaría a
   * desplazarse por la biblioteca entera para llegar al botón de
   * guardar. */
  if (cargandoHoja) {
    return (
      <CargaMasiva
        alVolver={() => setCargandoHoja(false)}
        alTerminar={(cuantos) => {
          setCargandoHoja(false)
          setAviso({
            tipo: 'ok',
            texto: cuantos === 0
              ? 'No se agregó nada: ya tenías todos esos ejercicios.'
              : `Se agregaron ${cuantos} ejercicios. Tus clientes ya los ven.`
          })
          cargar()
        }}
      />
    )
  }

  const activos = ejercicios.filter(e => e.activo).length

  return (
    <Pantalla
      titulo="Tu biblioteca"
      /* Corto a propósito: el encabezado comparte la fila con "Volver" y
         el botón de tema, así que a 375px solo caben unos 30
         caracteres antes de partirse en dos renglones feos. */
      bajada={cargando ? undefined
        : `${activos} visibles · ${ejercicios.length - activos} archivados`}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>
          Volver
        </button>
      }
    >
      {aviso && (
        <p className={'aviso' + (aviso.tipo === 'error' ? ' es-error' : ' es-ok')}>
          {aviso.texto}
        </p>
      )}

      <button type="button" className="boton-principal"
              onClick={() => setEditando(NUEVO)}>
        Agregar un ejercicio
      </button>

      <ul className="lista">
        <li className="fila">
          <span className="fila-datos">
            <strong>Cargar desde una hoja de cálculo</strong>
            <small>Pegar toda tu lista de una vez, en vez de uno por uno</small>
          </span>
          <span className="fila-acciones">
            <button type="button" className="enlace enlace-fila"
                    onClick={() => setCargandoHoja(true)}>
              Abrir
            </button>
          </span>
        </li>
      </ul>

      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && (
        <>
          <label className="campo">
            <span className="oculto-visual">Buscar en tu biblioteca</span>
            <input type="search" value={busqueda} autoComplete="off"
                   placeholder="Buscar por nombre o grupo"
                   onChange={e => setBusqueda(e.target.value)} />
          </label>

          <h3 className="titulillo">
            Ejercicios{' '}
            <span className="tenue">{visibles.length}</span>
          </h3>

          {visibles.length === 0 && (
            <p className="meta">
              {ejercicios.length === 0
                ? 'Tu biblioteca está vacía. Agrega el primero arriba.'
                : 'Ninguno coincide con lo que buscas.'}
            </p>
          )}

          <ul className="lista">
            {visibles.map(e => (
              <li key={e.id}
                  className={'fila' + (e.activo ? '' : ' es-bloqueado')}>
                <span className="fila-datos">
                  <strong>{e.nombre}</strong>
                  <small>
                    {etiqueta(e.grupo)}
                    {e.equipo && ` · ${etiqueta(e.equipo)}`}
                    {!e.indicaciones && ' · sin indicaciones'}
                  </small>
                </span>
                <span className="fila-acciones">
                  <button type="button" className="enlace enlace-fila"
                          onClick={() => setEditando(e)}>
                    Editar
                  </button>
                  <button type="button" className="enlace enlace-fila tenue"
                          onClick={() => alternarArchivo(e)}>
                    {e.activo ? 'Archivar' : 'Restaurar'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Pantalla>
  )
}


/* ---------------------------------------------------------------------
   El formulario. Crea uno nuevo o edita el que ya existe.
   ---------------------------------------------------------------------
   Es la misma pantalla para las dos cosas: los campos son idénticos y
   tener dos formularios casi iguales garantiza que uno se quede atrás
   el día que se agregue una columna.
   --------------------------------------------------------------------- */
function Formulario ({ inicial, alCerrar, alGuardar }) {
  const esNuevo = !inicial.id
  const [datos, setDatos] = useState({
    nombre:       inicial.nombre       || '',
    grupo:        inicial.grupo        || '',
    movimiento:   inicial.movimiento   || '',
    equipo:       inicial.equipo       || '',
    nivel:        inicial.nivel        || '',
    indicaciones: inicial.indicaciones || ''
  })
  const [errores, setErrores] = useState([])
  const [ocupado, setOcupado] = useState(false)

  const cambiar = (campo, valor) => setDatos(d => ({ ...d, [campo]: valor }))

  async function guardar (ev) {
    ev.preventDefault()
    setErrores([])

    // La misma función que va a usar la carga masiva. Que el formulario
    // y la hoja de cálculo validen con el MISMO código es lo que impide
    // que una acepte lo que la otra rechaza.
    const { valido, errores: fallos, ejercicio } = validarEjercicio(datos)
    if (!valido) { setErrores(fallos); return }

    setOcupado(true)
    const { error } = esNuevo
      ? await supabase.from('ejercicios').insert(ejercicio)
      : await supabase.from('ejercicios').update(ejercicio).eq('id', inicial.id)
    setOcupado(false)

    if (error) {
      console.error('No se pudo guardar el ejercicio:', error)
      // El índice único del nombre es el error que de verdad va a pasar,
      // y el mensaje crudo de Postgres no le dice nada a nadie. Se
      // traduce a la frase que explica qué hacer (regla 3 de CLAUDE.md).
      setErrores([
        error.code === '23505'
          ? 'Ya tienes un ejercicio con ese nombre.'
          : 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.'
      ])
      return
    }
    alGuardar()
  }

  return (
    <Pantalla
      titulo={esNuevo ? 'Nuevo ejercicio' : 'Editar'}
      accion={
        <button type="button" className="enlace" onClick={alCerrar}>
          Cancelar
        </button>
      }
    >
      <form className="formulario" onSubmit={guardar}>
        {errores.length > 0 && (
          <div className="aviso es-error">
            {errores.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <label className="campo">
          <span>Nombre</span>
          <input value={datos.nombre} autoComplete="off"
                 placeholder="Sentadilla goblet"
                 onChange={e => cambiar('nombre', e.target.value)} />
          <span className="pista">
            Como tú lo llamas. Es lo que va a leer tu cliente.
          </span>
        </label>

        {/* Los DOS EJES, con la explicación puesta donde se usa. Él los
            piensa a la vez, pero nadie más lo sabe al abrir esto por
            primera vez. */}
        <Eleccion titulo="Grupo muscular" valores={GRUPOS}
                  valor={datos.grupo}
                  alCambiar={v => cambiar('grupo', v)}
                  pista="Qué músculo trabaja." />

        <Eleccion titulo="Movimiento" valores={MOVIMIENTOS}
                  valor={datos.movimiento} opcional
                  alCambiar={v => cambiar('movimiento', v)}
                  pista="El patrón. Un press de banca y unas flexiones son los dos empuje; una sentadilla y un peso muerto son de pierna pero no del mismo patrón." />

        <Eleccion titulo="Equipo" valores={EQUIPOS}
                  valor={datos.equipo} opcional
                  alCambiar={v => cambiar('equipo', v)}
                  pista="Qué hace falta para hacerlo. Es lo que deja responder qué puede hacer un cliente en la casa." />

        <Eleccion titulo="Nivel" valores={NIVELES}
                  valor={datos.nivel} opcional
                  alCambiar={v => cambiar('nivel', v)} />

        <label className="campo">
          <span>Indicaciones <span className="opcional">opcional</span></span>
          <textarea rows="4" value={datos.indicaciones}
                    placeholder="Codos a 45 grados, no abiertos. El cuerpo va en una sola línea."
                    onChange={e => cambiar('indicaciones', e.target.value)} />
          <span className="pista">
            Las dos o tres correcciones que repites siempre. Esto es lo que
            no está en YouTube.
          </span>
        </label>

        <button type="submit" className="boton-principal" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </form>

      {/* La imagen entra en la próxima sesión de la Fase 3. Se dice en
          vez de callarlo: un formulario sin foto se lee como que se
          olvidó. */}
      <p className="pista">
        La foto del ejercicio se agrega desde aquí más adelante. Mientras
        tanto el ejercicio se ve bien sin ella.
      </p>
    </Pantalla>
  )
}


/* Un desplegable nativo, no una fila de píldoras.
 *
 * En el catálogo los filtros son píldoras porque se tocan seguido y hay
 * pocos. Aquí es al revés: es un formulario, son cuatro campos, y el
 * desplegable del sistema en Android sale como una rueda cómoda de una
 * mano. Además evita el error de escribir "pesas" cuando la base solo
 * acepta "mancuernas". */
function Eleccion ({ titulo, valores, valor, alCambiar, pista, opcional }) {
  return (
    <label className="campo">
      <span>
        {titulo}
        {opcional && <span className="opcional">opcional</span>}
      </span>
      <select value={valor} onChange={e => alCambiar(e.target.value)}>
        <option value="">{opcional ? 'Sin especificar' : 'Elige uno'}</option>
        {valores.map(v => (
          <option key={v} value={v}>{etiqueta(v)}</option>
        ))}
      </select>
      {pista && <span className="pista">{pista}</span>}
    </label>
  )
}

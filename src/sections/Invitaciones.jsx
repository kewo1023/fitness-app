import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { formatearFecha } from '../data/fechas.js'
import { estadoDeCodigo, cuantosLibres } from '../lib/invitaciones.js'
import { mensajeDeError } from '../lib/consentimientos.js'

/* =====================================================================
   Los códigos de invitación — lo que convierte a alguien en cliente
   =====================================================================

   `crear_invitacion` existe desde la Fase 2 y hasta hoy no la llamaba
   NADIE desde la app: los códigos solo salían del SQL Editor. O sea que
   la puerta de entrada de todos los clientes dependía de que alguien
   abriera el panel de Supabase y escribiera una consulta.

   Eso contradecía de frente lo que el proyecto decidió el 31/08 —que el
   entrenador no dependa del desarrollo para nada de lo suyo— y no daba
   ningún error: la función funcionaba perfecto, simplemente no había
   dónde tocarla.

   =====================================================================
   POR QUÉ SE CREAN VARIOS DE UNA VEZ
   =====================================================================

   Está escrito en `03-funciones.sql` y aquí se hace visible: con 15
   clientes, crear los códigos de a uno es una tarde. La pantalla ofrece
   crear cinco porque es lo que cabe en una tanda de WhatsApp sin
   volverse una tarea.

   Y **un código es de un solo uso**: al canjearlo queda marcado con
   quién lo usó y no sirve otra vez. Por eso hay que crear tantos como
   personas, no uno para repartir.
   ===================================================================== */

/* 30 días. Un código que no vence nunca es un código que alguien
 * reenvía dentro de un año a quien no debía; uno de tres días se vence
 * antes de que la persona lo lea. */
const DIAS = 30
const CUANTOS = 5

export default function Invitaciones ({ alVolver }) {
  const [codigos, setCodigos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [copiado, setCopiado] = useState(null)

  async function cargar () {
    const { data, error } = await supabase
      .from('invitaciones')
      .select('codigo, expira_en, creada_en, usada_por')
      .order('creada_en', { ascending: false })
      .limit(50)

    if (error) {
      console.error('No se pudieron leer las invitaciones:', error)
      setAviso({ tipo: 'error', texto: 'No se pudo cargar. Revisa la conexión.' })
      setCargando(false)
      return
    }

    /* Los nombres de quienes ya canjearon, en una segunda consulta y no
     * con un join incrustado. Es más largo de escribir y más fácil de
     * leer: pide EXACTAMENTE los perfiles de los códigos usados en vez
     * de depender del nombre interno de una llave foránea, que es la
     * clase de cosa que se rompe al renombrar algo en la base. */
    const usados = [...new Set((data || []).map(i => i.usada_por).filter(Boolean))]
    let nombres = {}

    if (usados.length > 0) {
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .in('id', usados)          // regla 13: la política deja al admin
                                   // ver todos, así que se pide por id
      nombres = Object.fromEntries((perfiles || []).map(p => [p.id, p.nombre]))
    }

    setCodigos((data || []).map(i => ({ ...i, nombre: nombres[i.usada_por] })))
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  async function crear () {
    setOcupado(true)
    setAviso(null)

    const { data, error } = await supabase.rpc('crear_invitacion', {
      p_cantidad: CUANTOS, p_dias: DIAS
    })

    setOcupado(false)
    if (error) {
      console.error('No se pudieron crear las invitaciones:', error)
      setAviso({ tipo: 'error', texto: mensajeDeError(error) })
      return
    }

    setAviso({
      tipo: 'ok',
      texto: `Listo, ${(data || []).length} códigos nuevos. Mándale uno a cada persona.`
    })
    cargar()
  }

  async function copiar (codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(codigo)
      // Se limpia solo: un "copiado" que se queda para siempre deja
      // dudando de si se copió este o el anterior.
      setTimeout(() => setCopiado(c => (c === codigo ? null : c)), 2000)
    } catch (e) {
      console.error('No se pudo copiar:', e)
      setAviso({ tipo: 'error', texto: 'No se pudo copiar. Escríbelo a mano.' })
    }
  }

  /* El estado lo decide `invitaciones.js`, que está probado. Aquí solo
   * se le pone el texto: es aritmética de fechas, y un código vencido
   * mostrado como disponible es uno que el entrenador manda por
   * WhatsApp y que falla en la cara de la persona nueva. */
  function estado (i) {
    const clave = estadoDeCodigo(i)
    if (clave === 'usado') return { clave, texto: i.nombre || 'Ya se usó' }
    if (clave === 'vencido') return { clave, texto: 'Vencido' }
    return { clave, texto: `Vence el ${formatearFecha(i.expira_en.slice(0, 10))}` }
  }

  const libres = cuantosLibres(codigos)

  return (
    <Pantalla
      titulo="Códigos para tus clientes"
      bajada={cargando ? undefined
        : `${libres} sin usar`}
      accion={
        <button type="button" className="enlace" onClick={alVolver}>Volver</button>
      }
    >
      {aviso && (
        <p className={'aviso' + (aviso.tipo === 'error' ? ' es-error' : ' es-ok')}>
          {aviso.texto}
        </p>
      )}

      <section className="tarjeta">
        <h2 className="chico">Cómo funciona</h2>
        <p className="meta">
          Cada código sirve para <strong>una sola persona</strong>. Ella
          crea su cuenta en la app, escribe el código y con eso se le
          abren su plan y su progreso.
        </p>
        <p className="pista">
          Se pueden dictar por teléfono sin equivocarse: no llevan la
          letra O ni la I, así que lo que parece una O es un cero y lo
          que parece una I es un uno.
        </p>
      </section>

      <button type="button" className="boton-principal" disabled={ocupado}
              onClick={crear}>
        {ocupado ? 'Creando…' : `Crear ${CUANTOS} códigos`}
      </button>

      {cargando && <p className="meta">Cargando…</p>}

      {!cargando && codigos.length === 0 && (
        <p className="meta">
          Todavía no has creado ninguno. Crea los primeros con el botón de
          arriba.
        </p>
      )}

      {!cargando && codigos.length > 0 && (
        <>
          <h3 className="titulillo">
            Tus códigos <span className="tenue">{codigos.length}</span>
          </h3>
          <ul className="lista">
            {codigos.map(i => {
              const e = estado(i)
              return (
                <li key={i.codigo}
                    className={'fila' + (e.clave === 'libre' ? '' : ' es-bloqueado')}>
                  <span className="fila-datos">
                    <strong className="codigo">{i.codigo}</strong>
                    <small>{e.texto}</small>
                  </span>
                  {/* Copiar solo se ofrece en los que sirven. Un botón
                      de copiar en un código vencido invita a mandarlo, y
                      la persona del otro lado recibe un error que no
                      entiende. */}
                  {e.clave === 'libre' && (
                    <button type="button" className="enlace enlace-fila"
                            onClick={() => copiar(i.codigo)}>
                      {copiado === i.codigo ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Pantalla>
  )
}

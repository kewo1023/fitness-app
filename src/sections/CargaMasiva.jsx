import { useState } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import { supabase } from '../lib/supabase.js'
import { etiqueta } from '../lib/ejercicios.js'
import { revisarHoja, nombreSeparador } from '../lib/hoja.js'

/* =====================================================================
   Cargar la biblioteca desde una hoja de cálculo
   =====================================================================

   Lo que destraba la Fase 3. Sin esto, meter 150 ejercicios son 150
   formularios, y ningún entrenador hace eso: seguiría mandando el PDF,
   que es el problema que la app existe para resolver.

   =====================================================================
   LAS TRES DECISIONES DE ESTA PANTALLA
   =====================================================================

   1. SE REVISA ANTES DE GUARDAR, SIEMPRE. No hay un botón que guarde
      de una. La vista previa no es una cortesía: es lo que convierte
      "tu hoja tiene un error" en "la fila 47 dice 'pesas' y eso no
      existe", y la diferencia entre las dos frases es que la segunda
      la puede arreglar él solo, sin escribirle a nadie.

   2. SOLO AGREGA. Nunca modifica ni borra lo que ya está.

      Es la decisión más importante y la que más se va a querer
      cambiar, así que queda escrita la razón: actualizar desde la hoja
      significa REEMPLAZAR la fila entera con lo que traiga el archivo,
      y eso tiene dos consecuencias feas. La primera es que una columna
      que él dejó vacía en la hoja BORRARÍA lo que hay en la app —
      cargar dos veces la misma hoja le vaciaría sus propias
      indicaciones. La segunda es peor: la hoja no lleva la foto, así
      que reemplazar la fila borraría la imagen que ya subió.

      Un ejercicio que ya existe se edita desde "Tu biblioteca", uno
      por uno, que es donde se ve lo que se está cambiando. Y por eso
      volver a pegar la hoja completa es seguro y se puede repetir
      cuantas veces sea: lo que ya está, se queda como está.

   3. LO QUE NO SE PUEDE GUARDAR NO DETIENE LO QUE SÍ. Si de 150 filas
      hay 3 con un error, se guardan 147 y se le dice cuáles tres
      faltaron y por qué. Rechazar el lote entero por tres filas es
      obligarlo a arreglar la hoja a ciegas antes de ver ningún
      resultado.
   ===================================================================== */

/* Cuántas filas van en cada viaje a la base. No es por límite de
 * Supabase: es para que una hoja de 400 ejercicios no se mande en una
 * sola petición que un celular con señal mala deja a medias. Si se cae
 * el lote 3, los lotes 1 y 2 ya quedaron guardados y volver a pegar la
 * hoja retoma donde iba — que es justo lo que permite la decisión 2. */
const POR_LOTE = 50

export default function CargaMasiva ({ alVolver, alTerminar }) {
  const [texto, setTexto] = useState('')
  const [revision, setRevision] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)

  async function revisar () {
    setAviso(null)
    setOcupado(true)

    /* SIN .eq('activo', true), Y ES A PROPÓSITO — regla 13 de
     * CLAUDE.md, que pide que toda consulta a esta tabla diga qué
     * quiere en vez de confiar en la política.
     *
     * Aquí se quieren TODOS los nombres, incluidos los archivados. El
     * índice único de la base no distingue: si él archivó "Sentadilla
     * libre" hace un mes y la hoja la trae otra vez, insertarla falla.
     * Pidiendo solo los activos, la app le diría "nuevo" a una fila
     * que la base va a rechazar. */
    const { data, error } = await supabase
      .from('ejercicios')
      .select('nombre')

    setOcupado(false)

    if (error) {
      console.error('No se pudo leer la biblioteca:', error)
      setAviso({
        tipo: 'error',
        texto: 'No se pudo revisar la hoja. Revisa la conexión e inténtalo otra vez.'
      })
      return
    }

    setRevision(revisarHoja(texto, (data || []).map(e => e.nombre)))
  }

  async function guardar () {
    const nuevos = revision.filas
      .filter(f => f.estado === 'nuevo')
      .map(f => f.ejercicio)

    setOcupado(true)
    setAviso(null)

    let guardados = 0
    for (let i = 0; i < nuevos.length; i += POR_LOTE) {
      const lote = nuevos.slice(i, i + POR_LOTE)

      /* upsert con ignoreDuplicates, que en la base es un "ON CONFLICT
       * DO NOTHING": si el nombre ya existe, esa fila se salta y las
       * demás siguen. NO es lo mismo que un upsert normal — ese
       * REEMPLAZARÍA la fila, que es exactamente lo que la decisión 2
       * de arriba no quiere.
       *
       * Hace falta aunque la vista previa ya haya comparado los
       * nombres: entre revisar y guardar puede pasar un rato, y hay
       * dos administradores. Sin esto, que el otro cargue el mismo
       * ejercicio en ese rato tumbaría el lote entero. */
      const { error } = await supabase
        .from('ejercicios')
        .upsert(lote, { onConflict: 'nombre', ignoreDuplicates: true })

      if (error) {
        console.error('No se pudo guardar el lote:', error)
        setOcupado(false)
        setAviso({
          tipo: 'error',
          texto: guardados === 0
            ? 'No se pudo guardar nada. Revisa la conexión e inténtalo otra vez.'
            : `Se guardaron ${guardados} y ahí se cortó. Vuelve a pegar la ` +
              'misma hoja: los que ya quedaron no se van a repetir.'
        })
        return
      }
      guardados += lote.length
    }

    setOcupado(false)
    setRevision(null)
    setTexto('')
    alTerminar(guardados)
  }

  /* ------------------------------------------------------------------
     Paso 1: pegar
     ------------------------------------------------------------------ */
  if (!revision) {
    return (
      <Pantalla
        titulo="Cargar desde una hoja"
        bajada="Toda tu lista de una vez"
        accion={
          <button type="button" className="enlace" onClick={alVolver}>
            Volver
          </button>
        }
      >
        {aviso && <p className="aviso es-error">{aviso.texto}</p>}

        <p className="meta">
          Abre tu hoja, selecciona las filas con el encabezado y pégalas
          aquí. También sirve el contenido de un archivo .csv.
        </p>

        <label className="campo">
          <span className="oculto-visual">Pega aquí tu hoja</span>
          {/* Sin autocorrección ni mayúscula automática: el celular le
              cambiaría "jalon" por "Jalón" o le corregiría el nombre de
              un ejercicio mientras pega. */}
          <textarea
            rows="10"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={'nombre\tgrupo\tequipo\nSentadilla goblet\tpierna\tkettlebell'}
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <span className="pista">
            Las columnas pueden ir en cualquier orden y pueden sobrar. Se
            reconocen nombre, grupo, movimiento, equipo, nivel e
            indicaciones.
          </span>
        </label>

        <button type="button" className="boton-principal"
                disabled={ocupado || !texto.trim()}
                onClick={revisar}>
          {ocupado ? 'Revisando…' : 'Revisar la hoja'}
        </button>

        <p className="pista">
          Todavía no se guarda nada. Primero vas a ver qué entra y qué
          tiene algún problema.
        </p>
      </Pantalla>
    )
  }

  /* ------------------------------------------------------------------
     Paso 2: la vista previa
     ------------------------------------------------------------------ */
  const { resumen, filas, separador, conEncabezado } = revision
  const problemas = filas.filter(f => f.estado === 'error' || f.estado === 'repetido')

  return (
    <Pantalla
      titulo="Antes de guardar"
      bajada={`${resumen.total} ${resumen.total === 1 ? 'fila leída' : 'filas leídas'}`}
      accion={
        <button type="button" className="enlace" onClick={() => setRevision(null)}>
          Cambiar
        </button>
      }
    >
      {aviso && <p className="aviso es-error">{aviso.texto}</p>}

      {/* Que se vea cómo se leyó la hoja. Es el dato que explica casi
          todas las hojas que salen mal, y verlo escrito le deja
          corregirlo sin preguntarle a nadie: si dice "1 fila" y él
          pegó 80, el separador que se detectó no era el suyo. */}
      <p className="pista">
        Se leyó separada por {nombreSeparador(separador)}
        {conEncabezado
          ? ' y con encabezado.'
          : ', y sin encabezado: se tomó el orden nombre, grupo, movimiento, equipo, nivel, indicaciones.'}
      </p>

      <ul className="lista">
        <li className="fila">
          <span className="fila-datos">
            <strong>Se van a agregar</strong>
            <small>Ejercicios que todavía no tienes</small>
          </span>
          <span className="estado es-ok">{resumen.nuevos}</span>
        </li>

        {resumen.existentes > 0 && (
          <li className="fila">
            <span className="fila-datos">
              <strong>Ya los tienes</strong>
              <small>No se tocan. Para cambiar uno, edítalo en tu biblioteca</small>
            </span>
            <span className="estado">{resumen.existentes}</span>
          </li>
        )}

        {resumen.repetidos > 0 && (
          <li className="fila">
            <span className="fila-datos">
              <strong>Repetidos en tu hoja</strong>
              <small>Aparecen dos veces. Se guarda la primera</small>
            </span>
            <span className="estado">{resumen.repetidos}</span>
          </li>
        )}

        {resumen.conError > 0 && (
          <li className="fila es-bloqueado">
            <span className="fila-datos">
              <strong>No se pueden guardar</strong>
              <small>Les falta algo o tienen un valor que no existe</small>
            </span>
            <span className="estado">{resumen.conError}</span>
          </li>
        )}
      </ul>

      {/* Los problemas, uno por uno y CON EL NÚMERO DE FILA. Un mensaje
          que diga "hay 3 errores" sin decir dónde obliga a revisar 150
          renglones a mano. */}
      {problemas.length > 0 && (
        <>
          <h3 className="titulillo">Qué revisar en tu hoja</h3>
          <ul className="lista">
            {problemas.map(f => (
              <li key={f.numero} className="fila es-bloqueado">
                <span className="fila-datos">
                  <strong>Fila {f.numero} · {f.etiquetaFila}</strong>
                  <small>
                    {f.estado === 'repetido'
                      ? 'Este nombre ya aparece más arriba en tu hoja.'
                      : f.errores.join(' ')}
                  </small>
                </span>
              </li>
            ))}
          </ul>
          <p className="pista">
            Los demás se guardan igual. Arregla estos en tu hoja y vuelve
            a pegarla cuando quieras: lo que ya quedó guardado no se
            repite.
          </p>
        </>
      )}

      {resumen.nuevos > 0 && (
        <h3 className="titulillo">
          Lo que entra{' '}
          <span className="tenue">{resumen.nuevos}</span>
        </h3>
      )}

      <ul className="lista">
        {filas.filter(f => f.estado === 'nuevo').map(f => (
          <li key={f.numero} className="fila">
            <span className="fila-datos">
              <strong>{f.ejercicio.nombre}</strong>
              <small>
                {etiqueta(f.ejercicio.grupo)}
                {f.ejercicio.equipo && ` · ${etiqueta(f.ejercicio.equipo)}`}
                {!f.ejercicio.indicaciones && ' · sin indicaciones'}
              </small>
            </span>
          </li>
        ))}
      </ul>

      {resumen.nuevos === 0 ? (
        <p className="meta">
          No hay nada nuevo que agregar
          {resumen.existentes > 0 && ': todos los que se pudieron leer ya están en tu biblioteca'}.
        </p>
      ) : (
        <button type="button" className="boton-principal"
                disabled={ocupado} onClick={guardar}>
          {ocupado
            ? 'Guardando…'
            : `Agregar ${resumen.nuevos} ${resumen.nuevos === 1 ? 'ejercicio' : 'ejercicios'}`}
        </button>
      )}

      {/* Se dice acá, en el momento de guardar, y no en un documento
          que no va a leer. Las indicaciones son lo que hace la app
          distinta de YouTube; una biblioteca cargada sin ellas queda
          igual a cualquier otra. */}
      {resumen.nuevos > 0 &&
        filas.some(f => f.estado === 'nuevo' && !f.ejercicio.indicaciones) && (
        <p className="pista">
          Algunos entran sin indicaciones. Se pueden agregar después uno
          por uno desde tu biblioteca, y son lo que tus clientes no
          encuentran en ningún otro lado.
        </p>
      )}
    </Pantalla>
  )
}

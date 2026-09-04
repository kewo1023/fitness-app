import { useState, useEffect } from 'react'
import Pantalla from '../components/Pantalla.jsx'
import MisDatos from './MisDatos.jsx'
import PanelEntrenador from './PanelEntrenador.jsx'
import PanelClientes from './PanelClientes.jsx'
import Creditos from './Creditos.jsx'
import { supabase } from '../lib/supabase.js'
import { nivelDesdeXp } from '../lib/gamificacion.js'
import { VERSION, avisoDerechos } from '../lib/version.js'

/* El perfil. Ya con el usuario REAL de la base.
 *
 * Desde la Fase 5 no queda nada inventado en esta pantalla: el nombre,
 * el rol y el XP salen de `perfiles`, y los logros de cruzar
 * `logros_catalogo` con `logros_obtenidos`.
 *
 * LOS LOGROS NO SE OTORGAN AQUÍ, igual que el XP. Los da un trigger en
 * la base cuando una sesión pasa a completada (`otorgar_logros`, en
 * `08-analitica.sql`). Esta pantalla solo pregunta cuáles tiene. Si se
 * dieran desde el navegador, cualquiera con la consola abierta se los
 * regalaría todos.
 */

const NOMBRE_DEL_ROL = {
  admin:     'Entrenador',
  cliente:   'Cliente',
  visitante: 'Invitado'
}

export default function Perfil ({ perfil, alSalir }) {
  const [viendoDatos, setViendoDatos] = useState(false)
  const [viendoPanel, setViendoPanel] = useState(false)
  const [viendoClientes, setViendoClientes] = useState(false)
  const [viendoCreditos, setViendoCreditos] = useState(false)
  const [logros, setLogros] = useState([])

  /* El catálogo y lo conseguido se piden por separado y se cruzan aquí.
   *
   * Podría hacerse con un solo `select` y un join, pero el catálogo lo
   * ve todo el mundo y `logros_obtenidos` está filtrada por RLS: un
   * join dejaría fuera los logros que TODAVÍA NO tiene, que son
   * justamente los que hay que mostrar apagados. Una lista donde solo
   * salen los conseguidos no enseña qué falta.
   *
   * El visitante no pide nada: no tiene sesiones, así que no tiene
   * logros, y la sección entera no se le muestra. */
  useEffect(() => {
    if (perfil.rol === 'visitante') return
    let vivo = true
    ;(async () => {
      const [cat, mios] = await Promise.all([
        supabase.from('logros_catalogo')
          .select('clave, nombre, descripcion, orden')
          .order('orden'),
        supabase.from('logros_obtenidos')
          .select('logro')
          .eq('cliente_id', perfil.id)     // regla 13: la política dice
                                           // lo mismo, el filtro se
                                           // escribe igual
      ])

      if (!vivo) return
      if (cat.error) {
        console.error('No se pudo leer el catálogo de logros:', cat.error)
        return
      }
      if (mios.error) console.error('No se pudieron leer tus logros:', mios.error)

      const tiene = new Set((mios.data || []).map(l => l.logro))
      setLogros((cat.data || []).map(l => ({ ...l, obtenido: tiene.has(l.clave) })))
    })()
    return () => { vivo = false }
  }, [perfil.id, perfil.rol])

  if (viendoCreditos) {
    return <Creditos alVolver={() => setViendoCreditos(false)} />
  }

  if (viendoDatos) {
    return <MisDatos perfil={perfil}
                     alVolver={() => setViendoDatos(false)}
                     alSalir={alSalir} />
  }

  if (viendoPanel) {
    return <PanelEntrenador alVolver={() => setViendoPanel(false)} />
  }

  if (viendoClientes) {
    return <PanelClientes alVolver={() => setViendoClientes(false)} />
  }

  const nivel = nivelDesdeXp(perfil.xp)
  const esVisitante = perfil.rol === 'visitante'
  const esAdmin = perfil.rol === 'admin'
  const obtenidos = logros.filter(l => l.obtenido).length

  return (
    <Pantalla titulo="Perfil">
      <section className="tarjeta perfil-cab">
        <div className="avatar" aria-hidden="true">
          {/* Un nombre podría llegar vacío si alguien lo forzara por
              fuera del formulario. Sin esta guarda, leer [0] de una
              cadena vacía deja el avatar en blanco sin decir por qué. */}
          {(perfil.nombre || '?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="chico">{perfil.nombre}</h2>
          <p className="meta">
            {NOMBRE_DEL_ROL[perfil.rol] || 'Cliente'}
            {!esVisitante && ` · Nivel ${nivel} · ${perfil.xp} XP`}
          </p>
        </div>
      </section>

      {/* El visitante ve QUÉ se está perdiendo y CÓMO se desbloquea. Una
          función bloqueada sin explicación se lee como que la app está
          rota; con explicación, es una invitación. */}
      {esVisitante && (
        <section className="tarjeta">
          <h2 className="chico">Estás como invitado</h2>
          <p className="meta">
            Puedes ver los ejercicios y las recetas abiertas. Con un código
            de tu entrenador se abren tu plan de entrenamiento, tu progreso
            y la posibilidad de escribirle directo.
          </p>
        </section>
      )}

      {/* Mientras el catálogo no haya llegado, la sección no se pinta:
          "0 de 0" durante medio segundo se lee como que el usuario
          perdió sus logros. */}
      {!esVisitante && logros.length > 0 && (
        <>
          <h3 className="titulillo">
            Logros <span className="tenue">{obtenidos} de {logros.length}</span>
          </h3>
          <ul className="lista">
            {logros.map(l => (
              <li key={l.clave}
                  className={'fila' + (l.obtenido ? '' : ' es-bloqueado')}>
                <span className="fila-datos">
                  <strong>{l.nombre}</strong>
                  <small>{l.descripcion}</small>
                </span>
                <span className={'estado' + (l.obtenido ? ' es-ok' : '')}>
                  {l.obtenido ? 'listo' : 'pendiente'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* La entrada al panel del entrenador. Va aquí y no en una sexta
          pestaña para que la barra de abajo quede idéntica para todo el
          mundo: si el entrenador viera una pestaña que sus clientes no
          ven, la primera pregunta de un cliente sería por qué su app es
          distinta.

          Esconderlo no es lo que protege nada — quien tenga el navegador
          puede cambiar esta condición. Lo que impide que un cliente
          edite un ejercicio es la política `ejercicios_admin` de la
          base, que exige es_admin() en el servidor. */}
      {esAdmin && (
        <>
          <h3 className="titulillo">Tu contenido</h3>
          <ul className="lista">
            {/* VA DE PRIMERO, ANTES QUE LA BIBLIOTECA, y el orden es la
                decisión. La biblioteca se arma una vez y se retoca de
                vez en cuando; esto se mira cada semana. Lo que se abre
                más seguido va arriba, aunque se haya construido
                después. */}
            <li className="fila">
              <span className="fila-datos">
                <strong>Cómo van tus clientes</strong>
                <small>Quién está entrenando y quién lleva días sin venir</small>
              </span>
              <button type="button" className="enlace enlace-fila"
                      onClick={() => setViendoClientes(true)}>Abrir</button>
            </li>
            <li className="fila">
              <span className="fila-datos">
                <strong>Tu biblioteca</strong>
                <small>Agregar, editar y archivar ejercicios</small>
              </span>
              <button type="button" className="enlace enlace-fila"
                      onClick={() => setViendoPanel(true)}>Abrir</button>
            </li>
          </ul>
        </>
      )}

      <h3 className="titulillo">Tu cuenta</h3>
      <ul className="lista">
        <li className="fila">
          <span className="fila-datos">
            <strong>Mis datos</strong>
            <small>Descargar, corregir o eliminar tu información</small>
          </span>
          <button type="button" className="enlace enlace-fila"
                  onClick={() => setViendoDatos(true)}>Abrir</button>
        </li>
        <li className="fila es-proxima">
          <span className="fila-datos">
            <strong>Notificaciones</strong>
            <small>Recordatorio del entrenamiento del día</small>
          </span>
          <span className="estado">Fase 7</span>
        </li>
        {/* Los créditos NO son un adorno legal escondido: la licencia de
            las ilustraciones exige que la atribución sea visible, así que
            tiene que poderse llegar aquí sin saber que existe. */}
        <li className="fila">
          <span className="fila-datos">
            <strong>Créditos</strong>
            <small>De dónde salen las ilustraciones</small>
          </span>
          <button type="button" className="enlace enlace-fila"
                  onClick={() => setViendoCreditos(true)}>Abrir</button>
        </li>
      </ul>

      <button type="button" className="enlace" onClick={alSalir}>
        Cerrar sesión
      </button>

      {/* El pie. Va en Perfil porque es la pantalla de "lo mío": la
          cuenta, los datos y ahora también qué versión se está usando.
          No va en las otras cuatro — un aviso de derechos repetido cinco
          veces se lee como desconfianza, y aquí lo va a ver quien lo
          necesite.

          La versión no es adorno: esta app se actualiza sola con cada
          push y nadie ve nunca una pantalla de "actualizar", así que sin
          este número no hay forma de saber qué está corriendo cuando
          alguien reporte un fallo por WhatsApp. */}
      <p className="pie">
        {VERSION}
        <br />
        {avisoDerechos()}
      </p>
    </Pantalla>
  )
}

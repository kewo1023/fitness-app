/* =====================================================================
   useSesion.js — quién está usando la app, en un solo sitio.
   =====================================================================

   LO MÁS IMPORTANTE DE ESTE ARCHIVO, y lo que más confunde al empezar
   con Supabase: **estar autenticado y tener perfil son cosas
   distintas.**

     - `sesion`  -> Supabase sabe que existes: tienes correo y clave.
     - `perfil`  -> la app sabe quién eres: nombre, rol, XP.

   Se puede tener lo primero sin lo segundo, y ese estado no es un
   error: es alguien que se registró y todavía no ha dicho su nombre ni
   ha canjeado un código. Sin perfil, todas las políticas de la base le
   dejan ver exactamente nada.

   Los tres estados que devuelve, y qué pinta la app en cada uno:

     sesion=null                  -> pantalla de acceso
     sesion=algo, perfil=null     -> pantalla de activación
     sesion=algo, perfil=algo     -> la app

   Analogía de Excel: `sesion` es haber abierto el archivo protegido con
   contraseña; `perfil` es la fila que dice tu nombre y qué permisos
   tienes. Abrir el archivo no te mete en la tabla de usuarios.
   ===================================================================== */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSesion () {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  /* Trae el perfil del usuario actual.
   *
   * maybeSingle() y no single(): single() considera un ERROR que no
   * haya fila, y aquí "no hay fila" es un estado normal y esperado —
   * es justamente el visitante que aún no se ha activado. Con single()
   * la app mostraría un error rojo a alguien que no ha hecho nada mal. */
  const traerPerfil = useCallback(async () => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .maybeSingle()

    if (error) {
      // A la consola, no a la pantalla: quien abre la app no sabe qué
      // es una tabla ni le sirve saberlo (regla 3 de CLAUDE.md).
      console.error('No se pudo leer el perfil:', error)
      return null
    }
    return data
  }, [])

  useEffect(() => {
    let vivo = true   // evita escribir estado si el componente ya murió

    /* onAuthStateChange se dispara al arrancar Y en cada cambio de
     * sesión, así que sirve para las dos cosas a la vez: saber en qué
     * estado se abre la app, y enterarse de que alguien entró o salió.
     * Antes se hacía con getSession() aparte; esto es una llamada menos
     * y no deja un hueco entre las dos. */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_evento, nuevaSesion) => {
        if (!vivo) return
        setSesion(nuevaSesion)
        setPerfil(nuevaSesion ? await traerPerfil() : null)
        if (vivo) setCargando(false)
      }
    )

    // Desconectar al desmontar. Sin esto, cada montaje deja una
    // suscripción viva escuchando para siempre: la fuga de memoria más
    // común de React.
    return () => { vivo = false; subscription.unsubscribe() }
  }, [traerPerfil])

  /* Para llamar después de activar la cuenta o de canjear un código:
   * el perfil cambió en la base, pero la app todavía tiene el de
   * antes. */
  const recargarPerfil = useCallback(async () => {
    if (!supabase.auth.getSession) return
    setPerfil(await traerPerfil())
  }, [traerPerfil])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    sesion,
    perfil,
    cargando,
    recargarPerfil,
    salir,
    // Atajos, para que las pantallas no anden comparando textos sueltos
    // por ahí. Si mañana se agrega un cuarto rol, se cambia aquí.
    esAdmin:     perfil?.rol === 'admin',
    esCliente:   perfil?.rol === 'cliente' || perfil?.rol === 'admin',
    esVisitante: perfil?.rol === 'visitante'
  }
}

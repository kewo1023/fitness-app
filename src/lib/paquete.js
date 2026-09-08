/* =====================================================================
   paquete.js — qué se guarda en el celular para poder entrenar sin
   señal, y cuándo eso que se guardó ya no sirve.
   =====================================================================

   EL PROBLEMA QUE RESUELVE. El gimnasio es el peor sitio de la semana
   en cobertura: sótanos, paredes gruesas y cien personas colgadas de la
   misma antena. Y es exactamente el momento en que hace falta la app.
   Compite contra un PDF, que abre sin señal y nunca falla.

   =====================================================================
   POR QUÉ ESTO NO VA EN EL SERVICE WORKER
   =====================================================================

   `public/sw.js` tiene una regla grande y escrita: no cachea NADA de
   Supabase. No es una optimización. Un caché de HTTP es opaco —guarda
   lo que pase por ahí, sin que nadie sepa qué quedó dentro— y por ahí
   viajan datos de salud. La Ley 1581 le da al titular derecho a que sus
   datos se supriman, y una copia escondida en el disco de un celular
   queda fuera de ese borrado sin que nadie sepa que existe.

   Esa regla NO se toca. Lo de aquí es lo contrario de un caché opaco y
   por eso sí se puede defender:

     1. Es una lista ESCRITA de qué se guarda. Si mañana la app pide
        algo nuevo, no entra solo: hay que agregarlo aquí.
     2. Son SOLO TUS PROPIOS DATOS. Tu plan y tus rutinas. Nunca los de
        otro cliente, nunca `perfil_salud`, nunca el panel del
        entrenador.
     3. SE BORRA. Al cerrar sesión se vacía entero, y al eliminar la
        cuenta también, porque eliminar cierra la sesión.

   El punto 2 no se cumple solo: quien lo hace cumplir es `paqueteUtil`,
   comprobando de quién es lo guardado ANTES de pintarlo. Dos personas
   comparten un celular más seguido de lo que parece.
   ===================================================================== */

import { diaEnBogota, diasEntre } from '../data/fechas.js'

/** Sube esto cuando cambie la FORMA del paquete (un campo nuevo, uno
 *  que se va). Lo guardado con una forma vieja se descarta solo, en vez
 *  de llegar a medias a una pantalla que espera otra cosa. */
export const VERSION_PAQUETE = 1

/* Después de esto, lo guardado se descarta y la pantalla dice que no
   hay nada en vez de enseñarlo.

   DOS SEMANAS Y NO "PARA SIEMPRE" porque un plan cambia: el entrenador
   lo ajusta, lo reemplaza o lo termina. Enseñar la rutina de hace un mes
   con cara de rutina de hoy es peor que no enseñar nada — el que la
   sigue hace el entrenamiento equivocado y ni se entera. Un plan típico
   dura cuatro semanas, así que dos es tiempo de sobra para una racha de
   mala señal y poco para que el plan haya cambiado entero. */
export const DIAS_QUE_SIRVE = 14

/** Empaqueta lo que `Hoy` acaba de leer de la base. */
export function armarPaquete (clienteId, contenido, ahora = new Date()) {
  const cuando = ahora instanceof Date ? ahora : new Date(ahora)
  return {
    version: VERSION_PAQUETE,
    clienteId,
    guardadoEn: cuando.toISOString(),
    contenido
  }
}

/** Cuántos días tiene lo guardado, contados en Bogotá.
 *
 *  EN BOGOTÁ Y NO EN LA HORA DEL APARATO (regla 5). Guardar a las
 *  8 p.m. de Bogotá es ya el día siguiente en UTC: contando en crudo,
 *  algo de esta noche parecería de ayer. */
export function diasGuardado (paquete, ahora = new Date()) {
  if (!paquete || !paquete.guardadoEn) return null
  const dias = diasEntre(diaEnBogota(paquete.guardadoEn), diaEnBogota(ahora))
  return Number.isFinite(dias) ? dias : null
}

/** ¿Se puede pintar esto? */
export function paqueteUtil (paquete, clienteId, ahora = new Date()) {
  if (!paquete) return false
  if (paquete.version !== VERSION_PAQUETE) return false

  /* LA COMPROBACIÓN QUE SOSTIENE TODO LO DEMÁS. Si el celular guardó lo
   * de otra persona y no se borró —la app se cerró de golpe, se mató el
   * proceso, cerrar sesión no llegó a correr—, esto es lo único que
   * impide que el plan de alguien aparezca en la pantalla de otro.
   * Se compara ANTES de mirar la fecha a propósito: lo de otro no sirve
   * ni recién guardado. */
  if (!clienteId || paquete.clienteId !== clienteId) return false

  const dias = diasGuardado(paquete, ahora)
  if (dias === null) return false
  if (dias > DIAS_QUE_SIRVE) return false

  /* Un paquete "del futuro" no se descarta. Pasa cuando el reloj del
   * celular está mal o se cambió de zona horaria, y castigarlo dejaría
   * a alguien sin su rutina por algo que no tiene que ver con su plan.
   * Se trata como recién guardado. */
  return true
}

/** Cuándo se guardó, en palabras. Va en el aviso de "sin conexión".
 *
 *  DECIR CUÁNDO NO ES UN ADORNO: sin la fecha, alguien no puede saber
 *  si lo que está viendo es de esta mañana o de la semana pasada, y la
 *  app estaría pidiéndole que confíe en algo que no puede comprobar. */
export function textoDeEdad (paquete, ahora = new Date()) {
  const dias = diasGuardado(paquete, ahora)
  if (dias === null) return 'guardado hace un tiempo'
  if (dias <= 0) return 'guardado hoy'
  if (dias === 1) return 'guardado ayer'
  return `guardado hace ${dias} días`
}

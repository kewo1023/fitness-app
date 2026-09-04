/* =====================================================================
   invitaciones.js — en qué estado está un código
   =====================================================================

   Es poca cosa y aun así está aquí y no dentro de la pantalla, por la
   regla 10 de CLAUDE.md: es aritmética de fechas, y equivocarse tiene
   una consecuencia concreta.

   Un código VENCIDO que se muestre como disponible es un código que el
   entrenador le manda a alguien por WhatsApp. Esa persona crea su
   cuenta, escribe el código y recibe "ese código ya venció" — en su
   primer minuto en la app, sin saber qué hizo mal, y teniendo que
   escribirle otra vez a su entrenador.

   No lanza ningún error. Simplemente le pasa el problema a la persona
   que menos contexto tiene para resolverlo.
   ===================================================================== */

import { hoyBogota, diasEntre } from '../data/fechas.js'


/**
 * Tres estados, no dos.
 *
 *   'usado'    -> alguien ya lo canjeó. Un código sirve UNA vez.
 *   'vencido'  -> pasó su fecha. Sigue sin usar, y ya no sirve.
 *   'libre'    -> se puede mandar.
 *
 * Usado y vencido se ven igual desde afuera —ninguno de los dos
 * funciona— y no son lo mismo: uno significa que ganaste un cliente y
 * el otro que perdiste un código. Juntarlos en "no sirve" borra esa
 * diferencia justo en la pantalla donde se decide si crear más.
 *
 * SE COMPARA EN HORA DE BOGOTÁ, regla 5. La base guarda el vencimiento
 * como un instante en UTC; un código que vence hoy a las 7 p.m. de
 * Bogotá ya es "mañana" en UTC, y comparando con el reloj de quien
 * programa se vería vencido medio día antes de estarlo.
 */
export function estadoDeCodigo (invitacion, hoy = hoyBogota()) {
  if (!invitacion) return 'vencido'
  if (invitacion.usada_por) return 'usado'

  const vence = String(invitacion.expira_en || '').slice(0, 10)
  if (!vence) return 'vencido'

  // Vence AL FINAL de su día: el mismo día todavía sirve. Con `<= 0` un
  // código creado para hoy nacería vencido.
  return diasEntre(hoy, vence) < 0 ? 'vencido' : 'libre'
}


/** Cuántos se pueden mandar todavía. Es el número del encabezado, y el
 *  que dice si hace falta crear más. */
export function cuantosLibres (invitaciones = [], hoy = hoyBogota()) {
  return invitaciones.filter(i => estadoDeCodigo(i, hoy) === 'libre').length
}

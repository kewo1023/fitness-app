/* =====================================================================
   edad.js — la puerta de edad
   =====================================================================

   Decide si quien está activando su cuenta es mayor de edad. Es la
   pieza más pequeña del proyecto y la que más consecuencias legales
   tiene, así que va aparte y probada.

   NO TOCA LA BASE, igual que el resto de la lógica del proyecto.

   =====================================================================
   POR QUÉ EXISTE: EL ARTÍCULO 7 Y EL 12
   =====================================================================

   El artículo 7 de la **Ley 1581 de 2012** prohíbe el tratamiento de
   datos personales de niños, niñas y adolescentes, salvo los de
   naturaleza pública.

   El artículo 12 del **Decreto 1377 de 2013** —verificado contra la
   fuente oficial el 4/09/2026, después de quedar pendiente desde el
   1/09— dice cómo se hace la excepción: cuando se permite, la
   autorización la da el REPRESENTANTE LEGAL del menor, después de que
   el menor haya sido oído, y el tratamiento tiene que responder al
   interés superior del niño y respetar sus derechos fundamentales.

   =====================================================================
   POR QUÉ LA PUERTA BLOQUEA EN VEZ DE PEDIR PERMISO DEL REPRESENTANTE
   =====================================================================

   Porque hacerlo bien es otro producto. Habría que identificar al
   representante legal, capturar SU autorización, poder demostrar que
   es quien dice ser, y dejar constancia de que el menor fue oído. Y
   esta app guarda datos de SALUD, que son sensibles: hacerlo a medias
   es peor que no hacerlo, porque deja la apariencia de cumplimiento
   sin el cumplimiento.

   Bloquear no le impide al entrenador entrenar a un menor. Le impide a
   la APP guardar sus datos, que es lo que la ley regula.

   =====================================================================
   LA FECHA NO SE GUARDA
   =====================================================================

   Se pide, se calcula la edad y se descarta. `perfiles` no tiene
   columna de fecha de nacimiento y no se le agrega: guardar la fecha de
   alguien a quien se le va a negar la entrada sería tratar el dato del
   menor que la ley dice que no se trate — justo lo contrario de lo que
   la puerta existe para evitar.

   (La tabla `perfil_salud` sí tiene `fecha_nac`, pero esa es opcional,
   la llena el cliente adulto si quiere, y es otra cosa.)

   =====================================================================
   Y SE CALCULA EN HORA DE BOGOTÁ
   =====================================================================

   Regla 5. Un cumpleaños cambia a medianoche en Bogotá, no en el reloj
   de quien programa. Sin eso, alguien que cumple 18 hoy en Colombia
   podría ver la app decirle que todavía es menor durante unas horas —
   o al revés, que es la versión peligrosa.
   ===================================================================== */

import { hoyBogota } from '../data/fechas.js'

/* 18 años. Es la mayoría de edad en Colombia, que es donde viven el
 * entrenador y sus clientes. Va como constante con nombre y no como un
 * 18 suelto en un `if`: el día que la app se use en otro país, se
 * cambia aquí y se sabe qué se está cambiando. */
export const MAYORIA_DE_EDAD = 18

/* Hasta dónde se acepta una fecha. 120 años es un límite generoso, y
 * está para atrapar el error de tecleo —un año de 1025 o de 2925— antes
 * de que se convierta en "tienes 901 años" en la pantalla. */
const EDAD_MAXIMA = 120


/**
 * Cuántos años cumplidos tiene alguien nacido en esa fecha.
 *
 * Devuelve null si la fecha no sirve: vacía, mal escrita, o en el
 * futuro. Null NO es cero — es "no se sabe", y la pantalla lo trata
 * distinto. Es la misma lección de `acceso.js`: un dato que falta no es
 * una respuesta.
 *
 * @param {string} fecha "2001-04-23", como la entrega un <input type=date>
 * @param {string} [hoy] para poder probar sin depender del calendario
 */
export function edadCumplida (fecha, hoy = hoyBogota()) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null
  }

  const [a, m, d] = fecha.split('-').map(Number)
  const [ha, hm, hd] = hoy.split('-').map(Number)

  // Se comprueba que la fecha exista de verdad. `new Date(2026, 1, 31)`
  // no falla: se desborda al 3 de marzo. Así que se reconstruye y se
  // compara.
  const prueba = new Date(Date.UTC(a, m - 1, d))
  if (prueba.getUTCFullYear() !== a || prueba.getUTCMonth() !== m - 1 ||
      prueba.getUTCDate() !== d) {
    return null
  }

  let edad = ha - a
  // Todavía no ha cumplido este año si aún no llegó su mes, o si es su
  // mes pero no su día. Comparar solo el año daría 18 a alguien que los
  // cumple en diciembre.
  if (hm < m || (hm === m && hd < d)) edad--

  if (edad < 0 || edad > EDAD_MAXIMA) return null
  return edad
}


/**
 * El veredicto de la puerta. Tres respuestas, no dos.
 *
 *   'mayor'        -> puede seguir.
 *   'menor'        -> la app no puede tratar sus datos.
 *   'sinRespuesta' -> todavía no dijo, o dijo algo que no es una fecha.
 *
 * El tercero existe por lo mismo de siempre: no saber no es lo mismo
 * que saber que no. Con dos estados, alguien que no ha escrito nada
 * quedaría clasificado como menor y vería una pantalla que le dice que
 * no puede usar la app antes de haber contestado.
 */
export function puertaDeEdad (fecha, hoy = hoyBogota()) {
  const edad = edadCumplida(fecha, hoy)
  if (edad === null) return { estado: 'sinRespuesta', edad: null }
  return {
    estado: edad >= MAYORIA_DE_EDAD ? 'mayor' : 'menor',
    edad
  }
}


/** La fecha más reciente que puede escribir un mayor de edad.
 *
 * Sirve para el `max` del campo: el calendario del celular no deja
 * elegir más allá, así que el caso común se resuelve sin que nadie vea
 * un mensaje de error. El `max` es comodidad, no seguridad — la
 * decisión la toma `puertaDeEdad`, porque un atributo del HTML lo
 * cambia cualquiera desde la consola. */
export function fechaMaximaDeMayor (hoy = hoyBogota()) {
  const [a, m, d] = hoy.split('-').map(Number)
  const limite = new Date(Date.UTC(a - MAYORIA_DE_EDAD, m - 1, d))
  return limite.toISOString().slice(0, 10)
}

/* =====================================================================
   dispositivo.js — en qué nivel de decoración corre este celular.
   =====================================================================

   El problema: el desenfoque del fondo (`backdrop-filter`) es el efecto
   más caro que hay en CSS. El navegador tiene que tomar lo que está
   detrás, borronearlo y volverlo a pintar en cada cuadro. En un celular
   de gama alta ni se nota; en uno de gama baja la barra empieza a ir a
   tirones justo mientras el usuario hace scroll, que es todo el tiempo.

   El público de esta app es Android colombiano: gama media y baja. Así
   que en vez de apostar, se pregunta.

   TRES NIVELES, Y UNA REGLA QUE NO SE ROMPE:

     alto   vidrio de 14 px, entrada de 190 ms con escala, sombras
     medio  vidrio de 8 px, entrada de 150 ms solo con fundido
     bajo   sin vidrio, entrada de 110 ms, superficies planas

   **El nivel controla SOLO cómo se ve. Nunca qué se puede hacer, ni el
   orden de las cosas, ni los textos.** La app es la misma para todos.
   Si algún día un nivel esconde un botón, se acabó: el entrenador va a
   pasar media hora explicándole a un cliente por qué su app es distinta
   a la de otro.

   Analogía de Excel: es la misma tabla con distinto formato
   condicional. Los datos no cambian; cambia cuánto se adorna.

   Lo que se mira:

   - `deviceMemory`: RAM que declara el navegador, redondeada. Chrome de
     Android la reporta; Safari no (queda `undefined`, y ahí no se
     castiga a nadie: se asume que da).
   - `hardwareConcurrency`: núcleos del procesador.
   - `prefers-reduced-motion`: si el usuario pidió menos animación, se
     respeta por encima de todo lo demás.

   Se decide UNA vez al arrancar. Preguntarlo en cada cuadro costaría
   más que el efecto que se quiere ahorrar.

   PENDIENTE (Fase 8): medir los cuadros por segundo durante los
   primeros segundos de uso y BAJAR de nivel si se caen. Estas dos
   señales son crudas — un celular bueno con el procesador caliente va
   lento, y uno barato recién prendido va bien. Lo único que no miente
   es medir. Por eso `nivelDetectado()` está separada de
   `aplicarNivel()`: cuando llegue el medidor, solo llama a la segunda.
   ===================================================================== */

export const NIVELES = ['alto', 'medio', 'bajo']

/** Qué nivel le corresponde a este celular, mirando lo que declara. */
export function nivelDetectado () {
  // Si pidió menos movimiento, no hay nada que discutir.
  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'bajo'
  }

  const memoria = navigator.deviceMemory          // undefined si no se sabe
  const nucleos = navigator.hardwareConcurrency   // undefined si no se sabe

  // Se comparan solo los datos que existen. Un navegador que no reporta
  // nada (Safari) cae en 'alto', que es lo correcto: los iPhone dan.
  if ((typeof memoria === 'number' && memoria <= 4) ||
      (typeof nucleos === 'number' && nucleos <= 4)) {
    return 'bajo'
  }
  if ((typeof memoria === 'number' && memoria <= 6) ||
      (typeof nucleos === 'number' && nucleos <= 6)) {
    return 'medio'
  }
  return 'alto'
}

/**
 * Escribe el nivel en el <html>. Desde ahí manda el CSS: en theme.css
 * cada nivel redefine tres variables y no hay una sola regla de estilo
 * duplicada.
 */
export function aplicarNivel (nivel) {
  const n = NIVELES.includes(nivel) ? nivel : 'alto'
  document.documentElement.dataset.nivel = n
  return n
}

/** Lo que se llama al arrancar. */
export function aplicarCapacidades () {
  return aplicarNivel(nivelDetectado())
}

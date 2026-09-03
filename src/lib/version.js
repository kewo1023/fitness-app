/* =====================================================================
   version.js — qué versión está usando quien tiene la app abierta
   =====================================================================

   POR QUÉ ESTO EXISTE. El día que el entrenador escriba "no me
   funciona el botón de guardar", la primera pregunta va a ser si tiene
   la versión nueva. Sin un número a la vista, ni él ni nadie puede
   responderla, y se pierde media hora persiguiendo un fallo que ya
   estaba arreglado.

   Es más necesario aquí que en una app normal: esta se instala desde el
   navegador y se actualiza sola con cada push a Vercel, así que nadie
   ve nunca una pantalla de "actualizar". La única forma de saber qué
   está corriendo es que la app lo diga.

   CÓMO SE NUMERA. El primer número es 0 mientras la app no esté
   terminada, y el segundo es la fase de la hoja de ruta que ya está
   cerrada. v0.3.x quiere decir "fase 3". Cuando la app esté completa y
   en manos de clientes reales, pasa a v1.0.0.

   El tercer número sube con cada arreglo suelto. **Súbelo en el mismo
   commit que arregla algo**, no después: una versión que no cambia
   cuando cambia el código es peor que no tener versión, porque hace
   creer que se probó algo que no se probó.
   ===================================================================== */

export const VERSION = 'v0.3.0'

/* El año del aviso de derechos.
 *
 * Se calcula, no se escribe a mano, porque un "© 2026" congelado en un
 * archivo se queda viejo el 1 de enero y nadie se acuerda de tocarlo.
 *
 * Y va en hora de Bogotá, no en la del aparato (regla 5 de CLAUDE.md).
 * Suena exagerado para un año, pero el 31 de diciembre a las 8 de la
 * noche en Bogotá ya es 1 de enero en buena parte del mundo: un cliente
 * vería un año que todavía no ha llegado. */
export function anioActual () {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric'
  })
}

/* EL AVISO SEPARA DOS COSAS QUE NO SON LA MISMA, y esa separación es la
 * decisión, no el texto.
 *
 * El SOFTWARE —el código, la base de datos, el diseño, estos textos—
 * es de Kevin Rincón. El CONTENIDO DEPORTIVO que la app muestra —los
 * ejercicios, las indicaciones de técnica, las rutinas y las recetas—
 * es obra del entrenador que lo escribió y le pertenece a él.
 *
 * Son dos dueños con dominios distintos, y así se acordó el proyecto.
 * Un aviso que dijera "todo esto es mío" sería falso en la mitad y le
 * quitaría al entrenador la autoría de lo único que él aporta.
 *
 * OJO CON EL SÍMBOLO: va ©, nunca ®. El © es automático, no hay que
 * registrar nada y protege la obra desde que existe. El ® afirma que
 * hay una marca registrada ante una oficina de propiedad industrial, y
 * usarlo sin ese registro es una declaración falsa. Aquí la app todavía
 * ni siquiera tiene nombre. */
export function avisoDerechos () {
  return `© ${anioActual()} Kevin Rincón · Software, todos los derechos ` +
         'reservados. El contenido de entrenamiento es de su autor.'
}

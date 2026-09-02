/* =====================================================================
   tema.js — claro u oscuro, y quién decide.
   =====================================================================

   Hay TRES fuentes posibles de esa decisión, en orden de prioridad:

     1. Lo que el usuario eligió antes (guardado en el celular)
     2. La preferencia del sistema operativo
     3. Claro, si no se sabe nada

   La 1 gana sobre la 2 a propósito: si alguien tocó el botón, es porque
   la preferencia del sistema no le servía para esta app.

   DÓNDE SE GUARDA: en localStorage, que es el almacenamiento del
   navegador de ESE celular. No en la base de datos, y es deliberado —
   el tema es una preferencia del aparato, no de la persona. Alguien
   puede querer la app oscura en el celular y clara en la tablet, y
   sobre todo: el tema tiene que aplicarse ANTES de saber quién entró.
   Si viviera en la base, la app arrancaría siempre en claro y saltaría
   al oscuro medio segundo después.

   Analogía de Excel: es como el zoom de la hoja. Se guarda con el
   archivo en tu computador, no dentro de los datos.

   OJO: quien aplica el tema al ARRANCAR no es este archivo, es el
   script de tres líneas que está dentro del <head> de index.html.
   Tiene que correr antes de que el navegador pinte el primer pixel, y
   este módulo carga después. Lo de aquí es para cuando el usuario
   toca el botón. La razón está explicada en index.html.
   ===================================================================== */

const LLAVE = 'tema'
export const TEMAS = ['claro', 'oscuro']

/** Lo que el usuario eligió antes, o null si nunca eligió. */
export function temaGuardado () {
  try {
    const t = localStorage.getItem(LLAVE)
    return TEMAS.includes(t) ? t : null
  } catch {
    // Modo incógnito y algunos navegadores con el almacenamiento
    // bloqueado lanzan al leer. No es un error de la app: es que ese
    // celular no guarda preferencias. Se sigue con la del sistema.
    return null
  }
}

/** La preferencia del sistema operativo. */
export function temaDelSistema () {
  return window.matchMedia &&
         window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'oscuro'
    : 'claro'
}

/** El que está puesto ahora mismo en el <html>. */
export function temaActual () {
  const t = document.documentElement.dataset.tema
  return TEMAS.includes(t) ? t : temaDelSistema()
}

/**
 * Pone el tema y, de paso, ajusta el color de la barra de estado del
 * celular para que no quede de un color y la app de otro.
 *
 * El color NO está escrito aquí: se lee de la variable --fondo que
 * theme.css acaba de aplicar. Así sigue habiendo un solo sitio donde
 * viven los colores (regla 1 de CLAUDE.md), y el día que se cambie la
 * paleta la barra de estado cambia sola.
 */
export function aplicarTema (tema) {
  const t = TEMAS.includes(tema) ? tema : temaDelSistema()
  document.documentElement.dataset.tema = t

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const fondo = getComputedStyle(document.documentElement)
      .getPropertyValue('--fondo').trim()
    if (fondo) meta.setAttribute('content', fondo)
  }

  return t
}

/** Cambia al otro y lo recuerda. Es lo que llama el botón. */
export function alternarTema () {
  const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro'
  try {
    localStorage.setItem(LLAVE, nuevo)
  } catch {
    // Si no se puede guardar, el cambio igual se aplica: dura hasta que
    // cierre la app. Vale más que no pase nada al tocar el botón.
  }
  return aplicarTema(nuevo)
}

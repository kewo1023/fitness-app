import { describe, it, expect } from 'vitest'
import {
  nivelDesdeXp, avanceEnElNivel, XP_POR_NIVEL, cruzarLogros, hayLogrosNuevos
} from './gamificacion.js'

/* Regla 10 de CLAUDE.md: se prueba la lógica que puede hacer daño.
 * Un nivel mal calculado le dice a alguien que bajó de nivel sin haber
 * hecho nada malo, y eso no se arregla con una disculpa. */

describe('nivelDesdeXp', () => {
  it('empieza en el nivel 1, no en el 0', () => {
    // Es la trampa clásica del "dividir y ya": con 0 XP, 0/250 = 0, y
    // alguien recién llegado vería "Nivel 0".
    expect(nivelDesdeXp(0)).toBe(1)
  })

  it('sube justo al llegar al umbral, ni antes ni después', () => {
    expect(nivelDesdeXp(XP_POR_NIVEL - 1)).toBe(1)
    expect(nivelDesdeXp(XP_POR_NIVEL)).toBe(2)
    expect(nivelDesdeXp(XP_POR_NIVEL + 1)).toBe(2)
  })

  it('aguanta valores grandes', () => {
    expect(nivelDesdeXp(10 * XP_POR_NIVEL)).toBe(11)
  })

  it('nunca devuelve NaN aunque le llegue basura', () => {
    // perfil.xp podría llegar nulo si una consulta falla a medias. La
    // app tiene que mostrar "Nivel 1", nunca "Nivel NaN".
    expect(nivelDesdeXp(null)).toBe(1)
    expect(nivelDesdeXp(undefined)).toBe(1)
    expect(nivelDesdeXp('hola')).toBe(1)
    expect(nivelDesdeXp(-50)).toBe(1)
  })

  it('acepta el XP como texto, por si la base lo devuelve así', () => {
    expect(nivelDesdeXp('500')).toBe(3)
  })
})

describe('avanceEnElNivel', () => {
  it('va de 0 a 1 dentro del nivel', () => {
    expect(avanceEnElNivel(0)).toBe(0)
    expect(avanceEnElNivel(XP_POR_NIVEL / 2)).toBe(0.5)
  })

  it('se reinicia al subir de nivel, no se acumula', () => {
    // Si esto fallara, la barra de progreso se saldría de la caja.
    expect(avanceEnElNivel(XP_POR_NIVEL)).toBe(0)
    expect(avanceEnElNivel(XP_POR_NIVEL * 3)).toBe(0)
  })

  it('nunca devuelve NaN', () => {
    expect(avanceEnElNivel(null)).toBe(0)
    expect(avanceEnElNivel('x')).toBe(0)
  })
})

/* ---------------------------------------------------------------------
   Los logros y la insignia de "nuevo"
   ---------------------------------------------------------------------

   Esto también puede hacer daño, aunque de otra manera: una insignia
   que avisa de más deja de avisar. Si "nuevo" sale en logros de hace
   tres semanas, la palabra no significa nada y la persona aprende a no
   mirarla — que es exactamente el problema que la columna `visto`
   venía a resolver desde que se escribió el esquema. */

const CATALOGO = [
  { clave: 'primer_entreno', nombre: 'El primero',  descripcion: '...', orden: 1 },
  { clave: 'diez_entrenos',  nombre: 'Diez',        descripcion: '...', orden: 2 },
  { clave: 'mes_completo',   nombre: 'Un mes',      descripcion: '...', orden: 3 }
]

describe('cruzarLogros', () => {
  it('devuelve el catálogo COMPLETO, no solo lo conseguido', () => {
    // Una lista donde solo salen los ganados no enseña qué falta, que es
    // la mitad de para qué sirve la sección.
    const r = cruzarLogros(CATALOGO, [{ logro: 'primer_entreno', visto: true }])
    expect(r).toHaveLength(3)
    expect(r.map(l => l.clave)).toEqual(
      ['primer_entreno', 'diez_entrenos', 'mes_completo'])
  })

  it('marca como nuevo solo lo conseguido y todavía sin ver', () => {
    const r = cruzarLogros(CATALOGO, [
      { logro: 'primer_entreno', visto: true },
      { logro: 'diez_entrenos',  visto: false }
    ])
    expect(r[0]).toMatchObject({ obtenido: true,  nuevo: false })
    expect(r[1]).toMatchObject({ obtenido: true,  nuevo: true })
    expect(r[2]).toMatchObject({ obtenido: false, nuevo: false })
  })

  it('un logro que NO se tiene jamás sale como nuevo', () => {
    // Sería lo peor que puede pasar aquí: avisarle a alguien de un
    // premio que no ganó.
    const r = cruzarLogros(CATALOGO, [])
    expect(r.some(l => l.nuevo)).toBe(false)
  })

  it('si la consulta olvida la columna `visto`, no inventa novedades', () => {
    // El caso defensivo: `!undefined` es `true`, así que con la
    // comprobación ingenua los tres saldrían nuevos PARA SIEMPRE — la
    // marca se escribe sobre las filas con `visto = false`, y estas no
    // lo están.
    const r = cruzarLogros(CATALOGO, [{ logro: 'primer_entreno' }])
    expect(r[0]).toMatchObject({ obtenido: true, nuevo: false })
  })

  it('aguanta que cualquiera de las dos listas llegue vacía o nula', () => {
    // Las dos consultas van en paralelo y una puede fallar sola.
    expect(cruzarLogros(null, null)).toEqual([])
    expect(cruzarLogros([], [{ logro: 'x', visto: false }])).toEqual([])
    expect(cruzarLogros(CATALOGO, null).every(l => !l.obtenido)).toBe(true)
  })

  it('ignora un logro obtenido que ya no está en el catálogo', () => {
    // Pasa si alguna vez se retira un logro: la fila vieja se queda en
    // `logros_obtenidos`, y no debe pintar una fila fantasma.
    const r = cruzarLogros(CATALOGO, [{ logro: 'retirado', visto: false }])
    expect(r).toHaveLength(3)
    expect(hayLogrosNuevos(r)).toBe(false)
  })
})

describe('hayLogrosNuevos', () => {
  it('dice que no cuando no hay nada sin ver', () => {
    // De esto depende que abrir el perfil NO escriba en la base cada
    // vez. Sin esta guarda, cada visita manda un update que no cambia
    // ninguna fila.
    const r = cruzarLogros(CATALOGO, [{ logro: 'primer_entreno', visto: true }])
    expect(hayLogrosNuevos(r)).toBe(false)
  })

  it('dice que sí con uno solo sin ver', () => {
    const r = cruzarLogros(CATALOGO, [{ logro: 'mes_completo', visto: false }])
    expect(hayLogrosNuevos(r)).toBe(true)
  })

  it('no revienta con una lista vacía o nula', () => {
    expect(hayLogrosNuevos([])).toBe(false)
    expect(hayLogrosNuevos(null)).toBe(false)
  })
})

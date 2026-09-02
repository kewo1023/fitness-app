import { describe, it, expect } from 'vitest'
import { nivelDesdeXp, avanceEnElNivel, XP_POR_NIVEL } from './gamificacion.js'

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

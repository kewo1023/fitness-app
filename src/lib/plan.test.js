import { describe, it, expect } from 'vitest'
import { puntoDelPlan, diaDelPlan, rachaSemanal } from './plan.js'

/* =====================================================================
   Pruebas del punto del plan
   =====================================================================

   Esto es aritmética de fechas, o sea el sitio donde la app se rompe en
   silencio (regla 5 de CLAUDE.md). Un error aquí no lanza un error:
   muestra la rutina del martes un miércoles, o le borra a alguien una
   racha que sí completó, y nadie se entera hasta que un cliente
   reclama.

   Las fechas de referencia:
     2026-09-04 es VIERNES
     2026-08-31 es LUNES
     2026-09-07 es LUNES
   ===================================================================== */

const PLAN = { inicio: '2026-08-31', semanas: 4, meta_semanal: 3 }

describe('en qué semana del plan estamos', () => {
  it('el mismo lunes que arranca es la semana 1', () => {
    expect(puntoDelPlan(PLAN, '2026-08-31'))
      .toEqual({ semana: 1, dia: 1, estado: 'enCurso' })
  })

  it('el viernes de esa semana sigue siendo la semana 1', () => {
    expect(puntoDelPlan(PLAN, '2026-09-04'))
      .toEqual({ semana: 1, dia: 5, estado: 'enCurso' })
  })

  it('el domingo es el día 7, no el día 0', () => {
    // JavaScript numera el domingo como 0. Si eso se cuela, la rutina
    // del domingo no aparece nunca.
    expect(puntoDelPlan(PLAN, '2026-09-06').dia).toBe(7)
  })

  it('el lunes siguiente ya es la semana 2', () => {
    expect(puntoDelPlan(PLAN, '2026-09-07'))
      .toEqual({ semana: 2, dia: 1, estado: 'enCurso' })
  })

  it('la última semana todavía está en curso', () => {
    expect(puntoDelPlan(PLAN, '2026-09-21').estado).toBe('enCurso')
    expect(puntoDelPlan(PLAN, '2026-09-21').semana).toBe(4)
  })

  it('pasada la última semana, terminado', () => {
    const p = puntoDelPlan(PLAN, '2026-09-28')
    expect(p.semana).toBe(5)
    expect(p.estado).toBe('terminado')
  })
})

describe('un plan que arranca a mitad de semana', () => {
  /* El caso que decide todo el diseño. Si las semanas se contaran como
   * "7 días desde el inicio", el lunes de por medio caería en dos
   * semanas a la vez y la rutina del lunes se vería dos veces o
   * ninguna. Ver el comentario largo de plan.js. */
  const MIERCOLES = { inicio: '2026-09-02', semanas: 4, meta_semanal: 3 }

  it('el miércoles que arranca es semana 1, día 3', () => {
    expect(puntoDelPlan(MIERCOLES, '2026-09-02'))
      .toEqual({ semana: 1, dia: 3, estado: 'enCurso' })
  })

  it('el lunes siguiente es semana 2, no sigue siendo la 1', () => {
    expect(puntoDelPlan(MIERCOLES, '2026-09-07'))
      .toEqual({ semana: 2, dia: 1, estado: 'enCurso' })
  })

  it('el martes ANTERIOR al arranque todavía no empezó', () => {
    // Cae en la misma semana de calendario que el inicio, así que
    // comparar solo los lunes lo daría por empezado.
    expect(puntoDelPlan(MIERCOLES, '2026-09-01').estado).toBe('noEmpieza')
  })
})

describe('un plan asignado para el futuro', () => {
  it('no ha empezado, y eso NO es un error', () => {
    const futuro = { inicio: '2026-09-14', semanas: 4, meta_semanal: 3 }
    expect(puntoDelPlan(futuro, '2026-09-04').estado).toBe('noEmpieza')
  })
})

describe('sin plan', () => {
  it('devuelve null y no revienta', () => {
    expect(puntoDelPlan(null)).toBe(null)
    expect(puntoDelPlan({})).toBe(null)
  })
})

describe('qué toca hoy', () => {
  const DIAS = [
    { semana: 1, dia: 1, rutina_id: 10 },
    { semana: 1, dia: 3, rutina_id: null },   // descanso a propósito
    { semana: 1, dia: 5, rutina_id: 12 },
    { semana: 2, dia: 1, rutina_id: 11 }
  ]

  it('encuentra la rutina de la semana y el día correctos', () => {
    const punto = puntoDelPlan(PLAN, '2026-09-04')   // semana 1, día 5
    expect(diaDelPlan(DIAS, punto).rutina_id).toBe(12)
  })

  it('no confunde el día 1 de la semana 1 con el de la semana 2', () => {
    const s2 = puntoDelPlan(PLAN, '2026-09-07')
    expect(diaDelPlan(DIAS, s2).rutina_id).toBe(11)
  })

  it('un descanso programado devuelve la fila, con rutina en null', () => {
    const punto = puntoDelPlan(PLAN, '2026-09-02')   // semana 1, día 3
    const d = diaDelPlan(DIAS, punto)
    expect(d).not.toBe(null)
    expect(d.rutina_id).toBe(null)
  })

  it('un día sin programar devuelve null, que NO es lo mismo', () => {
    const punto = puntoDelPlan(PLAN, '2026-09-01')   // semana 1, día 2
    expect(diaDelPlan(DIAS, punto)).toBe(null)
  })

  it('si el plan no está en curso, no hay día que mostrar', () => {
    const terminado = puntoDelPlan(PLAN, '2026-10-30')
    expect(diaDelPlan(DIAS, terminado)).toBe(null)
  })
})

describe('la racha semanal', () => {
  // Semana del lunes 2026-08-31 al domingo 2026-09-06.
  it('cuenta solo las sesiones de esta semana', () => {
    const r = rachaSemanal(
      PLAN,
      ['2026-08-30', '2026-08-31', '2026-09-02', '2026-09-04'],
      '2026-09-04'
    )
    // La del 30 es domingo de la semana pasada: no cuenta.
    expect(r.hechas).toBe(3)
    expect(r.cumplida).toBe(true)
    expect(r.faltan).toBe(0)
  })

  it('no cuenta sesiones futuras', () => {
    const r = rachaSemanal(PLAN, ['2026-09-04', '2026-09-06'], '2026-09-04')
    expect(r.hechas).toBe(1)
  })

  it('la meta sale del plan, nunca de una constante', () => {
    const otro = { ...PLAN, meta_semanal: 5 }
    expect(rachaSemanal(otro, [], '2026-09-04').meta).toBe(5)
    expect(rachaSemanal(otro, [], '2026-09-04').faltan).toBe(5)
  })

  it('pasarse de la meta muestra la meta, no un número mayor', () => {
    const r = rachaSemanal(
      PLAN, ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'],
      '2026-09-04'
    )
    expect(r.hechas).toBe(4)
    expect(r.mostradas).toBe(3)   // los puntitos son 3, no 4
    expect(r.cumplida).toBe(true)
  })

  it('sin sesiones no revienta y no cumple', () => {
    const r = rachaSemanal(PLAN, [], '2026-09-04')
    expect(r).toMatchObject({ hechas: 0, faltan: 3, cumplida: false })
  })
})

/* Pruebas de fechas.js.
 *
 * De todo el código de la app, esta es la parte que puede hacer daño en
 * silencio: si "hoy" se calcula mal, se rompen rachas que el usuario sí
 * completó y nadie se entera hasta que alguien reclama.
 *
 * Se corre con: npm run test
 */
import { describe, it, expect } from 'vitest'
import {
  hoyBogota, diaEnBogota, diaSemanaBogota, inicioSemanaBogota,
  diasEntre, formatearFecha, fechaLarga
} from './fechas.js'

describe('hoyBogota', () => {
  it('devuelve el formato aaaa-mm-dd que entiende Postgres', () => {
    expect(hoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('diaEnBogota — la trampa de la noche', () => {
  it('a las 8 p.m. de Bogotá todavía es el MISMO día', () => {
    // 2026-09-01 20:00 en Bogotá = 2026-09-02 01:00 en UTC.
    // Si esto devolviera "2026-09-02", la racha se rompería sola.
    expect(diaEnBogota('2026-09-02T01:00:00Z')).toBe('2026-09-01')
  })

  it('a las 7 a.m. de Bogotá es el día correcto', () => {
    expect(diaEnBogota('2026-09-01T12:00:00Z')).toBe('2026-09-01')
  })

  it('el cambio de día ocurre a la medianoche de Bogotá, no de UTC', () => {
    expect(diaEnBogota('2026-09-02T04:59:00Z')).toBe('2026-09-01')
    expect(diaEnBogota('2026-09-02T05:00:00Z')).toBe('2026-09-02')
  })
})

describe('diaSemanaBogota — la semana empieza el lunes', () => {
  it('el 2026-09-01 es martes', () => {
    expect(diaSemanaBogota('2026-09-01')).toBe(2)
  })
  it('el domingo es 7, no 0', () => {
    expect(diaSemanaBogota('2026-09-06')).toBe(7)
  })
  it('el lunes es 1', () => {
    expect(diaSemanaBogota('2026-08-31')).toBe(1)
  })
})

describe('inicioSemanaBogota', () => {
  it('desde un martes devuelve el lunes anterior', () => {
    expect(inicioSemanaBogota('2026-09-01')).toBe('2026-08-31')
  })
  it('desde un domingo devuelve el lunes de esa misma semana', () => {
    expect(inicioSemanaBogota('2026-09-06')).toBe('2026-08-31')
  })
  it('desde un lunes se devuelve a sí mismo', () => {
    expect(inicioSemanaBogota('2026-08-31')).toBe('2026-08-31')
  })
})

describe('diasEntre', () => {
  it('cuenta días completos', () => {
    expect(diasEntre('2026-08-31', '2026-09-06')).toBe(6)
  })
  it('cruza el cambio de mes sin equivocarse', () => {
    expect(diasEntre('2026-08-30', '2026-09-01')).toBe(2)
  })
})

describe('formato para el usuario', () => {
  it('formatearFecha usa dd/mm/aaaa, como en Colombia', () => {
    expect(formatearFecha('2026-09-01')).toBe('01/09/2026')
  })
  it('fechaLarga sale en español y con mayúscula inicial', () => {
    expect(fechaLarga('2026-09-01')).toBe('Martes 1 de septiembre')
  })
})

import { describe, it, expect } from 'vitest'
import { estadoDeCodigo, cuantosLibres } from './invitaciones.js'

/* =====================================================================
   Pruebas del estado de un código
   =====================================================================

   Lo que se protege: que un código vencido no se muestre como
   disponible. Ese error no falla en ningún sitio — se lo lleva la
   persona del otro lado, en su primer minuto en la app.

   2026-09-04 es la fecha de referencia de estas pruebas.
   ===================================================================== */

const HOY = '2026-09-04'

describe('en qué estado está un código', () => {
  it('uno recién creado se puede mandar', () => {
    expect(estadoDeCodigo(
      { expira_en: '2026-10-04T12:00:00Z', usada_por: null }, HOY
    )).toBe('libre')
  })

  it('el que vence HOY todavía sirve', () => {
    // Vence al final de su día. Con la comparación al revés, un código
    // creado para hoy nacería vencido.
    expect(estadoDeCodigo(
      { expira_en: '2026-09-04T23:59:00Z', usada_por: null }, HOY
    )).toBe('libre')
  })

  it('el de ayer ya no', () => {
    expect(estadoDeCodigo(
      { expira_en: '2026-09-03T23:59:00Z', usada_por: null }, HOY
    )).toBe('vencido')
  })

  it('usado y vencido NO son lo mismo', () => {
    // Uno significa que ganaste un cliente y el otro que perdiste un
    // código. Juntarlos en "no sirve" borra esa diferencia justo en la
    // pantalla donde se decide si crear más.
    const usado = { expira_en: '2026-10-04T12:00:00Z', usada_por: 'uuid-1' }
    const vencido = { expira_en: '2026-08-01T12:00:00Z', usada_por: null }

    expect(estadoDeCodigo(usado, HOY)).toBe('usado')
    expect(estadoDeCodigo(vencido, HOY)).toBe('vencido')
  })

  it('usado le gana a vencido', () => {
    // Uno que se canjeó y después se venció sigue contando como usado:
    // lo que importa de él es que alguien entró con él.
    expect(estadoDeCodigo(
      { expira_en: '2026-08-01T12:00:00Z', usada_por: 'uuid-1' }, HOY
    )).toBe('usado')
  })

  it('sin datos no dice que sirve', () => {
    // El error seguro es el que NO invita a mandar un código roto.
    expect(estadoDeCodigo(null, HOY)).toBe('vencido')
    expect(estadoDeCodigo({ expira_en: null, usada_por: null }, HOY)).toBe('vencido')
    expect(estadoDeCodigo({}, HOY)).toBe('vencido')
  })
})

describe('cuántos quedan para mandar', () => {
  const LISTA = [
    { expira_en: '2026-10-04T12:00:00Z', usada_por: null },       // libre
    { expira_en: '2026-10-04T12:00:00Z', usada_por: null },       // libre
    { expira_en: '2026-10-04T12:00:00Z', usada_por: 'uuid-1' },   // usado
    { expira_en: '2026-08-01T12:00:00Z', usada_por: null }        // vencido
  ]

  it('cuenta solo los que se pueden mandar', () => {
    expect(cuantosLibres(LISTA, HOY)).toBe(2)
  })

  it('una lista vacía da cero, no revienta', () => {
    expect(cuantosLibres([], HOY)).toBe(0)
    expect(cuantosLibres(undefined, HOY)).toBe(0)
  })
})

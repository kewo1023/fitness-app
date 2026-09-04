import { describe, it, expect } from 'vitest'
import {
  edadCumplida, puertaDeEdad, fechaMaximaDeMayor, MAYORIA_DE_EDAD
} from './edad.js'

/* =====================================================================
   Las pruebas de la puerta de edad
   =====================================================================

   Estas no están para que el código no falle: están para que no se
   pueda "simplificar". La puerta implementa el artículo 7 de la Ley
   1581 y el artículo 12 del Decreto 1377, y quien la toque dentro de
   seis meses no va a tener eso en la cabeza.

   Si alguien cambia el cálculo por `hoy.año - nacimiento.año`, las dos
   pruebas del cumpleaños se ponen rojas y explican por qué.
   ===================================================================== */

const HOY = '2026-09-04'

describe('cuántos años tiene', () => {
  it('los cumplió hace meses', () => {
    expect(edadCumplida('2000-01-15', HOY)).toBe(26)
  })

  it('los cumple HOY: ya es su edad nueva', () => {
    expect(edadCumplida('2008-09-04', HOY)).toBe(18)
  })

  it('los cumple MAÑANA: todavía no', () => {
    // Comparar solo el año daría 18 y dejaría entrar a un menor un día
    // antes de tiempo. Un día, pero es el día que importa.
    expect(edadCumplida('2008-09-05', HOY)).toBe(17)
  })

  it('los cumplió ayer', () => {
    expect(edadCumplida('2008-09-03', HOY)).toBe(18)
  })

  it('mismo mes, día posterior: todavía no', () => {
    expect(edadCumplida('2008-09-30', HOY)).toBe(17)
  })

  it('mes posterior del mismo año: todavía no', () => {
    expect(edadCumplida('2008-12-01', HOY)).toBe(17)
  })
})

describe('fechas que no sirven', () => {
  it('vacía o mal escrita da null, no cero', () => {
    // null es "no se sabe". Cero sería "recién nacido", y eso lo
    // clasificaría como menor a alguien que no ha contestado.
    expect(edadCumplida('', HOY)).toBe(null)
    expect(edadCumplida('ayer', HOY)).toBe(null)
    expect(edadCumplida('2008-9-4', HOY)).toBe(null)
    expect(edadCumplida(null, HOY)).toBe(null)
    expect(edadCumplida(undefined, HOY)).toBe(null)
  })

  it('una fecha del futuro no sirve', () => {
    expect(edadCumplida('2030-01-01', HOY)).toBe(null)
  })

  it('un día que no existe no sirve', () => {
    // new Date(2026, 1, 31) NO falla: se desborda al 3 de marzo. Sin
    // reconstruir y comparar, un 31 de febrero pasaría como válido.
    expect(edadCumplida('2001-02-31', HOY)).toBe(null)
    expect(edadCumplida('2001-13-01', HOY)).toBe(null)
  })

  it('un año absurdo no sirve', () => {
    expect(edadCumplida('1025-01-01', HOY)).toBe(null)
  })
})

describe('el veredicto de la puerta', () => {
  it('un adulto pasa', () => {
    expect(puertaDeEdad('1994-03-12', HOY))
      .toEqual({ estado: 'mayor', edad: 32 })
  })

  it('un menor NO pasa', () => {
    expect(puertaDeEdad('2012-05-20', HOY).estado).toBe('menor')
  })

  it('justo el día que cumple 18, pasa', () => {
    expect(puertaDeEdad('2008-09-04', HOY).estado).toBe('mayor')
  })

  it('un día antes de cumplir 18, no pasa', () => {
    expect(puertaDeEdad('2008-09-05', HOY).estado).toBe('menor')
  })

  it('SIN RESPUESTA NO ES "MENOR"', () => {
    // Con dos estados, quien no ha escrito nada quedaría clasificado
    // como menor y vería el mensaje de que no puede usar la app antes
    // de haber contestado. No saber no es saber que no.
    expect(puertaDeEdad('', HOY).estado).toBe('sinRespuesta')
    expect(puertaDeEdad('', HOY).estado).not.toBe('menor')
  })

  it('la mayoría de edad es 18 y tiene nombre', () => {
    // Si alguien la cambia, que sea a propósito y en un solo sitio.
    expect(MAYORIA_DE_EDAD).toBe(18)
  })
})

describe('el límite del calendario', () => {
  it('es exactamente 18 años antes de hoy', () => {
    expect(fechaMaximaDeMayor(HOY)).toBe('2008-09-04')
  })

  it('quien nació ese día justo es mayor', () => {
    // El límite es inclusivo: el max del campo y la puerta tienen que
    // decir lo mismo, o el calendario dejaría elegir una fecha que la
    // validación después rechaza.
    expect(puertaDeEdad(fechaMaximaDeMayor(HOY), HOY).estado).toBe('mayor')
  })
})

import { describe, it, expect } from 'vitest'
import {
  armarPaquete, paqueteUtil, diasGuardado, textoDeEdad,
  VERSION_PAQUETE, DIAS_QUE_SIRVE
} from './paquete.js'

/* Regla 10: se prueba la lógica que puede hacer daño. Aquí el daño
 * tiene dos formas y las dos son peores que "la app no carga":
 *
 *   1. Enseñarle a alguien el plan de OTRA persona, si dos comparten el
 *      celular. Es un dato de un tercero en una pantalla ajena, que es
 *      el mismo error del 2/09.
 *   2. Enseñar una rutina vieja con cara de rutina de hoy. Quien la
 *      sigue hace el entrenamiento equivocado y no se entera. */

const YO   = '11111111-1111-1111-1111-111111111111'
const OTRO = '22222222-2222-2222-2222-222222222222'

const enBogota = (fecha, hora = '12:00') =>
  new Date(`${fecha}T${hora}:00-05:00`)

describe('armarPaquete', () => {
  it('deja escrito de quién es y de cuándo', () => {
    const p = armarPaquete(YO, { plan: { id: 1 } }, enBogota('2026-09-08'))
    expect(p.clienteId).toBe(YO)
    expect(p.version).toBe(VERSION_PAQUETE)
    expect(p.contenido.plan.id).toBe(1)
    expect(typeof p.guardadoEn).toBe('string')
  })
})

describe('paqueteUtil', () => {
  it('NO enseña el paquete de otra persona, ni recién guardado', () => {
    /* EL CASO QUE SOSTIENE TODO. Dos personas comparten un celular más
     * seguido de lo que parece, y cerrar sesión puede no haber llegado
     * a correr: la app se cerró de golpe, el sistema mató el proceso.
     * Esta comprobación es lo único que queda de pie. */
    const p = armarPaquete(OTRO, {}, enBogota('2026-09-08'))
    expect(paqueteUtil(p, YO, enBogota('2026-09-08'))).toBe(false)
  })

  it('tampoco cuando no se sabe quién eres', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-08'))
    expect(paqueteUtil(p, null, enBogota('2026-09-08'))).toBe(false)
    expect(paqueteUtil(p, undefined, enBogota('2026-09-08'))).toBe(false)
  })

  it('sirve el mismo día y hasta el último día del plazo', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-08'))
    expect(paqueteUtil(p, YO, enBogota('2026-09-08'))).toBe(true)
    const justo = new Date(enBogota('2026-09-08'))
    justo.setDate(justo.getDate() + DIAS_QUE_SIRVE)
    expect(paqueteUtil(p, YO, justo)).toBe(true)
  })

  it('deja de servir al día siguiente del plazo', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-08'))
    const tarde = new Date(enBogota('2026-09-08'))
    tarde.setDate(tarde.getDate() + DIAS_QUE_SIRVE + 1)
    expect(paqueteUtil(p, YO, tarde)).toBe(false)
  })

  it('descarta una forma vieja en vez de pintarla a medias', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-08'))
    expect(paqueteUtil({ ...p, version: VERSION_PAQUETE - 1 }, YO,
                       enBogota('2026-09-08'))).toBe(false)
  })

  it('no revienta si no hay nada guardado', () => {
    expect(paqueteUtil(null, YO)).toBe(false)
    expect(paqueteUtil({}, YO)).toBe(false)
  })

  it('aguanta un reloj adelantado en vez de dejar a alguien sin rutina', () => {
    // Pasa con el reloj del celular mal puesto o al cambiar de zona. El
    // plan no tiene la culpa.
    const p = armarPaquete(YO, {}, enBogota('2026-09-10'))
    expect(paqueteUtil(p, YO, enBogota('2026-09-08'))).toBe(true)
  })
})

describe('diasGuardado', () => {
  it('cuenta en Bogotá, no en la hora del aparato', () => {
    /* Guardado a las 8 p.m. de Bogotá: en UTC eso ya es el día
     * siguiente. Contando en crudo, algo de anoche parecería de hoy o
     * de ayer según desde dónde se mire. Regla 5. */
    const guardado = armarPaquete(YO, {}, enBogota('2026-09-08', '20:00'))
    expect(diasGuardado(guardado, enBogota('2026-09-08', '22:00'))).toBe(0)
    expect(diasGuardado(guardado, enBogota('2026-09-09', '06:00'))).toBe(1)
  })
})

describe('textoDeEdad', () => {
  it('dice cuándo, porque si no nadie puede juzgar lo que ve', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-08'))
    expect(textoDeEdad(p, enBogota('2026-09-08'))).toBe('guardado hoy')
    expect(textoDeEdad(p, enBogota('2026-09-09'))).toBe('guardado ayer')
    expect(textoDeEdad(p, enBogota('2026-09-11'))).toBe('guardado hace 3 días')
  })

  it('nunca dice "hace -1 días" con el reloj adelantado', () => {
    const p = armarPaquete(YO, {}, enBogota('2026-09-10'))
    expect(textoDeEdad(p, enBogota('2026-09-08'))).toBe('guardado hoy')
  })
})

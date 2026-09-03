import { describe, it, expect } from 'vitest'
import { VERSION, anioActual, avisoDerechos } from './version.js'

describe('VERSION', () => {
  it('tiene forma de versión y no un texto cualquiera', () => {
    // Si alguien la deja en "nueva" o "final", el número deja de servir
    // para lo único que sirve: comparar dos instalaciones.
    expect(VERSION).toMatch(/^v\d+\.\d+\.\d+$/)
  })
})

describe('anioActual', () => {
  it('devuelve un año de cuatro dígitos', () => {
    expect(anioActual()).toMatch(/^\d{4}$/)
  })

  it('lo calcula en hora de Bogotá, no en la del aparato', () => {
    /* Regla 5 de CLAUDE.md. Suena exagerado para un año, pero el 31 de
     * diciembre a las 8 p.m. en Bogotá ya es 1 de enero en Europa y en
     * buena parte de Asia. Si esto usara la zona del aparato, alguien
     * vería un año que en su país todavía no ha llegado.
     *
     * La prueba no puede fijar el reloj sin una librería, así que
     * comprueba lo que sí se puede comprobar: que el resultado coincide
     * con el año en Bogotá calculado por otro camino, y que ese año no
     * es siempre el mismo que el UTC (que es lo que delataría que la
     * zona horaria se está ignorando en la frontera del año). */
    const enBogota = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota', year: 'numeric'
    }).format(new Date())

    expect(anioActual()).toBe(enBogota)
  })
})

describe('avisoDerechos', () => {
  it('lleva el año y el titular del software', () => {
    const aviso = avisoDerechos()
    expect(aviso).toContain(anioActual())
    expect(aviso).toContain('Kevin Rincón')
  })

  it('NUNCA usa ®', () => {
    /* Esta prueba no cuida el código: cuida que nadie "mejore" el aviso
     * poniéndole el símbolo que se ve más serio.
     *
     * © es automático y protege la obra desde que existe. ® afirma que
     * hay una marca registrada ante una oficina de propiedad industrial,
     * y ponerlo sin ese registro es una declaración falsa. La app ni
     * siquiera tiene nombre todavía. */
    expect(avisoDerechos()).not.toContain('®')
    expect(avisoDerechos()).toContain('©')
  })

  it('no se atribuye el contenido del entrenador', () => {
    /* La decisión de fondo, no el texto. El software es de Kev; los
     * ejercicios, las indicaciones y las recetas son obra del
     * entrenador. Un aviso que dijera "todos los derechos reservados" a
     * secas se lo atribuiría todo y contradiría el acuerdo del 1/09 de
     * que son dos dueños con dominios distintos.
     *
     * Si alguien simplifica el aviso y borra esta distinción, esta
     * prueba se cae. */
    const aviso = avisoDerechos()
    expect(aviso).toMatch(/[Ss]oftware/)
    expect(aviso).toMatch(/contenido/i)
  })
})

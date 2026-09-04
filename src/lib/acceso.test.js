import { describe, it, expect } from 'vitest'
import { pantallaPara, PANTALLAS } from './acceso.js'

/* Estas pruebas existen por dos bugs reales, y las dos que más importan
 * son las del bloque "un fallo no es una respuesta". Si alguien
 * "simplifica" pantallaPara a un `if (!perfil)`, esas dos se ponen
 * rojas y explican por qué. */

const SESION = { user: { id: 'abc' } }
const PERFIL = { id: 'abc', nombre: 'Camilo', rol: 'cliente' }

describe('los cuatro estados de siempre', () => {
  it('mientras se pregunta por la sesión: cargando', () => {
    expect(pantallaPara({ cargando: true, sesion: null, perfil: undefined }))
      .toBe(PANTALLAS.CARGANDO)
  })

  it('sin sesión: acceso', () => {
    expect(pantallaPara({ cargando: false, sesion: null, perfil: undefined }))
      .toBe(PANTALLAS.ACCESO)
  })

  it('con sesión y sin perfil confirmado: activar', () => {
    expect(pantallaPara({ cargando: false, sesion: SESION, perfil: null }))
      .toBe(PANTALLAS.ACTIVAR)
  })

  it('con sesión y perfil: la app', () => {
    expect(pantallaPara({ cargando: false, sesion: SESION, perfil: PERFIL }))
      .toBe(PANTALLAS.APP)
  })
})

describe('un fallo NO es una respuesta', () => {
  it('perfil desconocido NO manda a activar: manda a cargando', () => {
    // EL BUG DEL 4/09. Al abrir con la sesión guardada, la primera
    // consulta va con el token viejo y falla. Si eso se lee como "no
    // tiene perfil", al entrenador le aparece la pantalla que le pide
    // un código para unirse a un entrenador — en su propia app.
    expect(pantallaPara({ cargando: false, sesion: SESION, perfil: undefined }))
      .toBe(PANTALLAS.CARGANDO)
  })

  it('agotados los reintentos: pantalla de error, tampoco activar', () => {
    expect(pantallaPara({
      cargando: false, sesion: SESION, perfil: undefined, errorPerfil: true
    })).toBe(PANTALLAS.ERROR_PERFIL)
  })

  it('undefined y null NO son lo mismo, y esa es toda la corrección', () => {
    const base = { cargando: false, sesion: SESION }
    expect(pantallaPara({ ...base, perfil: undefined }))
      .not.toBe(pantallaPara({ ...base, perfil: null }))
  })

  it('el error manda aunque ya hubiera un perfil viejo en memoria', () => {
    // Si se pierde la conexión y el perfil deja de poder confirmarse,
    // vale más decirlo que seguir mostrando datos que ya no se pueden
    // verificar.
    expect(pantallaPara({
      cargando: false, sesion: SESION, perfil: PERFIL, errorPerfil: true
    })).toBe(PANTALLAS.ERROR_PERFIL)
  })
})

describe('la sesión manda sobre el perfil', () => {
  it('sin sesión da igual lo que diga el perfil', () => {
    expect(pantallaPara({ cargando: false, sesion: null, perfil: PERFIL }))
      .toBe(PANTALLAS.ACCESO)
    expect(pantallaPara({
      cargando: false, sesion: null, perfil: undefined, errorPerfil: true
    })).toBe(PANTALLAS.ACCESO)
  })
})

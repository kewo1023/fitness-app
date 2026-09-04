import { describe, it, expect } from 'vitest'
import {
  pantallaPara, PANTALLAS, hayQueReintentar, resultadoPerfil, alCambiarSesion,
  hayQueRecargarPerfil, ESPERA_RECARGA_MS
} from './acceso.js'

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

describe('cuándo hay que volver a preguntar por el perfil', () => {
  const M = 3

  it('con error, sí', () => {
    expect(hayQueReintentar({ error: {}, data: null, intento: 0, maximo: M }))
      .toBe(true)
  })

  it('CON CERO FILAS Y SIN ERROR, TAMBIÉN', () => {
    // El bug de la segunda vuelta del 4/09. Las políticas de `perfiles`
    // dicen `id = auth.uid()`; si la consulta sale antes de que el token
    // esté puesto, auth.uid() es nulo, no hay filas, y PostgREST
    // responde 200 con una lista vacía. Sin error. El arreglo anterior
    // solo reintentaba con error, así que este caso pasaba de largo y
    // la app concluía "no tiene perfil".
    expect(hayQueReintentar({ error: null, data: null, intento: 0, maximo: M }))
      .toBe(true)
  })

  it('con una fila, no', () => {
    expect(hayQueReintentar({
      error: null, data: { id: 'abc' }, intento: 0, maximo: M
    })).toBe(false)
  })

  it('agotados los intentos, no', () => {
    expect(hayQueReintentar({ error: {}, data: null, intento: 2, maximo: M }))
      .toBe(false)
  })
})

describe('qué significa el resultado final', () => {
  it('un error deja undefined, nunca null', () => {
    // null afirmaría que no tiene perfil. Un fallo no afirma nada.
    expect(resultadoPerfil({ error: {}, data: null })).toBe(undefined)
  })

  it('vacío tras los reintentos sí es null: no tiene perfil', () => {
    expect(resultadoPerfil({ error: null, data: null })).toBe(null)
  })

  it('con fila devuelve la fila', () => {
    expect(resultadoPerfil({ error: null, data: PERFIL })).toBe(PERFIL)
  })
})

describe('el sobrante: qué pasa cuando cambia la sesión', () => {
  it('sin sesión, perfil null y ya no cargando', () => {
    expect(alCambiarSesion(null, PERFIL))
      .toEqual({ sesion: null, perfil: null, errorPerfil: false, cargando: false })
  })

  it('LLEGA SESIÓN Y EL PERFIL PASA A DESCONOCIDO, NO SE QUEDA EN NULL', () => {
    // EL BUG DE LA TERCERA VUELTA. Supabase avisa primero con sesión
    // nula (dejando perfil=null, cargando=false) y enseguida con la
    // sesión de verdad. Sin esto, en ese instante el estado es
    // "hay sesión + perfil null + no cargando", que es literalmente la
    // pantalla de activación — y ahí estaba el parpadeo.
    const previo = alCambiarSesion(null, PERFIL)          // paso 1
    const ahora = alCambiarSesion(SESION, previo.perfil)  // paso 2

    expect(ahora.perfil).toBe(undefined)
    expect(pantallaPara(ahora)).toBe(PANTALLAS.CARGANDO)
    expect(pantallaPara(ahora)).not.toBe(PANTALLAS.ACTIVAR)
  })

  it('mismo usuario: se conserva el perfil y NO se pone en blanco', () => {
    // Supabase refresca el token cada cierto tiempo y dispara este
    // mismo evento. Sin la excepción, la app se pondría en blanco sola
    // cada hora mientras alguien la está usando.
    const r = alCambiarSesion(SESION, PERFIL)
    expect(r.perfil).toBe(PERFIL)
    expect(r.cargando).toBe(false)
    expect(pantallaPara(r)).toBe(PANTALLAS.APP)
  })

  it('otro usuario: el perfil viejo NO se hereda', () => {
    const otra = { user: { id: 'zzz' } }
    const r = alCambiarSesion(otra, PERFIL)
    expect(r.perfil).toBe(undefined)
    expect(pantallaPara(r)).toBe(PANTALLAS.CARGANDO)
  })

  it('un error viejo no sobrevive al cambio de sesión', () => {
    expect(alCambiarSesion(SESION, PERFIL).errorPerfil).toBe(false)
  })
})

describe('volver a leer el perfil al regresar a la app', () => {
  /* Es el bug del 4/09 con dos teléfonos: la base tenía UNA fila y cada
   * aparato mostraba un perfil distinto, porque el que llevaba horas en
   * segundo plano nunca volvía a preguntar. */

  it('con la app escondida no se gasta una consulta', () => {
    // Nadie está mirando. Al volver se pregunta.
    expect(hayQueRecargarPerfil({
      visible: false, ultimaLectura: 0, ahora: 999999
    })).toBe(false)
  })

  it('si nunca se ha leído, se lee', () => {
    // Cubre el arranque. Sin esto, un `undefined` restado daría NaN y
    // la comparación sería falsa: no leería nunca.
    expect(hayQueRecargarPerfil({
      visible: true, ultimaLectura: undefined, ahora: 1000
    })).toBe(true)
  })

  it('volver a los dos segundos NO recarga', () => {
    // Cambiar a WhatsApp y volver tres veces seguidas no puede ser tres
    // consultas para traer lo mismo.
    expect(hayQueRecargarPerfil({
      visible: true, ultimaLectura: 100000, ahora: 102000
    })).toBe(false)
  })

  it('pasada la espera, sí recarga', () => {
    expect(hayQueRecargarPerfil({
      visible: true, ultimaLectura: 100000, ahora: 100000 + ESPERA_RECARGA_MS
    })).toBe(true)
  })

  it('después de horas en segundo plano, recarga', () => {
    // ES EL CASO DEL BUG. Siete horas con la app abierta detrás, y
    // mientras tanto la cuenta se volvió cliente desde otro aparato.
    const SIETE_HORAS = 7 * 60 * 60 * 1000
    expect(hayQueRecargarPerfil({
      visible: true, ultimaLectura: 0, ahora: SIETE_HORAS
    })).toBe(true)
  })
})

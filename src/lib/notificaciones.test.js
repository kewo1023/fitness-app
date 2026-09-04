import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  estadoDeSoporte, llaveABytes, aFilas, FRANJAS, HORA_POR_DEFECTO
} from './notificaciones.js'

/* =====================================================================
   Pruebas de las notificaciones
   =====================================================================

   Aquí no se prueba que una notificación llegue: eso necesita HTTPS, un
   servicio de push y un celular de verdad, y solo se comprueba con el
   teléfono en la mano.

   Lo que sí se puede fijar es lo que se rompe en silencio:

     - Que a un iPhone sin instalar se le diga cómo instalar, y no que
       "no se puede". Es la mitad de los que van a tocar el botón sin
       que funcione a la primera.
     - Que la llave de VAPID se convierta bien. Falla con un error que
       no dice nada y es la función que más se copia mal.
     - Que las horas que la app PROMETE sean las que la base MANDA.
   ===================================================================== */

/* `llaveABytes` usa `window.atob`, que en Node no existe. Se pone el
 * mínimo en vez de montar un navegador entero: lo que se está probando
 * es la conversión, no el navegador. */
let ventanaPrevia
beforeAll(() => {
  ventanaPrevia = globalThis.window
  globalThis.window = {
    atob: (s) => Buffer.from(s, 'base64').toString('binary')
  }
})
afterAll(() => { globalThis.window = ventanaPrevia })


describe('qué se puede hacer en este navegador', () => {
  it('un Android instalado está listo', () => {
    expect(estadoDeSoporte({
      tieneSW: true, tienePush: true, esIOS: false, instalada: true
    })).toBe('listo')
  })

  it('un Android en el navegador también', () => {
    // En Android no hace falta instalar para recibir notificaciones.
    // Exigirlo cerraría la puerta sin razón.
    expect(estadoDeSoporte({
      tieneSW: true, tienePush: true, esIOS: false, instalada: false
    })).toBe('listo')
  })

  it('un iPhone SIN instalar pide instalación, no dice "no se puede"', () => {
    // ES LA PRUEBA QUE IMPORTA DE TODO EL ARCHIVO.
    //
    // En un iPhone sin instalar el navegador no expone el Push API, así
    // que si se mirara `tienePush` primero, esta persona caería en
    // 'no-soportado' — y la app le diría que no se puede a alguien que
    // está a dos toques de que sí se pueda.
    expect(estadoDeSoporte({
      tieneSW: true, tienePush: false, esIOS: true, instalada: false
    })).toBe('requiere-instalacion')
  })

  it('un iPhone instalado está listo', () => {
    expect(estadoDeSoporte({
      tieneSW: true, tienePush: true, esIOS: true, instalada: true
    })).toBe('listo')
  })

  it('un navegador sin service worker no puede', () => {
    expect(estadoDeSoporte({
      tieneSW: false, tienePush: false, esIOS: false, instalada: false
    })).toBe('no-soportado')
  })

  it('sin saber nada del entorno, no promete nada', () => {
    expect(estadoDeSoporte()).toBe('no-soportado')
    expect(estadoDeSoporte({})).toBe('no-soportado')
  })
})


describe('la llave de VAPID', () => {
  it('convierte una llave normal a bytes', () => {
    // "AAECAwQ=" es base64 de los bytes 0,1,2,3,4.
    expect(Array.from(llaveABytes('AAECAwQ='))).toEqual([0, 1, 2, 3, 4])
  })

  it('le pone el relleno que falta', () => {
    // Las llaves de VAPID viajan SIN el "=" del final. Sin volver a
    // ponerlo, `atob` lanza un error que no explica nada.
    expect(Array.from(llaveABytes('AAECAwQ'))).toEqual([0, 1, 2, 3, 4])
  })

  it('entiende los dos caracteres del base64 url-safe', () => {
    // "-" es "+" y "_" es "/". Una llave real casi siempre trae alguno
    // de los dos, así que esto no es un caso raro: es el caso normal.
    const conGuion = llaveABytes('-_8=')     // 0xFB 0xFF
    expect(Array.from(conGuion)).toEqual([251, 255])
  })

  it('sin llave lo dice claro en vez de reventar raro', () => {
    expect(() => llaveABytes('')).toThrow(/llave/i)
    expect(() => llaveABytes(null)).toThrow(/llave/i)
  })
})


describe('la suscripción, a filas de la tabla', () => {
  const SUSCRIPCION = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'llave-publica', auth: 'secreto' }
  }

  it('separa el endpoint y las dos llaves', () => {
    expect(aFilas(SUSCRIPCION, 'uuid-1')).toEqual({
      cliente_id: 'uuid-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'llave-publica',
      auth: 'secreto'
    })
  })

  it('acepta el objeto del navegador, que trae toJSON', () => {
    const delNavegador = { toJSON: () => SUSCRIPCION }
    expect(aFilas(delNavegador, 'uuid-1').endpoint).toBe(SUSCRIPCION.endpoint)
  })

  it('una suscripción incompleta no se guarda a medias', () => {
    // Guardar una fila sin `auth` deja una suscripción que nunca va a
    // recibir nada, y que además cuenta como "ya está activado" en la
    // pantalla. Es peor que fallar.
    expect(() => aFilas({ endpoint: 'x' }, 'uuid-1')).toThrow()
    expect(() => aFilas({ endpoint: 'x', keys: { p256dh: 'y' } }, 'uuid-1')).toThrow()
    expect(() => aFilas(null, 'uuid-1')).toThrow()
  })
})


describe('las horas que la app promete y las que la base manda', () => {
  /* ESTA PRUEBA CRUZA LA FRONTERA ENTRE EL NAVEGADOR Y LA BASE, y es la
   * única del proyecto que lo hace.
   *
   * La hora vive en dos sitios por necesidad: la base la usa para
   * decidir a quién le escribe, y la app la muestra para que la persona
   * sepa qué está eligiendo. Dos sitios es dos verdades esperando a
   * separarse, y el día que se separen la app promete las 6 y la
   * notificación llega a las 12 — sin que nada falle ni avise.
   *
   * Se lee el SQL y se comparan los números. */
  const sql = readFileSync(
    new URL('../../supabase/10-notificaciones.sql', import.meta.url), 'utf8'
  )

  function horaEnElSql (franja) {
    const m = sql.match(new RegExp(`when '${franja}'\\s+then\\s+(\\d+)`))
    return m ? Number(m[1]) : null
  }

  it.each(FRANJAS)('la franja "$clave" dice $hora en los dos lados', ({ clave, hora }) => {
    expect(horaEnElSql(clave)).toBe(hora)
  })

  it('la hora por defecto coincide con el else del SQL', () => {
    const m = sql.match(/else\s+(\d+)\s+--\s+sin franja/)
    expect(m).not.toBeNull()
    expect(Number(m[1])).toBe(HORA_POR_DEFECTO)
  })

  it('las tres franjas son las que la base acepta', () => {
    // El `check` de la columna. Si se agrega una franja aquí sin
    // agregarla allá, guardar falla con un error de Postgres en la cara
    // del usuario.
    const m = sql.match(/franja_entrenamiento in \(([^)]+)\)/)
    expect(m).not.toBeNull()
    const permitidas = m[1].match(/'([a-z]+)'/g).map(s => s.replace(/'/g, ''))
    expect(permitidas.sort()).toEqual(FRANJAS.map(f => f.clave).sort())
  })
})

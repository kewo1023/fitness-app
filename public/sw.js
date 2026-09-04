/* =====================================================================
   sw.js — el service worker. Corto a propósito.
   =====================================================================

   PARA QUÉ ESTÁ AQUÍ, QUE NO ES LO QUE PARECE.

   Desde Chrome 108 en Android, el service worker YA NO hace falta para
   poder instalar la app: eso lo resuelve solo el manifest. Lo que sí
   sigue dependiendo de él es que Chrome OFREZCA la instalación por su
   cuenta, en vez de que el usuario tenga que ir a buscarla al menú de
   los tres puntos. Ese menú no lo abre nadie que no esté buscándolo.

   Y hay una segunda razón, más grande: las notificaciones push exigen
   un service worker, sin excepción. Es la palanca de retención del
   proyecto y sin este archivo no puede existir.

   DESDE LA FASE 7 YA ESTÁN AQUÍ, al final del archivo: los dos
   manejadores que reciben el mensaje y lo muestran, y el que abre la
   app cuando alguien lo toca. Quién recibe y cuándo lo decide la base
   (`10-notificaciones.sql`); este archivo solo pinta lo que llegue.

   =====================================================================
   LO QUE ESTE ARCHIVO NO HACE, Y ES LA PARTE IMPORTANTE
   =====================================================================

   NO CACHEA NADA DE SUPABASE. Ni una respuesta. Por ahí viajan datos
   de salud de terceros, y la Ley 1581 le da al titular el derecho a
   que sus datos se supriman: una copia guardada en el disco de un
   celular queda FUERA de ese borrado y nadie sabría que existe. El
   filtro es `url.origin !== location.origin`, y por eso está escrito
   como una lista de lo que SÍ se guarda en vez de una de lo que no —
   una lista de exclusiones se olvida de lo que todavía no existe.

   NO CACHEA EL HTML. Guardar la página de entrada es la forma más
   común de que alguien se quede pegado en una versión vieja de la app
   después de un despliegue, sin manera de salir salvo borrando los
   datos del navegador. El HTML siempre se pide a la red.

   NO SIRVE PARA USAR LA APP SIN INTERNET. Eso es la Fase 8 y es un
   diseño distinto: hay que decidir qué se puede leer sin conexión, qué
   pasa con lo que se completó sin señal, y cómo se sincroniza después.
   Nada de eso se resuelve de contrabando en un archivo de arranque.

   ===================================================================== */

/* El número entra en el nombre del almacén. SÚBELO cada vez que cambie
 * algo de este archivo: al cambiar el nombre, el `activate` de abajo
 * borra el almacén anterior entero. Es el interruptor de "empezar de
 * cero" cuando una caché quedó mal. */
const CACHE = 'entrena-estaticos-v2'

/* Lo único que se guarda. Son los archivos que Vite publica con un
 * hash en el nombre (`app-9f2c1b.js`), y ese detalle es lo que hace
 * segura la estrategia de "primero la caché": si el archivo cambia,
 * cambia su nombre, así que pedir el nombre viejo nunca puede devolver
 * contenido equivocado. Un archivo sin hash —el HTML— no tiene esa
 * garantía, y por eso no está en esta lista. */
const GUARDABLES = ['script', 'style', 'font', 'image']

self.addEventListener('install', () => {
  /* Sin precarga: no hay una lista de archivos que escribir a mano,
   * porque los nombres los inventa Vite en cada build. Se van
   * guardando solos a medida que la app los pide.
   *
   * skipWaiting hace que esta versión tome el control sin esperar a
   * que se cierren las pestañas viejas. Es seguro justamente porque
   * los nombres llevan hash: la página que ya está abierta sigue
   * pidiendo los suyos y los encuentra. */
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    // Borrar los almacenes de versiones anteriores. Sin esto, cada
    // cambio de CACHE dejaría el anterior ocupando espacio para
    // siempre en el celular del cliente.
    const nombres = await caches.keys()
    await Promise.all(
      nombres.filter(n => n.startsWith('entrena-') && n !== CACHE)
             .map(n => caches.delete(n))
    )
    // Tomar el control de las pestañas que ya estaban abiertas cuando
    // este service worker se instaló. Sin esto no haría nada hasta la
    // siguiente vez que se abriera la app.
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request

  // Solo lecturas. Un POST o un PATCH no se cachea nunca: son las
  // peticiones que CAMBIAN algo, y responderlas desde el disco sería
  // decirle al usuario que se guardó algo que no se guardó.
  if (peticion.method !== 'GET') return

  const url = new URL(peticion.url)

  // Todo lo que no salga de este mismo dominio se deja pasar sin
  // tocarlo. Aquí es donde queda afuera Supabase. Ver el comentario
  // largo de arriba: no es una optimización, es la regla.
  if (url.origin !== location.origin) return

  // El HTML tampoco. `mode === 'navigate'` es cómo el navegador marca
  // "voy a abrir una página", que es exactamente la petición que no se
  // debe guardar.
  if (peticion.mode === 'navigate') return

  if (!GUARDABLES.includes(peticion.destination)) return

  /* PRIMERO LA CACHÉ, y si no está, la red y se guarda una copia.
   *
   * En Excel sería la diferencia entre una fórmula que consulta otro
   * libro cada vez que abres el archivo y una que ya tiene el valor
   * pegado: si el valor no puede cambiar sin cambiar de nombre, pegarlo
   * no tiene ningún riesgo y se abre al instante. */
  evento.respondWith((async () => {
    const guardado = await caches.match(peticion)
    if (guardado) return guardado

    const respuesta = await fetch(peticion)

    /* Solo se guarda una respuesta completa y correcta. `status 200`
     * descarta los errores; `type basic` descarta las respuestas
     * opacas, que son las que el navegador entrega sin dejar leer si
     * salieron bien o mal — guardar una es guardar un posible error
     * para siempre. */
    if (respuesta.status === 200 && respuesta.type === 'basic') {
      const copia = respuesta.clone()
      const almacen = await caches.open(CACHE)
      // Sin await: que el usuario no espere a que se escriba el disco
      // para ver la imagen que ya llegó.
      almacen.put(peticion, copia)
    }

    return respuesta
  })())
})


/* =====================================================================
   LAS NOTIFICACIONES (Fase 7)
   =====================================================================

   Estos dos manejadores son lo único de la app que corre con la app
   CERRADA. El navegador despierta este archivo, le entrega el mensaje y
   lo vuelve a dormir; no hay pantalla, no hay React y no hay sesión de
   Supabase. De ahí sale todo lo raro de aquí abajo.

   POR ESO EL MENSAJE VIENE HECHO. La Edge Function manda el título y el
   cuerpo ya escritos, en vez de mandar un identificador y que este
   archivo consulte la base. Consultar exigiría credenciales guardadas
   en el celular, y una notificación que necesita red para poder verse
   es una notificación que no se ve cuando hay mala señal — que es justo
   cuando la app tiene que seguir funcionando.
   ===================================================================== */

self.addEventListener('push', (evento) => {
  /* TODO ESTO VA DENTRO DE UN TRY, y no por costumbre.
   *
   * Un push sin datos es normal: algunos servicios mandan uno vacío
   * para comprobar que la suscripción sigue viva. Y en varios
   * navegadores, si este manejador lanza una excepción sin mostrar
   * ninguna notificación, el navegador muestra una suya que dice algo
   * como "Este sitio se actualizó en segundo plano" — un mensaje que
   * nadie escribió, en el idioma del navegador, en la pantalla de un
   * cliente. Es peor que no mandar nada. */
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch (_) {
    datos = {}
  }

  const titulo = datos.titulo || 'Entrena'
  const opciones = {
    body: datos.cuerpo || 'Tienes algo pendiente en la app.',
    icon: '/iconos/icono-192.png',
    badge: '/iconos/icono-192.png',
    lang: 'es-CO',

    /* `tag` hace que una notificación nueva REEMPLACE a la anterior del
     * mismo tipo en vez de apilarse. Si alguien no abre la app tres
     * días, tiene que encontrar un aviso, no tres: una pila de
     * recordatorios viejos es lo que hace que se apaguen las
     * notificaciones y eso no se recupera. */
    tag: 'entrena-recordatorio',
    renotify: true,

    /* Sin vibración ni sonido insistente: es un recordatorio, no una
     * urgencia. `requireInteraction` queda en false (el valor de
     * fábrica) a propósito — una notificación que no se va sola hasta
     * que la toques es la que la gente aprende a odiar. */
    data: { url: datos.url || '/' }
  }

  /* `waitUntil` mantiene vivo el service worker hasta que la promesa
   * termine. Sin él, el navegador lo puede dormir antes de que la
   * notificación llegue a mostrarse. */
  evento.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()

  const destino = (evento.notification.data && evento.notification.data.url) || '/'

  evento.waitUntil((async () => {
    /* PRIMERO SE BUSCA UNA VENTANA YA ABIERTA. Abrir una nueva cada vez
     * deja al usuario con tres copias de la app y la sesión repetida en
     * cada una. Si ya hay una, se le da el foco y se la lleva a donde
     * corresponde.
     *
     * `includeUncontrolled` es necesario: una pestaña que se abrió
     * antes de que este service worker tomara el control no aparece en
     * la lista sin esa opción, y es exactamente el caso de alguien que
     * dejó la app abierta desde ayer. */
    const ventanas = await self.clients.matchAll({
      type: 'window', includeUncontrolled: true
    })

    for (const ventana of ventanas) {
      if ('focus' in ventana) {
        if ('navigate' in ventana && destino !== '/') await ventana.navigate(destino)
        return ventana.focus()
      }
    }

    if (self.clients.openWindow) return self.clients.openWindow(destino)
  })())
})

# Bitácora — app de entrenamiento (nombre pendiente)

Archivo vivo. Se lee al abrir sesión y se actualiza al cerrarla. Si algo de
aquí se va a contradecir, **se frena y se dice antes de ejecutar.**

---

## Decisiones tomadas

**2026-08-31 — El proyecto arranca**
App de entrenamiento para un entrenador y sus clientes. Referencia: silBe
(`id1631277320`). Ritmo previsto: 6–10 h/semana.

**2026-08-31 — Dos admin, no uno**
Hay dos administradores con acceso al panel. El entrenador sube su propio
contenido sin depender del desarrollo. Consecuencia de diseño: todo lo
que el entrenador vaya a tocar necesita explicación en pantalla, no en un
documento que no va a leer.

**2026-08-31 — Stack: React 18 + Vite 5 + CSS plano + Supabase**
Stack ya probado en producción en otro proyecto. En uno de ~94 horas el
riesgo no es la tecnología: es quedarse sin gasolina en la semana 7.
Descartados: React Native y Flutter (rehacer todo en un stack nuevo),
Next.js (no necesita render en servidor), Firebase (NoSQL, no aporta),
Tailwind (ya descartado antes).

**2026-08-31 — Video en Bunny Stream, no en Supabase Storage**
Supabase da 1 GB gratis (se acaba en ~130 clips de 30 s) y no transcodifica.
Bunny transcodifica y sirve HLS solo, por ~$1–2/mes con 200 clips y 20
clientes. Descartados: YouTube oculto (marca ajena y recomendados encima de
la app) y Cloudflare Stream ($5 de mínimo, cobra por minuto).

**2026-08-31 — Racha semanal, no diaria**
Una racha diaria castiga al usuario por descansar, que es lo contrario de lo
que un entrenador quiere. Va "3 de 4 entrenamientos de la semana". El XP se
da por sesión **completada**, nunca por tiempo dentro de la app.

**2026-08-31 — La analítica va en SQL, no en JavaScript**
Vistas y funciones en Postgres para adherencia, retención y rachas. Es más
difícil que hacerlo con bucles en el navegador, y es exactamente lo que se
modelo de datos se gana su valor. No se sacrifica cuando falte tiempo.

---

**2026-09-01 — El entrenador y el 95% de sus clientes están en Colombia**
Se supo después de la primera hoja de ruta y la reescribió entera. Las cuatro
decisiones que se dieron vuelta están abajo.

**2026-09-01 — Android es el dispositivo de referencia, no el iPhone**
83,28% contra 16,72% en Colombia (Statcounter, julio 2026). Cada fase se
prueba en un Android real antes que en un iPhone. El emulador no
sirve: no reproduce datos móviles lentos, que es la condición real de uso.

**2026-09-01 — Entran las notificaciones push**
Estaban descartadas por las limitaciones de iOS. En Android una PWA instalada
las recibe nativamente, así que vuelven al plan: recordatorio del
entrenamiento del día y aviso cuando la racha está por romperse, calculados
en hora de Bogotá. Es la palanca de retención más grande del proyecto y no
cuesta nada.

**2026-09-01 — Google Play antes que App Store**
La cuenta de Google Play es un pago único y cubre el 83% del público; la de
Apple es anual y cubre el 17%. Las dos van con Capacitor sobre la misma PWA, así que no
se reescribe nada. La cuenta de desarrollador va a nombre del entrenador, que
es el dueño del contenido (guía 4.2.6 de Apple).

**2026-09-01 — Alcance de nutrición recortado: solo contenido genérico**
La Ley 73 de 1979 protege el título de nutricionista-dietista en Colombia
(título + ReTHUS + tarjeta de COLNUD), y el plan alimentario individual es
función reservada. Allá el ejercicio ilegal de una profesión de la salud es
materia penal. La Fase 6 pasa de 10 a 8 horas: recetas y planes genéricos por
objetivo, iguales para todos, sin asignación por cliente y sin cálculo por
persona. Si aparece un nutricionista con tarjeta que firme el contenido, la
personalización vuelve al alcance y se construye aparte.

**2026-09-01 — La Ley 1581 obliga a diseño, no solo a un PDF**
Los datos de salud son sensibles: autorización explícita, finalidades
separadas, y hay que informar que responder esas preguntas es **facultativo**
(los campos van opcionales de verdad). Más política de tratamiento publicada
y canal de habeas data con plazos (consulta 10 días hábiles, reclamo 15).
Por eso la Fase 2 crece de 10 a 12 horas e incorpora la pantalla "Mis datos"
(descargar, corregir, eliminar).

**2026-09-01 — Alojar en Estados Unidos es legal, punto cerrado**
La SIC declaró a EE. UU. país con nivel adecuado de protección (Circular
Externa 005 de 2017), cubriendo todo el territorio y no solo empresas
certificadas. Supabase, Vercel y Bunny quedan dentro de la ley. Solo hay que
declararlo en la política de tratamiento. **No volver a abrir este tema.**

**2026-09-01 — No hay que registrar nada ante la SIC**
El RNBD solo obliga a sociedades y entidades sin ánimo de lucro con activos
sobre 100.000 UVT, y a entidades públicas. Las personas naturales no están.
Ojo con la trampa: no estar obligado a registrar **no exime** de cumplir la
Ley 1581.

**2026-09-01 — Supabase en `us-east-1`**
Mejor latencia hacia Colombia que São Paulo, que en ruta de red queda más
lejos de lo que sugiere el mapa. Se mide en la Fase 2 antes de darlo por
bueno.

**2026-09-01 — Unidades y formato quedan fijados en la Fase 1**
Kilos, centímetros, fechas `dd/mm/aaaa`, español de Colombia. Cambiar
unidades a mitad de camino corrompe el historial de progreso.

**2026-09-01 — La zona horaria de la app es `America/Bogota`**
Se guarda en UTC y se convierte a Bogotá para decidir qué día es. Una sola
función `hoyBogota()`, usada en toda la app. El desarrollo se hace desde una zona con
horario de verano y Bogotá no lo tiene: dos veces al año la diferencia cambia
en una hora, y si esto se hace mal se rompen rachas que el usuario sí
completó. Es la trampa de `fechas.js` de `nosotros-app`, elevada.

**2026-09-01 — Fase 1: sin fuentes de internet, la del sistema**
No se carga ninguna fuente de Google Fonts. Una fuente son entre 30 y 100 KB
que el cliente descarga con datos móviles antes de ver la primera letra, y en
Colombia mucha gente abre esto con plan limitado. Se usa la del sistema
(Roboto en Android, San Francisco en iPhone): pesa cero y hace que la app se
sienta parte del celular.

**2026-09-01 — Paleta: verde profundo, y el naranja en UN solo lugar**
Fondo hueso cálido (#FBFAF8), tinta casi negra con una pizca de verde, acento
verde (#0B6E4F) y un naranja de señal (#E4572E) reservado **solo para la
racha**. Si el naranja aparece en tres sitios a la vez deja de significar
algo. Todo vive en `theme.css`; cambiarlo es cambiar seis valores.

**2026-09-01 — Cinco pestañas: Hoy, Programas, Progreso, Recetas, Perfil**
La pantalla de entrada es "Hoy" y responde una sola pregunta: qué hago hoy.
No ofrece opciones, ofrece EL entrenamiento del día. Es la diferencia entre
una app que se usa y un catálogo que se abre una vez.

**2026-09-01 — Sin botón de tema claro/oscuro**
El tema entra solo por la preferencia del sistema operativo. Un botón más es
una decisión más para el usuario, y nadie cambia de tema dentro de una app de
entrenamiento.

**2026-09-01 — `fechas.js` y sus pruebas se escribieron en la Fase 1, no en la 2**
La bitácora decía Vitest desde la Fase 2. Se adelantó solo para `fechas.js`:
es la función que puede romper rachas en silencio, y escribir la prueba
después de tener código encima habría costado más. 14 pruebas, incluida la de
las 8 p.m. en Bogotá (que en UTC ya es el día siguiente).

**2026-09-01 — RESUELTO: la certificación de entrenador deportivo está en regla**
El requisito de la Ley 2210 de 2022 (Registro Único de Entrenadores
Deportivos) está cubierto. Era una de las dos preguntas bloqueantes del
cuestionario y deja de ser un riesgo abierto para el proyecto. **No volver a
plantear el tema** salvo que el entrenador avise de un cambio.

**2026-09-01 — CAMBIO DE RUMBO: no se publica en tiendas por ahora**
Contradice a propósito la decisión previa de "Google Play antes que App
Store". Se decidió no pagar cuenta de desarrollador hasta que la app sea
realmente útil. Razón: la tienda no mejora la app, solo la distribuye.

La instalación va por el navegador: se abre la URL y se agrega a la pantalla
de inicio. En Android eso funciona *mejor* que en iPhone, así que se pierde
poco.

Consecuencias concretas:
- La **Fase 9 se aparca**, no se elimina. Capacitor sigue siendo el camino y
  no cuesta nada mantener la puerta abierta: nada de lógica exclusiva del
  navegador, y el video fuera de Supabase Storage. Eso ya se está cumpliendo.
- La **Fase 8 sube de importancia**: el manifest, los iconos y el
  `PASOS-FASE-8.md` de instalación dejan de ser un detalle y pasan a ser la
  única puerta de entrada a la app.
- Las **notificaciones push siguen en pie**. No dependen de la tienda: una
  PWA instalada en Android las recibe igual.

**2026-09-01 — LLEGARON LAS RESPUESTAS DEL ENTRENADOR**
Las 14 preguntas clave contestadas. El esquema queda cerrado en
`supabase/01-esquema.sql` (el borrador se borró). Lo que definieron:

**Cada cliente tiene su propia rutina.** Es la respuesta que más cambió el
diseño. Se cae el modelo de "catálogo de programas al que la gente se
inscribe": el plan cuelga del cliente, no al revés. Tablas `planes` y
`plan_dias`, una por persona, editables sin tocar a nadie más.

**Y por eso entran las PLANTILLAS.** Con 6 a 15 clientes, armar cada plan de
4 semanas desde cero es más lento que el PDF que usa hoy — la app le haría
perder tiempo en vez de ahorrárselo. La plantilla es el molde que copia y
ajusta por cliente. Al copiarla queda independiente: si después cambia el
molde, los planes ya entregados no se mueven. Nadie quiere que a un cliente
le cambie sola la rutina de ayer.

**Ciclos de 4 semanas.** `planes.semanas` por defecto 4.

**Los días a la semana VARÍAN por cliente.** La meta de la racha no puede ser
una constante en el código: vive en `planes.meta_semanal`, una por persona.
Corrige el diseño de gamificación que asumía 4 para todos.

**Sí registra peso y repeticiones por serie.** `series_registradas` se queda y
la Fase 5 mantiene sus 10 horas. Consecuencia de diseño: esa pantalla se usa
con el celular en la mano, sudado y a media serie. Tiene que funcionar a un
toque.

**Arranca con imágenes, no con video.** Tiene algunos videos pero prefiere ir
reemplazando poco a poco. `ejercicios.video_id` es opcional y la app se tiene
que ver bien sin él. Consecuencia: **la cuenta de Bunny se aplaza**. Las
imágenes van a Supabase Storage (1 GB sobra para fotos comprimidas); Bunny
entra cuando haya video de verdad. Se ahorra la configuración y el costo del
primer mes.

**80 a 150 ejercicios.** A ese volumen, cargarlos uno por uno en un formulario
es media tarde perdida. En la Fase 3 va también una carga masiva desde hoja
de cálculo.

**Los agrupa por dos ejes, no por uno:** tipo de movimiento Y grupo muscular.
Van las dos columnas (`grupo` y `movimiento`), no una sola inventada.

**Casa y gimnasio mezclados.** El catálogo de `equipo` cubre los dos mundos.

**Clientes con Android e iPhone mezclados.** Matiza el "Android primero": se
sigue probando primero en Android, pero el iPhone no puede quedar de último.
Y como NO van a la tienda, la instalación desde el navegador en iPhone es la
puerta más incómoda de las dos: el `PASOS-FASE-8.md` necesita las dos rutas
con capturas.

**No se entera de si sus clientes entrenan; pregunta 2 o 3 veces por semana.**
Confirma que el panel del entrenador es la función que más le sirve a él.
También confirma que el trabajo de la Fase 5 no es decorativo.

**Hoy entrega las rutinas en PDF.** Vale tenerlo presente como vara de medir:
un PDF abre sin internet y nunca falla. Ver el riesgo del caché offline en el
siguiente paso.

**Conoce a un nutricionista con tarjeta.** Queda la puerta abierta, no el
alcance: la personalización de comida vuelve solo si esa persona entra al
proyecto y firma el contenido por escrito. Hasta entonces la Fase 6 sigue
genérica.

**Sin nombre todavía.** Provisional: "Entrena" (es lo que está en el
`<title>`). Se cambia cuando él decida.

**2026-09-01 — Horas revisadas con las respuestas**
Fase 3 baja de 12 a 10 h (imágenes en vez de video, sin configurar Bunny).
Fase 4 sube de 16 a 20 h (planes por cliente + plantillas + la función de
clonar). El total pasa de ~94 a ~98 h.

---

**2026-09-01 — Tres niveles de decoración en vez de dos versiones de la app**
Se planteó mantener dos versiones, una para gama alta y otra para gama baja.
Se descartó: cada función habría que construirla, probarla y arreglarla dos
veces, y con 6–10 h/semana eso no es el doble de trabajo, es el punto donde
el proyecto se abandona. Y si las versiones difieren en algo que no sea
decoración, aparece *"mi amiga tiene un botón que yo no tengo"*.

En su lugar, una sola app con tres niveles. `src/lib/dispositivo.js` mira RAM
y núcleos al arrancar y escribe `data-nivel` en el `<html>`; cada nivel
redefine tres variables en `theme.css` (`--desenfoque`, `--entrada`,
`--sombra`) y no hay una sola regla de estilo duplicada.

| | alto | medio | bajo |
|---|---|---|---|
| desenfoque | 14px | 8px | sin filtro |
| entrada | 190ms con escala | 150ms solo fundido | 110ms |
| sombra | completa | reducida | plana |

**La regla que no se rompe: el nivel cambia SOLO cómo se ve la app.** Nunca
qué se puede hacer, ni el orden, ni los textos. Está como regla 11 en
`CLAUDE.md`.

Dos detalles que parecen menores y no lo son: en gama baja se apaga el filtro
entero en vez de dejarlo en `blur(0px)`, porque un `backdrop-filter` activo
con radio cero igual crea la capa y cuesta lo mismo; y en gama media se quita
la escala de la transición, porque animar dos propiedades cuesta el doble que
animar una y a 150 ms la escala no se percibe.

Pendiente para la Fase 8: el medidor de cuadros por segundo. `deviceMemory` y
`hardwareConcurrency` son señales crudas. Por eso `nivelDetectado()` está
separada de `aplicarNivel()`.

**2026-09-01 — El repositorio se recreó desde cero**
El historial original contenía datos personales del autor que no debían
estar en un repo público. Editar los archivos no bastaba: `git push --force` saca el commit de
la rama pero GitHub conserva el objeto, y se comprobó que seguía accesible
por su SHA. Se borró el repositorio y se creó de nuevo con **un solo commit
limpio**. Verificado después: la API de GitHub responde `No commit found` al
SHA viejo.

De ahí salió la regla de `CONTEXTO-LOCAL.md`: todo lo que describa a una
persona y no al software vive fuera de git. `BITACORA.md` e `IDEAS.md` sí se
publican, pero escritos sobre el software.

Consecuencia operativa: los despliegues anteriores de Vercel quedaron
huérfanos y **"Redeploy" sobre ellos siempre va a fallar** con "The provided
GitHub repository can't be found" — buscan un commit que ya no existe. Un
despliegue nuevo solo lo dispara un push.

**2026-09-01 — Fase 1 cerrada: publicada**
Repo público en `github.com/kewo1023/fitness-app`, en línea en
`https://fitness-app-ivory-mu.vercel.app`. Cada push a `main` republica sola.

El repo es público, así que todo el contexto personal y de negocio vive en
`CLAUDE.local.md`, fuera de git. El PDF del cuestionario también quedó fuera.
Regla: lo que no deba leer un tercero no entra al historial, porque el
historial de git no se limpia después.

**Único pendiente de la Fase 1:** verla en un Android real. En iPhone y en el
navegador a 375×812 y 393×851 se ve bien, pero el público es Android. Hay que
sentir si el vidrio de la barra va a tirones al cambiar de pestaña haciendo
scroll; si va mal, se sube el umbral de `nivelDetectado()`. No bloquea la
Fase 2.

**2026-09-01 — El proyecto salió de una carpeta sincronizada por iCloud**
iCloud sincronizando un repo ya había roto git antes (`unable to map index
file`). Efecto medible al mover: el build pasó de 30 s a 343 ms. **No devolver
el proyecto a una carpeta que iCloud sincronice.**

**2026-09-01 — Las ideas de diseño se dicen apenas aparecen, se ejecutan por lotes**
Se decidió decirlas apenas aparecen y anotarlas en `IDEAS.md`, separadas entre las que tocan estructura o flujo
(se atienden ya, porque cambian qué se construye) y las de superficie (se
acumulan). Cada idea se anota con su **porqué**: la razón se olvida antes que
la idea.

**2026-09-01 — Paleta nueva: greige, oliva y cobre**
Se revisaron las capturas reales de silBe antes de decidir. Lo que se copia
de ella: fondo greige cálido en vez de blanco, tinta cacao en vez de negro,
acento desaturado, píldora tintada en la pestaña activa y mucho aire. Lo que
cambia: el rosa palo es la firma de esa marca y el público de esta app es
mixto, así que el acento es **oliva** (`#5A6B45`) y la racha **cobre**
(`#B26234`). Se mantiene la regla de un solo lugar que grita.

**2026-09-01 — Vidrio en la barra, calibrado para Android de gama media**
`backdrop-filter` es el efecto más caro de CSS y el público es Android de
gama media y baja. Cuatro restricciones que NO se pueden relajar sin volver
a medir en un celular real:

1. **El desenfoque va solo en la barra fija** (58 px de alto). Nunca sobre
   contenido que hace scroll: eso obliga a recalcular la capa en cada cuadro.
2. **Radio 14 px, no 24.** El costo crece con el radio y por encima de ~15 px
   se nota más en el rendimiento que en la pantalla.
3. **El desenfoque nunca se anima.** Cambiar el valor de un `backdrop-filter`
   recalcula la capa entera.
4. **Las transiciones usan solo `opacity` y `transform`.** Son las dos
   propiedades que la tarjeta gráfica resuelve sin rehacer el diseño de la
   página.

Además hay una puerta de salida automática: `src/lib/dispositivo.js` mira
`deviceMemory` y `hardwareConcurrency` al arrancar y escribe `data-glass` en
el `<html>`. Con 4 GB o menos, o 4 núcleos o menos, **no hay vidrio**: barra
sólida y la animación se acorta de 190 ms a 110 ms. Se decide una sola vez al
arrancar, no en cada cuadro.

Duración de entrada: 190 ms. En un Android de gama media una transición de
400 ms no se lee como elegante, se lee como que la app va lenta.

**Falta medirlo en el Android real.** Si va a tirones, se cae el desenfoque y
queda la transición sola.

**2026-09-01 — SÍ va el caché offline (aprobado)**
La app tiene que funcionar sin internet, no solo sincronizar cuando lo haya.
Se guarda en el celular la rutina de la semana en curso con las imágenes de
sus ejercicios, y lo que el cliente registre (peso, reps) se encola y se
sincroniza al recuperar conexión. **Sin señal la app se usa igual**, no se
bloquea ni avisa que no hay internet.

Contradice la decisión de `nosotros-app` de no montar service worker, y con
razón: allá todo lo que se mostraba vivía en Supabase y sin internet no había
nada que ver. Aquí la rutina de la semana es poca información, cambia poco, y
el momento en que se necesita —el gimnasio— es el peor en cobertura. Compite
contra un PDF, que abre sin señal y nunca falla.

Va en la Fase 8, ~4 h. Detalle abajo.

---

### Detalle del caché offline (Fase 8)

- **Se guarda:** el plan de la semana en curso, las rutinas de esos días, sus
  ejercicios con indicaciones, y las imágenes. No el historial completo ni el
  catálogo entero.
- **Se encola:** sesiones y `series_registradas` creadas sin conexión. Cada
  una lleva su `iniciada_en` real del momento, no la de cuando sincronizó —
  si no, el entrenamiento del martes en la noche aparecería el miércoles.
- **Conflictos:** no hay. Nadie más escribe las sesiones de un cliente, así
  que la cola solo inserta. Es la razón por la que esto cuesta 4 horas y no
  20.
- **Lo que NO funciona sin señal, y la app lo dice sin drama:** ver otro
  cliente, cambiar de plan, cargar contenido nuevo.

---

---

**2026-09-01 — El techo deja de ser 15 clientes**
Hasta ahora todo se dimensionó para 6–15 personas. El objetivo real es que
la herramienta le permita al entrenador llegar a más, así que las decisiones
que cuestan lo mismo hoy y son caras después se toman pensando en el número
grande. Concretamente:

- Toda política de RLS se escribe `(select auth.uid())` y `(select
  es_admin())`, envueltas. Envueltas, Postgres las resuelve una vez por
  consulta; sueltas, una vez por fila. Con 15 clientes da igual; con
  300.000 series registradas es la diferencia entre 40 ms y veinte segundos.
- Cada columna que aparece en una política lleva índice, porque una política
  es un `WHERE` invisible pegado a todas las consultas de esa tabla.
- Las invitaciones se crean por lote (`crear_invitacion(20)`), no de a una.
- Los códigos pasan a 10 caracteres de un alfabeto de 32 sin caracteres
  ambiguos, generados con `gen_random_uuid()` y no con `random()`. Con 15
  clientes nadie los adivina; con la app pública, alguien lo intenta.

**Lo que NO se construyó: multi-entrenador.** Es otro producto —cada
entrenador con su biblioteca y sus clientes— y arrancarlo ahora frena el
proyecto por un caso que no existe. Lo que sí se hizo es la parte barata:
`perfiles.entrenador_id`, que se llena al canjear la invitación y que
ninguna política usa todavía. Sin esa columna, el día que entre un segundo
entrenador tocaría adivinar por fechas qué cliente era de quién.

**2026-09-01 — El perfil lo crea la invitación, no un trigger**
Lo normal en Supabase es un trigger sobre `auth.users` que crea el perfil al
registrarse. Se descartó: con eso, cualquiera que se registre entra a la
base y el código de invitación queda de adorno.

Va al revés. **Estar autenticado y tener perfil son cosas distintas.**
Registrarse te da lo primero; solo `vincular_con_codigo` te da lo segundo,
después de validar el código. Sin fila en `perfiles`, todas las políticas te
dejan ver exactamente nada.

Consecuencias operativas:
- El registro en Supabase queda ABIERTO y la confirmación de correo APAGADA
  (el correo integrado manda 2 mensajes por hora, así que pedir confirmación
  es pedirle al cliente que espere media hora). Lo que valida al cliente es
  el código, no el correo.
- Los dos admin no tienen quien les cree el perfil, así que se les inserta a
  mano una sola vez. El paso 6 del documento de pasos decía `update perfiles
  set rol='admin'` y habría respondido `UPDATE 0`: ese perfil no existe
  todavía. Corregido a un `insert`.

**2026-09-01 — El XP lo da la base, con dos cerraduras**
Un trigger sobre `sesiones` suma el XP al pasar a completada, y solo en el
cambio. Además, un permiso por columna (`grant update (nombre, alias)`)
impide escribir `perfiles.xp` desde el navegador: RLS decide qué FILAS se
tocan, no qué COLUMNAS, y sin eso el cliente podía ponerse el XP que
quisiera desde la consola.

Efecto lateral que hay que tener presente: eso aplica también al entrenador,
porque desde la app él también entra como `authenticated`. Cambiar el rol de
alguien se hace desde el SQL Editor, a conciencia. Es deliberado.

**2026-09-01 — Habeas data implementado como dos funciones**
`mis_datos()` devuelve todo lo que la app sabe de quien pregunta, en un solo
objeto. `eliminar_mi_cuenta()` borra la cuenta de acceso y todo cae en
cascada. El plazo legal de 10 días hábiles para responder una consulta pasa
a ser un segundo, y no depende de que alguien revise un buzón. Las dos son
`security definer` con comprobación de quién llama, y `mis_datos()` no
recibe parámetros a propósito: no se puede pedir "los datos de otro".

**2026-09-01 — Eran 19 tablas, no 16**
El número estaba mal en `CLAUDE.md`, en `BITACORA.md` y en
`PASOS-FASE-2.md`. Corregido en los tres.

**2026-09-01 — Nombres únicos en la biblioteca**
`ejercicios`, `rutinas`, `plantillas` y `recetas` llevan índice único por
nombre. Dos ejercicios llamados igual no son un caso raro que haya que
permitir: son un error de captura, y con 80–150 ejercicios cargados desde
una hoja de cálculo (Fase 3) va a pasar. Además es lo que permite volver a
correr una carga que se cayó a la mitad sin duplicar nada.

**2026-09-01 — El SQL se verifica antes de pegarlo en Supabase**
Los cuatro archivos se parsean con el parser real de Postgres (`pglast`,
que usa `libpg_query`) antes de darlos por buenos: 162 sentencias y 7
cuerpos PL/pgSQL. Se comprobó además con una prueba negativa que el
validador sí detecta errores. **No sustituye correrlo**: parsear dice que la
sintaxis está bien, no que las tablas existan ni que las políticas hagan lo
que uno cree. Eso lo dice la prueba de suplantación del paso 8.

---

**2026-09-01 — LA APP SE ABRE AL PÚBLICO: entra el rol `visitante`**
Cambia lo que es la app. Hasta ahora solo servía para gente que el
entrenador YA había conseguido; el código de invitación era la única
puerta y detrás no había nada. Ahora hay tres roles:

| | visitante | cliente | admin |
|---|---|---|---|
| Catálogo de ejercicios | sí | sí | sí |
| Rutinas | solo las públicas | todas | todas |
| Recetas | solo las públicas | todas | todas |
| Plan, progreso, rachas | no | sí | — |
| Retos | no | sí | sí |
| Plantillas | no | no | sí |

**El criterio del corte: se regala la BIBLIOTECA, se cobra la
PROGRAMACIÓN.** El catálogo de ejercicios con sus indicaciones está en
YouTube gratis, así que esconderlo no protege nada y sí espanta al que
llega. Lo que vale es qué haces tú, en qué orden y por cuánto tiempo
según cómo estás. Por eso el plan nunca es público.

Se hizo AHORA y no después por la misma razón que `entrenador_id`:
cambiar el modelo de acceso con clientes reales ya dentro obliga a migrar
perfiles en vivo. Con la base vacía son cuatro archivos.

Resultó más barato de lo previsto porque las políticas del archivo 02 ya
separaban contenido de dato personal. Lo que se agregó: el valor
`visitante` en `perfiles.rol` (que además pasa a ser el default, por
menor privilegio), las banderas `rutinas.publica` y `recetas.publica`, la
función `es_cliente()` y `crear_perfil_visitante()`.

`vincular_con_codigo` cambió de trabajo: antes CREABA el perfil, ahora
ASCIENDE al visitante a cliente (y lo crea si no existía, para quien
recibe el código sin haber entrado nunca).

**Trampa que se evitó:** `rutina_ejercicios` también tuvo que cerrarse. Si
se quedaba abierta, el visitante no vería la rutina pero sí su contenido
consultando esa tabla directo — que es todo lo que hay que ver. Proteger
la tabla de arriba y olvidar la de abajo es el error clásico.

**Lo que NO se construyó, y por qué:**
- **Chat con el entrenador dentro de la app.** Se reemplaza por un enlace
  `wa.me` visible solo para clientes. Él ya entrega las rutinas por
  WhatsApp; un chat propio le daría DOS bandejas y va a olvidar una, y un
  cliente que escribe y no recibe respuesta queda peor que sin botón.
  20 minutos contra ~15 horas, y de paso su número queda protegido de los
  desconocidos. Va en la Fase 4.
- **Nutrición individual** (% del objetivo diario, proteína por kg, armar
  platos, foto → calorías). Es exactamente lo que prohíbe la Ley 73 de
  1979: cualquier número que cambie según el peso o la meta de UNA
  persona es plan alimentario individual. Lo que sí entra en la Fase 6
  son cinco columnas de macros en `recetas`, iguales para todos, con los
  valores puestos por el entrenador o el nutricionista — **nunca
  inventados por nosotros**. El resto sigue esperando a que el
  nutricionista con tarjeta firme.

**PENDIENTE BLOQUEANTE antes de abrir el registro al público (no antes de
construirlo):** el artículo 7 de la Ley 1581 **prohíbe** tratar datos de
niños, niñas y adolescentes salvo los de naturaleza pública. Hoy no es
problema porque el entrenador conoce a cada cliente; con registro abierto
van a entrar menores, garantizado. Hace falta puerta de edad y decidir
qué pasa con un menor. El artículo 12 del Decreto 1377, que es el que
regula el cómo, **no se pudo verificar** — la fuente oficial no abrió.
Confirmarlo antes de abrir. Va en la Fase 8, junto con la política de
tratamiento publicada.

También queda por verificar si el plan gratis de Vercel (uso no
comercial) cubre una app gratuita que funciona como embudo hacia un
servicio pago.

**2026-09-01 — CAMBIO DE RUMBO: sí va el botón de tema claro/oscuro**
Contradice a propósito la decisión de este mismo día de "sin botón de
tema": *un botón más es una decisión más para el usuario, y nadie cambia
de tema dentro de una app de entrenamiento*. El argumento sigue siendo
razonable, pero el fondo cacao del tema oscuro no convence y hace falta
poder alternar para comparar.

Va discreto: 17 px de dibujo, área tocable de 40, en el color más tenue
de la paleta, arriba a la derecha de las cinco pantallas. Es un ajuste,
no una función: si tuviera peso visual competiría con el título.

Consecuencia técnica que sí importa: **desapareció toda `@media
(prefers-color-scheme)` de `theme.css`.** Con un botón, la preferencia
del sistema pasa a ser solo el valor inicial; si además quedara una media
query, alguien con el sistema en oscuro que elija claro tendría media app
de cada color. Ahora manda `data-tema` en el `<html>`, y el
`theme-color` de la barra de estado se lee de la variable `--fondo` en
vez de escribirse a mano — así sigue habiendo un solo sitio con colores.

Detalle que parece menor: el tema se aplica con un script suelto dentro
del `<head>`, no desde un módulo. Un módulo carga después de los estilos,
así que la pantalla ya se pintó clara y se ve un fogonazo blanco antes de
la app oscura — justo a quien eligió el tema oscuro. Es la única lógica
duplicada del proyecto y está comentada en los dos sitios.

La elección se guarda en `localStorage`, no en la base: es preferencia
del aparato, no de la persona, y sobre todo tiene que aplicarse **antes**
de saber quién entró.

**2026-09-01 — El fondo del tema claro pasa de greige a blanco**
Contradice la decisión del 1/09 de *"fondo hueso cálido, no blanco"*.
Fondo y tarjetas comparten el blanco; lo que separa una tarjeta del fondo
es su borde y su sombra, no un tono distinto. Se lee más limpio y más
plano.

Para que siga funcionando en gama baja —donde `--sombra` es `none` y el
borde es lo ÚNICO que dibuja la tarjeta— se subió `--linea-suave` de
`#E6E1D7` a `#EAE6DE`. Verificado forzando `data-nivel="bajo"`: las
tarjetas se siguen leyendo.

El greige original quedó anotado en un comentario de `theme.css`:
volver es cambiar dos valores. **El tema oscuro no se tocó**, a propósito:
cambiar dos cosas a la vez impide saber cuál mejoró.

---

**2026-09-02 — Fase 2 cerrada: la app tiene acceso real**
La base quedó creada, con los cuatro archivos corridos y las cuatro
cuentas hechas. Del lado del código entraron `src/lib/supabase.js`, el
hook `useSesion`, las pantallas de acceso y activación, los
consentimientos y "Mis datos".

**La distinción que organiza todo el código de acceso:** estar
autenticado y tener perfil son cosas distintas. `sesion` es que Supabase
sabe que existes; `perfil` es que la app sabe quién eres. Se puede tener
lo primero sin lo segundo, y ese estado no es un error — es alguien
registrado que aún no ha canjeado código ni dicho su nombre. Sin perfil,
todas las políticas le dejan ver exactamente nada. `App.jsx` decide entre
cuatro pantallas mirando solo esos dos datos.

**Consentimientos: cuatro finalidades separadas, no una casilla.** Una
autorización general no es autorización válida bajo la Ley 1581: hay que
poder aceptar unas cosas y rechazar otras. Las dos obligatorias
(tratamiento y descargo de ejercicio) y la de avisos se piden al activar;
la de datos de salud se pide en "Mis datos", **en el momento en que se
van a dar los datos**, no antes y en bloque.

Detalle que parece menor: cuando alguien dice que NO a los avisos,
también se guarda la fila, con `aceptado = false`. Un "no" registrado
vale tanto como un "sí" — es la diferencia entre "dijo que no" y "nunca
se le preguntó".

**Verificado contra la base de producción, no supuesto.** Se creó un
visitante desde la app y se comprobó que ve exactamente lo que dice el
paso 8.6: 1 perfil, 0 planes, 0 plantillas, 0 invitaciones, 0 retos, 30
ejercicios, 1 rutina y 2 recetas. Después se autorizaron y guardaron sus
datos de salud, se descargaron con `mis_datos()` (devolvió las 8
secciones) y se eliminó la cuenta con `eliminar_mi_cuenta()`. Se
comprobó luego que el correo ya no puede iniciar sesión: el borrado en
cascada funciona. No quedó ninguna cuenta de prueba en la base.

**CORRECCIÓN — el comentario de `numeric` en el esquema estaba mal.**
Decía que un `numeric` vuelve de la base como texto ("35.00") y que hay
que convertirlo o las sumas concatenan. Se comprobó el 2/09: por la API
de Supabase (PostgREST) llega como NÚMERO de verdad, 74.5. Lo que sí
devuelve texto es el driver de Node conectado directo a Postgres, que no
es el caso de esta app. Corregido en `01-esquema.sql`. Una advertencia
equivocada en un repo público es peor que ninguna.

**Pruebas: de 14 a 32.** Las nuevas cubren el cálculo de nivel (que
nunca devuelva "Nivel NaN" ni "Nivel 0") y, sobre todo, el cumplimiento
de la Ley 1581: que los datos de salud sigan marcados como opcionales,
que las finalidades sigan separadas y que ningún texto de la interfaz use
palabras reservadas al nutricionista. Esas pruebas no cuidan el código:
cuidan que nadie vuelva ilegal el formulario "simplificándolo".

**`mock.js` no se borró entero, se está encogiendo.** La idea original
era borrarlo en la Fase 2, pero conectar las cinco secciones a datos
reales es trabajo de las Fases 4 y 5. La regla se cumple de otra forma:
cada vez que una pantalla se conecta, su parte se borra el mismo día. Ya
se fue `RECETAS`; `Perfil` y el saludo de `Hoy` ya usan el perfil real.

**Costo del paquete: de 50 a 112 KB comprimidos.** Es lo que pesa
`supabase-js`. Se acepta porque trae el manejo de cuentas completo, pero
queda anotado: el público abre esto con datos móviles en Colombia, y si
en la Fase 8 hace falta recortar, este es el primer sitio donde mirar.

**2026-09-02 — BUG: el admin no podía entrar a su propia app**

Encontrado al arrancar la Fase 3, entrando con una cuenta de admin. La
app mandaba al entrenador a la pantalla de activación, y al enviarla la
función SQL respondía "Esta cuenta ya está activada": un callejón sin
salida. Estaba en producción desde que se cerró la Fase 2.

**La causa.** `useSesion` pedía el perfil sin filtrar por nadie —
`.from('perfiles').select('*').maybeSingle()`— confiando en que RLS
recortara hasta dejar una sola fila. Y la política dice
`using (id = auth.uid() or es_admin())`, que **para un admin es
verdadera en TODAS las filas**. Le llegaban los cuatro perfiles,
`maybeSingle()` fallaba con `PGRST116 - Results contain 4 rows`, el
error se traducía a `perfil = null`, y la app leía eso como "no se ha
activado".

**Por qué la verificación de la Fase 2 no lo cazó.** Se hizo creando un
VISITANTE, y con un visitante la política sí devuelve una sola fila.
El error solo aparece con la cuenta que más permisos tiene, que es
justo la última que se prueba. No fue un descuido del ritual: fue que
el ritual se corrió con el rol equivocado. **Desde ahora la prueba de
los tres roles incluye entrar a la app con cada uno, no solo contar
filas en el SQL Editor.**

**No era una consulta, eran tres.** `perfil_salud` y `consentimientos`
tienen la misma cláusula `or es_admin()`, y `MisDatos.jsx` las leía sin
filtrar. Las consecuencias ahí eran peores que un bloqueo: con un solo
cliente que hubiera llenado sus datos de salud, el entrenador habría
visto el peso y las lesiones de esa persona dentro de su propia pantalla
de "Mis datos", y el "ya autorizaste" se habría calculado con el sí de
otro. Un dato sensible de un tercero en la pantalla del titular sobre sí
mismo. **No llegó a pasar: ningún cliente real ha usado la app todavía.**

**Las políticas NO se tocaron, y es la decisión.** Que el admin pueda
leer a sus clientes es correcto y necesario para las Fases 4 y 5, donde
él programa mirando su progreso. Lo que estaba mal era el código.

**La regla que queda escrita** (en `useSesion.js`, en `MisDatos.jsx` y
en la cabecera de PERFILES de `02-politicas.sql`):

> RLS decide qué se PUEDE ver, no qué se QUIERE ver. Si el código
> necesita una fila concreta, la pide por su id. Nunca se confía en que
> la política recorte hasta dejar una sola.

En Excel: es la diferencia entre filtrar la tabla y confiar en que quedó
una sola fila visible, contra usar BUSCARV con la clave. Lo segundo
devuelve lo que pediste aunque el filtro cambie.

**Reproducido a propósito antes de darlo por resuelto.** Se revirtió
solo el filtro, se recargó con la sesión abierta y volvió a salir la
pantalla de activación con el mismo `PGRST116`; se restauró y volvió a
entrar. La primera lectura fue que había sido un error de proceso
—probar contra Vercel sin haber hecho push— y no lo era: en Vercel corre
el código sin el arreglo, así que ahí el bug es real. Vale la pena
anotarlo: la explicación cómoda de un fallo raro casi siempre es que uno
se equivocó de pestaña, y a veces no.

---

**2026-09-02 — La pestaña "Programas" pasa a ser "Ejercicios"**

No es un cambio de nombre. Esa pantalla mostraba un catálogo de
programas a los que el cliente se inscribía, y ese modelo está
descartado desde el 1/09: aquí cada cliente tiene SU rutina, armada por
el entrenador. Era mock de algo que la base de datos no puede
representar, que es la peor clase de mock — enseña una app que no va a
existir y se descubre tarde.

En su lugar va el catálogo real de ejercicios, que además es lo que
faltaba para poder cerrar la Fase 3: la prueba de la fase dice "un
cliente los ve, un visitante también" y hasta hoy ninguna pantalla leía
la tabla `ejercicios`. `PROGRAMAS` se borró de `mock.js` el mismo día,
como manda la regla.

El plan de la semana del cliente entra en la Fase 4 y su sitio natural
es "Hoy", que ya es la pantalla del día.

---

**2026-09-02 — El panel del entrenador entra desde Perfil, no es una pestaña**

Dos razones. La de pantalla: seis pestañas en un Android de 360 px dejan
cada una en 60 px y los textos se parten. La que pesa más: la barra de
abajo queda IDÉNTICA para todo el mundo. Si el entrenador viera una
pestaña que sus clientes no ven, la primera pregunta de un cliente sería
por qué su app es distinta a la de otro — que es exactamente lo que la
regla 11 de `CLAUDE.md` protege para los niveles de decoración.

Esconder el panel no protege nada: quien tenga el navegador puede
cambiar esa condición. Lo que impide que un cliente edite un ejercicio
es la política `ejercicios_admin`, que exige `es_admin()` en el
servidor.

---

**2026-09-02 — El bucket de imágenes es público, y eso obliga a una regla de contenido**

Las políticas quedaron en `supabase/05-storage.sql`: todo el mundo lee,
solo el admin escribe. Público es lo correcto —son fotos de alguien
haciendo una sentadilla, y el catálogo es el gancho de la app— pero
"público" significa que cualquiera con la dirección ve la imagen, y la
dirección se arma con el nombre del archivo, así que es adivinable.

De ahí una regla que no es técnica y que hay que trasladarle al
entrenador: **la imagen de una persona identificable es un dato personal
bajo la Ley 1581.** Las fotos tienen que ser de él mismo, de modelos que
hayan autorizado, o ilustraciones. Nunca la foto de un cliente sin
autorización escrita, ni siquiera de espaldas — la ley no pide que se le
vea la cara, pide que no sea identificable. Quedó agregado a
`PASOS-FASE-3.md`.

---

**2026-09-02 — Versión a la vista y aviso de derechos, con una separación
que tips-app no necesitaba**

La app ya muestra su versión (`v0.3.0`) y el aviso de derechos en Perfil,
y el repositorio tiene `LICENSE`. El modelo es el de `tips-control-app`,
pero con tres diferencias que no son de redacción:

**1. La autoría aquí está partida en dos.** Tips Control es de un solo
dueño. Este proyecto tiene dos, por acuerdo del 1/09: el software es de
quien lo escribe, y el contenido deportivo —ejercicios, indicaciones,
rutinas, recetas— es obra del entrenador y le pertenece a él. Un aviso de
"todos los derechos reservados" a secas se lo atribuiría todo a una sola
parte y contradiría el acuerdo. El aviso separa las dos capas, y hay una
prueba que se cae si alguien "simplifica" el texto y borra la distinción.

Además protege mejor: decir exactamente qué es lo que nadie puede copiar
vale más que una frase amplia.

**2. Va © y NUNCA ®.** El © es automático, protege la obra desde que
existe y no requiere registrar nada. El ® afirma que hay una marca
registrada ante una oficina de propiedad industrial, y usarlo sin ese
registro es una declaración falsa. La app ni siquiera tiene nombre
todavía. Hay una prueba que lo verifica.

**3. La razón de que el repo sea público es distinta.** El LICENSE de
tips-app dice que es público porque GitHub Pages en su plan gratuito solo
publica desde repositorios públicos. Aquí eso es falso: esto está en
Vercel y el repo es público por decisión, para que se pueda leer y
auditar. Copiar esa frase habría metido una afirmación falsa en un
archivo legal.

**Cómo se numera.** El primer número es 0 mientras la app no esté
terminada; el segundo es la última fase cerrada, así que `v0.3.x` es la
Fase 3. El tercero sube con cada arreglo, **en el mismo commit que
arregla algo**: una versión que no cambia cuando cambia el código hace
creer que se probó algo que no se probó.

**Por qué la versión importa más aquí que en otra app.** Esta se instala
desde el navegador y se actualiza sola con cada push, así que nadie ve
nunca una pantalla de "actualizar". Sin un número a la vista, cuando el
entrenador escriba "no me funciona el botón de guardar" no hay forma de
saber qué está corriendo.

El año del aviso se calcula en hora de Bogotá, no se escribe a mano: un
"© 2026" fijo se queda viejo el 1 de enero y nadie se acuerda de tocarlo.

De 53 a 59 pruebas.

---

**2026-09-02 — El bucket de imágenes queda protegido y verificado**

`05-storage.sql` corrido contra producción. Comprobado suplantando los
dos roles en el SQL Editor, no supuesto:

- Con el uuid de un cliente, el `insert` en `storage.objects` falla con
  `42501: new row violates row-level security policy`. Ese error es la
  política funcionando.
- Con el uuid del admin, ni el `select` ni el `insert` dan error. El
  `count` devolvió 0 porque el bucket está vacío, no porque no vea.

Los dos lados: el entrenador sube, un cliente no.

Detalle que conviene recordar cuando se agregue otra política de
Storage: `public.es_admin()` va con el esquema por delante. Estas
políticas corren en el esquema `storage`, que no lleva `public` en su
ruta de búsqueda, y sin el prefijo la política ni siquiera se crea.

Y una trampa que no da error y por eso es peor: si el bucket no se llama
exactamente `ejercicios`, las políticas se crean sin problema y
simplemente no aplican a nada. Parece que funcionó.

---

## Estado (2 de septiembre de 2026)

**Fases 1 y 2 cerradas.** La app está publicada, con base de datos real,
acceso por cuenta y tres roles funcionando. Todo verificado contra
producción, no en local con datos falsos.

### Lo que existe y funciona

- **Base de datos viva** en Supabase (`us-east-1`, Virginia). Los cuatro
  archivos SQL corridos, RLS activo en las 19 tablas, y comprobado desde
  fuera que un anónimo con la llave pública no ve ni una fila ni puede
  ejecutar ninguna función.
- **Tres roles con contenido distinto.** Verificado consultando desde la
  app con una cuenta real: el visitante ve 30 ejercicios, 1 rutina y 2
  recetas; el cliente ve 4 rutinas y 6 recetas más su plan.
- **Acceso completo:** registro abierto (que no da acceso a nada), canje
  de código que asciende visitante → cliente, sesión persistente.
- **Ley 1581 implementada:** cuatro finalidades separadas y versionadas,
  el "no" se guarda igual que el "sí", y los tres derechos —conocer,
  actualizar, suprimir— son botones que funcionan. El borrado en cascada
  se probó de verdad.
- **32 pruebas** (`npm run test`). Seis existen para que nadie vuelva
  ilegal el formulario "simplificándolo".
- **Botón de tema** claro/oscuro, con la elección guardada en el celular.
- En línea en `https://fitness-app-ivory-mu.vercel.app`. Cada push a
  `main` republica sola.

### Qué está conectado a la base y qué no

| Pantalla | Estado |
|---|---|
| Acceso, Activar, Mis datos | reales |
| Perfil | real (nombre, rol, XP) — los logros siguen de mock |
| Recetas | real |
| Hoy | medio: el saludo es real, la rutina y la racha son mock |
| Programas, Progreso | mock |

`src/data/mock.js` **no se borra de golpe: se encoge.** La regla es que
cada vez que una pantalla se conecta, su parte se borra el mismo día. Ya
se fue `RECETAS`. Faltan `RUTINA_DE_HOY` y `PROGRAMAS` (Fase 4),
`HISTORIAL` y `LOGROS` (Fase 5), `USUARIO` y `META_SEMANAL` (Fase 4).

### Pendientes que vienen de atrás

1. **Nadie ha visto la app en un Android real.** El público es 83%
   Android y todo se ha verificado en navegador y en un iPhone. Ahora hay
   más que mirar que antes: los formularios, el teclado tapando el botón
   de entrar, y si el vidrio de la barra va a tirones. Si va mal, se sube
   el umbral de `nivelDetectado()` en `src/lib/dispositivo.js`.
   **No bloquea la Fase 3.**

2. **La puerta de edad.** El artículo 7 de la Ley 1581 prohíbe tratar
   datos de niños, niñas y adolescentes salvo los de naturaleza pública.
   Con registro abierto van a entrar menores. Falta puerta de edad en el
   registro y decidir qué pasa con un menor. **El artículo 12 del Decreto
   1377, que regula el cómo, sigue SIN VERIFICAR** — la fuente oficial no
   abrió el 1/09. Confirmarlo antes de abrir el registro al público.
   **Bloquea la difusión, no la Fase 3.**

3. **El plan gratis de Vercel es para uso no comercial.** Una app
   gratuita que funciona como embudo hacia un servicio pago es zona gris.
   Sin verificar.

---

## Siguiente paso — Fase 3: la biblioteca de ejercicios

**Objetivo: que el entrenador cargue sus 80 a 150 ejercicios sin
depender del desarrollo.** Hoy la biblioteca tiene 30 ejercicios de
ejemplo, inventados; él tiene los suyos y nadie más los puede meter.

Estimado: **~10 h.** Bajó de 12 porque Bunny está aplazado y se arranca
con imágenes.

### Lo que hay que construir

1. **Panel de administración** (visible solo con `rol = 'admin'`). Es la
   primera pantalla que existe solo para el entrenador. Crear, editar y
   archivar ejercicios: nombre, grupo, movimiento, equipo, nivel e
   indicaciones.

   Recordar la regla de los DOS ejes: `grupo` (músculo) y `movimiento`
   (patrón) son columnas distintas porque así los piensa él. No
   colapsarlas.

2. **Carga masiva desde hoja de cálculo.** A 80–150 ejercicios, meterlos
   de a uno en un formulario es media tarde perdida. Se pega un CSV o se
   sube el archivo, se muestra una vista previa, y solo entonces se
   guarda.

   El índice único `ux_ejercicios_nombre` ya existe justo para esto: si
   la carga se cae a la mitad, se vuelve a correr entera y las filas que
   ya estaban se ignoran.

3. **Imágenes en Supabase Storage.** Bucket público, con sus políticas.
   `ejercicios.imagen_url` guarda la ruta.

   **`video_id` se queda vacío y así está bien.** El entrenador arranca
   con imágenes y va reemplazando. Toda pantalla que muestre un ejercicio
   tiene que verse bien sin video Y sin imagen — hoy hay 30 ejercicios sin
   ninguna de las dos cosas, y es el caso real del primer día.

4. **Comprimir antes de subir.** El público abre esto con datos móviles
   en Colombia. Una foto de celular son 3–5 MB; hay que bajarla a ~150 KB
   en el navegador antes de mandarla, no después.

### Lo que necesita la cuenta de Kev

El bucket de Storage y sus políticas **ya están hechos** (2/09). Queda
conseguir del entrenador la hoja de cálculo con sus ejercicios, y
decirle antes de que empiece a tomar fotos que no pueden ser de
clientes: el bucket es público y la imagen de una persona identificable
es un dato personal bajo la Ley 1581. Está redactado en
`PASOS-FASE-3.md` para copiárselo tal cual.

### La prueba que cierra la Fase 3

El entrenador entra con su cuenta, pega su hoja de cálculo, y sus
ejercicios quedan en la app con sus imágenes. Un cliente los ve; un
visitante también (el catálogo es el gancho); ninguno de los dos puede
editarlos. Verificado suplantando los tres roles, como en la Fase 2.

## Preguntas abiertas

- **Nombre de la app.** Provisional: "Entrena". El repo va como `fitness-app`
  y renombrarlo después en GitHub no rompe nada.
- **El artículo 12 del Decreto 1377** (datos de menores). Sin verificar.
- **Vercel y el uso no comercial.** Sin verificar.
- ¿El PDF del cuestionario entra al repo público o no? Recomendación: no.
- Cobertura de los nodos de Bunny en Colombia — se mide cuando llegue el
  video, no antes (Bunny está aplazado).
- **Latencia real desde Colombia.** Se midió 85 ms, pero desde New Jersey
  a Virginia, que es el tramo equivocado. El que importa es Bogotá →
  Virginia y solo lo puede medir alguien que esté allá. Sigue abierta.

Resueltas: clientes (6 a 15 para arrancar, sin techo), videos (arranca con
imágenes), certificación de entrenador (en regla), alojar en EE. UU.
(legal, Circular 005 de 2017).

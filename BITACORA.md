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

**2026-09-02 — Imágenes libres: evaluado, NO decidido todavía**

Pregunta: ¿se pueden meter imágenes libres de derechos para ejercicios y
recetas, en vez de esperar a que el entrenador las tome? Se investigó
contra las fuentes, no de memoria. **La decisión es de Kev y del
entrenador; aquí queda el hallazgo.**

**El hallazgo que ordena todo el problema:** una foto de ejercicio es,
por definición, la foto de una persona. Una foto de receta es la foto de
un plato. Son dos problemas distintos y no se resuelven igual.

**RECETAS — resuelto y barato.** Pexels y Unsplash sirven. La comida no
es nadie: no hay derechos de imagen de por medio. Pexels no exige
atribución; Unsplash tampoco. Prohíben revender la foto sin modificar y
dar a entender que alguien te patrocina, que no es el caso.

**EJERCICIOS — las fotos de banco de imágenes son un problema, y no de
copyright.** Una licencia de derechos de autor NO es una autorización de
la persona retratada. Unsplash lo dice explícitamente: no verifica
autorizaciones de modelo, y la responsabilidad de determinar si hace
falta un permiso adicional recae "solely and exclusively" en quien usa
la foto. O sea que la foto es legal de copiar y aun así la persona
retratada puede reclamar.

Con datos de salud, dos dueños y un público colombiano, ese no es el
riesgo que conviene asumir por una imagen decorativa.

**La salida son ILUSTRACIONES, no fotos.** Un dibujo no es la foto de
nadie: el problema desaparece de raíz, no se mitiga.

**Fuentes revisadas, con su veredicto:**

| Fuente | Licencia | Veredicto |
|---|---|---|
| Everkinetic (`everkinetic/data`) | CC-BY-SA 4.0 | **Sí.** Ilustraciones, no fotos. |
| `bryllim/workout-guide` | assets CC-BY-SA 4.0, código MIT | **Sí.** Es Everkinetic normalizado: 302 ejercicios, 906 SVG de 512 px, 3 fotogramas cada uno. |
| wger (`wger.de`) | CC-BY-SA, por ejercicio | **No, en la práctica.** Los campos `license_author` y `license_title` de su API vienen VACÍOS, así que no hay a quién atribuir. Se debe una atribución que no se puede cumplir. |
| `yuhonas/free-exercise-db` | dice "public domain" | **No.** Hay issues abiertos desde 2023 (#2, #12, #13) preguntando de dónde salieron las imágenes, sin responder. Origen desconocido no es dominio público. |

**Por qué SVG importa aquí más que en otro proyecto.** El 1/09 se
descartó Google Fonts porque una fuente son 30–100 KB que el cliente
descarga con datos móviles antes de ver la primera letra. Un SVG de una
figura pesa unos pocos KB contra los ~150 KB de una foto comprimida.
Con 150 ejercicios la diferencia no es estética.

**El costo, dicho completo, porque no es gratis:**

1. **Atribución obligatoria y visible.** CC-BY-SA 4.0 exige nombrar a
   Everkinetic. Hace falta una pantalla de créditos.
2. **Choca con el `LICENSE` que se escribió hoy.** Dice "todos los
   derechos reservados", y eso no puede cubrir material de terceros bajo
   CC-BY-SA. Habría que agregar una sección de activos de terceros y un
   archivo de créditos. **Esto NO afecta al código:** el share-alike
   alcanza a las adaptaciones de la imagen, no a la app que la muestra.
   Si se le cambia el color a un SVG, ese SVG modificado queda CC-BY-SA.
3. **Emparejar es trabajo manual.** Los 302 nombres están en inglés y los
   del entrenador van a estar en español. No hay emparejado automático
   fiable. Estimado: 2 a 3 h para 150 ejercicios, y es trabajo de una
   persona, no de código.
4. **Es contenido, y el contenido es dominio del entrenador.** Que sus
   clientes vean un dibujo genérico en vez de una demostración suya
   afecta cómo lo perciben a él. Esa decisión no se toma desde aquí.

**Recomendación:** ilustraciones de Everkinetic como RELLENO mientras él
construye su propia biblioteca de fotos, no como reemplazo. Encaja con la
decisión del 1/09 de que él "arranca con imágenes y va reemplazando poco
a poco", y le quita la presión de tener 150 fotos listas el primer día.
Para recetas, Pexels sin más.

**Pendiente de decidir con el entrenador antes de construir nada.**

---

---

**2026-09-02 — Las ilustraciones ENTRAN. Aprobadas por el entrenador**

Se cierra la pregunta abierta de esta misma fecha ("Imágenes libres —
evaluado, NO decidido"). El entrenador dio luz verde. Van como RELLENO,
no como reemplazo: la foto que él suba siempre gana y el dibujo
desaparece solo.

**Cinco hallazgos técnicos que no estaban en la evaluación**, porque
salieron de bajar los archivos y mirarlos:

1. **Son line art, no siluetas.** Dibujo de contorno, se lee bien a
   tamaño de tarjeta y también a tamaño de detalle.
2. **Vienen blancas sobre transparente**, o sea INVISIBLES sobre el
   fondo blanco de la app. Recolorearlas no es una opción estética, es
   obligatorio para que se vean.
3. **Cada figura es UN solo `<path>` sin color propio.** Eso permite
   pintarlas desde el CSS, y de ahí sale la decisión de abajo.
4. **No tienen cara.** Refuerza justo el argumento por el que se
   eligieron: no hay a quién identificar.
5. **Los tres fotogramas están numerados al revés de lo que uno
   supone:** en la sentadilla goblet el frame-1 es la posición ABAJO y
   el frame-3 es de pie. Si algún día se muestran dos poses, ojo con
   esto.

**LA DECISIÓN TÉCNICA QUE MANDA: se pintan con `mask-image`, no con
`<img>`.** El archivo se usa como PLANTILLA y el color lo pone
`background-color` desde `theme.css` (variable `--lamina`). Un `<img>`
se pinta en su propio mundo y el CSS de afuera no entra: se verían
blancas sobre blanco.

Lo que se gana con eso, y es más de lo que parece:

- **El mismo archivo sirve en tema claro y en oscuro**, sin duplicar
  nada. Una foto en tema oscuro se queda como un rectángulo blanco
  pegado en la pantalla; el dibujo se adapta.
- **No se rompe la regla 1**: el color sale de una variable, no está
  dentro del archivo.
- Si el navegador no sabe enmascarar, un `@supports` esconde el dibujo y
  queda el hueco neutro de siempre. Nunca un icono roto.

**Por eso viven en `public/`, no en Supabase Storage.** Tres razones y
ninguna es preferencia: Storage sirve imágenes que no se dejan teñir;
Storage es donde vive lo del ENTRENADOR y mezclar ahí material de
terceros invita a que alguien borre lo que no debe; y desde `public/`
entran en la caché del navegador sin gastar tráfico de Supabase.

**El peso, que era la duda razonable.** Las 30 pesan **135 KB en gzip,
4,5 KB cada una** — lo mismo que UNA sola foto comprimida al objetivo
del proyecto. Se les redondearon las coordenadas a un decimal, que
quita un 33%. El bundle de JavaScript no creció ni un byte: los SVG se
sirven aparte.

**Sobre el redondeo, una trampa que costó un intento.** El primer
optimizador también quitaba separadores para ahorrar más, y convertía
`1 .5` (dos números) en `1.5` (uno). Los dibujos salían como manchas.
Se rehízo tokenizando el trazo y emitiendo separadores siempre válidos:
menos ahorro agresivo, imposible cambiar un número. **Lo cazó una
prueba visual, no una prueba automática** — el código no fallaba, solo
dibujaba mal.

**El emparejado: los 30 ejercicios de `04-ejemplo.sql` tienen lámina.**
Está escrito a mano en `src/lib/ilustraciones.js`, con la llave pasada
por `claveNombre()`, la misma que usa la carga masiva. NO se calcula, y
la razón está en el comentario del archivo: el vocabulario de gimnasio
en español no es la traducción del inglés. "Pájaros con banda" no es
"birds with band", es `rear-delt-fly`. "Fondos entre bancos" no es
"bottoms between benches", es `bench-dip`.

Dos emparejados imperfectos que se dejan a propósito, con el movimiento
correcto y el implemento distinto: "Pájaros con banda" (aparece con
mancuernas) y "Elevación de talones" (sin peso). Si al entrenador le
molestan, se quita la línea y esa tarjeta vuelve al hueco.

**RECETAS: problema distinto, solución distinta.** No hay biblioteca
libre de dibujos de comida que sirva, y una foto por receta miente el
día que cambien los ingredientes. Se dibujaron **cuatro marcas propias**
—desayuno, almuerzo, cena, snack— colgadas de la columna `momento`, que
la tabla ya tenía. Cuatro archivos cubren todas las recetas que existan.
Al ser de autoría propia no deben atribución ni arrastran licencia
ajena. Se pintan pequeñas y apagadas a propósito: son marca de
categoría, no foto del plato. Un icono estirado a tamaño de foto se lee
como una foto que no cargó.

**Lo que costó decir que sí, que era lo anunciado:**

- **Pantalla de créditos** (`src/sections/Creditos.jsx`), colgada de
  Perfil. No es cortesía: CC BY-SA 4.0 exige nombrar al autor, enlazar
  la licencia y declarar los cambios. Sin eso el uso es una infracción,
  y este repo es público.
- **Sección de terceros en `LICENSE`**, en español y en inglés. Dice
  que esos SVG modificados quedan bajo CC BY-SA 4.0 y que cualquiera
  puede usarlos con esa licencia — y que eso **NO alcanza al resto del
  proyecto**: el share-alike aplica a las adaptaciones de la obra, no al
  programa que la muestra.
- **Tres pruebas de crédito** que se caen si alguien "simplifica" la
  atribución, en la misma línea que las del consentimiento y las del ©.

**De 59 a 71 pruebas.** Las nuevas van contra el disco a propósito: una
tabla que apunta a un archivo borrado no falla al compilar ni al abrir
la app, el dibujo simplemente no aparece. Es el peor tipo de error, el
que no se nota. También se verifica que no sobre ningún SVG sin usar —
peso muerto que igual se descarga.

Versión a `v0.3.1`.

**Lo que NO se verificó y hay que decir:** las pantallas se comprobaron
renderizando el CSS real con el markup real, en claro y en oscuro, pero
**no entrando a la app con una cuenta**. Falta el ritual del 2/09 —
entrar con cada rol — y sigue faltando el Android real.

---

**2026-09-02 — Un dato personal ya no depende de que alguien se acuerde**

Existía la regla de no meter datos personales del desarrollador en el
repo, pero vivía en un archivo que git ignora, así que solo la cumplía
quien lo hubiera leído. Y un archivo de texto no detiene un `git commit`.

Se partió en tres piezas, y la partición es la decisión:

| Pieza | Dónde vive | Por qué ahí |
|---|---|---|
| La regla (regla 16) | `CLAUDE.md`, público | No filtra nada: describe una política, no a una persona |
| La lista de términos | `CONTEXTO-LOCAL.md`, ignorado | Es el catálogo de lo que no debe saberse |
| El guardia | `.git/hooks/pre-commit` | Git nunca lo versiona ni lo empuja |

**Por qué la regla SÍ puede ser pública.** Decir "en este repositorio no
entran datos personales de quien lo escribe" no revela dónde vive nadie
ni a qué se dedica. Y una regla que nadie puede leer es una regla que
nadie cumple: escondiéndola se pierde todo su valor sin ganar nada.

**Por qué la lista NO.** Un archivo titulado "términos que no pueden
hacerse públicos" dentro de un repositorio público es el peor sitio
imaginable para guardarlo. Vive en `CONTEXTO-LOCAL.md`, entre marcadores,
y para agregar un término basta con escribirlo: el hook lo toma solo.

**Por qué el hook tampoco.** Un guardia versionado que apunta a una lista
secreta delata qué se está protegiendo. Además protege a UNA persona en
UNA máquina, no al software — la misma frontera que separa `CLAUDE.md` de
`CONTEXTO-LOCAL.md`. Consecuencia que hay que recordar: `.git/hooks/` no
viaja con el repo, así que **un clon nuevo no lo trae** y hay que ponerlo
a mano.

**Qué revisa el hook:** solo lo que se está a punto de commitear — las
líneas AGREGADAS del diff en cache y los nombres de los archivos. No el
historial ni el árbol de trabajo.

Que mire solo las líneas agregadas no es pereza, es necesario: si mirara
el diff entero, sería imposible ARREGLAR una filtración vieja, porque el
commit que la borra contiene el término en la línea que borra. Se
verificó en vivo con el caso de abajo.

**Dos decisiones sobre cómo se comporta:**

- **Falla cerrado.** Si `CONTEXTO-LOCAL.md` no aparece, bloquea el commit
  en vez de dejarlo pasar. Un guardia que se rinde cuando no puede
  comprobar es exactamente cómo se filtra un dato.
- **Tiene escape** (`git commit --no-verify`), a propósito. Un guardia
  que no se puede desactivar termina desactivado del todo, y entonces no
  protege nada.

**Probado con cinco casos, no supuesto:** término en el contenido
(bloquea), término en minúsculas y término con barras —la comparación es
literal, sin comodines, para que un punto o una barra no se conviertan en
uno— (bloquea), término en el nombre del archivo (bloquea), `--no-verify`
(pasa), y línea BORRADA que contiene el término (pasa).

**Y se probó solo, sin buscarlo:** el commit que escribió esta misma
entrada quedó bloqueado, porque el texto traía un término de la lista
como EJEMPLO. El hook tenía razón —un ejemplo literal en un archivo
público es exactamente lo que la regla prohíbe— así que se reescribió el
ejemplo en vez de usar `--no-verify`. Vale la pena recordarlo: cuando el
guardia frene, la primera pregunta es si tiene razón, no cómo saltárselo.

**Se corrigió el único caso conocido que ya estaba dentro.** La pregunta
abierta sobre latencia nombraba la ciudad desde donde se midió; ahora
dice "desde fuera de Colombia", que aporta lo mismo —el tramo medido fue
el equivocado— sin decir nada de nadie.

**Y hay que decirlo completo: el commit viejo conserva la versión
anterior, y eso no tiene arreglo.** Reescribir el historial de un repo ya
público no lo despublica; solo lo rompe para quien lo haya clonado. La
regla existe para que no vuelva a pasar, no para deshacer lo que pasó.
Es la regla 3 de PARAR aplicada a quien escribe en vez de a los clientes.

## 3 de septiembre de 2026 — la app no era instalable, y nadie lo sabía

### El bug que el iPhone escondió

La primera prueba en un **Android real** —el pendiente #1, abierto desde
el 1/09— destapó algo que la documentación daba por hecho desde el
principio. `CLAUDE.md` decía "PWA instalable" en la sección de Stack.
Era falso: **no existía ningún manifest.** Ni el archivo, ni el
`<link rel="manifest">`, ni un service worker. Cero referencias en todo
el proyecto.

Sin manifest, Chrome en Android no ofrece instalar: ofrece "agregar a
pantalla de inicio", que crea un **marcador**. Un marcador abre el
navegador con su barra de direcciones. Es exactamente lo que se vio.

**Lo que hace interesante este bug es por qué tardó en aparecer.** En el
iPhone la app se sentía como una app de verdad, y eso apuntaba en la
dirección equivocada: parecía que el código estaba bien y que Android
era el raro. Es al revés. Safari abre los atajos de pantalla de inicio
sin barra de navegador **tenga o no manifest** — no es mérito de la app,
es cómo funciona iOS. Android es el que dice la verdad sobre si hay
manifest o no.

Es la regla 8 de `CLAUDE.md` ("verifica antes de afirmar") cobrada con
intereses, y la razón exacta por la que esa regla dice **Android** y no
"un celular": el iPhone es el dispositivo que oculta este fallo, y es el
16% del público.

### Lo que se verificó en la documentación oficial

No de memoria, porque los criterios cambiaron:

- **Chrome 108+ en Android ya no exige service worker para instalar.**
  Con manifest basta. (`developer.chrome.com/blog/update-install-criteria`)
- **Pero el prompt automático de instalación sí sigue exigiendo un
  `fetch` handler.** Sin service worker, la opción existe pero hay que ir
  a buscarla al menú de los tres puntos, y ese menú no lo abre nadie que
  no lo esté buscando.
- Iconos obligatorios: 192 y 512. (`web.dev/articles/install-criteria`)

Por eso se hicieron las dos cosas y no solo el manifest.

### El service worker, y lo que NO hace

Está escrito corto y con las prohibiciones arriba del todo, porque el
riesgo de un service worker no es que falle: es que funcione demasiado.

- **No cachea nada de Supabase.** Por ahí viajan datos de salud de
  terceros, y la Ley 1581 le da al titular derecho a que se supriman.
  Una copia en el disco de un celular queda **fuera** de ese borrado y
  nadie sabría que existe. El filtro está escrito como lista de lo que
  SÍ se guarda, no de lo que no: una lista de exclusiones se olvida de
  lo que todavía no existe.
- **No cachea el HTML.** Es la forma más común de que alguien se quede
  pegado en una versión vieja después de un despliegue.
- **No sirve para usar la app sin internet.** Eso sigue siendo la Fase 8
  y es un diseño aparte.

La segunda razón para tenerlo pesa más que la primera: **las
notificaciones push lo exigen, sin excepción.** `CLAUDE.md` las llama "la
palanca de retención más grande del proyecto" desde el 31/08, y hasta hoy
no podían existir.

### El icono: una pesa, no una letra

Se descartó la "E" de "Entrena" por una razón concreta: **el nombre
todavía no está decidido** y lo decide el entrenador. Un icono con una
letra hay que rehacerlo el día que cambie el nombre; un dibujo de lo que
la app hace, no. Costaba lo mismo hoy.

Los cuatro PNG los dibuja `herramientas/generar-iconos.py` y **no se
editan a mano**. Es la respuesta a un problema real de la regla 1: un PNG
no lee variables de CSS, así que el oliva queda escrito literal en algún
lado. Guardado solo como PNG sería un color sin origen; en un script es
un color con su nombre de `theme.css` al lado y la razón de estar ahí.
Ver la regla 1, que ahora tiene dos excepciones en vez de una.

El primer intento salió mal y vale la pena dejarlo escrito: el asa tenía
radio 115 y el cuerpo empezaba 60 puntos más abajo, así que el óvalo se
comía el asa y **el icono se leía como una cebolla**. Lo que hace legible
la silueta de una pesa rusa es el HUECO del asa, no el asa.

---

## 3 de septiembre de 2026 — la carga masiva, y por qué se destrabó

### Se cambió una decisión registrada, a propósito

El 2/09 quedó escrito que la carga masiva estaba **"BLOQUEADA POR UNA
SOLA COSA: la hoja de cálculo del entrenador"**, y que probar con datos
inventados sería probar el código contra sí mismo. Esa decisión se
cambió hoy, con el visto bueno de Kev, y conviene que quede la razón.

**El bloqueo estaba mal planteado.** Lo que se le pedía al entrenador era
que construyera una hoja desde cero: dos horas de trabajo sin ninguna
recompensa visible para él. Eso no vuelve.

**La inversión:** en vez de pedirle una hoja vacía, se le manda una
**hoja ya llena** (`plantilla-ejercicios.csv`) con los 30 ejercicios de
ejemplo clasificados y la columna `indicaciones` en blanco. Su trabajo
pasa de "arma una hoja" a "borra los que no usas, agrega los tuyos y
llena una columna".

Los 30 nombres son **exactamente los que tienen dibujo** en
`ilustraciones.js`, así que lo que él conserve se ve completo desde el
primer día, sin una sola foto.

**Lo que NO cambió:** la plantilla es el entregable para él, no los datos
de prueba. La Fase 3 se cierra cuando él pegue SU hoja de vuelta. La
lección del 2/09 sigue en pie.

### Por qué las indicaciones van vacías en la plantilla

Al armarla se encontró algo que no es de la plantilla sino de
producción: **los 30 ejercicios que están hoy en la base tienen
indicaciones inventadas.** `04-ejemplo.sql` las marca como contenido de
prueba, pero están en la base real y **un visitante las lee ahora
mismo** — son consejos de técnica física que no escribió ningún
entrenador y que la app presenta como si fueran de él.

No es un error de código y por eso no se "arregló" en silencio: es
contenido, y el contenido es dominio del entrenador. Queda anotado en
los pendientes.

### Las tres decisiones de la pantalla

1. **Se revisa antes de guardar, siempre.** La vista previa es lo que
   convierte "tu hoja tiene un error" en "la fila 47 dice 'pesas' y eso
   no existe". La primera frase no la puede arreglar él solo; la segunda
   sí.

2. **Solo agrega. Nunca modifica ni borra.** Es la decisión que más se va
   a querer cambiar, así que la razón queda escrita: actualizar desde la
   hoja significa REEMPLAZAR la fila entera, y eso tiene dos
   consecuencias feas. Una columna que él dejó vacía **borraría** lo que
   hay en la app —cargar dos veces la misma hoja le vaciaría sus propias
   indicaciones—. Y la hoja no lleva la foto, así que reemplazar la fila
   **borraría la imagen que ya subió**. Un ejercicio que ya existe se
   edita desde "Tu biblioteca", uno por uno, que es donde se ve qué se
   está cambiando.

   Efecto secundario bueno: volver a pegar la hoja completa es seguro y
   se puede repetir cuantas veces sea.

3. **Lo que no se puede guardar no detiene lo que sí.** De 150 filas con
   3 errores se guardan 147 y se dice cuáles tres faltaron y por qué.

### El caso raro que costó la mitad del trabajo

**El separador no siempre es una coma**, y esto habría hecho fracasar la
primera carga real:

- Al copiar celdas de Excel o Google Sheets y pegarlas, el portapapeles
  entrega **TABULADORES**, no comas.
- Un CSV exportado desde un Excel configurado **en español** usa **punto
  y coma**, porque allá la coma es el separador decimal.

Un lector que solo entienda comas ve la fila entera como una celda y
responde "te falta el grupo muscular". El separador se **detecta**, y el
empate lo gana el tabulador porque es el camino que más se va a usar.

`src/lib/hoja.js` tiene **30 pruebas** y ninguna está para demostrar que
funciona con una hoja bonita. La que manda sobre las demás: **ninguna
fila se pierde en silencio.** Los cuatro estados —nuevo, existe,
repetido, error— tienen que sumar siempre el total. Si la app se come una
fila sin decir nada, él se entera meses después, cuando un cliente le
pregunte por un ejercicio que no aparece.

Detalle relacionado: la plantilla lleva **BOM** (tres bytes invisibles al
principio) porque sin él Excel en Windows rompe las tildes y "Jalón" se
ve "JalÃ³n". Ese BOM cuenta como carácter, así que el primer encabezado
no sería `nombre` sino `﻿nombre` y no coincidiría con nada. Se quita al
leer, y hay una prueba para eso: es el caso NORMAL, no la excepción.

---

## 3 de septiembre de 2026 — un dato inventado, y la regla que salió de ahí

Queda escrito porque es la clase de error que se repite si no se nombra
el mecanismo.

**Qué pasó.** Al proponer que se cambiara la decisión del 2/09 sobre la
carga masiva, se escribió que Kev llevaba **"un mes"** esperando la hoja
del entrenador. Llevaba **un día**: la bitácora estaba fechada el 2/09 y
la conversación era del 3/09. Las dos fechas estaban a la vista y la
resta nunca se hizo.

**Por qué importa más de lo que parece.** El número no fue un descuido
aleatorio. El argumento que se estaba defendiendo era "hay que saltarse
una decisión que la bitácora registró con mayúsculas", y "un mes
atorado" lo sostiene mientras que "un día" lo desarma por completo. O
sea: **se inventó justo el dato que hacía ganar la propuesta.** Eso no
es una imprecisión, es razonamiento motivado, y es el más difícil de
atrapar porque no se siente como inventar — se siente como tener razón.

No fue una sola vez: en la misma sesión se escribió "y eso despistó tres
semanas" sobre el bug del manifest, en este mismo archivo. Misma
mecánica, una duración inventada para que la historia sonara mejor.

**Por qué la regla que ya existía no lo frenó.** La regla de "nada de
inventar" apunta hacia AFUERA: precios, leyes, versiones, documentación.
Un número calculado a partir de dos fechas que ya están en el contexto
no se siente como un dato externo que haya que verificar. Se siente como
aritmética, y pasa por debajo de la regla sin tocarla.

**La regla nueva**, en la regla 8 de `CLAUDE.md` y en la skill base:
toda cantidad lleva su origen o no se escribe; las fechas se restan por
escrito; sin fuente va la frase cualitativa; y **el número que refuerza
la propia propuesta se verifica primero**, porque un dato que empuja
hacia donde uno ya iba es sospechoso, no es apoyo.

**Lo que NO cambió:** la decisión de fondo. Mandarle al entrenador una
hoja llena en vez de pedirle una vacía sigue siendo lo correcto, y ese
argumento nunca dependió del tiempo transcurrido. Lo que estaba podrido
era el dato de apoyo, no la conclusión.

---

## 3 de septiembre de 2026 — la portada por grupo muscular

Pedida por Kev como "más un capricho de tener una vista diferente". Se
evaluó y **sí vale la pena, pero no por la razón por la que se pidió.**

**Hoy no hacía falta.** Con 30 ejercicios, el buscador más las píldoras
de filtro resolvían el problema mejor que un paso extra. Si la app se
quedara en 30, sería un capricho y así había que decirlo.

**Pero la app no se queda en 30.** Con los ~150 que apunta a tener el
entrenador cambian tres cosas:

- Una fila de píldoras que se desliza de lado **se descubre mal** en un
  celular: nada indica que hay más filtros a la derecha.
- 150 tarjetas en una rejilla plana no son una biblioteca, son un muro.
- **Es la pantalla que ve un desconocido**, o sea el gancho de la app.
  Siete tarjetas con un dibujo se leen como un producto; una lista larga
  con dos filas de filtros se lee como una base de datos.

### El argumento en contra, que decidió la forma final

Los dos ejes son `grupo` y `movimiento`, pero el comentario del propio
código dice que la pregunta que de verdad se hace un cliente es la del
**equipo**: "¿qué puedo hacer hoy con lo que tengo en la casa?". Una
vista que arranca por grupo muscular entierra esa pregunta.

Por eso: **el buscador queda siempre arriba** —escribir se salta la
portada, así que quien ya sabe qué quiere no paga el paso extra— y **el
filtro de equipo sigue vivo dentro del grupo**. La píldora "Todos" del
filtro de grupo es la vuelta atrás, y así se puede saltar de un grupo a
otro sin pasar por la portada.

### Los dibujos son propios, y eso importa

Las 7 siluetas las dibuja `herramientas/generar-laminas-grupos.py`. **No
se buscaron en una biblioteca libre**, y no fue por gusto: los 30 dibujos
de ejercicios son de Everkinetic bajo CC BY-SA 4.0 y por eso existe la
pantalla de Créditos. Sumar 7 láminas de otra fuente significaba revisar
otra licencia, sumar otra atribución y arriesgarse a mezclar dos estilos.
Son óvalos y rectángulos redondeados: salió más barato dibujarlos.

**El truco que las hace funcionar**, que es lo único no obvio: se pintan
con `mask-image` (regla 15), y una plantilla no tiene colores — pero sí
admite **grados** de transparencia. El cuerpo va al 24% de opacidad y la
zona del grupo al 100%. Eso da la figura pálida con una sola zona
resaltada **usando un único color**, así que el mismo archivo sirve en
tema claro y en oscuro. Verificado en los dos.

Nota de diseño que costó un intento: el pecho eran dos óvalos y, con la
cabeza justo encima, **la lámina entera se leía como una cara**. Son dos
losas con el borde inferior en diagonal hacia el esternón.

---

## 4 de septiembre de 2026 — el Android real, verificado entero

**El pendiente #1 se cierra.** Abierto desde el 1/09, era el más viejo del
proyecto y el que más pesaba: el público es 83% Android y hasta ayer nadie
había abierto la app en uno.

Las tres cosas que había que mirar, comprobadas:

| Qué | Resultado |
|---|---|
| ¿Abre sin la barra del navegador? | **Sí.** El manifest funcionó |
| ¿El vidrio de la barra de abajo va a tirones? | **No, va fluido** |
| ¿El teclado tapa el botón de entrar? | **No** |

Consecuencia directa: **no hay que subir el umbral de `nivelDetectado()`**
en `src/lib/dispositivo.js`. El nivel de decoración que detecta hoy es el
correcto, y la apuesta de los tres niveles (1/09) queda validada en
hardware real en vez de en teoría.

Y confirma el arreglo del manifest end to end: se vio el bug en Android,
se arregló, y se comprobó en el mismo Android. No quedó nada afirmado sin
haberlo visto.

---

## 4 de septiembre de 2026 — la URL no va a circular, y eso reordena los pendientes

**Decisión de Kev, explícita:** la URL no se le va a dar a nadie —ni un
cliente, ni un usuario suelto— hasta que exista una versión más seria y
robusta.

Eso no borra ninguno de los pendientes de difusión, pero sí los
reclasifica, y conviene tenerlo claro para no gastar sesiones en el orden
equivocado:

- **La puerta de edad** (artículo 7 de la Ley 1581, artículo 12 del
  Decreto 1377 sin verificar) sigue siendo **obligatoria antes de la
  difusión**, y sigue sin hacerse. Lo que cambia es que ya no aprieta:
  no bloquea ninguna fase, bloquea el día que la URL salga. Ese día no
  está cerca.
- **Las indicaciones inventadas** de los 30 ejercicios de ejemplo **no se
  vacían.** Kev lo decidió el 4/09 y el razonamiento se sostiene: el
  riesgo de que alguien siga un consejo de técnica que no escribió el
  entrenador existe solo si hay alguien leyéndolo, y no lo va a haber.
  Se resuelven solas cuando él devuelva la hoja con las suyas.
- **El plan gratis de Vercel** (uso no comercial) sigue sin verificar, y
  por la misma razón deja de correr prisa.

**Lo que NO cambia:** el repo sigue siendo público y las reglas 3 de
PARAR y 16 siguen valiendo igual. Que no haya usuarios no vuelve privado
el historial de git.

---

## 4 de septiembre de 2026 — las láminas de grupo muscular no convencen

**Rechazadas por Kev.** Textual: se ven "cero profesionales y estéticos".
No es urgente y no bloquea nada, pero queda anotado con el criterio
concreto para que quien las rehaga no tenga que adivinar.

**Lo que se hizo (3/09):** una silueta humana completa, en gris pálido,
con la zona del grupo resaltada. O sea, un cuerpo que SEÑALA dónde está
el músculo.

**Lo que se quiere:** más minimalista, y **dibujar únicamente el grupo
muscular en vez de señalarlo sobre un cuerpo.** El pectoral como forma,
no un muñeco con el pecho pintado.

Es un cambio de enfoque, no un retoque: la silueta compartida entre las
7 láminas —que era la idea que hacía barato el generador— deja de tener
sentido, porque cada lámina pasa a ser una forma distinta y propia.

Lo que sí se conserva del trabajo del 3/09 y no hay que volver a
resolver:

- **La decisión de dibujarlas en vez de buscarlas.** Sigue en pie: 7
  láminas de terceros significan otra licencia y otra atribución.
- **El mecanismo de `mask-image`** y que el color salga de `--lamina`
  (regla 15). Es lo que las hace funcionar en claro y en oscuro con un
  solo archivo.
- **La estructura de la portada.** Lo que no convence es el dibujo, no la
  navegación por categorías.

El generador está en `herramientas/generar-laminas-grupos.py` y se
reescribe entero cuando se retome. El truco de la opacidad parcial
—cuerpo al 24%, zona al 100%— **ya no hace falta** si no hay cuerpo de
fondo: cada lámina sería una sola forma maciza, que además es lo que
"minimalista" quiere decir aquí.

---

## Estado (2 de septiembre de 2026)

**Fases 1 y 2 cerradas. Fase 3 a la mitad.** La app está publicada, con
base de datos real, acceso por cuenta, tres roles y la biblioteca de
ejercicios funcionando. Todo verificado contra producción, no en local
con datos falsos.

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
- **El catálogo de ejercicios y el panel del entrenador** (Fase 3).
  Crear, editar y archivar sin depender del desarrollo.
- **El bucket de imágenes protegido:** el admin sube, un cliente recibe
  `42501` si lo intenta. Verificado suplantando los dos roles.
- **59 pruebas** (`npm run test`). Seis existen para que nadie vuelva
  ilegal el formulario "simplificándolo", y dos para que nadie ponga un
  ® donde va un ©.
- **La versión a la vista** (`v0.3.0`) y el aviso de derechos en Perfil.
- **Botón de tema** claro/oscuro, con la elección guardada en el celular.
- En línea en `https://fitness-app-ivory-mu.vercel.app`. Cada push a
  `main` republica sola.

### Qué está conectado a la base y qué no

| Pantalla | Estado |
|---|---|
| Acceso, Activar, Mis datos | reales |
| Ejercicios (catálogo) y el panel del entrenador | reales |
| Perfil | real (nombre, rol, XP) — los logros siguen de mock |
| Recetas | real |
| Hoy | medio: el saludo es real, la rutina y la racha son mock |
| Progreso | mock |

`src/data/mock.js` **no se borra de golpe: se encoge.** La regla es que
cada vez que una pantalla se conecta, su parte se borra el mismo día. Ya
se fueron `RECETAS` (Fase 2) y `PROGRAMAS` (Fase 3 — ese no se conectó,
se borró: describía un modelo descartado). Faltan `RUTINA_DE_HOY` (Fase
4), `HISTORIAL` y `LOGROS` (Fase 5), `USUARIO` y `META_SEMANAL` (Fase 4).

### Pendientes que vienen de atrás

1. **CERRADO EL 4/09.** La app se probó en un Android real y pasó las
   tres comprobaciones: instala sin barra del navegador, el vidrio de la
   barra de abajo va fluido y el teclado no tapa el botón de entrar. No
   hay que tocar `nivelDetectado()`. Ver la entrada del 4/09.

   Queda una cola menor, sin urgencia: las dos pantallas nuevas —la
   carga masiva y la portada por grupo muscular— todavía no se han
   tocado en un celular de verdad.

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

4. **Los 30 ejercicios de producción tienen indicaciones INVENTADAS.**
   Encontrado el 3/09 al armar la plantilla. `04-ejemplo.sql` las marca
   como contenido de prueba, pero están en la base real y un visitante
   las lee: son consejos de técnica física que no escribió ningún
   entrenador y que la app presenta como si fueran de él.

   No se tocó desde el código a propósito — el contenido es dominio del
   entrenador (regla del 1/09).

   **RESUELTO EL 4/09: no se vacían.** Kev decidió que la URL no va a
   circular hasta que exista una versión más robusta, así que no hay
   nadie leyéndolas. Se reemplazan solas cuando él devuelva la hoja con
   las suyas. Ver la entrada del 4/09.

---

## Siguiente paso — la Fase 3 depende de UNA respuesta

**Ya no está bloqueada por construir nada.** La carga masiva existe y
está probada. Lo que falta es que el entrenador devuelva la hoja.

### Hecho y en producción

**2/09:** catálogo con buscador y filtros, panel del entrenador
(crear/editar/archivar), bucket `ejercicios` con sus políticas, versión
visible y `LICENSE`, ilustraciones en ejercicios y recetas.

**3/09:**
- **Manifest, iconos y service worker.** La app ya se instala de verdad
  en Android. Era el bug que el iPhone escondía.
- **Carga masiva** desde hoja de cálculo, con vista previa por fila.
  Detecta el separador, así que sirve pegando desde Excel o Sheets.
- **`plantilla-ejercicios.csv`**, la hoja ya llena para mandarle a él.
- **Portada por grupo muscular** en Ejercicios, con 7 láminas propias.
- **101 pruebas** (eran 71). Las 30 nuevas son de `hoja.js`.
- `v0.3.2`.

### Lo que hay que hacer, y no es código

**Mandarle `plantilla-ejercicios.csv` al entrenador**, con estas tres
cosas dichas (están largas en `PASOS-FASE-3.md`):

1. Que borre los que no usa y agregue los suyos.
2. **Que llene la columna `indicaciones`.** Es la única que no puede
   llenar nadie más y es lo que hace la app distinta de YouTube. Además
   resuelve el pendiente 4: hoy esas indicaciones son inventadas.
3. Que las fotos sean de él, de alguien que le dio permiso, o
   ilustraciones. **Nunca la foto de un cliente** — el bucket es público
   y la dirección se adivina.

### Lo que queda de la fase (~2 h)

**Compresión y subida de imágenes** (~2 h). A ~150 KB en el navegador
antes de mandarlas, emparejadas por nombre de archivo. Bloqueada por
tener imágenes.

### La prueba que cierra la fase

El entrenador pega su hoja y sus ejercicios quedan en la app. Un cliente
los ve, un visitante también, y ninguno de los dos puede editarlos.
Verificado suplantando los tres roles en el SQL Editor **y entrando a la
app con cada uno** — esa segunda mitad es la lección del 2/09: contar
filas dice que las políticas están bien, no que el código sepa usarlas.

Y una cuarta comprobación que ahora sí se puede hacer: **correr la carga
completa dos veces y que no se duplique nada.**

## Preguntas abiertas

- **Nombre de la app.** Provisional: "Entrena". El repo va como `fitness-app`
  y renombrarlo después en GitHub no rompe nada.
- **El artículo 12 del Decreto 1377** (datos de menores). Sin verificar.
- **Vercel y el uso no comercial.** Sin verificar.
- ¿El PDF del cuestionario entra al repo público o no? Recomendación: no.
- Cobertura de los nodos de Bunny en Colombia — se mide cuando llegue el
  video, no antes (Bunny está aplazado).
- **Latencia real desde Colombia.** Se midió 85 ms, pero desde fuera de
  Colombia hacia Virginia, que es el tramo equivocado. El que importa es
  Bogotá → Virginia y solo lo puede medir alguien que esté allá. Sigue
  abierta.

Resueltas: clientes (6 a 15 para arrancar, sin techo), videos (arranca con
imágenes), certificación de entrenador (en regla), alojar en EE. UU.
(legal, Circular 005 de 2017), **ilustraciones libres (sí, como relleno —
aprobadas por el entrenador el 2/09)**.

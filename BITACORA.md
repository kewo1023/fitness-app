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

## Estado

**Fase 1 terminada en código. Falta publicarla.**

Hecho el 1 de septiembre de 2026, después del cierre de la Fase 0:

- Proyecto Vite + React 18 funcionando. `npm run build` compila.
- `src/styles/theme.css` — la paleta completa, claro y oscuro. Ni un color
  literal fuera de ahí.
- `src/styles/app.css` — todos los estilos.
- `src/data/fechas.js` + `fechas.test.js` — **14 pruebas, todas pasan.**
- `src/data/mock.js` — datos falsos con nombres inventados. Se borra en la
  Fase 2.
- Cinco secciones y la barra de navegación de abajo.
- Verificado en el navegador a 375×812, en tema claro y oscuro, sin
  desbordamiento horizontal.

**Lo que falta de la Fase 1:** el repo en GitHub y el deploy en Vercel. Eso
dependen de cuentas propias, así que van a mano.

## Siguiente paso

1. **Probar en el Android de verdad.** Con `npm run dev` corriendo, el
   celular entra a `http://<IP-del-computador>:5173` estando en el mismo wifi.
   La IP se mira con `ipconfig getifaddr en0` y cambia al cambiar de red.
2. **Publicar:** git init, repo público en GitHub, conectar a Vercel.
3. **Fase 2**, que ya está desbloqueada: el esquema está cerrado.

**2026-09-01 — Fase 1 cerrada: publicada**
Repo público en `github.com/kewo1023/fitness-app`, en línea en
`https://fitness-app-ivory-mu.vercel.app`. Cada push a `main` republica sola.

El repo es público, así que todo el contexto personal y de negocio vive en
`CLAUDE.local.md`, fuera de git. El PDF del cuestionario también quedó fuera.
Regla: lo que no deba leer un tercero no entra al historial, porque el
historial de git no se limpia después.

**Pendiente de la Fase 1:** verla en un Android real. En iPhone se ve bien.
No bloquea la Fase 2, pero esa verificación no se puede dar por hecha.

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

## Decisiones cerradas hoy

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

## Preguntas abiertas

- **Nombre de la app.** Provisional: "Entrena". El repo va como `fitness-app`
  y renombrarlo después en GitHub no rompe nada.
- ¿El PDF del cuestionario entra al repo público o no? Recomendación: no.
  Está en `PASOS-FASE-1.md`.
- Cobertura de los nodos de Bunny en Colombia — se mide cuando llegue el
  video, no antes (Bunny está aplazado).

Resueltas el 1/09: clientes (6 a 15, el plan gratis sobra), videos (arranca
con imágenes), certificación de entrenador (en regla).

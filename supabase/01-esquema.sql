-- =====================================================================
-- 01-esquema.sql — las tablas.
-- =====================================================================
--
-- Cerrado el 1 de septiembre de 2026 con las respuestas del entrenador.
-- Se corre en el SQL Editor de Supabase. Se puede repetir sin romper
-- nada (todo lleva "if not exists").
--
-- Orden de los archivos: 01 este, 02 las políticas de RLS, 03 las
-- funciones, 04 los datos de ejemplo, 05 las vistas de analítica.
--
-- LA DECISIÓN QUE MANDA SOBRE TODO ESTE ARCHIVO:
-- el entrenador arma UNA RUTINA DISTINTA PARA CADA CLIENTE. No hay un
-- catálogo de programas al que la gente se inscribe. Por eso el plan
-- cuelga del cliente, no al revés.
--
-- Y por eso existen las PLANTILLAS: si tiene 15 clientes y cada uno
-- lleva su plan de 4 semanas, armar cada uno desde cero es más lento
-- que el PDF que usa hoy. La plantilla es el molde que copia y ajusta.
-- Sin eso, la app le hace perder tiempo en vez de ahorrárselo.
--
-- Analogía de Excel: la plantilla es la hoja modelo que duplicas para
-- cada cliente. Al duplicarla queda independiente — si después cambias
-- el modelo, las copias ya entregadas no se mueven. Eso es a propósito:
-- nadie quiere que a un cliente le cambie su rutina de ayer.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. QUIÉN ES QUIÉN
-- ---------------------------------------------------------------------

create table if not exists perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  -- TRES ROLES, no dos.
  --   visitante  se registró sin código. Ve el catálogo de ejercicios y
  --              el contenido marcado como público. No tiene plan.
  --   cliente    canjeó un código de invitación. Tiene plan, progreso,
  --              rachas y el botón de hablar con el entrenador.
  --   admin      el entrenador y el desarrollo. Ven todo.
  --
  -- El valor por defecto es el de MENOS permiso, a propósito: si algún
  -- día una fila se crea por un camino que no previmos, que entre por
  -- la puerta chiquita y no por la grande.
  rol           text not null default 'visitante'
                  check (rol in ('admin', 'cliente', 'visitante')),
  nombre        text not null,
  alias         text,          -- lo único que ven los demás en un reto
  xp            integer not null default 0,

  -- SEMILLA PARA CRECER. Hoy hay UN entrenador y dos admin que comparten
  -- todo, así que ninguna política de RLS mira esta columna todavía.
  -- Existe porque el día que entre un segundo entrenador, "admin ve
  -- todo" deja de servir y hay que pasar a "cada entrenador ve lo suyo".
  -- Si esa columna no existe desde el principio, ese día toca ADIVINAR
  -- qué cliente era de quién mirando fechas. Se llena desde ya en
  -- vincular_con_codigo (queda el admin que emitió el código) y no
  -- estorba mientras no se use.
  entrenador_id uuid references perfiles(id) on delete set null,

  creado_en     timestamptz not null default now()
);

-- DATOS SENSIBLES (Ley 1581). Tabla aparte a propósito: se puede borrar
-- sola cuando alguien ejerza su derecho de eliminación, sin tumbar la
-- cuenta ni el historial. TODAS las columnas son opcionales, porque la
-- ley obliga a que responder esto sea facultativo de verdad.
create table if not exists perfil_salud (
  perfil_id     uuid primary key references perfiles(id) on delete cascade,
  fecha_nac     date,
  peso_kg       numeric(5,2),
  altura_cm     integer,
  objetivo      text,
  lesiones      text,
  actualizado_en timestamptz not null default now()
);

create table if not exists consentimientos (
  id            bigint generated always as identity primary key,
  perfil_id     uuid not null references perfiles(id) on delete cascade,
  tipo          text not null
                  check (tipo in ('datos_personales','datos_sensibles',
                                  'descargo_ejercicio','notificaciones')),
  version       text not null,
  aceptado      boolean not null,
  fecha         timestamptz not null default now()
);

create table if not exists invitaciones (
  codigo        text primary key,
  creada_por    uuid not null references perfiles(id),
  usada_por     uuid references perfiles(id),
  expira_en     timestamptz not null,
  creada_en     timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. LA BIBLIOTECA DEL ENTRENADOR
-- ---------------------------------------------------------------------

-- Entre 80 y 150 ejercicios. A ese volumen, cargarlos uno por uno en un
-- formulario es media tarde perdida: en la Fase 3 va también una carga
-- masiva desde una hoja de cálculo.
create table if not exists ejercicios (
  id            bigint generated always as identity primary key,
  nombre        text not null,

  -- Él los agrupa por DOS ejes a la vez, no por uno. Van las dos
  -- columnas, no una sola inventada por mí.
  grupo         text not null,   -- pecho, espalda, pierna, hombro, core...
  movimiento    text,            -- empuje, jalón, sentadilla, bisagra,
                                 -- zancada, core, cardio

  -- Sus clientes entrenan en casa Y en gimnasio, así que el catálogo
  -- cubre los dos mundos. Es lo que permite filtrar "qué puede hacer
  -- este cliente con lo que tiene".
  equipo        text check (equipo in ('ninguno','mancuernas','banda',
                                       'barra','maquina','polea',
                                       'kettlebell','banco')),
  nivel         text check (nivel in ('principiante','intermedio','avanzado')),
  indicaciones  text,            -- las 2 o 3 correcciones que él repite

  -- ARRANCA CON IMAGEN, no con video. Decisión del entrenador: tiene
  -- algunos videos, pero prefiere ir reemplazando las imágenes poco a
  -- poco. Por eso video_id es opcional y la app tiene que verse bien
  -- sin él. Cuando llegue el video, se llena esta columna y ya.
  imagen_url    text,            -- Supabase Storage, bucket público
  video_id      text,            -- Bunny Stream. Null mientras no exista.

  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Una rutina es UNA sesión: "Pierna A", "Empuje 2". Es reutilizable:
-- la misma rutina puede aparecer en el plan de varios clientes.
create table if not exists rutinas (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  nivel         text check (nivel in ('principiante','intermedio','avanzado')),
  duracion_min  integer,
  notas         text,

  -- LA MUESTRA GRATIS. Una rutina pública la ve cualquiera que abra la
  -- app, sea cliente o no. El resto es solo para clientes.
  --
  -- Lo que se regala es la BIBLIOTECA; lo que se cobra es la
  -- PROGRAMACIÓN. El catálogo de ejercicios está en YouTube gratis: el
  -- valor del entrenador es qué haces tú, en qué orden y por cuánto
  -- tiempo, según cómo estás. Por eso el plan nunca es público.
  publica       boolean not null default false,

  creada_por    uuid references perfiles(id),
  creada_en     timestamptz not null default now()
);

create table if not exists rutina_ejercicios (
  id            bigint generated always as identity primary key,
  rutina_id     bigint not null references rutinas(id) on delete cascade,
  ejercicio_id  bigint not null references ejercicios(id),
  orden         integer not null,
  series        integer not null,
  reps          text not null,        -- texto: admite "12" y "8-10"
  descanso_seg  integer not null default 60,
  peso_sugerido numeric(6,2),         -- kg. Opcional: es una sugerencia.
  nota          text,
  unique (rutina_id, orden)
);


-- ---------------------------------------------------------------------
-- 3. PLANTILLAS — el molde que se copia
-- ---------------------------------------------------------------------
--
-- Esto NO es un catálogo público. El cliente nunca ve una plantilla.
-- Es una herramienta del entrenador para no armar 15 planes desde cero.

create table if not exists plantillas (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  semanas       integer not null default 4,   -- él trabaja en ciclos de 4
  nivel         text check (nivel in ('principiante','intermedio','avanzado')),
  dias_semana   integer,                       -- sugerencia, no regla
  notas         text,
  creada_en     timestamptz not null default now()
);

create table if not exists plantilla_dias (
  id            bigint generated always as identity primary key,
  plantilla_id  bigint not null references plantillas(id) on delete cascade,
  semana        integer not null,
  dia           integer not null check (dia between 1 and 7),
  rutina_id     bigint references rutinas(id),   -- null = día de descanso
  unique (plantilla_id, semana, dia)
);


-- ---------------------------------------------------------------------
-- 4. EL PLAN DE CADA CLIENTE
-- ---------------------------------------------------------------------
--
-- Aquí vive "cada uno la suya". Un plan pertenece a UN cliente y se
-- edita libremente sin tocar a nadie más.

create table if not exists planes (
  id            bigint generated always as identity primary key,
  cliente_id    uuid not null references perfiles(id) on delete cascade,
  nombre        text not null,
  semanas       integer not null default 4,

  -- date, no timestamptz: es "el día que arranca" en Bogotá, no un
  -- instante exacto. Ver src/data/fechas.js.
  inicio        date not null,

  -- Los días a la semana VARÍAN según el cliente, así que la meta de la
  -- racha no puede ser un número fijo en el código: vive aquí, y cada
  -- cliente tiene el suyo.
  meta_semanal  integer not null default 3,

  -- De qué plantilla salió. Solo para saberlo; si la plantilla cambia
  -- después, este plan NO se mueve.
  desde_plantilla bigint references plantillas(id),

  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

create table if not exists plan_dias (
  id            bigint generated always as identity primary key,
  plan_id       bigint not null references planes(id) on delete cascade,
  semana        integer not null,
  dia           integer not null check (dia between 1 and 7),
  rutina_id     bigint references rutinas(id),   -- null = descanso
  unique (plan_id, semana, dia)
);

-- Un cliente solo puede tener un plan activo a la vez. Sin esto, la
-- pantalla de "Hoy" no sabría cuál de los dos mostrar.
create unique index if not exists un_plan_activo_por_cliente
  on planes (cliente_id) where activo;


-- ---------------------------------------------------------------------
-- 5. LO QUE HACE EL CLIENTE
-- ---------------------------------------------------------------------

create table if not exists sesiones (
  id            bigint generated always as identity primary key,
  cliente_id    uuid not null references perfiles(id) on delete cascade,
  plan_dia_id   bigint references plan_dias(id),
  rutina_id     bigint references rutinas(id),

  -- El instante real, en UTC. Para saber QUÉ DÍA fue se convierte a
  -- America/Bogota al consultar. Nunca se guarda la fecha ya
  -- convertida: si mañana cambia la regla, lo viejo quedaría mal.
  iniciada_en   timestamptz not null default now(),
  terminada_en  timestamptz,
  completada    boolean not null default false
);

-- El entrenador SÍ quiere peso y repeticiones por serie. Esta tabla se
-- llena mientras la persona entrena, con el celular en la mano y sudado:
-- la pantalla que escribe aquí tiene que funcionar a un toque.
create table if not exists series_registradas (
  id            bigint generated always as identity primary key,
  sesion_id     bigint not null references sesiones(id) on delete cascade,
  ejercicio_id  bigint not null references ejercicios(id),
  serie         integer not null,
  reps          integer,

  -- Sobre numeric y JavaScript, porque la advertencia que había aquí
  -- estaba mal y se comprobó el 2/09 contra la base real:
  --
  -- Por la API de Supabase (PostgREST) un numeric llega como NÚMERO de
  -- verdad: 74.5, no "74.50". Se puede sumar directo. Lo que sí devuelve
  -- texto es conectarse a Postgres con el driver de Node, que no es el
  -- caso de esta app.
  --
  -- Lo que sigue siendo cierto: numeric guarda decimales exactos y los
  -- números de JavaScript no. Para pesos y repeticiones da igual; el día
  -- que se sumen cientos de valores para una estadística, la suma se
  -- hace en SQL (que es donde va la analítica de este proyecto) y no
  -- arrastrando decimales en el navegador.
  peso_kg       numeric(6,2),

  unique (sesion_id, ejercicio_id, serie)
);


-- ---------------------------------------------------------------------
-- 6. RECETAS  (contenido GENÉRICO, igual para todos)
-- ---------------------------------------------------------------------
--
-- Ninguna tabla conecta un plan de comida con un cliente, y es
-- deliberado: en Colombia el plan alimentario individual es función
-- reservada al nutricionista-dietista con tarjeta (Ley 73 de 1979).
--
-- El entrenador SÍ conoce a un nutricionista con tarjeta. Si esa
-- persona entra al proyecto y firma el contenido, la personalización
-- vuelve al alcance y se agrega aquí. Hasta que eso pase por escrito,
-- esta sección se queda genérica. Ver CLAUDE.md, sección PARAR.

create table if not exists recetas (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  momento       text,
  porciones     integer,
  ingredientes  jsonb not null default '[]'::jsonb,
  pasos         text,
  foto_url      text,
  publica       boolean not null default false   -- visible sin ser cliente
);

create table if not exists planes_comida (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  objetivo      text,
  publicado     boolean not null default false
);

create table if not exists plan_comida_dias (
  id            bigint generated always as identity primary key,
  plan_id       bigint not null references planes_comida(id) on delete cascade,
  dia           integer not null check (dia between 1 and 7),
  momento       text not null,
  receta_id     bigint not null references recetas(id)
);


-- ---------------------------------------------------------------------
-- 7. GAMIFICACIÓN
-- ---------------------------------------------------------------------
--
-- El XP vive en perfiles.xp. La RACHA no se guarda: se CALCULA con una
-- consulta sobre sesiones, contra planes.meta_semanal de ese cliente.
-- Guardarla obligaría a recalcularla cada noche con un trabajo
-- programado, y el día que ese trabajo falle el número queda mal para
-- siempre. Calculada, siempre es correcta.

create table if not exists logros_obtenidos (
  id            bigint generated always as identity primary key,
  cliente_id    uuid not null references perfiles(id) on delete cascade,
  logro         text not null,
  fecha         timestamptz not null default now(),
  visto         boolean not null default false,
  unique (cliente_id, logro)
);

create table if not exists retos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  descripcion   text,
  inicio        date not null,
  fin           date not null,
  meta_sesiones integer
);

-- Participar es OPT-IN. Sin fila aquí, el cliente no sale en ninguna
-- tabla de posiciones: mostrar la actividad física de una persona a las
-- demás sin autorización es dato sensible circulando sin permiso.
create table if not exists reto_participantes (
  reto_id       bigint not null references retos(id) on delete cascade,
  cliente_id    uuid not null references perfiles(id) on delete cascade,
  visible       boolean not null default false,
  primary key (reto_id, cliente_id)
);


-- ---------------------------------------------------------------------
-- 8. ÍNDICES
-- ---------------------------------------------------------------------
-- Las consultas que la app hace todo el tiempo. Sin esto Postgres lee
-- la tabla entera cada vez; con 15 clientes no se nota, pero cuestan
-- una línea cada uno.

create index if not exists ix_sesiones_cliente
  on sesiones (cliente_id, iniciada_en desc);
create index if not exists ix_series_sesion
  on series_registradas (sesion_id);
create index if not exists ix_plan_dias_plan
  on plan_dias (plan_id, semana, dia);
create index if not exists ix_rutina_ejercicios
  on rutina_ejercicios (rutina_id, orden);

-- NOMBRES ÚNICOS EN LA BIBLIOTECA.
-- Dos ejercicios llamados igual no son un caso raro que haya que
-- permitir: son un error de captura. Y con 80 a 150 ejercicios cargados
-- desde una hoja de cálculo (Fase 3), el error va a pasar seguro.
--
-- Además es lo que hace que la carga masiva se pueda REPETIR sin
-- duplicar: si se cae a la mitad, se vuelve a correr el archivo entero
-- y las filas que ya estaban simplemente se ignoran. Sin esto, correr
-- dos veces deja la biblioteca duplicada y toca limpiarla a mano.
create index if not exists ix_rutinas_publicas on rutinas (id) where publica;
create index if not exists ix_recetas_publicas on recetas (id) where publica;

create unique index if not exists ux_ejercicios_nombre on ejercicios (nombre);
create unique index if not exists ux_rutinas_nombre    on rutinas (nombre);
create unique index if not exists ux_plantillas_nombre on plantillas (nombre);
create unique index if not exists ux_recetas_nombre    on recetas (nombre);


-- =====================================================================
-- LO QUE FALTA, en su propio archivo:
--   02-politicas.sql  RLS en las 19 tablas. Sin esto la base está
--                     abierta: NO usar con datos reales hasta correrlo.
--   03-funciones.sql  crear_invitacion, vincular_con_codigo,
--                     clonar_plantilla(plantilla, cliente, inicio),
--                     sumar_xp.
--   04-ejemplo.sql    datos de prueba con nombres inventados.
--   05-analitica.sql  las vistas del panel del entrenador: adherencia
--                     por cliente, retención semanal, ejercicios más
--                     saltados. Es la capa que le sirve al entrenador.
-- =====================================================================

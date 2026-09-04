-- =====================================================================
-- 08-analitica.sql — la capa de analítica. Fase 5.
-- =====================================================================
--
-- ARCHIVO NUEVO. Del 01 al 07 ya se corrieron contra producción y no se
-- editan: si el repositorio y la base dejan de coincidir, nadie sabe
-- cuál manda. Ver CLAUDE.md, "cómo retomar", paso 4.
--
-- Es repetible: se puede correr dos veces sin romper nada.
--
-- =====================================================================
-- POR QUÉ ESTO ESTÁ EN SQL Y NO EN JAVASCRIPT
-- =====================================================================
--
-- Es la decisión del 31/08 y la que CLAUDE.md marca como "la que no se
-- sacrifica cuando falte tiempo". La razón práctica:
--
-- Para saber la adherencia de 15 clientes en las últimas 4 semanas, el
-- navegador tendría que descargarse TODAS las sesiones de TODOS los
-- clientes y contarlas con bucles. Son datos de salud de terceros
-- viajando a un celular para producir un número de dos dígitos. Aquí
-- viaja el número.
--
-- Analogía de Excel: es la diferencia entre copiar la base entera a una
-- hoja nueva para poder hacer un SUMAR.SI, y tener una tabla dinámica
-- que lee la fuente donde está. La segunda no duplica el dato.
--
-- =====================================================================
-- LA TRAMPA DE ESTE ARCHIVO: LAS VISTAS SE SALTAN EL RLS
-- =====================================================================
--
-- Es la tercera trampa de esta base, hermana de las dos que documenta
-- 02-politicas.sql, y la más peligrosa de las tres porque no da ningún
-- error: simplemente entrega de más.
--
-- Una vista en Postgres corre, por defecto, con los permisos de QUIEN
-- LA CREÓ, no de quien la consulta. Como esto se corre desde el SQL
-- Editor —o sea como dueño de la base—, una vista sobre `sesiones`
-- escrita a la ligera le entregaría a CUALQUIER cliente autenticado las
-- sesiones de todos los demás. Las políticas del archivo 02 seguirían
-- ahí, perfectas, y no se aplicarían: la vista pregunta con otra
-- credencial.
--
-- `with (security_invoker = on)` es lo que lo cierra: la vista consulta
-- con los permisos de QUIEN LA LLAMA, así que el RLS de las tablas de
-- abajo se aplica igual que si el cliente hubiera escrito el select a
-- mano. Es una palabra y es la diferencia entre una app con permisos y
-- una app con permisos decorativos.
--
-- Requiere PostgreSQL 15 o superior. Si esta base fuera anterior, este
-- archivo FALLA al correrlo con un error explícito — que es justo lo
-- que se quiere. Falla cerrado, no abierto.
--
-- CONSECUENCIA, y es la regla 13 de CLAUDE.md otra vez: como el RLS se
-- aplica de verdad, para un ADMIN estas vistas devuelven las filas de
-- TODOS sus clientes. Toda consulta del navegador contra ellas lleva su
-- `.eq('cliente_id', ...)` explícito. RLS decide qué se PUEDE ver, no
-- qué se QUIERE ver.
--
-- =====================================================================
-- LA OTRA REGLA QUE ATRAVIESA TODO EL ARCHIVO: LA HORA DE BOGOTÁ
-- =====================================================================
--
-- La base guarda instantes en UTC. "Qué día fue" solo tiene respuesta
-- después de convertir a `America/Bogota`, y esa conversión se escribe
-- `(instante at time zone 'America/Bogota')`. Es el equivalente exacto
-- de `diaEnBogota()` en `src/data/fechas.js`, y existe por la regla 5:
-- una sesión terminada un lunes a las 8 p.m. en Bogotá quedó guardada
-- como martes en UTC. Contada en UTC, cae en la semana siguiente y le
-- rompe la racha a alguien que sí entrenó.
--
-- Y una sesión cuenta el día en que se TERMINÓ, no en que se empezó.
-- Si `terminada_en` está vacío se usa `iniciada_en`, que es lo más
-- cercano a la verdad que hay. Mismo criterio que la pantalla de Hoy.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. EL CATÁLOGO DE LOGROS
-- ---------------------------------------------------------------------
--
-- `logros_obtenidos` (archivo 01) guarda QUÉ logro consiguió alguien,
-- como texto. No guarda cómo se llama ese logro ni qué significa, y sin
-- eso la pantalla tendría que traducir 'diez_sesiones' a "Diez
-- sesiones" con una lista escrita en el JavaScript.
--
-- Esa lista en el código sería una segunda verdad: la base otorga los
-- logros y el navegador decidiría cómo se llaman. El día que se agregue
-- uno habría que tocar dos sitios, y el día que alguien se olvide de
-- uno, un cliente vería una clave técnica en su perfil.
--
-- Tabla 20 de la base. Es la primera que se agrega desde que se cerró
-- el esquema el 1/09.

create table if not exists logros_catalogo (
  clave       text primary key,
  nombre      text not null,
  descripcion text not null,
  -- El orden en que se muestran. No es alfabético a propósito: van de
  -- lo que se consigue el primer día a lo que cuesta un mes, para que
  -- la lista se lea como un camino y no como un inventario.
  orden       integer not null default 0
);

alter table logros_catalogo enable row level security;

-- Lo puede leer cualquiera que haya entrado, incluido el visitante: son
-- las reglas del juego, no el dato de nadie. Escribir, solo el admin.
drop policy if exists logros_catalogo_select on logros_catalogo;
create policy logros_catalogo_select on logros_catalogo
  for select to authenticated using (true);

drop policy if exists logros_catalogo_admin on logros_catalogo;
create policy logros_catalogo_admin on logros_catalogo
  for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));


-- Los seis logros. `primera_sesion` conserva EXACTAMENTE esa clave
-- porque es la que ya viene insertando el trigger `otorgar_xp` desde el
-- archivo 03: cambiarle el nombre dejaría huérfanas las filas que ya
-- existen en la base de producción.
--
-- El `on conflict ... do update` deja corregir un texto volviendo a
-- correr el archivo, sin duplicar nada.
insert into logros_catalogo (clave, nombre, descripcion, orden) values
  ('primera_sesion',  'La primera',
   'Completaste tu primer entrenamiento.', 1),
  ('semana_cumplida', 'Semana cerrada',
   'Cumpliste tu meta de una semana completa.', 2),
  ('diez_sesiones',   'Diez sesiones',
   'Diez entrenamientos completados.', 3),
  ('madrugador',      'Madrugador',
   'Terminaste un entrenamiento antes de las 6 de la mañana.', 4),
  ('mes_completo',    'Mes completo',
   'Cuatro semanas seguidas cumpliendo tu meta.', 5),
  ('plan_terminado',  'Plan terminado',
   'Cumpliste todas las semanas de un plan.', 6)
on conflict (clave) do update
  set nombre      = excluded.nombre,
      descripcion = excluded.descripcion,
      orden       = excluded.orden;


-- ---------------------------------------------------------------------
-- 1. LAS TRES VISTAS DEL CLIENTE
-- ---------------------------------------------------------------------
--
-- Se borran antes de crearse, en orden inverso a como dependen unas de
-- otras, por la misma razón que las políticas del archivo 02: para que
-- correr el archivo dos veces dé el mismo resultado que correrlo una.

drop view if exists v_resumen_cliente;
drop view if exists v_semanas_cliente;
drop view if exists v_sesiones_cliente;


-- EL HISTORIAL. Una fila por sesión, con lo que la pantalla necesita
-- mostrar y nada más.
--
-- La duración se calcula aquí y no en el navegador porque es una resta
-- entre dos instantes, y las restas entre instantes hechas en
-- JavaScript son exactamente donde se cuelan los errores de zona
-- horaria. Aquí la hace Postgres, que sabe de instantes.
--
-- Sale en minutos enteros: mostrar "47,3 minutos" sería fingir una
-- precisión que a nadie le sirve.
create view v_sesiones_cliente
with (security_invoker = on) as
select
  s.id,
  s.cliente_id,
  s.completada,
  s.iniciada_en,
  s.terminada_en,
  -- El día en hora de Bogotá. Esto es `diaEnBogota()` en SQL.
  (coalesce(s.terminada_en, s.iniciada_en)
     at time zone 'America/Bogota')::date            as fecha,
  -- La duración REAL. Es el dato que justifica que empezar y terminar
  -- sean dos botones y no uno (ver Hoy.jsx): con un solo botón de "ya
  -- lo hice", las dos columnas serían iguales y esto sería siempre 0.
  case
    when s.terminada_en is null then null
    else greatest(0, round(
      extract(epoch from (s.terminada_en - s.iniciada_en)) / 60
    )::int)
  end                                                as minutos,
  s.rutina_id,
  r.nombre                                           as rutina
from sesiones s
left join rutinas r on r.id = s.rutina_id;

comment on view v_sesiones_cliente is
  'Historial de entrenamientos. RLS de sesiones aplica (security_invoker).';


-- LA SEMANA. Es la vista de la que cuelga todo lo demás: la racha, los
-- logros de constancia y el panel del entrenador salen de aquí.
--
-- POR QUÉ SE CUENTAN DÍAS DISTINTOS Y NO SESIONES. `meta_semanal` son
-- "los días a la semana que entrena esta persona" (bitácora, 1/09). Dos
-- entrenamientos el mismo martes son UN día cumplido, no dos. Contando
-- filas, alguien que entrena dos veces un día llegaría a su meta de 3
-- en dos días. Es el mismo `Set` de `rachaSemanal()` en `plan.js`, que
-- en Excel sería quitar duplicados antes de contar.
--
-- LA SEMANA EMPIEZA EL LUNES. `date_trunc('week', ...)` en Postgres
-- corta en lunes, igual que `inicioSemanaBogota()`. Las dos mitades de
-- la app tienen que cortar la semana en el mismo sitio o la racha que
-- muestra el celular y la que ve el entrenador van a discrepar un día
-- de cada siete.
--
-- LA META SALE DEL PLAN AL QUE PERTENECE LA SESIÓN, nunca de una
-- constante. Varía por cliente (bitácora, 1/09). Una sesión suelta
-- —sin `plan_dia_id`— no trae meta, y entonces esa semana no puede
-- estar "cumplida": no había nada que cumplir.
create view v_semanas_cliente
with (security_invoker = on) as
select
  cliente_id,
  lunes,
  dias,
  meta,
  meta is not null and dias >= meta as cumplida
from (
  select
    s.cliente_id,
    date_trunc('week',
      (coalesce(s.terminada_en, s.iniciada_en)
         at time zone 'America/Bogota'))::date                as lunes,
    count(distinct (coalesce(s.terminada_en, s.iniciada_en)
         at time zone 'America/Bogota')::date)                as dias,
    max(p.meta_semanal)                                       as meta
  from sesiones s
  left join plan_dias pd on pd.id = s.plan_dia_id
  left join planes    p  on p.id  = pd.plan_id
  where s.completada
  group by 1, 2
) t;

comment on view v_semanas_cliente is
  'Días entrenados por semana de calendario (lunes, hora de Bogotá) contra la meta del plan.';


-- EL RESUMEN. Los tres números grandes de la pantalla de Progreso.
--
-- Se hace en la base y no sumando el historial en el navegador porque
-- el día que alguien lleve 400 sesiones, la pantalla no tiene por qué
-- descargarlas todas para escribir "400".
create view v_resumen_cliente
with (security_invoker = on) as
select
  cliente_id,
  count(*)                                  as entrenamientos,
  coalesce(sum(minutos), 0)::int            as minutos,
  min(fecha)                                as primera,
  max(fecha)                                as ultima
from v_sesiones_cliente
where completada
group by cliente_id;

comment on view v_resumen_cliente is
  'Totales de por vida por cliente: entrenamientos, minutos, primera y última fecha.';


-- Las vistas necesitan permiso de lectura igual que las tablas. El RLS
-- de abajo es el que decide QUÉ filas; esto solo abre la puerta.
grant select on v_sesiones_cliente to authenticated;
grant select on v_semanas_cliente  to authenticated;
grant select on v_resumen_cliente  to authenticated;


-- ---------------------------------------------------------------------
-- 2. LOS LOGROS LOS DA LA BASE, IGUAL QUE EL XP
-- ---------------------------------------------------------------------
--
-- Mismo argumento que el XP en el archivo 03: todo lo que corre en el
-- navegador lo puede reescribir quien tenga el navegador. Un logro que
-- se otorgue con una llamada desde la app es un logro que cualquiera se
-- regala con la consola abierta.
--
-- POR QUÉ ES UN TRIGGER APARTE Y NO SE AMPLÍA `otorgar_xp`. Porque
-- `otorgar_xp` vive en el archivo 03, que ya se corrió. Reescribirlo
-- desde aquí dejaría dos versiones de la misma función en el
-- repositorio —una en cada archivo— y la siguiente sesión no sabría
-- cuál está corriendo. Un trigger nuevo no toca nada de lo anterior.
--
-- `primera_sesion` se queda donde está, en `otorgar_xp`. Esta función
-- no la vuelve a otorgar: el índice único de `logros_obtenidos` lo
-- impediría de todos modos, pero además no hace falta intentarlo.

create or replace function otorgar_logros()
returns trigger
language plpgsql
security definer                 -- necesita mirar TODAS las sesiones de
                                 -- este cliente para contar, y escribir
                                 -- en logros_obtenidos
set search_path = public, pg_temp
as $$
declare
  v_hechas    int;
  v_seguidas  int;
  v_hora      int;
  v_plan      planes;
  v_cumplidas int;
begin
  -- Solo en el CAMBIO a completada, igual que el XP. Sin esta
  -- condición, cada guardado de una sesión ya completada volvería a
  -- recorrer el historial entero para nada.
  if not (new.completada and (tg_op = 'INSERT' or not old.completada)) then
    return new;
  end if;

  ------------------------------------------------------------------
  -- REGLA 13 EN VERSIÓN SQL, y aquí es MÁS importante que en el
  -- navegador. Esta función es `security definer`: corre como dueño de
  -- la base, así que el RLS no la recorta y las vistas de arriba le
  -- entregan TODAS las filas de TODOS los clientes. Cada consulta lleva
  -- su `cliente_id = new.cliente_id` escrito. Sin eso, el primer
  -- cliente que termine un entrenamiento le regala logros a los otros
  -- catorce.
  ------------------------------------------------------------------

  -- DIEZ SESIONES ---------------------------------------------------
  select count(*) into v_hechas
    from sesiones
   where cliente_id = new.cliente_id and completada;

  if v_hechas >= 10 then
    insert into logros_obtenidos (cliente_id, logro)
    values (new.cliente_id, 'diez_sesiones')
    on conflict (cliente_id, logro) do nothing;
  end if;

  -- MADRUGADOR ------------------------------------------------------
  -- La hora en Bogotá, no en UTC. En UTC las 5 a.m. de Bogotá son las
  -- 10 a.m. y este logro no se lo ganaría nadie nunca.
  v_hora := extract(hour from (
    coalesce(new.terminada_en, new.iniciada_en) at time zone 'America/Bogota'
  ));
  if v_hora < 6 then
    insert into logros_obtenidos (cliente_id, logro)
    values (new.cliente_id, 'madrugador')
    on conflict (cliente_id, logro) do nothing;
  end if;

  -- SEMANA CUMPLIDA y MES COMPLETO ----------------------------------
  --
  -- Las dos salen de contar rachas de semanas seguidas, así que se
  -- calcula una vez. Esto es el truco clásico de "islas" en SQL:
  --
  -- Se numeran las semanas cumplidas por orden (1, 2, 3...) y a cada
  -- lunes se le resta su número por 7. Si las semanas son consecutivas,
  -- esa resta da SIEMPRE el mismo valor, porque las dos cosas avanzan
  -- de siete en siete. En cuanto hay un hueco, el valor cambia. Después
  -- basta agrupar por ese valor y la racha más larga es el grupo más
  -- grande.
  --
  -- En Excel sería la columna auxiliar que uno agrega al lado para
  -- poder contar rachas con un CONTAR.SI: no aporta información nueva,
  -- solo le da un nombre común a las filas que van juntas.
  select coalesce(max(seguidas), 0) into v_seguidas
    from (
      select count(*) as seguidas
        from (
          select lunes - ((row_number() over (order by lunes))::int * 7) as isla
            from v_semanas_cliente
           where cliente_id = new.cliente_id      -- regla 13
             and cumplida
        ) islas
       group by isla
    ) rachas;

  if v_seguidas >= 1 then
    insert into logros_obtenidos (cliente_id, logro)
    values (new.cliente_id, 'semana_cumplida')
    on conflict (cliente_id, logro) do nothing;
  end if;

  if v_seguidas >= 4 then
    insert into logros_obtenidos (cliente_id, logro)
    values (new.cliente_id, 'mes_completo')
    on conflict (cliente_id, logro) do nothing;
  end if;

  -- PLAN TERMINADO --------------------------------------------------
  --
  -- "Terminar un plan" es cumplir la meta en TODAS sus semanas, no
  -- dejar que se acabe el calendario. Alguien que abandonó en la semana
  -- 2 y volvió el último día no terminó nada, y un logro que se
  -- consigue dejando pasar el tiempo no es un logro.
  --
  -- Se cuentan las semanas cumplidas desde el lunes de la fecha de
  -- inicio del plan. `plan_dias` guarda día de la semana, así que las
  -- semanas del plan son semanas de calendario — es la misma decisión
  -- que documenta `plan.js` y por eso las dos cuentas coinciden.
  select p.* into v_plan
    from planes p
    join plan_dias pd on pd.plan_id = p.id
   where pd.id = new.plan_dia_id
     and p.cliente_id = new.cliente_id;          -- regla 13

  if found then
    select count(*) into v_cumplidas
      from v_semanas_cliente
     where cliente_id = new.cliente_id           -- regla 13
       and cumplida
       and lunes >= date_trunc('week', v_plan.inicio)::date;

    if v_cumplidas >= v_plan.semanas then
      insert into logros_obtenidos (cliente_id, logro)
      values (new.cliente_id, 'plan_terminado')
      on conflict (cliente_id, logro) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Se llama `tr_logros_sesion` y no `tr_sesion_logros` por una razón
-- práctica: Postgres dispara los triggers de una tabla en orden
-- alfabético, así que este corre ANTES que `tr_xp_sesion`. Hoy da igual
-- —ninguno de los dos lee lo que escribe el otro— pero el día que un
-- logro dependa del XP, el orden ya está donde tiene que estar.
drop trigger if exists tr_logros_sesion on sesiones;
create trigger tr_logros_sesion
  after insert or update on sesiones
  for each row execute function otorgar_logros();


-- ---------------------------------------------------------------------
-- 3. EL PANEL DEL ENTRENADOR
-- ---------------------------------------------------------------------
--
-- Estas tres SÍ son `security definer`, al revés que los constructores
-- del archivo 07, y la diferencia importa: cruzan datos de VARIOS
-- clientes en un solo número. Un `es_admin()` interno es lo único que
-- las separa de ser una fuga.
--
-- Por eso las tres empiezan igual: comprobando quién llama. Es la regla
-- de oro del archivo 03 — una función `security definer` sin esa
-- comprobación es una puerta trasera, no una función.
--
-- POR QUÉ NO SE RESOLVIÓ CON VISTAS. Una vista con `security_invoker`
-- ya le entrega al admin las filas de todos (sus políticas terminan en
-- `or es_admin()`), así que habría funcionado. Se prefirió una función
-- por dos motivos: el mensaje de error es una frase en español en vez
-- de un resultado vacío inexplicable, y el parámetro `p_semanas` deja
-- pedir cuatro o doce semanas sin escribir dos vistas.


-- ADHERENCIA — la función que él pidió sin pedirla.
--
-- La bitácora del 1/09 lo dejó escrito: "No se entera de si sus
-- clientes entrenan; pregunta 2 o 3 veces por semana". Esto es esa
-- pregunta, respondida sola.
--
-- El número que importa no es cuántas sesiones hizo, es CUÁNTAS DE LAS
-- QUE LE TOCABAN. 8 sesiones con meta 2 es sobrado; 8 con meta 5 es la
-- mitad. Por eso se devuelve el porcentaje contra su propia meta y no
-- un conteo suelto, que compararía a gente con planes distintos.
create or replace function adherencia_clientes(p_semanas int default 4)
returns table (
  cliente_id     uuid,
  nombre         text,
  meta_semanal   int,
  semanas        int,
  dias_hechos    int,
  dias_esperados int,
  adherencia     int,      -- 0 a 100
  ultima         date,
  dias_sin_venir int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_desde date;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede ver el panel de sus clientes.';
  end if;
  if p_semanas < 1 or p_semanas > 52 then
    raise exception 'Las semanas tienen que estar entre 1 y 52.';
  end if;

  -- El lunes desde el que se mide, en hora de Bogotá. `p_semanas - 1`
  -- porque la semana en curso cuenta: pedir "4 semanas" un miércoles
  -- son las tres cerradas más la que va corriendo, que es lo que él
  -- quiere mirar. Contar 4 cerradas escondería justo la semana sobre la
  -- que puede hacer algo todavía.
  v_desde := date_trunc('week', (now() at time zone 'America/Bogota'))::date
             - ((p_semanas - 1) * 7);

  return query
  with clientes as (
    -- Solo los que tienen plan ACTIVO. Un cliente sin plan no está
    -- incumpliendo nada: no le han dado qué cumplir, y mezclarlo con
    -- los demás pondría un 0% que no significa lo que parece.
    select pe.id, pe.nombre as nom, pl.meta_semanal as meta
      from perfiles pe
      join planes  pl on pl.cliente_id = pe.id and pl.activo
     where pe.rol = 'cliente'
  ),
  hechos as (
    select v.cliente_id as cid,
           coalesce(sum(v.dias), 0)::int as dias,
           max(v.lunes)                  as ultimo_lunes
      from v_semanas_cliente v
     where v.lunes >= v_desde
     group by v.cliente_id
  ),
  ultimas as (
    select s.cliente_id as cid, max(s.fecha) as ultima
      from v_sesiones_cliente s
     where s.completada
     group by s.cliente_id
  )
  select
    c.id,
    c.nom,
    c.meta,
    p_semanas,
    coalesce(h.dias, 0)::int,
    (c.meta * p_semanas)::int,
    -- Se recorta a 100. Alguien que entrena de más cumplió su plan al
    -- 100%, no al 140%: la adherencia mide si hizo lo suyo, no cuánto
    -- se pasó. Y un 140% en una tabla se lee como un error de la app.
    least(100, floor(
      coalesce(h.dias, 0)::numeric * 100 / nullif(c.meta * p_semanas, 0)
    ))::int,
    u.ultima,
    -- Días sin entrenar. Es el número que de verdad le sirve para saber
    -- a quién escribirle hoy: una adherencia del 60% no dice si dejó de
    -- venir ayer o hace tres semanas.
    case when u.ultima is null then null
         else ((now() at time zone 'America/Bogota')::date - u.ultima)
    end
  from clientes c
  left join hechos  h on h.cid = c.id
  left join ultimas u on u.cid = c.id
  -- Primero el que lleva más tiempo sin aparecer: el orden de la lista
  -- es el orden en que tiene que llamarlos. Los que nunca entrenaron
  -- (`ultima` nula) van de primeros, que es donde deben estar.
  order by u.ultima asc nulls first, c.nom;
end;
$$;


-- RETENCIÓN — cuánta gente sigue viniendo, semana a semana.
--
-- Es la única de las tres que no habla de personas sino de la app. La
-- adherencia dice si Camilo entrena; esto dice si el proyecto está
-- funcionando o si la gente lo abre dos semanas y desaparece.
--
-- Devuelve una fila por semana, incluso las que nadie entrenó: una
-- semana en cero es exactamente el dato que hay que ver, y si se
-- omitiera la fila el hueco pasaría desapercibido.
create or replace function retencion_semanal(p_semanas int default 8)
returns table (
  lunes    date,
  activos  int,
  sesiones int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_desde date;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede ver el panel de sus clientes.';
  end if;
  if p_semanas < 1 or p_semanas > 52 then
    raise exception 'Las semanas tienen que estar entre 1 y 52.';
  end if;

  v_desde := date_trunc('week', (now() at time zone 'America/Bogota'))::date
             - ((p_semanas - 1) * 7);

  return query
  -- `generate_series` fabrica los lunes uno por uno. Es lo que garantiza
  -- que las semanas vacías aparezcan: la lista de semanas sale del
  -- calendario, no de los datos.
  select
    g::date,
    coalesce(count(distinct v.cliente_id), 0)::int,
    coalesce(sum(v.dias), 0)::int
  from generate_series(
         v_desde,
         date_trunc('week', (now() at time zone 'America/Bogota'))::date,
         '7 days'::interval
       ) g
  left join v_semanas_cliente v on v.lunes = g::date
  group by g
  order by g;
end;
$$;


-- HORAS TÍPICAS — a qué hora entrena la gente. SIN NOMBRES.
--
-- Y esa ausencia es la función entera, no un detalle.
--
-- La autorización que firman los clientes cubre que el entrenador vea
-- su PROGRESO. La hora a la que alguien entra al gimnasio cada día es
-- otra cosa: es una rutina de vida, un dato de comportamiento, y
-- decirle a alguien "sé que entrenas a las 5:40 a.m." no le ayuda a
-- programar mejor a nadie.
--
-- Agregado sí sirve, y sirve igual: si la mitad de sus clientes entrena
-- de noche, sabe cuándo mandar el recordatorio de la Fase 7. Eso se
-- responde sin saber quién es cada uno.
--
-- Por eso devuelve franjas y conteos, y ninguna columna que identifique
-- a nadie. Si algún día aparece aquí un `cliente_id`, esta decisión se
-- rompió.
create or replace function horas_tipicas()
returns table (
  franja   text,
  desde    int,
  sesiones int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede ver el panel de sus clientes.';
  end if;

  return query
  with franjas(nombre, ini, fin) as (
    values ('Madrugada', 4, 8),
           ('Mañana',    8, 12),
           ('Tarde',    12, 18),
           ('Noche',    18, 23)
  ),
  horas as (
    select extract(hour from (
             coalesce(s.terminada_en, s.iniciada_en)
               at time zone 'America/Bogota'
           ))::int as h
      from sesiones s
     where s.completada
  )
  select f.nombre, f.ini,
         count(h.h)::int
    from franjas f
    left join horas h on h.h >= f.ini and h.h < f.fin
   group by f.nombre, f.ini
   order by f.ini;
end;
$$;


-- LA CUARTA MÉTRICA QUE FALTA, dicha en vez de callada.
--
-- `CLAUDE.md` pide cuatro: adherencia, retención, hora típica y
-- **ejercicios más saltados**. Las tres primeras están arriba; la
-- cuarta no, y no es un olvido.
--
-- Saber qué ejercicio se salta la gente exige comparar lo PROGRAMADO
-- (`rutina_ejercicios`) contra lo HECHO (`series_registradas`), y hoy
-- nada escribe en `series_registradas`: la pantalla de registrar peso y
-- repeticiones por serie todavía no existe. Una función escrita ahora
-- devolvería una lista vacía para siempre y parecería rota.
--
-- Entra en el mismo commit que esa pantalla, no antes.


-- ---------------------------------------------------------------------
-- 4. QUIÉN PUEDE LLAMAR A CADA FUNCIÓN
-- ---------------------------------------------------------------------
--
-- Postgres, por defecto, deja que CUALQUIERA ejecute una función nueva,
-- y "cualquiera" incluye al rol `anon`: quien abre la app sin haber
-- iniciado sesión. Las tres comprueban `es_admin()` por dentro, así que
-- esto es la segunda cerradura. Dos cerraduras es lo que se quiere en
-- la puerta que da a los datos de quince personas.

revoke all on function adherencia_clientes(int) from public, anon;
revoke all on function retencion_semanal(int)   from public, anon;
revoke all on function horas_tipicas()          from public, anon;

grant execute on function adherencia_clientes(int) to authenticated;
grant execute on function retencion_semanal(int)   to authenticated;
grant execute on function horas_tipicas()          to authenticated;

-- `otorgar_logros` no se le concede a nadie: la dispara el trigger, y
-- un trigger no necesita que el usuario tenga permiso de ejecución.


-- =====================================================================
-- CÓMO SE COMPRUEBA QUE QUEDÓ BIEN
-- =====================================================================
--
-- Es el ritual de este proyecto (PASOS-FASE-2.md, paso 8) aplicado a lo
-- nuevo. Contar filas dice que las políticas están bien; NO dice que el
-- código sepa usarlas — por eso después hay que entrar a la app con
-- cada rol. Es la lección del 2/09.
--
-- 1) LA TRAMPA DE LAS VISTAS. Suplantando a un CLIENTE:
--
--      set local role authenticated;
--      set local request.jwt.claims = '{"sub":"<uuid del cliente>"}';
--      select count(*), count(distinct cliente_id) from v_sesiones_cliente;
--
--    `count(distinct cliente_id)` tiene que dar **1**. Si da 2 o más,
--    el `security_invoker` no quedó puesto y la vista está entregando
--    las sesiones de otras personas.
--
-- 2) QUE UN CLIENTE NO PUEDA ABRIR EL PANEL. Con la misma suplantación:
--
--      select * from adherencia_clientes(4);
--
--    Tiene que fallar con "Solo un administrador...". Si devuelve
--    filas, la comprobación de `es_admin()` no está corriendo.
--
-- 3) QUE LOS LOGROS SE OTORGUEN SOLOS. Como el cliente, completando una
--    sesión de un día de su plan:
--
--      update sesiones set completada = true, terminada_en = now()
--       where id = <id de una sesión suya>;
--      select logro from logros_obtenidos where cliente_id = '<uuid>';
--
--    Tiene que aparecer al menos `primera_sesion`. Y volver a correr el
--    update NO puede duplicar ninguna fila.
--
-- 4) QUE LA SEMANA CORTE DONDE DEBE. Es la comprobación de la regla 5 y
--    la que más fácil se salta:
--
--      -- una sesión terminada un lunes a las 8 p.m. hora de Bogotá
--      -- (que en UTC ya es martes)
--      select lunes, dias from v_semanas_cliente where cliente_id = '<uuid>';
--
--    Ese lunes tiene que contar en SU semana, no en la siguiente.
-- =====================================================================

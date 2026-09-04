-- =====================================================================
-- 10-notificaciones.sql — a quién se le manda un recordatorio, y cuándo
-- =====================================================================
--
-- ARCHIVO NUEVO. Del 01 al 09 ya se corrieron y no se editan. Ver
-- CLAUDE.md, "cómo retomar", paso 4.
--
-- Es repetible.
--
-- =====================================================================
-- LA REGLA QUE HACE DISTINTA ESTA TABLA A TODAS LAS DEMÁS
-- =====================================================================
--
-- `suscripciones_push` es la PRIMERA tabla del proyecto cuya política
-- NO termina en `or es_admin()`. No es un olvido y no se debe
-- "corregir".
--
-- Una suscripción push no es un dato de progreso: es la dirección de un
-- dispositivo, y quien la tenga puede mandarle mensajes a ese celular.
-- El entrenador no necesita verla para nada — él no manda
-- notificaciones a mano, las manda el servidor — así que dársela sería
-- repartir una llave que nadie va a usar.
--
-- Es el principio de la Ley 1581 aplicado al diseño y no al papel:
-- cada quien accede a lo que necesita para su finalidad, y la finalidad
-- del entrenador es ver el progreso de sus clientes, no alcanzar sus
-- teléfonos.
--
-- Quien SÍ las lee es la Edge Function, que corre con la llave de
-- servicio y por eso se salta el RLS. Esa llave vive en los secretos
-- del proyecto, nunca en el repositorio.
--
-- =====================================================================
-- Y LA OTRA: QUIEN DIJO QUE NO, NO RECIBE. COMPROBADO EN CADA ENVÍO
-- =====================================================================
--
-- El consentimiento `notificaciones` ya existe desde la Fase 2 y es
-- opcional de verdad. Aquí se vuelve ejecutable: la función que arma la
-- lista de destinatarios comprueba el ÚLTIMO consentimiento de cada
-- persona antes de incluirla.
--
-- Se comprueba en el momento del envío y no al suscribirse, y esa
-- diferencia es la que hace que sirva: `consentimientos` es una tabla
-- que solo crece —no se edita ni se borra, es su función— así que
-- revocar el permiso es insertar una fila nueva que dice `false`. Si el
-- filtro mirara el consentimiento viejo, revocar no haría nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. EN QUÉ FRANJA ENTRENA CADA QUIEN
-- ---------------------------------------------------------------------
--
-- Va en `perfiles` y NO en `perfil_salud`, y es una decisión, no una
-- casualidad: `perfil_salud` guarda datos sensibles, es opcional y su
-- dueño la puede borrar entera sin borrar la cuenta (derecho de
-- supresión, Ley 1581). Si la franja viviera ahí, alguien que ejerce
-- ese derecho perdería sus recordatorios sin haberlo pedido ni
-- enterarse.
--
-- Y no es un dato sensible: a qué hora prefiere entrenar alguien es una
-- preferencia de uso de la app, cubierta por la finalidad
-- `datos_personales` que ya firmó ("mi actividad dentro de la app").
-- No hay que versionar el consentimiento por esto.
--
-- NULL significa "no lo ha dicho", que es distinto de cualquier franja.
-- Esa gente recibe a la hora por defecto, y el día que exista la
-- pantalla de configuración inicial son exactamente los que hay que
-- preguntar.
alter table perfiles
  add column if not exists franja_entrenamiento text
    check (franja_entrenamiento in ('manana', 'tarde', 'noche'));

-- SIN ESTO LA PANTALLA DE AJUSTES NO PUEDE GUARDAR NADA.
--
-- El archivo 02 hizo `revoke update on perfiles` y devolvió solo dos
-- columnas (`nombre`, `alias`), para que nadie se escriba el XP desde
-- la consola. Una columna nueva nace SIN permiso de escritura: hay que
-- concederla a mano, una por una, y esa es justamente la gracia del
-- mecanismo.
grant update (franja_entrenamiento) on perfiles to authenticated;


-- ---------------------------------------------------------------------
-- 2. LAS SUSCRIPCIONES
-- ---------------------------------------------------------------------
--
-- Lo que el navegador entrega al suscribirse son tres cosas: una
-- dirección (`endpoint`) y dos llaves con las que se cifra el mensaje.
-- Se guardan en columnas separadas y no como un JSON entero porque el
-- `endpoint` es la identidad de la suscripción y necesita su índice
-- único: el mismo celular que se vuelve a suscribir tiene que
-- ACTUALIZAR su fila, no crear una segunda y recibir todo dos veces.
--
-- UNA PERSONA PUEDE TENER VARIAS. El celular y la tableta son dos
-- suscripciones distintas, y las dos son suyas. Por eso el único va en
-- `endpoint` y no en `cliente_id`.
create table if not exists suscripciones_push (
  id            bigint generated always as identity primary key,
  cliente_id    uuid not null references perfiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  creada_en     timestamptz not null default now(),

  -- Cuántas veces seguidas falló el envío a esta dirección. Un endpoint
  -- muere cuando alguien desinstala la app o borra los datos del
  -- navegador, y el servicio de push responde 404 o 410. Sin esto, la
  -- lista se llenaría de direcciones muertas a las que se les escribe
  -- todos los días para siempre.
  fallos          integer not null default 0,
  ultimo_fallo_en timestamptz
);

create index if not exists ix_suscripciones_cliente
  on suscripciones_push (cliente_id);

alter table suscripciones_push enable row level security;

-- CADA QUIEN LA SUYA, Y NADIE MÁS. Ni el admin. Ver la cabecera.
drop policy if exists suscripciones_dueno on suscripciones_push;
create policy suscripciones_dueno on suscripciones_push
  for all to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 3. QUÉ SE LE MANDÓ A QUIÉN, PARA NO MANDARLO DOS VECES
-- ---------------------------------------------------------------------
--
-- El cron se dispara cada hora. Si por lo que sea corre dos veces en la
-- misma hora —un reintento, un despliegue, alguien que lo ejecuta a
-- mano para probar— la misma persona recibiría la misma notificación
-- dos veces. Y una app que avisa dos veces se desinstala más rápido de
-- lo que una app que no avisa se olvida.
--
-- El único sobre (cliente, día, motivo) es lo que lo impide, y vive en
-- el servidor: no depende de que la función se acuerde de comprobarlo.
--
-- `fecha` es el DÍA EN BOGOTÁ, no un instante. Es lo que hace que "una
-- por día" signifique un día de los de la persona y no una ventana de
-- 24 horas corrida.
create table if not exists envios_push (
  id          bigint generated always as identity primary key,
  cliente_id  uuid not null references perfiles(id) on delete cascade,
  fecha       date not null,
  motivo      text not null check (motivo in ('entrenamiento', 'racha')),
  enviado_en  timestamptz not null default now(),
  unique (cliente_id, fecha, motivo)
);

alter table envios_push enable row level security;

-- Cada quien puede ver lo que le mandaron: es información sobre él y la
-- Ley 1581 le da derecho a conocerla. Escribir, solo la Edge Function
-- con la llave de servicio — por eso no hay política de insert.
drop policy if exists envios_select_dueno on envios_push;
create policy envios_select_dueno on envios_push
  for select to authenticated
  using (cliente_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 4. A QUÉ HORA LE TOCA A CADA QUIEN
-- ---------------------------------------------------------------------
--
-- EL RECORDATORIO VA ANTES DE LA FRANJA, NO DENTRO. Un aviso que llega
-- cuando la persona ya entrenó no es un recordatorio, es ruido — y el
-- ruido es lo que hace que alguien apague las notificaciones para
-- siempre, que es el único error irreversible de esta función.
--
-- Las horas son de Bogotá y están aquí y no en el código de la función
-- por una razón: quien decide a quién se le manda es la base, así que
-- la hora tiene que estar donde está esa decisión. Si viviera en el
-- JavaScript, cambiar la hora de la tarde obligaría a desplegar.
--
-- El 7 del `else` es la hora fija de la v1, para quien todavía no ha
-- dicho su franja. Cuando exista la pantalla de configuración inicial,
-- esta rama se va vaciando sola.
create or replace function hora_recordatorio(p_franja text)
returns int
language sql
immutable
as $$
  select case p_franja
    when 'manana' then 6     -- antes de la primera hora del gimnasio
    when 'tarde'  then 12
    when 'noche'  then 17
    else 7                   -- sin franja declarada: la hora por defecto
  end;
$$;


-- ---------------------------------------------------------------------
-- 5. LA LISTA DE DESTINATARIOS
-- ---------------------------------------------------------------------
--
-- La llama la Edge Function una vez por hora con la hora de Bogotá que
-- sea en ese momento, y devuelve exactamente a quién hay que escribirle
-- y por qué.
--
-- TODA LA DECISIÓN ESTÁ AQUÍ Y NO EN EL JAVASCRIPT. Es la misma regla
-- de la capa de analítica: lo que decide algo sobre una persona se
-- calcula en la base, donde se puede leer, probar y auditar. La función
-- de Deno solo cifra y manda.
--
-- =====================================================================
-- ESTA FUNCIÓN NO SE LE CONCEDE A `authenticated`. NUNCA.
-- =====================================================================
--
-- Devuelve los endpoints de otras personas. Es la única función del
-- proyecto que solo puede llamar la llave de servicio, y por eso el
-- bloque de permisos del final revoca también a `authenticated`, cosa
-- que ninguna otra hace. Si alguna vez alguien le concede execute a
-- `authenticated` "para probar", queda repartida la lista de teléfonos
-- de todos los clientes.
create or replace function destinatarios_push(p_hora int)
returns table (
  cliente_id  uuid,
  nombre      text,
  motivo      text,
  rutina      text,
  faltan      int,
  endpoint    text,
  p256dh      text,
  auth        text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_hoy  date;
  v_dia  int;
begin
  if p_hora is null or p_hora < 0 or p_hora > 23 then
    raise exception 'La hora tiene que estar entre 0 y 23.';
  end if;

  v_hoy := (now() at time zone 'America/Bogota')::date;
  -- 1 es lunes y 7 es domingo, igual que `plan_dias.dia` y que
  -- `diaSemanaBogota()`. `isodow` es justo esa numeración; `dow` daría
  -- 0 para el domingo y la rutina del domingo no aparecería nunca.
  v_dia := extract(isodow from v_hoy);

  return query
  with elegibles as (
    select
      p.id,
      p.nombre as nom,
      pl.id as plan_id,
      pl.meta_semanal,
      pl.inicio,
      pl.semanas
    from perfiles p
    join planes pl on pl.cliente_id = p.id and pl.activo
    where p.rol = 'cliente'
      -- LA HORA DE ESTA PERSONA. Quien no declaró franja entra a la
      -- hora por defecto.
      and hora_recordatorio(p.franja_entrenamiento) = p_hora
      -- EL ÚLTIMO CONSENTIMIENTO MANDA. Ver la cabecera: revocar es
      -- insertar un `false` nuevo, así que mirar el más reciente es lo
      -- único que hace que revocar sirva de algo.
      and coalesce((
        select c.aceptado
          from consentimientos c
         where c.perfil_id = p.id and c.tipo = 'notificaciones'
         order by c.fecha desc
         limit 1
      ), false)
  ),
  -- Qué le toca hoy, si es que le toca algo. Se compara contra las
  -- semanas de calendario del plan, igual que `plan.js`: la semana 1 es
  -- la del lunes de la fecha de inicio.
  con_rutina as (
    select
      e.*,
      r.nombre as rutina_nombre,
      pd.id as plan_dia_id
    from elegibles e
    join plan_dias pd
      on pd.plan_id = e.plan_id
     and pd.dia = v_dia
     and pd.semana = floor(
           (date_trunc('week', v_hoy)::date
            - date_trunc('week', e.inicio)::date) / 7
         )::int + 1
    join rutinas r on r.id = pd.rutina_id
    where pd.rutina_id is not null
      and v_hoy >= e.inicio
  ),
  -- Lo que ya hizo esta semana, para el aviso de racha.
  semana as (
    select v.cliente_id as cid, v.dias
      from v_semanas_cliente v
     where v.lunes = date_trunc('week', v_hoy)::date
  ),
  -- UNA POR PERSONA Y POR DÍA. El entrenamiento le gana a la racha
  -- porque es accionable: dice qué hacer hoy. El aviso de racha solo
  -- aparece cuando no hay rutina que recordar, o sea cuando ya no queda
  -- nada más útil que decir.
  candidatos as (
    select
      cr.id, cr.nom, 'entrenamiento'::text as mot,
      cr.rutina_nombre as rut, null::int as fal
    from con_rutina cr
    where not exists (
      select 1 from sesiones s
       where s.cliente_id = cr.id
         and s.plan_dia_id = cr.plan_dia_id
         and s.completada
    )

    union all

    -- LA RACHA, SOLO EL DOMINGO. Avisar el martes que van 1 de 4 no es
    -- un aviso, es un reproche: todavía queda media semana. El domingo
    -- es el único día en que la información cambia algo.
    select
      e.id, e.nom, 'racha'::text,
      null::text,
      (e.meta_semanal - coalesce(sm.dias, 0))::int
    from elegibles e
    left join semana sm on sm.cid = e.id
    where v_dia = 7
      and e.meta_semanal > coalesce(sm.dias, 0)
      and e.id not in (select cr.id from con_rutina cr)
  )
  select
    c.id, c.nom, c.mot, c.rut, c.fal,
    s.endpoint, s.p256dh, s.auth
  from candidatos c
  join suscripciones_push s on s.cliente_id = c.id
  -- Direcciones que llevan cinco fallos seguidos: la app se desinstaló
  -- o se borraron los datos del navegador. Se dejan de intentar sin
  -- borrarlas, por si el servicio de push estaba caído y vuelven.
  where s.fallos < 5
    -- Y lo que ya se mandó hoy no se manda otra vez. El único de
    -- `envios_push` es el que de verdad lo impide; esto es para no
    -- gastar el envío.
    and not exists (
      select 1 from envios_push ep
       where ep.cliente_id = c.id and ep.fecha = v_hoy and ep.motivo = c.mot
    );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. CONTAR UN FALLO
-- ---------------------------------------------------------------------
--
-- La llama la Edge Function cuando un envío falla por algo que PUEDE
-- ser temporal (el servicio de push caído, la red). A los cinco
-- seguidos, `destinatarios_push` deja de incluir esa dirección.
--
-- Es una función y no un `update` desde la función de Deno por una
-- razón práctica: sumar uno a una columna desde fuera obliga a leerla
-- primero, y entre la lectura y la escritura cabe otro envío. Aquí la
-- suma la hace Postgres sobre la fila, en una sola operación.
create or replace function sumar_fallo_push(p_endpoint text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update suscripciones_push
     set fallos = fallos + 1,
         ultimo_fallo_en = now()
   where endpoint = p_endpoint;
$$;


-- ---------------------------------------------------------------------
-- 7. PERMISOS — el bloque más importante de este archivo
-- ---------------------------------------------------------------------

-- `hora_recordatorio` es una cuenta sin datos de nadie: la puede llamar
-- cualquiera que haya entrado, y de hecho la app la usa para mostrarle
-- a la persona a qué hora le va a llegar.
revoke all on function hora_recordatorio(text) from public, anon;
grant execute on function hora_recordatorio(text) to authenticated;

-- `destinatarios_push` NO. Devuelve endpoints de otras personas.
-- Fíjate en que aquí se revoca también a `authenticated`, cosa que no
-- hace ninguna otra función del proyecto. Es a propósito.
revoke all on function destinatarios_push(int) from public, anon, authenticated;
grant execute on function destinatarios_push(int) to service_role;

-- `sumar_fallo_push` tampoco: escribe en filas de otras personas. Un
-- cliente que pudiera llamarla podría apagarle las notificaciones a
-- cualquiera llamándola cinco veces con su endpoint.
revoke all on function sumar_fallo_push(text) from public, anon, authenticated;
grant execute on function sumar_fallo_push(text) to service_role;


-- =====================================================================
-- CÓMO SE COMPRUEBA
-- =====================================================================
--
-- 1) QUE UN CLIENTE NO PUEDA PEDIR LA LISTA. Es la comprobación de este
--    archivo. Suplantando a un cliente:
--
--      select * from destinatarios_push(7);
--
--    Tiene que fallar con "permission denied for function". Si devuelve
--    filas, cualquiera puede sacar los teléfonos de todos.
--
-- 2) QUE NADIE VEA LAS SUSCRIPCIONES DE OTRO, tampoco el admin.
--    Suplantando al ADMIN, que es donde falla el patrón de siempre:
--
--      select count(*) from suscripciones_push;
--
--    Tiene que dar solo las suyas (normalmente 0 o 1), no las de todos.
--
-- 3) QUE REVOCAR EL PERMISO SIRVA. Con un cliente que sí saldría en la
--    lista, insertar un consentimiento nuevo en `false`:
--
--      insert into consentimientos (perfil_id, tipo, version, aceptado)
--      values ('<uuid>', 'notificaciones', '2026-09-02', false);
--
--    y volver a llamar `destinatarios_push`. Esa persona tiene que
--    haber desaparecido de la lista.
--
-- 4) QUE NO SE MANDE DOS VECES:
--
--      insert into envios_push (cliente_id, fecha, motivo)
--      values ('<uuid>', current_date, 'entrenamiento');
--      -- repetir: debe fallar con "duplicate key".
-- =====================================================================

-- =====================================================================
-- 03-funciones.sql — la lógica que vive en la base, no en el navegador.
-- =====================================================================
--
-- QUÉ ES UNA FUNCIÓN "SECURITY DEFINER", que es de lo que va casi todo
-- este archivo:
--
-- Normalmente, cuando la app llama a la base, la base la atiende con
-- los permisos del usuario que llamó. Una función "security definer"
-- corre con los permisos de quien la CREÓ (tú), no de quien la LLAMA.
--
-- Es exactamente una macro de Excel con contraseña: el usuario no puede
-- editar la hoja de sueldos, pero sí puede apretar un botón que corre
-- una macro que la modifica de una forma concreta y controlada. Le das
-- una acción, no un permiso.
--
-- Por eso están aquí las cuatro cosas que el cliente necesita hacer
-- pero para las que NO puede tener permiso abierto:
--   - canjear un código de invitación sin poder leer la lista de códigos
--   - descargar TODOS sus datos de un solo golpe
--   - borrar su cuenta de verdad
--   - recibir XP sin poder escribirse el número
--
-- REGLA DE ORO DE ESTE ARCHIVO: si una función es "security definer",
-- lo PRIMERO que hace es comprobar quién llama. Una función así sin esa
-- comprobación es una puerta trasera, no una función.
--
-- Se corre después de 02. Se puede repetir sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CÓDIGOS DE INVITACIÓN
-- ---------------------------------------------------------------------

-- Un código que se pueda dictar por WhatsApp sin que nadie se equivoque.
-- El alfabeto tiene 32 caracteres y NO incluye O/0 ni I/1/L: son los que
-- la gente teclea mal cuando copia de una pantalla.
--
-- Por qué 10 caracteres y no 6: 32^10 son unas mil billones de
-- combinaciones. Con 15 clientes nadie intentaría adivinarlos; con 500 y
-- la app pública, alguien va a probar. Cada carácter de más cuesta cero
-- y multiplica por 32 el trabajo de adivinar.
--
-- La aleatoriedad sale de gen_random_uuid(), que Postgres genera con el
-- generador criptográfico del sistema. random() a secas NO sirve para
-- esto: es predecible si conoces la semilla.
create or replace function codigo_aleatorio(p_largo int default 10)
returns text
language plpgsql
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32
  bytes    bytea;
  salida   text := '';
  i        int;
begin
  bytes := uuid_send(gen_random_uuid());          -- 16 bytes
  while length(bytes) < p_largo loop
    bytes := bytes || uuid_send(gen_random_uuid());
  end loop;

  -- 256 es múltiplo exacto de 32, así que el "% 32" no le da más
  -- probabilidad a unas letras que a otras. Con un alfabeto de 30 sí
  -- pasaría, y es el error clásico al generar códigos.
  for i in 0 .. p_largo - 1 loop
    salida := salida || substr(alfabeto, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;

  return salida;
end;
$$;


-- Crea N invitaciones de una vez. El "de una vez" no es un lujo: cuando
-- sean 40 clientes, crearlas de a una es una tarde perdida.
create or replace function crear_invitacion(
  p_cantidad int default 1,
  p_dias     int default 14
)
returns setof invitaciones
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin  uuid := auth.uid();
  v_expira timestamptz := now() + make_interval(days => p_dias);
  v_codigo text;
  i        int;
begin
  -- La comprobación de la regla de oro.
  if not es_admin() then
    raise exception 'Solo un administrador puede crear invitaciones.';
  end if;
  if p_cantidad < 1 or p_cantidad > 100 then
    raise exception 'La cantidad tiene que estar entre 1 y 100.';
  end if;
  if p_dias < 1 or p_dias > 365 then
    raise exception 'Los días tienen que estar entre 1 y 365.';
  end if;

  for i in 1 .. p_cantidad loop
    -- Reintentar hasta que salga uno libre. Con 50 bits de azar esto no
    -- va a repetir nunca, pero "no va a pasar nunca" es como se escriben
    -- los bugs que aparecen a los dos años.
    loop
      v_codigo := codigo_aleatorio(10);
      exit when not exists (
        select 1 from invitaciones inv where inv.codigo = v_codigo
      );
    end loop;

    return query
      insert into invitaciones (codigo, creada_por, expira_en)
      values (v_codigo, v_admin, v_expira)
      returning *;
  end loop;
end;
$$;


-- REGISTRO SIN CÓDIGO — la puerta de la calle.
--
-- Cualquiera que se registre puede llamar a esto y quedar como
-- VISITANTE: ve el catálogo de ejercicios y el contenido marcado como
-- público, y nada más. No tiene plan, no tiene progreso, no ve retos y
-- no puede escribirle al entrenador.
--
-- Por qué existe la app abierta: hoy la app solo sirve para gente que
-- el entrenador YA consiguió. Con esto, la app misma es por donde
-- llegan. Es la diferencia entre una herramienta de entrega y un canal.
create or replace function crear_perfil_visitante(p_nombre text)
returns perfiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_perfil perfiles;
begin
  if v_uid is null then
    raise exception 'Tienes que haber iniciado sesión.';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre.';
  end if;
  if exists (select 1 from perfiles p where p.id = v_uid) then
    raise exception 'Esta cuenta ya está activada.';
  end if;

  -- 'visitante' va escrito, no se deja al valor por defecto. Que el
  -- rol de una función que cualquiera puede llamar dependa de un
  -- default es la clase de cosa que se rompe en silencio el día que
  -- alguien cambia el default.
  insert into perfiles (id, rol, nombre)
  values (v_uid, 'visitante', trim(p_nombre))
  returning * into v_perfil;

  return v_perfil;
end;
$$;


-- LA PUERTA DE ENTRADA A LA APP.
--
-- Esta es la que convierte a un visitante en CLIENTE. Hace dos trabajos
-- según con qué llegue quien la llama:
--
--   - si ya tiene perfil de visitante  -> lo asciende a cliente
--   - si no tiene perfil               -> se lo crea directo como cliente
--
-- El segundo caso existe para quien recibe el código antes de haber
-- entrado nunca: no tiene por qué registrarse dos veces.
--
-- Es "security definer" por una razón concreta: para canjear un código
-- hay que LEER la tabla de invitaciones, y si el cliente pudiera
-- leerla, podría listar los códigos sin usar de los demás. Aquí lee la
-- función, no él.
create or replace function vincular_con_codigo(
  p_codigo text,
  p_nombre text,
  p_alias  text default null
)
returns perfiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_inv    invitaciones;
  v_perfil perfiles;
begin
  if v_uid is null then
    raise exception 'Tienes que haber iniciado sesión.';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre.';
  end if;
  -- Un cliente o un admin que vuelva a canjear un código está gastando
  -- una invitación para nada. Un VISITANTE sí puede: es justo lo que
  -- queremos que pase.
  if exists (
    select 1 from perfiles p
     where p.id = v_uid and p.rol in ('cliente', 'admin')
  ) then
    raise exception 'Esta cuenta ya es de cliente.';
  end if;

  -- "for update" bloquea la fila del código hasta que termine esto.
  -- Sin eso: dos personas pegan el mismo código en el mismo segundo,
  -- las dos leen "sin usar", las dos entran. Con 15 clientes suena
  -- imposible; el día que mandes 50 códigos por WhatsApp a la vez, deja
  -- de sonar imposible. Cuesta una palabra.
  select * into v_inv
    from invitaciones
   where codigo = upper(trim(p_codigo))
     for update;

  if v_inv.codigo is null then
    raise exception 'Ese código no existe. Revísalo con tu entrenador.';
  end if;
  if v_inv.usada_por is not null then
    raise exception 'Ese código ya se usó.';
  end if;
  if v_inv.expira_en < now() then
    raise exception 'Ese código ya venció. Pídele uno nuevo a tu entrenador.';
  end if;

  -- Un solo INSERT que también sirve de UPDATE. Si ya venía como
  -- visitante, el "on conflict" lo asciende en vez de fallar; si no
  -- existía, lo crea. Es el equivalente a "pegar sobre la fila si ya
  -- está, y agregarla si no".
  --
  -- Ojo con el coalesce del alias: al ascender no se pisa el alias que
  -- el visitante ya se había puesto, salvo que mande uno nuevo.
  insert into perfiles (id, rol, nombre, alias, entrenador_id)
  values (
    v_uid,
    'cliente',
    trim(p_nombre),
    nullif(trim(coalesce(p_alias, '')), ''),
    v_inv.creada_por        -- queda registrado quién lo invitó. Hoy no
                            -- lo usa ninguna política; el día que haya
                            -- un segundo entrenador, es el dato que
                            -- evita tener que adivinar.
  )
  on conflict (id) do update
     set rol           = 'cliente',
         nombre        = excluded.nombre,
         alias         = coalesce(excluded.alias, perfiles.alias),
         entrenador_id = excluded.entrenador_id
  returning * into v_perfil;

  update invitaciones set usada_por = v_uid where codigo = v_inv.codigo;

  return v_perfil;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. CLONAR UNA PLANTILLA — la función que le ahorra la tarde
-- ---------------------------------------------------------------------
--
-- Sin esto, armar el plan de 4 semanas de cada cliente a mano es más
-- lento que el PDF que usa hoy, y la app deja de servirle.
--
-- Lo importante es lo que NO hace: no deja ningún vínculo vivo con la
-- plantilla. Copia los días y se acaba. Si mañana él corrige el molde,
-- los planes ya entregados no se mueven. Es la diferencia entre
-- "duplicar hoja" y "=Hoja1!A1": lo segundo se ve más elegante hasta el
-- día en que a un cliente le cambia sola la rutina de ayer.
create or replace function clonar_plantilla(
  p_plantilla    bigint,
  p_cliente      uuid,
  p_inicio       date,
  p_meta_semanal int  default null,
  p_nombre       text default null
)
returns planes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plantilla plantillas;
  v_plan      planes;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede asignar un plan.';
  end if;

  select * into v_plantilla from plantillas where id = p_plantilla;
  if not found then
    raise exception 'Esa plantilla no existe.';
  end if;

  if not exists (
    select 1 from perfiles p where p.id = p_cliente and p.rol = 'cliente'
  ) then
    raise exception 'Ese cliente no existe.';
  end if;

  -- Un cliente, un plan activo. El índice único parcial del archivo 01
  -- lo exige, y con razón: si hubiera dos, la pantalla de "Hoy" no
  -- sabría cuál mostrar. El plan viejo no se borra, se archiva: el
  -- historial de entrenamientos cuelga de él.
  update planes set activo = false
   where cliente_id = p_cliente and activo;

  insert into planes (
    cliente_id, nombre, semanas, inicio, meta_semanal, desde_plantilla
  )
  values (
    p_cliente,
    coalesce(nullif(trim(coalesce(p_nombre, '')), ''), v_plantilla.nombre),
    v_plantilla.semanas,
    p_inicio,
    -- La meta de la racha es POR CLIENTE. Si no la dan, se toma la
    -- sugerencia de la plantilla; si tampoco, 3. Nunca una constante
    -- escondida en el código de la app.
    coalesce(p_meta_semanal, v_plantilla.dias_semana, 3),
    p_plantilla
  )
  returning * into v_plan;

  insert into plan_dias (plan_id, semana, dia, rutina_id)
  select v_plan.id, pd.semana, pd.dia, pd.rutina_id
    from plantilla_dias pd
   where pd.plantilla_id = p_plantilla;

  return v_plan;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. XP — lo da la base, no el navegador
-- ---------------------------------------------------------------------
--
-- El XP nunca lo suma la app. Lo suma este trigger cuando una sesión
-- pasa a completada, y solo esa vez.
--
-- La razón es simple: todo lo que corre en el navegador lo puede
-- reescribir quien tenga el navegador. Si el XP se sumara con una
-- llamada desde la app, cualquiera con veinte minutos y la consola
-- abierta se pone primero en la tabla de posiciones — y ahí se acabó la
-- gracia del reto para los otros catorce.
--
-- Un trigger es la "regla de la hoja" que se dispara sola cuando una
-- celda cambia, sin que nadie la invoque.

create or replace function otorgar_xp()
returns trigger
language plpgsql
security definer                 -- necesita saltarse el permiso por
                                 -- columna que impide escribir xp
set search_path = public, pg_temp
as $$
declare
  v_xp_sesion constant int := 50;
begin
  -- Solo en el CAMBIO a completada. Sin esta condición, cada vez que se
  -- guardara cualquier cosa de una sesión ya completada se volvería a
  -- pagar el XP.
  if new.completada and (tg_op = 'INSERT' or not old.completada) then

    update perfiles set xp = xp + v_xp_sesion where id = new.cliente_id;

    -- El logro se intenta siempre; el índice único de la tabla es el
    -- que impide que se dé dos veces. Es más confiable que preguntar
    -- antes: entre la pregunta y la inserción cabe otra inserción.
    insert into logros_obtenidos (cliente_id, logro)
    values (new.cliente_id, 'primera_sesion')
    on conflict (cliente_id, logro) do nothing;

  end if;

  return new;
end;
$$;

drop trigger if exists tr_xp_sesion on sesiones;
create trigger tr_xp_sesion
  after insert or update on sesiones
  for each row execute function otorgar_xp();


-- ---------------------------------------------------------------------
-- 4. HABEAS DATA — la Ley 1581 implementada, no prometida
-- ---------------------------------------------------------------------
--
-- La ley colombiana le da al titular derecho a CONSULTAR sus datos
-- (respuesta en 10 días hábiles) y a que se los ELIMINEN. Casi todo el
-- mundo cumple eso con un correo y un proceso manual.
--
-- Aquí son dos funciones. El plazo de 10 días pasa a ser un segundo, y
-- no depende de que alguien se acuerde de revisar un buzón.

-- DERECHO DE CONSULTA. Devuelve todo lo que la app sabe de quien
-- pregunta, en un solo objeto que la pantalla "Mis datos" descarga como
-- archivo. No recibe parámetros a propósito: no se puede pedir "los
-- datos de otro", solo existen los tuyos.
create or replace function mis_datos()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'generado_en', now(),

    'perfil', (
      select to_jsonb(p) from perfiles p where p.id = auth.uid()
    ),

    'salud', (
      select to_jsonb(s) from perfil_salud s where s.perfil_id = auth.uid()
    ),

    'consentimientos', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.fecha), '[]'::jsonb)
        from consentimientos c where c.perfil_id = auth.uid()
    ),

    'planes', (
      select coalesce(jsonb_agg(to_jsonb(pl) order by pl.creado_en), '[]'::jsonb)
        from planes pl where pl.cliente_id = auth.uid()
    ),

    'sesiones', (
      select coalesce(jsonb_agg(to_jsonb(se) order by se.iniciada_en), '[]'::jsonb)
        from sesiones se where se.cliente_id = auth.uid()
    ),

    'series', (
      select coalesce(jsonb_agg(to_jsonb(sr)), '[]'::jsonb)
        from series_registradas sr
        join sesiones se2 on se2.id = sr.sesion_id
       where se2.cliente_id = auth.uid()
    ),

    'logros', (
      select coalesce(jsonb_agg(to_jsonb(lo) order by lo.fecha), '[]'::jsonb)
        from logros_obtenidos lo where lo.cliente_id = auth.uid()
    )
  )
  where auth.uid() is not null;
$$;


-- DERECHO DE SUPRESIÓN. Borra de verdad, no marca una casilla.
--
-- Borra la cuenta de acceso, y desde ahí cae en cascada TODO lo que
-- cuelga de ella: perfil, salud, consentimientos, planes, sesiones,
-- series, logros. Es lo que ya definen los "on delete cascade" del
-- archivo 01, y es la razón por la que están puestos.
--
-- Sin vuelta atrás. La pantalla que llama a esto tiene que pedir
-- confirmación escrita, no un botón suelto.
create or replace function eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Tienes que haber iniciado sesión.';
  end if;

  -- Un admin que borre su propia cuenta desde el celular deja la app
  -- sin dueño. Esa se borra desde el panel de Supabase, a conciencia.
  if es_admin() then
    raise exception 'Una cuenta de administrador no se elimina desde la app.';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;


-- ---------------------------------------------------------------------
-- 5. QUIÉN PUEDE LLAMAR A CADA FUNCIÓN
-- ---------------------------------------------------------------------
--
-- OJO CON ESTO, que es un descuido muy fácil de cometer: Postgres, por
-- defecto, deja que CUALQUIERA ejecute una función nueva. Y "cualquiera"
-- incluye al rol anon, que es quien entra a la app sin haber iniciado
-- sesión.
--
-- Cada función de arriba comprueba internamente quién llama, así que
-- esto es la segunda cerradura, no la única. Pero dos cerraduras es
-- justo lo que se quiere en la puerta que da a los datos de salud de
-- otras personas.

revoke all on function codigo_aleatorio(int)                        from public, anon;
revoke all on function crear_invitacion(int, int)                   from public, anon;
revoke all on function crear_perfil_visitante(text)                  from public, anon;
revoke all on function vincular_con_codigo(text, text, text)        from public, anon;
revoke all on function clonar_plantilla(bigint, uuid, date, int, text) from public, anon;
revoke all on function mis_datos()                                  from public, anon;
revoke all on function eliminar_mi_cuenta()                         from public, anon;

grant execute on function crear_invitacion(int, int)                   to authenticated;
grant execute on function crear_perfil_visitante(text)                  to authenticated;
grant execute on function vincular_con_codigo(text, text, text)        to authenticated;
grant execute on function clonar_plantilla(bigint, uuid, date, int, text) to authenticated;
grant execute on function mis_datos()                                  to authenticated;
grant execute on function eliminar_mi_cuenta()                         to authenticated;

-- codigo_aleatorio NO se le concede a nadie: es una pieza interna de
-- crear_invitacion. Nada de la app la llama directo.


-- =====================================================================
-- CÓMO SE COMPRUEBA
-- =====================================================================
--
--   -- como admin, en el SQL Editor:
--   select * from crear_invitacion(3, 30);      -- 3 códigos, 30 días
--
--   -- que un cliente NO pueda crearlos: repetir la prueba de suplantación
--   -- del final del archivo 02 y llamar crear_invitacion(1).
--   -- Tiene que fallar con "Solo un administrador...".
--
--   -- que el XP se pague una sola vez:
--   update sesiones set completada = true where id = 1;   -- +50
--   update sesiones set completada = true where id = 1;   -- +0
--   select xp from perfiles where id = '...';
-- =====================================================================

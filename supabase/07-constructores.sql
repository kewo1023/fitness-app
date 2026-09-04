-- =====================================================================
-- 07-constructores.sql — guardar una rutina y guardar una plantilla
-- =====================================================================
--
-- ARCHIVO NUEVO. Del 01 al 06 ya se corrieron contra producción y no se
-- editan: si el repositorio y la base dejan de coincidir, nadie sabe
-- cuál manda. Ver CLAUDE.md, "cómo retomar", paso 4.
--
-- Es repetible: `create or replace` no rompe nada al correrlo dos veces.
--
-- =====================================================================
-- POR QUÉ ESTO NO SE HACE DESDE EL NAVEGADOR
-- =====================================================================
--
-- Guardar una rutina son tres escrituras que tienen que pasar juntas o
-- no pasar: grabar la rutina, BORRAR sus ejercicios anteriores y meter
-- los nuevos en orden. Si la señal se cae en medio —y el público de
-- esta app entra con datos móviles— la rutina se queda SIN ejercicios y
-- el entrenador pierde su trabajo sin que nada avise.
--
-- Dentro de una función es una sola transacción: pasa todo o no pasa
-- nada. Es el mismo argumento de `clonar_plantilla` (03-funciones.sql).
--
-- POR QUÉ SE BORRA Y SE VUELVE A INSERTAR EN VEZ DE ACTUALIZAR.
-- `rutina_ejercicios` tiene un único por `(rutina_id, orden)`. Mover el
-- ejercicio 3 al puesto 2 con dos updates sueltos choca contra ese
-- único a mitad de camino: por un instante habría dos filas con el
-- mismo orden. Borrar todo y reinsertar en el orden final evita esa
-- gimnasia entera, y aquí es barato porque una rutina tiene ocho
-- ejercicios, no ocho mil.
--
-- Nada apunta a `rutina_ejercicios`, así que borrar sus filas no
-- arrastra historial: `series_registradas` apunta a `ejercicios`
-- directo, no a esta tabla. Se comprobó antes de escribir esto.
--
-- =====================================================================
-- POR QUÉ ESTAS DOS **NO** SON `security definer` Y `clonar_plantilla` SÍ
-- =====================================================================
--
-- `clonar_plantilla` escribe en el plan de OTRA persona, algo que las
-- políticas no le permiten a nadie; por eso necesita saltárselas y por
-- eso su `es_admin()` interno es la única protección que tiene.
--
-- Estas dos escriben en tablas donde el admin ya tiene permiso por
-- política. Así que se dejan como `security invoker` —lo normal— y
-- **RLS sigue siendo el guardia de verdad**. El `es_admin()` de adentro
-- no protege: sirve para dar un mensaje claro en vez de un 42501 crudo.
--
-- La diferencia importa: una función `security definer` es una puerta
-- que se salta las cerraduras, y solo se abre cuando de verdad hace
-- falta.

-- ---------------------------------------------------------------------
-- 1. GUARDAR UNA RUTINA
-- ---------------------------------------------------------------------
-- `p_id` en null crea una nueva; con id, actualiza esa.
--
-- `p_ejercicios` es un arreglo JSON EN EL ORDEN FINAL:
--   [{"ejercicio_id": 12, "series": 4, "reps": "8-10",
--     "descanso_seg": 90, "nota": null}, ...]
--
-- El `orden` NO viene en el JSON: sale de la posición en el arreglo,
-- con `with ordinality`. Si viniera, habría dos fuentes para el mismo
-- dato y algún día dirían cosas distintas.
create or replace function guardar_rutina(
  p_id          bigint,
  p_nombre      text,
  p_nivel       text,
  p_duracion    integer,
  p_notas       text,
  p_publica     boolean,
  p_ejercicios  jsonb
)
returns rutinas
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_rutina rutinas;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede guardar una rutina.';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'La rutina necesita un nombre.';
  end if;

  if p_id is null then
    insert into rutinas (nombre, nivel, duracion_min, notas, publica, creada_por)
    values (trim(p_nombre), p_nivel, p_duracion, p_notas,
            coalesce(p_publica, false), (select auth.uid()))
    returning * into v_rutina;
  else
    update rutinas
       set nombre = trim(p_nombre),
           nivel = p_nivel,
           duracion_min = p_duracion,
           notas = p_notas,
           publica = coalesce(p_publica, false)
     where id = p_id
    returning * into v_rutina;

    if not found then
      raise exception 'Esa rutina no existe.';
    end if;
  end if;

  delete from rutina_ejercicios where rutina_id = v_rutina.id;

  insert into rutina_ejercicios
    (rutina_id, ejercicio_id, orden, series, reps, descanso_seg, nota)
  select
    v_rutina.id,
    (e->>'ejercicio_id')::bigint,
    -- La POSICIÓN en el arreglo es el orden. Ver el comentario de arriba.
    n::int,
    coalesce((e->>'series')::int, 3),
    coalesce(nullif(trim(e->>'reps'), ''), '10'),
    coalesce((e->>'descanso_seg')::int, 60),
    nullif(trim(coalesce(e->>'nota', '')), '')
  from jsonb_array_elements(coalesce(p_ejercicios, '[]'::jsonb))
       with ordinality as t(e, n);

  return v_rutina;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. GUARDAR UNA PLANTILLA
-- ---------------------------------------------------------------------
-- `p_dias` es el calendario completo, solo con los días que tienen algo:
--   [{"semana": 1, "dia": 1, "rutina_id": 4}, ...]
--
-- UN DÍA QUE NO VIENE EN EL ARREGLO NO EXISTE EN LA PLANTILLA, y eso es
-- distinto de un día de descanso. El descanso es una fila con
-- `rutina_id` en null: el entrenador lo puso ahí. La pantalla de Hoy
-- distingue los dos casos y le dice cosas distintas al cliente, así que
-- la diferencia tiene que sobrevivir al guardado.
create or replace function guardar_plantilla(
  p_id           bigint,
  p_nombre       text,
  p_semanas      integer,
  p_nivel        text,
  p_dias_semana  integer,
  p_notas        text,
  p_dias         jsonb
)
returns plantillas
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_plantilla plantillas;
begin
  if not es_admin() then
    raise exception 'Solo un administrador puede guardar una plantilla.';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'La plantilla necesita un nombre.';
  end if;

  if coalesce(p_semanas, 0) < 1 then
    raise exception 'La plantilla necesita al menos una semana.';
  end if;

  if p_id is null then
    insert into plantillas (nombre, semanas, nivel, dias_semana, notas)
    values (trim(p_nombre), p_semanas, p_nivel, p_dias_semana, p_notas)
    returning * into v_plantilla;
  else
    update plantillas
       set nombre = trim(p_nombre),
           semanas = p_semanas,
           nivel = p_nivel,
           dias_semana = p_dias_semana,
           notas = p_notas
     where id = p_id
    returning * into v_plantilla;

    if not found then
      raise exception 'Esa plantilla no existe.';
    end if;
  end if;

  delete from plantilla_dias where plantilla_id = v_plantilla.id;

  insert into plantilla_dias (plantilla_id, semana, dia, rutina_id)
  select
    v_plantilla.id,
    (d->>'semana')::int,
    (d->>'dia')::int,
    -- nullif porque el JSON trae la cadena "null" cuando el día es de
    -- descanso, y ese null es información, no un dato que falta.
    nullif(d->>'rutina_id', '')::bigint
  from jsonb_array_elements(coalesce(p_dias, '[]'::jsonb)) as d
  -- Se descartan los días que se salen de las semanas declaradas. Pasa
  -- al bajar `semanas` de 4 a 3 en una plantilla que ya tenía la
  -- semana 4 llena: sin esto quedarían filas huérfanas que nadie ve
  -- pero que `clonar_plantilla` sí copiaría al plan de un cliente.
  where (d->>'semana')::int between 1 and v_plantilla.semanas
    and (d->>'dia')::int between 1 and 7;

  return v_plantilla;
end;
$$;


-- ---------------------------------------------------------------------
-- CÓMO COMPROBAR QUE QUEDÓ BIEN
-- ---------------------------------------------------------------------
-- Con la cuenta del entrenador, desde la app: crear una rutina con tres
-- ejercicios, cambiarles el orden y guardar. Después, en el SQL Editor:
--
--   select orden, ejercicio_id from rutina_ejercicios
--    where rutina_id = <id> order by orden;
--
-- El orden tiene que ser 1, 2, 3 sin huecos y en el orden que quedó en
-- pantalla.
--
-- Y suplantando a un CLIENTE, que la función lo rechace:
--
--   select guardar_rutina(null, 'Prueba', null, null, null, false, '[]');
--   -- debe fallar con "Solo un administrador puede guardar una rutina."

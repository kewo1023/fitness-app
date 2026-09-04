-- =====================================================================
-- 09-series.sql — el registro de series, y la métrica que desbloquea
-- =====================================================================
--
-- ARCHIVO NUEVO. Del 01 al 08 ya se corrieron y no se editan: si el
-- repositorio y la base dejan de coincidir, nadie sabe cuál manda. Ver
-- CLAUDE.md, "cómo retomar", paso 4.
--
-- Es repetible: correrlo dos veces da el mismo resultado que una.
--
-- Requiere PostgreSQL 15 o superior, igual que el archivo 08, por el
-- `security_invoker` de la vista.
--
-- =====================================================================
-- QUÉ ENTRA AQUÍ Y POR QUÉ AHORA
-- =====================================================================
--
-- `series_registradas` existe desde el archivo 01 y hasta hoy no
-- escribía nadie en ella. Con la pantalla de registrar peso y
-- repeticiones, empieza a llenarse — y eso desbloquea la CUARTA
-- métrica que `CLAUDE.md` pide y que el archivo 08 dejó escrita como
-- pendiente: **ejercicios más saltados**.
--
-- Entra en el mismo archivo que la pantalla, que era exactamente lo
-- acordado: una función que devuelve una lista vacía para siempre
-- parece rota, así que no se escribió antes de que hubiera datos.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. EL PESO DE LA ÚLTIMA VEZ
-- ---------------------------------------------------------------------
--
-- Para qué sirve: al abrir el entrenamiento, cada serie llega con el
-- peso ya escrito. Quien levanta lo mismo que la semana pasada —que es
-- casi siempre— no teclea nada.
--
-- Es la diferencia entre una pantalla que se usa sudado y a media serie
-- y una que se abandona a la tercera sesión. Escribir "72,5" con una
-- mano y el pulso alterado, ocho veces por entrenamiento, es justo lo
-- que hace que la gente deje de registrar.
--
-- POR QUÉ `distinct on` Y NO UN `group by` CON `max()`. Se necesita la
-- fila COMPLETA de la última serie —su peso y sus repeticiones juntos—,
-- no el máximo de cada columna por separado. Con `max(peso)` y
-- `max(reps)` saldría un par que quizá nunca ocurrió: el peso de un día
-- con las repeticiones de otro.
--
-- `distinct on` es de Postgres y no de SQL estándar. En Excel sería
-- ordenar por fecha descendente y quedarse con la primera fila de cada
-- ejercicio, en vez de sacar el máximo de dos columnas sueltas.
--
-- SE ORDENA POR `id` DESCENDENTE, no por fecha: `series_registradas` no
-- tiene columna de fecha, y el id es de identidad — siempre creciente.
-- La última fila insertada es la de id más alto, y eso es exactamente
-- "la última vez que registró este ejercicio".

drop view if exists v_ultima_serie;

create view v_ultima_serie
with (security_invoker = on) as
select distinct on (s.cliente_id, sr.ejercicio_id)
  s.cliente_id,
  sr.ejercicio_id,
  sr.peso_kg,
  sr.reps,
  sr.serie,
  s.id as sesion_id
from series_registradas sr
join sesiones s on s.id = sr.sesion_id
order by s.cliente_id, sr.ejercicio_id, sr.id desc;

comment on view v_ultima_serie is
  'La última serie registrada de cada ejercicio, por cliente. Para prellenar el peso.';

grant select on v_ultima_serie to authenticated;


-- ---------------------------------------------------------------------
-- 2. LA CUARTA MÉTRICA: EJERCICIOS MÁS SALTADOS
-- ---------------------------------------------------------------------
--
-- La pregunta que responde: de lo que él programa, ¿qué es lo que la
-- gente NO hace? Y no es una curiosidad — es lo que le dice qué
-- ejercicio está mal explicado, cuál necesita un equipo que sus
-- clientes no tienen en la casa, o cuál sencillamente odian.
--
-- CÓMO SE MIDE, que es lo que hay que entender antes de tocarla:
--
--   PROGRAMADO = los ejercicios de la rutina de una sesión completada.
--   HECHO      = que exista al menos una fila en series_registradas
--                para ese ejercicio en esa sesión.
--
-- Saltado es programado y no hecho. Se cuenta por SESIÓN COMPLETADA y
-- no por sesión empezada: alguien que abandonó a la mitad no "saltó"
-- los ejercicios del final, simplemente no llegó, y contarlos ahí
-- ensuciaría el número con abandonos.
--
-- LA TRAMPA QUE HAY QUE CONOCER: registrar series es OPCIONAL. Alguien
-- puede completar su entrenamiento entero sin anotar ni un peso, y en
-- esta cuenta saldría como si hubiera saltado todo. Por eso la función
-- devuelve también `sesiones_medidas` y las sesiones sin NINGÚN
-- registro se excluyen: solo se mira dentro de las sesiones donde la
-- persona SÍ estuvo anotando, que son las únicas en las que la ausencia
-- de una fila significa algo.
--
-- Sin esa exclusión, el ejercicio más "saltado" sería siempre el de los
-- clientes que no usan la función de registro, y la métrica mediría
-- quién anota en vez de qué se salta.

create or replace function ejercicios_saltados(p_semanas int default 8)
returns table (
  ejercicio_id   bigint,
  nombre         text,
  grupo          text,
  programado     int,
  saltado        int,
  porcentaje     int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_desde timestamptz;
begin
  -- La regla de oro del archivo 03: una función security definer
  -- comprueba quién llama antes de hacer nada. Esta cruza datos de
  -- todos los clientes en un solo número.
  if not es_admin() then
    raise exception 'Solo un administrador puede ver el panel de sus clientes.';
  end if;
  if p_semanas < 1 or p_semanas > 52 then
    raise exception 'Las semanas tienen que estar entre 1 y 52.';
  end if;

  v_desde := (date_trunc('week', (now() at time zone 'America/Bogota'))::date
              - ((p_semanas - 1) * 7))::timestamp at time zone 'America/Bogota';

  return query
  with medidas as (
    -- Solo las sesiones completadas EN LAS QUE SE ANOTÓ ALGO. Es la
    -- exclusión que hace que esto mida lo que dice medir.
    select s.id, s.rutina_id
      from sesiones s
     where s.completada
       and coalesce(s.terminada_en, s.iniciada_en) >= v_desde
       and exists (
         select 1 from series_registradas sr where sr.sesion_id = s.id
       )
  ),
  programado as (
    -- Lo que le TOCABA hacer en cada una de esas sesiones.
    select m.id as sesion_id, re.ejercicio_id as ej
      from medidas m
      join rutina_ejercicios re on re.rutina_id = m.rutina_id
  )
  select
    p.ej,
    e.nombre,
    e.grupo,
    count(*)::int,
    count(*) filter (
      where not exists (
        select 1 from series_registradas sr
         where sr.sesion_id = p.sesion_id and sr.ejercicio_id = p.ej
      )
    )::int,
    floor(
      count(*) filter (
        where not exists (
          select 1 from series_registradas sr
           where sr.sesion_id = p.sesion_id and sr.ejercicio_id = p.ej
        )
      )::numeric * 100 / count(*)
    )::int
  from programado p
  join ejercicios e on e.id = p.ej
  group by p.ej, e.nombre, e.grupo
  -- Solo los que se saltaron alguna vez, y el peor primero. Una lista
  -- con los 150 ejercicios y ceros al final no se lee: la pregunta es
  -- "cuál está fallando", no "cuántos hay".
  having count(*) filter (
    where not exists (
      select 1 from series_registradas sr
       where sr.sesion_id = p.sesion_id and sr.ejercicio_id = p.ej
    )
  ) > 0
  order by 6 desc, 4 desc
  limit 10;
end;
$$;

revoke all on function ejercicios_saltados(int) from public, anon;
grant execute on function ejercicios_saltados(int) to authenticated;


-- =====================================================================
-- CÓMO SE COMPRUEBA
-- =====================================================================
--
-- 1) QUE LA VISTA NO ENTREGUE DE MÁS. Es la misma trampa del archivo
--    08 y se comprueba igual, suplantando a un cliente:
--
--      select count(distinct cliente_id) from v_ultima_serie;
--
--    Tiene que dar 1 (o 0 si no ha registrado nada nunca).
--
-- 2) QUE UN CLIENTE NO PUEDA ABRIR LA MÉTRICA:
--
--      select * from ejercicios_saltados(8);
--
--    Tiene que fallar con "Solo un administrador...".
--
-- 3) QUE EL PRELLENADO TRAIGA LA ÚLTIMA Y NO CUALQUIERA. Registrando
--    el mismo ejercicio dos veces con pesos distintos, la vista tiene
--    que devolver el SEGUNDO:
--
--      select peso_kg from v_ultima_serie where ejercicio_id = <id>;
--
-- 4) QUE UNA SESIÓN SIN REGISTROS NO CUENTE COMO SALTADA. Completa una
--    sesión sin anotar ninguna serie y comprueba que
--    `ejercicios_saltados(8)` NO suma nada por ella. Es el punto donde
--    esta métrica se vuelve mentira si alguien "simplifica" la
--    condición `exists` de arriba.
-- =====================================================================

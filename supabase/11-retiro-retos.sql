-- =====================================================================
-- 11-retiro-retos.sql — se retiran los retos y el alias
-- =====================================================================
--
-- Sale del barrido de la regla 17 del 8/09. La regla dice que una
-- función de la base sin pantalla no existe; barriendo apareció que lo
-- mismo pasa con tablas enteras, y estas eran el caso más grande:
--
--   `retos`, `reto_participantes` y `perfiles.alias` — dos tablas, sus
--   cuatro políticas de RLS, un índice, y una columna que el navegador
--   tenía permiso de escribir sin que existiera ni un campo donde
--   escribirla. Nada de la app las ha tocado nunca.
--
-- POR QUÉ SE BORRAN EN VEZ DE DEJARLAS "POR SI ACASO". Un reto vive de
-- que haya gente compitiendo, y el entrenador arranca con 6 a 15
-- clientes que todavía no han entrado. Mientras tanto no son gratis:
-- cada tabla con RLS entra en el ritual de suplantación del paso 8 de
-- PASOS-FASE-2.md, o sea que hay que volver a comprobarlas cada vez que
-- se toca la seguridad, para siempre, por una función que no existe.
--
-- Y no se pierde nada: el esquema queda escrito en el historial de git y
-- en el archivo 01. El día que haya retos se vuelve a poner, ya sabiendo
-- cómo tienen que ser.
--
-- LO QUE **NO** SE BORRA, y es lo que más se parece: `entrenador_id`.
-- Esa se queda. La diferencia es que `entrenador_id` SE LLENA —
-- `vincular_con_codigo` la escribe en cada canje desde el 1/09—, así
-- que borrarla perdería datos reales que hoy ya existen. `alias`
-- siempre ha llegado nula: ninguna pantalla la manda.
--
-- =====================================================================
-- CÓMO SE LEE ESTE ARCHIVO DENTRO DE LA SERIE
-- =====================================================================
--
-- ESTE ARCHIVO ES SOLO PARA LA BASE QUE YA ESTÁ CORRIENDO. Un proyecto
-- nuevo no lo necesita: los archivos 01, 02, 03 y 04 ya quedaron sin los
-- retos ni el alias, con los bloques comentados en su sitio para que se
-- vea qué había y por qué se fue.
--
-- Hubo que tocarlos, aunque la regla diga que un cambio nuevo va en un
-- archivo nuevo. La razón es que aquí no se AGREGA algo: se quita. El 02
-- le activaba RLS a una tabla que este archivo borra y el 04 le
-- insertaba una fila, así que dejándolos intactos la serie completa
-- dejaba de poder correrse — y que sea repetible es justo lo que la
-- regla protege. Lo que NO se hizo fue borrar el diseño: está comentado,
-- no eliminado.
--
-- Correr esto sobre una base nueva no rompe nada: todo va con `if
-- exists` y `create or replace`, así que se queda sin hacer nada.
--
-- HAY QUE CORRERLO A MANO en el SQL Editor, como los demás.


-- ---------------------------------------------------------------------
-- 1. LOS RETOS
-- ---------------------------------------------------------------------
--
-- Las políticas y el índice se van solos con la tabla: no hay que
-- borrarlos uno por uno. `reto_participantes` va primero porque apunta
-- a `retos`.

drop table if exists reto_participantes;
drop table if exists retos;


-- ---------------------------------------------------------------------
-- 2. EL ALIAS
-- ---------------------------------------------------------------------
--
-- El alias existía para una sola cosa: ser lo único que los demás vieran
-- de ti dentro de un reto. Sin retos no le queda ningún uso.
--
-- EL ORDEN IMPORTA Y ES LA PARTE DELICADA DE ESTE ARCHIVO.
-- `vincular_con_codigo` menciona la columna, así que primero se retira
-- la función, después la columna, y de últimas se vuelve a crear la
-- función sin ella. Al revés, la columna no se deja borrar.
--
-- Y ES LA FUNCIÓN MÁS DELICADA DEL PROYECTO: es la única puerta por la
-- que alguien se vuelve cliente. Si esto queda a medias, nadie puede
-- entrar. Por eso el cuerpo de abajo es el mismo de 03-funciones.sql
-- palabra por palabra, con las dos menciones al alias quitadas y nada
-- más tocado.

-- La firma vieja lleva tres argumentos. La nueva lleva dos, así que NO
-- basta con `create or replace`: quedarían las dos funciones vivas y
-- PostgREST tendría que adivinar cuál llamar.
drop function if exists vincular_con_codigo(text, text, text);

alter table perfiles drop column if exists alias;

-- El permiso por columna se fue con la columna. Se vuelve a escribir el
-- bloque entero para que quede dicho qué puede escribir el navegador
-- sobre `perfiles`, que ahora es UNA sola columna.
--
-- Sigue siendo el hueco que tapaba 02-politicas.sql: sin esto, alguien
-- con la consola abierta se escribiría su propio `rol = 'admin'` o su
-- propio XP.
revoke update on perfiles from authenticated;
grant  update (nombre) on perfiles to authenticated;

create or replace function vincular_con_codigo(
  p_codigo text,
  p_nombre text
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
  insert into perfiles (id, rol, nombre, entrenador_id)
  values (
    v_uid,
    'cliente',
    trim(p_nombre),
    v_inv.creada_por        -- queda registrado quién lo invitó. Hoy no
                            -- lo usa ninguna política; el día que haya
                            -- un segundo entrenador, es el dato que
                            -- evita tener que adivinar.
  )
  on conflict (id) do update
     set rol           = 'cliente',
         nombre        = excluded.nombre,
         entrenador_id = excluded.entrenador_id
  returning * into v_perfil;

  update invitaciones set usada_por = v_uid where codigo = v_inv.codigo;

  return v_perfil;
end;
$$;

-- Las dos cerraduras de siempre, ahora sobre la firma de dos
-- argumentos. La de tres se fue con el `drop` de arriba y se llevó sus
-- permisos.
revoke all    on function vincular_con_codigo(text, text) from public, anon;
grant  execute on function vincular_con_codigo(text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. AVISARLE A LA API QUE EL ESQUEMA CAMBIÓ
-- ---------------------------------------------------------------------
--
-- PostgREST —lo que hay detrás de `supabase.from(...)` y de `.rpc(...)`—
-- guarda en memoria una copia del esquema. Después de borrar una
-- columna o cambiarle la firma a una función puede seguir contestando
-- con la copia vieja durante un rato, y eso se ve desde la app como un
-- error que "aparece solo y se arregla solo": lo peor de diagnosticar.
--
-- Esta línea le dice que la vuelva a leer ya.
notify pgrst, 'reload schema';


-- =====================================================================
-- CÓMO SE COMPRUEBA QUE QUEDÓ BIEN
-- =====================================================================
--
-- No basta con que corra sin error. Lo que hay que ver es que la puerta
-- de entrada siga abierta, porque es lo único que este archivo pudo
-- haber roto:
--
--   1. Crear una cuenta nueva y entrar SIN código -> queda de visitante.
--   2. Desde Perfil -> "Tengo un código", canjear uno -> pasa a cliente
--      y aparece su plan en Hoy.
--   3. En el SQL Editor:
--        select proname, pronargs from pg_proc
--         where proname = 'vincular_con_codigo';
--      Tiene que salir UNA sola fila, con 2 argumentos. Si salen dos,
--      el `drop` de la firma vieja no corrió.
--
-- Los pasos 1 y 2 son parte de la ronda del celular que ya estaba
-- pendiente, así que no agregan trabajo: agregan una cosa más que mirar
-- mientras se hace.

-- =====================================================================
-- 02-politicas.sql — los permisos (RLS).
-- =====================================================================
--
-- ESTE ES EL ARCHIVO QUE NO SE PUEDE SALTAR. Sin él las 19 tablas están
-- abiertas: cualquiera con la llave publishable —que vive dentro del
-- navegador de todo el mundo— podría leer los datos de salud de todos
-- los clientes. La llave solo dice "soy esta app"; lo que separa a un
-- cliente de otro es lo que hay aquí.
--
-- QUÉ ES ROW LEVEL SECURITY, en términos de Excel:
-- imagina que a cada hoja del libro le pegas un autofiltro que NO se
-- puede quitar, y que se aplica distinto según quién abre el archivo.
-- Tú abres "Sesiones" y ves 400 filas; tu cliente abre la misma hoja y
-- ve 40, las suyas. No es que la app filtre y muestre menos: es que la
-- base de datos le entrega menos. Aunque el cliente escriba la consulta
-- a mano desde la consola del navegador, sigue viendo 40.
--
-- SE CORRE DESPUÉS DE 01. Se puede repetir sin romper nada: cada
-- política se borra antes de crearse.
--
--
-- LAS DOS TRAMPAS DE ESTE ARCHIVO
--
-- 1) RECURSIÓN INFINITA. La política de "perfiles" necesita saber si
--    quien pregunta es admin, y eso se sabe... mirando "perfiles". Si lo
--    escribes directo, para leer perfiles hay que leer perfiles, y
--    Postgres se muerde la cola (error 42P17). Por eso existe
--    es_admin(): va en "security definer", que significa "esta función
--    corre con los permisos de quien la creó, no de quien la llama", y
--    por eso puede mirar perfiles sin pasar por la política.
--
-- 2) RENDIMIENTO A ESCALA. Toda política se escribe envuelta en un
--    (select ...): "(select auth.uid())" en vez de "auth.uid()".
--    Envuelta, Postgres la resuelve UNA VEZ por consulta y reutiliza el
--    resultado. Suelta, la resuelve UNA VEZ POR FILA. Es la diferencia
--    entre arrastrar una fórmula que consulta una celda fija y una que
--    recalcula toda la hoja en cada renglón. Con 15 clientes no se nota;
--    con 300.000 series registradas es la diferencia entre 40 ms y
--    veinte segundos. Cuesta lo mismo escribirlo bien hoy.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. LA FUNCIÓN QUE USAN CASI TODAS LAS POLÍTICAS
-- ---------------------------------------------------------------------

create or replace function es_admin()
returns boolean
language sql
stable                       -- stable = "dentro de una misma consulta,
                             -- el resultado no cambia". Es lo que le
                             -- permite a Postgres calcularla una vez.
security definer             -- corre con permisos del dueño -> no pasa
                             -- por la política de perfiles -> sin
                             -- recursión (trampa 1).
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

comment on function es_admin() is
  'true si quien hace la consulta es administrador. security definer a '
  'proposito: sin eso, la politica de perfiles se llamaria a si misma.';


-- La hermana de es_admin(), para el contenido que separa cliente de
-- visitante.
--
-- OJO al 'admin' incluido: no es un descuido. Casi todas las políticas
-- de contenido dicen "esto lo ve un cliente"; si el admin no contara
-- como tal, habría que escribir "(es_cliente() or es_admin())" catorce
-- veces y bastaría olvidarlo una para que el entrenador dejara de ver
-- su propio contenido. Se resuelve una vez, aquí.
--
-- El VISITANTE queda fuera a propósito: se registró sin código, ve el
-- catálogo y lo marcado como público, y nada más.
create or replace function es_cliente()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and rol in ('cliente', 'admin')
  );
$$;

comment on function es_cliente() is
  'true si quien consulta es cliente o admin. El visitante no lo es.';


-- ---------------------------------------------------------------------
-- 1. ENCENDER RLS EN LAS 19 TABLAS
-- ---------------------------------------------------------------------
--
-- Ojo con esto: encender RLS sin crear políticas NO deja la tabla a
-- medias, la deja CERRADA. Sin política que diga que sí, la respuesta
-- por defecto es no. Por eso las dos cosas van en el mismo archivo.

alter table perfiles             enable row level security;
alter table perfil_salud         enable row level security;
alter table consentimientos      enable row level security;
alter table invitaciones         enable row level security;
alter table ejercicios           enable row level security;
alter table rutinas              enable row level security;
alter table rutina_ejercicios    enable row level security;
alter table plantillas           enable row level security;
alter table plantilla_dias       enable row level security;
alter table planes               enable row level security;
alter table plan_dias            enable row level security;
alter table sesiones             enable row level security;
alter table series_registradas   enable row level security;
alter table recetas              enable row level security;
alter table planes_comida        enable row level security;
alter table plan_comida_dias     enable row level security;
alter table logros_obtenidos     enable row level security;
alter table retos                enable row level security;
alter table reto_participantes   enable row level security;


-- ---------------------------------------------------------------------
-- 2. QUIÉN ES QUIÉN
-- ---------------------------------------------------------------------

-- PERFILES ------------------------------------------------------------
--
-- AVISO PARA QUIEN ESCRIBA CONSULTAS CONTRA ESTAS TABLAS (2/09).
-- Las tres políticas de abajo, y las de perfil_salud y consentimientos,
-- terminan en "... or es_admin()". Eso significa que PARA UN ADMIN la
-- condición es verdadera en TODAS las filas: el entrenador recibe los
-- perfiles de todos sus clientes, no el suyo.
--
-- Es lo correcto y tiene que quedarse así — en las Fases 4 y 5 él
-- necesita ver a sus clientes para programarles. Pero obliga a una
-- regla del lado del navegador:
--
--   SI EL CÓDIGO NECESITA UNA FILA CONCRETA, LA PIDE POR SU ID.
--   Nunca se confía en que la política recorte hasta dejar una sola.
--
-- Costó un bug real: useSesion pedía "las filas de perfiles" con
-- maybeSingle() y funcionaba para todo el mundo menos para el
-- entrenador, a quien le llegaban cuatro filas, el maybeSingle fallaba
-- y la app lo mandaba a la pantalla de activación. Un error así solo
-- aparece con la cuenta que MÁS permisos tiene, que es la última que
-- se prueba.
--
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select to authenticated
  using (id = (select auth.uid()) or (select es_admin()));

drop policy if exists perfiles_update on perfiles;
create policy perfiles_update on perfiles for update to authenticated
  using (id = (select auth.uid()) or (select es_admin()))
  with check (id = (select auth.uid()) or (select es_admin()));

drop policy if exists perfiles_delete_admin on perfiles;
create policy perfiles_delete_admin on perfiles for delete to authenticated
  using ((select es_admin()));

-- NO hay política de INSERT, y es a propósito. El perfil solo lo crea
-- vincular_con_codigo() (archivo 03) después de validar el código de
-- invitación. Sin código válido te puedes autenticar, pero no existes
-- para la app: no tienes fila aquí, así que ninguna otra política te
-- deja ver nada. Ese es el candado real del registro cerrado.

-- EL XP NO SE EDITA A MANO.
-- RLS decide QUÉ FILAS puede tocar alguien, no QUÉ COLUMNAS. La
-- política de arriba deja al cliente actualizar su propia fila, y eso
-- incluiría "xp = 999999" escrito desde la consola del navegador. Los
-- permisos por columna son otra capa distinta, y esta es la que cierra
-- el hueco: de perfiles solo puede escribir nombre y alias.
revoke update on perfiles from authenticated;
grant  update (nombre, alias) on perfiles to authenticated;
-- (el XP lo sube el trigger del archivo 03, que corre por fuera de esto)
--
-- CONSECUENCIA QUE HAY QUE TENER PRESENTE: esto aplica también al
-- entrenador, porque desde la app él también entra como "authenticated".
-- Es decir, desde la app nadie puede cambiar el rol de nadie ni tocar
-- entrenador_id. Es deliberado: volver admin a alguien no es una
-- operación de todos los días y no debería estar a un clic de
-- distancia. Se hace desde el SQL Editor, a conciencia. Si algún día
-- hace falta desde la app, va como función security definer en el
-- archivo 03, con su comprobación de quién llama — nunca abriendo la
-- columna.

-- PERFIL_SALUD --------------------------------------------------------
-- El entrenador LEE lesiones y objetivo, porque sin eso no puede
-- programar. Pero no escribe: el dato de salud lo da y lo corrige su
-- dueño. Es lo que hace defendible el consentimiento del que habla la
-- Ley 1581 — si el entrenador pudiera editarlo, "el titular controla
-- sus datos" sería mentira.
drop policy if exists salud_select on perfil_salud;
create policy salud_select on perfil_salud for select to authenticated
  using (perfil_id = (select auth.uid()) or (select es_admin()));

drop policy if exists salud_escribe_dueno on perfil_salud;
create policy salud_escribe_dueno on perfil_salud for all to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

-- CONSENTIMIENTOS -----------------------------------------------------
-- Solo se insertan y se leen. No hay update ni delete, y esa ausencia
-- ES la función de la tabla: un consentimiento no se edita, se agrega
-- uno nuevo con otra fecha. Lo que queda es un historial que no se
-- puede reescribir, y ese historial es la prueba de que hubo
-- autorización. Si se pudiera editar, no probaría nada.
drop policy if exists consent_select on consentimientos;
create policy consent_select on consentimientos for select to authenticated
  using (perfil_id = (select auth.uid()) or (select es_admin()));

drop policy if exists consent_insert on consentimientos;
create policy consent_insert on consentimientos for insert to authenticated
  with check (perfil_id = (select auth.uid()));

-- INVITACIONES --------------------------------------------------------
-- Solo el admin. El cliente NUNCA consulta esta tabla: valida su código
-- a través de vincular_con_codigo(), que corre en security definer. Si
-- pudiera leerla, podría listar los códigos sin usar de los demás.
drop policy if exists invitaciones_admin on invitaciones;
create policy invitaciones_admin on invitaciones for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 3. LA BIBLIOTECA DEL ENTRENADOR
-- ---------------------------------------------------------------------
--
-- Ejercicios, rutinas y recetas los puede LEER cualquiera que haya
-- entrado. Es contenido del entrenador, no dato personal de nadie: que
-- un cliente vea el catálogo completo no le revela nada de otro
-- cliente. Escribir, solo el admin.
--
-- Se consideró restringirlo a "solo los ejercicios que están en TU
-- plan". Se descartó: obligaría a que cada consulta de un ejercicio
-- cruzara cuatro tablas para probar que te corresponde, en la pantalla
-- que más se abre de la app, y a cambio de esconder algo que no es
-- privado.

-- EJERCICIOS ----------------------------------------------------------
-- El catálogo queda abierto también para el VISITANTE, y es deliberado:
-- es el gancho. Un desconocido que abre la app y encuentra 120
-- ejercicios bien explicados vuelve; uno que encuentra una pantalla
-- pidiéndole un código, no. Y no se regala nada: la lista de ejercicios
-- con sus indicaciones está en YouTube gratis.
--
-- El `or es_admin()` deja al entrenador LEER los archivados, que es lo
-- que necesita el panel de "Tu biblioteca" para poder restaurarlos.
--
-- OJO: eso NO significa que los archivados deban salir en el catálogo
-- del entrenador. La pantalla de Ejercicios los filtra a mano con
-- `.eq('activo', true)` para que él vea exactamente lo mismo que sus
-- clientes. Es la misma regla del aviso de PERFILES: la política dice
-- qué se PUEDE leer, la consulta dice qué se QUIERE leer.
drop policy if exists ejercicios_select on ejercicios;
create policy ejercicios_select on ejercicios for select to authenticated
  using (activo or (select es_admin()));

drop policy if exists ejercicios_admin on ejercicios;
create policy ejercicios_admin on ejercicios for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));

-- RUTINAS -------------------------------------------------------------
-- AQUÍ SE PARTE EN DOS LA APP.
-- El visitante ve las rutinas marcadas como públicas: son la muestra
-- gratis, lo que le hace pensar que vale la pena ser cliente. El resto
-- del repertorio del entrenador es de clientes.
drop policy if exists rutinas_select on rutinas;
create policy rutinas_select on rutinas for select to authenticated
  using (publica or (select es_cliente()));

drop policy if exists rutinas_admin on rutinas;
create policy rutinas_admin on rutinas for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));

-- Los ejercicios de una rutina siguen a la rutina. Si esto se quedara
-- en "true", un visitante no vería la rutina pero SÍ su contenido
-- consultando esta tabla directo — que es todo lo que hay que ver.
-- Es el error clásico: proteger la tabla de arriba y olvidar la de
-- abajo.
drop policy if exists rutina_ej_select on rutina_ejercicios;
create policy rutina_ej_select on rutina_ejercicios for select to authenticated
  using (
    (select es_cliente())
    or exists (
      select 1 from rutinas r
      where r.id = rutina_ejercicios.rutina_id and r.publica
    )
  );

drop policy if exists rutina_ej_admin on rutina_ejercicios;
create policy rutina_ej_admin on rutina_ejercicios for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 4. PLANTILLAS — invisibles para el cliente
-- ---------------------------------------------------------------------
--
-- Aquí sí se cierra del todo. La plantilla es la herramienta interna
-- con la que el entrenador arma los planes; que un cliente vea el molde
-- del que salió su rutina no le aporta nada y sí le quita valor al
-- trabajo de él.

drop policy if exists plantillas_admin on plantillas;
create policy plantillas_admin on plantillas for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));

drop policy if exists plantilla_dias_admin on plantilla_dias;
create policy plantilla_dias_admin on plantilla_dias for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 5. EL PLAN DE CADA CLIENTE — aquí es donde se juega todo
-- ---------------------------------------------------------------------

-- PLANES --------------------------------------------------------------
drop policy if exists planes_select on planes;
create policy planes_select on planes for select to authenticated
  using (cliente_id = (select auth.uid()) or (select es_admin()));

drop policy if exists planes_admin on planes;
create policy planes_admin on planes for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));

-- PLAN_DIAS -----------------------------------------------------------
-- Esta tabla no tiene cliente_id: cuelga del plan. Así que la política
-- tiene que ir a preguntarle al plan de quién es. El "exists" es la
-- forma barata de hacerlo: Postgres para de buscar apenas encuentra una
-- fila, no cuenta todas.
drop policy if exists plan_dias_select on plan_dias;
create policy plan_dias_select on plan_dias for select to authenticated
  using (
    (select es_admin())
    or exists (
      select 1 from planes p
      where p.id = plan_dias.plan_id
        and p.cliente_id = (select auth.uid())
    )
  );

drop policy if exists plan_dias_admin on plan_dias;
create policy plan_dias_admin on plan_dias for all to authenticated
  using ((select es_admin()))
  with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 6. LO QUE HACE EL CLIENTE
-- ---------------------------------------------------------------------

-- SESIONES ------------------------------------------------------------
-- El cliente manda sobre las suyas; el entrenador solo mira. Que él no
-- pueda escribir sesiones es deliberado: si el panel de adherencia se
-- alimentara de filas que el entrenador puede crear, dejaría de medir
-- lo que pasó de verdad.
drop policy if exists sesiones_select on sesiones;
create policy sesiones_select on sesiones for select to authenticated
  using (cliente_id = (select auth.uid()) or (select es_admin()));

drop policy if exists sesiones_dueno on sesiones;
create policy sesiones_dueno on sesiones for all to authenticated
  using (cliente_id = (select auth.uid()))
  with check (
    cliente_id = (select auth.uid())
    -- Y ADEMÁS: el día del plan al que se engancha la sesión tiene que
    -- ser de un plan suyo. Sin esta segunda condición, un cliente puede
    -- crear una sesión perfectamente válida a su nombre pero colgada
    -- del plan de otra persona. No le deja LEER nada ajeno —de eso se
    -- encarga la política de arriba—, pero le ensucia al entrenador la
    -- adherencia de ese otro cliente. Un panel con números falsos es
    -- peor que no tener panel.
    and (
      plan_dia_id is null            -- sesión suelta, fuera del plan: se permite
      or exists (
        select 1
          from plan_dias pd
          join planes p on p.id = pd.plan_id
         where pd.id = sesiones.plan_dia_id
           and p.cliente_id = (select auth.uid())
      )
    )
  );

-- SERIES_REGISTRADAS --------------------------------------------------
-- La tabla que más va a crecer: 3 sesiones por semana x 8 ejercicios x
-- 4 series son ~100 filas por cliente por semana. Con 300 clientes son
-- millones al año, y esta política se evalúa en cada una. Por eso el
-- índice de más abajo sobre sesiones(cliente_id) no es opcional.
drop policy if exists series_select on series_registradas;
create policy series_select on series_registradas for select to authenticated
  using (
    (select es_admin())
    or exists (
      select 1 from sesiones s
      where s.id = series_registradas.sesion_id
        and s.cliente_id = (select auth.uid())
    )
  );

drop policy if exists series_dueno on series_registradas;
create policy series_dueno on series_registradas for all to authenticated
  using (
    exists (
      select 1 from sesiones s
      where s.id = series_registradas.sesion_id
        and s.cliente_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from sesiones s
      where s.id = series_registradas.sesion_id
        and s.cliente_id = (select auth.uid())
    )
  );


-- ---------------------------------------------------------------------
-- 7. RECETAS — contenido genérico, igual para todos
-- ---------------------------------------------------------------------
--
-- Que no exista ninguna política de "tus recetas" no es un olvido: es
-- que NINGUNA tabla conecta comida con cliente, y eso es lo que
-- mantiene el contenido dentro de lo legal en Colombia (Ley 73 de 1979,
-- ver CLAUDE.md). Si algún día aparece una política aquí que filtre por
-- cliente, es que alguien cruzó la línea.

drop policy if exists recetas_select on recetas;
create policy recetas_select on recetas for select to authenticated
  using (publica or (select es_cliente()));

drop policy if exists recetas_admin on recetas;
create policy recetas_admin on recetas for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));

drop policy if exists planes_comida_select on planes_comida;
create policy planes_comida_select on planes_comida for select to authenticated
  using (publicado or (select es_admin()));   -- el borrador solo lo ve él

drop policy if exists planes_comida_admin on planes_comida;
create policy planes_comida_admin on planes_comida for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));

drop policy if exists plan_comida_dias_select on plan_comida_dias;
create policy plan_comida_dias_select on plan_comida_dias for select to authenticated
  using (
    (select es_admin())
    or exists (
      select 1 from planes_comida pc
      where pc.id = plan_comida_dias.plan_id and pc.publicado
    )
  );

drop policy if exists plan_comida_dias_admin on plan_comida_dias;
create policy plan_comida_dias_admin on plan_comida_dias for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 8. GAMIFICACIÓN
-- ---------------------------------------------------------------------

-- LOGROS --------------------------------------------------------------
-- El cliente los lee y los marca como vistos, pero NO los crea: los
-- otorga el trigger del archivo 03 cuando completa una sesión. Un logro
-- que te puedes regalar tú mismo no es un logro.
drop policy if exists logros_select on logros_obtenidos;
create policy logros_select on logros_obtenidos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select es_admin()));

drop policy if exists logros_marcar_visto on logros_obtenidos;
create policy logros_marcar_visto on logros_obtenidos for update to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));

revoke update on logros_obtenidos from authenticated;
grant  update (visto) on logros_obtenidos to authenticated;

-- RETOS ---------------------------------------------------------------
drop policy if exists retos_select on retos;
create policy retos_select on retos for select to authenticated
  using ((select es_cliente()));   -- un reto sin plan no significa nada

drop policy if exists retos_admin on retos;
create policy retos_admin on retos for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));

-- RETO_PARTICIPANTES --------------------------------------------------
-- LA TABLA MÁS DELICADA DE LA APP, aunque no lo parezca.
-- Mostrar "Ana hizo 12 entrenamientos este mes" a otras personas es
-- publicar el dato de salud de Ana. Por eso participar es opt-in y
-- aparecer en la tabla de posiciones es OTRO opt-in (visible). Lo que
-- los demás ven de ti es tu alias, nunca tu nombre: mira perfiles.
drop policy if exists reto_part_select on reto_participantes;
create policy reto_part_select on reto_participantes for select to authenticated
  using (
    cliente_id = (select auth.uid())   -- lo tuyo, siempre
    or visible                          -- los que decidieron mostrarse
    or (select es_admin())
  );

drop policy if exists reto_part_dueno on reto_participantes;
create policy reto_part_dueno on reto_participantes for all to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));

drop policy if exists reto_part_admin on reto_participantes;
create policy reto_part_admin on reto_participantes for all to authenticated
  using ((select es_admin())) with check ((select es_admin()));


-- ---------------------------------------------------------------------
-- 9. LOS ÍNDICES QUE SOSTIENEN LAS POLÍTICAS
-- ---------------------------------------------------------------------
--
-- ESTO NO ES OPCIONAL Y ES LA PARTE QUE MÁS SE OLVIDA.
--
-- Una política de RLS no es un permiso: es un WHERE que Postgres le
-- pega, sin que tú lo veas, a TODAS las consultas de esa tabla. Si la
-- columna de ese WHERE no tiene índice, cada consulta recorre la tabla
-- entera. Es la razón número uno de que una app con RLS funcione
-- perfecto con 15 clientes y se arrastre con 300: el código no cambió,
-- cambió cuántas filas hay que leer para descartar.
--
-- En Excel: es la diferencia entre BUSCARV sobre una columna ordenada y
-- recorrer las 200.000 filas de arriba a abajo en cada celda.

create index if not exists ix_planes_cliente
  on planes (cliente_id) where activo;
create index if not exists ix_consentimientos_perfil
  on consentimientos (perfil_id, fecha desc);
create index if not exists ix_logros_cliente
  on logros_obtenidos (cliente_id) where not visto;
create index if not exists ix_reto_part_cliente
  on reto_participantes (cliente_id);
create index if not exists ix_invitaciones_sin_usar
  on invitaciones (expira_en) where usada_por is null;
create index if not exists ix_perfiles_entrenador
  on perfiles (entrenador_id);

-- Para la analítica del panel: "qué ejercicio se salta más la gente"
-- entra por ejercicio, no por sesión. El índice que ya existe
-- (ix_series_sesion) sirve para lo contrario.
create index if not exists ix_series_ejercicio
  on series_registradas (ejercicio_id, sesion_id);


-- =====================================================================
-- CÓMO SE COMPRUEBA QUE ESTO SIRVE
-- =====================================================================
--
-- No se supone: se prueba. En el SQL Editor, haciéndote pasar por un
-- cliente. Reemplaza el uuid por el de un cliente de prueba y corre:
--
--   begin;
--     set local role authenticated;
--     set local request.jwt.claims =
--       '{"sub":"PEGA-AQUI-EL-UUID-DEL-CLIENTE","role":"authenticated"}';
--
--     select count(*) from perfiles;      -- tiene que dar 1 (el suyo)
--     select count(*) from plantillas;    -- tiene que dar 0
--     select count(*) from planes;        -- solo el suyo
--     select count(*) from sesiones;      -- solo las suyas
--   rollback;
--
-- El rollback deshace el cambio de rol. Si alguno de esos números sale
-- más alto de lo que debería, hay un hueco y no se sigue hasta taparlo.
--
-- SON TRES ROLES, ASÍ QUE LA PRUEBA VA TRES VECES. La misma consulta
-- con el uuid de un visitante tiene que dar números MENORES que la del
-- cliente: 1 rutina (la pública) contra 4, 2 recetas contra 6, 0 retos,
-- 0 planes. Si el visitante ve lo mismo que el cliente, la app es
-- gratis sin querer. Y si el cliente ve menos de lo que debe, pagó por
-- nada. Los dos errores se ven en el mismo sitio.
-- Está detallado en PASOS-FASE-2.md, paso 8.
-- =====================================================================

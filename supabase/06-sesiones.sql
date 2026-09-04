-- =====================================================================
-- 06-sesiones.sql — que una sesión no se pueda completar dos veces
-- =====================================================================
--
-- ARCHIVO NUEVO, NO UNA EDICIÓN. Los archivos 01 a 05 ya se corrieron
-- contra la base de producción. Volver a editarlos haría que lo que
-- está en el repositorio y lo que está corriendo dejen de coincidir, y
-- nadie sabría cuál de los dos es la verdad. Todo cambio posterior va
-- en su propio archivo, numerado. Está en CLAUDE.md, "cómo retomar",
-- paso 4.
--
-- Es repetible: correrlo dos veces no hace nada la segunda.
--
-- =====================================================================
-- EL HUECO QUE ESTO TAPA
-- =====================================================================
--
-- El trigger `tr_xp_sesion` (03-funciones.sql) paga 50 XP cada vez que
-- una sesión pasa a completada. Está hecho así a propósito: el XP no lo
-- suma el navegador, porque todo lo que corre en el navegador lo puede
-- reescribir quien tenga el navegador.
--
-- Pero al trigger le faltaba una pareja. Nada impedía INSERTAR varias
-- sesiones completadas para el mismo día del plan, y cada una disparaba
-- el trigger. O sea que el XP estaba protegido contra que lo
-- escribieran, y no contra que lo pidieran veinte veces seguidas.
--
-- Bastaba abrir la consola y repetir la llamada. Con una tabla de
-- posiciones —que es la Fase 5— eso deja el reto sin gracia para los
-- otros catorce clientes, que es exactamente el daño que el trigger
-- existía para evitar.
--
-- La app además no ofrece el botón si el día ya está hecho, pero eso es
-- comodidad, no seguridad. Lo que de verdad lo impide es este índice,
-- porque vive en el servidor.

-- UN día del plan, UNA sesión completada.
--
-- Es un índice PARCIAL (`where completada`) por dos razones:
--
--   1. Deja convivir la sesión en curso con la ya terminada si alguna
--      vez hiciera falta. Lo que no se puede repetir es el HECHO.
--   2. Un índice sobre las filas que importan es más pequeño y más
--      rápido que uno sobre todas.
--
-- `plan_dia_id` puede ser null —una sesión suelta, fuera del plan— y en
-- Postgres los nulos no chocan entre sí en un índice único. Así que
-- esto no bloquea entrenar por fuera del plan: solo impide cobrar dos
-- veces el mismo día programado.
create unique index if not exists ux_sesiones_dia_completada
  on sesiones (cliente_id, plan_dia_id)
  where completada;

-- Lo que la pantalla de Hoy pregunta en cada carga: "¿este cliente ya
-- tiene sesión para el día de hoy?". Sin índice es leer todas sus
-- sesiones cada vez que abre la app, que es la pantalla que más se
-- abre de toda la app.
create index if not exists ix_sesiones_plan_dia
  on sesiones (cliente_id, plan_dia_id);


-- ---------------------------------------------------------------------
-- CÓMO COMPROBAR QUE QUEDÓ BIEN
-- ---------------------------------------------------------------------
-- Suplantando a un cliente en el SQL Editor, con el id de un plan_dia
-- suyo. La segunda tiene que fallar con "duplicate key value violates
-- unique constraint":
--
--   insert into sesiones (cliente_id, plan_dia_id, rutina_id, completada,
--                         terminada_en)
--   values ('<uuid del cliente>', <id del plan_dia>, <id rutina>, true, now());
--   -- repetir la MISMA línea: debe fallar.
--
-- Y revisar que el XP subió una sola vez:
--
--   select xp from perfiles where id = '<uuid del cliente>';

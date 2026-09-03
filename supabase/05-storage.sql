-- =====================================================================
-- 05-storage.sql — quién puede subir, cambiar y borrar las imágenes
-- =====================================================================
--
-- ESTE ARCHIVO NO CREA EL BUCKET. El bucket `ejercicios` se crea a mano
-- desde el panel de Supabase (Storage -> New bucket, público, 2 MB,
-- solo jpeg/png/webp). Está escrito paso a paso en PASOS-FASE-3.md.
-- Aquí van solo los permisos, que es lo que no se puede hacer con
-- clics.
--
-- QUÉ ES STORAGE, EN CORTO. Es un disco duro con una tabla al lado.
-- Los archivos se guardan aparte, pero cada uno tiene su fila en
-- `storage.objects`, y esa tabla obedece las mismas políticas de RLS
-- que las demás. O sea: proteger los archivos es escribir un WHERE,
-- igual que con `ejercicios` o con `planes`.
--
-- LA REGLA, EN UNA LÍNEA: todo el mundo lee, solo el admin escribe.
--
-- POR QUÉ EL BUCKET ES PÚBLICO Y NO ES UN DESCUIDO. Son fotos de
-- alguien haciendo una sentadilla. No hay nada privado, y el catálogo
-- lo ve hasta un visitante — es el gancho de la app. Si fuera privado,
-- cada imagen necesitaría una dirección firmada que caduca, y abrir el
-- catálogo serían 150 peticiones extra antes de ver la primera foto.
-- Lento, a cambio de esconder algo que no vale la pena esconder.
--
-- LO QUE SÍ IRÍA EN UN BUCKET PRIVADO, si algún día existe: las fotos
-- de progreso de los clientes. Esas están descartadas para la v1
-- justamente por esto — ver la regla 2 de PARAR en CLAUDE.md.
--
-- OJO CON UNA COSA QUE NO ES OBVIA: "público" quiere decir que
-- cualquiera con la dirección ve la imagen, sin cuenta y sin permiso.
-- Y la dirección se arma con el nombre del archivo, así que es
-- adivinable. Consecuencia práctica: en este bucket NO entra ninguna
-- foto en la que se reconozca a un cliente. Ver el aviso al final.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. LEER — cualquiera que haya entrado a la app
-- ---------------------------------------------------------------------
--
-- Esta política gobierna la API (pedir la lista de archivos del
-- bucket). Las imágenes en sí, al ser el bucket público, las sirve el
-- CDN sin pasar por aquí. Se escribe igual: el día que el bucket deje
-- de ser público, esta línea ya está y no hay que acordarse de ella.
--
-- Va a `anon` además de `authenticated` a propósito. Hoy no hace falta
-- —para ver el catálogo hay que tener sesión—, pero si mañana la
-- portada muestra tres ejercicios de muestra sin pedir cuenta, esto ya
-- funciona.
drop policy if exists ejercicios_img_leer on storage.objects;
create policy ejercicios_img_leer on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'ejercicios');


-- ---------------------------------------------------------------------
-- 2. SUBIR, REEMPLAZAR Y BORRAR — solo el entrenador
-- ---------------------------------------------------------------------
--
-- Tres políticas separadas y no un `for all`, porque son tres permisos
-- distintos y algún día podrían no ir juntos: se puede querer que suba
-- pero no que borre.
--
-- `public.es_admin()` va con el esquema por delante. Estas políticas
-- corren en el contexto del esquema `storage`, que no tiene `public` en
-- su ruta de búsqueda: sin el prefijo, Postgres no encuentra la función
-- y la política falla al crearse.
--
-- Es la MISMA función que usan las políticas de las 19 tablas. Que el
-- permiso de subir una imagen y el de editar un ejercicio salgan de un
-- solo sitio es lo que impide que un día se separen sin que nadie se dé
-- cuenta.

drop policy if exists ejercicios_img_subir on storage.objects;
create policy ejercicios_img_subir on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ejercicios' and (select public.es_admin()));

-- Reemplazar una imagen por otra mejor. Lleva `using` Y `with check`:
-- el primero decide qué filas puede tocar, el segundo cómo pueden
-- quedar. Sin el segundo, un admin podría mover un archivo a OTRO
-- bucket con un update.
drop policy if exists ejercicios_img_reemplazar on storage.objects;
create policy ejercicios_img_reemplazar on storage.objects for update
  to authenticated
  using (bucket_id = 'ejercicios' and (select public.es_admin()))
  with check (bucket_id = 'ejercicios' and (select public.es_admin()));

drop policy if exists ejercicios_img_borrar on storage.objects;
create policy ejercicios_img_borrar on storage.objects for delete
  to authenticated
  using (bucket_id = 'ejercicios' and (select public.es_admin()));


-- =====================================================================
-- CÓMO SE COMPRUEBA QUE ESTO SIRVE
-- =====================================================================
--
-- Igual que con las tablas: suplantando, no suponiendo. En el SQL
-- Editor, con el uuid de un cliente de prueba:
--
--   begin;
--     set local role authenticated;
--     set local request.jwt.claims =
--       '{"sub":"PEGA-AQUI-EL-UUID-DEL-CLIENTE","role":"authenticated"}';
--
--     -- Leer: tiene que dejarlo (devuelve las filas que haya)
--     select count(*) from storage.objects where bucket_id = 'ejercicios';
--
--     -- Escribir: tiene que FALLAR con "new row violates row-level
--     -- security policy". Si esto no falla, cualquier cliente puede
--     -- llenar el bucket y la cuenta la pagas tú.
--     insert into storage.objects (bucket_id, name, owner)
--       values ('ejercicios', 'prueba-que-no-debe-entrar.jpg', auth.uid());
--   rollback;
--
-- Se repite con el uuid de un visitante. Y con el del admin, donde el
-- insert SÍ tiene que pasar — el error de olvidarse de esa tercera
-- vuelta es dejar al entrenador sin poder subir nada y descubrirlo el
-- día que él lo intente.
--
--
-- AVISO QUE NO ES TÉCNICO PERO ES EL MÁS SERIO
-- ---------------------------------------------------------------------
-- La imagen de una persona identificable es un dato personal bajo la
-- Ley 1581, y este bucket es público y de direcciones adivinables.
--
-- Por eso las fotos de los ejercicios tienen que ser del entrenador
-- mismo, de modelos que hayan autorizado, o ilustraciones. NUNCA la
-- foto de un cliente sin su autorización escrita, ni siquiera "de
-- espaldas" — la ley no pide que se le vea la cara, pide que no sea
-- identificable.
-- =====================================================================

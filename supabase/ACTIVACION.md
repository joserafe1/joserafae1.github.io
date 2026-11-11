# Activación de las cuentas de NO NAME

Estado: integración preparada, pendiente de conectar un proyecto Supabase y probar el flujo real de correo y RLS.

## Base de datos y acceso

1. Crear un proyecto Supabase para NO NAME.
2. Ejecutar schema.sql una vez en SQL Editor. Ejecutar catalogo.sql para cargar los 46 productos actuales.
3. En Authentication, habilitar Email y Confirm email. Deshabilitar acceso anónimo. Exigir contraseña de 8 caracteres o más con letras y números también en la configuración de Auth.
4. Establecer Site URL en https://joserafe1.github.io/joserafae1.github.io/ y autorizar exactamente https://joserafe1.github.io/joserafae1.github.io/auth.html como Redirect URL.
5. Pegar la URL y clave pública publishable del proyecto en js/supabase-config.js. Solo el proveedor Auth gestiona las contraseñas con hash. Las sesiones persistentes del SDK se guardan en el navegador; los perfiles y pedidos viven en PostgreSQL.
6. Registrar al propietario desde el mismo formulario de la tienda y verificar su correo. Copiar su UUID desde Authentication y ejecutar en SQL Editor, reemplazando el UUID:

```sql
update public.perfiles set rol = 'admin'
where id = 'UUID-DEL-USUARIO-VERIFICADO'
and exists (
  select 1 from auth.users u
  where u.id = perfiles.id and u.email_confirmed_at is not null
);
```

La aplicación nunca permite modificar rol ni crear perfiles directamente. El trigger crea perfiles cliente y rechaza datos obligatorios vacíos. RLS y permisos por columna impiden que un cliente se otorgue privilegios.

## Correos

Configurar SMTP propio en Authentication (remitente verificado, nombre NO NAME). El servicio de correo de prueba de Supabase limita los destinatarios a miembros autorizados del proyecto.

En Email Templates, usar emails/confirmacion.html para Confirm signup, asunto “Confirma tu cuenta de NO NAME”. Usar emails/recuperacion.html para Reset password, asunto “Recupera tu acceso a NO NAME”. Mantener los enlaces con token_hash y RedirectTo que usan estas plantillas. La página auth.html consume esos enlaces, elimina el token de la URL y permite completar la acción en otro dispositivo.

Los secretos SMTP se introducen únicamente en Supabase. Nunca deben subirse a GitHub.

## Verificación antes de publicar

- Registro válido, errores de contraseña/confirmación y campos vacíos.
- Cuenta duplicada y reenvío de confirmación. Supabase puede ocultar si existe una cuenta para evitar enumeración; mostrar mensaje claro sin crear duplicados.
- Inicio sin verificación rechazado, verificación válida y enlace caducado.
- Cliente autenticado en otra pestaña/dispositivo y persistencia al recargar.
- Recuperación de contraseña, cambio efectivo y cierre de sesión.
- Cliente A no puede leer ni modificar perfil/pedidos de B usando directamente la API.
- Cliente no puede actualizar rol, insertar perfiles ni leer administracion.
- Visitante sin sesión no puede leer perfiles/pedidos/administracion ni crear pedidos.
- Administrador verificado puede abrir el panel; revocar el rol también impide guardar por RLS.
- Dos administradores editando simultáneamente producen un error de versión en lugar de sobrescribir cambios.
- Pedido calcula precios en PostgreSQL y repetir el mismo UUID no duplica el pedido.

Los registros antiguos cifrados en cada navegador requieren una migración específica si se desean conservar en la nueva base. No son cuentas verificadas en Supabase. El carrito temporal sigue siendo local. El panel conserva sus módulos existentes mediante administracion; pedidos_cliente almacena por separado los pedidos web.

Referencias:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security


import { backend, authError, callbackUrl } from './backend.js';

export function validatePassword(password, confirmation) {
  if (password.length < 8 || !/[a-záéíóúñ]/i.test(password) || !/[0-9]/.test(password)) {
    throw new Error('La contraseña debe tener al menos 8 caracteres, una letra y un número.');
  }
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
}

export function validateRegistration(values) {
  if (!values.name?.trim() || !values.lastName?.trim()) throw new Error('Escribe tu nombre y apellido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim())) throw new Error('Escribe un correo electrónico válido.');
  validatePassword(values.password, values.confirm);
}

export async function register(values) {
  validateRegistration(values);
  const client = await backend();
  const { data, error } = await client.auth.signUp({
    email: values.email.trim().toLowerCase(),
    password: values.password,
    options: {
      emailRedirectTo: callbackUrl(),
      data: { nombre: values.name.trim(), apellido: values.lastName.trim(), telefono: values.phone?.trim() || '' },
    },
  });
  if (error) throw authError(error);
  // Supabase conceals existing accounts when confirmations are enabled.
  if (data.user?.identities?.length === 0) {
    throw new Error('Si este correo ya está registrado, inicia sesión o recupera tu contraseña. En caso contrario, revisa tu bandeja de entrada.');
  }
  if (data.session) {
    await client.auth.signOut();
    throw new Error('La tienda necesita activar la verificación de correo.');
  }
}

export async function access(email, password) {
  const client = await backend();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw authError(error);
  if (!data.user.email_confirmed_at) {
    await client.auth.signOut();
    throw new Error('Confirma tu correo antes de iniciar sesión.');
  }
  return current();
}

export async function logout() {
  const client = await backend();
  const { error } = await client.auth.signOut();
  if (error) throw authError(error);
}

export async function current() {
  const client = await backend();
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw authError(sessionError);
  if (!session) return null;
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw authError(error);
  if (!user?.email_confirmed_at) return null;
  const { data: profile, error: profileError } = await client.from('perfiles').select('*').eq('id', user.id).single();
  if (profileError) throw new Error('No se pudo cargar tu perfil. Inténtalo de nuevo.');
  const { data: orders, error: orderError } = await client.from('pedidos_cliente')
    .select('id,created_at,items,total,notice').eq('usuario_id', user.id).order('created_at', { ascending: false });
  if (orderError) throw new Error('No se pudieron cargar tus pedidos.');
  return {
    id: user.id, email: user.email, name: profile.nombre, lastName: profile.apellido,
    phone: profile.telefono, rol: profile.rol, notify: profile.notificaciones,
    orders: orders.map(order => ({ ...order, date: new Date(order.created_at).toLocaleDateString('es-DO') })),
  };
}

export async function updateProfile(values) {
  const profile = await current();
  if (!profile) throw new Error('Inicia sesión para continuar.');
  const client = await backend();
  const { error } = await client.from('perfiles').update(values).eq('id', profile.id);
  if (error) throw new Error('No se pudo guardar el perfil.');
}

export async function placeOrder(items, delivery, requestId) {
  const client = await backend();
  const { data, error } = await client.rpc('crear_pedido', {
    solicitud: requestId,
    lineas: items.map(item => ({ sku: item.img, size: item.size, qty: item.qty })),
    direccion: delivery,
  });
  if (error) throw new Error('No se pudo guardar el pedido. Revisa tu sesión y los productos e inténtalo de nuevo.');
  return data;
}

export async function recover(email) {
  const client = await backend();
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: callbackUrl() });
  if (error) throw authError(error);
}

export async function resend(email) {
  const client = await backend();
  const { error } = await client.auth.resend({
    type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw authError(error);
}

export async function watchSession(listener) {
  const client = await backend();
  return client.auth.onAuthStateChange(() => {
    // Ejecutar fuera del callback de Auth para evitar bloquear el SDK.
    setTimeout(listener, 0);
  });
}

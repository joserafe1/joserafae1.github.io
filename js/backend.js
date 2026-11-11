import { supabaseConfig } from './supabase-config.js';

let clientPromise;

export function backend() {
  if (!supabaseConfig.url || !supabaseConfig.publishableKey) {
    throw new Error('El servicio de cuentas está pendiente de activación. Inténtalo más tarde.');
  }
  clientPromise ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm')
    .then(({ createClient }) => createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    }));
  return clientPromise;
}

export function authError(error) {
  const messages = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
    user_already_exists: 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
    email_exists: 'Este correo ya está registrado.',
    weak_password: 'La contraseña debe tener al menos 8 caracteres, una letra y un número.',
    over_email_send_rate_limit: 'Espera unos minutos antes de solicitar otro correo.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
    otp_expired: 'El enlace caducó o ya fue utilizado. Solicita un nuevo correo.',
  };
  return new Error(messages[error.code] || 'No se pudo completar la operación. Inténtalo de nuevo.');
}

export function callbackUrl() {
  return new URL('auth.html', window.location.href).href;
}

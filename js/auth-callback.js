import { backend, authError } from './backend.js';
import { validatePassword } from './cuentas.js';

const status = document.getElementById('status');
const form = document.getElementById('passwordForm');
const params = new URLSearchParams(location.search);
const token = params.get('token_hash');
const type = params.get('type');
history.replaceState(null, '', location.pathname);
let recoveryReady = false;

try {
  if (!token || !['signup', 'recovery', 'email'].includes(type)) {
    throw new Error('El enlace es inválido. Solicita un nuevo correo desde Iniciar sesión.');
  }
  const client = await backend();
  const { error } = await client.auth.verifyOtp({ token_hash: token, type });
  if (error) throw authError(error);
  if (type === 'recovery') {
    recoveryReady = true;
    form.hidden = false;
    status.textContent = 'Elige tu nueva contraseña.';
  } else {
    await client.auth.signOut();
    status.textContent = 'Tu correo está verificado. Ya puedes iniciar sesión en NO NAME.';
  }
} catch (error) {
  status.textContent = error.message;
}

form.onsubmit = async event => {
  event.preventDefault();
  if (!recoveryReady) return;
  const values = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    validatePassword(values.password, values.confirm);
    const client = await backend();
    const { error } = await client.auth.updateUser({ password: values.password });
    if (error) throw authError(error);
    await client.auth.signOut();
    recoveryReady = false;
    form.reset();
    form.hidden = true;
    status.textContent = 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
};


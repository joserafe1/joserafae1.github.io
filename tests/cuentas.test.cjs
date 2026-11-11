const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Ejecuta el módulo con un proveedor controlado para comprobar errores de Auth.
function accountModule(client) {
  const source = fs.readFileSync('js/cuentas.js', 'utf8')
    .replace(/^import .*;\r?\n/, '').replaceAll('export ', '');
  const context = vm.createContext({
    backend: async () => client,
    authError: error => new Error(error.code),
    callbackUrl: () => 'https://example.com/auth.html',
  });
  return vm.runInContext(source + '\n({validateRegistration,validatePassword,register,access,placeOrder})', context);
}
const valid = { name: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '', password: 'Clave1234', confirm: 'Clave1234' };

test('registro rechaza datos vacíos, correo inválido y contraseñas débiles o distintas', () => {
  const api = accountModule({});
  assert.doesNotThrow(() => api.validateRegistration(valid));
  for (const changes of [
    { name: ' ' }, { lastName: '' }, { email: 'ana@' },
    { password: '12345678', confirm: '12345678' },
    { password: 'abcdefgh', confirm: 'abcdefgh' },
    { password: 'Abc12', confirm: 'Abc12' }, { confirm: 'Otra1234' },
  ]) assert.throws(() => api.validateRegistration({ ...valid, ...changes }));
});

test('registro envía datos al proveedor sin permitir elegir rol', async () => {
  let sent;
  const api = accountModule({ auth: { signUp: async values => {
    sent = values;
    return { data: { user: { identities: [{}] }, session: null }, error: null };
  } } });
  await api.register({ ...valid, rol: 'admin' });
  assert.equal(sent.options.data.nombre, 'Ana');
  assert.equal(sent.options.data.apellido, 'Pérez');
  assert.equal(sent.options.data.rol, undefined);
  assert.equal(sent.options.emailRedirectTo, 'https://example.com/auth.html');
});

test('registro informa respuesta de cuenta existente', async () => {
  const api = accountModule({ auth: { signUp: async () => ({
    data: { user: { identities: [] } }, error: null,
  }) } });
  await assert.rejects(api.register(valid), /registrado/);
});

test('una configuración de registro sin verificación no deja una sesión abierta', async () => {
  let signedOut = false;
  const api = accountModule({ auth: {
    signUp: async () => ({ data: { user: { identities: [{}] }, session: {} }, error: null }),
    signOut: async () => { signedOut = true; },
  } });
  await assert.rejects(api.register(valid), /verificación/);
  assert.equal(signedOut, true);
});

test('login rechaza errores del proveedor y usuarios sin correo confirmado', async () => {
  const failed = accountModule({ auth: { signInWithPassword: async () => ({ error: { code: 'invalid_credentials' } }) } });
  await assert.rejects(failed.access(valid.email, valid.password), /invalid_credentials/);
  let signedOut = false;
  const unverified = accountModule({ auth: {
    signInWithPassword: async () => ({ data: { user: { email_confirmed_at: null } }, error: null }),
    signOut: async () => { signedOut = true; },
  } });
  await assert.rejects(unverified.access(valid.email, valid.password), /Confirma/);
  assert.equal(signedOut, true);
});

test('pedido envía referencias y cantidades; el precio y usuario los decide el servidor', async () => {
  let sent;
  const api = accountModule({ rpc: async (name, values) => { sent = values; return { data: 'pedido', error: null }; } });
  await api.placeOrder([{ img: 'img/card1.webp', size: 'M', qty: 2, price: 0.01 }], { address: 'Calle' }, 'uuid');
  assert.equal(sent.solicitud, 'uuid');
  assert.equal(sent.lineas[0].price, undefined);
  assert.equal(sent.usuario_id, undefined);
  assert.equal(sent.lineas[0].qty, 2);
});


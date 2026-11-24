import { updatePersonalInfo, updateProfile } from './cuentas.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const addressFields = [
  ['recipient', 'Nombre de quien recibe', 'text', 120, true, 'name'],
  ['street', 'Dirección', 'text', 140, true, 'address-line1'],
  ['unit', 'Apartamento, piso o referencia', 'text', 100, false, 'address-line2'],
  ['city', 'Ciudad', 'text', 80, true, 'address-level2'],
  ['region', 'Provincia o estado', 'text', 80, true, 'address-level1'],
  ['zip', 'Código postal', 'text', 20, false, 'postal-code'],
  ['country', 'País', 'text', 80, true, 'country-name'],
  ['phone', 'Teléfono de entrega', 'tel', 40, false, 'tel'],
];
const personalFields = [
  ['instagram', 'Instagram', 'text', 50, false, 'off'],
  ['tiktok', 'TikTok', 'text', 50, false, 'off'],
  ['twitter', 'X / Twitter', 'text', 50, false, 'off'],
  ['birthday', 'Fecha de cumpleaños', 'date', 10, false, 'bday'],
  ['gender', 'Género', 'text', 60, false, 'sex'],
];
const contactFields = [
  ['nombre', 'Nombre', 'text', 80, true, 'given-name'],
  ['apellido', 'Apellido', 'text', 80, true, 'family-name'],
  ['telefono', 'Número de teléfono', 'tel', 40, false, 'tel'],
];
const birthdayFormat = new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeZone: 'UTC' });

function field([name, label, type, max, required, autocomplete], values) {
  const today = new Date().toISOString().slice(0, 10);
  return `<label>${label}<input name="${name}" type="${type}" value="${escape(values[name])}"
    ${type === 'date' ? `max="${today}"` : `maxlength="${max}"`}
    autocomplete="${autocomplete}" ${required ? 'required' : ''}></label>`;
}

function editor(id, label, fields, values) {
  return `<details class="nn-info-editor"><summary>${label}</summary>
    <form data-info-form="${id}">
      <div class="nn-info-fields">${fields.map(item => field(item, values)).join('')}</div>
      <button class="nn-info-save" type="submit">Guardar cambios</button>
      <p role="alert" class="nn-info-error"></p>
    </form>
  </details>`;
}

function row(icon, label, value) {
  return `<div class="nn-info-row"><i class="bi bi-${icon}" aria-hidden="true"></i>
    <div><dt>${label}</dt><dd>${value ? escape(value) : 'Sin agregar'}</dd></div></div>`;
}

function birthdayLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return '';
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isNaN(parsed.getTime()) ? '' : birthdayFormat.format(parsed);
}

function addressList(book) {
  if (!book.addresses.length) return '<p class="nn-customer-empty">Todavía no tienes direcciones guardadas.</p>';
  return `<div class="nn-address-grid">${book.addresses.map((address, index) => `
    <article class="nn-address-card">
      <h3>${escape(address.recipient)}</h3>
      ${index === 0 ? '<span class="nn-order-status">Por defecto</span>' : ''}
      <address>${[address.street, address.unit, [address.city, address.region, address.zip].filter(Boolean).join(', '),
        address.country, address.phone].filter(Boolean).map(escape).join('<br>')}</address>
      ${editor('address-' + index, 'Editar dirección', addressFields, address)}
      <div class="nn-address-actions">
        ${index === 0 ? '' : `<button type="button" data-default-address="${index}">Fijar por defecto</button>`}
        <button type="button" data-delete-address="${index}">Eliminar</button>
      </div>
    </article>`).join('')}</div>`;
}

export function renderPersonalInfo(page, profile) {
  const content = page.querySelector('#customerContent');
  const status = page.querySelector('#customerInfoStatus');
  const storageKey = 'nn.account.addresses.' + profile.id;
  function readBook() {
    try {
      const addresses = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return { addresses: Array.isArray(addresses) ? addresses : [] };
    } catch {
      return { addresses: [] };
    }
  }
  const personal = profile.personal ?? {};
  const contact = { nombre: profile.name, apellido: profile.lastName, telefono: profile.phone };
  const book = readBook();
  content.innerHTML = `<div class="nn-info-content">
    <section class="nn-info-section">
      <h2>Acerca de ti</h2>
      <dl>${row('instagram', 'Instagram', personal.instagram)}
        ${row('tiktok', 'TikTok', personal.tiktok)}
        ${row('twitter', 'X / Twitter', personal.twitter)}
        ${row('cake2', 'Cumpleaños', birthdayLabel(personal.birthday))}
        ${row('person', 'Género', personal.gender)}</dl>
      ${editor('personal', 'Editar datos personales', personalFields, personal)}
    </section>
    <section class="nn-info-section">
      <h2>Datos de contacto</h2>
      <dl>${row('person', 'Nombre', [profile.name, profile.lastName].filter(Boolean).join(' '))}
        ${row('envelope', 'Correo electrónico', profile.email)}
        ${row('telephone', 'Número de teléfono', profile.phone)}</dl>
      ${editor('contact', 'Editar nombre y teléfono', contactFields, contact)}
    </section>
    <section class="nn-info-section">
      <h2>Direcciones</h2>
      <p class="nn-info-note">Las direcciones de tu cuenta se guardan en este navegador.</p>
      ${addressList(book)}
      ${editor('new-address', 'Añadir dirección', addressFields, {
        recipient: [profile.name, profile.lastName].filter(Boolean).join(' '), phone: profile.phone, country: 'República Dominicana',
      })}
    </section>
  </div>`;
  const report = message => { status.textContent = message; };
  const saveAddresses = addresses => {
    localStorage.setItem(storageKey, JSON.stringify(addresses));
    renderPersonalInfo(page, profile);
  };

  content.onsubmit = async event => {
    const form = event.target;
    const action = form.dataset.infoForm;
    if (!action) return;
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
    const button = form.querySelector('button[type="submit"]');
    const errorMessage = form.querySelector('[role="alert"]');
    errorMessage.textContent = '';
    report('');
    if ([...form.querySelectorAll('[required]')].some(input => !values[input.name])) {
      errorMessage.textContent = 'Completa los campos requeridos.';
      return;
    }
    button.disabled = true;
    try {
      if (action === 'personal') {
        await updatePersonalInfo(values);
        profile.personal = values;
        if (form.isConnected) renderPersonalInfo(page, profile);
      } else if (action === 'contact') {
        await updateProfile(values);
        Object.assign(profile, { name: values.nombre, lastName: values.apellido, phone: values.telefono });
        if (form.isConnected) renderPersonalInfo(page, profile);
      } else {
        const addresses = [...book.addresses];
        if (action === 'new-address') addresses.push(values);
        else addresses[Number(action.slice('address-'.length))] = values;
        saveAddresses(addresses);
      }
      if (form.isConnected || content.querySelector('[data-info-form]')) report('Cambios guardados.');
    } catch (error) {
      errorMessage.textContent = error.message || 'No se pudieron guardar los cambios.';
    } finally {
      button.disabled = false;
    }
  };
  content.onclick = event => {
    const button = event.target.closest('[data-default-address], [data-delete-address]');
    if (!button) return;
    const addresses = [...book.addresses];
    const index = Number(button.dataset.defaultAddress ?? button.dataset.deleteAddress);
    if (!addresses[index]) return;
    if (button.dataset.defaultAddress !== undefined) {
      addresses.unshift(addresses.splice(index, 1)[0]);
    } else {
      if (!window.confirm('¿Eliminar esta dirección de este navegador?')) return;
      addresses.splice(index, 1);
    }
    try {
      saveAddresses(addresses);
      report('Direcciones actualizadas.');
    } catch {
      report('No se pudieron guardar las direcciones en este navegador.');
    }
  };
}

const money = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' });
const date = new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeZone: 'America/Santo_Domingo' });
const yearFormat = new Intl.DateTimeFormat('es-DO', { year: 'numeric', timeZone: 'America/Santo_Domingo' });
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function thumbnail(item) {
  const source = /^img\/[\w./-]+\.(?:webp|png|jpe?g|avif)$/i.test(item.img ?? '') ? item.img : '';
  return source ? `<img src="${escape(source)}" alt="" loading="lazy">` :
    '<span class="nn-image-placeholder"><i class="bi bi-image" aria-hidden="true"></i></span>';
}

function orderCard(order) {
  const items = order.items ?? [];
  const shortId = escape(order.id.slice(0, 8).toUpperCase());
  const placed = escape(order.created_at ? date.format(new Date(order.created_at)) : order.date);
  const photos = items.slice(0, items.length > 4 ? 3 : 4).map(thumbnail).join('');
  const overflow = items.length > 4 ? `<span class="nn-image-placeholder">+${items.length - 3}</span>` : '';
  return `<article class="nn-order-card">
    <div class="nn-order-photos" data-photo-count="${Math.min(items.length, 4)}" aria-hidden="true">${photos}${overflow}</div>
    <div class="nn-order-info">
      <span class="nn-order-status">Registrado</span>
      <h3>Pedido #${shortId}</h3>
      <p>${placed}</p>
      <strong>${money.format(order.total)}</strong>
      <details>
        <summary>Ver pedido</summary>
        <ul>${items.map(item => `<li>${escape(item.name)}<small>Talla ${escape(item.size)} · Cantidad ${escape(item.qty)}</small></li>`).join('')}</ul>
        <small class="nn-order-reference">Referencia: ${escape(order.id)}</small>
      </details>
    </div>
  </article>`;
}

function orderGrid(orders, emptyMessage) {
  return orders.length ? orders.map(orderCard).join('') :
    `<p class="nn-customer-empty">${emptyMessage}</p>`;
}

function favoritesPreview(wishes) {
  if (!wishes.length) {
    return '<div class="nn-customer-empty">Aún no has guardado productos. <a href="camisetas.html">Explorar camisetas</a></div>';
  }
  return `<div class="nn-favorite-preview">${wishes.slice(0, 4).map(item => `
    <a href="favoritos.html">${thumbnail(item)}<span>${escape(item.name)}</span></a>`).join('')}</div>`;
}

export function renderCustomerPage(page, profile, wishes, error) {
  if (!page) return;
  const content = page.querySelector('#customerContent');
  page.querySelectorAll('[data-customer-private], [data-customer-logout]').forEach(element => {
    element.hidden = !profile;
  });
  if (!profile) {
    content.innerHTML = error
      ? '<div class="nn-customer-empty"><p>No pudimos cargar tu cuenta. Intenta de nuevo.</p><button type="button" data-customer-retry>Reintentar</button></div>'
      : '<div class="nn-customer-empty"><p>Inicia sesión para ver tu cuenta y tus pedidos.</p><button type="button" data-customer-login>Iniciar sesión</button></div>';
    return;
  }
  const orders = profile.orders ?? [];
  if (page.dataset.customerPage === 'panel') {
    content.innerHTML = `<div class="nn-customer-identity"><strong>${escape([profile.name, profile.lastName].filter(Boolean).join(' '))}</strong>
      <span>${escape(profile.email)}</span></div>
      <section class="nn-customer-section">
        <header><h2>Pedidos recientes</h2><a href="pedidos.html">Ver todos <i class="bi bi-arrow-right" aria-hidden="true"></i></a></header>
        <div class="nn-order-grid">${orderGrid(orders.slice(0, 4), 'Todavía no tienes pedidos.')}</div>
      </section>
      <section class="nn-customer-section">
        <header><h2>Lista de deseos</h2><a href="favoritos.html">Ver lista <i class="bi bi-arrow-right" aria-hidden="true"></i></a></header>
        ${favoritesPreview(wishes)}
      </section>`;
    return;
  }
  const yearOf = order => order.created_at ? yearFormat.format(new Date(order.created_at)) : '';
  const years = [...new Set(orders.map(yearOf).filter(Boolean))].sort().reverse();
  const previousYear = content.querySelector('#orderYear')?.value;
  content.innerHTML = `<div class="nn-orders-filter">
    <label for="orderYear">Año de compra</label>
    <select id="orderYear"><option value="">Todos los pedidos</option>${years.map(year => `<option value="${year}">${year}</option>`).join('')}</select>
  </div><div class="nn-order-grid" data-order-grid></div>`;
  const filter = content.querySelector('#orderYear');
  if (years.includes(previousYear)) filter.value = previousYear;
  const grid = content.querySelector('[data-order-grid]');
  const update = () => {
    const selected = filter.value;
    grid.innerHTML = orderGrid(orders.filter(order => !selected || yearOf(order) === selected),
      selected ? 'No tienes pedidos de ese año.' : 'Todavía no tienes pedidos.');
  };
  filter.addEventListener('change', update);
  update();
}

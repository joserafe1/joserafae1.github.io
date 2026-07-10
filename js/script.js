/* ==========================================================================
   NO NAME — script.js
   Comportamiento interactivo de TODO el sitio (un solo archivo para todas
   las páginas: index, pantalones, camisetas, checkout, contacto, políticas,
   enlaces, noticias). Cada bloque verifica que el elemento exista antes de
   usarlo, porque no todas las páginas tienen todos los elementos.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Navbar: cambia de fondo al hacer scroll ---------- */
  const navbar = document.getElementById('mainNavbar');
  if (navbar) {
    const handleNavbarScroll = () => {
      if (window.scrollY > 60) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    };
    window.addEventListener('scroll', handleNavbarScroll);
    handleNavbarScroll();
  }

  /* ---------- Botón flotante "Volver arriba" (position: fixed) ---------- */
  const btnVolverArriba = document.getElementById('btnVolverArriba');
  if (btnVolverArriba) {
    const toggleFloatingBtn = () => {
      if (window.scrollY > 400) {
        btnVolverArriba.classList.add('show-btn');
      } else {
        btnVolverArriba.classList.remove('show-btn');
      }
    };
    window.addEventListener('scroll', toggleFloatingBtn);
    toggleFloatingBtn();

    btnVolverArriba.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Modal de producto: rellena contenido dinámicamente ---------- */
  const modalProducto = document.getElementById('modalProducto');
  if (modalProducto) {
    modalProducto.addEventListener('show.bs.modal', function (event) {
      const btn = event.relatedTarget;
      const nombre = btn.getAttribute('data-producto');
      const img = btn.getAttribute('data-img');
      const desc = btn.getAttribute('data-desc');
      const precio = btn.getAttribute('data-precio');

      modalProducto.querySelector('#modalProductoLabel').textContent = nombre;
      modalProducto.querySelector('#modalImg').setAttribute('src', img);
      modalProducto.querySelector('#modalImg').setAttribute('alt', nombre);
      modalProducto.querySelector('#modalDesc').textContent = desc;
      modalProducto.querySelector('#modalPrecio').textContent = precio;
    });
  }

  /* ---------- Popover ---------- */
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
  [...popoverTriggerList].map(el => new bootstrap.Popover(el));

  /* ---------- Alert: mostrar al hacer clic en "Unirme a la lista" ---------- */
  const btnAlert = document.getElementById('btnAlert');
  const suscripcionAlert = document.getElementById('suscripcionAlert');
  if (btnAlert && suscripcionAlert) {
    btnAlert.addEventListener('click', () => {
      suscripcionAlert.classList.remove('d-none');
      suscripcionAlert.classList.add('show');
    });
  }

  /* ---------- Carrito: contador persistente con localStorage ---------- */
  const navCartCount = document.getElementById('navCartCount');
  const cartIcon = document.getElementById('cartIcon');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const cartCountBadge = document.getElementById('cartCount'); // usado en checkout.html

  function getCartCount() {
    return parseInt(localStorage.getItem('nn_cart_count') || '0', 10);
  }

  function setCartCount(value) {
    localStorage.setItem('nn_cart_count', value);
    if (navCartCount) navCartCount.textContent = value;
    if (cartCountBadge) cartCountBadge.textContent = value;
  }

  // Muestra el contador guardado al cargar la página (funciona en cualquier página)
  setCartCount(getCartCount());

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const nuevoTotal = getCartCount() + 1;
      setCartCount(nuevoTotal);

      // Animación de "salto" en el ícono del carrito
      if (cartIcon) {
        cartIcon.classList.add('cart-bounce');
        setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
      }

      // Cierra el modal (si existe) y redirige al checkout después de un instante
      const modalEl = document.getElementById('modalProducto');
      const modalInstance = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
      setTimeout(() => {
        if (modalInstance) modalInstance.hide();
        window.location.href = 'checkout.html';
      }, 600);
    });
  }

  /* ---------- Checkout: validación de formulario (fusionado desde checkout.js) ---------- */
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (event) {
      if (!checkoutForm.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        event.preventDefault();
        alert('¡Pedido confirmado! Gracias por tu compra en NO NAME.');
        checkoutForm.reset();
        checkoutForm.classList.remove('was-validated');
        // Reinicia el contador del carrito tras confirmar la compra
        setCartCount(0);
        return;
      }
      checkoutForm.classList.add('was-validated');
    }, false);
  }

  /* ---------- Checkout: código promo ---------- */
  const promoForm = document.getElementById('promoForm');
  if (promoForm) {
    promoForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const input = document.getElementById('promoInput');
      if (input.value.trim().length > 0) {
        alert('Código "' + input.value.trim() + '" aplicado (simulación de demostración).');
        input.value = '';
      }
    });
  }

  /* ---------- Formulario de contacto (contacto.html) ---------- */
  const contactoForm = document.getElementById('contactoForm');
  if (contactoForm) {
    contactoForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!contactoForm.checkValidity()) {
        event.stopPropagation();
        contactoForm.classList.add('was-validated');
        return;
      }
      alert('¡Mensaje enviado! Te responderemos en menos de 48 horas.');
      contactoForm.reset();
      contactoForm.classList.remove('was-validated');
    });
  }

  /* ---------- Modo oscuro: activar/desactivar y recordar con localStorage ---------- */
  const darkToggleBtns = document.querySelectorAll('.dark-toggle-btn');

  function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    darkToggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-moon-stars', !isDark);
        icon.classList.toggle('bi-sun', isDark);
      }
    });
  }

  // Al cargar cualquier página, revisa la preferencia guardada
  const savedDarkMode = localStorage.getItem('nn_dark_mode') === 'true';
  applyDarkMode(savedDarkMode);

  darkToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isDarkNow = !document.body.classList.contains('dark-mode');
      applyDarkMode(isDarkNow);
      localStorage.setItem('nn_dark_mode', isDarkNow);
    });
  });

});

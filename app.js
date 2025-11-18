// Lógica centralizada de la aplicación Kaw-Tienda

(() => {
  const KEY_CARRITO = 'carrito';

  // --- PRECIOS PROMOCIONALES ---
  function calcularSubtotalItem(item) {
    return window.Kaw.calcSubtotal(item);
  }
  function describirPrecioAplicado(item) {
    return window.Kaw.describePrecio(item);
  }

  // --- GESTIÓN DEL STOCK (SIMULADA) ---
  async function obtenerStockActual(id, talla, color) {
    // TODO: En un futuro, esta función podría consultar al servidor en tiempo real.
    // Por ahora, devolvemos el stock que ya conocemos del producto.
    const cart = getCarrito();
    const item = cart.find(i => i.id === id && i.talla === talla && i.color === color);
    return Promise.resolve(item ? item.stock : 20); // Devuelve el stock del item o un valor por defecto.
  }

  // --- GESTIÓN DEL CARRITO (LOCALSTORAGE) ---
  function getCarrito() {
    try {
      return JSON.parse(localStorage.getItem(KEY_CARRITO) || '[]');
    } catch (e) {
      console.error('Error al obtener carrito:', e);
      return [];
    }
  }

  function saveCarrito(cart) {
    try {
      localStorage.setItem(KEY_CARRITO, JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated')); // Notificar a otros scripts
    } catch (e) {
      console.error('Error al guardar carrito:', e);
    }
  }

  function agregarAlCarrito(item) {
    const cart = getCarrito();
    const cartId = `${item.id}-${item.talla || 'talla'}-${item.color || 'color'}`;
    const found = cart.find(i => i.cartId === cartId);

    if (found) {
      const stockMax = Number(found.stock ?? item.stock ?? 20); // usar stock ya guardado; fallback 20
      const nuevaCantidad = Number(found.cantidad || 0) + Number(item.cantidad || 1);
      if (nuevaCantidad > stockMax) {
        mostrarAviso(`No puedes agregar más. Stock disponible: ${stockMax}`);
        return;
      }
      found.cantidad = Math.min(99, nuevaCantidad);
      saveCarrito(cart);
      mostrarAviso('Producto agregado al carrito');
      return;
    }

    // Nuevo ítem: obtén stock antes de insertar
    obtenerStockActual(item.id, item.talla, item.color).then(stockActual => {
      const qty = Number(item.cantidad || 1);
      if (qty > stockActual) {
        mostrarAviso(`No puedes agregar más. Stock disponible: ${stockActual}`);
        return;
      }
      item.stock = stockActual;
      item.cartId = cartId;
      cart.push(item);
      saveCarrito(cart);
      mostrarAviso('Producto agregado al carrito');
    });
  }

  function vaciarCarrito() {
    saveCarrito([]);
    const modal = document.getElementById('carrito-modal');
    if (modal) {
      renderModalCarrito();
    }
    mostrarAviso('El carrito ha sido vaciado');
  }

  function actualizarCantidad(cartId, cantidad) {
    const cart = getCarrito();
    const idx = cart.findIndex(i => i.cartId === cartId);
    if (idx === -1) return;

    const qty = Math.max(0, Number(cantidad) || 0);
    const stockMax = Number(cart[idx].stock ?? 20);

    if (qty <= 0) {
      cart.splice(idx, 1);
    } else if (qty > stockMax) {
      cart[idx].cantidad = stockMax;
      mostrarAviso(`Stock máximo alcanzado: ${stockMax}`);
    } else {
      cart[idx].cantidad = Math.min(99, qty);
    }
    saveCarrito(cart);
  }

  // --- RENDERIZADO DEL MODAL DEL CARRITO ---
  function renderModalCarrito() {
    const { qs, TINY_GIF, formatPrice } = window.Kaw;
    let modal = qs('#carrito-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'carrito-modal';
      modal.className = 'carrito-modal';
      modal.setAttribute('aria-hidden', 'true');
      document.body.appendChild(modal);
    }

    const cart = getCarrito();
    let total = 0;
    const estaVacio = cart.length === 0;
    const totalItems = cart.reduce((s,i)=>s + Number(i.cantidad||0), 0);

    modal.innerHTML = `
      <div class="carrito-contenido" role="dialog" aria-modal="true" aria-label="Carrito de compras">
        <div class="carrito-header">
          <h2 class="carrito-titulo">
            <span class="carrito-ico" aria-hidden="true"></span>
            <span class="carrito-texto">Tu Carrito</span>
            ${totalItems>0?`<span class="badge">${totalItems}</span>`:''}
          </h2>
          <button class="cerrar" aria-label="Cerrar carrito">&times;</button>
        </div>
        ${estaVacio ? `
          <div class="carrito-vacio">
            <p>Tu carrito está vacío</p>
            <a href="index.html" class="btn">Ver Productos</a>
          </div>
        ` : `
          <div class="carrito-lista-wrapper carrito-body">
            <div class="carrito-encabezados">
              <span></span>
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Subtotal</span>
              <span></span>
            </div>
            <div id="lista-item-carrito">
              ${cart.map((item) => {
                const subtotal = calcularSubtotalItem(item);
                total += subtotal;
                const nota = describirPrecioAplicado(item);
                const pct = Number(item.descuento_pct || 0);
                const unit = Number(item.precio || 0);
                const unitD = pct>0 ? Math.round(unit*(1-pct/100)) : unit;
                return `
                  <div class="item-carrito" data-cart-id="${item.cartId}">
                    <a href="producto.html?id=${item.id}"><img src="${item.imagen || TINY_GIF}" alt="${item.nombre}"></a>
                    <div class="item-info">
                      <a href="producto.html?id=${item.id}" class="item-nombre-link"><p class="item-nombre">${item.nombre}</p></a>
                      <div class="item-variantes">
                        ${item.talla ? `<span>Talla: ${item.talla}</span>` : ''}
                        ${item.color ? `<span>Color: ${item.color}</span>` : ''}
                      </div>
                      <p class="item-precio">
                        ${pct>0 ? `<span class="precio-original">${formatPrice(unit)}</span> <span class="precio-descuento">${formatPrice(unitD)}</span>` : `${formatPrice(unit)}`}
                      </p>
                      ${nota ? `<small class="item-precio-nota">${nota}</small>` : ''}
                    </div>
                    <div class="item-cantidad">
                      <button class="qty-btn decrease" aria-label="Disminuir">-</button>
                      <span>${item.cantidad}</span>
                      <button class="qty-btn increase" aria-label="Aumentar">+</button>
                    </div>
                    <p class="item-subtotal">${formatPrice(subtotal)}</p>
                    <button class="remove" aria-label="Eliminar">&times;</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="carrito-total">
            <p>Total: <strong>${formatPrice(total)}</strong></p>
            <div class="carrito-acciones">
              <button id="vaciar-carrito" class="btn-secundario" type="button">Vaciar Carrito</button>
              <a id="finalizar-compra" class="btn">Finalizar Compra</a>
            </div>
          </div>
        `}
      </div>
    `;

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('carrito-open'); // <--- añade clase para estilo panel
    qs('.cerrar', modal)?.focus();
  }

  function abrirModalCarrito() {
    renderModalCarrito();
  }

  function mostrarAviso(mensaje) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso';
    aviso.setAttribute('role','status');
    aviso.textContent = mensaje;
    document.body.appendChild(aviso);
    setTimeout(() => {
      aviso.classList.add('mostrar');
      setTimeout(() => {
        aviso.classList.remove('mostrar');
        setTimeout(() => aviso.remove(), 300);
      }, 2000);
    }, 10);
  }

  function actualizarContadorCarrito() {
      const { qs } = window.Kaw; // Obtener helpers
      const contador = qs('#cart-count');
      const cart = getCarrito();
      const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
      if (contador) {
        contador.textContent = totalItems;
        contador.style.display = totalItems > 0 ? 'inline-block' : 'none';
      }
  }

  // --- INICIALIZACIÓN DEL MÓDULO APP ---
  function initApp() {
    const { qs, formatPrice } = window.Kaw;

    // Exponer funciones al namespace global
    window.Kaw.agregarAlCarrito = agregarAlCarrito;
    window.Kaw.mostrarAviso = mostrarAviso;
    window.Kaw.getCarrito = getCarrito;
    window.Kaw.abrirModalCarrito = abrirModalCarrito;

    // Actualizar variable CSS con la altura real del header
    const updateHeaderHeightVar = () => {
      const header = document.querySelector('header');
      if (!header) return;
      const h = header.offsetHeight || 0;
      document.documentElement.style.setProperty('--header-dynamic-height', `${h}px`);
    };

    updateHeaderHeightVar();
    window.addEventListener('resize', () => window.requestAnimationFrame(updateHeaderHeightVar));

    // Crear el botón del carrito dentro del header si no existe
    if (!qs('#abrir-carrito')) {
      const headerContainer = qs('.header-container');
      if (headerContainer) {
        const carritoContainer = document.createElement('div');
        carritoContainer.className = 'carrito';
        carritoContainer.innerHTML = `
          <a href="#" id="abrir-carrito" aria-label="Abrir carrito">
            <span id="cart-count" class="badge">0</span>
          </a>
          <span class="carrito-titulo">Carrito</span>
        `;
        headerContainer.appendChild(carritoContainer);
        updateHeaderHeightVar();
      }
    }

    // Event listener para abrir el modal (clic al ícono del carrito)
    document.body.addEventListener('click', (e) => {
      if (e.target.closest('#abrir-carrito')) {
        e.preventDefault();
        renderModalCarrito();
      }
    });

    // Event listener para acciones dentro del modal
    document.body.addEventListener('click', (e) => {
      const modal = e.target.closest('#carrito-modal');
      const btnFinalizar = e.target.closest('#finalizar-compra');

      if (!modal && !btnFinalizar) return;

      if (modal && (e.target.matches('.cerrar') || e.target.id === 'carrito-modal')) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('carrito-open'); // <--- quita clase
        return;
      }

      // Manejo de ítems del carrito
      if (modal) {
        const itemDiv = e.target.closest('.item-carrito');
        if (itemDiv) {
          const cartId = itemDiv.dataset.cartId;
          const cart = getCarrito();
          const item = cart.find(i => i.cartId === cartId);
          if (!item) return;

          if (e.target.matches('.increase')) {
            actualizarCantidad(cartId, item.cantidad + 1);
          } else if (e.target.matches('.decrease')) {
            actualizarCantidad(cartId, item.cantidad - 1);
          } else if (e.target.matches('.remove')) {
            actualizarCantidad(cartId, 0);
          }
          
          if (e.target.matches('.increase, .decrease, .remove')) {
              renderModalCarrito();
          }
          return;
        }
      }

      // Finalizar Compra -> abrir formulario de checkout en nueva pestaña
      if (btnFinalizar) {
        e.preventDefault();
        const cart = getCarrito();
        if (!cart.length) { mostrarAviso('Carrito vacío'); return; }

        try {
          // Guardar datos para checkout.html
            sessionStorage.setItem('checkout_data', JSON.stringify({
              items: cart,
              ts: Date.now()
            }));
        } catch (err) {
          console.warn('No se pudo guardar checkout_data:', err);
        }

        // Intentar abrir en nueva pestaña; fallback misma pestaña
        let w;
        try { w = window.open('checkout.html', '_blank'); } catch {}
        if (!w) window.location.href = 'checkout.html';

        // Cerrar modal
        const m = document.getElementById('carrito-modal');
        if (m) {
          m.style.display = 'none';
          m.setAttribute('aria-hidden','true');
          document.body.classList.remove('carrito-open'); // <--- quita clase
        }
        return;
      }
      if (modal && e.target.id === 'vaciar-carrito') {
        vaciarCarrito();
      }
    });

    // Escuchar actualizaciones del carrito y actualizar contador al inicio
    window.addEventListener('cart-updated', actualizarContadorCarrito);
    actualizarContadorCarrito();

    setTimeout(updateHeaderHeightVar, 50);
  }

  // Crea el pedido en localStorage y arma el texto para WhatsApp
  function crearPedidoYMensaje({ nombre, email, telefono, direccion, ciudad, cart }) {
    const items = cart.map(i => ({
      id: i.id,
      nombre: i.nombre,
      referencia: i.referencia || i.ref || i.id,
      cantidad: i.cantidad,
      talla: i.talla || null,
      color: i.color || null,
      subtotal: calcularSubtotalItem(i),
      promo: describirPrecioAplicado(i) || null
    }));
    const total = items.reduce((s,i)=> s + Number(i.subtotal||0), 0);
    const id = 'P-' + Date.now();
    const refsTxt = items.map(it => `${it.referencia} x${it.cantidad}`).join('\n');
    const whatsapp_text =
      `Pedido ${id}\nCliente: ${nombre}\nEmail: ${email}\nTel: ${telefono}` +
      (direccion?`\nDir: ${direccion}`:'') +
      (ciudad?`\nCiudad: ${ciudad}`:'') +
      `\nRefs:\n${refsTxt}\nTotal: ${window.Kaw.formatPrice(total)}`;

    const pedidos = JSON.parse(localStorage.getItem('pedidos')||'[]');
    pedidos.push({
      id,
      fecha: new Date().toISOString(),
      cliente:{ nombre, email, telefono, direccion, ciudad },
      items,
      total,
      estado:'pendiente',
      whatsapp_text
    });
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    return { id, whatsapp_text };
  }

  // Abre WhatsApp with fallback si el popup es bloqueado
  function abrirWhatsApp(url) {
    let w;
    try { w = window.open(url,'_blank'); } catch {}
    if (!w) window.location.href = url;
  }

  // Registrar la función de inicialización de este módulo
  window.Kaw.registerInit(initApp);
})();

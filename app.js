// Lógica centralizada de la aplicación Kaw-Tienda

// --- CONFIGURACIÓN Y HELPERS ---
const KEY_CARRITO = 'carrito';
const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const qs = (s, o = document) => o.querySelector(s);
const qsa = (s, o = document) => Array.from(o.querySelectorAll(s));
const formatPrice = (n) => n ? `$${Number(n).toLocaleString('es-CO')}` : '$0';

// --- PRECIOS PROMOCIONALES ---
function calcularSubtotalItem(item) {
  const unit = Number(item.precio || 0);
  const qty = Number(item.cantidad || 0);
  const promo3 = Number(item.promo3_precio || 0);
  const mayoristaMin = Number(item.mayorista_min || 0);
  const mayoristaPrecio = Number(item.mayorista_precio || 0);
  if (qty <= 0) return 0;

  // Regla: si cumple mayorista, aplica a todas las unidades
  if (mayoristaMin > 0 && mayoristaPrecio > 0 && qty >= mayoristaMin) {
    return qty * mayoristaPrecio;
  }
  // Si hay pack 3x, aplicar por paquetes
  if (promo3 > 0) {
    const packs = Math.floor(qty / 3);
    const rest = qty % 3;
    return packs * promo3 + rest * unit;
  }
  // Precio normal
  return qty * unit;
}

function describirPrecioAplicado(item) {
  const unit = Number(item.precio || 0);
  const qty = Number(item.cantidad || 0);
  const promo3 = Number(item.promo3_precio || 0);
  const mayoristaMin = Number(item.mayorista_min || 0);
  const mayoristaPrecio = Number(item.mayorista_precio || 0);
  if (qty <= 0) return '';
  if (mayoristaMin > 0 && mayoristaPrecio > 0 && qty >= mayoristaMin) {
    return `Mayorista: ${qty}u × ${formatPrice(mayoristaPrecio)}`;
  }
  if (promo3 > 0 && qty >= 3) {
    const packs = Math.floor(qty / 3);
    const rest = qty % 3;
    let partes = [];
    if (packs > 0) partes.push(`${packs}× (3 x ${formatPrice(promo3)})`);
    if (rest > 0) partes.push(`${rest}u × ${formatPrice(unit)}`);
    return `Promo: ${partes.join(' + ')}`;
  }
  return '';
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
  // Crear un ID único para el carrito basado en el producto y sus variantes
  const cartId = `${item.id}-${item.talla || 'talla'}-${item.color || 'color'}`;
  const found = cart.find(i => i.cartId === cartId);
  
  if (found) {
    const nuevaCantidad = (found.cantidad || 0) + (item.cantidad || 1);
    // No permitir agregar más allá del stock
    if (nuevaCantidad > item.stock) {
      mostrarAviso(`No puedes agregar más. Stock disponible: ${item.stock}`);
      return;
    }
    found.cantidad = Math.min(99, nuevaCantidad);
  } else {
    // Obtener el stock más reciente antes de agregar
    obtenerStockActual(item.id, item.talla, item.color).then(stockActual => {
      if ((item.cantidad || 1) > stockActual) {
        mostrarAviso(`No puedes agregar más. Stock disponible: ${stockActual}`);
        return;
      }
      item.stock = stockActual; // Actualizar el stock en el item
      item.cartId = cartId; // Asignar el ID único al item
      cart.push(item);
      saveCarrito(cart);
      mostrarAviso('Producto agregado al carrito');
    });
    return;
  }
  saveCarrito(cart);
  mostrarAviso('Producto agregado al carrito');
}

function vaciarCarrito() {
  saveCarrito([]);
  renderModalCarrito();
  mostrarAviso('El carrito ha sido vaciado');
}

function actualizarCantidad(cartId, cantidad) {
  const cart = getCarrito();
  const itemIndex = cart.findIndex(i => i.cartId === cartId);

  if (itemIndex > -1) {
    if (cantidad <= 0) {
      cart.splice(itemIndex, 1); // Eliminar si la cantidad es 0 o menos
    } else {
      // No permitir aumentar más allá del stock
      if (cantidad > cart[itemIndex].stock) {
        mostrarAviso(`Stock máximo alcanzado: ${cart[itemIndex].stock}`);
        cart[itemIndex].cantidad = cart[itemIndex].stock;
      } else {
        cart[itemIndex].cantidad = Math.min(99, cantidad);
      }
    }
    saveCarrito(cart);
  }
}

// --- RENDERIZADO DEL MODAL DEL CARRITO ---
function renderModalCarrito() {
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

  modal.innerHTML = `
    <div class="carrito-contenido">
      <button class="cerrar" aria-label="Cerrar carrito">&times;</button>
      <h2 class="carrito-titulo">Tu Carrito</h2>
      ${estaVacio ? `
        <div class="carrito-vacio">
          <p>Tu carrito está vacío</p>
          <a href="index.html" class="btn">Ver Productos</a>
        </div>
      ` : `
        <div id="lista-item-carrito">
          ${cart.map((item, index) => {
            const subtotal = calcularSubtotalItem(item);
            total += subtotal;
            const nota = describirPrecioAplicado(item);
            return `
              <div class="item-carrito" data-cart-id="${item.cartId}">
                <a href="producto.html?id=${item.id}"><img src="${item.imagen || TINY_GIF}" alt="${item.nombre}"></a>
                <div class="item-info">
                  <a href="producto.html?id=${item.id}" class="item-nombre-link"><p class="item-nombre">${item.nombre}</p></a>
                  <div class="item-variantes">
                    ${item.talla ? `<span>Talla: ${item.talla}</span>` : ''}
                    ${item.color ? `<span>Color: ${item.color}</span>` : ''}
                  </div>
                  <p class="item-precio">${formatPrice(item.precio)}</p>
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
        <div class="carrito-total">
          <p>Total: <strong>${formatPrice(total)}</strong></p>
          <div class="carrito-acciones">
            <button id="vaciar-carrito" class="btn-secundario">Vaciar Carrito</button>
            <a id="finalizar-compra" class="btn">Finalizar Compra</a>
          </div>
        </div>
      `}
    </div>
  `;

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  qs('.cerrar', modal)?.focus();
}

function mostrarAviso(mensaje) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso';
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
    const contador = qs('#cart-count');
    if (!contador) return;
    const cart = getCarrito();
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
    contador.textContent = totalItems;
    contador.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

// Exponer funciones al namespace global LO ANTES POSIBLE para evitar referencias obsoletas en otros scripts con defer
if (window.Kaw) {
  window.Kaw.agregarAlCarrito = agregarAlCarrito;
  window.Kaw.mostrarAviso = mostrarAviso;
  // Exponer utilidades por si otros módulos las requieren desde aquí
  window.Kaw.qs = window.Kaw.qs || qs;
  window.Kaw.qsa = window.Kaw.qsa || qsa;
  window.Kaw.formatPrice = window.Kaw.formatPrice || formatPrice;
  window.Kaw.TINY_GIF = window.Kaw.TINY_GIF || TINY_GIF;
}

// --- INICIALIZACIÓN GLOBAL ---
document.addEventListener('DOMContentLoaded', () => {
  // Actualizar variable CSS con la altura real del header (para padding-top del body)
  const updateHeaderHeightVar = () => {
    const header = document.querySelector('header');
    if (!header) return;
    const h = header.offsetHeight || 0;
    document.documentElement.style.setProperty('--header-dynamic-height', `${h}px`);
  };

  // Llamar tras construir el header y en cambios de viewport
  updateHeaderHeightVar();
  window.addEventListener('resize', () => {
    // Usar requestAnimationFrame para evitar cálulos excesivos
    window.requestAnimationFrame(updateHeaderHeightVar);
  });

  // Crear el contenedor del ícono del carrito en el header si no existe
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
    }
  }

  // Recalcular después de inyectar el carrito en el header
  updateHeaderHeightVar();
  
  actualizarContadorCarrito();

  // Event listener para abrir el modal
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#abrir-carrito')) {
      e.preventDefault();
      renderModalCarrito();
    }
  });

  // Event listener para acciones dentro del modal (cerrar, cantidad, etc.)
  document.body.addEventListener('click', (e) => {
    const modal = e.target.closest('#carrito-modal');
    if (!modal) return;

    if (e.target.matches('.cerrar') || e.target.id === 'carrito-modal') {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      return; // Salir para no procesar otros clics
    }

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
          actualizarCantidad(cartId, 0); // Elimina el item
        }
        
        // Re-renderizar solo si se hizo clic en un botón de acción
        if (e.target.matches('.increase, .decrease, .remove')) {
            renderModalCarrito();
        }
        return; // Salir para no procesar otros clics
    }

    // Finalizar compra o vaciar carrito
    if (e.target.id === 'finalizar-compra') {
        const cart = getCarrito();
        if(cart.length === 0) {
            mostrarAviso('Tu carrito está vacío.');
            return;
        }
        
        let mensaje = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';
        let total = 0;
        cart.forEach(item => {
            const subtotal = calcularSubtotalItem(item);
            const nota = describirPrecioAplicado(item);
            mensaje += `*Producto:* ${item.nombre}\n`;
            if (item.talla) mensaje += `*Talla:* ${item.talla}\n`;
            if (item.color) mensaje += `*Color:* ${item.color}\n`;
            mensaje += `*Cantidad:* ${item.cantidad}\n`;
            if (nota) mensaje += `*Promo Aplicada:* ${nota}\n`;
            mensaje += `*Subtotal:* ${formatPrice(subtotal)}\n\n`;
            total += subtotal;
        });
        mensaje += `*Total del pedido: ${formatPrice(total)}*`;
        
        const url = `https://wa.me/573118890188?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }

    if (e.target.id === 'vaciar-carrito') {
        vaciarCarrito();
    }
  });

  // Escuchar actualizaciones del carrito desde otros scripts
  window.addEventListener('cart-updated', () => {
        actualizarContadorCarrito();
    });

    // Exponer funciones al namespace global
    if (window.Kaw) {
        window.Kaw.agregarAlCarrito = agregarAlCarrito;
        window.Kaw.mostrarAviso = mostrarAviso;
    }
  // Una última actualización por si el layout terminó de ajustar
  setTimeout(updateHeaderHeightVar, 50);
});

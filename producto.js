// Lógica para la página de detalle del producto
(() => {
  const PATH_PRODUCTOS = 'productos.json';
  let todosLosProductos = [];

  // Helpers desde el scope global de window.Kaw
  const { qs, qsa, formatPrice, TINY_GIF, agregarAlCarrito } = window.Kaw;

  function renderVariantes(producto) {
    const variantesContainer = qs('.variantes');
    if (!variantesContainer) return;
    variantesContainer.innerHTML = ''; // Limpiar

    if (producto.tallas && producto.tallas.length) {
      variantesContainer.innerHTML += `
        <div class="var-group">
          <label>Talla:</label>
          <div class="opciones-talla">
            ${producto.tallas.map((talla, i) => `<button aria-pressed="${i === 0}" data-talla="${talla}">${talla}</button>`).join('')}
          </div>
        </div>
      `;
    }
    if (producto.colores && producto.colores.length) {
      variantesContainer.innerHTML += `
        <div class="var-group">
          <label>Color:</label>
          <div class="opciones-color">
            ${producto.colores.map((color, i) => `<button aria-pressed="${i === 0}" data-color="${color}">${color}</button>`).join('')}
          </div>
        </div>
      `;
    }
  }

  function popularDetalle(prod) {
    if (!prod) return;
    qs('#detalle-nombre').textContent = prod.nombre || '';
    qs('#detalle-precio').textContent = formatPrice(prod.precio);
    // Precios promocionales en detalle
    let extra = qs('#detalle-precios-extra');
    if (!extra) {
      extra = document.createElement('div');
      extra.id = 'detalle-precios-extra';
      extra.className = 'precios-secundarios';
      qs('.detalle-info').insertBefore(extra, qs('.variantes'));
    }
    const promo3 = Number(prod.promo3_precio || 0);
    const mayoristaMin = Number(prod.mayorista_min || 0);
    const mayoristaPrecio = Number(prod.mayorista_precio || 0);
    extra.innerHTML = `
      ${promo3 > 0 ? `<div class="precio-promo"><span class="badge-promo">3 x</span> ${formatPrice(promo3)}</div>` : ''}
      ${(mayoristaMin > 0 && mayoristaPrecio > 0) ? `<div class="precio-mayorista"><span class="badge-mayorista">Mayorista</span> desde ${mayoristaMin}u: ${formatPrice(mayoristaPrecio)} c/u</div>` : ''}
    `;
    qs('#detalle-descripcion').textContent = prod.descripcion || '';

    const imgs = prod.imagenes && prod.imagenes.length ? prod.imagenes : [prod.imagen || TINY_GIF];
    const imgMain = qs('#imagen-principal');
    imgMain.src = imgs[0];
    imgMain.alt = prod.nombre;

    const mini = qs('#miniaturas');
    mini.innerHTML = imgs.map((src, i) => `
      <img src="${src}" alt="${prod.nombre} ${i + 1}" class="thumb ${i === 0 ? 'activa' : ''}" data-src="${src}" loading="lazy">
    `).join('');

    renderVariantes(prod);
    qs('#cantidad').textContent = '1';

    // Mostrar total calculado dinámico
    function calcularSubtotalItemDetalle(qty) {
      const unit = Number(prod.precio || 0);
      const promo3 = Number(prod.promo3_precio || 0);
      const mayoristaMin = Number(prod.mayorista_min || 0);
      const mayoristaPrecio = Number(prod.mayorista_precio || 0);
      if (qty <= 0) return { total: 0, nota: '' };
      if (mayoristaMin > 0 && mayoristaPrecio > 0 && qty >= mayoristaMin) {
        return { total: qty * mayoristaPrecio, nota: `Mayorista: ${qty}u × ${formatPrice(mayoristaPrecio)}` };
      }
      if (promo3 > 0 && qty >= 3) {
        const packs = Math.floor(qty / 3);
        const rest = qty % 3;
        const total = packs * promo3 + rest * unit;
        const partes = [];
        if (packs > 0) partes.push(`${packs}× (3 x ${formatPrice(promo3)})`);
        if (rest > 0) partes.push(`${rest}u × ${formatPrice(unit)}`);
        return { total, nota: `Promo: ${partes.join(' + ')}` };
      }
      return { total: qty * unit, nota: '' };
    }

    let precioCalc = qs('#detalle-total-calculado');
    if (!precioCalc) {
      precioCalc = document.createElement('div');
      precioCalc.id = 'detalle-total-calculado';
      precioCalc.className = 'precio-calculado';
      qs('.detalle-info').insertBefore(precioCalc, qs('.variantes'));
    }
    function actualizarTotalCalculado() {
      const qty = Number(qs('#cantidad').textContent);
      const res = calcularSubtotalItemDetalle(qty);
      precioCalc.innerHTML = `Total (${qty}u): ${formatPrice(res.total)}${res.nota ? `<span class="nota-precio">${res.nota}</span>` : ''}`;
    }
    actualizarTotalCalculado();

    // Lógica de stock
    const agregarBtn = qs('#agregar-carrito');
    if (prod.stock === 0) {
      agregarBtn.textContent = 'Agotado';
      agregarBtn.disabled = true;
      qs('.cantidad-control').style.display = 'none';
    } else {
      qs('#mas').addEventListener('click', () => {
        const el = qs('#cantidad');
        el.textContent = String(Math.min(prod.stock, Number(el.textContent) + 1));
        actualizarTotalCalculado();
      });
      qs('#menos').addEventListener('click', () => {
        const el = qs('#cantidad');
        el.textContent = String(Math.max(1, Number(el.textContent) - 1));
        actualizarTotalCalculado();
      });
    }
  }

  function mostrarRecomendaciones(productoActual, todosLosProductos) {
    const container = qs('#recomendaciones-container');
    if (!container) return;

    const recomendados = todosLosProductos
      .filter(p => p.categoria === productoActual.categoria && p.id !== productoActual.id)
      .sort(() => 0.5 - Math.random()) // Mezclar aleatoriamente
      .slice(0, 3); // Tomar los primeros 3

    if (recomendados.length > 0) {
      container.innerHTML = `
        <h3>También te puede interesar</h3>
        <div class="grid-recomendados">
          ${recomendados.map(p => `
            <a href="producto.html?id=${p.id}" class="recomendado">
              <img src="${p.imagen || TINY_GIF}" alt="${p.nombre}">
              <h4>${p.nombre}</h4>
              <p class="precio">${formatPrice(p.precio)}</p>
            </a>
          `).join('')}
        </div>
      `;
    }
  }

  async function init() {
    const paramId = Number(new URLSearchParams(location.search).get('id'));
    if (isNaN(paramId)) {
      qs('main.detalle-producto').innerHTML = '<p>ID de producto inválido.</p>';
      return;
    }

    try {
      const res = await fetch(PATH_PRODUCTOS);
      if (!res.ok) throw new Error('productos.json no encontrado');
      todosLosProductos = await res.json();
      const producto = todosLosProductos.find(p => p.id === paramId);

      if (!producto) {
        qs('main.detalle-producto').innerHTML = '<p>Producto no encontrado.</p>';
        return;
      }

      popularDetalle(producto);
      mostrarRecomendaciones(producto, todosLosProductos);

      // Event listeners
      qs('#btn-volver').addEventListener('click', e => {
        e.preventDefault();
        history.back();
      });

      qs('.detalle-info').addEventListener('click', e => {
        const el = qs('#cantidad');
        if (e.target.id === 'mas') {
          // La lógica de 'mas' se movió a popularDetalle para acceder al stock
        } else if (e.target.id === 'menos') {
          el.textContent = String(Math.max(1, Number(el.textContent) - 1));
        } else if (e.target.id === 'agregar-carrito') {
          const tallaSeleccionada = qs('.opciones-talla button[aria-pressed="true"]')?.dataset.talla;
          const colorSeleccionado = qs('.opciones-color button[aria-pressed="true"]')?.dataset.color;

          const item = {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: Number(el.textContent),
            talla: tallaSeleccionada,
            color: colorSeleccionado,
            stock: producto.stock,
            promo3_precio: producto.promo3_precio,
            mayorista_min: producto.mayorista_min,
            mayorista_precio: producto.mayorista_precio
          };
          agregarAlCarrito(item);

          // Feedback visual
          const btn = e.target;
          btn.textContent = '¡Agregado!';
          setTimeout(() => {
            btn.textContent = 'Agregar al carrito';
          }, 1500);
        }
      });

      qs('#miniaturas').addEventListener('click', e => {
        if (e.target.classList.contains('thumb')) {
          qs('#imagen-principal').src = e.target.dataset.src;
          qsa('.thumb').forEach(t => t.classList.remove('activa'));
          e.target.classList.add('activa');
        }
      });

      qs('.variantes').addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
          const group = e.target.closest('div');
          group.querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
          e.target.setAttribute('aria-pressed', 'true');
        }
      });

      // Zoom de imagen
      const zoomContainer = qs('.imagen-zoom-container');
      const imgZoom = qs('#imagen-principal');
      zoomContainer.addEventListener('mousemove', e => {
        const rect = zoomContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        imgZoom.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      });
      zoomContainer.addEventListener('mouseenter', () => imgZoom.classList.add('zoomed'));
      zoomContainer.addEventListener('mouseleave', () => imgZoom.classList.remove('zoomed'));

    } catch (err) {
      console.error('Error init producto.js:', err);
      qs('main.detalle-producto').innerHTML = '<p>Error al cargar el producto.</p>';
    }
  }

  // Asegurarse de que el DOM esté listo y Kaw esté disponible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.Kaw ? init() : setTimeout(init, 50));
  } else {
    window.Kaw ? init() : setTimeout(init, 50);
  }
})();

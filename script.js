// Lógica para la página de inicio (catálogo de productos)
(() => {
  // Esta función se registrará para ser ejecutada por el inicializador central
  async function initCatalogo() {
    if (!document.getElementById('lista-productos')) return;
    const { qs, qsa, formatPrice, TINY_GIF, agregarAlCarrito } = window.Kaw;
    let productosCache = [];
    let productosFiltrados = [];
    const FILTERS_KEY = 'kawFilters';

    async function fetchProductos() {
      try {
        // Cambia la ruta a './productos.json' para asegurar acceso público
        const resLocal = await fetch('./productos.json', { cache: 'no-store' });
        if (!resLocal.ok) throw new Error('productos.json no accesible');
        const dataLocal = await resLocal.json();
        productosCache = Array.isArray(dataLocal) ? dataLocal : [];
        productosFiltrados = [...productosCache];
      } catch (err2) {
        console.error('Error cargando productos:', err2);
        qs('#lista-productos').innerHTML = '<p>No se pudieron cargar los productos.</p>';
      }
    }

    function mostrarProductos() {
      const cont = window.Kaw.qs('#lista-productos');
      if (!cont) return;
      if (productosFiltrados.length === 0) {
        cont.innerHTML = '<p>No hay productos que coincidan con tu búsqueda.</p>';
        return;
      }
      cont.innerHTML = productosFiltrados.map(p => {
        const imgSrc = p.imagen || TINY_GIF;
        const tieneVariantes = (p.tallas && p.tallas.length > 0) || (p.colores && p.colores.length > 0);
        const botonAccion = tieneVariantes
          ? `<button type="button" class="btn-seleccionar-opciones" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>Seleccionar Opciones</button>`
          : `<button type="button" class="btn-agregar-catalogo" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
               <i class="fas fa-shopping-cart"></i> Agregar
             </button>`;
        const pct = Number(p.descuento_pct||0);
        const precioBase = Number(p.precio||0);
        const precioDesc = pct>0 ? Math.round(precioBase*(1-pct/100)) : precioBase;
        const precioHTML = pct>0
          ? `<p class="precio"><span class="precio-original">${formatPrice(precioBase)}</span> <span class="precio-descuento">${formatPrice(precioDesc)}</span></p>`
          : `<p class="precio">${formatPrice(precioBase)}</p>`;
        const promo3 = Number(p.promo3_precio || 0);
        const mayoristaMin = Number(p.mayorista_min || 0);
        const mayoristaPrecio = Number(p.mayorista_precio || 0);
        const promosHTML = `
          <div class="precios-secundarios">
            ${promo3 > 0 ? `<div class="precio-promo"><span class="badge-promo">3 x</span> ${formatPrice(p.promo3_precio)}</div>` : ''}
            ${(mayoristaMin > 0 && mayoristaPrecio > 0) ? `<div class="precio-mayorista"><span class="badge-mayorista">Mayorista</span> desde ${mayoristaMin}u: ${formatPrice(mayoristaPrecio)} c/u</div>` : ''}
          </div>`;

        return `
          <article class="producto ${p.stock === 0 ? 'agotado' : ''}" data-id="${p.id}">
            ${p.stock === 0 ? '<span class="agotado-badge">Agotado</span>' : ''}
            <a class="card-link" href="producto.html?id=${p.id}">
              <img class="product-img" src="${imgSrc}" alt="${p.nombre || ''}" loading="lazy">
              <h3>${p.nombre || ''}</h3>
              ${precioHTML}
              ${promosHTML}
            </a>
            <div class="acciones-catalogo">
              ${botonAccion}
            </div>
          </article>
        `;
      }).join('');
      // --- NUEVO: Evento para "Seleccionar Opciones" ---
      setTimeout(() => {
        window.Kaw.qsa('.btn-seleccionar-opciones', cont).forEach(btn => {
          btn.onclick = async function () {
            const id = Number(btn.dataset.id);
            const producto = productosFiltrados.find(p => p.id === id);
            if (!producto) return;
            // Modal simple
            let modal = document.getElementById('quick-view-modal');
            if (!modal) {
              modal = document.createElement('div');
              modal.id = 'quick-view-modal';
              modal.className = 'quick-view-modal';
              modal.innerHTML = `
                <div class="modal-contenido">
                  <button class="cerrar-modal" aria-label="Cerrar">&times;</button>
                  <div>
                    <img class="modal-imagen" src="${producto.imagen || window.Kaw.TINY_GIF}" alt="${producto.nombre}">
                  </div>
                  <div class="modal-info">
                    <h3>${producto.nombre}</h3>
                    <p>${producto.descripcion || ''}</p>
                    <div class="modal-variantes"></div>
                    <div class="cantidad-control">
                      <button class="qty-btn" id="modal-menos">-</button>
                      <span id="modal-cantidad">1</span>
                      <button class="qty-btn" id="modal-mas">+</button>
                    </div>
                    <button class="btn-agregar-modal">Agregar al carrito</button>
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
            }
            // Rellenar variantes
            const variantesDiv = modal.querySelector('.modal-variantes');
            variantesDiv.innerHTML = '';
            if (producto.tallas && producto.tallas.length) {
              variantesDiv.innerHTML += `<div><label>Talla:</label>
                <div class="opciones-talla">
                  ${producto.tallas.map((t, i) => `<button type="button" class="modal-talla" data-talla="${t}" ${i===0?'aria-pressed="true"':''}>${t}</button>`).join('')}
                </div></div>`;
            }
            if (producto.colores && producto.colores.length) {
              variantesDiv.innerHTML += `<div><label>Color:</label>
                <div class="opciones-color">
                  ${producto.colores.map((c, i) => `<button type="button" class="modal-color" data-color="${c}" ${i===0?'aria-pressed="true"':''}>${c}</button>`).join('')}
                </div></div>`;
            }
            // Eventos variantes
            variantesDiv.querySelectorAll('.modal-talla').forEach(btnT => {
              btnT.onclick = () => {
                variantesDiv.querySelectorAll('.modal-talla').forEach(b => b.setAttribute('aria-pressed','false'));
                btnT.setAttribute('aria-pressed','true');
              };
            });
            variantesDiv.querySelectorAll('.modal-color').forEach(btnC => {
              btnC.onclick = () => {
                variantesDiv.querySelectorAll('.modal-color').forEach(b => b.setAttribute('aria-pressed','false'));
                btnC.setAttribute('aria-pressed','true');
              };
            });
            // Cantidad
            let cantidad = 1;
            modal.querySelector('#modal-mas').onclick = () => {
              cantidad = Math.min(producto.stock, cantidad + 1);
              modal.querySelector('#modal-cantidad').textContent = cantidad;
            };
            modal.querySelector('#modal-menos').onclick = () => {
              cantidad = Math.max(1, cantidad - 1);
              modal.querySelector('#modal-cantidad').textContent = cantidad;
            };
            // Agregar al carrito
            modal.querySelector('.btn-agregar-modal').onclick = () => {
              const talla = variantesDiv.querySelector('.modal-talla[aria-pressed="true"]')?.dataset.talla;
              const color = variantesDiv.querySelector('.modal-color[aria-pressed="true"]')?.dataset.color;
              window.Kaw.agregarAlCarrito({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad,
                talla,
                color,
                stock: producto.stock,
                promo3_precio: producto.promo3_precio,
                mayorista_min: producto.mayorista_min,
                mayorista_precio: producto.mayorista_precio,
                descuento_pct: Number(producto.descuento_pct || 0)
              });
              modal.style.display = 'none';
            };
            // Cerrar modal
            modal.querySelector('.cerrar-modal').onclick = () => {
              modal.style.display = 'none';
            };
            modal.style.display = 'flex';
          };
        });
      }, 10);
    }

    function filtrarYOrdenar() {
      const buscadorEl = qs('#buscador');
      const ordenEl = qs('#orden');
      const precioEl = qs('#filtro-precio');
      const busqueda = buscadorEl?.value?.trim() || '';
      const orden = ordenEl?.value || 'default';
      const categoriaActiva = qs('#filtros-categoria .filtro-btn.activo');
      const categoria = (categoriaActiva?.dataset?.categoria || 'todos').toString().toLowerCase();
      const talla = (qs('#filtros-talla .filtro-btn.activo')?.dataset?.talla || 'todos').toString().toLowerCase();
      const color = (qs('#filtros-color .filtro-btn.activo')?.dataset?.color || 'todos').toString().toLowerCase();
      let precioMax = Number(precioEl?.value);
      if (!isFinite(precioMax)) {
        precioMax = Number(precioEl?.max) || Number.POSITIVE_INFINITY;
      }
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ busqueda, orden, categoria, talla, color, precio: precioMax }));
      let resultado = [...productosCache];
      if (categoria !== 'todos') {
        resultado = resultado.filter(p => (p.categoria ?? '').toString().toLowerCase() === categoria);
      }
      if (busqueda) {
        const term = busqueda.toLowerCase();
        resultado = resultado.filter(p => (p.nombre || '').toLowerCase().includes(term));
      }
      if (talla !== 'todos') {
        resultado = resultado.filter(p => Array.isArray(p.tallas) && p.tallas.map(v => v.toString().toLowerCase()).includes(talla));
      }
      if (color !== 'todos') {
        resultado = resultado.filter(p => Array.isArray(p.colores) && p.colores.map(v => v.toString().toLowerCase()).includes(color));
      }
      resultado = resultado.filter(p => p.precio <= precioMax);
      switch (orden) {
        case 'precio-asc':
          resultado.sort((a, b) => a.precio - b.precio);
          break;
        case 'precio-desc':
          resultado.sort((a, b) => b.precio - a.precio);
          break;
        case 'nombre-asc':
          resultado.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
          break;
      }
      productosFiltrados = resultado;
      mostrarProductos();
    }

    async function initEvents() {
      const buscador = qs('#buscador');
      if (buscador) buscador.addEventListener('input', filtrarYOrdenar);
      const ordenSelect = qs('#orden');
      if (ordenSelect) ordenSelect.addEventListener('change', filtrarYOrdenar);
      const precioSlider = qs('#filtro-precio');
      if (precioSlider) {
        precioSlider.addEventListener('input', () => {
          updatePrecioDisplay(precioSlider.value);
        });
        precioSlider.addEventListener('change', filtrarYOrdenar);
      }
      const sidebar = qs('#sidebar-filtros');
      if (sidebar) {
        sidebar.addEventListener('click', e => {
          const target = e.target;
          if (target.tagName === 'H4') {
              const grupo = target.closest('.filtro-grupo');
              if (grupo) {
                  grupo.classList.toggle('activo');
              }
              return;
          }
          if (target.classList.contains('filtro-btn')) {
              const group = target.closest('.filtros');
              if (group) {
                  if (!target.classList.contains('activo')) {
                      group.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('activo'));
                      target.classList.add('activo');
                      filtrarYOrdenar();
                  }
              }
              return;
          }
          if (target.id === 'limpiar-filtros') {
              sessionStorage.removeItem(FILTERS_KEY);
              const buscadorEl = qs('#buscador');
              if (buscadorEl) buscadorEl.value = '';
              const ordenEl = qs('#orden');
              if (ordenEl) ordenEl.value = 'default';
              const slider = qs('#filtro-precio');
              if (slider) {
                slider.value = slider.max;
                updatePrecioDisplay(slider.max);
              }
              qsa('.filtro-btn').forEach(btn => btn.classList.remove('activo'));
              qs('#filtros-categoria .filtro-btn[data-categoria="todos"]')?.classList.add('activo');
              qs('#filtros-talla .filtro-btn[data-talla="todos"]')?.classList.add('activo');
              qs('#filtros-color .filtro-btn[data-color="todos"]')?.classList.add('activo');
              qsa('.filtro-grupo').forEach(g => g.classList.add('activo'));
              filtrarYOrdenar();
          }
        });
      }
      const mqDesktop = window.matchMedia('(min-width: 1000px)');
      const mostrarFiltrosBtn = qs('#mostrar-filtros-btn');
      const cerrarFiltrosBtn = qs('#cerrar-filtros-btn');
      const overlay = qs('.filtros-overlay');

      function setAriaExpanded(isOpen) {
        mostrarFiltrosBtn?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
      function isFiltersOpen() {
        return document.body.classList.contains('filtros-activos');
      }
      function openFilters() {
        if (mqDesktop.matches) return;
        document.body.classList.add('filtros-activos');
        setAriaExpanded(true);
      }
      function closeFilters() {
        document.body.classList.remove('filtros-activos');
        setAriaExpanded(false);
      }
      if (mostrarFiltrosBtn) {
        mostrarFiltrosBtn.addEventListener('click', (e) => {
          e.preventDefault();
          isFiltersOpen() ? closeFilters() : openFilters();
        });
      }
      if (cerrarFiltrosBtn) {
        cerrarFiltrosBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeFilters();
        });
      }
      if (overlay) {
        overlay.addEventListener('click', closeFilters);
      }

      document.addEventListener('click', (e) => {
        if (mqDesktop.matches) return;
        if (!isFiltersOpen()) return;
        const dentroSidebar = e.target.closest('#sidebar-filtros');
        const botonToggle = e.target.closest('#mostrar-filtros-btn');
        if (!dentroSidebar && !botonToggle && e.target !== overlay) {
          // No cerrar si se hace clic fuera, solo con el overlay o el botón de cerrar
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFiltersOpen()) closeFilters();
      });
      const onMQChange = (e) => {
        if (e.matches) { // Si se pasa a desktop
          closeFilters(); // Cierra el menú de filtros si estaba abierto
        }
        setAriaExpanded(isFiltersOpen());
      };
      mqDesktop.addEventListener ? mqDesktop.addEventListener('change', onMQChange)
                                 : mqDesktop.addListener(onMQChange);
      
      // Estado inicial
      if (mqDesktop.matches) {
        closeFilters();
      } else {
        setAriaExpanded(isFiltersOpen());
      }
    }

    function generarFiltrosDinamicos() {
      const todasTallas = [...new Set(productosCache.flatMap(p => p.tallas || []))].sort();
      const todosColores = [...new Set(productosCache.flatMap(p => p.colores || []))].sort();
      const sidebar = qs('#sidebar-filtros');
      if (!sidebar) return;
      const crearGrupoFiltro = (titulo, tipo, valores) => {
        if (valores.length === 0) return '';
        return `
          <div class="filtro-grupo activo">
            <h4>${titulo}</h4>
            <div class="filtro-contenido">
              <div id="filtros-${tipo}" class="filtros" role="tablist" aria-label="Filtrar por ${tipo}">
                <button type="button" class="filtro-btn activo" data-${tipo}="todos" role="tab" aria-selected="true">Todos</button>
                ${valores.map(valor => `<button type="button" class="filtro-btn" data-${tipo}="${valor}" role="tab" aria-selected="false">${valor}</button>`).join('')}
              </div>
            </div>
          </div>
        `;
      };
      const tallasHTML = crearGrupoFiltro('Talla', 'talla', todasTallas);
      const coloresHTML = crearGrupoFiltro('Color', 'color', todosColores);
      const filtroCategoria = qs('#filtros-categoria')?.closest('.filtro-grupo');
      if (filtroCategoria) {
        filtroCategoria.insertAdjacentHTML('afterend', tallasHTML + coloresHTML);
      }
    }

    await fetchProductos();
    const precioSlider = qs('#filtro-precio');
    if (precioSlider) {
      const precios = productosCache.map(p => p.precio).filter(p => p > 0);
      const maxPrecio = Math.ceil(Math.max(...(precios.length ? precios : [200000])) / 10000) * 10000;
      precioSlider.max = maxPrecio;
      precioSlider.value = maxPrecio;
      updatePrecioDisplay(maxPrecio);
    }
    generarFiltrosDinamicos();
    mostrarProductos();
    initEvents();
  }
  // Registrar la función de inicialización de este módulo
  window.Kaw.registerInit(initCatalogo);
})();

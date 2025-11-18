// Lógica para la página de inicio (catálogo de productos)
(() => {
  // Intentaremos API; si falla, haremos fallback a productos.json
  const PRODUCTOS_URL = '/api/productos';
  let productosCache = [];
  let productosFiltrados = [];
  const FILTERS_KEY = 'kawFilters';

  // Helpers desde el scope global de window.Kaw
  const { qs, qsa, formatPrice, TINY_GIF, agregarAlCarrito } = window.Kaw;

  async function fetchProductos() {
    try {
      const res = await fetch(PRODUCTOS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error al cargar productos desde la API: ${res.status}`);
      const data = await res.json();
      
      productosCache = Array.isArray(data) ? data : [];
      productosFiltrados = [...productosCache];
    } catch (err) {
      console.error('Error cargando productos:', err);
      qs('#lista-productos').innerHTML = '<p>No se pudieron cargar los productos.</p>';
    }
  }

  function mostrarProductos() {
    const cont = qs('#lista-productos');
    if (!cont) return;

    if (productosFiltrados.length === 0) {
      cont.innerHTML = '<p>No hay productos que coincidan con tu búsqueda.</p>';
      return;
    }

    cont.innerHTML = productosFiltrados.map(p => {
      const tieneVariantes = (p.tallas && p.tallas.length > 0) || (p.colores && p.colores.length > 0);
      const botonAccion = tieneVariantes
        ? `<button class="btn-seleccionar-opciones" data-id="${p.id}">Seleccionar Opciones</button>`
        : `<button class="btn-agregar-catalogo" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
             <i class="fas fa-shopping-cart"></i> Agregar
           </button>`;

      const promo3 = Number(p.promo3_precio || 0);
      const mayoristaMin = Number(p.mayorista_min || 0);
      const mayoristaPrecio = Number(p.mayorista_precio || 0);

      const promosHTML = `
        <div class="precios-secundarios">
          ${promo3 > 0 ? `<div class="precio-promo"><span class="badge-promo">3 x</span> ${formatPrice(promo3)}</div>` : ''}
          ${(mayoristaMin > 0 && mayoristaPrecio > 0) ? `<div class="precio-mayorista"><span class="badge-mayorista">Mayorista</span> desde ${mayoristaMin}u: ${formatPrice(mayoristaPrecio)} c/u</div>` : ''}
        </div>`;

      return `
        <article class="producto ${p.stock === 0 ? 'agotado' : ''}" data-id="${p.id}">
          ${p.stock === 0 ? '<span class="agotado-badge">Agotado</span>' : ''}
          <a class="card-link" href="producto.html?id=${p.id}">
            <img class="product-img" src="${p.imagen || TINY_GIF}" alt="${p.nombre || ''}" loading="lazy">
            <h3>${p.nombre || ''}</h3>
            <p class="precio">${formatPrice(p.precio)}</p>
            ${promosHTML}
          </a>
          <div class="acciones-catalogo">
            ${botonAccion}
          </div>
        </article>
      `;
    }).join('');
  }

  function filtrarYOrdenar() {
    const busqueda = qs('#buscador').value;
    const orden = qs('#orden').value;
    const categoria = qs('#filtros-categoria .filtro-btn.activo')?.dataset.categoria || 'todos';
    const talla = qs('#filtros-talla .filtro-btn.activo')?.dataset.talla || 'todos';
    const color = qs('#filtros-color .filtro-btn.activo')?.dataset.color || 'todos';
    const precioMax = Number(qs('#filtro-precio').value);

    // Guardar estado de filtros
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ busqueda, orden, categoria, talla, color, precio: precioMax }));

    let resultado = [...productosCache];

    // Filtrar
    if (categoria !== 'todos') {
      resultado = resultado.filter(p => p.categoria.toLowerCase() === categoria);
    }
    if (busqueda) {
      resultado = resultado.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }
    if (talla !== 'todos') {
      resultado = resultado.filter(p => p.tallas && p.tallas.includes(talla));
    }
    if (color !== 'todos') {
      resultado = resultado.filter(p => p.colores && p.colores.includes(color));
    }
    
    resultado = resultado.filter(p => p.precio <= precioMax);

    // Ordenar
    switch (orden) {
      case 'precio-asc':
        resultado.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio-desc':
        resultado.sort((a, b) => b.precio - a.precio);
        break;
      case 'nombre-asc':
        resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
    }
    productosFiltrados = resultado;
    mostrarProductos();
  }

  function restoreFilterState() {
    try {
      const savedFilters = JSON.parse(sessionStorage.getItem(FILTERS_KEY));
      if (savedFilters) {
        qs('#buscador').value = savedFilters.busqueda || '';
        qs('#orden').value = savedFilters.orden || 'default';
        
        const precioSlider = qs('#filtro-precio');
        if (savedFilters.precio !== undefined) {
          precioSlider.value = savedFilters.precio;
        }
        updatePrecioDisplay(precioSlider.value);
        
        qsa('#filtros-categoria .filtro-btn').forEach(btn => {
          btn.classList.toggle('activo', btn.dataset.categoria === savedFilters.categoria);
        });
        qsa('#filtros-talla .filtro-btn').forEach(btn => {
          btn.classList.toggle('activo', btn.dataset.talla === savedFilters.talla);
        });
        qsa('#filtros-color .filtro-btn').forEach(btn => {
          btn.classList.toggle('activo', btn.dataset.color === savedFilters.color);
        });
      }
    } catch (e) {
      console.error("No se pudo restaurar el estado de los filtros:", e.message || e);
      sessionStorage.removeItem(FILTERS_KEY);
    }
  }

  function updatePrecioDisplay(valor) {
    const display = qs('#precio-max-display');
    if (display) {
      display.textContent = formatPrice(valor);
    }
  }

  function initEvents() {
    qs('#buscador').addEventListener('input', filtrarYOrdenar);
    qs('#orden').addEventListener('change', filtrarYOrdenar);
    
    const precioSlider = qs('#filtro-precio');
    precioSlider.addEventListener('input', () => {
      updatePrecioDisplay(precioSlider.value);
    });
    // Filtrar solo cuando el usuario suelta el control del slider
    precioSlider.addEventListener('change', filtrarYOrdenar);

    qs('#sidebar-filtros').addEventListener('click', e => {
        const target = e.target;

        // Lógica del acordeón: se activa al hacer clic en el H4
        if (target.tagName === 'H4') {
            const grupo = target.closest('.filtro-grupo');
            if (grupo) {
                grupo.classList.toggle('activo');
            }
            return; // Detener para no procesar otros clics
        }

        // Lógica de los botones de filtro (talla, color, categoría)
        if (target.classList.contains('filtro-btn')) {
            const group = target.closest('.filtros');
            if (group) {
                // Si el botón ya está activo, no hacer nada.
                // Si se quisiera deseleccionar, se necesitaría otra lógica.
                if (!target.classList.contains('activo')) {
                    group.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('activo'));
                    target.classList.add('activo');
                    filtrarYOrdenar();
                }
            }
            return; // Detener
        }

        // Lógica del botón de limpiar filtros
        if (target.id === 'limpiar-filtros') {
            sessionStorage.removeItem(FILTERS_KEY);
            qs('#buscador').value = '';
            qs('#orden').value = 'default';
            
            const slider = qs('#filtro-precio');
            slider.value = slider.max;
            updatePrecioDisplay(slider.max);

            qsa('.filtro-btn').forEach(btn => btn.classList.remove('activo'));
            
            // Activar los botones "Todos" por defecto
            qs('#filtros-categoria .filtro-btn[data-categoria="todos"]')?.classList.add('activo');
            qs('#filtros-talla .filtro-btn[data-talla="todos"]')?.classList.add('activo');
            qs('#filtros-color .filtro-btn[data-color="todos"]')?.classList.add('activo');
            
            // Asegurarse de que los acordeones de filtros se abran al limpiar
            qsa('.filtro-grupo').forEach(g => g.classList.add('activo'));
            
            filtrarYOrdenar();
        }
    });

    // Toggle para mostrar/ocultar filtros
    const mostrarFiltrosBtn = qs('#mostrar-filtros-btn');
    if (mostrarFiltrosBtn) {
      mostrarFiltrosBtn.addEventListener('click', () => {
        document.body.classList.add('filtros-activos');
      });
    }

    const cerrarFiltrosBtn = qs('#cerrar-filtros-btn');
    if (cerrarFiltrosBtn) {
      cerrarFiltrosBtn.addEventListener('click', () => {
        document.body.classList.remove('filtros-activos');
      });
    }

    // Manejador de eventos para la lista de productos
    const listaProductos = qs('#lista-productos');
    if (listaProductos) {
      listaProductos.addEventListener('click', e => {
        const btnAgregar = e.target.closest('.btn-agregar-catalogo');
        const btnOpciones = e.target.closest('.btn-seleccionar-opciones');

        if (btnAgregar) {
          e.preventDefault();
          const id = Number(btnAgregar.dataset.id);
          const producto = productosCache.find(p => p.id === id);
          if (producto) {
            agregarAlCarrito({ ...producto, cantidad: 1 });
            
            // Feedback visual
            btnAgregar.innerHTML = '<i class="fas fa-check"></i> Agregado';
            btnAgregar.disabled = true;
            setTimeout(() => {
              btnAgregar.innerHTML = '<i class="fas fa-shopping-cart"></i> Agregar';
              btnAgregar.disabled = false;
            }, 1500);
          }
        } else if (btnOpciones) {
          e.preventDefault();
          const id = Number(btnOpciones.dataset.id);
          const producto = productosCache.find(p => p.id === id);
          if (producto) {
            renderQuickViewModal(producto);
          }
        }
      });
    }

    // Cerrar filtros si se hace clic en el overlay
    document.addEventListener('click', (e) => {
      if (e.target === document.body && document.body.classList.contains('filtros-activos')) {
        document.body.classList.remove('filtros-activos');
      }
    });
  }

  function generarFiltrosDinamicos() {
    const todasTallas = [...new Set(productosCache.flatMap(p => p.tallas || []))].sort();
    const todosColores = [...new Set(productosCache.flatMap(p => p.colores || []))].sort();
    const sidebar = qs('#sidebar-filtros');

    if (!sidebar) return;

    const crearGrupoFiltro = (titulo, tipo, valores) => {
      if (valores.length === 0) return '';
      return `
        <div class="filtro-grupo">
          <h4>${titulo}</h4>
          <div class="filtro-contenido">
            <div id="filtros-${tipo}" class="filtros" role="tablist" aria-label="Filtrar por ${tipo}">
              <button class="filtro-btn activo" data-${tipo}="todos">Todos</button>
              ${valores.map(valor => `<button class="filtro-btn" data-${tipo}="${valor}">${valor}</button>`).join('')}
            </div>
          </div>
        </div>
      `;
    };

    const tallasHTML = crearGrupoFiltro('Talla', 'talla', todasTallas);
    const coloresHTML = crearGrupoFiltro('Color', 'color', todosColores);

    // Insertar los nuevos grupos de filtros después del filtro de precio
    const filtroPrecio = qs('.filtro-grupo:nth-of-type(2)');
    if (filtroPrecio) {
      filtroPrecio.insertAdjacentHTML('afterend', tallasHTML + coloresHTML);
    }
  }

  function renderQuickViewModal(producto) {
    let modal = qs('#quick-view-modal');
    if (modal) modal.remove(); // Eliminar modal anterior si existe

    modal = document.createElement('div');
    modal.id = 'quick-view-modal';
    modal.className = 'quick-view-modal';
    
    const tallasHTML = producto.tallas && producto.tallas.length > 0
      ? `<div class="var-group">
          <label>Talla:</label>
          <div class="opciones-talla">
            ${producto.tallas.map((talla, i) => `<button aria-pressed="${i === 0}" data-talla="${talla}">${talla}</button>`).join('')}
          </div>
        </div>`
      : '';

    const coloresHTML = producto.colores && producto.colores.length > 0
      ? `<div class="var-group">
          <label>Color:</label>
          <div class="opciones-color">
            ${producto.colores.map((color, i) => `<button aria-pressed="${i === 0}" data-color="${color}">${color}</button>`).join('')}
          </div>
        </div>`
      : '';

    modal.innerHTML = `
      <div class="modal-contenido">
        <button class="cerrar-modal" aria-label="Cerrar vista rápida">&times;</button>
        <img src="${producto.imagen || TINY_GIF}" alt="${producto.nombre}" class="modal-imagen">
        <div class="modal-info">
          <h3>${producto.nombre}</h3>
          <p class="precio">${formatPrice(producto.precio)}</p>
          <div class="precios-secundarios">
            ${Number(producto.promo3_precio||0) > 0 ? `<div class=\"precio-promo\"><span class=\"badge-promo\">3 x</span> ${formatPrice(producto.promo3_precio)}</div>` : ''}
            ${(Number(producto.mayorista_min||0) > 0 && Number(producto.mayorista_precio||0) > 0) ? `<div class=\"precio-mayorista\"><span class=\"badge-mayorista\">Mayorista</span> desde ${producto.mayorista_min}u: ${formatPrice(producto.mayorista_precio)} c/u</div>` : ''}
          </div>
          <div class="precio-calculado"></div>
          ${tallasHTML}
          ${coloresHTML}
          <div class="cantidad-control">
            <button class="qty-btn" data-action="decrease">-</button>
            <span class="cantidad">1</span>
            <button class="qty-btn" data-action="increase">+</button>
          </div>
          <button class="btn-agregar-modal">Agregar al carrito</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('modal-abierto');

    // Event listeners para el modal
    const calcBox = qs('.precio-calculado', modal);
    function calcularSubtotalModal(qty){
      const unit = Number(producto.precio||0);
      const p3 = Number(producto.promo3_precio||0);
      const mmin = Number(producto.mayorista_min||0);
      const mp = Number(producto.mayorista_precio||0);
      if(qty<=0) return {total:0, nota:''};
      if(mmin>0 && mp>0 && qty>=mmin) return { total: qty*mp, nota: `Mayorista: ${qty}u × ${formatPrice(mp)}` };
      if(p3>0 && qty>=3){ const packs=Math.floor(qty/3), rest=qty%3; const total=packs*p3+rest*unit; const partes=[]; if(packs>0) partes.push(`${packs}× (3 x ${formatPrice(p3)})`); if(rest>0) partes.push(`${rest}u × ${formatPrice(unit)}`); return { total, nota:`Promo: ${partes.join(' + ')}`}; }
      return { total: qty*unit, nota:'' };
    }
    function actualizarCalc(){ const qty = Number(qs('.cantidad', modal).textContent); const res=calcularSubtotalModal(qty); calcBox.innerHTML = `Total (${qty}u): ${formatPrice(res.total)}${res.nota?`<span class=\"nota-precio\">${res.nota}</span>`:''}`; }
    actualizarCalc();

    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('.cerrar-modal')) {
        modal.remove();
        document.body.classList.remove('modal-abierto');
      }

      // Control de cantidad
      const cantidadEl = qs('.cantidad', modal);
      let cantidad = Number(cantidadEl.textContent);
      if (e.target.dataset.action === 'increase') {
        cantidad = Math.min(producto.stock, cantidad + 1);
      } else if (e.target.dataset.action === 'decrease') {
        cantidad = Math.max(1, cantidad - 1);
      }
      cantidadEl.textContent = cantidad;
      if(e.target.dataset.action) actualizarCalc();

      // Selección de variantes
      if (e.target.tagName === 'BUTTON' && (e.target.dataset.talla || e.target.dataset.color)) {
        const group = e.target.closest('div');
        group.querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
        e.target.setAttribute('aria-pressed', 'true');
      }

      // Agregar al carrito
      if (e.target.classList.contains('btn-agregar-modal')) {
        const item = {
          ...producto,
          cantidad: Number(qs('.cantidad', modal).textContent),
          talla: qs('.opciones-talla button[aria-pressed="true"]', modal)?.dataset.talla,
          color: qs('.opciones-color button[aria-pressed="true"]', modal)?.dataset.color,
        };
        agregarAlCarrito(item);
        modal.remove();
        document.body.classList.remove('modal-abierto');
      }
    });
  }

  async function init() {
    await fetchProductos();

    // Configurar dinámicamente el slider de precios
    const precios = productosCache.map(p => p.precio).filter(p => p > 0);
    const maxPrecio = Math.ceil(Math.max(...(precios.length ? precios : [200000])) / 10000) * 10000;
    const precioSlider = qs('#filtro-precio');
    precioSlider.max = maxPrecio;
    precioSlider.value = maxPrecio; // Valor por defecto
    updatePrecioDisplay(maxPrecio);

    // 1. Generar los filtros dinámicos (talla, color) para que existan en el DOM.
    generarFiltrosDinamicos();
    
    // 2. Restaurar el estado guardado de los filtros (ahora que todos existen).
    restoreFilterState(); 
    
    // 3. Aplicar los filtros para mostrar los productos iniciales.
    filtrarYOrdenar(); 
    
    // 4. Inicializar todos los eventos de la página.
    initEvents();
  }

  // Asegurarse de que el DOM esté listo y Kaw esté disponible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.Kaw ? init() : setTimeout(init, 50));
  } else {
    window.Kaw ? init() : setTimeout(init, 50);
  }
})();

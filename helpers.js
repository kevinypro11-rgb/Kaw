// --- HELPERS GLOBALES Y CONFIGURACIÓN ---
(() => {
  // Namespace global para la aplicación
  window.Kaw = window.Kaw || {};

  // Selectores del DOM
  window.Kaw.qs = (s, o = document) => o.querySelector(s);
  window.Kaw.qsa = (s, o = document) => Array.from(o.querySelectorAll(s));

  // Formateador de precios a moneda colombiana (COP)
  window.Kaw.formatPrice = (value) => {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  // GIF transparente para usar como placeholder de imágenes
  window.Kaw.TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  // Funciones que se inicializarán más tarde
  window.Kaw.agregarAlCarrito = window.Kaw.agregarAlCarrito || (() => console.warn('agregarAlCarrito no está inicializado.'));
  window.Kaw.mostrarAviso = window.Kaw.mostrarAviso || (() => console.warn('mostrarAviso no inicializado.'));
  window.Kaw.getCarrito = window.Kaw.getCarrito || (() => {
      console.warn('getCarrito no inicializado.');
      return [];
  });
  window.Kaw.abrirModalCarrito = window.Kaw.abrirModalCarrito || (() => console.warn('abrirModalCarrito no inicializado.'));

  // QUITAR bloque getApiBase y apiFetch:
  // (() => { ... })();
  // Sustituir por stub local:
  window.Kaw.apiFetch = (path, opts={}) => fetch(path, opts);

  // Helpers de precios (centralización de lógica)
  window.Kaw.calcPrecioUnitario = (precio, descuento_pct) => {
    const unit = Number(precio || 0);
    const pct = Number(descuento_pct || 0);
    return pct > 0 ? Math.round(unit * (1 - pct / 100)) : unit;
  };

  window.Kaw.calcSubtotal = (item) => {
    const unit = window.Kaw.calcPrecioUnitario(item.precio, item.descuento_pct);
    const promo3 = Number(item.promo3_precio || 0);
    const mayoristaMin = Number(item.mayorista_min || 0);
    const mayoristaPrecio = Number(item.mayorista_precio || 0);
    const qty = Number(item.cantidad || 0);
    if (qty <= 0) return 0;

    const unitPromo3 = promo3 > 0 ? window.Kaw.calcPrecioUnitario(promo3, item.descuento_pct) : 0;
    const unitMayorista = mayoristaPrecio > 0 ? window.Kaw.calcPrecioUnitario(mayoristaPrecio, item.descuento_pct) : 0;

    if (mayoristaMin > 0 && mayoristaPrecio > 0 && qty >= mayoristaMin) {
      return qty * unitMayorista;
    }
    if (promo3 > 0 && qty >= 3) {
      const packs = Math.floor(qty / 3);
      const rest = qty % 3;
      return packs * unitPromo3 + rest * unit;
    }
    return qty * unit;
  };

  window.Kaw.describePrecio = (item) => {
    const { formatPrice } = window.Kaw;
    const qty = Number(item.cantidad || 0);
    if (qty <= 0) return '';
    const promo3 = Number(item.promo3_precio || 0);
    const mayoristaMin = Number(item.mayorista_min || 0);
    const mayoristaPrecio = Number(item.mayorista_precio || 0);
    const unit = window.Kaw.calcPrecioUnitario(item.precio, item.descuento_pct);
    const unitPromo3 = promo3 > 0 ? window.Kaw.calcPrecioUnitario(promo3, item.descuento_pct) : 0;
    const unitMayorista = mayoristaPrecio > 0 ? window.Kaw.calcPrecioUnitario(mayoristaPrecio, item.descuento_pct) : 0;

    if (mayoristaMin > 0 && mayoristaPrecio > 0 && qty >= mayoristaMin) {
      return `Mayorista: ${qty}u × ${formatPrice(unitMayorista)}`;
    }
    if (promo3 > 0 && qty >= 3) {
      const packs = Math.floor(qty / 3);
      const rest = qty % 3;
      const partes = [];
      if (packs > 0) partes.push(`${packs}× (3 x ${formatPrice(unitPromo3)})`);
      if (rest > 0) partes.push(`${rest}u × ${formatPrice(unit)}`);
      return `Promo: ${partes.join(' + ')}`;
    }
    return '';
  };

  window.Kaw.formatQty = (n) => String(Number(n)||0).padStart(2,'0');

  window.Kaw.uuid = () =>
    ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

  window.Kaw.formatDate = (d=new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  // --- INICIALIZADOR CENTRAL ---
  // Almacena las funciones de inicialización de cada módulo
  const initializers = [];
  window.Kaw.registerInit = (fn) => {
    if (typeof fn === 'function') {
      initializers.push(fn);
    }
  };

  // Ejecutar inicializadores con aislamiento (evita que uno rompa el resto)
  document.addEventListener('DOMContentLoaded', () => {
    initializers.forEach(fn => {
      try { fn(); } catch (e) { console.error('Init error:', e); }
    });
  });
})();

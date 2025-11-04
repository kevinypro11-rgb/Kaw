// --- HELPERS GLOBALES Y CONFIGURACIÓN ---
(() => {
  // Namespace global para la aplicación
  window.Kaw = {
    // Selectores del DOM
    qs: (s, o = document) => o.querySelector(s),
    qsa: (s, o = document) => Array.from(o.querySelectorAll(s)),

    // Formateador de precios a moneda colombiana (COP)
    formatPrice: (value) => {
      const number = Number(value) || 0;
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(number);
    },

    // GIF transparente para usar como placeholder de imágenes
    TINY_GIF: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    // Funciones que se inicializarán más tarde
    agregarAlCarrito: () => console.warn('agregarAlCarrito no está inicializado. Asegúrese de que app.js se ha cargado correctamente.'),
    mostrarAviso: () => console.warn('mostrarAviso no inicializado'),
  };
})();

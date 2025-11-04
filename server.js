// Servidor Express para servir la app y exponer API de inventario
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const INVENTARIO_XLSX = path.join(ROOT, 'inventario.xlsx');
const INVENTARIO_CSV = path.join(ROOT, 'inventario.csv');

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT, { extensions: ['html'] }));

function loadInventory() {
  let rows = [];
  if (fs.existsSync(INVENTARIO_XLSX)) {
    const wb = XLSX.readFile(INVENTARIO_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } else if (fs.existsSync(INVENTARIO_CSV)) {
    const wb = XLSX.readFile(INVENTARIO_CSV, { type: 'file' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } else {
    // Sin archivo: intentar leer productos.json como fallback
    const jsonPath = path.join(ROOT, 'productos.json');
    if (fs.existsSync(jsonPath)) {
      try { rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
      catch {}
    }
  }
  // Normalizar estructura
  const productos = rows.map(r => ({
    id: Number(r.id),
    nombre: r.nombre || r.name || '',
    precio: Number(r.precio || r.price || 0),
    stock: Number(r.stock || 0),
    imagen: r.imagen || r.image || '',
    categoria: (r.categoria || r.category || '').toString().toLowerCase(),
    tallas: (r.tallas || r.sizes || '').toString().split(',').map(s => s.trim()).filter(Boolean),
    colores: (r.colores || r.colors || '').toString().split(',').map(s => s.trim()).filter(Boolean),
    descripcion: r.descripcion || r.description || '',
    promo3_precio: Number(r.promo3_precio || r.promo_3_precio || r.promox3 || 0),
    mayorista_min: Number(r.mayorista_min || r.wholesale_min || 0),
    mayorista_precio: Number(r.mayorista_precio || r.wholesale_precio || 0)
  }));
  const filtered = productos.filter(p => !Number.isNaN(p.id));
  if (filtered.length < productos.length) {
    console.warn('Some products filtered due to invalid IDs');
  }
  return filtered;
}

function saveInventory(productos) {
  // Guardar donde exista: XLSX preferente; si no, CSV
  if (fs.existsSync(INVENTARIO_XLSX)) {
    const data = productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      stock: p.stock,
      imagen: p.imagen,
      categoria: p.categoria,
      tallas: (p.tallas || []).join(','),
      colores: (p.colores || []).join(','),
      descripcion: p.descripcion || '',
      promo3_precio: p.promo3_precio || 0,
      mayorista_min: p.mayorista_min || 0,
      mayorista_precio: p.mayorista_precio || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, INVENTARIO_XLSX);
  } else {
    // CSV
    const header = 'id,nombre,precio,stock,imagen,categoria,tallas,colores,descripcion,promo3_precio,mayorista_min,mayorista_precio\n';
    const lines = productos.map(p => [
      p.id,
      JSON.stringify(p.nombre).slice(1, -1),
      p.precio,
      p.stock,
      JSON.stringify(p.imagen).slice(1, -1),
      JSON.stringify(p.categoria).slice(1, -1),
      JSON.stringify((p.tallas || []).join(',')).slice(1, -1),
      JSON.stringify((p.colores || []).join(',')).slice(1, -1),
      JSON.stringify(p.descripcion || '').slice(1, -1),
      p.promo3_precio || 0,
      p.mayorista_min || 0,
      p.mayorista_precio || 0
    ].join(',')).join('\n');
    fs.writeFileSync(INVENTARIO_CSV, header + lines, 'utf8');
  }
}

app.get('/api/productos', (req, res) => {
  try {
    const productos = loadInventory();
    res.json(productos);
  } catch (e) {
    console.error('Error /api/productos', e);
    res.status(500).json({ error: 'No se pudo cargar el inventario' });
  }
});

app.post('/api/venta', (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ error: 'No se proporcionaron items en la solicitud' });

    const productos = loadInventory();
    // Mapear por id
    const byId = new Map(productos.map(p => [p.id, p]));
    for (const it of items) {
      const p = byId.get(Number(it.id));
      if (!p) continue;
      const cant = Number(it.cantidad || 1);
      p.stock = Math.max(0, Number(p.stock || 0) - cant);
    }
    saveInventory([...byId.values()]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Error /api/venta', e);
    res.status(500).json({ error: 'No se pudo actualizar el inventario' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

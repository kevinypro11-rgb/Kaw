(async()=>{
  const tbody = document.querySelector('#tabla-pedidos tbody');
  function cargar(){
    const data = JSON.parse(localStorage.getItem('pedidos')||'[]');
    tbody.innerHTML = data.map(p=>{
      const items = p.items.map(i=>`${i.nombre} x${i.cantidad}`).join('<br>');
      const refs = p.items.map(i => `${i.referencia || i.id} x${i.cantidad}`).join(', ');
      const msg = p.whatsapp_text || '';
      const btnCopy = `<button class="copiar-msg" data-msg="${encodeURIComponent(msg)}">Copiar msg</button>`;
      return `<tr data-id="${p.id}">
        <td>${p.id}<div>refs: ${refs}</div><div>${btnCopy}</div></td>
        <td>${p.fecha?.slice(0,19).replace('T',' ')}</td>
        <td>${p.cliente.nombre}<br>${p.cliente.email||''}<br>${p.cliente.telefono||''}${p.cliente.direccion?`<br>${p.cliente.direccion}`:''}${p.cliente.ciudad?`<br>${p.cliente.ciudad}`:''}</td>
        <td>${window.Kaw.formatPrice(p.total)}</td>
        <td><span class="estado-badge estado-${p.estado}">${p.estado}</span></td>
        <td class="pedido-acciones">
          <select>
            <option value="">--</option>
            <option value="pendiente">pendiente</option>
            <option value="enviado">enviado</option>
            <option value="entregado">entregado</option>
            <option value="pago">pago</option>
          </select>
        </td>
        <td>${items}</td>
      </tr>`;
    }).join('');
  }
  tbody.addEventListener('change', e=>{
    if (e.target.tagName!=='SELECT') return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const estado = e.target.value;
    if (!estado) return;
    const pedidos = JSON.parse(localStorage.getItem('pedidos')||'[]');
    const idx = pedidos.findIndex(o=>o.id===id);
    if (idx>-1){
      pedidos[idx].estado = estado;
      pedidos[idx].estado_fecha = new Date().toISOString();
      localStorage.setItem('pedidos', JSON.stringify(pedidos));
      tr.querySelector('.estado-badge').textContent = estado;
      tr.querySelector('.estado-badge').className = `estado-badge estado-${estado}`;
    }
  });
  tbody.addEventListener('click', e=>{
    const btn = e.target.closest('.copiar-msg');
    if (!btn) return;
    const msg = decodeURIComponent(btn.dataset.msg||'');
    navigator.clipboard.writeText(msg).then(()=>{
      btn.textContent='Copiado';
      setTimeout(()=>btn.textContent='Copiar msg',1000);
    });
  });
  cargar();
  setInterval(cargar, 15000);
})();

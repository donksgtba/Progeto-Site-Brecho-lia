const notice = document.getElementById('authNotice');
function setNotice(msg){ notice.textContent = msg; }

const token = localStorage.getItem('token');
if(!token){
  setNotice('Você precisa fazer login. Acesse /login');
}

const headers = ()=> ({ 'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });

async function loadCategories(){
  const res = await fetch('/api/categories');
  const cats = await res.json();
  const sel = document.getElementById('category');
  sel.innerHTML = cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

async function save(){
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const category_id = document.getElementById('category').value;
  const size = document.getElementById('size').value.trim();
  const color = document.getElementById('color').value.trim();
  const price = parseFloat(document.getElementById('price').value||'0');
  const image_url = document.getElementById('image').value.trim();
  if(!name || !category_id || !price){ alert('Preencha nome, categoria e preço'); return; }
  const res = await fetch('/api/products', { method:'POST', headers: headers(), body: JSON.stringify({ name, description, category_id, size, color, price_cents: Math.round(price*100), image_url }) });
  if(!res.ok){ const e = await res.json(); alert(e.error||'Erro'); return; }
  await loadProducts();
  document.getElementById('name').value='';
  document.getElementById('description').value='';
  document.getElementById('size').value='';
  document.getElementById('color').value='';
  document.getElementById('price').value='';
  document.getElementById('image').value='';
}

document.getElementById('btnSave').addEventListener('click', save);

function money(c){return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

async function loadProducts(){
  const res = await fetch('/api/products');
  const list = await res.json();
  const table = document.getElementById('table');
  table.innerHTML = '<tr><th>Nome</th><th>Categoria</th><th>Tam.</th><th>Cor</th><th>Preço</th><th></th></tr>' +
    list.map(p=>`<tr class="row"><td>${p.name}</td><td>${p.category_name}</td><td>${p.size||''}</td><td>${p.color||''}</td><td>${money(p.price_cents)}</td><td><button data-id="${p.id}" class="btn btn-del">Excluir</button></td></tr>`).join('');
  table.querySelectorAll('.btn-del').forEach(b=> b.addEventListener('click', async () => {
    const id = b.getAttribute('data-id');
    if(!confirm('Excluir produto?')) return;
    const r = await fetch(`/api/products/${id}`, { method:'DELETE', headers: headers() });
    if(r.ok) loadProducts(); else alert('Erro ao excluir');
  }));
}

loadCategories();
loadProducts();

const nav = document.getElementById('nav');
const grid = document.getElementById('grid');
const btnOpenLogin = document.getElementById('btnOpenLogin');
const loginModal = document.getElementById('loginModal');
const btnCloseLogin = document.getElementById('btnCloseLogin');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnDoLogin = document.getElementById('btnDoLogin');

let categories = [];
let currentCat = null;

function money(cents){
  return cents.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

async function fetchCategories(){
  const res = await fetch('/api/categories');
  categories = await res.json();
  renderNav();
}

function renderNav(){
  nav.innerHTML = '';
  const all = document.createElement('a');
  all.href = '#';
  all.textContent = 'Todos';
  all.className = !currentCat ? 'active' : '';
  all.onclick = (e)=>{e.preventDefault(); currentCat=null; loadProducts(); renderNav();};
  nav.appendChild(all);
  categories.forEach(c => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = c.name;
    a.className = currentCat===c.id ? 'active' : '';
    a.onclick = (e)=>{e.preventDefault(); currentCat=c.id; loadProducts(); renderNav();};
    nav.appendChild(a);
  });
}

async function loadProducts(){
  grid.innerHTML = '';
  const url = currentCat ? `/api/products?categoryId=${currentCat}` : '/api/products';
  const res = await fetch(url);
  const products = await res.json();
  products.forEach(p => grid.appendChild(card(p)));
}

function card(p){
  const div = document.createElement('div');
  div.className = 'card';
  if (p.image_url) {
    const img = document.createElement('img');
    img.src = p.image_url;
    img.alt = p.name;
    img.loading = 'lazy';
    div.appendChild(img);
  }
  const title = document.createElement('h3');
  title.textContent = p.category_name || '';
  const name = document.createElement('p');
  name.style.fontWeight = '700';
  name.textContent = p.name + (p.size ? ` · Tamanho ${p.size}` : '');
  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = money(p.price_cents/100);

  div.appendChild(title);
  div.appendChild(name);
  if(p.color){
    const color = document.createElement('p');
    color.textContent = `Cor: ${p.color}`;
    div.appendChild(color);
  }
  div.appendChild(price);
  return div;
}

// --- Login incorporado ---
function openLogin(){ loginModal.classList.add('open'); loginModal.setAttribute('aria-hidden','false'); loginEmail.focus(); }
function closeLogin(){ loginModal.classList.remove('open'); loginModal.setAttribute('aria-hidden','true'); }

btnOpenLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  if (token) { location.href = '/admin'; return; }
  openLogin();
});
btnCloseLogin?.addEventListener('click', () => closeLogin());
loginModal?.addEventListener('click', (e) => { if (e.target === loginModal) closeLogin(); });
btnDoLogin?.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  if (!email || !password) { alert('Preencha usuário e senha'); return; }
  const res = await fetch('/api/auth/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (!res.ok) { alert(data.error || 'Erro de login'); return; }
  localStorage.setItem('token', data.token);
  location.href = '/admin';
});

// Ajusta texto do botão conforme login
if (btnOpenLogin) {
  if (localStorage.getItem('token')) btnOpenLogin.textContent = 'Admin';
}

fetchCategories().then(loadProducts);

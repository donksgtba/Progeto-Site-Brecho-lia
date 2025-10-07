const nav = document.getElementById('nav');
const grid = document.getElementById('grid');

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

fetchCategories().then(loadProducts);

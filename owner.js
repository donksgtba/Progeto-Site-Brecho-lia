const tkey = 'owner_token';
const headers = ()=> ({ 'Content-Type':'application/json', 'Authorization': `Bearer ${localStorage.getItem(tkey)||''}` });

async function login(){
  const password = document.getElementById('ownerPass').value.trim();
  const res = await fetch('/api/owner/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password }) });
  const data = await res.json();
  if(!res.ok){ alert(data.error||'Erro de login'); return; }
  localStorage.setItem(tkey, data.token);
  await load();
}

document.getElementById('btnOwnerLogin').addEventListener('click', login);

async function load(){
  const token = localStorage.getItem(tkey);
  const loginBox = document.getElementById('loginBox');
  const panel = document.getElementById('panel');
  if(!token){ loginBox.classList.remove('hidden'); panel.classList.add('hidden'); return; }
  loginBox.classList.add('hidden'); panel.classList.remove('hidden');
  const res = await fetch('/api/settings');
  const s = await res.json();
  document.getElementById('status').value = s.status;
  document.getElementById('whats').value = s.support_whatsapp || '';
}

async function save(){
  const status = document.getElementById('status').value;
  const support_whatsapp = document.getElementById('whats').value.replace(/\D/g,'');
  const owner_password = document.getElementById('newOwnerPass').value.trim();
  const res = await fetch('/api/settings', { method:'PUT', headers: headers(), body: JSON.stringify({ status, support_whatsapp, owner_password: owner_password||undefined }) });
  const data = await res.json();
  if(!res.ok){ alert(data.error||'Erro ao salvar'); return; }
  alert('Configurações atualizadas');
}

document.getElementById('btnSaveSettings').addEventListener('click', save);

load();

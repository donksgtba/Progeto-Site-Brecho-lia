document.getElementById('btnLogin').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if(!res.ok){ alert(data.error||'Erro de login'); return; }
  localStorage.setItem('token', data.token);
  location.href = '/admin';
});

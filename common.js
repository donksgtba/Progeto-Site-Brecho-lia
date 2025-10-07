export async function loadSettings(){
  const res = await fetch('/api/settings');
  const settings = await res.json();
  return settings;
}

export function ensureWhatsButton(whats){
  const id = 'wa-btn';
  if(document.getElementById(id)) return;
  const a = document.createElement('a');
  a.id = id;
  a.href = `https://wa.me/${whats}`;
  a.target = '_blank';
  a.className = 'whats';
  a.ariaLabel = 'Suporte via WhatsApp';
  a.title = 'Suporte via WhatsApp';
  a.textContent = 'WA';
  document.body.appendChild(a);
}

export function maybeBlockByStatus(status, whats){
  if(status === 'inadimplente'){
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="overlay-card"><h2>Assinatura Inativa</h2><p>Este site está temporariamente bloqueado por falta de pagamento.</p><p>Fale com o suporte para reativação.</p><p><a class="btn" target="_blank" href="https://wa.me/${whats}">Falar no WhatsApp</a></p></div>`;
    document.body.appendChild(overlay);
  }
}

import { getSession, login } from './lib/api.js';

function showBanner(message, type) {
  const el = document.getElementById('banner');
  el.textContent = message;
  el.className = `banner ${type}`;
  el.hidden = false;
}

async function prefill() {
  const session = await getSession();
  if (session) {
    document.getElementById('backendUrl').value = session.backendUrl;
    document.getElementById('slug').value = session.slug;
    document.getElementById('email').value = session.email;
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const connectBtn = document.getElementById('connectBtn');
  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando...';

  const backendUrl = document.getElementById('backendUrl').value.trim();
  const slug = document.getElementById('slug').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await login({ backendUrl, slug, email, password });
    showBanner('Conectado ✓. Ya puedes cerrar esta pestaña y usar el icono de la extensión.', 'success');
  } catch (err) {
    showBanner(err.message || 'No se pudo conectar.', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Conectar';
  }
});

prefill();

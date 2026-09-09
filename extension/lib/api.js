// Lógica compartida entre popup.js y options.js. Sin build step: JS plano,
// cargado como módulo ES nativo (<script type="module">) — nada que compilar.

const STORAGE_KEY = 'crm_extension_session';

/**
 * Decodifica el payload de un JWT SIN verificar la firma — no hace falta:
 * la firma la verifica el backend en cada petición. Esto es solo para
 * saber cuándo caduca el token y pedir login de nuevo en el momento
 * adecuado, no es un límite de seguridad.
 */
function decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] ?? null;
}

export async function saveSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export function isSessionValid(session) {
  if (!session || !session.token || !session.expiresAt) return false;
  // Un margen de 60s para no usar un token que caduca a mitad de la petición.
  return session.expiresAt > Date.now() + 60_000;
}

/**
 * Login contra el backend del CRM. NO guardamos la contraseña, solo el
 * token resultante — así, si alguien accediera al almacenamiento de la
 * extensión, no encontraría una contraseña en texto plano, solo un JWT
 * que caduca a las 8 horas (lo mismo que ya usa el resto del CRM).
 */
export async function login({ backendUrl, slug, email, password }) {
  const res = await fetch(`${backendUrl.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status} al iniciar sesión`);
  }
  const data = await res.json();
  const session = {
    backendUrl: backendUrl.replace(/\/$/, ''),
    slug,
    email,
    token: data.accessToken,
    tenantName: data.tenant?.name ?? slug,
    expiresAt: decodeJwtExpiry(data.accessToken) ?? Date.now() + 8 * 60 * 60 * 1000,
  };
  await saveSession(session);
  return session;
}

async function authedFetch(session, path, options = {}) {
  const res = await fetch(`${session.backendUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function createLead(session, data) {
  return authedFetch(session, '/leads', { method: 'POST', body: JSON.stringify({ ...data, source: 'linkedin_extension' }) });
}

export function createContact(session, category, data) {
  return authedFetch(session, '/contacts', {
    method: 'POST',
    body: JSON.stringify({ ...data, category, source: 'linkedin_extension' }),
  });
}

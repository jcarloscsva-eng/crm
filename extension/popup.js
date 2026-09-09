import { createContact, createLead, getSession, isSessionValid } from './lib/api.js';
import { extractLinkedInProfile } from './lib/extract-linkedin.js';

const app = document.getElementById('app');

function render(html) {
  app.innerHTML = html;
}

function showBanner(message, type) {
  const el = document.getElementById('banner');
  if (!el) return;
  el.textContent = message;
  el.className = `banner ${type}`;
  el.hidden = false;
}

async function init() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    renderDisconnected();
    return;
  }
  renderMain(session);
}

function renderDisconnected() {
  render(`
    <h1>CRM Pymes</h1>
    <p class="muted">No hay ninguna cuenta conectada, o la sesión caducó.</p>
    <button class="btn-primary" id="openOptions">Conectar cuenta</button>
  `);
  document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function renderMain(session) {
  render(`
    <h1>${session.tenantName}</h1>
    <div id="banner" class="banner" hidden></div>
    <button class="btn-secondary" id="extractBtn">Extraer de esta página</button>

    <form id="saveForm">
      <div class="field">
        <label for="fullName">Nombre *</label>
        <input id="fullName" required />
      </div>
      <div class="field">
        <label for="company">Empresa</label>
        <input id="company" />
      </div>
      <div class="field">
        <label for="notes">Notas</label>
        <textarea id="notes" placeholder="Titular, ubicación..."></textarea>
      </div>
      <div class="field">
        <label for="linkedinUrl">URL de LinkedIn</label>
        <input id="linkedinUrl" readonly />
      </div>
      <div class="field">
        <label for="destination">Guardar como</label>
        <select id="destination">
          <option value="lead">Lead</option>
          <option value="partner">Partner</option>
          <option value="interesting">Contacto interesante</option>
        </select>
      </div>
      <div class="field" id="estimatedValueField">
        <label for="estimatedValue">Valor estimado (€, opcional)</label>
        <input id="estimatedValue" type="number" min="0" />
      </div>
      <button type="submit" class="btn-primary" id="saveBtn">Guardar en el CRM</button>
    </form>
    <p class="muted" style="margin-top:8px">
      <button class="link" id="disconnectBtn">Cambiar de cuenta</button>
    </p>
  `);

  const destinationSelect = document.getElementById('destination');
  const estimatedValueField = document.getElementById('estimatedValueField');
  destinationSelect.addEventListener('change', () => {
    estimatedValueField.style.display = destinationSelect.value === 'lead' ? '' : 'none';
  });

  document.getElementById('extractBtn').addEventListener('click', () => extractFromPage());
  document.getElementById('disconnectBtn').addEventListener('click', async () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('saveForm').addEventListener('submit', (e) => handleSave(e, session));
}

async function extractFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showBanner('No se encontró la pestaña activa.', 'error');
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractLinkedInProfile,
    });
    document.getElementById('fullName').value = result.fullName || '';
    document.getElementById('company').value = result.company || '';
    document.getElementById('linkedinUrl').value = result.linkedinUrl || '';
    const notesParts = [result.headline, result.location].filter(Boolean);
    document.getElementById('notes').value = notesParts.join(' · ');
    if (!result.fullName) {
      showBanner('No se pudo extraer el nombre automáticamente. Revisa y rellena a mano.', 'error');
    } else {
      showBanner('Datos extraídos. Revísalos antes de guardar.', 'success');
    }
  } catch (err) {
    showBanner(
      'No se pudo leer esta página (¿estás en un perfil de LinkedIn?). Puedes rellenar los campos a mano.',
      'error',
    );
  }
}

async function handleSave(e, session) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const fullName = document.getElementById('fullName').value.trim();
  const company = document.getElementById('company').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const linkedinUrl = document.getElementById('linkedinUrl').value.trim();
  const destination = document.getElementById('destination').value;
  const estimatedValueRaw = document.getElementById('estimatedValue').value;

  try {
    if (destination === 'lead') {
      await createLead(session, {
        fullName,
        company: company || undefined,
        notes: notes || undefined,
        linkedinUrl: linkedinUrl || undefined,
        estimatedValue: estimatedValueRaw ? Number(estimatedValueRaw) : undefined,
      });
    } else {
      await createContact(session, destination, {
        fullName,
        company: company || undefined,
        notes: notes || undefined,
        linkedinUrl: linkedinUrl || undefined,
      });
    }
    showBanner('Guardado en el CRM ✓', 'success');
    document.getElementById('saveForm').reset();
  } catch (err) {
    showBanner(err.message || 'No se pudo guardar.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar en el CRM';
  }
}

init();

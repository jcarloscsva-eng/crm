/**
 * Extrae datos de la página de perfil de LinkedIn que el usuario tiene
 * abierta ahora mismo. Se ejecuta dentro de la propia página vía
 * chrome.scripting.executeScript, así que tiene que ser 100% autocontenida
 * (nada de variables externas ni imports: Chrome la serializa por su
 * código fuente).
 *
 * IMPORTANTE — esto es "mejor esfuerzo", no una API oficial: LinkedIn no
 * documenta su HTML y lo cambia con frecuencia, así que estos selectores
 * pueden dejar de funcionar en cualquier momento. Por diseño, el popup
 * siempre deja los campos editables antes de guardar — nunca se guarda
 * nada sin que el usuario lo revise.
 */
export function extractLinkedInProfile() {
  function cleanText(el) {
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  const nameEl = document.querySelector('h1');
  const fullName = cleanText(nameEl);

  const card = nameEl ? nameEl.closest('section') : null;

  let headline = '';
  if (card) {
    const headlineEl = card.querySelector('.text-body-medium, [data-field="headline"]');
    headline = cleanText(headlineEl);
  }

  let location = '';
  if (card) {
    const locationEl = card.querySelector('.text-body-small, [data-field="location"]');
    location = cleanText(locationEl);
  }

  let company = '';
  const experienceHeading = Array.from(document.querySelectorAll('h2, span, div')).find((el) =>
    /^experience$/i.test((el.textContent || '').trim()),
  );
  if (experienceHeading) {
    const section = experienceHeading.closest('section') || experienceHeading.parentElement;
    const companyEl = section ? section.querySelector('[data-field="company"], .t-14 span[aria-hidden="true"]') : null;
    company = cleanText(companyEl);
  }

  return {
    fullName,
    headline,
    location,
    company,
    linkedinUrl: window.location.href.split('?')[0],
  };
}

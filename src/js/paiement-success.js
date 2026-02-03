import { loadSaved, responses } from './modules/storage.js';

function setStatus(msg) {
  const el = document.getElementById('successStatus');
  if (el) el.textContent = msg || '';
}

function setDetails(html) {
  const el = document.getElementById('successDetails');
  if (el) el.innerHTML = html || '';
}

function getQueryParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

async function sendPdfEmailAndMaybeShowCalendly(offer, advisor) {
  try {
    const email = responses && typeof responses === 'object' ? responses.email : null;
    if (!email) {
      setStatus("Email manquant: impossible d'envoyer le PDF.");
      return;
    }

    const sessionId = getQueryParam('session_id');
    if (!sessionId) {
      setStatus('Paramètre session_id manquant.');
      return;
    }

    setStatus('Envoi du PDF par email…');

    const resp = await fetch('/api/send-paid-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, responses: responses || {} }),
    });

    if (!resp.ok) {
      let details = '';
      try {
        details = await resp.text();
      } catch {
      }
      throw new Error(details || `Erreur HTTP: ${resp.status}`);
    }

    const data = await resp.json();
    setStatus('PDF envoyé par email.');

    if (data && data.offer === '79' && data.calendlyUrl) {
      const calendlyBlock = document.getElementById('calendlyBlock');
      const calendlyLink = document.getElementById('calendlyLink');
      if (calendlyBlock && calendlyLink) {
        calendlyLink.href = data.calendlyUrl;
        calendlyBlock.style.display = 'block';
      }
    }
  } catch (e) {
    try { console.error(e); } catch {}
    setStatus('Impossible de finaliser pour le moment.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSaved();
  } catch {
  }

  const email = (responses && typeof responses === 'object' ? responses.email : null) || '';

  setDetails(`
    <p style="margin: 0;"><strong>Email :</strong> ${email ? String(email) : '—'}</p>
  `);

  sendPdfEmailAndMaybeShowCalendly(null, null);
});

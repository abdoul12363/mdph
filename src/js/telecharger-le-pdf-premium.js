import { loadSaved, responses } from './modules/storage.js';
import { createConfetti, addConfettiStyles } from './modules/confetti.js';

function setStatus(msg) {
  const el = document.getElementById('downloadStatus');
  if (el) el.textContent = msg;
}

function getQueryParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

async function pollPaymentStatus(paymentId) {
  try {
    setStatus('Vérification du paiement…');
    for (let i = 0; i < 20; i += 1) {
      const resp = await fetch(`/api/payment-status?payment_id=${encodeURIComponent(paymentId)}`, { method: 'GET' });
      if (!resp.ok) {
        let details = '';
        try { details = await resp.text(); } catch {}
        throw new Error(details || `Erreur HTTP: ${resp.status}`);
      }
      const data = await resp.json();
      if (data && data.isPaid) {
        setStatus('Paiement confirmé.');
        return true;
      }
      setStatus('Paiement en cours de confirmation…');
      await new Promise(r => setTimeout(r, 1500));
    }
    setStatus('Paiement non confirmé (patientez puis rechargez la page).');
    return false;
  } catch (e) {
    try { console.error(e); } catch {}
    setStatus('Impossible de vérifier le paiement pour le moment.');
    return false;
  }
}

async function downloadPdf() {
  const btn = document.getElementById('downloadBtn');
  try {
    setStatus('Génération en cours…');

    loadSaved();

    let paymentId = getQueryParam('payment_id') || '';
    if (!paymentId) {
      try {
        paymentId = sessionStorage.getItem('mollie_payment_id') || '';
      } catch {
      }
    }
    if (!paymentId) {
      setStatus('Paramètre payment_id manquant.');
      return;
    }

    const ok = await pollPaymentStatus(paymentId);
    if (!ok) return;

    const resp = await fetch('/api/download-paid-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, responses: responses || {} }),
    });

    if (!resp.ok) {
      let details = '';
      try {
        details = await resp.text();
      } catch {
      }
      console.error('Erreur API /api/projet-de-vie-premium:', resp.status, details);
      throw new Error(details || `Erreur HTTP: ${resp.status}`);
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mdph-projet-de-vie-rempli.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus('Téléchargement démarré.');
  } catch (e) {
    try {
      console.error(e);
    } catch {
    }
    setStatus('Impossible de télécharger le PDF pour le moment.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    addConfettiStyles();
    setTimeout(() => {
      try {
        createConfetti();
      } catch {
      }
    }, 250);
  } catch {
  }

  const btn = document.getElementById('downloadBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      try {
        e.preventDefault();
      } catch {
      }
      downloadPdf();
    });
  }

  // Auto-start download if payment_id is present
  let paymentId = getQueryParam('payment_id') || '';
  if (!paymentId) {
    try {
      paymentId = sessionStorage.getItem('mollie_payment_id') || '';
    } catch {
    }
  }
  if (paymentId) {
    downloadPdf();
  }
});

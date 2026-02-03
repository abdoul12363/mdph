import { loadSaved, responses } from './modules/storage.js';

function setStatus(msg) {
  const el = document.getElementById('paymentStatus');
  if (el) el.textContent = msg || '';
}

function setRecap(html) {
  const el = document.getElementById('paymentRecap');
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

function buildRecap(offer, advisor) {
  if (offer === '49') {
    return `
      <p style="margin: 0 0 10px 0;"><strong>Offre :</strong> Projet de vie structuré pour la MDPH</p>
      <p style="margin: 0;"><strong>Prix :</strong> 49 €</p>
    `;
  }
  if (offer === '79') {
    let advisorLabel = advisor || '—';
    try {
      const stored = responses && typeof responses === 'object' ? responses.__advisorSelected : null;
      if (stored && stored.id && advisor && String(stored.id) === String(advisor)) {
        const prenom = stored.prenom ? String(stored.prenom) : '';
        const role = stored.role ? String(stored.role) : '';
        advisorLabel = [prenom, role].filter(Boolean).join(' — ') || advisorLabel;
      }
    } catch {
    }
    return `
      <p style="margin: 0 0 10px 0;"><strong>Offre :</strong> Accompagnement personnalisé</p>
      <p style="margin: 0 0 10px 0;"><strong>Prix :</strong> 79 €</p>
      <p style="margin: 0;"><strong>Personne choisie :</strong> ${advisorLabel}</p>
    `;
  }
  return `<p style="margin: 0;">Offre inconnue.</p>`;
}

async function startPayment(offer, advisor) {
  try {
    setStatus('Redirection vers le paiement…');

    const email = responses && typeof responses === 'object' ? responses.email : '';
    if (!email) {
      setStatus("Votre email n'est pas renseigné. Retournez au formulaire pour le compléter.");
      return;
    }

    const resp = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer, email, advisor }),
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
    if (!data || !data.url) {
      throw new Error('URL de paiement manquante');
    }

    window.location.href = data.url;
  } catch (e) {
    try {
      console.error(e);
    } catch {
    }
    setStatus('Impossible de démarrer le paiement.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSaved();
  } catch {
  }

  const offer = getQueryParam('offer');
  const advisor = getQueryParam('advisor');

  if (offer !== '49' && offer !== '79') {
    setRecap('<p>Offre manquante. Retournez à la page précédente.</p>');
    setStatus('');
    return;
  }

  if (offer === '79' && !advisor) {
    setRecap(buildRecap(offer, null));
    setStatus('Veuillez choisir une personne avant de continuer.');
    const payBtn = document.getElementById('payBtn');
    if (payBtn) payBtn.style.display = 'none';
    return;
  }

  setRecap(buildRecap(offer, advisor));

  // Vérifier si l'email est présent (utile pour l'envoi après paiement)
  try {
    const email = responses && typeof responses === 'object' ? responses.email : null;
    if (!email) {
      setStatus("Votre email n'est pas renseigné. Retournez au formulaire pour le compléter.");
    }
  } catch {
  }

  const payBtn = document.getElementById('payBtn');
  if (payBtn) {
    payBtn.addEventListener('click', (e) => {
      try { e.preventDefault(); } catch {}
      startPayment(offer, advisor);
    });
  }
});

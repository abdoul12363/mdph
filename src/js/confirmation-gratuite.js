import { loadSaved, responses } from './modules/storage.js';

function setStatus(msg) {
  const el = document.getElementById('downloadStatus');
  if (el) el.textContent = msg || '';
}

async function downloadPdf() {
  try {
    setStatus('Génération en cours…');
    loadSaved();

    const resp = await fetch('/api/projet-de-vie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responses || {}),
    });

    if (!resp.ok) {
      let details = '';
      try {
        details = await resp.text();
      } catch {
      }
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
});

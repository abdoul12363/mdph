// Fonctions utilitaires partagées entre le client et le serveur
export function normalizeOuiNon(v) {
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (!v) return 'non';
  const s = String(v).trim().toLowerCase();
  return ['oui', 'o', 'yes', 'y', '1', 'true'].includes(s) ? 'oui' : 'non';
}

export function splitDateToDMY(value) {
  if (!value) return { d: '', m: '', y: '' };
  
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const fr = /^\d{2}\/\d{2}\/\d{4}$/;

  if (iso.test(value)) {
    const [y, m, d] = value.split('-');
    return { d, m, y };
  }

  if (fr.test(value)) {
    const [d, m, y] = value.split('/');
    return { d, m, y };
  }

  return { d: '', m: '', y: '' };
}

// Fonction utilitaire pour valider les emails
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

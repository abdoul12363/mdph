/**
 * Validation des longueurs minimales pour les textarea
 */

export function validateMinLength(question, answer) {
  // Appliquer uniquement aux champs texte longs
  const type = question && (question.type || question.type_champ);
  if (type !== 'textarea' && type !== 'texte_long') return true;

  if (!question || question.minLength === undefined || question.minLength === null) return true;

  const minLength = Number.parseInt(String(question.minLength), 10);
  if (!Number.isFinite(minLength) || minLength <= 0) return true;

  const currentLength = answer ? String(answer).length : 0;
  return currentLength >= minLength;
}

export function getMinLengthErrorMessage(question, answer) {
  if (!question.minLength) return null;

  const minLength = Number.parseInt(String(question.minLength), 10);
  const currentLength = answer ? String(answer).length : 0;
  const missingRaw = minLength - currentLength;
  const missing = missingRaw > 0 ? missingRaw : 0;

  return `Veuillez écrire au minimum ${minLength} caractères (${missing} caractère${missing > 1 ? 's' : ''} manquant${missing > 1 ? 's' : ''})`;
}

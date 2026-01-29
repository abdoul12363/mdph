/**
 * Extraction des réponses depuis le DOM.
 * Important: pour les radios, on retourne toujours des chaînes (compatibilité conditions).
 */

import { $ } from './dom-utils.js';
import { responses } from './storage.js';

function getScope(q) {
  try {
    if (q && q.id) {
      const byId = document.querySelector(`[data-question-id="${q.id}"]`);
      if (byId) return byId;
    }
  } catch {
  }
  return document;
}

export function getAnswerFromDom(q) {
  const type = q.type || q.type_champ;
  const scope = getScope(q);
  
  if (type === 'checkbox') {
    const el = scope.querySelector('#answer');
    return el ? el.checked : false;
  }
  
  if (type === 'checkbox_multiple_with_frequency') {
    const checkedBoxes = scope.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }

  if (type === 'checkbox_multiple') {
    const checkedBoxes = scope.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }
  
  if (type === 'radio') {
    const el = (q && q.id ? scope.querySelector(`input[name="${q.id}"]:checked`) : null)
      || (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked');
    if (!el) return '';

    return String(el.value);
  }
  
  if (type === 'radio_with_text') {
    const el = (q && q.id ? scope.querySelector(`input[name="${q.id}"]:checked`) : null)
      || (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked');
    const radioValue = el ? el.value : '';

    const textEl = scope.querySelector('input[name="opt_text"]');
    if (textEl && textEl.value.trim()) {
      responses[q.id + '_text'] = textEl.value.trim();
    }
    
    return radioValue;
  }
  
  if (type === 'oui_non') {
    const el = (q && q.id ? scope.querySelector(`input[name="yn_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="yn"]:checked');
    return el ? el.value : '';
  }

  if (type === 'choix_multiple') {
    const el = (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked');
    return el ? el.value : '';
  }

  const el = scope.querySelector('#answer') || $('answer');
  // Pour les champs coordonnées: garder la valeur exacte sans trim
  if (q.className === 'coordonnees-page') {
    return el ? String(el.value || '') : '';
  }
  return el ? String(el.value || '').trim() : '';
}

export function validateRequired(q, answer) {
  if (!q.obligatoire) return true;
  if (typeof answer === 'boolean') return answer === true;
  if (Array.isArray(answer)) return answer.length > 0;
  if (answer === null || answer === undefined) return false;
  // Pour les champs coordonnées: aucune contrainte, juste non vide
  if (q.className === 'coordonnees-page') {
    return String(answer).length > 0;
  }
  return String(answer).trim().length > 0;
}

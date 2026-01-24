/**
 * Extraction des réponses depuis le DOM.
 * Important: pour les radios, on retourne toujours des chaînes (compatibilité conditions).
 */

import { $ } from './dom-utils.js';
import { responses } from './storage.js';

export function getAnswerFromDom(q) {
  const type = q.type || q.type_champ;
  
  if (type === 'checkbox') {
    const el = document.querySelector('#answer');
    return el ? el.checked : false;
  }
  
  if (type === 'checkbox_multiple_with_frequency') {
    const checkedBoxes = document.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }

  if (type === 'checkbox_multiple') {
    const checkedBoxes = document.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }
  
  if (type === 'radio') {
    const el = document.querySelector('input[name="opt"]:checked')
      || (q && q.id ? document.querySelector(`input[name="${q.id}"]:checked`) : null);
    if (!el) return '';

    return String(el.value);
  }
  
  if (type === 'radio_with_text') {
    const el = document.querySelector('input[name="opt"]:checked');
    const radioValue = el ? el.value : '';

    const textEl = document.querySelector('input[name="opt_text"]');
    if (textEl && textEl.value.trim()) {
      responses[q.id + '_text'] = textEl.value.trim();
    }
    
    return radioValue;
  }
  
  if (type === 'oui_non') {
    const el = document.querySelector('input[name="yn"]:checked');
    return el ? el.value : '';
  }

  if (type === 'choix_multiple') {
    const el = document.querySelector('input[name="opt"]:checked');
    return el ? el.value : '';
  }

  const el = $('answer');
  return el ? String(el.value || '').trim() : '';
}

export function validateRequired(q, answer) {
  if (!q.obligatoire) return true;
  if (typeof answer === 'boolean') return answer === true;
  if (Array.isArray(answer)) return answer.length > 0;
  if (answer === null || answer === undefined) return false;
  return String(answer).trim().length > 0;
}

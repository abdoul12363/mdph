/**
 * Answer extraction from DOM elements
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
    const el = document.querySelector('input[name="opt"]:checked');
    if (!el) return '';
    
    // Retourner toujours des chaînes de caractères pour les boutons radio
    return String(el.value);
  }
  
  if (type === 'radio_with_text') {
    const el = document.querySelector('input[name="opt"]:checked');
    const radioValue = el ? el.value : '';
    
    // Si l'option sélectionnée a un champ texte, récupérer aussi sa valeur
    const textEl = document.querySelector('input[name="opt_text"]');
    if (textEl && textEl.value.trim()) {
      // Sauvegarder aussi la valeur du champ texte séparément
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
  return answer && answer.trim().length > 0;
}

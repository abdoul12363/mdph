/**
 * Condition evaluation for question visibility
 */

import { responses } from './storage.js';

export function evaluateCondition(cond) {
  if (!cond) return true;
  
  // Vérifier si c'est une comparaison avec ===
  const strictMatch = String(cond).match(/(q_[a-zA-Z0-9_]+)\s*===\s*['\"]([^'\"]+)['\"]/);
  if (strictMatch) {
    const [, qid, expected] = strictMatch;
    const val = responses[qid];
    return String(val || '') === expected;
  }
  
  // Vérifier si c'est une comparaison avec == (insensible à la casse)
  const looseMatch = String(cond).match(/(q_[a-zA-Z0-9_]+)\s*==\s*['\"]([^'\"]+)['\"]/i);
  if (looseMatch) {
    const [, qid, expected] = looseMatch;
    const val = responses[qid];
    return String(val || '').trim().toLowerCase() === expected.trim().toLowerCase();
  }
  
  // Vérifier les conditions booléennes simples
  if (cond === 'true') return true;
  if (cond === 'false') return false;
  
  // Si la condition est un identifiant de question simple
  if (cond.startsWith('q_') && cond in responses) {
    return Boolean(responses[cond]);
  }
  
  console.warn('Condition non reconnue:', cond);
  return true;
}

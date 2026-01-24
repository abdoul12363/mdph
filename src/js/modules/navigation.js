/**
 * Navigation helpers.
 * `inFlight` évite les doubles clics rapides (next/prev) qui peuvent désynchroniser l'index.
 */

import { responses, saveLocal } from './storage.js';
import { getAnswerFromDom, validateRequired } from './answer-extractor.js';

let inFlight = false;

export function next(idx, render, visible) {
  if (inFlight) return idx;
  inFlight = true;
  
  try {
    const q = visible[idx];
    if (!q) {
      return idx;
    }

    const answer = getAnswerFromDom(q);
    
    if (q.obligatoire && !validateRequired(q, answer)) {
      alert('Cette question est obligatoire');
      return idx;
    }
    
    if (answer !== undefined && answer !== '') {
      responses[q.id] = answer;
      saveLocal(true);
    }
    
    idx++;
    
    if (idx >= visible.length) {
      idx = visible.length - 1;
    }
    
    return idx;
  } catch (error) {
    console.error('Erreur dans next():', error);
    return idx;
  } finally {
    inFlight = false;
  }
}

export function prev(idx, render, visible) {
  if (inFlight || idx <= 0) return idx;
  inFlight = true;
  
  try {
    const q = visible[idx];
    if (q) {
      const answer = getAnswerFromDom(q);
      if (answer !== undefined && answer !== '') {
        responses[q.id] = answer;
        saveLocal(true);
      }
    }
    
    idx--;
    
    if (idx < 0) idx = 0;
    
    return idx;
  } catch (error) {
    console.error('Erreur dans prev():', error);
    return idx;
  } finally {
    inFlight = false;
  }
}

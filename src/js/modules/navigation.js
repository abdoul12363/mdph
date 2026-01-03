/**
 * Navigation functions (next/prev)
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
      // Si on est à la fin du formulaire
      console.log('Fin du formulaire atteinte');
      return idx;
    }

    // Récupérer la réponse actuelle
    const answer = getAnswerFromDom(q);
    
    // Valider si le champ est obligatoire
    if (q.obligatoire && !validateRequired(q, answer)) {
      alert('Cette question est obligatoire');
      return idx;
    }
    
    // Sauvegarder la réponse
    if (answer !== undefined && answer !== '') {
      responses[q.id] = answer;
      saveLocal(true);
    }
    
    // Passer à la question suivante
    idx++;
    
    // Si on dépasse la dernière question, on reste sur la dernière
    if (idx >= visible.length) {
      idx = visible.length - 1;
      console.log('Dernière question atteinte');
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
    // Sauvegarder la réponse actuelle avant de revenir en arrière
    const q = visible[idx];
    if (q) {
      const answer = getAnswerFromDom(q);
      if (answer !== undefined && answer !== '') {
        responses[q.id] = answer;
        saveLocal(true);
      }
    }
    
    // Revenir à la question précédente
    idx--;
    
    // S'assurer qu'on ne va pas en dessous de 0
    if (idx < 0) idx = 0;
    
    return idx;
  } catch (error) {
    console.error('Erreur dans prev():', error);
    return idx;
  } finally {
    inFlight = false;
  }
}

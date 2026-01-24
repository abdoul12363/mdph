/**
 * Persistance locale des réponses (localStorage).
 */

import { setStatus } from './dom-utils.js';

const storageKey = 'cerfa_responses_v1';

export let responses = {};

export function updateResponses(newResponses) {
  responses = newResponses;
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) responses = JSON.parse(raw);
  } catch (error) {
    console.error('Erreur lors du chargement des données sauvegardées :', error);
    responses = {};
  }
}

export function saveLocal(silent = false) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(responses));
    if (!silent) setStatus('Sauvegardé localement.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde locale :', error);
    setStatus('Erreur lors de la sauvegarde');
  }
}

export function resetAll() {
  if (!confirm('Réinitialiser toutes les réponses ?')) return false;
  responses = {};
  saveLocal(true);
  return true;
}

export function setResponse(questionId, value) {
  responses[questionId] = value;
}

export function getResponse(questionId) {
  return responses[questionId];
}

// Exposition minimale pour d'éventuels handlers inline (éviter d'étendre plus que nécessaire).
if (typeof window !== 'undefined') {
  window.responses = responses;
  window.saveLocal = saveLocal;
  window.setResponse = setResponse;
  window.getResponse = getResponse;
}

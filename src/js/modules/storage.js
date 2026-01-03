/**
 * Local storage management
 */

import { setStatus } from './dom-utils.js';

const storageKey = 'cerfa_responses_v1';

export let responses = {};

// Fonction pour mettre à jour les responses depuis les modules
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

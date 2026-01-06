/**
 * Progress tracking and step calculation
 */

import { $ } from './dom-utils.js';

export function getCurrentStepNumber(visible, idx) {
  if (!visible[idx]) return 1;
  
  // Retourner le step de la question courante, ou 1 par défaut
  return visible[idx].step || 1;
}

export function getTotalSteps(visible) {
  // Si pas de questions, 1 étape par défaut
  if (visible.length === 0) return 1;
  
  // Trouver le step maximum parmi toutes les questions visibles
  const maxStep = Math.max(...visible.map(q => q.step || 1));
  return maxStep > 0 ? maxStep : 1;
}

export function updateProgress(idx, visible) {
  const total = visible.length;
  
  // Récupérer la page actuelle
  const currentQuestion = visible[idx];
  let currentModule = 1;
  let currentPageTitle = '';
  let currentPageDescription = '';
  
  if (currentQuestion) {
    // Extraire le numéro du module à partir de l'ID de la page (ex: 'page1' -> 1)
    const match = currentQuestion.pageId?.match(/page(\d+)/);
    if (match) {
      currentModule = parseInt(match[1], 10);
    }
    
    // Récupérer le titre et la description de la page
    currentPageTitle = currentQuestion.pageTitle || '';
    currentPageDescription = currentQuestion.sectionDescription || currentQuestion.pageTitle || '';
    
    // Mettre à jour les éléments du DOM s'ils existent
    const moduleTitle = document.getElementById('moduleTitle');
    const moduleDescription = document.getElementById('moduleDescription');
    
    if (moduleTitle) moduleTitle.textContent = currentPageTitle;
    if (moduleDescription) moduleDescription.textContent = currentPageDescription;
  }
  
  // Calculer le numéro d'étape actuel
  const currentStep = currentModule;
  const totalSteps = 4; // Nombre total de modules
  
  // Mettre à jour la barre de progression avec le nouveau format
  const partieText = `Partie ${currentStep} sur ${totalSteps} – ${currentPageTitle}`;
  $('progressText').textContent = partieText;
  $('progressFill').style.width = totalSteps ? `${Math.round((currentStep / totalSteps) * 100)}%` : '0%';
  $('questionId').textContent = ''; // ID masqué de l'interface

  // Gérer les boutons de navigation
  $('prevBtn').disabled = idx <= 0;
  $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
}

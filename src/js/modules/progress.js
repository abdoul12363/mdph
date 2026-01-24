/**
 * Progression (barre + libellé) basée sur la page courante.
 */

import { $ } from './dom-utils.js';

export function getCurrentStepNumber(visible, idx) {
  if (!visible[idx]) return 1;

  return visible[idx].step || 1;
}

export function getTotalSteps(visible) {
  if (visible.length === 0) return 1;

  const maxStep = Math.max(...visible.map(q => q.step || 1));
  return maxStep > 0 ? maxStep : 1;
}

export function updateProgress(idx, visible) {
  const total = visible.length;

  const currentQuestion = visible[idx];
  let currentModule = 1;
  let currentPageTitle = '';
  let currentPageDescription = '';
  
  if (currentQuestion) {
    const match = currentQuestion.pageId?.match(/page(\d+)/);
    if (match) {
      currentModule = parseInt(match[1], 10);
    }

    currentPageTitle = currentQuestion.pageTitle || '';
    currentPageDescription = currentQuestion.sectionDescription || currentQuestion.pageTitle || '';

    const moduleTitle = document.getElementById('moduleTitle');
    const moduleDescription = document.getElementById('moduleDescription');
    
    if (moduleTitle) moduleTitle.textContent = currentPageTitle;
    if (moduleDescription) moduleDescription.textContent = currentPageDescription;
  }

  const currentStep = currentModule;
  const totalSteps = 4; // Nombre total de modules

  const partieText = `Partie ${currentStep} sur ${totalSteps} – ${currentPageTitle}`;
  $('progressText').textContent = partieText;
  $('progressFill').style.width = totalSteps ? `${Math.round((currentStep / totalSteps) * 100)}%` : '0%';
  $('questionId').textContent = '';

  $('prevBtn').disabled = idx <= 0;
  $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
}

// Imports des modules
import { $, setStatus } from './modules/dom-utils.js';
import { loadSaved, resetAll } from './modules/storage.js';
import { allQuestions, visible, refreshVisible, loadAllQuestions } from './modules/question-loader.js';
import { updateProgress } from './modules/progress.js';
import { updateFormHeader } from './modules/form-header.js';
import { renderIntroductionPage, renderCelebrationPage, renderRecapPage, renderNormalPage } from './modules/page-renderer.js';
import { next as navNext, prev as navPrev } from './modules/navigation.js';

// Variables globales
let idx = 0;

// Fonction principale de rendu
function render() {
  refreshVisible();
  const q = visible[idx];
  
  // Mettre à jour le titre et la description
  updateFormHeader(q);
  
  if (!q) {
    const questionArea = $('questionArea');
    if (questionArea) {
      questionArea.innerHTML = '<h2>Formulaire terminé !</h2>';
    } else {
      console.error('L\'élément avec l\'ID "questionArea" n\'a pas été trouvé dans le DOM');
    }
    if ($('nextBtn')) $('nextBtn').style.display = 'none';
    if ($('prevBtn')) $('prevBtn').style.display = 'inline-block';
    updateProgress(idx, visible);
    return;
  }
  
  // Retirer d'abord les classes spéciales si elles existent
  const container = document.querySelector('.main .container');
  if (container) {
    container.classList.remove('is-introduction', 'is-celebration', 'is-recap');
  }
  
  // Vérifier le type de page et rendre en conséquence
  if (q.isIntroduction) {
    renderIntroductionPage(q, idx, render, visible, next);
    return;
  }

  if (q.isCelebration) {
    renderCelebrationPage(q, idx, render, visible, next, prev);
    return;
  }

  if (q.isRecap) {
    renderRecapPage(q, idx, render, visible, next, prev);
    return;
  }

  // Page normale
  renderNormalPage(q, idx, visible, next, prev);
}

// Fonctions de navigation
function next() {
  idx = navNext(idx, render, visible);
  render();
}

function prev() {
  idx = navPrev(idx, render, visible);
  render();
}

// Fonction de réinitialisation
function resetAllResponses() {
  if (resetAll()) {
    idx = 0;
    refreshVisible();
    render();
    setStatus('Réinitialisé.');
  }
}

// Fonction d'initialisation
async function boot() {
  try {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    if (qs && qs.includes('reset=1')) {
      localStorage.removeItem('cerfa_responses_v1');
    }
  } catch {
  }

  loadSaved();

  try {
    await loadAllQuestions();
    
    if (!Array.isArray(allQuestions)) {
      console.error('Format de questions invalide :', allQuestions);
      allQuestions = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    setStatus('Erreur de chargement des questions');
    console.error('Détails de l\'erreur:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }

  // Réinitialiser l'index à 0 pour commencer par la première question (l'introduction)
  idx = 0;
  refreshVisible();
  render();
  
  // Mettre à jour l'en-tête avec la première question
  if (visible.length > 0) {
    updateFormHeader(visible[0]);
  }
}

// Ajouter les écouteurs d'événements uniquement si les éléments existent
if ($('nextBtn')) $('nextBtn').addEventListener('click', next);
if ($('prevBtn')) $('prevBtn').addEventListener('click', prev);

// Exposer les fonctions nécessaires globalement si besoin
window.resetAll = resetAllResponses;
window.boot = boot;

// Démarrer l'application
boot();

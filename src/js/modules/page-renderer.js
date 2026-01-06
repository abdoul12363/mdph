/**
 * Page rendering for different page types (introduction, celebration, recap, normal)
 */

import { $ } from './dom-utils.js';
import { responses, saveLocal } from './storage.js';
import { renderInput } from './input-renderer.js';
import { generateIntelligentPhrases } from './phrase-generator.js';
import { updateProgress } from './progress.js';
import { updateFormHeader } from './form-header.js';
import { createConfetti, addConfettiStyles } from './confetti.js';

export function renderIntroductionPage(q, idx, render, visible, nextCallback) {
  console.log('Affichage de la page d\'introduction');
  console.log('Détails de la page d\'introduction:', {
    title: q.title,
    description: q.description,
    estimatedTime: q.estimatedTime
  });
  
  // Restaurer la barre de progression (au cas où elle aurait été masquée)
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = '';
  }
  
  // Restaurer l'en-tête du formulaire (au cas où il aurait été masqué)
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = '';
  }
  
  // Ajouter la classe is-introduction au conteneur principal
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-introduction');
  
  const introductionHTML = `
    <div class="introduction-page">
      <h2>${q.title || 'Bienvenue'}</h2>
      <div class="introduction-content">
        <p>${(q.description || '').replace(/\n/g, '</p><p>')}</p>
        ${q.estimatedTime ? `<div class="estimated-time">${q.estimatedTime}</div>` : ''}
      </div>
      <button id="startBtn" class="btn primary">${q.pageId === 'introduction' ? 'J\'ai compris' : 'Démarrer'}</button>
    </div>
  `;
  
  console.log('HTML de la page d\'introduction:', introductionHTML);
  
  $('questionArea').innerHTML = introductionHTML;
  
  // Cacher les boutons de navigation standard
  console.log('Masquage des boutons de navigation standard');
  if ($('prevBtn')) $('prevBtn').style.display = 'none';
  if ($('nextBtn')) $('nextBtn').style.display = 'none';
  
  // Ajouter le gestionnaire d'événement pour le bouton de démarrage
  console.log('Ajout du gestionnaire d\'événement pour le bouton de démarrage');
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    // Supprimer les anciens gestionnaires d'événements
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    
    newBtn.addEventListener('click', () => {
      console.log('Bouton "Démarrer" cliqué');
      if (nextCallback) {
        nextCallback();
      }
    });
  } else {
    console.error('Le bouton de démarrage n\'a pas été trouvé dans le DOM');
  }
  
  updateProgress(idx, visible);
}

export function renderCelebrationPage(q, idx, render, visible, nextCallback, prevCallback) {
  console.log('Affichage de la page de félicitations');
  console.log('Détails de la page félicitations:', {
    title: q.title,
    description: q.description,
    nextStepMessage: q.nextStepMessage
  });
  
  // Ajouter la classe is-celebration au conteneur principal
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-celebration');
  
  // Ajouter les styles CSS pour les confettis
  addConfettiStyles();
  
  const celebrationHTML = `
    <div class="celebration-page">
      <h2>${q.title || 'Bravo !'}</h2>
      <div class="celebration-content">
        <p>${q.description || ''}</p>
        <p>${q.nextStepMessage || ''}</p>
      </div>
    </div>
  `;
  
  console.log('HTML de la page félicitations:', celebrationHTML);
  
  $('questionArea').innerHTML = celebrationHTML;
  
  // Transformer les boutons de navigation pour les pages de félicitations
  console.log('Transformation des boutons de navigation pour les félicitations');
  
  // Modifier le bouton précédent pour "Retour"
  if ($('prevBtn')) {
    $('prevBtn').style.display = 'inline-block';
    $('prevBtn').innerHTML = 'Retour';
    $('prevBtn').className = 'btn';
    
    // Ajouter le gestionnaire d'événement pour le bouton Retour
    const newPrevBtn = $('prevBtn').cloneNode(true);
    $('prevBtn').parentNode.replaceChild(newPrevBtn, $('prevBtn'));
    if (prevCallback) {
      newPrevBtn.addEventListener('click', prevCallback);
    }
  }
  
  // Modifier le bouton suivant pour "Continuer" ou "Terminer"
  if ($('nextBtn')) {
    $('nextBtn').style.display = 'inline-block';
    $('nextBtn').innerHTML = q.continueButtonText || 'Continuer';
    $('nextBtn').className = 'btn btn-primary';
    
    // Ajouter le gestionnaire d'événement pour le bouton Continuer
    const newNextBtn = $('nextBtn').cloneNode(true);
    $('nextBtn').parentNode.replaceChild(newNextBtn, $('nextBtn'));
    if (nextCallback) {
      newNextBtn.addEventListener('click', nextCallback);
    }
  }
  
  // Masquer complètement la barre de progression sur les pages de félicitations
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
  
  // Masquer aussi l'en-tête du formulaire (titre et description)
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = 'none';
  }
  
  // Déclencher l'animation de confettis après un court délai
  setTimeout(() => {
    createConfetti();
  }, 300);
}

export function renderRecapPage(q, idx, render, visible, nextCallback, prevCallback) {
  console.log('Affichage de la page récapitulative');
  console.log('Détails de la page récap:', {
    title: q.title,
    description: q.description,
    targetQuestionIds: q.targetQuestionIds
  });
  
  // Restaurer la barre de progression (au cas où elle aurait été masquée)
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = '';
  }
  
  // Restaurer l'en-tête du formulaire (au cas où il aurait été masqué)
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = '';
  }
  
  // Ajouter la classe is-recap au conteneur principal
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-recap');
  
  let recapHTML = `
    <div class="recap-page">
      <h2>Tes demandes sont en lien avec ta situation</h2>
      <div class="recap-content">
        <p>Voici les éléments qui ressortent de ce que tu as indiqué jusqu'à présent:</p>
        <div class="recap-answers">
  `;
  
  // Afficher les réponses des questions ciblées avec des phrases intelligentes
  if (q.targetQuestionIds && Array.isArray(q.targetQuestionIds)) {
    const intelligentPhrases = generateIntelligentPhrases(q.targetQuestionIds, responses);
    intelligentPhrases.forEach(phrase => {
      recapHTML += `
        <div class="recap-item">
          <span class="recap-check">✅</span>
          <span class="recap-text">${phrase}</span>
        </div>
      `;
    });
  }
  
  recapHTML += `
        </div>
        <p class="recap-explanation">Ces éléments servent à justifier ta demande auprès de la MDPH.</p>
      </div>
    </div>
  `;
  
  console.log('HTML de la page récap:', recapHTML);
  
  // Modifier le bouton précédent pour "Modifier un élément"
  if ($('prevBtn')) {
    $('prevBtn').style.display = 'inline-block';
    $('prevBtn').innerHTML = '<span class="btn-icon">✏️</span> Modifier un élément';
    $('prevBtn').className = 'btn secondary';
    
    // Supprimer les anciens gestionnaires et ajouter le nouveau
    $('prevBtn').replaceWith($('prevBtn').cloneNode(true));
    $('prevBtn').addEventListener('click', () => {
      console.log('Action récap: modify');
      // Utiliser prevCallback pour retourner à la question précédente
      if (prevCallback) {
        prevCallback();
      }
    });
  }
  
  // Modifier le bouton suivant pour "Confirmer ces éléments"
  if ($('nextBtn')) {
    $('nextBtn').style.display = 'inline-block';
    $('nextBtn').innerHTML = '<span class="btn-icon">✓</span> Confirmer ces éléments';
    $('nextBtn').className = 'btn btn-primary';
    
    // Supprimer les anciens gestionnaires et ajouter le nouveau
    $('nextBtn').replaceWith($('nextBtn').cloneNode(true));
    $('nextBtn').addEventListener('click', () => {
      console.log('Action récap: confirm');
      if (nextCallback) {
        nextCallback();
      }
    });
  }
  
  $('questionArea').innerHTML = recapHTML;
  
  updateProgress(idx, visible);
}

export function renderNormalPage(q, idx, visible, nextCallback, prevCallback) {
  // Retirer d'abord la classe is-introduction si elle existe
  const container = document.querySelector('.main .container');
  if (container) container.classList.remove('is-introduction');
  
  // Restaurer la barre de progression (au cas où elle aurait été masquée sur une page de félicitations)
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = '';
  }
  
  // Restaurer l'en-tête du formulaire (au cas où il aurait été masqué)
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = '';
  }
  
  // Remettre les boutons visibles pour les pages normales
  document.body.classList.remove('hide-nav-buttons');
  
  // Restaurer les boutons de navigation normaux
  if ($('prevBtn')) {
    $('prevBtn').innerHTML = 'Précédent';
    $('prevBtn').className = 'btn';
    
    // Restaurer le gestionnaire d'événement
    const newPrevBtn = $('prevBtn').cloneNode(true);
    $('prevBtn').parentNode.replaceChild(newPrevBtn, $('prevBtn'));
    if (prevCallback) {
      newPrevBtn.addEventListener('click', prevCallback);
    }
  }
  if ($('nextBtn')) {
    $('nextBtn').innerHTML = 'Suivant';
    $('nextBtn').className = 'btn btn-primary';
    
    // Restaurer le gestionnaire d'événement
    const newNextBtn = $('nextBtn').cloneNode(true);
    $('nextBtn').parentNode.replaceChild(newNextBtn, $('nextBtn'));
    if (nextCallback) {
      newNextBtn.addEventListener('click', nextCallback);
    }
  }
  
  // Vérifier si cette question fait partie d'une section avec plusieurs questions
  const currentSection = q.sectionTitle;
  const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
  
  // Pour toutes les sections, on utilise le même affichage avec titre et description de section
  const sectionDescription = q.sectionDescription || '';
    
  let sectionHtml = `
    <div class="${q.className || ''} section-container">
      <h2 class="q-title">${currentSection}</h2>
      ${sectionDescription ? `<p class="section-description">${sectionDescription}</p>` : ''}
  `;
    
  // Ajouter chaque question de la section
  sectionQuestions.forEach(sectionQ => {
    const value = responses[sectionQ.id];
    sectionHtml += `
      <div class="question-item" data-question-id="${sectionQ.id}">
        ${renderInput(sectionQ, value)}
      </div>
    `;
  });
    
  sectionHtml += `</div>`;
  $('questionArea').innerHTML = sectionHtml;
    
  // Ajouter les événements pour tous les champs de la section
  sectionQuestions.forEach(sectionQ => {
    if (sectionQ.type === 'radio_with_text') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const radioInputs = questionDiv.querySelectorAll('input[name="opt"]');
        radioInputs.forEach(radio => {
          radio.addEventListener('change', function() {
            const textFields = questionDiv.querySelectorAll('.text-field-inline');
            textFields.forEach(field => field.style.display = 'none');
              
            const selectedOption = sectionQ.options.find(opt => opt.value === this.value);
            if (selectedOption && selectedOption.hasTextField) {
              const textField = this.parentElement.nextElementSibling;
              if (textField && textField.classList.contains('text-field-inline')) {
                textField.style.display = 'block';
              }
            }
          });
        });
      }
    }
    
    // Gestion des difficultés avec fréquences
    if (sectionQ.type === 'checkbox_multiple_with_frequency') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const checkboxes = questionDiv.querySelectorAll('input[name="multi_check"]');
        
        checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
            const difficulty = this.getAttribute('data-difficulty');
            const frequencyDiv = document.getElementById(`freq_${difficulty}`);
            const textDiv = document.getElementById(`text_${difficulty}`);
            
            if (frequencyDiv) {
              if (this.checked) {
                frequencyDiv.style.display = 'block';
                if (textDiv) textDiv.style.display = 'block';
              } else {
                frequencyDiv.style.display = 'none';
                if (textDiv) textDiv.style.display = 'none';
                
                // Réinitialiser les sélections de fréquence
                const radios = frequencyDiv.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                  radio.checked = false;
                  // Supprimer la valeur du stockage
                  const fieldId = radio.getAttribute('data-frequency-field');
                  if (fieldId && responses[fieldId]) {
                    delete responses[fieldId];
                  }
                });
                
                // Supprimer le texte si présent
                if (textDiv) {
                  const textInput = textDiv.querySelector('input[type="text"]');
                  if (textInput) {
                    textInput.value = '';
                    const fieldId = textInput.getAttribute('data-field');
                    if (fieldId && responses[fieldId]) {
                      delete responses[fieldId];
                    }
                  }
                }
              }
            }
          });
        });
        
        // Gestion des boutons radio de fréquence
        const frequencyRadios = questionDiv.querySelectorAll('input[type="radio"][data-frequency-field]');
        frequencyRadios.forEach(radio => {
          radio.addEventListener('change', function() {
            const fieldId = this.getAttribute('data-frequency-field');
            if (fieldId) {
              responses[fieldId] = this.value;
              saveLocal(true);
            }
          });
        });
        
        // Gestion des champs texte
        const textInputs = questionDiv.querySelectorAll('input[type="text"][data-field]');
        textInputs.forEach(input => {
          input.addEventListener('input', function() {
            const fieldId = this.getAttribute('data-field');
            if (fieldId) {
              responses[fieldId] = this.value;
              saveLocal(true);
            }
          });
        });
      }
    }
    
    // Gestion des checkbox_multiple avec champs texte
    if (sectionQ.type === 'checkbox_multiple') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const checkboxes = questionDiv.querySelectorAll('input[name="multi_check"][data-has-text="true"]');
        
        checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
            const value = this.value;
            const textDiv = document.getElementById(`text_${value}`);
            
            if (textDiv) {
              if (this.checked) {
                textDiv.style.display = 'block';
              } else {
                textDiv.style.display = 'none';
                // Vider le champ texte quand on décoche
                const textInput = textDiv.querySelector('input[type="text"]');
                if (textInput) {
                  textInput.value = '';
                  const fieldId = textInput.getAttribute('data-field');
                  if (fieldId && responses[fieldId]) {
                    delete responses[fieldId];
                    saveLocal(true);
                  }
                }
              }
            }
          });
        });
        
        // Gestion des champs texte pour checkbox_multiple
        const textInputs = questionDiv.querySelectorAll('.text-field-checkbox input[type="text"][data-field]');
        textInputs.forEach(input => {
          input.addEventListener('input', function() {
            const fieldId = this.getAttribute('data-field');
            if (fieldId) {
              responses[fieldId] = this.value;
              saveLocal(true);
            }
          });
        });
      }
    }
  });

  updateProgress(idx, visible);
}

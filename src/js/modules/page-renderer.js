/**
 * Page rendering for different page types (introduction, celebration, recap, normal)
 */

import { $ } from './dom-utils.js';
import { responses } from './storage.js';
import { renderInput } from './input-renderer.js';
import { generateIntelligentPhrases } from './phrase-generator.js';
import { updateProgress } from './progress.js';
import { updateFormHeader } from './form-header.js';

export function renderIntroductionPage(q, idx, render, visible, nextCallback) {
  console.log('Affichage de la page d\'introduction');
  console.log('Détails de la page d\'introduction:', {
    title: q.title,
    description: q.description,
    estimatedTime: q.estimatedTime
  });
  
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

export function renderCelebrationPage(q, idx, render, visible) {
  console.log('Affichage de la page de félicitations');
  console.log('Détails de la page félicitations:', {
    title: q.title,
    description: q.description,
    nextStepMessage: q.nextStepMessage
  });
  
  // Ajouter la classe is-celebration au conteneur principal
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-celebration');
  
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
  }
  
  // Modifier le bouton suivant pour "Continuer" ou "Terminer"
  if ($('nextBtn')) {
    $('nextBtn').style.display = 'inline-block';
    $('nextBtn').innerHTML = q.continueButtonText || 'Continuer';
    $('nextBtn').className = 'btn btn-primary';
  }
  
  updateProgress(idx, visible);
}

export function renderRecapPage(q, idx, render, visible, nextCallback) {
  console.log('Affichage de la page récapitulative');
  console.log('Détails de la page récap:', {
    title: q.title,
    description: q.description,
    targetQuestionIds: q.targetQuestionIds
  });
  
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
      // Retourner à la première question du module actuel
      const recapPageId = q.pageId; // ex: page1_recap
      const modulePageId = recapPageId.replace('_recap', ''); // ex: page1
      
      console.log('Navigation depuis récap:', recapPageId, 'vers module:', modulePageId);
      
      const moduleStartIdx = visible.findIndex(vq => 
        vq.pageId === modulePageId && 
        !vq.isIntroduction && 
        !vq.isRecap
      );
      
      if (moduleStartIdx !== -1) {
        console.log('Index trouvé pour modification:', moduleStartIdx);
        idx = moduleStartIdx;
        render();
      } else {
        console.error('Aucune question trouvée pour le module:', modulePageId);
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
  });

  updateProgress(idx, visible);
}

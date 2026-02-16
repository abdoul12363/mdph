/**
 * Centralise le rendu des différents écrans (intro / félicitations / récap / formulaire).
 * Important: les écrans intro gèrent eux-mêmes leurs inputs et le bouton (les nav boutons sont masqués).
 */

import { $ } from './dom-utils.js';
import { responses, saveLocal } from './storage.js';
import { renderInput } from './input-renderer.js';
import { updateProgress } from './progress.js';
import { createConfetti, addConfettiStyles } from './confetti.js';

export function renderIntroductionPage(q, idx, render, visible, nextCallback) {
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = '';
  }
  
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = '';
  }
  
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-introduction');
  
  const checkboxId = `intro_checkbox_${q.id}`;
  const savedCheckboxValue = responses[checkboxId] === true;
  const requiresCheckbox = q.requireCheckbox === true;
  const shouldDisableCheckbox = q.hasCheckbox && requiresCheckbox && !savedCheckboxValue;

  const shouldShowTitle = q.hideTitle !== true;
  const shouldShowDescription = q.hideDescription !== true && (!!q.description || !!q.estimatedTime);

  const radioKey = q.id || 'intro_radio';
  const selectedRadioValue = responses[radioKey];
  const selectedRadioOption = Array.isArray(q.options)
    ? q.options.find(opt => opt && opt.value === selectedRadioValue)
    : null;
  const followUp = (selectedRadioOption && selectedRadioOption.followUp ? selectedRadioOption.followUp : null);
  const followUpKey = followUp && followUp.id ? followUp.id : null;
  const followUpValue = followUpKey ? responses[followUpKey] : undefined;

  const shouldDisableRadio = (q.type === 'radio' && q.obligatoire === true && !selectedRadioValue)
    || (followUp && followUp.obligatoire === true && !followUpValue);
  const shouldDisableStart = shouldDisableCheckbox || shouldDisableRadio;

  let radioOptions = '';
  if (q.type === 'radio' && q.options) {
    radioOptions = `
      <div class="field-container intro-radio-options">
        <div class="choice-grid">
          ${q.options.map(option => `
            <label class="choice">
              <input type="radio" 
                     name="${radioKey}" 
                     value="${option.value}" 
                     ${responses[radioKey] === option.value ? 'checked' : ''}>
              <span>${option.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    if (followUp && followUpKey && followUp.type === 'text') {
      const savedText = typeof responses[followUpKey] === 'string' ? responses[followUpKey] : '';
      radioOptions += `
        <div class="field-container intro-followup">
          ${followUp.prompt ? `
          <div class="introduction-content">
            <p>${followUp.prompt}</p>
          </div>
          ` : ''}
          <input type="text" data-intro-followup="text" id="intro_text_${followUpKey}" name="${followUpKey}" value="${savedText}" ${followUp.placeholder ? `placeholder="${followUp.placeholder}"` : ''} />
        </div>
      `;
    } else if (followUp && followUpKey && Array.isArray(followUp.options)) {
      radioOptions += `
        <div class="field-container intro-followup">
          ${followUp.prompt ? `
          <div class="introduction-content">
            <p>${followUp.prompt}</p>
          </div>
          ` : ''}
          <div class="choice-grid">
            ${followUp.options.map(option => `
              <label class="choice">
                <input type="radio"
                       name="${followUpKey}"
                       value="${option.value}"
                       ${responses[followUpKey] === option.value ? 'checked' : ''}>
                <span>${option.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  const introductionHTML = `
    <div class="introduction-page${q.type === 'radio' ? ' intro-radio' : ''}">
      ${shouldShowTitle ? `<h2>${q.title || 'Bienvenue'}</h2>` : ''}
      ${shouldShowDescription ? `
      <div class="introduction-content">
        <p>${(q.description || '').replace(/\n/g, '</p><p>')}</p>
        ${q.estimatedTime ? `<div class="estimated-time">${q.estimatedTime}</div>` : ''}
      </div>
      ` : ''}
      ${q.type === 'radio' ? radioOptions : ''}
      ${q.hasCheckbox ? `
        <div class="field-container">
          <label class="choice">
            <input type="checkbox" id="${checkboxId}" ${savedCheckboxValue ? 'checked' : ''} />
            <span>${q.checkboxLabel || ''}</span>
          </label>
        </div>
      ` : ''}
      <button id="startBtn" class="btn btn-primary" ${shouldDisableStart ? 'disabled' : ''}>${q.buttonText || (q.isIntroduction ? 'J\'ai compris' : 'Démarrer')}</button>
    </div>
  `;
  
  $('questionArea').innerHTML = introductionHTML;

  // UX: le follow-up n'apparaît qu'après interaction utilisateur (évite un affichage dû à une valeur persistée).
  if (q.type === 'radio') {
    const selectedEl = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
    const followUps = document.querySelectorAll('.introduction-page .intro-followup');
    const touchedKey = `intro_touched_${radioKey}`;
    const hasTouched = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(touchedKey) === '1';

    followUps.forEach(el => {
      el.style.display = 'none';
    });

    // N'afficher qu'après interaction utilisateur (évite un affichage permanent via une valeur persistée)
    if (selectedEl && hasTouched) {
      followUps.forEach(el => {
        el.style.display = 'block';
      });
    }
  }
  
  if ($('prevBtn')) $('prevBtn').style.display = 'none';
  if ($('nextBtn')) $('nextBtn').style.display = 'none';
  
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    // Remplacement par clone: évite l'accumulation d'event listeners sur re-render.
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    
    if (q.type === 'radio') {
      const radioInputs = document.querySelectorAll('.introduction-page input[type="radio"]');
      radioInputs.forEach(radio => {
        radio.addEventListener('change', () => {
          try {
            const touchedKey = `intro_touched_${radioKey}`;
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(touchedKey, '1');
            }
          } catch (_) {
          }
          responses[radio.name] = radio.value;
          saveLocal(true);
          render();
        });
      });

      const followUpTextInputs = document.querySelectorAll('.introduction-page input[data-intro-followup="text"]');
      followUpTextInputs.forEach(input => {
        input.addEventListener('input', () => {
          responses[input.name] = String(input.value || '');
          saveLocal(true);
        });
      });
    } else if (q.hasCheckbox) {
      const checkboxEl = document.getElementById(checkboxId);
      if (checkboxEl) {
        checkboxEl.addEventListener('change', () => {
          responses[checkboxId] = checkboxEl.checked;
          saveLocal(true);
          if (requiresCheckbox) {
            newBtn.disabled = !checkboxEl.checked;
          }
        });
      }
    }

    newBtn.addEventListener('click', () => {
      try {
        if (q && q.type === 'radio') {
          const checked = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
          if (checked && checked.value !== undefined) {
            responses[radioKey] = checked.value;
          }

          if (followUp && followUpKey && followUp.type === 'text') {
            const followUpEl = document.getElementById(`intro_text_${followUpKey}`);
            if (followUpEl) {
              responses[followUpKey] = String(followUpEl.value || '');
            }
          } else if (followUp && followUpKey && Array.isArray(followUp.options)) {
            const checkedFollowUp = document.querySelector(`.introduction-page input[type="radio"][name="${followUpKey}"]:checked`);
            if (checkedFollowUp && checkedFollowUp.value !== undefined) {
              responses[followUpKey] = checkedFollowUp.value;
            }
          }

          saveLocal(true);
        }

        if (q && q.hasCheckbox) {
          const checkboxEl = document.getElementById(checkboxId);
          if (checkboxEl) {
            responses[checkboxId] = checkboxEl.checked;
            saveLocal(true);
          }
        }
      } catch (e) {
      }

      // Si l'utilisateur a sélectionné "Décision MDPH contestée", rediriger vers le parcours recours
      if (q && q.id === 'type_demande' && responses.type_demande === 'decision_contestee') {
        window.location.href = '/recours-mdph';
        return;
      }

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
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-celebration');
  
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
  
  $('questionArea').innerHTML = celebrationHTML;

  if ($('prevBtn')) {
    $('prevBtn').style.display = 'inline-block';
    $('prevBtn').innerHTML = 'Retour';
    $('prevBtn').className = 'btn';
    
    const newPrevBtn = $('prevBtn').cloneNode(true);
    $('prevBtn').parentNode.replaceChild(newPrevBtn, $('prevBtn'));
    if (prevCallback) {
      newPrevBtn.addEventListener('click', prevCallback);
    }
  }
  
  if ($('nextBtn')) {
    $('nextBtn').style.display = 'inline-block';
    $('nextBtn').innerHTML = q.continueButtonText || 'Continuer';
    $('nextBtn').className = 'btn btn-primary';
    
    const newNextBtn = $('nextBtn').cloneNode(true);
    $('nextBtn').parentNode.replaceChild(newNextBtn, $('nextBtn'));
    if (nextCallback) {
      newNextBtn.addEventListener('click', nextCallback);
    }
  }
  
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
  
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = 'none';
  }
  
  setTimeout(() => {
    createConfetti();
  }, 300);
}

export function renderRecapPage(q, idx, render, visible, nextCallback, prevCallback) {
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
  
  const formHeader = document.querySelector('.form-header');
  const formTitle = document.getElementById('formTitle');
  const formDescription = document.getElementById('formDescription');
  
  if (formHeader && formTitle && formDescription) {
    formHeader.style.display = 'none';
    formTitle.textContent = '';
    formDescription.textContent = '';
  }
  
  const container = document.querySelector('.main .container');
  if (container) container.classList.add('is-recap');

  const toParagraphsHtml = (text) => {
    const safeText = String(text || '').replace(/en toute\s*\n\s*tranquillité\./g, 'en toute tranquillité.');
    return safeText
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<p>${line}</p>`)
      .join('');
  };

  const hasDescription2 = typeof q.description2 === 'string' && q.description2.trim() !== '';
  const leadHtml = hasDescription2 ? toParagraphsHtml(q.description) : '';
  const descriptionHtml = hasDescription2 ? toParagraphsHtml(q.description2) : toParagraphsHtml(q.description);

  const recapHTML = `
    <div class="recap-page${hasDescription2 ? ' has-recap-lead' : ''}">
      <h1>${q.title}</h1>
      <div class="recap-content">
        ${hasDescription2 ? `
          <div class="recap-lead">
            ${leadHtml}
          </div>
        ` : ''}
        <div class="recap-description">
          ${descriptionHtml}
        </div>
      </div>
    </div>
  `;
  
  if ($('prevBtn')) {
    $('prevBtn').style.display = 'inline-block';
    $('prevBtn').innerHTML = '✏️ Modifier mes réponses';
    $('prevBtn').className = 'btn secondary';
    
    $('prevBtn').replaceWith($('prevBtn').cloneNode(true));
    $('prevBtn').addEventListener('click', () => {
      // Utiliser prevCallback pour retourner à la question précédente
      if (prevCallback) {
        prevCallback();
      }
    });
  }
  
  if ($('nextBtn')) {
    $('nextBtn').style.display = 'inline-block';
    $('nextBtn').innerHTML = 'Continuer';
    $('nextBtn').className = 'btn btn-primary';
    
    $('nextBtn').replaceWith($('nextBtn').cloneNode(true));
    $('nextBtn').addEventListener('click', () => {
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

  let __nextBtnEl = null;

  const selectionLimitRules = {
    situation_generale: {
      max: 2,
      message: 'Choisissez 1 ou 2 situations maximum.'
    },
    difficultes_quotidiennes: {
      max: 3,
      message: 'Essayez de garder uniquement les 3 difficultés les plus importantes.'
    },
    difficultes_travail: {
      max: 2,
      message: 'Choisissez jusqu’à 2 difficultés principales.'
    },
    consequences_difficultes: {
      max: 2,
      message: 'Indiquez uniquement les 2 conséquences les plus marquantes.'
    },
    consequences_travail: {
      max: 2,
      message: 'Indiquez uniquement les 2 conséquences les plus marquantes.'
    },
    type_demande: {
      max: 3,
      message: 'Pour plus de clarté, choisissez jusqu’à 3 aides utiles.'
    },
    priorites_actuelles: {
      max: 4,
      message: 'Concentrez-vous sur 4 priorités maximum.'
    }
  };

  const getOrCreateGlobalLimitBox = () => {
    const root = $('questionArea');
    if (!root) return null;
    const existing = root.querySelector('.selection-limit-box');
    if (existing) return existing;

    const box = document.createElement('div');
    box.className = 'selection-limit-box';
    box.style.display = 'none';
    root.appendChild(box);
    return box;
  };

  const updateSelectionLimitUI = () => {
    const box = getOrCreateGlobalLimitBox();
    if (!box) return;

    const violations = [];
    try {
      const currentSection = q.sectionTitle;
      const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
      sectionQuestions.forEach(qi => {
        const rule = selectionLimitRules[qi.id];
        if (!rule) return;
        const div = document.querySelector(`[data-question-id="${qi.id}"]`);
        if (!div) return;
        if (isSelectionOverLimit(div, qi.id)) {
          violations.push(rule.message);
        }
      });
    } catch {
    }

    if (violations.length) {
      box.innerHTML = violations.map(msg => `<div class="selection-limit-message">${msg}</div>`).join('');
      box.style.display = 'block';
    } else {
      box.innerHTML = '';
      box.style.display = 'none';
    }
  };

  const isSelectionOverLimit = (questionDiv, questionId) => {
    const rule = selectionLimitRules[questionId];
    if (!rule || !questionDiv) return false;
    const checked = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
    const count = checked ? checked.length : 0;
    return count > rule.max;
  };
  
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

    __nextBtnEl = newNextBtn;
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

  // Zone unique d'erreurs en bas du formulaire (emplacement constant)
  getOrCreateGlobalLimitBox();
    
  // Ajouter les événements pour tous les champs de la section
  sectionQuestions.forEach(sectionQ => {
    const updateNextButtonDisabledState = () => {
      try {
        if (typeof __nextBtnEl === 'undefined' || !__nextBtnEl) return;
        const hasViolation = sectionQuestions.some(qi => {
          const rule = selectionLimitRules[qi.id];
          if (!rule) return false;
          const div = document.querySelector(`[data-question-id="${qi.id}"]`);
          return isSelectionOverLimit(div, qi.id);
        });
        __nextBtnEl.disabled = hasViolation;
      } catch {
      }
    };

    // Sauvegarde live pour les champs texte (utile quand plusieurs questions sont affichées sur une même page)
    if (sectionQ.type === 'text' || sectionQ.type === 'email' || sectionQ.type === 'texte_long' || sectionQ.type === 'textarea') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const input = questionDiv.querySelector('#answer');
        if (input) {
          input.addEventListener('input', function () {
            responses[sectionQ.id] = String(this.value ?? '');
            saveLocal(true);
          });
        }
      }
    }

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

    if (sectionQ.type === 'radio') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const radioInputs = questionDiv.querySelectorAll(`input[type="radio"][name="${sectionQ.id}"]`);
        const textInputs = questionDiv.querySelectorAll('.text-field-inline input[type="text"][data-field]');

        const syncRadioTextFields = () => {
          const checked = questionDiv.querySelector(`input[type="radio"][name="${sectionQ.id}"]:checked`);
          const selectedValue = checked ? String(checked.value) : '';

          const wrappers = questionDiv.querySelectorAll('.text-field-inline');
          wrappers.forEach(wrapper => {
            const forValue = wrapper.getAttribute('data-text-for') || '';
            const shouldShow = selectedValue && String(forValue) === String(selectedValue);
            wrapper.style.display = shouldShow ? 'block' : 'none';

            if (!shouldShow) {
              const input = wrapper.querySelector('input[type="text"][data-field]');
              if (input) {
                const fieldId = input.getAttribute('data-field');
                input.value = '';
                if (fieldId && responses[fieldId] !== undefined) {
                  delete responses[fieldId];
                }
              }
            }
          });
          
          // Gérer l'affichage/masquage des sous-choix pour radio
          const subOptionsContainers = questionDiv.querySelectorAll('.sub-options-container');
          subOptionsContainers.forEach(container => {
            const containerId = container.getAttribute('id');
            if (containerId && containerId.startsWith('suboptions_')) {
              const optValue = containerId.replace('suboptions_', '');
              const shouldShow = selectedValue && String(optValue) === String(selectedValue);
              container.style.display = shouldShow ? 'block' : 'none';
              
              if (!shouldShow) {
                // Décocher tous les sous-choix
                const subChecks = container.querySelectorAll('input[name="sub_check"]');
                subChecks.forEach(subCb => {
                  subCb.checked = false;
                });
                // Supprimer les sous-choix du storage
                const subOptionsFieldId = container.querySelector('input[name="sub_check"]')?.getAttribute('data-suboptions-field');
                if (subOptionsFieldId && responses[subOptionsFieldId]) {
                  delete responses[subOptionsFieldId];
                }
              }
            }
          });
          
          saveLocal(true);
        };

        radioInputs.forEach(radio => {
          radio.addEventListener('change', syncRadioTextFields);
        });

        textInputs.forEach(input => {
          input.addEventListener('input', function() {
            const fieldId = this.getAttribute('data-field');
            if (fieldId) {
              responses[fieldId] = String(this.value || '');
              saveLocal(true);
            }
          });
        });
        
        // Gestion des sous-choix pour radio
        const subCheckboxes = questionDiv.querySelectorAll('input[name="sub_check"]');
        subCheckboxes.forEach(subCb => {
          subCb.addEventListener('change', function() {
            const subOptionsFieldId = this.getAttribute('data-suboptions-field');
            if (!subOptionsFieldId) return;
            
            const parent = this.getAttribute('data-parent');
            const container = document.getElementById(`suboptions_${parent}`);
            if (!container) return;
            
            const checkedSubs = container.querySelectorAll('input[name="sub_check"]:checked');
            const selectedValues = Array.from(checkedSubs).map(cb => cb.value);
            
            if (selectedValues.length > 0) {
              responses[subOptionsFieldId] = selectedValues;
            } else {
              delete responses[subOptionsFieldId];
            }
            saveLocal(true);
          });
        });

        syncRadioTextFields();
      }
    }
    
    // Gestion des difficultés avec fréquences
    if (sectionQ.type === 'checkbox_multiple_with_frequency') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const checkboxes = questionDiv.querySelectorAll('input[name="multi_check"]');
        
        checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
            const rule = selectionLimitRules[sectionQ.id];
            if (rule && this.checked) {
              const checkedNow = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
              if (checkedNow && checkedNow.length > rule.max) {
                // Rejeter la sélection en trop
                if (this.dataset && this.dataset.reverting === '1') {
                  delete this.dataset.reverting;
                } else {
                  this.dataset.reverting = '1';
                  this.checked = false;
                  try {
                    this.dispatchEvent(new Event('change', { bubbles: true }));
                  } catch {
                  }
                  return;
                }
              }
            }

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

          checkbox.addEventListener('change', function() {
            updateSelectionLimitUI();
            updateNextButtonDisabledState();
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

        updateSelectionLimitUI();
        updateNextButtonDisabledState();
      }
    }
    
    // Gestion des checkbox_multiple avec champs texte
    if (sectionQ.type === 'checkbox_multiple') {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        const checkboxes = questionDiv.querySelectorAll('input[name="multi_check"][data-has-text="true"]');
        
        const allCheckboxes = questionDiv.querySelectorAll('input[name="multi_check"]');
        const max1AutoDeselect = selectionLimitRules[sectionQ.id] && selectionLimitRules[sectionQ.id].max === 1;

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

        if (allCheckboxes && allCheckboxes.length) {
          allCheckboxes.forEach(cb => {
            cb.addEventListener('change', function(e) {
              const rule = selectionLimitRules[sectionQ.id];

              // Limite > 1 : rejeter la sélection si on dépasse
              if (rule && rule.max > 1 && cb.checked) {
                const checkedNow = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
                if (checkedNow && checkedNow.length > rule.max) {
                  if (cb.dataset && cb.dataset.reverting === '1') {
                    delete cb.dataset.reverting;
                  } else {
                    cb.dataset.reverting = '1';
                    cb.checked = false;
                    try {
                      cb.dispatchEvent(new Event('change', { bubbles: true }));
                    } catch {
                    }
                    return;
                  }
                }
              }

              if (max1AutoDeselect && cb.checked) {
                const checkedNow = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
                if (checkedNow && checkedNow.length > 1) {
                  checkedNow.forEach(other => {
                    if (other !== cb && other.checked) {
                      other.checked = false;
                      try {
                        other.dispatchEvent(new Event('change', { bubbles: true }));
                      } catch {
                      }
                    }
                  });
                }
              }

              // Gérer l'affichage/masquage des sous-choix
              const value = cb.value;
              const subOptionsDiv = document.getElementById(`suboptions_${value}`);
              if (subOptionsDiv) {
                if (cb.checked) {
                  subOptionsDiv.removeAttribute('hidden');
                } else {
                  subOptionsDiv.setAttribute('hidden', '');
                  // Décocher tous les sous-choix
                  const subChecks = subOptionsDiv.querySelectorAll('input[name="sub_check"]');
                  subChecks.forEach(subCb => {
                    subCb.checked = false;
                  });
                  // Supprimer les sous-choix du storage
                  const subOptionsFieldId = subOptionsDiv.querySelector('input[name="sub_check"]')?.getAttribute('data-suboptions-field');
                  if (subOptionsFieldId && responses[subOptionsFieldId]) {
                    delete responses[subOptionsFieldId];
                    saveLocal(true);
                  }
                }
              }

              updateSelectionLimitUI();
              updateNextButtonDisabledState();
            });
          });
        }
        
        // Gestion des sous-choix (sub-options)
        const subCheckboxes = questionDiv.querySelectorAll('input[name="sub_check"]');
        subCheckboxes.forEach(subCb => {
          subCb.addEventListener('change', function() {
            const subOptionsFieldId = this.getAttribute('data-suboptions-field');
            if (!subOptionsFieldId) return;
            
            const parent = this.getAttribute('data-parent');
            const container = document.getElementById(`suboptions_${parent}`);
            if (!container) return;
            
            const checkedSubs = container.querySelectorAll('input[name="sub_check"]:checked');
            const selectedValues = Array.from(checkedSubs).map(cb => cb.value);
            
            if (selectedValues.length > 0) {
              responses[subOptionsFieldId] = selectedValues;
            } else {
              delete responses[subOptionsFieldId];
            }
            saveLocal(true);
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

        updateSelectionLimitUI();
        updateNextButtonDisabledState();
      }
    }
  });

  // Init état du bouton Suivant après attachement des listeners
  try {
    if (typeof __nextBtnEl !== 'undefined' && __nextBtnEl) {
      const hasViolation = sectionQuestions.some(qi => {
        const rule = selectionLimitRules[qi.id];
        if (!rule) return false;
        const div = document.querySelector(`[data-question-id="${qi.id}"]`);
        return isSelectionOverLimit(div, qi.id);
      });
      __nextBtnEl.disabled = hasViolation;
    }
  } catch {
  }

  updateSelectionLimitUI();

  updateProgress(idx, visible);
}

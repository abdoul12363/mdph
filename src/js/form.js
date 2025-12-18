import { normalizeOuiNon } from '../utils/utils.js';

const storageKey = 'cerfa_responses_v1';

let allQuestions = [];
let visible = [];
let idx = 0;
let responses = {};
let inFlight = false;

function $(id) { return document.getElementById(id); }

function setStatus(msg) {
  const statusEl = $('status');
  if (statusEl) statusEl.textContent = msg || '';
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) responses = JSON.parse(raw);
  } catch (error) {
    console.error('Erreur lors du chargement des données sauvegardées :', error);
    responses = {};
  }
}

function saveLocal(silent = false) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(responses));
    if (!silent) setStatus('Sauvegardé localement.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde locale :', error);
    setStatus('Erreur lors de la sauvegarde');
  }
}

function resetAll() {
  if (!confirm('Réinitialiser toutes les réponses ?')) return;
  responses = {};
  saveLocal(true);
  idx = 0;
  refreshVisible();
  render();
  setStatus('Réinitialisé.');
}

function evaluateCondition(cond) {
  // support simple : q_x == 'oui'
  if (!cond) return true;
  const m = String(cond).match(/(q_[a-zA-Z0-9_]+)\s*==\s*['\"](.*?)['\"]/);
  if (!m) return true;
  const [, qid, expected] = m;
  const val = responses[qid];
  return String(val || '').trim().toLowerCase() === String(expected).trim().toLowerCase();
}

function refreshVisible() {
  visible = allQuestions.filter(q => {
    // Vérifier d'abord la condition de section
    if (q.sectionCondition) {
      const condition = q.sectionCondition;
      
      // Vérifier si c'est une comparaison avec des chaînes 'true'/'false'
      const stringMatch = condition.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
      if (stringMatch) {
        const [, fieldId, expectedValue] = stringMatch;
        const actualValue = String(responses[fieldId] || '');
        
        if (actualValue !== expectedValue) {
          return false; // Exclure cette question si la condition de section n'est pas remplie
        }
      }
    }
    
    // Ensuite vérifier la condition d'affichage de la question
    if (!q.condition_affichage) {
      return true;
    }
    
    const condition = q.condition_affichage;
    if (condition.includes('===')) {
      // Vérifier si c'est une comparaison avec des chaînes 'true'/'false'
      const stringMatch = condition.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
      if (stringMatch) {
        const [, field, expectedValue] = stringMatch;
        const fieldValue = String(responses[field] || '');
        return fieldValue === expectedValue;
      }
    }
    
    return true;
  });
  
  return visible;
}

async function reloadQuestionsWithConditions() {
  try {
    console.log('🔍 Chargement des questions...');
    const pagesResponse = await fetch('/data/form_pages.json');
    const pagesConfig = await pagesResponse.json();
    
    allQuestions = [];
    
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        console.log(`📄 Chargement de la page: ${pageConfig.title}`);
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();
        
        if (pageData?.sections) {
          for (const section of pageData.sections) {
            console.log(`  📂 Section: ${section.title} (${section.id})`);
            
            // Vérifier la condition de section
            let sectionVisible = true;
            if (section.condition_section) {
              const condition = section.condition_section;
              console.log(`  🔍 Condition de section: ${condition}`);
              
              // Vérifier si c'est une comparaison avec des chaînes 'true'/'false'
              const stringMatch = condition.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
              if (stringMatch) {
                const [, fieldId, expectedValue] = stringMatch;
                const actualValue = String(responses[fieldId] || '');
                console.log(`  🔍 Comparaison chaîne - Champ: ${fieldId}, Valeur actuelle: "${actualValue}", Attendu: "${expectedValue}"`);
                sectionVisible = actualValue === expectedValue;
              }
              console.log(`  ✅ Section visible: ${sectionVisible}`);
            }
            
            if (sectionVisible && section.questions) {
              console.log(`  ➕ Ajout de ${section.questions.length} questions de la section ${section.title}`);
              const questionsWithPage = section.questions.map(q => ({
                ...q,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title,
                sectionTitle: section.title
              }));
              allQuestions.push(...questionsWithPage);
            } else if (!sectionVisible) {
              console.log(`  ⏭️ Section masquée par condition: ${section.title}`);
            }
          }
        }
      } catch (pageError) {
        console.error(`Erreur lors du rechargement de ${pageConfig.title}:`, pageError);
      }
    }
  } catch (error) {
    console.error('Erreur lors du rechargement des questions :', error);
  }
}

function updateProgress() {
  const total = visible.length;
  
  // Calculer le numéro d'étape logique basé sur les sections
  const currentStep = getCurrentStepNumber();
  const totalSteps = getTotalSteps();
  
  $('progressText').textContent = `${currentStep} / ${totalSteps}`;
  $('progressFill').style.width = totalSteps ? `${Math.round((currentStep / totalSteps) * 100)}%` : '0%';
  $('questionId').textContent = visible[idx]?.id || '';

  $('prevBtn').disabled = idx <= 0;
  $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
}

function renderInput(q, value) {
  const type = q.type || q.type_champ;
  const description = q.description ? `<div class="field-description">${q.description}</div>` : '';
  
  if (type === 'texte_long' || type === 'textarea') {
    return `
      <div class="field-container">
        <textarea class="input" id="answer" placeholder="Ta réponse...">${value ? String(value) : ''}</textarea>
        ${description}
      </div>`;
  }

  if (type === 'date') {
    return `
      <div class="field-container">
        <input class="input" id="answer" type="date" value="${value ? String(value) : ''}" />
        ${description}
      </div>`;
  }

  if (type === 'checkbox') {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : false;
    const currentValue = value !== undefined ? value : defaultVal;
    const checked = currentValue ? 'checked' : '';
    const checkboxValue = q.id || 'checkbox_value';
    return `
      <div class="field-container">
        ${description}
        <label class="choice">
          ${q.label}
          <input type="checkbox" id="answer" value="${checkboxValue}" ${checked}/> 
        </label>
      </div>`;
  }

  if (type === 'checkbox_multiple' && Array.isArray(q.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    
    return `
      <div class="choice-grid" id="answer">
        ${q.options.map(opt => {
          const optValue = opt.value || opt;
          const optLabel = opt.label || opt;
          const checked = selectedValues.includes(optValue) ? 'checked' : '';
          return `<label class="choice"><input type="checkbox" name="multi_check" value="${optValue}" ${checked}/> ${optLabel}</label>`;
        }).join('')}
      </div>
    `;
  }

  if (type === 'radio' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    
    // Ne pas convertir les booléens en chaînes
    const v = currentValue;
    
    return `
      <div class="choice-grid" id="answer">
        ${q.options.map(opt => {
          const optValue = opt.value || opt;
          const optLabel = opt.label || opt;
          
          // Comparaison stricte pour les booléens, sinon comparaison de chaînes
          let isChecked;
          if (typeof v === 'boolean' && (optValue === true || optValue === false)) {
            isChecked = v === optValue;
          } else {
            isChecked = String(optValue) === String(v);
          }
          
          const checked = isChecked ? 'checked' : '';
          return `<label class="choice"><input type="radio" name="opt" value="${optValue}" ${checked}/> ${optLabel}</label>`;
        }).join('')}
      </div>
    `;
  }

  if (type === 'radio_with_text' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    const v = currentValue ? String(currentValue) : '';
    
    let html = '<div class="choice-grid" id="answer">';
    
    q.options.forEach(opt => {
      const optValue = opt.value || opt;
      const optLabel = opt.label || opt;
      const checked = optValue === v ? 'checked' : '';
      
      html += `<label class="choice"><input type="radio" name="opt" value="${optValue}" ${checked}/> ${optLabel}</label>`;
      
      // Ajouter le champ texte si cette option l'a
      if (opt.hasTextField) {
        const textFieldValue = responses[q.id + '_text'] || '';
        const textFieldVisible = optValue === v ? 'block' : 'none';
        html += `<div class="text-field-inline" style="display: ${textFieldVisible}; margin-left: 20px; margin-top: 5px;">
          <input type="text" name="opt_text" placeholder="${opt.textFieldLabel || 'Préciser...'}" value="${textFieldValue}" class="input" style="width: 200px;"/>
        </div>`;
      }
    });
    
    html += '</div>';
    return html;
  }

  if (type === 'oui_non') {
    const v = normalizeOuiNon(value);
    const checkedOui = v === 'oui' ? 'checked' : '';
    const checkedNon = v === 'non' ? 'checked' : '';
    return `
      <div class="choice-grid" id="answer">
        <label class="choice"><input type="radio" name="yn" value="oui" ${checkedOui}/> Oui</label>
        <label class="choice"><input type="radio" name="yn" value="non" ${checkedNon}/> Non</label>
      </div>
    `;
  }

  if (type === 'choix_multiple' && Array.isArray(q.valeurs_possibles)) {
    const v = value ? String(value) : '';
    return `
      <div class="choice-grid" id="answer">
        ${q.valeurs_possibles.map(opt => {
          const checked = opt === v ? 'checked' : '';
          return `<label class="choice"><input type="radio" name="opt" value="${opt}" ${checked}/> ${opt}</label>`;
        }).join('')}
      </div>
    `;
  }

  // défaut texte
  return `
    <div class="field-container">
      <input class="input" id="answer" type="text" placeholder="Ta réponse..." value="${value ? String(value) : ''}" />
      ${description ? `<div class="field-description">${description}</div>` : ''}
    </div>`;
}

function getAnswerFromDom(q) {
  const type = q.type || q.type_champ;
  
  if (type === 'checkbox') {
    const el = document.querySelector('#answer');
    return el ? el.checked : false;
  }
  
  if (type === 'checkbox_multiple') {
    const checkedBoxes = document.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }
  
  if (type === 'radio') {
    const el = document.querySelector('input[name="opt"]:checked');
    if (!el) return '';
    
    // Retourner toujours des chaînes de caractères pour les boutons radio
    return String(el.value);
  }
  
  if (type === 'radio_with_text') {
    const el = document.querySelector('input[name="opt"]:checked');
    const radioValue = el ? el.value : '';
    
    // Si l'option sélectionnée a un champ texte, récupérer aussi sa valeur
    const textEl = document.querySelector('input[name="opt_text"]');
    if (textEl && textEl.value.trim()) {
      // Sauvegarder aussi la valeur du champ texte séparément
      responses[q.id + '_text'] = textEl.value.trim();
    }
    
    return radioValue;
  }
  
  if (type === 'oui_non') {
    const el = document.querySelector('input[name="yn"]:checked');
    return el ? el.value : '';
  }

  if (type === 'choix_multiple') {
    const el = document.querySelector('input[name="opt"]:checked');
    return el ? el.value : '';
  }

  const el = $('answer');
  return el ? String(el.value || '').trim() : '';
}

function validateRequired(q, answer) {
  if (!q.obligatoire) return true;
  return answer && answer.trim().length > 0;
}

function render() {
  refreshVisible();
  const q = visible[idx];

  if (!q) {
    $('questionArea').innerHTML = `<p class="muted">Aucune question à afficher.</p>`;
    updateProgress();
    return;
  }

  // Vérifier si cette question fait partie d'une section avec plusieurs questions
  const currentSection = q.sectionTitle;
  const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
  
  if (sectionQuestions.length > 1 && (currentSection === "Type de demande" || 
      currentSection.includes("Parent") || 
      currentSection.includes("représentant légal"))) {
    // Afficher toutes les questions de la section ensemble sans titre de section
    let sectionHtml = '';
    
    sectionQuestions.forEach(sectionQ => {
      const value = responses[sectionQ.id];
      sectionHtml += `
        <div class="question-item" data-question-id="${sectionQ.id}" style="margin-bottom: 15px;">
          ${renderInput(sectionQ, value)}
        </div>
      `;
    });
    
    $('questionArea').innerHTML = sectionHtml;
    
    // Ajouter les événements pour tous les champs de la section
    sectionQuestions.forEach(sectionQ => {
      if (sectionQ.type === 'radio_with_text') {
        const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
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
    });
    
  } else {
    // Affichage normal pour une question seule
    const value = responses[q.id];

    $('questionArea').innerHTML = `
      <h2 class="q-title">${q.label || q.libelle_plateforme || 'Question sans titre'}</h2>
      ${renderInput(q, value)}
    `;

    // Ajouter les événements pour les champs radio_with_text
    if (q.type === 'radio_with_text') {
      const radioInputs = document.querySelectorAll('input[name="opt"]');
      radioInputs.forEach(radio => {
        radio.addEventListener('change', function() {
          const textFields = document.querySelectorAll('.text-field-inline');
          textFields.forEach(field => field.style.display = 'none');
          
          const selectedOption = q.options.find(opt => opt.value === this.value);
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

  updateProgress();
}

function next() {
  const q = visible[idx];
  if (!q) return;

  // Si on est dans une section avec plusieurs questions, récupérer toutes les réponses
  const currentSection = q.sectionTitle;
  const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
  
  if (sectionQuestions.length > 1 && (currentSection === "Type de demande" || 
      currentSection.includes("Parent") || 
      currentSection.includes("représentant légal"))) {
    // Sauvegarder toutes les réponses de la section
    sectionQuestions.forEach(sectionQ => {
      const questionDiv = document.querySelector(`[data-question-id="${sectionQ.id}"]`);
      if (questionDiv) {
        // Temporairement définir le contexte pour cette question
        const originalAnswer = document.querySelector('#answer');
        const sectionAnswer = questionDiv.querySelector('#answer, input[type="checkbox"]');
        
        if (sectionAnswer) {
          // Créer temporairement un élément avec l'ID answer pour getAnswerFromDom
          sectionAnswer.id = 'answer';
          const answer = getAnswerFromDom(sectionQ);
          responses[sectionQ.id] = answer;
          
          // Restaurer l'ID original
          if (originalAnswer && originalAnswer !== sectionAnswer) {
            sectionAnswer.removeAttribute('id');
            originalAnswer.id = 'answer';
          }
        }
      }
    });
    
    // Passer à la section suivante (sauter toutes les questions de cette section)
    const nextSectionIndex = visible.findIndex((q, i) => i > idx && q.sectionTitle !== currentSection);
    if (nextSectionIndex !== -1) {
      idx = nextSectionIndex;
    } else {
      idx = visible.length; // Fin du formulaire
    }
  } else {
    // Logique normale pour une question seule
    const answer = getAnswerFromDom(q);
    
    if (!validateRequired(q, answer)) {
      setStatus('Ce champ est obligatoire.');
      return;
    }

    // normalisations
    if (q.type_champ === 'oui_non') {
      responses[q.id] = normalizeOuiNon(answer);
    } else {
      responses[q.id] = answer;
    }

    idx++;
  }
  
  saveLocal(true);
  render();
  setStatus('');
}

function prev() {
  if (idx <= 0) return;
  
  const currentQ = visible[idx];
  if (!currentQ) {
    idx -= 1;
    render();
    return;
  }
  
  const currentSection = currentQ.sectionTitle;
  const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
  
  // Si on est dans une section groupée, revenir au début de la section précédente
  if (sectionQuestions.length > 1 && (currentSection === "Type de demande" || 
      currentSection.includes("Parent") || 
      currentSection.includes("représentant légal"))) {
    
    // Trouver l'index de la première question de cette section
    const currentSectionStartIdx = visible.findIndex(q => q.sectionTitle === currentSection);
    
    if (currentSectionStartIdx > 0) {
      // Trouver la section précédente
      const prevQ = visible[currentSectionStartIdx - 1];
      const prevSection = prevQ.sectionTitle;
      const prevSectionQuestions = visible.filter(question => question.sectionTitle === prevSection);
      
      // Si la section précédente est aussi groupée, aller à son début
      if (prevSectionQuestions.length > 1 && (prevSection === "Type de demande" || 
          prevSection.includes("Parent") || 
          prevSection.includes("représentant légal"))) {
        idx = visible.findIndex(q => q.sectionTitle === prevSection);
      } else {
        // Sinon, aller à la question précédente
        idx = currentSectionStartIdx - 1;
      }
    } else {
      idx = 0;
    }
  } else {
    // Navigation normale pour les questions individuelles
    idx -= 1;
  }
  
  render();
}

async function generatePdf() {
  if (inFlight) return;
  inFlight = true;
  setStatus('Génération du PDF en cours...');

  try {
    const res = await fetch('/api/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responses),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'cerfa_rempli.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setStatus('PDF généré et téléchargé.');
  } catch (e) {
    setStatus(`Erreur: ${e.message}`);
  } finally {
    inFlight = false;
  }
}

async function boot() {
  loadSaved();

  try {
    // Charger la configuration des pages
    const pagesResponse = await fetch('/data/form_pages.json');
    const pagesConfig = await pagesResponse.json();
    
    allQuestions = [];
    
    // Charger toutes les pages dans l'ordre
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();
        
        console.log(`📄 Chargement de ${pageConfig.title}...`);
        
        if (pageData?.sections) {
          for (const section of pageData.sections) {
            // TOUJOURS charger les sections, les conditions seront évaluées dynamiquement
            if (section.questions) {
              // Ajouter l'info de la page à chaque question
              const questionsWithPage = section.questions.map(q => ({
                ...q,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title,
                sectionTitle: section.title,
                sectionCondition: section.condition_section
              }));
              allQuestions.push(...questionsWithPage);
            }
          }
        }
      } catch (pageError) {
        console.error(`Erreur lors du chargement de ${pageConfig.title}:`, pageError);
      }
    }
    
    console.log(`✅ ${allQuestions.length} questions chargées depuis ${pagesConfig.pages.length} pages`);
    
    if (!Array.isArray(allQuestions)) {
      console.error('Format de questions invalide :', allQuestions);
      allQuestions = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    allQuestions = [];
  }

  refreshVisible();
  render();
}

$('nextBtn').addEventListener('click', next);
$('prevBtn').addEventListener('click', prev);
$('generateBtn').addEventListener('click', generatePdf);

// Fonctions utilitaires pour le calcul des étapes
function getCurrentStepNumber() {
  if (!visible[idx]) return 0;
  
  const currentQ = visible[idx];
  const currentSection = currentQ.sectionTitle;
  
  // Compter les sections uniques jusqu'à la section actuelle
  const sectionsBeforeCurrent = new Set();
  
  for (let i = 0; i < idx; i++) {
    const q = visible[i];
    if (q.sectionTitle !== currentSection) {
      sectionsBeforeCurrent.add(q.sectionTitle);
    }
  }
  
  return sectionsBeforeCurrent.size + 1;
}

function getTotalSteps() {
  const uniqueSections = new Set(visible.map(q => q.sectionTitle));
  return uniqueSections.size;
}

boot();
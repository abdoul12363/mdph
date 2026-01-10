/**
 * Input rendering for different question types
 */

import { normalizeOuiNon } from '../../utils/utils.js';
import { responses } from './storage.js';

export function renderInput(q, value) {
  const type = q.type || q.type_champ;
  const description = q.description ? `<div class="field-description">${q.description}</div>` : '';
  
  if (type === 'texte_long' || type === 'textarea') {
    return `
      <div class="field-container">
        ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
        ${description}
        <textarea class="input" id="answer" placeholder="${q.placeholder || 'Votre réponse...'}">${value ? String(value) : ''}</textarea>
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

  if (type === 'checkbox_multiple_with_frequency' && Array.isArray(q.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    const frequencyOptions = q.frequencyOptions || [
      {"value": "quotidien", "label": "Tous les jours"},
      {"value": "fluctuant", "label": "Fluctuant"},
      {"value": "hebdomadaire", "label": "Plusieurs fois par semaine"}
    ];
    
    return `
      <div class="field-container">
        <div class="question-text">
          ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
          ${description}
        </div>
        <div class="difficultes-with-frequency" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const checked = selectedValues.includes(optValue) ? 'checked' : '';
            const frequencyFieldId = opt.frequencyField || `freq_${optValue}`;
            const currentFrequency = responses[frequencyFieldId] || '';
            
            return `
              <div class="difficulte-item" data-value="${optValue}">
                <label class="choice">
                  <input type="checkbox" name="multi_check" value="${optValue}" ${checked} 
                         data-difficulty="${optValue}" />
                  <span>${optLabel}</span>
                </label>
                
                ${opt.hasTextField ? `
                  <div class="text-field" id="text_${optValue}" ${checked ? '' : 'hidden'}>
                    <input type="text" placeholder="${opt.textFieldPlaceholder || 'Précisez...'}" 
                           value="${responses[opt.pdfField + '_text'] || ''}" 
                           data-field="${opt.pdfField}_text"
                           class="text-input" />
                  </div>
                ` : ''}
                
                <div class="frequency-options" id="freq_${optValue}" ${checked ? '' : 'hidden'}>
                  <div class="frequency-label">→ Fréquence :</div>
                  <div class="frequency-choices">
                    ${frequencyOptions.map(freqOpt => `
                      <label class="frequency-choice">
                        <input type="radio" name="freq_${optValue}" value="${freqOpt.value}" 
                               ${currentFrequency === freqOpt.value ? 'checked' : ''}
                               data-frequency-field="${frequencyFieldId}" />
                        <span>${freqOpt.label}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
`;
  }

  if (type === 'checkbox_multiple' && Array.isArray(q.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    
    // Style spécifique pour la section Difficultés quotidiennes
    const isDifficultesQuotidiennes = q.id === 'difficultes_quotidiennes';
    const containerClass = isDifficultesQuotidiennes ? 'difficultes-container' : 'choice-grid';
    const choiceClass = isDifficultesQuotidiennes ? 'difficulte-choice' : 'choice';
    
    // Ne pas afficher la question pour Difficultés quotidiennes car elle est déjà dans le titre de section
    const showQuestion = !isDifficultesQuotidiennes && q.question;
    
    return `
      <div class="field-container">
        <div class="question-text">
          ${showQuestion ? `<div class="question-title">${q.question}</div>` : ''}
          ${description}
        </div>
        <div class="${containerClass}" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const checked = selectedValues.includes(optValue) ? 'checked' : '';
            
            let optionHtml = `
              <div class="checkbox-option-container" data-value="${optValue}">
                <label class="choice">
                  <input type="checkbox" name="multi_check" value="${optValue}" ${checked} 
                         data-has-text="${opt.hasTextField ? 'true' : 'false'}" />
                  ${optLabel}
                </label>`;
            
            // Ajouter le champ texte si cette option l'a
            if (opt.hasTextField) {
              const textFieldId = opt.pdfField ? `${opt.pdfField}_text` : `${optValue}_text`;
              const textFieldValue = responses[textFieldId] || '';
              optionHtml += `
                <div class="text-field-checkbox" id="text_${optValue}" ${checked ? '' : 'hidden'}>
                  <input type="text" 
                         placeholder="${opt.textFieldPlaceholder || 'Précisez...'}" 
                         value="${textFieldValue}" 
                         data-field="${textFieldId}"
                         class="text-input" />
                </div>`;
            }
            
            optionHtml += `</div>`;
            return optionHtml;
          }).join('')}
        </div>
      </div>`;
  }

  if (type === 'radio' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    
    // Ne pas convertir les booléens en chaînes
    const v = currentValue;
    
    // Récupérer la description si elle existe
    const description = q.description ? `
      <div class="field-description">
        ${q.description.replace(/\n/g, '<br>')}
      </div>` : '';
    
    return `
      <div class="field-container">
        ${description}
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
            return `
              <label class="choice">
                <input type="radio" name="opt" value="${optValue}" ${checked}/>
                <span>${optLabel}</span>
              </label>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (type === 'radio_with_text' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    const v = currentValue ? String(currentValue) : '';
    
    let html = '<div>';
    
    html += q.description ? `<div class="field-description">${q.description}</div>` : '';
    
    html += '<div class="choice-grid" id="answer">';
    
    q.options.forEach(opt => {
      const optValue = opt.value || opt;
      const optLabel = opt.label || opt;
      const checked = optValue === v ? 'checked' : '';
      
      html += `<label class="choice"><input type="radio" name="opt" value="${optValue}" ${checked}/> ${optLabel}</label>`;
      
      // Ajouter le champ texte si cette option l'a
      if (opt.hasTextField) {
        const textFieldValue = responses[q.id + '_text'] || '';
        const textFieldVisible = optValue === v ? 'block' : 'none';
        html += `<div class="text-field-inline" ${textFieldVisible === 'block' ? '' : 'hidden'}>
          <input type="text" name="opt_text" placeholder="${opt.textFieldLabel || 'Préciser...'}" value="${textFieldValue}" class="text-input"/>
        </div>`;
      }
    });
    
    html += '</div>';
    html += '</div>';
    return html;
  }

  if (type === 'oui_non') {
    const v = normalizeOuiNon(value);
    const checkedOui = v === 'oui' ? 'checked' : '';
    const checkedNon = v === 'non' ? 'checked' : '';
    
    return `
      <div>
        ${q.description ? `<div class="field-description">${q.description}</div>` : ''}
        <div class="choice-grid" id="answer">
          <label class="choice"><input type="radio" name="yn" value="oui" ${checkedOui}/> Oui</label>
          <label class="choice"><input type="radio" name="yn" value="non" ${checkedNon}/> Non</label>
        </div>
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

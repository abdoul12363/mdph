/**
 * Question loading and filtering
 */

import { responses } from './storage.js';

export let allQuestions = [];
export let visible = [];

export function refreshVisible() {
  visible = allQuestions.filter(q => {
    // Toujours afficher les questions d'introduction
    if (q.isIntroduction) {
      return true;
    }
    
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

export async function loadAllQuestions() {
  try {
    // Charger la configuration des pages
    const pagesResponse = await fetch('/data/form_pages.json');
    if (!pagesResponse.ok) {
      throw new Error(`Erreur HTTP: ${pagesResponse.status}`);
    }
    const pagesConfig = await pagesResponse.json();
    
    allQuestions = [];
    
    // Charger toutes les pages dans l'ordre
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();
        
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
                sectionDescription: section.description,
                sectionCondition: section.condition_section,
                isIntroduction: section.isIntroduction || false,
                estimatedTime: section.estimatedTime
              }));
              allQuestions.push(...questionsWithPage);
            } else {
              // Si c'est une section sans questions (comme l'introduction)
              const sectionQuestion = {
                id: section.id || `section_${pageConfig.id}_${section.title.toLowerCase().replace(/\s+/g, '_')}`,
                type: section.type || 'section', // Utiliser le type défini ou 'section' par défaut
                title: section.title,
                description: section.description,
                isIntroduction: section.isIntroduction || false,
                obligatoire: section.obligatoire,
                buttonText: section.buttonText,
                hasCheckbox: section.hasCheckbox,
                checkboxLabel: section.checkboxLabel,
                requireCheckbox: section.requireCheckbox,
                hideTitle: section.hideTitle,
                hideDescription: section.hideDescription,
                estimatedTime: section.estimatedTime,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title
              };
              
              // Ajouter les options si elles existent (pour les boutons radio)
              if (section.type === 'radio' && section.options) {
                sectionQuestion.options = section.options;
              }

              if (section.followUp) {
                sectionQuestion.followUp = section.followUp;
              }
              
              allQuestions.push(sectionQuestion);
            }
          }
        } else if (pageData?.isRecap) {
          // Gérer les pages récap qui ont une structure directe (pas de sections)
          allQuestions.push({
            id: `recap_${pageConfig.id}`,
            type: 'recap',
            title: pageData.title,
            description: pageData.description,
            isRecap: true,
            targetQuestionIds: pageData.targetQuestionIds,
            buttons: pageData.buttons,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title
          });
        } else if (pageData?.isCelebration) {
          // Gérer les pages de félicitations qui ont une structure directe (pas de sections)
          allQuestions.push({
            id: `celebration_${pageConfig.id}`,
            type: 'celebration',
            title: pageData.title,
            description: pageData.description,
            nextStepMessage: pageData.nextStepMessage,
            continueButtonText: pageData.continueButtonText,
            isCelebration: true,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title
          });
        } else if (Array.isArray(pageData)) {
          // Si le fichier est directement un tableau de questions
          const questionsWithPage = pageData.map(q => ({
            ...q,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title
          }));
          allQuestions.push(...questionsWithPage);
        }
      } catch (pageError) {
        console.error(`Erreur lors du chargement de ${pageConfig.title}:`, pageError);
      }
    }
    
    if (!Array.isArray(allQuestions)) {
      console.error('Format de questions invalide :', allQuestions);
      allQuestions = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    throw error;
  }
}

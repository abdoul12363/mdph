/**
 * Question loading and filtering
 */

import { responses } from './storage.js';
import { buildEntryFlowQuestions, getEntryFlow } from './premiere-question.js';

export let allQuestions = [];
export let visible = [];

function evaluateStrictEqualityCondition(condition) {
  if (!condition || !condition.includes('===')) return true;

  const stringMatch = condition.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
  if (!stringMatch) return true;

  const [, fieldId, expectedValue] = stringMatch;
  const actualValue = String(responses[fieldId] || '');
  return actualValue === expectedValue;
}

export function refreshVisible() {
  visible = allQuestions.filter(q => {
    if (q.isIntroduction) {
      return true;
    }
    
    if (q.sectionCondition) {
      if (!evaluateStrictEqualityCondition(q.sectionCondition)) {
        return false;
      }
    }

    if (!q.condition_affichage) {
      return true;
    }

    return evaluateStrictEqualityCondition(q.condition_affichage);
  });
  
  return visible;
}

export async function loadAllQuestions() {
  try {
    // Charger la configuration des pages
    let pagesConfigPath = '/data/form_pages.json';
    try {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(qs || '');
      const parcours = params.get('parcours');
      if (parcours === 'recours') {
        pagesConfigPath = '/data/form_pages_recours.json';
      }
    } catch {
    }

    const pagesResponse = await fetch(pagesConfigPath);
    if (!pagesResponse.ok) {
      throw new Error(`Erreur HTTP: ${pagesResponse.status}`);
    }
    const pagesConfig = await pagesResponse.json();
    
    const entry = typeof window !== 'undefined' ? getEntryFlow(window.location.search) : null;
    
    allQuestions = [];
    
    // Charger toutes les pages dans l'ordre
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();

        const useQuestionProgress = pageConfig && pageConfig.progressMode === 'questions';
        
        if (pageData?.sections) {
          for (const section of pageData.sections) {
            // TOUJOURS charger les sections, les conditions seront évaluées dynamiquement
            if (section.questions) {
              // Ajouter l'info de la page à chaque question
              const questionsWithPage = section.questions.map((q, index) => ({
                ...q,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title,
                sectionTitle: section.title,
                sectionDescription: section.description,
                sectionCondition: section.condition_section,
                isIntroduction: section.isIntroduction || false,
                estimatedTime: section.estimatedTime,
                isEntryFlow: useQuestionProgress ? true : (q.isEntryFlow || false),
                progressStep: useQuestionProgress ? index + 1 : q.progressStep,
                progressTotal: useQuestionProgress ? section.questions.length : q.progressTotal
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
            description2: pageData.description2,
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
        } else if (pageData?.questions && Array.isArray(pageData.questions)) {
          const questionsWithPage = pageData.questions.map(q => ({
            ...q,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title,
            sectionTitle: q.sectionTitle || q.title || pageConfig.title,
            sectionDescription: q.sectionDescription || q.description || pageConfig.description
          }));
          allQuestions.push(...questionsWithPage);
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
    
    const entryQuestions = buildEntryFlowQuestions(entry);
    if (entryQuestions.length > 0) {
      allQuestions.unshift(...entryQuestions);
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

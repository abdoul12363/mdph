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
      console.log('🔍 Question d\'introduction trouvée:', q);
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
  
  console.log('🔍 Questions visibles après filtrage:', visible.map(q => ({
    id: q.id,
    title: q.title || q.question,
    isIntroduction: q.isIntroduction
  })));
  
  return visible;
}

export async function reloadQuestionsWithConditions() {
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
              const questionsWithPage = section.questions.map(q => {
                // Créer un objet question avec les propriétés de base
                const question = {
                  ...q,
                  pageId: pageConfig.id,
                  pageTitle: pageConfig.title,
                  sectionTitle: section.title,
                  step: section.step || 1,  // Utiliser le step de la section ou 1 par défaut
                  sectionId: section.id || ''  // Ajouter l'ID de section pour le débogage
                };
                
                console.log(`    ➕ Question: ${q.id || 'sans-id'} - Step: ${question.step}, Section: ${section.title}`);
                return question;
              });
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

export async function loadAllQuestions() {
  try {
    // Charger la configuration des pages
    console.log('Chargement de la configuration des pages...');
    const pagesResponse = await fetch('/data/form_pages.json');
    if (!pagesResponse.ok) {
      throw new Error(`Erreur HTTP: ${pagesResponse.status}`);
    }
    const pagesConfig = await pagesResponse.json();
    console.log('Configuration des pages chargée:', pagesConfig);
    
    allQuestions = [];
    
    // Charger toutes les pages dans l'ordre
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();
        
        console.log(`Chargement de ${pageConfig.title}...`);
        
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
              allQuestions.push({
                id: `section_${pageConfig.id}_${section.title.toLowerCase().replace(/\s+/g, '_')}`,
                type: 'section',
                title: section.title,
                description: section.description,
                isIntroduction: section.isIntroduction || false,
                estimatedTime: section.estimatedTime,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title
              });
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
    
    console.log(`${allQuestions.length} questions chargées depuis ${pagesConfig.pages.length} pages`);
    
    if (!Array.isArray(allQuestions)) {
      console.error('Format de questions invalide :', allQuestions);
      allQuestions = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    throw error;
  }
}

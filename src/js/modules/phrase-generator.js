/**
 * Intelligent phrase generation for recap pages
 */

export function generateIntelligentPhrases(targetQuestionIds, responses) {
  const phrases = [];
  
  targetQuestionIds.forEach(questionId => {
    const answer = responses[questionId];
    if (answer !== undefined && answer !== '' && answer !== null) {
      // Pour les tableaux, vérifier qu'ils ne sont pas vides
      if (Array.isArray(answer) && answer.length === 0) {
        return;
      }
      
      const intelligentPhrase = generatePhraseForQuestion(questionId, answer, responses);
      if (intelligentPhrase) {
        phrases.push(intelligentPhrase);
      }
    }
  });
  
  // S'assurer qu'il y a toujours exactement 3 phrases
  while (phrases.length < 3) {
    phrases.push('Situation nécessitant un accompagnement adapté');
  }
  
  // Limiter à 3 phrases maximum si on en a plus
  const finalPhrases = phrases.slice(0, 3);
  
  return finalPhrases;
}

export function generatePhraseForQuestion(questionId, answer, allResponses) {
  // Phrases intelligentes basées sur les réponses
  const phraseTemplates = {
    // Module 1 - Vie quotidienne
    'difficultes_quotidiennes': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        const difficulties = {
          'hygiene': 'l\'hygiène personnelle',
          'habillage': 'l\'habillage',
          'repas': 'la préparation des repas',
          'deplacement': 'les déplacements',
          'fatigue': 'la gestion de la fatigue',
          'douleur': 'la gestion de la douleur',
          'concentration': 'la concentration',
          'stress': 'la gestion du stress et de l\'anxiété',
          'sommeil': 'le sommeil',
          'taches_quotidiennes': 'les tâches du quotidien'
        };
        
        const mappedDifficulties = answer.map(val => difficulties[val] || val).filter(Boolean);
        if (mappedDifficulties.length === 1) {
          return `Difficultés quotidiennes liées à ${mappedDifficulties[0]}`;
        } else if (mappedDifficulties.length === 2) {
          return `Difficultés quotidiennes liées à ${mappedDifficulties[0]} et ${mappedDifficulties[1]}`;
        } else if (mappedDifficulties.length > 2) {
          const last = mappedDifficulties.pop();
          return `Difficultés quotidiennes liées à ${mappedDifficulties.join(', ')} et ${last}`;
        }
      }
      return null;
    },
    
    'frequence_difficultes': (answer) => {
      const frequencies = {
        'quotidien': 'Impact sur l\'autonomie dans les actes du quotidien',
        'hebdomadaire': 'Difficultés à maintenir une activité professionnelle ou scolaire',
        'fluctuant': 'Conséquences sur la stabilité personnelle ou financière'
      };
      return frequencies[answer] || null;
    },
    
    'consequences_difficultes': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        const consequences = {
          'ne_pas_y_arriver': 'Impossibilité de réaliser certaines activités sans aide',
          'plus_de_temps': 'Ralentissement significatif dans les activités quotidiennes',
          'dangereux': 'Situations dangereuses nécessitant un accompagnement',
          'abandon_activites': 'Abandon d\'activités importantes pour la qualité de vie',
          'demande_aide': 'Besoin d\'aide humaine pour les actes essentiels'
        };
        
        const mappedConsequences = answer.map(val => consequences[val]).filter(Boolean);
        if (mappedConsequences.length > 0) {
          return mappedConsequences[0]; // Prendre la première conséquence la plus significative
        }
      }
      return null;
    },
    
    // Module 2 - Travail / scolarité
    'situation_actuelle': (answer) => {
      const situations = {
        'emploi': 'Difficultés à maintenir une activité professionnelle ou scolaire',
        'arret_travail': 'Arrêt de travail lié à l\'état de santé',
        'recherche_emploi': 'Difficultés d\'insertion professionnelle liées au handicap',
        'formation': 'Besoin d\'adaptation dans le parcours de formation',
        'etudiant': 'Difficultés scolaires nécessitant des aménagements',
        'sans_activite': 'Impossibilité de maintenir une activité régulière'
      };
      return situations[answer] || null;
    },
    
    'difficultes_travail': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        return 'Difficultés à maintenir une activité professionnelle ou scolaire';
      }
      return null;
    },
    
    'consequences_travail': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        return 'Conséquences sur la stabilité personnelle ou financière';
      }
      return null;
    },
    
    // Module 3 - Demandes et besoins
    'type_demande': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        const demands = {
          'aah': 'Besoin de sécurisation financière (AAH)',
          'rqth': 'Demande de reconnaissance de la qualité de travailleur handicapé (RQTH)',
          'amenagement': 'Besoin d\'aménagement du poste de travail',
          'aide_humaine': 'Besoin d\'aide humaine',
          'orientation': 'Demande d\'orientation et d\'accompagnement',
          'carte_mobilite': 'Demande de carte mobilité inclusion',
          'autre': 'Autre demande spécifique'
        };
        
        const mappedDemands = answer.map(val => demands[val]).filter(Boolean);
        if (mappedDemands.length > 0) {
          return mappedDemands.join(' et ');
        }
      }
      return null;
    },
    
    'objectif_demande': (answer) => {
      const objectives = {
        'securiser': 'Besoin de sécurisation financière',
        'compenser': 'Volonté de compenser une perte de revenus',
        'autonomie': 'Volonté de maintenir l\'autonomie',
        'handicap': 'Besoin de faire face aux conséquences du handicap',
        'autre_objectif': 'Autre objectif spécifique'
      };
      return objectives[answer] || null;
    },
    
    // Module 4 - Projet de vie
    'axe_principal': (answer) => {
      const axes = {
        'stabilite': 'Recherche de stabilité et d\'équilibre de vie',
        'sante': 'Priorité donnée à la préservation de la santé et du bien-être',
        'adaptation': 'Volonté d\'adapter le quotidien à l\'état de santé',
        'travail': 'Projet de maintenir ou reprendre une activité professionnelle adaptée',
        'autonomie': 'Volonté d\'améliorer l\'autonomie au quotidien',
        'autre_axe': 'Autre axe de projet de vie spécifique'
      };
      return axes[answer] || null;
    },
    
    'priorites_actuelles': (answer) => {
      if (Array.isArray(answer) && answer.length > 0) {
        const priorities = {
          'sante': 'Préservation de la santé',
          'fatigue_douleurs': 'Réduction de la fatigue et des douleurs',
          'finances': 'Stabilisation de la situation financière',
          'rythme': 'Adaptation du rythme de vie',
          'accompagnement': 'Besoin d\'accompagnement',
          'equilibre': 'Maintien d\'un équilibre personnel',
          'autre_priorite': 'Autre priorité spécifique'
        };
        
        const mappedPriorities = answer.map(val => priorities[val]).filter(Boolean);
        if (mappedPriorities.length > 0) {
          return `Priorités : ${mappedPriorities.join(' et ')}`;
        }
      }
      return null;
    }
  };
  
  const template = phraseTemplates[questionId];
  if (template && typeof template === 'function') {
    return template(answer);
  }
  
  return null;
}

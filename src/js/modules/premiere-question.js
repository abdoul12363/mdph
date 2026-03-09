const ENTRY_FLOW_CONFIG = {
  'first-demand': {
    shortTitle: 'Première demande',
    flowKey: 'premiere-demande',
    typeDemandeValue: 'premiere',
    questions: [
      {
        id: 'entry_first_demand_reason',
        title: 'Qu’est-ce qui vous amène aujourd’hui à déposer un dossier MDPH ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'sante_degradee', label: 'ma situation de santé s’est récemment dégradée' },
          { value: 'difficultes_anciennes', label: 'mes difficultés existent depuis longtemps mais je n’avais jamais fait de démarche' },
          { value: 'conseille_par_professionnel', label: 'un professionnel (médecin, travailleur social, employeur) m’a conseillé de faire une demande' },
          { value: 'situation_professionnelle_difficile', label: 'ma situation professionnelle devient difficile à cause de ma santé' },
          { value: 'besoin_aide_quotidienne', label: 'j’ai besoin d’aide dans ma vie quotidienne' }
        ]
      },
      {
        id: 'entry_first_demand_history',
        title: 'Votre situation a-t-elle déjà été reconnue administrativement ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'aucune_reconnaissance', label: 'non, aucune reconnaissance' },
          { value: 'hors_mdph', label: 'oui, par un dispositif hors MDPH (invalidité, arrêt longue durée, pension…)' },
          { value: 'mdph_droits_accordes', label: 'oui, par la MDPH avec un ou plusieurs droits accordés' },
          { value: 'mdph_refus_ou_partiel', label: 'oui, par la MDPH mais avec un refus ou une réponse partielle' }
        ]
      },
      {
        id: 'entry_first_demand_current_status',
        title: 'Aujourd’hui, quelle est votre situation principale ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'travaille_difficile', label: 'je travaille mais cela devient difficile' },
          { value: 'travaille_amenagements', label: 'je travaille avec des aménagements' },
          { value: 'arret_travail', label: 'je suis en arrêt de travail' },
          { value: 'recherche_emploi', label: 'je suis en recherche d’emploi' },
          { value: 'ne_peux_plus_travailler', label: 'je ne peux plus travailler' },
          { value: 'etudiant_formation', label: 'je suis étudiant ou en formation' }
        ]
      },
      {
        id: 'entry_first_demand_goal',
        title: 'Quel est l’objectif principal de votre dossier MDPH ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'reconnaissance_officielle', label: 'reconnaissance officielle de mon handicap' },
          { value: 'aide_financiere', label: 'aide financière' },
          { value: 'amenagement_emploi', label: 'aménagement ou maintien dans l’emploi' },
          { value: 'aide_vie_quotidienne', label: 'besoin d’aide dans la vie quotidienne' },
          { value: 'orientation_pro', label: 'orientation ou accompagnement professionnel' }
        ]
      }
    ]
  },
  renewal: {
    shortTitle: 'Renouvellement',
    flowKey: 'renouvellement',
    typeDemandeValue: 'renouvellement',
    questions: [
      {
        id: 'entry_renewal_current_rights',
        title: 'Quels droits MDPH avez-vous actuellement ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'aah', label: 'AAH' },
          { value: 'rqth', label: 'RQTH' },
          { value: 'pch', label: 'PCH' },
          { value: 'carte_mobilite', label: 'carte mobilité inclusion' },
          { value: 'plusieurs_droits', label: 'plusieurs de ces droits' },
          { value: 'droits_incertains', label: 'je ne suis pas sûr des droits qui m’ont été accordés' }
        ]
      },
      {
        id: 'entry_renewal_medical_change',
        title: 'Depuis votre dernière décision MDPH, votre situation a-t-elle évolué ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'amelioration', label: 'amélioration' },
          { value: 'stable', label: 'situation globalement stable' },
          { value: 'aggravation_progressive', label: 'aggravation progressive' },
          { value: 'aggravation_importante', label: 'aggravation importante ou brutale' },
          { value: 'nouvelles_difficultes', label: 'apparition de nouvelles difficultés' }
        ]
      },
      {
        id: 'entry_renewal_work_change',
        title: 'Votre situation professionnelle a-t-elle changé depuis votre dernier dossier ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'non', label: 'non' },
          { value: 'reduction_activite', label: 'j’ai réduit mon activité' },
          { value: 'arret_travail', label: 'je suis en arrêt de travail' },
          { value: 'perte_emploi', label: 'j’ai perdu mon emploi' },
          { value: 'ne_peux_plus_travailler', label: 'je ne peux plus travailler' }
        ]
      },
      {
        id: 'entry_renewal_expectation',
        title: 'Qu’attendez-vous principalement de ce renouvellement ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'prolonger_droits', label: 'prolonger mes droits actuels' },
          { value: 'renforcer_aides', label: 'renforcer certaines aides' },
          { value: 'obtenir_aide_supplementaire', label: 'obtenir une aide supplémentaire' },
          { value: 'reevaluer_situation', label: 'réévaluer ma situation' },
          { value: 'adapter_aides', label: 'adapter mes aides à ma situation actuelle' }
        ]
      }
    ]
  },
  verification: {
    shortTitle: 'Vérification dossier',
    flowKey: 'verification-dossier',
    typeDemandeValue: 'premiere',
    questions: [
      {
        id: 'entry_verification_dossier_status',
        title: 'Votre dossier MDPH est-il déjà rédigé ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'dossier_complet', label: 'oui, le dossier est complet' },
          { value: 'dossier_a_finaliser', label: 'oui, mais certaines parties restent à finaliser' },
          { value: 'formulaire_sans_projet', label: 'j’ai rempli le formulaire mais pas le projet de vie' },
          { value: 'structure_incertaine', label: 'j’ai commencé mais je ne suis pas sûr de l’avoir bien structuré' }
        ]
      },
      {
        id: 'entry_verification_medical_documents',
        title: 'Disposez-vous déjà des documents médicaux nécessaires ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'pieces_completes', label: 'oui, toutes les pièces sont prêtes' },
          { value: 'pieces_manquantes', label: 'oui, mais certaines pièces manquent' },
          { value: 'certificat_seul', label: 'j’ai seulement le certificat médical' },
          { value: 'documents_incertain', label: 'je ne suis pas sûr d’avoir les bons documents' }
        ]
      },
      {
        id: 'entry_verification_hesitation',
        title: 'Quel point vous fait le plus hésiter avant d’envoyer votre dossier ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'explication_difficultes', label: 'la manière dont mes difficultés sont expliquées' },
          { value: 'coherence_medicale_professionnelle', label: 'la cohérence entre ma situation médicale et professionnelle' },
          { value: 'choix_aides', label: 'le choix des aides demandées' },
          { value: 'qualite_globale', label: 'la qualité globale du dossier' },
          { value: 'redaction_projet_vie', label: 'la rédaction du projet de vie' }
        ]
      },
      {
        id: 'entry_verification_expectation',
        title: 'Qu’attendez-vous principalement de cette vérification ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'validation_envoi', label: 'valider que mon dossier peut être envoyé tel quel' },
          { value: 'ameliorer_elements', label: 'améliorer certains éléments du dossier' },
          { value: 'corriger_incoherences', label: 'corriger des incohérences éventuelles' },
          { value: 'argumentation_suffisante', label: 'savoir si ma demande est suffisamment argumentée' },
          { value: 'recommandations_avant_depot', label: 'obtenir des recommandations avant dépôt' }
        ]
      }
    ]
  },
  aggravation: {
    shortTitle: 'Aggravation',
    flowKey: 'aggravation',
    typeDemandeValue: 'premiere',
    questions: [
      {
        id: 'entry_aggravation_reason',
        title: 'Qu’est-ce qui vous amène aujourd’hui à déposer un dossier MDPH ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'sante_degradee', label: 'ma situation de santé s’est récemment dégradée' },
          { value: 'difficultes_anciennes', label: 'mes difficultés existent depuis longtemps mais je n’avais jamais fait de démarche' },
          { value: 'conseille_par_professionnel', label: 'un professionnel (médecin, travailleur social, employeur) m’a conseillé de faire une demande' },
          { value: 'situation_professionnelle_difficile', label: 'ma situation professionnelle devient difficile à cause de ma santé' },
          { value: 'besoin_aide_quotidienne', label: 'j’ai besoin d’aide dans ma vie quotidienne' }
        ]
      },
      {
        id: 'entry_aggravation_history',
        title: 'Votre situation a-t-elle déjà été reconnue administrativement ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'aucune_reconnaissance', label: 'non, aucune reconnaissance' },
          { value: 'hors_mdph', label: 'oui, par un dispositif hors MDPH (invalidité, arrêt longue durée, pension…)' },
          { value: 'mdph_droits_accordes', label: 'oui, par la MDPH avec un ou plusieurs droits accordés' },
          { value: 'mdph_refus_ou_partiel', label: 'oui, par la MDPH mais avec un refus ou une réponse partielle' }
        ]
      },
      {
        id: 'entry_aggravation_current_status',
        title: 'Aujourd’hui, quelle est votre situation principale ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'travaille_difficile', label: 'je travaille mais cela devient difficile' },
          { value: 'travaille_amenagements', label: 'je travaille avec des aménagements' },
          { value: 'arret_travail', label: 'je suis en arrêt de travail' },
          { value: 'recherche_emploi', label: 'je suis en recherche d’emploi' },
          { value: 'ne_peux_plus_travailler', label: 'je ne peux plus travailler' },
          { value: 'etudiant_formation', label: 'je suis étudiant ou en formation' }
        ]
      },
      {
        id: 'entry_aggravation_goal',
        title: 'Quel est l’objectif principal de votre dossier MDPH ?',
        type: 'radio',
        obligatoire: true,
        buttonText: 'Continuer',
        options: [
          { value: 'reconnaissance_officielle', label: 'reconnaissance officielle de mon handicap' },
          { value: 'aide_financiere', label: 'aide financière' },
          { value: 'amenagement_emploi', label: 'aménagement ou maintien dans l’emploi' },
          { value: 'aide_vie_quotidienne', label: 'besoin d’aide dans la vie quotidienne' },
          { value: 'orientation_pro', label: 'orientation ou accompagnement professionnel' }
        ]
      }
    ],
    defaults: {
      entry_aggravation_reason: 'sante_degradee'
    }
  }
};

const ENTRY_FLOW_ALIASES = {
  'premiere-demande': 'first-demand',
  'renouvellement': 'renewal',
  'verification-dossier': 'verification',
  'aggravation': 'aggravation'
};

export function getEntryFlow(search = '') {
  const params = new URLSearchParams(search || '');
  const rawEntry = params.get('entry') || params.get('parcours');
  if (!rawEntry) return null;

  if (ENTRY_FLOW_CONFIG[rawEntry]) {
    return rawEntry;
  }

  return ENTRY_FLOW_ALIASES[rawEntry] || null;
}

export function primeEntryResponses(entry, responses) {
  if (!entry || !responses || !ENTRY_FLOW_CONFIG[entry]) return;
  const config = ENTRY_FLOW_CONFIG[entry];
  responses.entry_flow = config.flowKey;
  responses.entry_source = entry;
  if (config.typeDemandeValue) {
    responses.type_demande = config.typeDemandeValue;
  }
  if (config.defaults) {
    Object.entries(config.defaults).forEach(([key, value]) => {
      if (responses[key] === undefined) {
        responses[key] = value;
      }
    });
  }
}

export function buildEntryFlowQuestions(entry) {
  const config = ENTRY_FLOW_CONFIG[entry];
  if (!config) return [];

  return config.questions.map((question, index) => ({
    ...question,
    isIntroduction: false,
    isEntryFlow: true,
    pageId: 'entry_flow',
    pageTitle: config.shortTitle || question.title,
    sectionTitle: question.title,
    sectionDescription: question.description,
    estimatedTime: `${index + 1} / ${config.questions.length}`,
    progressStep: index + 1,
    progressTotal: config.questions.length
  }));
}

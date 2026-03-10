import { responses, saveLocal, loadSaved } from '/src/js/modules/storage.js';
import { initUniversalMenu } from '/src/js/modules/universal-menu.js';

// Questions pour le projet de vie
const PROJET_VIE_QUESTIONS = [
  {
    id: 'situation_actuelle',
    title: 'Décrivez votre situation actuelle',
    type: 'textarea',
    obligatoire: true,
    buttonText: 'Continuer',
    minLength: 50,
    maxLength: 800,
    placeholder: 'Décrivez votre situation professionnelle, familiale, sociale, médicale...'
  },
  {
    id: 'difficultes_principales',
    title: 'Quelles sont vos difficultés principales au quotidien ?',
    type: 'checkbox',
    obligatoire: true,
    buttonText: 'Continuer',
    options: [
      { value: 'deplacements', label: 'Déplacements et transports' },
      { value: 'sante_physique', label: 'Santé physique et douleurs' },
      { value: 'sante_mentale', label: 'Santé mentale et fatigue' },
      { value: 'autonomie', label: 'Autonomie et soins personnels' },
      { value: 'communication', label: 'Communication et relations sociales' },
      { value: 'concentration', label: 'Concentration et mémorisation' },
      { value: 'vie_quotidienne', label: 'Tâches de la vie quotidienne' }
    ]
  },
  {
    id: 'impact_professionnel',
    title: 'Comment votre situation impacte-t-elle votre vie professionnelle ?',
    type: 'textarea',
    obligatoire: true,
    buttonText: 'Continuer',
    minLength: 50,
    maxLength: 600,
    placeholder: 'Expliquez les conséquences sur votre travail, votre capacité à exercer votre profession...'
  },
  {
    id: 'besoins_aides',
    title: 'De quelles aides ou aménagements avez-vous besoin ?',
    type: 'checkbox',
    obligatoire: true,
    buttonText: 'Continuer',
    options: [
      { value: 'aide_humaine', label: 'Aide humaine (aide-soignant, auxiliaire de vie)' },
      { value: 'materiel_adapte', label: 'Matériel adapté (fauteuil, lit médicalisé, etc.)' },
      { value: 'aménagement_logement', label: 'Aménagement du logement (rampes, salle de bain adaptée)' },
      { value: 'aménagement_travail', label: 'Aménagement du poste de travail' },
      { value: 'transport_adapte', label: 'Transport adapté (véhicule spécialisé, taxi adapté)' },
      { value: 'soutien_scolaire', label: 'Soutien scolaire ou universitaire' },
      { value: 'accompagnement_social', label: 'Accompagnement social' }
    ]
  },
  {
    id: 'objectifs_projets',
    title: 'Quels sont vos objectifs principaux pour l\'avenir ?',
    type: 'checkbox',
    obligatoire: true,
    buttonText: 'Continuer',
    options: [
      { value: 'maintien_emploi', label: 'Maintenir mon emploi actuel' },
      { value: 'formation_emploi', label: 'Formation ou reconversion professionnelle' },
      { value: 'amelioration_sante', label: 'Amélioration de ma santé' },
      { value: 'autonomie_accrue', label: 'Gagner en autonomie' },
      { value: 'logement_adapte', label: 'Accéder à un logement adapté' },
      { value: 'vie_sociale', label: 'Développer ma vie sociale et relationnelle' },
      { value: 'loisirs_creatifs', label: 'Pratiquer des loisirs créatifs ou sportifs' }
    ]
  },
  {
    id: 'projets_vie',
    title: 'Décrivez vos projets de vie personnels et professionnels',
    type: 'textarea',
    obligatoire: true,
    buttonText: 'Continuer',
    minLength: 100,
    maxLength: 1000,
    placeholder: 'Décrivez vos aspirations, vos envies, vos projets à court, moyen et long terme...'
  }
];

let currentQuestionIndex = 0;

// Fonction pour rendre une question
function renderQuestion(question) {
  const questionArea = document.getElementById('questionArea');
  
  let html = `
    <div class="question-item">
      <div class="q-title">${question.title}</div>
      <div class="field-container">
  `;
  
  if (question.type === 'textarea') {
    html += `
      <label for="${question.id}">${question.title}</label>
      <textarea id="${question.id}" 
               required 
               minlength="${question.minLength || ''}" 
               maxlength="${question.maxLength || ''}"
               placeholder="${question.placeholder || ''}"></textarea>
      <div class="char-counter" id="counter-${question.id}">
        <span class="char-count">0</span> / ${question.maxLength} caractères
        ${question.minLength ? `<span class="char-min">(minimum ${question.minLength})</span>` : ''}
      </div>
    `;
  } else if (question.type === 'checkbox') {
    html += `
      <label>${question.title}</label>
      <div class="choice-grid">
    `;
    question.options.forEach(option => {
      html += `
        <label class="choice">
          <input type="checkbox" name="${question.id}" value="${option.value}" />
          <span>${option.label}</span>
        </label>
      `;
    });
    html += `
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  questionArea.innerHTML = html;
  
  // Initialiser les compteurs de caractères
  if (question.type === 'textarea') {
    initCharCounter(question.id, question.minLength, question.maxLength);
  }

  // Brancher les listeners
  if (question.type === 'textarea') {
    const el = document.getElementById(question.id);
    if (el) {
      el.addEventListener('input', () => {
        responses[question.id] = el.value;
        saveLocal(true);
      });
    }
  }
  
  if (question.type === 'checkbox') {
    const inputs = document.querySelectorAll(`input[name="${question.id}"]`);
    inputs.forEach((input) => {
      input.addEventListener('change', () => updateCheckboxResponse(question.id));
    });
  }
  
  // Charger les valeurs sauvegardées
  loadQuestionValues(question);
}

// Initialiser un compteur de caractères
function initCharCounter(textareaId, minLength, maxLength) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(`counter-${textareaId}`);
  const charCount = counter.querySelector('.char-count');
  
  function updateCounter() {
    const currentLength = textarea.value.length;
    charCount.textContent = currentLength;
    
    counter.classList.remove('char-counter--too-short', 'char-counter--valid', 'char-counter--too-long');
    
    if (currentLength < minLength) {
      counter.classList.add('char-counter--too-short');
    } else if (currentLength > maxLength) {
      counter.classList.add('char-counter--too-long');
    } else {
      counter.classList.add('char-counter--valid');
    }
    
    responses[textareaId] = textarea.value;
    saveLocal(true);
  }
  
  textarea.addEventListener('input', updateCounter);
  updateCounter(); // Initialiser
}

// Charger les valeurs sauvegardées pour une question
function loadQuestionValues(question) {
  if (question.type === 'textarea' && responses[question.id]) {
    document.getElementById(question.id).value = responses[question.id];
    // Initialiser le compteur de caractères
    const counter = document.getElementById(`counter-${question.id}`);
    if (counter) {
      const charCount = counter.querySelector('.char-count');
      const currentLength = responses[question.id].length;
      charCount.textContent = currentLength;
      
      // Mettre à jour les classes de couleur
      counter.classList.remove('char-counter--too-short', 'char-counter--valid', 'char-counter--too-long');
      if (currentLength < question.minLength) {
        counter.classList.add('char-counter--too-short');
      } else if (currentLength > question.maxLength) {
        counter.classList.add('char-counter--too-long');
      } else {
        counter.classList.add('char-counter--valid');
      }
    }
  } else if (question.type === 'checkbox' && Array.isArray(responses[question.id])) {
    responses[question.id].forEach(value => {
      const checkbox = document.querySelector(`input[name="${question.id}"][value="${value}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
}

// Mettre à jour les réponses checkbox automatiquement
function updateCheckboxResponse(questionId) {
  const checked = document.querySelectorAll(`input[name="${questionId}"]:checked`);
  responses[questionId] = Array.from(checked).map(cb => cb.value);
  saveLocal(true);
}

// Afficher la question actuelle
function showCurrentQuestion() {
  if (currentQuestionIndex < PROJET_VIE_QUESTIONS.length) {
    renderQuestion(PROJET_VIE_QUESTIONS[currentQuestionIndex]);
    updateProgress();
    updateButtonStates();
    
    // Nettoyer les messages d'erreur
    const status = document.getElementById('status');
    if (status) status.textContent = '';
  }
}

// Mettre à jour les boutons
function updateButtonStates() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn) {
    prevBtn.disabled = currentQuestionIndex === 0; // Désactivé à la première question
  }
  
  if (nextBtn) {
    nextBtn.disabled = false;
  }
}

// Mettre à jour la barre de progression
function updateProgress() {
  const total = PROJET_VIE_QUESTIONS.length;
  const current = Math.min(currentQuestionIndex + 1, total);
  
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const questionId = document.getElementById('questionId');
  
  if (progressText) progressText.textContent = `${current} / ${total}`;
  if (questionId) {
    const q = PROJET_VIE_QUESTIONS[currentQuestionIndex];
    questionId.textContent = q ? q.id : '';
  }
  if (progressFill) {
    const pct = (current / total) * 100;
    progressFill.style.width = `${pct}%`;
  }
}

// Fonction d'initialisation
function boot() {
  loadSaved();
  
  // Restaurer l'index de question après refresh
  const savedIndex = Number.isFinite(Number(responses.projet_vie_question_index))
    ? Number(responses.projet_vie_question_index)
    : 0;
  currentQuestionIndex = Math.max(0, Math.min(savedIndex, PROJET_VIE_QUESTIONS.length - 1));
  
  showCurrentQuestion();
}

// Navigation dans les questions
document.getElementById('nextBtn').addEventListener('click', function() {
  // Valider la question actuelle
  const currentQuestion = PROJET_VIE_QUESTIONS[currentQuestionIndex];
  let isValid = true;
  
  if (currentQuestion.type === 'textarea') {
    const el = document.getElementById(currentQuestion.id);
    if (!el || !el.value.trim()) {
      isValid = false;
    } else if (el.value.length < (currentQuestion.minLength || 0)) {
      isValid = false;
    } else {
      responses[currentQuestion.id] = el.value;
      saveLocal(true);
    }
  } else if (currentQuestion.type === 'checkbox') {
    const checked = document.querySelectorAll(`input[name="${currentQuestion.id}"]:checked`);
    if (checked.length === 0) {
      isValid = false;
    } else {
      responses[currentQuestion.id] = Array.from(checked).map(cb => cb.value);
      saveLocal(true);
    }
  }
  
  if (!isValid) {
    const status = document.getElementById('status');
    if (status) status.textContent = 'Veuillez remplir tous les champs obligatoires';
    return;
  }
  
  // Passer à la question suivante
  currentQuestionIndex++;
  responses.projet_vie_question_index = currentQuestionIndex;
  saveLocal(true);
  
  if (currentQuestionIndex < PROJET_VIE_QUESTIONS.length) {
    showCurrentQuestion();
  } else {
    // Rediriger vers la page de finalisation
    window.location.href = '/finaliser-dossier';
  }
});

document.getElementById('prevBtn').addEventListener('click', function() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    responses.projet_vie_question_index = currentQuestionIndex;
    saveLocal(true);
    showCurrentQuestion();
  }
});

// Initialiser l'application
initUniversalMenu();
boot();

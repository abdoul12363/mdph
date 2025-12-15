const storageKey = 'cerfa_responses_v1';

let allQuestions = [];
let visible = [];
let idx = 0;
let responses = {};
let inFlight = false;

function $(id) { return document.getElementById(id); }

function setStatus(msg) {
  $('status').textContent = msg || '';
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) responses = JSON.parse(raw);
  } catch {
    responses = {};
  }
}

function saveLocal(silent = false) {
  localStorage.setItem(storageKey, JSON.stringify(responses));
  if (!silent) setStatus('Sauvegardé localement.');
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

function normalizeOuiNon(v) {
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (!v) return 'non';
  const s = String(v).trim().toLowerCase();
  if (['oui', 'o', 'yes', 'y', '1', 'true'].includes(s)) return 'oui';
  return 'non';
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
  visible = allQuestions.filter(q => evaluateCondition(q.condition_affichage));
  if (idx >= visible.length) idx = Math.max(0, visible.length - 1);
}

function updateProgress() {
  const total = visible.length;
  const current = total ? idx + 1 : 0;
  $('progressText').textContent = `${current} / ${total}`;
  $('progressFill').style.width = total ? `${Math.round((current / total) * 100)}%` : '0%';
  $('questionId').textContent = visible[idx]?.id || '';

  $('prevBtn').disabled = idx <= 0;
  $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
}

function renderInput(q, value) {
  if (q.type_champ === 'texte_long') {
    return `<textarea class="input" id="answer" placeholder="Ta réponse...">${value ? String(value) : ''}</textarea>`;
  }

  if (q.type_champ === 'date') {
    return `<input class="input" id="answer" type="date" value="${value ? String(value) : ''}" />`;
  }

  if (q.type_champ === 'oui_non') {
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

  if (q.type_champ === 'choix_multiple' && Array.isArray(q.valeurs_possibles)) {
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
  return `<input class="input" id="answer" type="text" placeholder="Ta réponse..." value="${value ? String(value) : ''}" />`;
}

function getAnswerFromDom(q) {
  if (q.type_champ === 'oui_non') {
    const el = document.querySelector('input[name="yn"]:checked');
    return el ? el.value : '';
  }

  if (q.type_champ === 'choix_multiple') {
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

  const value = responses[q.id];

  $('questionArea').innerHTML = `
    <h2 class="q-title">${q.libelle_plateforme}</h2>
    ${renderInput(q, value)}
  `;

  updateProgress();
}

function next() {
  const q = visible[idx];
  if (!q) return;

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

  saveLocal(true);

  refreshVisible();
  if (idx < visible.length - 1) {
    idx += 1;
    render();
    setStatus('');
  } else {
    setStatus('Fin du formulaire. Tu peux générer le PDF.');
  }
}

function prev() {
  if (idx <= 0) return;
  idx -= 1;
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
    const r = await fetch('/data/questions_cerfa.json');
    const data = await r.json();
    allQuestions = Array.isArray(data.questions) ? data.questions : [];
  } catch {
    allQuestions = [];
  }

  refreshVisible();
  render();
}

$('nextBtn').addEventListener('click', next);
$('prevBtn').addEventListener('click', prev);
$('generateBtn').addEventListener('click', generatePdf);
// Les boutons saveBtn et resetBtn ont été supprimés de l'interface

boot();

import { loadSaved, responses, saveLocal } from './modules/storage.js';

function setStatus(msg) {
  const el = document.getElementById('pricingStatus');
  if (el) el.textContent = msg || '';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSelectedAdvisor() {
  try {
    return responses && typeof responses === 'object' ? responses.__advisorSelected : null;
  } catch {
    return null;
  }
}

function setSelectedAdvisor(advisor) {
  try {
    responses.__advisorSelected = advisor;
    saveLocal(true);
  } catch {
  }
}

function renderAccordion(openOfferId = null) {
  const root = document.getElementById('pricingAccordion');
  if (!root) return;

  const advisors = [
    { id: 'lola', prenom: 'Lola', role: 'Conseillère', score: 'Clarté 10/10', img: '/ilustration1.png' },
    { id: 'nina', prenom: 'Nina', role: 'Conseillère', score: 'Clarté 9/10', img: '/ilustration1.png' },
    { id: 'adam', prenom: 'Adam', role: 'Conseiller', score: 'Clarté 8/10', img: '/ilustration1.png' },
  ];

  const selected = getSelectedAdvisor();

  root.innerHTML = `
    <div class="pricing-item" data-offer="free">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge" style="visibility:hidden;">&nbsp;</span>
          <button type="button" class="btn" data-toggle="free"><span class="pricing-price">Gratuit</span><span class="pricing-title">Télécharger mon récapitulatif</span></button>
        </div>
      </div>
      <div class="pricing-body" data-body="free" style="display:${openOfferId === 'free' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>PDF récapitulatif tel que rempli</li>
          <li>Aucune relecture</li>
          <li>Aucune reformulation</li>
          <li>Aucun accompagnement</li>
        </ul>
        <div class="form-actions">
          <a class="btn btn-primary" href="/confirmation-gratuite">Continuer</a>
        </div>
      </div>
    </div>

    <div class="pricing-item" data-offer="49">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge">Le plus choisi</span>
          <button type="button" class="btn" data-toggle="49"><span class="pricing-price">49 €</span><span class="pricing-title">Projet de vie structuré pour la MDPH</span></button>
        </div>
      </div>
      <div class="pricing-body" data-body="49" style="display:${openOfferId === '49' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>Relecture complète du projet de vie</li>
          <li>Reformulation selon les critères MDPH</li>
          <li>Mise en cohérence de l’ensemble</li>
          <li>PDF final prêt à être utilisé</li>
          <li>Aucun rendez-vous inclus</li>
          <li>Envoi par email après paiement</li>
        </ul>
        <div class="form-actions">
          <a class="btn btn-primary" href="/paiement?offer=49">Continuer</a>
        </div>
      </div>
    </div>

    <div class="pricing-item" data-offer="79">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge">Avec échange humain</span>
          <button type="button" class="btn" data-toggle="79">
            <span class="pricing-price">79 €</span>
            <span class="pricing-title">Accompagnement personnalisé</span>
          </button>
        </div>
      </div>
      <div class="pricing-body" data-body="79" style="display:${openOfferId === '79' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>Tout ce qui est inclus dans l’offre à 49 €</li>
          <li>Un échange individuel de 30 minutes</li>
          <li>Réponses adaptées à la situation</li>
          <li>Ajustements complémentaires si besoin</li>
          <li>PDF envoyé immédiatement après paiement</li>
        </ul>

        <div style="border-top: 1px solid rgba(0,0,0,.08); padding-top: 12px; margin-top: 12px;">
          <div style="font-weight: 600; margin-bottom: 10px;">Choisir la personne pour l’échange</div>
          <div id="advisorList" style="display:flex; flex-direction:column; gap: 6px;"></div>
        </div>

        <div class="form-actions" style="justify-content:flex-start; gap:12px; margin-top: 14px;">
          <a class="btn btn-primary" id="pay79Btn" href="#" style="display:${selected ? 'inline-flex' : 'none'};">Continuer</a>
        </div>
      </div>
    </div>
  `;

  const advisorList = document.getElementById('advisorList');
  if (advisorList) {
    advisorList.innerHTML = advisors.map(a => {
      const checked = selected && selected.id === a.id;
      return `
        <label class="choice" style="display:flex; align-items:center; gap: 8px; padding: 6px 8px; border: 1px solid rgba(0,0,0,.1); border-radius: 8px; cursor: pointer;">
          <input type="radio" name="advisor" value="${escapeHtml(a.id)}" ${checked ? 'checked' : ''} />
          <img src="${escapeHtml(a.img)}" alt="${escapeHtml(a.prenom)}" style="width: 28px; height: 28px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(0,0,0,.12);" />
          <div style="display:flex; flex-direction:column; gap: 1px;">
            <div style="font-weight: 600;">${escapeHtml(a.prenom)}</div>
            <div class="muted">${escapeHtml(a.role)} — ${escapeHtml(a.score)}</div>
          </div>
        </label>
      `;
    }).join('');

    const radios = advisorList.querySelectorAll('input[type="radio"][name="advisor"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        const chosen = advisors.find(a => a.id === r.value);
        if (!chosen) return;
        setSelectedAdvisor(chosen);
        renderAccordion('79');
      });
    });

    const pay79Btn = document.getElementById('pay79Btn');
    if (pay79Btn) {
      if (selected) {
        pay79Btn.href = `/paiement?offer=79&advisor=${encodeURIComponent(selected.id)}`;
      } else {
        pay79Btn.href = '#';
      }
    }
  }

  const toggles = root.querySelectorAll('[data-toggle]');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = btn.getAttribute('data-toggle');
      if (!offer) return;
      const next = openOfferId === offer ? null : offer;
      renderAccordion(next);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSaved();
  } catch {
  }

  // Si l'utilisateur arrive ici sans réponses, on ne le bloque pas mais on affiche un message.
  try {
    const hasAny = responses && typeof responses === 'object' && Object.keys(responses).length > 0;
    if (!hasAny) {
      setStatus('Vos réponses ne sont pas chargées. Vous pouvez revenir au formulaire si besoin.');
    }
  } catch {
  }

  renderAccordion(null);
});

/**
 * Gère les compteurs de caractères pour les textarea
 */

export function initCharCounters() {
  const textareas = document.querySelectorAll('textarea[data-char-counter="true"]');
  
  textareas.forEach(textarea => {
    const container = textarea.closest('.field-container');
    const counterElement = container?.querySelector('.char-counter .char-count');
    
    if (!counterElement) return;
    
    // Mettre à jour le compteur initial
    updateCounter(textarea, counterElement);
    
    // Écouter les changements
    textarea.addEventListener('input', () => {
      updateCounter(textarea, counterElement);
    });
    
    // Écouter le collage
    textarea.addEventListener('paste', () => {
      setTimeout(() => updateCounter(textarea, counterElement), 0);
    });
  });
}

function updateCounter(textarea, counterElement) {
  const currentLength = textarea.value.length;
  const maxLength = parseInt(textarea.getAttribute('maxlength')) || 600;
  const minLength = parseInt(textarea.getAttribute('minlength')) || 0;
  
  counterElement.textContent = currentLength;
  
  // Mettre à jour les classes de style
  const container = textarea.closest('.field-container');
  const counterContainer = container?.querySelector('.char-counter');
  
  if (counterContainer) {
    // En dessous du minimum
    if (minLength > 0 && currentLength < minLength) {
      counterContainer.classList.add('char-counter--too-short');
      counterContainer.classList.remove('char-counter--valid', 'char-counter--too-long');
    }
    // Dans la plage valide
    else if (currentLength <= maxLength) {
      counterContainer.classList.add('char-counter--valid');
      counterContainer.classList.remove('char-counter--too-short', 'char-counter--too-long');
    }
    // Au-dessus du maximum
    else {
      counterContainer.classList.add('char-counter--too-long');
      counterContainer.classList.remove('char-counter--valid', 'char-counter--too-short');
    }
  }
}

// Initialiser automatiquement les compteurs quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initCharCounters);

// Exporter pour pouvoir l'appeler manuellement après le rendu dynamique
window.initCharCounters = initCharCounters;

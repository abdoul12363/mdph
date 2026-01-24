/**
 * Crée et gère l'animation de confettis pour les pages de célébration.
 * Gère le nettoyage des conteneurs, le timing des animations et le nettoyage automatique.
 */

export function createConfetti() {
  // Nettoyer les conteneurs de confettis existants
  document.querySelectorAll('.confetti-container').forEach(container => {
    container.parentNode?.removeChild(container);
  });
  
  const confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';
  confettiContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
    overflow: hidden;
  `;
  
  document.body.appendChild(confettiContainer);
  
  // Palette de couleurs pour les confettis
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  
  // Créer des confettis avec un décalage temporel
  for (let i = 0; i < 30; i++) {
    setTimeout(() => createSingleConfetti(confettiContainer, colors), i * 50);
  }
  
  // Nettoyage automatique après la fin de l'animation
  setTimeout(() => {
    confettiContainer.parentNode?.removeChild(confettiContainer);
  }, 4000);
}

function createSingleConfetti(container, colors) {
  const confetti = document.createElement('div');
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 8 + 4;
  const startX = Math.random() * window.innerWidth;
  const duration = Math.random() * 2 + 2;
  
  confetti.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    background-color: ${color};
    top: -20px;
    left: ${startX}px;
    border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    animation: confettiFall ${duration}s ease-out forwards;
    transform-origin: center;
    opacity: 0.9;
  `;
  
  container.appendChild(confetti);
  
  // Nettoyer l'élément confetti après la fin de l'animation
  setTimeout(() => confetti.parentNode?.removeChild(confetti), duration * 1000 + 500);
}

export function addConfettiStyles() {
  // Ne pas ajouter les styles s'ils existent déjà
  if (document.getElementById('confetti-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'confetti-styles';
  style.textContent = `
    @keyframes confettiFall {
      0% {
        transform: translateY(-20px) rotate(0deg);
        opacity: 1;
      }
      25% {
        transform: translateY(200px) rotate(90deg);
        opacity: 0.8;
      }
      50% {
        transform: translateY(400px) rotate(180deg);
        opacity: 0.6;
      }
      75% {
        transform: translateY(600px) rotate(270deg);
        opacity: 0.4;
      }
      100% {
        transform: translateY(800px) rotate(360deg);
        opacity: 0;
      }
    }
    
    .celebration-page {
      position: relative;
      overflow: hidden;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Form header management (title and description updates)
 */

let formPagesData = null;

// Charger les données des pages du formulaire
export async function loadFormPages() {
  try {
    const response = await fetch('/data/form_pages.json');
    if (!response.ok) throw new Error('Erreur de chargement des pages');
    formPagesData = await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des pages:', error);
    formPagesData = { pages: [] };
  }
  return formPagesData;
}

export function updateFormHeader(q) {
  const titleEl = document.getElementById('formTitle');
  const descEl = document.getElementById('formDescription');
  
  if (!q) {
    if (titleEl) titleEl.textContent = 'Formulaire terminé';
    if (descEl) descEl.textContent = 'Merci d\'avoir rempli le formulaire';
    return;
  }
  
  const pageTitle = q.pageTitle || q.sectionTitle || q.title || 'Formulaire';
  
  // Mettre à jour le titre
  if (titleEl) {
    titleEl.textContent = pageTitle;
  }
  
  // Mettre à jour la description
  if (descEl) {
    let description = '';
    
    // Chercher la description dans form_pages.json
    if (formPagesData && formPagesData.pages) {
      const page = formPagesData.pages.find(p => p.title === pageTitle);
      if (page && page.description) {
        description = page.description;
      } else {
        // Si pas trouvé, utiliser les valeurs par défaut
        description = q.sectionDescription || q.description || '';
      }
    } else {
      // Si les données ne sont pas encore chargées, utiliser les valeurs par défaut
      description = q.sectionDescription || q.description || '';
    }
    
    descEl.textContent = description;
  }
  
  // Mettre à jour le titre de la page
  document.title = `${pageTitle} — CERFA MDPH`;
}

// Initialiser le chargement des pages au démarrage
loadFormPages();

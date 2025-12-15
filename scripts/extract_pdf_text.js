import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔄 Extraction du texte du PDF CERFA...');
  
  const root = path.join(__dirname, '..');
  const pdfPath = path.join(root, 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF introuvable: ${pdfPath}`);
    process.exit(1);
  }

  const existingPdfBytes = fs.readFileSync(pdfPath);
  console.log(`📄 Taille du PDF: ${existingPdfBytes.length} bytes`);
  
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  
  console.log(`📊 Nombre de pages: ${pages.length}`);
  
  // Analyser les 3 premières pages pour comprendre la structure
  for (let i = 0; i < Math.min(3, pages.length); i++) {
    const page = pages[i];
    console.log(`\n=== PAGE ${i + 1} ===`);
    console.log(`Dimensions: ${page.getWidth()} x ${page.getHeight()}`);
    
    // Essayer d'extraire le texte (limité avec pdf-lib)
    try {
      const textContent = page.getTextContent ? await page.getTextContent() : null;
      if (textContent) {
        console.log('Texte extrait:', textContent.slice(0, 500) + '...');
      } else {
        console.log('⚠️ Extraction de texte non disponible avec pdf-lib');
      }
    } catch (err) {
      console.log('⚠️ Impossible d\'extraire le texte:', err.message);
    }
  }
  
  // Analyser les champs par page
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  const fieldsByPage = {};
  fields.forEach(field => {
    const name = field.getName();
    const pageMatch = name.match(/ p(\d+)$/);
    const pageNum = pageMatch ? pageMatch[1] : 'no-suffix';
    
    if (!fieldsByPage[pageNum]) fieldsByPage[pageNum] = [];
    fieldsByPage[pageNum].push(name);
  });
  
  console.log('\n=== RÉPARTITION DES CHAMPS PAR PAGE ===');
  Object.keys(fieldsByPage).sort().forEach(pageNum => {
    console.log(`📄 Page ${pageNum}: ${fieldsByPage[pageNum].length} champs`);
    
    // Afficher quelques exemples de champs pour comprendre le contenu
    const examples = fieldsByPage[pageNum].slice(0, 5);
    examples.forEach(name => {
      console.log(`  - "${name}"`);
    });
    if (fieldsByPage[pageNum].length > 5) {
      console.log(`  ... et ${fieldsByPage[pageNum].length - 5} autres`);
    }
  });
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});

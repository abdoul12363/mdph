import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkMapping() {
  try {
    const pdfPath = path.join(__dirname, '../public/Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF non trouvé:', pdfPath);
      return;
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('🔍 Recherche des champs liés au dossier MDPH...\n');

    // Chercher les champs liés au dossier
    const relevantFields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('dossier') || 
             name.includes('mdph') || 
             name.includes('numéro') ||
             name.includes('département');
    });

    console.log(`📋 ${relevantFields.length} champs trouvés :\n`);

    relevantFields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name.replace('PDF', '').replace('Field', '');
      console.log(`${index + 1}. "${name}"`);
      console.log(`   Type: ${type}`);
      console.log('');
    });

    // Vérifier l'ordre des champs de la page 2 selon le PDF
    console.log('\n🔍 Ordre des champs page 2 dans le PDF :\n');
    
    const page2Fields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('p2') || name.includes('page 2');
    });

    console.log(`📋 ${page2Fields.length} champs page 2 trouvés :\n`);
    
    page2Fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name.replace('PDF', '').replace('Field', '');
      console.log(`${index + 1}. "${name}"`);
      console.log(`   Type: ${type}`);
      console.log('');
    });

    // Vérifier notre mapping corrigé
    console.log('🔧 Vérification du mapping corrigé :\n');
    
    // Champs de la page 1
    const page1Mapping = [
      'Première demande à la MDPH',
      'Ma situation a changé',
      'Réévaluation de ma situation',
      'Renouvellement droits identiques',
      'Aidant familial souhaite exprimer sa situation',
      'Numéro de dossier',
      'Indiquer dans quel département', 
      'Oui, j\'ai déja un dossier à la MDPH'
    ];

    // Champs de la page 2 (échantillon)
    const page2Mapping = [
      'Nom de naissance p2',
      'Nom d\'usage p2',
      'Prénoms p2',
      'Sexe H p2',
      'Sexe F p2',
      'DN J p2',
      'DN M p2',
      'DN A p2',
      'Commune de naissance p2',
      'Adresse p2',
      'Code postal 1 p2',
      'Commune p2',
      'Pays p2'
    ];

    const ourMapping = [...page1Mapping, ...page2Mapping];

    ourMapping.forEach(fieldName => {
      try {
        const field = form.getField(fieldName);
        console.log(`✅ "${fieldName}" - TROUVÉ`);
      } catch (e) {
        console.log(`❌ "${fieldName}" - NON TROUVÉ`);
        
        // Chercher des champs similaires
        const similar = fields.filter(f => {
          const name = f.getName().toLowerCase();
          const search = fieldName.toLowerCase().replace(/_/g, ' ');
          return name.includes(search.split(' ')[0]) || name.includes(search.split(' ')[1]);
        });
        
        if (similar.length > 0) {
          console.log(`   Champs similaires trouvés:`);
          similar.forEach(f => console.log(`   - "${f.getName()}"`));
        }
      }
    });

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

checkMapping();

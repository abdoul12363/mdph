import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔄 Analyse complète de TOUS les champs PDF...');
  
  const root = path.join(__dirname, '..');
  const pdfPath = path.join(root, 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
  
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  console.log(`📊 TOTAL: ${fields.length} champs trouvés dans le PDF\n`);
  
  // Lister TOUS les champs avec leur type
  console.log('=== LISTE COMPLÈTE DE TOUS LES CHAMPS ===');
  fields.forEach((field, index) => {
    const name = field.getName();
    const type = field.constructor.name;
    console.log(`${index + 1}. "${name}" (${type})`);
  });
  
  // Charger les questions existantes
  const questionsPath = path.join(root, 'data', 'questions_cerfa.json');
  const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  
  // Collecter tous les champs déjà mappés
  const mappedFields = new Set();
  questionsData.questions.forEach(q => {
    const map = q.pdf_field_name;
    if (typeof map === 'string' && map) {
      mappedFields.add(map);
    } else if (Array.isArray(map)) {
      map.forEach(fieldName => mappedFields.add(fieldName));
    } else if (map && typeof map === 'object') {
      Object.values(map).forEach(fieldName => mappedFields.add(fieldName));
    }
  });
  
  // Identifier les champs NON mappés
  const unmappedFields = [];
  fields.forEach(field => {
    const name = field.getName();
    if (!mappedFields.has(name)) {
      unmappedFields.push({
        name: name,
        type: field.constructor.name
      });
    }
  });
  
  console.log(`\n=== CHAMPS NON MAPPÉS (${unmappedFields.length}) ===`);
  unmappedFields.forEach((field, index) => {
    console.log(`${index + 1}. "${field.name}" (${field.type})`);
  });
  
  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`  - Total champs PDF: ${fields.length}`);
  console.log(`  - Champs mappés: ${mappedFields.size}`);
  console.log(`  - Champs non mappés: ${unmappedFields.length}`);
  console.log(`  - Couverture: ${Math.round((mappedFields.size / fields.length) * 100)}%`);
  
  // Grouper les champs non mappés par type
  const unmappedByType = {};
  unmappedFields.forEach(field => {
    if (!unmappedByType[field.type]) {
      unmappedByType[field.type] = [];
    }
    unmappedByType[field.type].push(field.name);
  });
  
  console.log(`\n=== CHAMPS NON MAPPÉS PAR TYPE ===`);
  Object.entries(unmappedByType).forEach(([type, fieldNames]) => {
    console.log(`\n${type} (${fieldNames.length}):`);
    fieldNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });
  });
}

main().catch(console.error);

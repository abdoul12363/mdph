import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function extractAllPDFFields() {
  try {
    console.log('📄 Extraction de tous les champs du PDF CERFA...\n');
    
    // Lire le fichier PDF
    const pdfBytes = fs.readFileSync('./public/Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Obtenir tous les champs
    const fields = form.getFields();
    
    console.log(`📋 ${fields.length} champs trouvés au total :\n`);
    
    // Organiser les champs par type et par nom
    const fieldsByType = {
      text: [],
      checkbox: [],
      radio: [],
      dropdown: [],
      other: []
    };
    
    fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name;
      
      const fieldInfo = {
        index: index + 1,
        name: name,
        type: type
      };
      
      if (type.includes('Text')) {
        fieldsByType.text.push(fieldInfo);
      } else if (type.includes('CheckBox')) {
        fieldsByType.checkbox.push(fieldInfo);
      } else if (type.includes('RadioGroup')) {
        fieldsByType.radio.push(fieldInfo);
      } else if (type.includes('Dropdown')) {
        fieldsByType.dropdown.push(fieldInfo);
      } else {
        fieldsByType.other.push(fieldInfo);
      }
    });
    
    // Afficher par type
    console.log('🔤 CHAMPS TEXTE:');
    fieldsByType.text.forEach(field => {
      console.log(`  ${field.index}. "${field.name}"`);
    });
    
    console.log('\n☑️  CASES À COCHER:');
    fieldsByType.checkbox.forEach(field => {
      console.log(`  ${field.index}. "${field.name}"`);
    });
    
    console.log('\n🔘 BOUTONS RADIO:');
    fieldsByType.radio.forEach(field => {
      console.log(`  ${field.index}. "${field.name}"`);
    });
    
    if (fieldsByType.dropdown.length > 0) {
      console.log('\n📋 LISTES DÉROULANTES:');
      fieldsByType.dropdown.forEach(field => {
        console.log(`  ${field.index}. "${field.name}"`);
      });
    }
    
    if (fieldsByType.other.length > 0) {
      console.log('\n❓ AUTRES TYPES:');
      fieldsByType.other.forEach(field => {
        console.log(`  ${field.index}. "${field.name}" (${field.type})`);
      });
    }
    
    // Rechercher spécifiquement les champs liés aux représentants légaux
    console.log('\n🔍 CHAMPS LIÉS AUX REPRÉSENTANTS LÉGAUX:');
    const legalFields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('représentant') || name.includes('réprésentant') || 
             name.includes('légal') || name.includes('legal') ||
             name.includes('parent') || name.includes('autorité') ||
             name.includes('autorite');
    });
    
    if (legalFields.length > 0) {
      legalFields.forEach((field, index) => {
        console.log(`  ${index + 1}. "${field.getName()}" (${field.constructor.name})`);
      });
    } else {
      console.log('  Aucun champ trouvé avec ces mots-clés.');
    }
    
    // Rechercher les champs de sécurité sociale
    console.log('\n🔍 CHAMPS LIÉS À LA SÉCURITÉ SOCIALE:');
    const ssFields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('ss') || name.includes('sécurité') || 
             name.includes('securite') || name.includes('social') ||
             name.includes('numero') || name.includes('numéro');
    });
    
    if (ssFields.length > 0) {
      ssFields.forEach((field, index) => {
        console.log(`  ${index + 1}. "${field.getName()}" (${field.constructor.name})`);
      });
    }
    
    // Exporter la liste complète dans un fichier JSON
    const allFieldsData = {
      totalFields: fields.length,
      fieldsByType: {
        text: fieldsByType.text.map(f => f.name),
        checkbox: fieldsByType.checkbox.map(f => f.name),
        radio: fieldsByType.radio.map(f => f.name),
        dropdown: fieldsByType.dropdown.map(f => f.name),
        other: fieldsByType.other.map(f => ({ name: f.name, type: f.type }))
      },
      allFields: fields.map(field => ({
        name: field.getName(),
        type: field.constructor.name
      }))
    };
    
    fs.writeFileSync('./scripts/all-pdf-fields.json', JSON.stringify(allFieldsData, null, 2));
    console.log('\n💾 Liste complète exportée dans: scripts/all-pdf-fields.json');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction des champs PDF:', error);
  }
}

extractAllPDFFields();

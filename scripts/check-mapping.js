import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzePage3() {
  try {
    const pdfPath = join(__dirname, '..', 'public', 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
    const outputPath = join(__dirname, 'page3-analysis.json');

    console.log('🔍 Analyse de la page 3 du formulaire PDF...');

    // Charger le document PDF
    const pdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Filtrer les champs de la page 3
    const page3Fields = [];
    
    for (const field of fields) {
      const fieldName = field.getName();
      const widgets = field.acroField.getWidgets();
      
      // Vérifier si le champ est sur la page 3 (en supposant que les champs de la page 3 contiennent 'p3' ou 'page 3')
      if (fieldName.toLowerCase().includes('p3') || fieldName.toLowerCase().includes('page 3')) {
        const fieldInfo = {
          name: fieldName,
          type: field.constructor.name.replace('PDF', '').replace('Field', ''),
          isReadOnly: field.isReadOnly(),
          isRequired: field.isRequired(),
          page: 3
        };

        // Ajouter des informations spécifiques au type de champ
        if (field.constructor.name === 'PDFTextField') {
          fieldInfo.maxLength = field.getMaxLength();
          fieldInfo.isMultiline = field.isMultiline();
          fieldInfo.isPassword = field.isPassword();
        } else if (field.constructor.name === 'PDFRadioGroup' || 
                  field.constructor.name === 'PDFDropdown' || 
                  field.constructor.name === 'PDFOptionList') {
          fieldInfo.options = field.getOptions ? field.getOptions() : [];
        } else if (field.constructor.name === 'PDFCheckBox') {
          fieldInfo.isChecked = field.isChecked();
        }

        page3Fields.push(fieldInfo);
      }
    }

    // Trier par nom de champ
    page3Fields.sort((a, b) => a.name.localeCompare(b.name));

    // Afficher les résultats
    console.log(`\n📋 ${page3Fields.length} champs trouvés dans la page 3 :\n`);
    
    page3Fields.forEach((field, index) => {
      console.log(`${index + 1}. "${field.name}"`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Obligatoire: ${field.isRequired ? 'Oui' : 'Non'}`);
      console.log(`   Lecture seule: ${field.isReadOnly ? 'Oui' : 'Non'}`);
      
      if (field.type === 'TextField' && field.maxLength) {
        console.log(`   Longueur max: ${field.maxLength}`);
      }
      
      if (field.options) {
        console.log(`   Options: ${field.options.length} options disponibles`);
      }
      
      console.log('');
    });

    // Enregistrer les résultats dans un fichier
    const analysis = {
      totalFields: page3Fields.length,
      fields: page3Fields,
      timestamp: new Date().toISOString()
    };

    writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n✅ Analyse terminée. Résultats enregistrés dans : ${outputPath}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse de la page 3:', error);
  }
}

analyzePage3();

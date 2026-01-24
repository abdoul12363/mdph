import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction utilitaire pour créer un répertoire s'il n'existe pas
function ensureDirectoryExists(dirPath) {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

// Fonction utilitaire pour obtenir le numéro de page d'un widget
function getPageNumber(widget) {
    try {
        return widget.Parent().getPageNumber();
    } catch (e) {
        return 'N/A';
    }
}

async function analyzePdfForm() {
    try {
        const pdfPath = join(__dirname, '..', '..', 'public', 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
        const outputPath = join(__dirname, '..', '_generated', 'pdf-form-analysis.json');
        const outputDir = dirname(outputPath);
        ensureDirectoryExists(outputDir);

        console.log('🔍 Analyse du formulaire PDF en cours...');

        // Charger le document PDF
        const pdfBytes = readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log(`📋 ${fields.length} champs trouvés dans le formulaire`);

        // Analyser chaque champ
        const analysis = {
            totalFields: fields.length,
            fieldTypes: {},
            pages: {},
            fields: []
        };

        for (const field of fields) {
            const fieldName = field.getName();
            const fieldType = field.constructor.name;
            const widgets = field.acroField.getWidgets();
            const pageNumbers = [...new Set(widgets.map(getPageNumber))].filter(p => p !== 'N/A');
            
            // Compter les types de champs
            analysis.fieldTypes[fieldType] = (analysis.fieldTypes[fieldType] || 0) + 1;

            // Organiser par page
            pageNumbers.forEach(pageNum => {
                if (!analysis.pages[pageNum]) {
                    analysis.pages[pageNum] = [];
                }
                analysis.pages[pageNum].push(fieldName);
            });

            // Détails du champ
            const fieldInfo = {
                name: fieldName,
                type: fieldType,
                pages: pageNumbers,
                isReadOnly: field.isReadOnly(),
                isRequired: field.isRequired(),
                hasAppearance: widgets.length > 0
            };

            // Ajouter des informations spécifiques au type de champ
            if (fieldType === 'PDFTextField') {
                fieldInfo.maxLength = field.getMaxLength();
                fieldInfo.isMultiline = field.isMultiline();
                fieldInfo.isPassword = field.isPassword();
            } else if (fieldType === 'PDFRadioGroup') {
                fieldInfo.options = field.getOptions();
            } else if (fieldType === 'PDFDropdown' || fieldType === 'PDFOptionList') {
                fieldInfo.options = field.getOptions();
                fieldInfo.isMultiselect = fieldType === 'PDFOptionList' ? field.isMultiselect() : false;
            } else if (fieldType === 'PDFCheckBox') {
                fieldInfo.isChecked = field.isChecked();
            }

            analysis.fields.push(fieldInfo);
        }

        // Trier les champs par page et position
        analysis.fields.sort((a, b) => {
            if (a.pages[0] !== b.pages[0]) {
                return a.pages[0] - b.pages[0];
            }
            return a.name.localeCompare(b.name);
        });

        // Enregistrer l'analyse dans un fichier
        writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
        console.log(`✅ Analyse terminée. Résultats enregistrés dans: ${outputPath}`);
        
        // Afficher un résumé
        console.log('\n📊 Résumé de l\'analyse:');
        console.log(`- Total de champs: ${analysis.totalFields}`);
        console.log('Répartition par type:');
        for (const [type, count] of Object.entries(analysis.fieldTypes)) {
            console.log(`  - ${type}: ${count}`);
        }
        console.log(`- Pages contenant des champs: ${Object.keys(analysis.pages).length}`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse du formulaire:', error);
        process.exit(1);
    }
}

analyzePdfForm();

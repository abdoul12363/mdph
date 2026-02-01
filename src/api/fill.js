import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { normalizeOuiNon, splitDateToDMY } from '../utils/utils.js';

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const root = process.cwd();

    const pdfPath = path.join(root, 'public', 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
    const formPagesPath = path.join(root, 'public', 'data', 'form_pages.json');

    if (!fs.existsSync(pdfPath)) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'PDF CERFA introuvable sur le serveur.' }));
      return;
    }

    const formPagesData = readJson(formPagesPath);
    const responses = req.body && typeof req.body === 'object' ? req.body : {};

    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Charger toutes les questions de toutes les pages
    const allQuestions = [];
    for (const pageConfig of formPagesData.pages) {
      try {
        const pageQuestionsPath = path.join(root, 'public', 'data', pageConfig.questionsFile);
        const pageData = readJson(pageQuestionsPath);
        
        if (pageData.sections) {
          for (const section of pageData.sections) {
            if (section.questions) {
              allQuestions.push(...section.questions);
            }
          }
        }
      } catch (pageError) {
        console.error(`Erreur lors du chargement de ${pageConfig.questionsFile}:`, pageError);
      }
    }

    for (const q of allQuestions) {
      const answer = responses[q.id];
      if (answer === undefined || answer === null || answer === '') continue;

      const map = q.pdf_mapping?.field || q.pdf_field_name;

      if (typeof map === 'string') {
        try {
          const field = form.getField(map);
          const t = field.constructor.name;

          if (t === 'PDFTextField') {
            field.setText(String(answer));
          } else if (t === 'PDFCheckBox') {
            const yn = normalizeOuiNon(answer);
            if (yn === 'oui') field.check(); else field.uncheck();
          } else {
            if (field.setText) field.setText(String(answer));
          }
        } catch (err) {
          console.warn(`Champ PDF non trouvé: ${map}`, err.message);
        }
        continue;
      }

      if (Array.isArray(map) && (q.type === 'date' || q.type_champ === 'date') && map.length === 3) {
        const { d, m, y } = splitDateToDMY(String(answer));
        const [fd, fm, fy] = map;
        try { form.getTextField(fd).setText(d); } catch {}
        try { form.getTextField(fm).setText(m); } catch {}
        try { form.getTextField(fy).setText(y); } catch {}
        continue;
      }

      if (map && typeof map === 'object' && !Array.isArray(map)) {
        if (q.pdf_mapping?.values) {
          // Nouveau format avec pdf_mapping.values
          const chosen = String(answer);
          const fieldName = q.pdf_mapping.values[chosen];
          if (fieldName) {
            try {
              form.getCheckBox(fieldName).check();
            } catch (err) {
              console.warn(`Champ PDF checkbox non trouvé: ${fieldName}`, err.message);
            }
          }
        } else {
          // Ancien format
          const chosen = String(answer);
          const fieldName = map[chosen];
          if (fieldName) {
            try {
              form.getCheckBox(fieldName).check();
            } catch (err) {
              console.warn(`Champ PDF checkbox non trouvé: ${fieldName}`, err.message);
            }
          }
        }
        continue;
      }
    }

    // Remplissage automatique nom/prénom sur toutes les pages
    const nomNaissance = responses['q_nom_naissance'];
    const prenoms = responses['q_prenoms'];
    
    if (nomNaissance && prenoms) {
      const nomComplet = `${prenoms} ${nomNaissance}`;
      
      // Champ "Nom et prénom de la personne" (présent sur plusieurs pages)
      try {
        form.getTextField('Nom et prénom de la personne').setText(nomComplet);
      } catch {}
      
      // Champs nom/prénom spécifiques par page (si ils existent)
      const pagesFields = [
        'Nom p3', 'Prénom p3',
        'Nom p4', 'Prénom p4', 
        'Nom p5', 'Prénom p5',
        'Nom p6', 'Prénom p6',
        'Nom p7', 'Prénom p7',
        'Nom p8', 'Prénom p8',
        'Nom p9', 'Prénom p9'
      ];
      
      pagesFields.forEach(fieldName => {
        try {
          if (fieldName.includes('Nom')) {
            form.getTextField(fieldName).setText(nomNaissance);
          } else if (fieldName.includes('Prénom')) {
            form.getTextField(fieldName).setText(prenoms);
          }
        } catch {}
      });
    }

    try { form.flatten(); } catch {}

    const pdfBytes = await pdfDoc.save();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cerfa_rempli.pdf"');
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Erreur génération PDF', details: String(err?.message || err) }));
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function splitDateToDMY(value) {
  // Accepte "YYYY-MM-DD" (input type=date) ou "DD/MM/YYYY"
  if (!value) return { d: '', m: '', y: '' };

  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const fr = /^\d{2}\/\d{2}\/\d{4}$/;

  if (iso.test(value)) {
    const [y, m, d] = value.split('-');
    return { d, m, y };
  }

  if (fr.test(value)) {
    const [d, m, y] = value.split('/');
    return { d, m, y };
  }

  // fallback: on ne sait pas
  return { d: '', m: '', y: '' };
}

function normalizeOuiNon(v) {
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (!v) return 'non';
  const s = String(v).trim().toLowerCase();
  if (['oui', 'o', 'yes', 'y', '1', 'true'].includes(s)) return 'oui';
  return 'non';
}

async function main() {
  const root = path.join(__dirname, '..');

  const pdfPath = path.join(root, 'Formulaire-de-demande-a-la-MDPH-Document-cerfa_15692-012-combine.pdf');
  const questionsPath = path.join(root, 'data', 'questions_cerfa.json');
  const responsesPath = path.join(root, 'data', 'sample_responses.json');

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF introuvable: ${pdfPath}`);
    console.error('➡️ Copie le PDF CERFA dans cerdawrok avec ce nom exact.');
    process.exit(1);
  }

  const questionsData = readJson(questionsPath);
  const responses = readJson(responsesPath);

  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  for (const q of questionsData.questions) {
    const answer = responses[q.id];
    if (answer === undefined || answer === null || answer === '') continue;

    const map = q.pdf_field_name;

    // 1) mapping simple: string => setText / check
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
          // fallback: tenter setText
          if (field.setText) field.setText(String(answer));
        }
      } catch {
        // champ absent => on ignore pour l'instant
      }
      continue;
    }

    // 2) mapping date: [jour, mois, annee]
    if (Array.isArray(map) && q.type_champ === 'date' && map.length === 3) {
      const { d, m, y } = splitDateToDMY(String(answer));
      const [fd, fm, fy] = map;
      try { form.getTextField(fd).setText(d); } catch {}
      try { form.getTextField(fm).setText(m); } catch {}
      try { form.getTextField(fy).setText(y); } catch {}
      continue;
    }

    // 3) mapping choix: {"Masculin": "Sexe H p2", "Féminin": "Sexe F p2"}
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      const chosen = String(answer);
      const fieldName = map[chosen];
      if (!fieldName) continue;
      try {
        form.getCheckBox(fieldName).check();
      } catch {
        // ignore
      }
      continue;
    }
  }

  // Option: aplatir le formulaire pour éviter que les champs restent éditables
  try {
    form.flatten();
  } catch {}

  ensureDir(path.join(root, 'output'));
  const outPath = path.join(root, 'output', 'cerfa_rempli.pdf');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);

  console.log(`✅ PDF généré: ${outPath}`);
}

main().catch((err) => {
  console.error('Erreur fill:', err);
  process.exit(1);
});

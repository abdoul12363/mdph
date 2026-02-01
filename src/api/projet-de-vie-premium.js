import fs from 'fs';
import path from 'path';
import { generateProjetDeViePdf } from './lib/projet-de-vie-pdf.js';
import { chatCompletion } from './lib/ai/openaiClient.js';

async function generateProjetDeVieWithOpenAI(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const fullFormJson = JSON.stringify(payload ?? {});

  const messages = [
    {
      role: 'system',
      content:
        "Tu réécris uniquement à partir des textes fournis. Interdictions: inventer, ajouter, compléter, déduire, changer le sens. Style: première personne du singulier, mots simples, verbes concrets. Pas de jargon administratif ou médical absent des textes. Tu peux seulement: réordonner légèrement, simplifier, supprimer les répétitions inutiles. Sortie: un texte unique compact, sans titres, sans listes, sans puces, sans markdown, sans conclusion. Pas de séparation en 4 parties.",
    },
    {
      role: 'user',
      content:
        'Réécris en un texte unique compact à partir des réponses brutes du formulaire (JSON). Utilise uniquement ces informations, sans rien inventer.\n\n' +
        fullFormJson,
    },
  ];

  const result = await chatCompletion({ apiKey, model, messages, parseJson: false });
  return typeof result?.raw === 'string' ? result.raw.trim() : '';
}

function pickString(obj, key) {
  if (!obj || typeof obj !== 'object') return '';
  const v = obj[key];
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  return String(v);
}

function pickFirstString(obj, keys) {
  for (const k of keys) {
    const v = pickString(obj, k);
    if (String(v || '').trim() !== '') return v;
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const pdvRoot = process.cwd();
    const pdvPdfPath = path.join(pdvRoot, 'public', 'pdf', 'mdph-projet-de-vie.pdf');
    const pdvBody = req.body && typeof req.body === 'object' ? req.body : {};

    if (!fs.existsSync(pdvPdfPath)) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'PDF introuvable sur le serveur.' }));
      return;
    }

    const pdvPrenom = pickFirstString(pdvBody, ['prenom', 'prenom:']);
    const pdvNom = pickFirstString(pdvBody, ['nom', 'nom:']);

    const pdvTexteCompact = await generateProjetDeVieWithOpenAI(pdvBody);
    const pdvBlocks = [{ title: '', body: pdvTexteCompact }];

    try {
      const pdvPdfBytes = await generateProjetDeViePdf({
        pdfPath: pdvPdfPath,
        prenom: pdvPrenom,
        nom: pdvNom,
        blocks: pdvBlocks,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="mdph-projet-de-vie-rempli.pdf"');
      res.end(Buffer.from(pdvPdfBytes));
      return;
    } catch (e) {
      if (String(e?.message || e).includes('Champs PDF Text2/Text4')) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Champs PDF Text2/Text4 introuvables ou non exploitables.' }));
        return;
      }
      throw e;
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'PDF generation failed', details: String(err?.message || err) }));
  }
}

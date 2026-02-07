import fs from 'fs';
import path from 'path';
import { generateProjetDeViePdf } from './lib/projet-de-vie-pdf.js';
import { chatCompletion } from './lib/ai/openaiClient.js';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function mollieGetPayment(paymentId) {
  const apiKeyRaw = process.env.MOLLIE_API_KEY;
  const apiKey = String(apiKeyRaw || '').replace(/[\r\n]+/g, '').trim();
  if (!apiKey) throw new Error('Missing MOLLIE_API_KEY');

  const resp = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const bodyText = await resp.text().catch(() => '');
  if (!resp.ok) {
    throw new Error(`Mollie error ${resp.status}: ${bodyText || resp.statusText}`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

async function generateProjetDeVieWithOpenAI(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

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
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed. Use POST.' });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const paymentId = String(payload.paymentId || payload.payment_id || '');
    const formResponses = payload.responses && typeof payload.responses === 'object' ? payload.responses : {};

    if (!paymentId) {
      return json(res, 400, { error: 'Missing paymentId' });
    }

    const payment = await mollieGetPayment(paymentId);
    const status = String(payment?.status || '');
    if (status !== 'paid') {
      return json(res, 402, { error: 'Payment not completed' });
    }

    const offer = payment?.metadata?.offer ? String(payment.metadata.offer) : '';
    const advisor = payment?.metadata?.advisor ? String(payment.metadata.advisor) : '';
    if (offer !== '49' && offer !== '79') {
      return json(res, 400, { error: 'Invalid offer metadata' });
    }
    if (offer === '79' && !advisor) {
      return json(res, 400, { error: 'Missing advisor metadata' });
    }

    const pdvRoot = process.cwd();
    const pdfPath = path.join(pdvRoot, 'public', 'pdf', 'mdph-projet-de-vie.pdf');
    if (!fs.existsSync(pdfPath)) {
      return json(res, 500, { error: 'PDF introuvable sur le serveur.' });
    }

    const prenom = pickFirstString(formResponses, ['prenom', 'prenom:']);
    const nom = pickFirstString(formResponses, ['nom', 'nom:']);
    const texteCompact = await generateProjetDeVieWithOpenAI(formResponses);
    const blocks = [{ title: '', body: texteCompact }];

    const pdfBytes = await generateProjetDeViePdf({
      pdfPath,
      prenom,
      nom,
      blocks,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="mdph-projet-de-vie-rempli.pdf"');
    res.end(Buffer.from(pdfBytes));
    return;
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Download paid PDF failed', details: String(e?.message || e) });
  }
}

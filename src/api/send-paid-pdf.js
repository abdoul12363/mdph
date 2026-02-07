import fs from 'fs';
import path from 'path';
import { generateProjetDeViePdf } from './lib/projet-de-vie-pdf.js';
import { chatCompletion } from './lib/ai/openaiClient.js';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function stripeRequest({ method, path }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');

  const url = `https://api.stripe.com${path}`;
  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await resp.text().catch(() => '');
  if (!resp.ok) {
    throw new Error(`Stripe error ${resp.status}: ${text || resp.statusText}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function resendSendEmail({ to, subject, text, pdfBytes }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  if (!from) throw new Error('Missing RESEND_FROM');

  const content = Buffer.from(pdfBytes).toString('base64');

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      attachments: [
        {
          filename: 'mdph-projet-de-vie-rempli.pdf',
          content,
        },
      ],
    }),
  });

  const dataText = await resp.text().catch(() => '');
  if (!resp.ok) {
    throw new Error(`Resend error ${resp.status}: ${dataText || resp.statusText}`);
  }

  try {
    return JSON.parse(dataText);
  } catch {
    return { ok: true };
  }
}

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
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  return json(res, 410, { error: 'Endpoint deprecated. Use Mollie flow and /api/download-paid-pdf.' });

  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const sessionId = String(payload.sessionId || '');
    const formResponses = payload.responses && typeof payload.responses === 'object' ? payload.responses : {};

    if (!sessionId) {
      return json(res, 400, { error: 'Missing sessionId' });
    }

    const session = await stripeRequest({ method: 'GET', path: `/v1/checkout/sessions/${encodeURIComponent(sessionId)}` });
    const paymentStatus = session?.payment_status;
    const status = session?.status;

    if (paymentStatus !== 'paid' || status !== 'complete') {
      return json(res, 402, { error: 'Payment not completed' });
    }

    const offer = String(session?.metadata?.offer || '');
    const advisor = String(session?.metadata?.advisor || '');

    if (offer !== '49' && offer !== '79') {
      return json(res, 400, { error: 'Invalid offer metadata' });
    }

    if (offer === '79' && !advisor) {
      return json(res, 400, { error: 'Missing advisor metadata' });
    }

    const stripeEmail = session?.customer_details?.email || session?.customer_email || '';
    const formEmail = pickString(formResponses, 'email');

    if (!stripeEmail) {
      return json(res, 400, { error: 'Stripe session has no email' });
    }

    if (!formEmail || String(formEmail).toLowerCase().trim() !== String(stripeEmail).toLowerCase().trim()) {
      return json(res, 400, { error: 'Email mismatch' });
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

    const calendlyUrl = process.env.CALENDLY_URL || 'https://calendly.com/';

    const subject = offer === '49'
      ? 'Votre projet de vie MDPH est prêt'
      : 'Votre projet de vie MDPH + échange est prêt';

    const text = offer === '49'
      ? "Merci. Votre document final est joint à cet email."
      : `Merci. Votre document final est joint à cet email.\n\nRéservez votre échange ici : ${calendlyUrl}`;

    await resendSendEmail({
      to: stripeEmail,
      subject,
      text,
      pdfBytes,
    });

    return json(res, 200, {
      ok: true,
      offer,
      email: stripeEmail,
      calendlyUrl: offer === '79' ? calendlyUrl : null,
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Send paid PDF failed', details: String(e?.message || e) });
  }
}

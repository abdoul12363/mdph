function asOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]/i.test(host);
  const proto = isLocal ? 'http' : (req.headers['x-forwarded-proto'] || 'https');
  return `${proto}://${host}`;
}

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function mollieCreatePayment({ amountValue, description, redirectUrl, webhookUrl, metadata }) {
  const apiKeyRaw = process.env.MOLLIE_API_KEY;
  const apiKey = String(apiKeyRaw || '').replace(/[\r\n]+/g, '').trim();
  if (!apiKey) throw new Error('Missing MOLLIE_API_KEY');

  const resp = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(Object.assign(
      { amount: { currency: 'EUR', value: amountValue }, description, redirectUrl, metadata },
      webhookUrl ? { webhookUrl } : {}
    )),
  });

  const text = await resp.text().catch(() => '');
  if (!resp.ok) {
    throw new Error(`Mollie error ${resp.status}: ${text || resp.statusText}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const offer = String(payload.offer || '');
    const advisor = payload.advisor ? String(payload.advisor) : '';

    if (offer !== '49' && offer !== '79' && offer !== 'recours') {
      return json(res, 400, { error: 'Invalid offer' });
    }

    if (offer === '79' && !advisor) {
      return json(res, 400, { error: 'Missing advisor' });
    }

    const origin = asOrigin(req);

    const amountCents = offer === 'recours' ? 4990 : (offer === '49' ? 4900 : 7900);
    const productName = offer === 'recours'
      ? 'Offre Recours MDPH – Accompagnement complet'
      : (offer === '49'
        ? 'Projet de vie structuré pour la MDPH'
        : 'Accompagnement personnalisé (projet de vie + échange)');

    const amountValue = (amountCents / 100).toFixed(2);
    const redirectUrl = (offer === '79' || offer === 'recours')
      ? `${origin}/prendre-rendez_vous`
      : `${origin}/telecharger-votre-pdf`;
    const isLocal = /localhost|127\.0\.0\.1|\[::1\]/i.test(origin);
    const webhookUrl = isLocal ? undefined : `${origin}/api/mollie-webhook`;

    const payment = await mollieCreatePayment({
      amountValue,
      description: productName,
      redirectUrl,
      webhookUrl,
      metadata: {
        offer,
        advisor: advisor || undefined,
      },
    });

    const checkoutUrl = payment?._links?.checkout?.href;
    const paymentId = payment?.id;
    if (!checkoutUrl || !paymentId) {
      return json(res, 500, { error: 'Mollie payment creation failed' });
    }

    return json(res, 200, {
      url: checkoutUrl,
      paymentId,
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Checkout session failed', details: String(e?.message || e) });
  }
}

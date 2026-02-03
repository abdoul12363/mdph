function asOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function stripeRequest({ method, path, body }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');

  const url = `https://api.stripe.com${path}`;
  const headers = {
    Authorization: `Bearer ${key}`,
  };

  let payload;
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = body.toString();
  }

  const resp = await fetch(url, { method, headers, body: payload });
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const offer = String(payload.offer || '');
    const email = String(payload.email || '');
    const advisor = payload.advisor ? String(payload.advisor) : '';

    if (offer !== '49' && offer !== '79') {
      return json(res, 400, { error: 'Invalid offer' });
    }

    if (!email || !email.includes('@')) {
      return json(res, 400, { error: 'Missing email' });
    }

    if (offer === '79' && !advisor) {
      return json(res, 400, { error: 'Missing advisor' });
    }

    const origin = asOrigin(req);

    const amount = offer === '49' ? 4900 : 7900;
    const productName = offer === '49'
      ? 'Projet de vie structuré pour la MDPH'
      : 'Accompagnement personnalisé (projet de vie + échange)';

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('payment_method_types[0]', 'card');
    params.set('customer_email', email);

    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'eur');
    params.set('line_items[0][price_data][unit_amount]', String(amount));
    params.set('line_items[0][price_data][product_data][name]', productName);

    params.set('metadata[offer]', offer);
    if (advisor) params.set('metadata[advisor]', advisor);

    params.set('success_url', `${origin}/paiement-success?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/paiement?offer=${encodeURIComponent(offer)}${advisor ? `&advisor=${encodeURIComponent(advisor)}` : ''}`);

    const session = await stripeRequest({
      method: 'POST',
      path: '/v1/checkout/sessions',
      body: params,
    });

    if (!session || !session.url) {
      return json(res, 500, { error: 'Stripe session creation failed' });
    }

    return json(res, 200, { url: session.url });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Checkout session failed', details: String(e?.message || e) });
  }
}

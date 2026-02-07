function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getQueryParam(url, name) {
  try {
    const u = new URL(url, 'http://localhost');
    return u.searchParams.get(name);
  } catch {
    return null;
  }
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
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed. Use GET.' });
  }

  try {
    const paymentId = getQueryParam(req.url || '', 'payment_id') || '';
    if (!paymentId) {
      return json(res, 400, { error: 'Missing payment_id' });
    }

    const payment = await mollieGetPayment(paymentId);
    const status = String(payment?.status || '');
    const isPaid = status === 'paid';

    const offer = payment?.metadata?.offer ? String(payment.metadata.offer) : '';
    const advisor = payment?.metadata?.advisor ? String(payment.metadata.advisor) : '';

    return json(res, 200, {
      ok: true,
      paymentId,
      status,
      isPaid,
      offer,
      advisor,
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Payment status failed', details: String(e?.message || e) });
  }
}

export async function chatCompletion({ apiKey, model, messages, parseJson = true }) {
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.2,
      messages,
    }),
  });

  if (!resp.ok) {
    const details = await resp.text().catch(() => '');
    throw new Error(`OpenAI error ${resp.status}: ${details || resp.statusText}`);
  }

  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('OpenAI empty response');
  }

  if (!parseJson) {
    return { raw };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const maybeJson = raw.slice(start, end + 1);
      try {
        parsed = JSON.parse(maybeJson);
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { raw };
  }

  return { parsed };
}

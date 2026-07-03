// netlify/functions/translate.mjs
// Traduce testi IT -> EN via DeepL. La chiave API sta SOLO qui (variabile
// d'ambiente DEEPL_API_KEY su Netlify), mai nel browser.
// Richiesta:  POST { texts: ["...", ...] }   (max 50 testi, 30k caratteri)
// Risposta:   { translations: ["...", ...] }

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  const KEY = process.env.DEEPL_API_KEY;
  if (!KEY) {
    return new Response(JSON.stringify({ error: 'DEEPL_API_KEY non configurata su Netlify' }), { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch { body = null; }
  const texts = body && Array.isArray(body.texts) ? body.texts : null;
  if (!texts || texts.length === 0 || texts.length > 50 || texts.some(t => typeof t !== 'string')) {
    return new Response(JSON.stringify({ error: 'Payload non valido' }), { status: 400 });
  }
  const totalChars = texts.reduce((n, t) => n + t.length, 0);
  if (totalChars > 30000) {
    return new Response(JSON.stringify({ error: 'Troppi caratteri in una richiesta' }), { status: 413 });
  }

  // Le chiavi del piano Free terminano con ":fx" e usano l'endpoint api-free
  const endpoint = KEY.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'DeepL-Auth-Key ' + KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'IT',
      target_lang: 'EN-GB',
      tag_handling: 'html',      // preserva <br> e tag inline
      preserve_formatting: true
    })
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ error: 'DeepL ' + r.status + ': ' + t.substring(0, 200) }), { status: 502 });
  }
  const data = await r.json();
  const translations = (data.translations || []).map(t => t.text);
  return new Response(JSON.stringify({ translations }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

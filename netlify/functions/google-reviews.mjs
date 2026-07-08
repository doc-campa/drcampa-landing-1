// netlify/functions/google-reviews.mjs
// Legge rating e numero recensioni della scheda Google Business dello studio
// tramite Google Places API (New). La chiave sta SOLO nelle variabili
// d'ambiente Netlify: GOOGLE_PLACES_KEY e GOOGLE_PLACE_ID.
// La risposta viene messa in cache CDN per 12 ore: ~2 chiamate a Google al giorno.

export default async () => {
  const KEY = process.env.GOOGLE_PLACES_KEY;
  const PLACE_ID = process.env.GOOGLE_PLACE_ID;
  if (!KEY || !PLACE_ID) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_KEY o GOOGLE_PLACE_ID non configurate su Netlify' }), { status: 500 });
  }

  const url = 'https://places.googleapis.com/v1/places/' + encodeURIComponent(PLACE_ID)
            + '?fields=rating,userRatingCount&key=' + encodeURIComponent(KEY);

  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ error: 'Places API ' + r.status + ': ' + t.substring(0, 200) }), { status: 502 });
  }
  const data = await r.json();
  if (typeof data.rating !== 'number' || typeof data.userRatingCount !== 'number') {
    return new Response(JSON.stringify({ error: 'Risposta Places senza rating/userRatingCount' }), { status: 502 });
  }

  return new Response(JSON.stringify({ rating: data.rating, total: data.userRatingCount }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // cache al browser 1h, alla CDN Netlify 12h (poi ricontatta Google)
      'Cache-Control': 'public, max-age=3600',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=43200'
    }
  });
};

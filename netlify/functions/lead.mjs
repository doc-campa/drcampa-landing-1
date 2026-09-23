/* ==========================================================
   GEMA SALES HUB — ponte server-side
   ----------------------------------------------------------
   Il browser NON parla mai con GEMA: parla con questa funzione,
   che aggiunge il token e inoltra. Così il token resta sul server,
   come richiesto dalle specifiche GEMA del 23 settembre 2026.

   VARIABILI D'AMBIENTE da impostare su Netlify (per ogni sito):
     GEMA_URL     es. https://regia-demo-silk.vercel.app/api/landing-leads
     GEMA_TOKEN   il token comunicato da GEMA (NON metterlo qui dentro)
     GEMA_SOURCE  "treatments"    su medicinaestetica.domenicocampa.it
                  "interventions" su landing.domenicocampa.it

   Se GEMA_TOKEN non è impostato, la funzione risponde 503 e
   non invia nulla: il form continua a funzionare comunque,
   perché Netlify Forms resta la fonte primaria.
   ========================================================== */

const MAX_BYTES = 16 * 1024;   // limite dichiarato da GEMA
const TIMEOUT_MS = 8000;

function s(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max || 160);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, errore: 'metodo non consentito' }, 405);
  }

  const URL_GEMA = process.env.GEMA_URL;
  const TOKEN    = process.env.GEMA_TOKEN;
  const SOURCE   = process.env.GEMA_SOURCE;

  if (!URL_GEMA || !TOKEN || !SOURCE) {
    // Configurazione incompleta: non è un errore del visitatore.
    return json({ ok: false, errore: 'integrazione non configurata' }, 503);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ ok: false, errore: 'JSON non valido' }, 400);
  }

  // ----- campi comuni -----
  const payload = {
    source:     SOURCE,
    externalId: s(body.externalId, 160),
    firstName:  s(body.firstName, 160),
    lastName:   s(body.lastName, 160),
    email:      s(body.email, 254),
    phone:      s(body.phone, 40)
  };

  // ----- campi specifici del modulo -----
  if (SOURCE === 'treatments') {
    payload.vials         = s(body.fiale, 40);
    payload.location      = s(body.sede, 160);
    payload.treatmentType = s(body.trattamento, 160);
  } else {
    payload.interventionType = s(body.intervento, 160);
    payload.investment       = s(body.budget, 160);
    payload.desiredTiming    = s(body.tempistica, 160);
  }

  // ----- controlli minimi prima di disturbare GEMA -----
  if (!payload.externalId || !payload.firstName || !payload.lastName) {
    return json({ ok: false, errore: 'campi obbligatori mancanti' }, 400);
  }
  if (!payload.email && !payload.phone) {
    return json({ ok: false, errore: 'serve almeno email o telefono' }, 400);
  }

  const raw = JSON.stringify(payload);
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    return json({ ok: false, errore: 'payload troppo grande' }, 413);
  }

  // ----- invio, con un solo ritentativo sugli errori temporanei -----
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1200));
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(URL_GEMA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + TOKEN
        },
        body: raw,
        signal: ctrl.signal
      });
      clearTimeout(t);

      const testo = await res.text();
      let dati = null;
      try { dati = JSON.parse(testo); } catch (e) { /* risposta non JSON */ }

      // 201 = nuovo lead · 200 = externalId già ricevuto: in entrambi i casi è fatta
      if (res.status === 200 || res.status === 201) {
        return json({ ok: true, stato: res.status, id: (dati && (dati.id || dati.leadId)) || null });
      }

      // 400 / 401 / 413 / 415: errore di configurazione, ritentare è inutile
      if ([400, 401, 413, 415].includes(res.status)) {
        console.error('[GEMA] errore non ritentabile', res.status, testo.slice(0, 300));
        return json({ ok: false, stato: res.status, errore: 'richiesta rifiutata' }, 502);
      }

      // 500 / 503 / altro: temporaneo, si ritenta
      last = { stato: res.status, testo: testo.slice(0, 300) };
      console.warn('[GEMA] errore temporaneo', res.status, '- tentativo', attempt + 1);
    } catch (err) {
      last = { stato: 0, testo: String(err && err.message || err) };
      console.warn('[GEMA] invio fallito - tentativo', attempt + 1, last.testo);
    }
  }

  console.error('[GEMA] invio non riuscito dopo 2 tentativi', last);
  return json({ ok: false, errore: 'GEMA non raggiungibile', dettaglio: last }, 502);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

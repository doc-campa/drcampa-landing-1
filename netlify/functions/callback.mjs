// Riceve il codice da GitHub, lo scambia con un access token, e lo invia al CMS.
export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Parametro "code" mancante. Riprovare il login dal CMS.', { status: 400 });
  }

  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  const clientSecret = Netlify.env.get('GITHUB_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response('OAuth non configurato (mancano CLIENT_ID o CLIENT_SECRET)', { status: 500 });
  }

  // Scambio code -> access_token con GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });

  const data = await tokenRes.json();
  if (!data.access_token) {
    return new Response(`Errore OAuth: ${data.error_description || data.error || 'sconosciuto'}`, { status: 500 });
  }

  // Restituisci una pagina HTML che invia il token al CMS via postMessage
  const payload = JSON.stringify({ token: data.access_token, provider: 'github' });

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Login completato</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:20px}
    .ok{font-size:3rem;margin-bottom:14px}
  </style>
</head>
<body>
  <div>
    <div class="ok">✓</div>
    <p>Login completato. Questa finestra si chiude automaticamente...</p>
  </div>
  <script>
    (function() {
      const data = ${payload};
      function send() {
        if (!window.opener) {
          document.body.innerHTML = '<p>Errore: questa pagina deve essere aperta come popup dal CMS.</p>';
          return;
        }
        window.opener.postMessage('authorization:github:success:' + JSON.stringify(data), '*');
        setTimeout(function() { window.close(); }, 600);
      }
      send();
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};

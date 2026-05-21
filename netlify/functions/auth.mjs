// Inizia il flusso OAuth: reindirizza l'utente a GitHub per autorizzare il login.
export default async (req) => {
  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID non configurato nelle variabili d\'ambiente Netlify', { status: 500 });
  }

  const url = new URL(req.url);
  const host = req.headers.get('host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const redirectUri = `${proto}://${host}/.netlify/functions/callback`;

  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  githubUrl.searchParams.set('scope', 'repo,user');
  githubUrl.searchParams.set('state', state);

  return Response.redirect(githubUrl.toString(), 302);
};

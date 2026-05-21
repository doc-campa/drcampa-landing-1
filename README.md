# Studio Dr. Campa — Landing Page

Landing page del Dr. Domenico Campa, gestita tramite Decap CMS e ospitata su Netlify.

## Architettura

- **`index.html`** — pagina pubblica. Legge i contenuti da `content.json` al caricamento.
- **`content.json`** — tutti i contenuti modificabili del sito (testi, immagini, ordine sezioni).
- **`admin/`** — pannello CMS accessibile da `/admin`.
- **`images/`** — cartella dove vengono caricate le immagini dal pannello.
- **`netlify.toml`** — configurazione hosting.

## Come modificare i contenuti

1. Vai su `https://[il-tuo-sito].netlify.app/admin`
2. Fai login con le credenziali Netlify Identity
3. Clicca "Landing page"
4. Modifica testi, immagini, riordina sezioni
5. Clicca "Save" → il sito si aggiorna automaticamente in ~30 secondi

## Sviluppo locale (per developer)

Per testare localmente serve un server HTTP (non basta aprire `index.html`):

```bash
# Con Python 3
python3 -m http.server 8000

# Oppure con Node
npx serve .
```

Poi apri `http://localhost:8000`.

## Form di contatto

Il form attualmente è simulato (console.log). Per collegarlo a un CRM/email:
- Apri `index.html`
- Cerca `HOOK FORM` nello script
- Sostituisci il blocco simulazione con una `fetch()` al tuo endpoint (Zapier, Make, HubSpot, ecc.)

In alternativa, Netlify offre **Netlify Forms** gratis: basta aggiungere `data-netlify="true"` al form.

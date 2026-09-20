# LinkedIn Boss

3D knowledge graph of **live people** around your professional profile. No demo executives, no celebrity filler, no duplicate cards.

## What is live

- **LinkedIn cookie session** — Cookie-Editor JSON with `li_at` (and `JSESSIONID` if present). Loads your real `/voyager/api/me` profile and 1st-degree connections.
- **Public company peers** — If there is no cookie, Wikidata employees of the company you typed (with Wikipedia portraits and LinkedIn slugs when Wikidata has them). Labeled as public peers, not as your connections.
- **Resume / profile text** — Parsed from the file. Optional `XAI_API_KEY` uses Grok to extract fields; otherwise a local parser.

The globe only plots people that came back from those sources. If LinkedIn rejects the cookie, the app says so instead of inventing a network.

## Run

```bash
cp .env.example .env
# optional: XAI_API_KEY for resume extraction
npm install
npm run dev
```

Open [http://127.0.0.1:3040](http://127.0.0.1:3040) (`PORT` env, default 3040).

## Connect LinkedIn

1. In Chrome, install Cookie-Editor.
2. Log into linkedin.com.
3. Export cookies as JSON and paste into **Browser Cookie**.
4. Connection invites only send when that live session is accepted by LinkedIn; otherwise the profile URL opens in a new tab.

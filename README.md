# LinkedIn Boss

3D knowledge graph of **live people** around your professional profile. No demo executives, no celebrity filler, no duplicate cards.

## What is live

- **Accounts** — each user registers and keeps their own LinkedIn session + contacts CSV.
- **Extract contacts** — after a Cookie-Editor session (`li_at` + `JSESSIONID`), one button pages LinkedIn for 1st-degree connections (up to thousands) and then 2nd-degree search pages. Saved as `data/contacts/<user>.csv`. Users never download an archive from LinkedIn.
- **Match scores** — per person from shared company and title tokens, not a flat 50%.
- **Globe** shows the top 80 by score; the table lists the full extract (searchable, CSV download).
- A **profile URL alone cannot list connections**. LinkedIn will not give someone else's graph from a public link. Extract requires the owner's browser session.

If LinkedIn rate-limits paging, the extract stops at whatever it collected and still writes the CSV.

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

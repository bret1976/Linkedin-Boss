# LinkedIn Boss

3D knowledge graph of **your live LinkedIn contacts**. Each user signs in, connects their own LinkedIn session, and the app extracts 1st-degree connections (and pages 2nd-degree search) into a CSV, then scores every person.

## Run

```bash
npm install
PORT=3040 npm run dev
```

Open http://127.0.0.1:3040

## User flow

1. **Register or sign in**
2. **Paste your LinkedIn profile URL** (`https://www.linkedin.com/in/you`)
3. **Connect cookies** (required — a profile URL cannot list contacts):
   - **A. Chrome extension (best):** Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select the `extension` folder. Log into linkedin.com. Click the extension, paste the **connect code** from the app.
   - **B. Open Chrome from the app:** click **Open LinkedIn in Chrome**, log in in that window, then **I've logged in — validate cookies**.
4. The app pages your real connections and scores them. Globe = top 250 by match. Table = full list. **Download CSV** saves everyone extracted.

The extension reads HttpOnly `li_at` / `JSESSIONID` from your normal Chrome (same class of access as Cookie-Editor). LinkedIn sees your real browser, not a bot.

## Notes

- Empty extracts are not saved. If LinkedIn rejects the session you see the HTTP error.
- LinkedIn itself paginates and may cap how many 1sts it returns in one stream; extract keeps paging until LinkedIn stops.
- 2nd-degree is a search, not a dump of someone else’s 600k graph.

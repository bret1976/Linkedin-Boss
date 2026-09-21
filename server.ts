import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { CURATED_LOCATIONS } from "./src/data/curatedLocations";
import {
  analyzeProfileText,
  connectionsToCsv,
  csvToConnections,
  discoverJsession,
  extractFirstDegree,
  extractSecondDegree,
  fetchVoyagerConnections,
  fetchVoyagerMe,
  parseLinkedInCookies,
  voyagerHeaders,
  wikidataCompanyPeers,
} from "./src/server/liveNetwork";
import {
  clearLinkedIn,
  contactsPath,
  cookieFromReq,
  createGuest,
  createSession,
  deleteContacts,
  destroySession,
  consumePairCode,
  issuePairCode,
  retirePairCode,
  loginUser,
  registerUser,
  saveLinkedIn,
  userById,
  userFromToken,
} from "./src/server/userStore";
import { browserJob, captureLinkedInLogin, claimChromeSession, openChromeForLinkedIn } from "./src/server/browserConnect";
import { existsSync, readFileSync, writeFileSync } from "fs";

const PORT = Number(process.env.PORT) || 3040;

// Derive location names from curated dataset
const LOCATIONS = CURATED_LOCATIONS.map(l => l.name);

let aiClient: GoogleGenAI | null = null;
let isGeminiKeyVerified: boolean | null = null;
let lastKeyAttemptTime = 0;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim().length === 0) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function checkGeminiKeyHealth(): Promise<{ valid: boolean; reason?: string }> {
  const client = getGeminiClient();
  if (!client) {
    return { valid: false, reason: "API key is missing or not configured" };
  }
  const now = Date.now();
  if (isGeminiKeyVerified !== null && now - lastKeyAttemptTime < 60000) {
    return { valid: isGeminiKeyVerified };
  }
  try {
    lastKeyAttemptTime = now;
    await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping',
      config: { maxOutputTokens: 1 }
    });
    isGeminiKeyVerified = true;
    return { valid: true };
  } catch (err: any) {
    isGeminiKeyVerified = false;
    const msg = err?.message || String(err);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      console.warn('[Gemini AI] Gemini API key in environment is invalid or expired. Enabling curated visual destination mode.');
      return { valid: false, reason: 'API key is invalid or expired' };
    }
    console.warn('[Gemini AI] Gemini health check notice:', msg);
    return { valid: false, reason: msg };
  }
}

async function startServer() {
  const app = express();
  
  app.use(express.json({ limit: '50mb' }));
  app.use((req, res, next) => {
    const origin = String(req.headers.origin || "");
    if (origin.startsWith("chrome-extension://") || /localhost|127\.0\.0\.1/.test(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  // Status endpoint for Gemini API state
  app.get('/api/gemini/status', async (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const hasKey = Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 0);
    if (!hasKey) {
      return res.json({
        configured: false,
        valid: false,
        message: 'No Gemini API key configured. Using curated destination visuals.'
      });
    }
    const health = await checkGeminiKeyHealth();
    res.json({
      configured: true,
      valid: health.valid,
      message: health.valid
        ? 'Gemini API is active.'
        : 'Gemini API key is invalid or not activated. Using curated destination visuals.'
    });
  });

  // API endpoint
  app.post("/api/generate-location", async (req, res) => {
    try {
      const { index, userImageBase64 } = req.body;
      const locIdx = Math.abs(Number(index) || 0) % CURATED_LOCATIONS.length;
      const curated = CURATED_LOCATIONS[locIdx];
      const location = curated.name;
      
      let finalBase64 = curated.imageUrl;
      let info = curated.info;
      let isAiGenerated = false;

      const client = getGeminiClient();

      // Only attempt AI generation if client is available and key is not known to be invalid
      if (client && isGeminiKeyVerified !== false) {
        try {
          let parts: any[] = [{ text: `A bright, vivid, photorealistic travel photo taken directly in front of the ${location}. Extremely detailed background. High quality, stunning. Keep the exact same subjects from the original image—preserving the exact number of people, their faces, body structures, and poses. Only change their outfits to be culturally or weather appropriate for the location, and seamlessly place them in this new environment.` }];
          
          if (userImageBase64) {
            const match = userImageBase64.match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/);
            if (match && match.length === 3) {
              parts.unshift({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }

          const imagePromise = client.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts },
            config: {
              imageConfig: { aspectRatio: "3:4" }
            },
          });

          const infoPromise = client.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Provide information about ${location} exactly in this format:
# [Name of Location], [Name of Country] [Country Flag Emoji]
[One short, engaging paragraph about the location as a travel destination]
Do not include any other text or introductory phrases.`,
          });

          const [imageResponse, infoResponse] = await Promise.all([
            imagePromise.catch((e: any) => {
              const msg = e?.message || '';
              if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                isGeminiKeyVerified = false;
                console.warn('[Gemini AI] API key invalid during image generation. Activating curated visual fallback.');
              } else {
                console.warn("Image generation notice:", msg);
              }
              return null;
            }),
            infoPromise.catch((e: any) => {
              const msg = e?.message || '';
              if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                isGeminiKeyVerified = false;
                console.warn('[Gemini AI] API key invalid during text generation. Activating curated text fallback.');
              } else {
                console.warn("Text generation notice:", msg);
              }
              return null;
            })
          ]);
          
          if (imageResponse) {
            let base64EncodeString = "";
            for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                base64EncodeString = part.inlineData.data;
                break;
              }
            }

            if (base64EncodeString) {
              finalBase64 = `data:image/png;base64,${base64EncodeString}`;
              isAiGenerated = true;
            }
          }

          if (infoResponse && infoResponse.text) {
            info = infoResponse.text;
          }

        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            isGeminiKeyVerified = false;
          }
          console.warn("GenAI processing notice:", msg);
        }
      }

      res.json({
        success: true,
        base64: finalBase64,
        location,
        info,
        isAiGenerated,
        apiKeyValid: isGeminiKeyVerified ?? false
      });
    } catch (e) {
      console.error("Location generation error:", e);
      res.status(500).json({ success: false });
    }
  });

  // API endpoint for generating location description
  app.post("/api/location-info", async (req, res) => {
    try {
      const { location } = req.body;
      const found = CURATED_LOCATIONS.find(l => l.name.toLowerCase().includes((location || '').toLowerCase())) || CURATED_LOCATIONS[0];

      const client = getGeminiClient();
      if (!client || isGeminiKeyVerified === false) {
        return res.json({ info: found.info });
      }

      try {
        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Provide information about ${location} exactly in this format:
# [Name of Location], [Name of Country] [Country Flag Emoji]
[One short, engaging paragraph about the location as a travel destination]
Do not include any other text or introductory phrases.`,
        });
        res.json({ info: response.text || found.info });
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          isGeminiKeyVerified = false;
        }
        res.json({ info: found.info });
      }
    } catch (e) {
      res.json({ info: CURATED_LOCATIONS[0].info });
    }
  });

  // Endpoint to start omni generation
  app.post('/api/generate-video', async (req, res) => {
    try {
      const { imageBase64, prompt } = req.body;
      const client = getGeminiClient();

      if (!client || isGeminiKeyVerified === false) {
        return res.status(400).json({ 
          success: false, 
          error: "Cinematic video generation requires a valid Gemini API key configured in AI Studio Settings." 
        });
      }

      const match = imageBase64?.match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/);
      if (!match || match.length !== 3) {
        return res.status(400).json({ success: false, error: "Invalid base64 image" });
      }

      const interaction = await client.interactions.create({
        model: 'gemini-omni-1.1-flash',
        input: [
            { type: 'image' as const, data: match[2], mime_type: match[1] },
            { type: 'text', text: prompt || 'A beautiful cinematic panning video' }
        ],
        response_format: { type: 'video', delivery: 'uri' },
        store: true,
        background: false,
        stream: false
      });
      
      if (!interaction.output_video || !interaction.output_video.uri) {
        throw new Error('No video URI returned from interaction.');
      }
      
      const fileIdMatch = interaction.output_video.uri.match(/files\/([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      res.json({ success: true, interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        isGeminiKeyVerified = false;
      }
      console.warn('Video generation notice:', msg);
      res.status(500).json({ success: false, error: msg || 'Video generation unavailable' });
    }
  });

  // Endpoint to poll file status
  app.post('/api/video-status', async (req, res) => {
    try {
      const { fileId } = req.body;
      if (!fileId) return res.status(400).json({ error: "fileId is required" });
      
      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ error: "Gemini client unavailable" });
      }
      const fInfo = await client.files.get({ name: `files/${fileId}` });
      const state = (fInfo.state as any)?.name || fInfo.state;
      res.json({ done: state === 'ACTIVE' || state === 'SUCCEEDED', state });
    } catch(e: any) {
      console.warn("Video polling notice:", e?.message || e);
      res.status(500).json({ success: false, error: e?.message });
    }
  });

  const videoCache = new Map<string, Buffer>();
  const mediaShareCache = new Map<string, { buffer: Buffer; mimeType: string }>();

  // Public endpoint to serve media for social post sharing (e.g. Postproxy scraper)
  app.get('/api/media-share/:filename', (req, res) => {
    const rawId = req.params.filename.replace(/\.[^/.]+$/, '');
    const item = mediaShareCache.get(rawId);
    if (!item) {
      return res.status(404).send('Media not found or expired');
    }
    res.setHeader('Content-Type', item.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(item.buffer);
  });

  // Agent Reach LinkedIn Session Management (Zero API Fees, Browser Session / Cookie / Profile)
  interface LinkedInSession {
    id: string;
    name: string;
    headline?: string;
    username?: string;
    avatar_url?: string;
    profile_url?: string;
    company?: string;
    industry?: string;
    location?: string;
    connectedAt: string;
    authType: 'agent-reach-cookie' | 'profile-url' | 'quick-session';
    sessionCookie?: string;
  }

  let activeLinkedInSession: LinkedInSession | null = null;
  const extractJobs = new Map<
    string,
    { running: boolean; done: boolean; count: number; first: number; second: number; error?: string; csvPath?: string }
  >();

  function sidFromReq(req: express.Request) {
    return cookieFromReq(req.headers.cookie, "lb_sid");
  }

  function currentUser(req: express.Request) {
    return userFromToken(sidFromReq(req));
  }

  function sessionFor(req: express.Request): LinkedInSession | null {
    const user = currentUser(req);
    if (user?.linkedin && typeof user.linkedin === "object") {
      return user.linkedin as unknown as LinkedInSession;
    }
    return null;
  }

  function persistSession(req: express.Request, session: LinkedInSession | null) {
    const user = currentUser(req);
    if (user) {
      if (session) saveLinkedIn(user.id, session as unknown as Record<string, unknown>);
      else clearLinkedIn(user.id);
    }
    activeLinkedInSession = session;
  }

  app.post("/api/auth/register", (req, res) => {
    try {
      const user = registerUser(String(req.body?.email || ""), String(req.body?.password || ""));
      const token = createSession(user.id);
      res.setHeader("Set-Cookie", `lb_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const user = loginUser(String(req.body?.email || ""), String(req.body?.password || ""));
      const token = createSession(user.id);
      res.setHeader("Set-Cookie", `lb_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      res.json({ success: true, user: { id: user.id, email: user.email, hasLinkedIn: Boolean(user.linkedin) } });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    destroySession(sidFromReq(req));
    res.setHeader("Set-Cookie", "lb_sid=; Path=/; HttpOnly; Max-Age=0");
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = currentUser(req);
    if (!user) return res.json({ success: false, user: null });
    const csv = contactsPath(user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        hasLinkedIn: Boolean(user.linkedin),
        contactsFile: existsSync(csv),
      },
    });
  });

  app.post("/api/auth/reset", (req, res) => {
    const user = currentUser(req);
    if (user) {
      clearLinkedIn(user.id);
      deleteContacts(user.id);
      extractJobs.delete(user.id);
    }
    persistSession(req, null);
    destroySession(sidFromReq(req));
    res.setHeader("Set-Cookie", "lb_sid=; Path=/; HttpOnly; Max-Age=0");
    res.json({ success: true });
  });

  // Check LinkedIn status via Agent Reach
  app.get('/api/linkedin/status', (req, res) => {
    const session = sessionFor(req);
    const user = currentUser(req);
    res.json({
      connected: Boolean(session?.sessionCookie),
      canExtract: Boolean(session?.sessionCookie),
      contactsReady: user ? existsSync(contactsPath(user.id)) : false,
      profile: session ? {
        id: session.id,
        name: session.name,
        headline: session.headline,
        username: session.username,
        avatar_url: session.avatar_url,
        profile_url: session.profile_url,
        location: session.location,
        connectedAt: session.connectedAt,
        authType: session.authType
      } : null,
      agentReachActive: true
    });
  });

  // Connect LinkedIn using Agent Reach (Session Cookie, Cookie-Editor JSON, or Profile)
  app.post('/api/linkedin/connect', async (req, res) => {
    try {
      const { type, cookie, profileUrl, name, headline } = req.body || {};

      if (type === 'quick-session') {
        return res.status(400).json({
          success: false,
          error: 'Demo sessions are disabled. Connect with a live LinkedIn cookie export or a real profile URL.'
        });
      }

      // Browser session cookie (li_at + JSESSIONID from Cookie-Editor JSON)
      if (cookie && typeof cookie === 'string') {
        const jar = parseLinkedInCookies(cookie);
        if (!jar) {
          return res.status(400).json({
            success: false,
            error: 'Paste a Cookie-Editor JSON export that includes li_at (and JSESSIONID if available).'
          });
        }
        if (!jar.jsession) {
          jar.jsession = await discoverJsession(jar.liAt);
        }

        let me = {
          name: name?.trim() || "LinkedIn member",
          headline: headline?.trim() || "",
          username: "",
          profile_url: "https://www.linkedin.com",
          avatar_url: "",
        };
        try {
          me = await fetchVoyagerMe(jar);
        } catch (err: any) {
          if (!jar.jsession) {
            return res.status(400).json({
              success: false,
              error: err.message || "LinkedIn rejected that cookie. Export Cookie-Editor JSON from linkedin.com while you are logged in.",
            });
          }
        }
        const displayName = name?.trim() || me.name;
        const sessionHeadline = headline?.trim() || me.headline || 'LinkedIn member';

        const cookieSession: LinkedInSession = {
          id: `li_${Date.now()}`,
          name: displayName,
          headline: sessionHeadline,
          username: me.username,
          profile_url: me.profile_url,
          avatar_url: me.avatar_url,
          location: '',
          connectedAt: new Date().toISOString(),
          authType: 'agent-reach-cookie',
          sessionCookie: JSON.stringify(jar)
        };
        persistSession(req, cookieSession);

        return res.json({
          success: true,
          profile: cookieSession,
          canExtract: true,
          message: 'Session saved. Extracting your contacts next — this is the only way to load your real network.'
        });
      }

      // 3. Profile URL / Public Profile Link
      if (profileUrl && typeof profileUrl === 'string') {
        const rawUrl = profileUrl.trim();
        let username = rawUrl
          .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
          .replace(/\/.*$/, '')
          .trim();

        if (!username) {
          return res.status(400).json({
            success: false,
            error: 'Please enter a valid LinkedIn profile URL (e.g. linkedin.com/in/username)'
          });
        }

        let parsedName = name?.trim();
        let parsedHeadline = headline?.trim();
        let parsedCompany = '';
        let parsedLocation = 'San Francisco Bay Area, CA';
        let parsedIndustry = 'Technology & Software';

        // Optional Jina Reader scrape (as documented in Agent Reach install.md)
        try {
          const jinaUrl = `https://r.jina.ai/https://www.linkedin.com/in/${username}`;
          const jinaRes = await fetch(jinaUrl, {
            headers: { 'Accept': 'text/plain' }
          });

          if (jinaRes.ok) {
            const markdown = await jinaRes.text();
            const titleMatch = markdown.match(/Title:\s*(.+?)(?:\s*\|\s*LinkedIn|$)/i);
            if (titleMatch && titleMatch[1] && !titleMatch[1].toLowerCase().includes('sign up')) {
              const fullTitle = titleMatch[1].trim();
              const parts = fullTitle.split(' - ');
              if (!parsedName && parts[0]) parsedName = parts[0].trim();
              if (!parsedHeadline && parts[1]) parsedHeadline = parts[1].trim();
            }

            // Extract company and location from markdown if available
            const atMatch = (parsedHeadline || '').match(/(?:at|@)\s+([^,|•\n]+)/i);
            if (atMatch && atMatch[1]) {
              parsedCompany = atMatch[1].trim();
            }

            const locMatch = markdown.match(/Location:\s*([^\n]+)/i);
            if (locMatch && locMatch[1]) {
              parsedLocation = locMatch[1].trim();
            }
          }
        } catch (jinaErr) {
          console.warn('Jina reader notice:', jinaErr);
        }

        const finalName = parsedName || username.replace(/[-_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const finalHeadline = parsedHeadline || 'Executive & Technology Leader';
        if (!parsedCompany) {
          const atMatch = finalHeadline.match(/(?:at|@)\s+([^,|•\n]+)/i);
          parsedCompany = atMatch ? atMatch[1].trim() : 'Technology Ecosystem';
        }

        const urlSession: LinkedInSession = {
          id: `li_${Date.now()}`,
          name: finalName,
          headline: finalHeadline,
          company: parsedCompany,
          location: parsedLocation,
          industry: parsedIndustry,
          username: username,
          profile_url: `https://www.linkedin.com/in/${username}`,
          connectedAt: new Date().toISOString(),
          authType: 'profile-url'
        };
        return res.status(400).json({
          success: false,
          canExtract: false,
          error: 'A profile URL cannot list your contacts. Use Browser Cookie: Cookie-Editor on linkedin.com → Export JSON → paste it here. Then Extract contacts.'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Please provide a session cookie (li_at), LinkedIn profile URL, or select Quick Session.'
      });

    } catch (e: any) {
      console.error('LinkedIn Agent Reach connect error:', e);
      res.status(500).json({ success: false, error: e.message || 'Connection failed' });
    }
  });

  // Disconnect active LinkedIn session
  app.post('/api/linkedin/disconnect', (req, res) => {
    persistSession(req, null);
    res.json({ success: true });
  });

  app.post('/api/linkedin/extract-contacts', async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Create an account first so contacts are saved to you, not a shared session.' });
    const session = sessionFor(req);
    if (!session?.sessionCookie) {
      return res.status(400).json({
        success: false,
        error: 'Connect LinkedIn first (extension or Open Chrome + I have logged in). A profile URL cannot list contacts.'
      });
    }
    let jar: { liAt?: string; jsession?: string } = {};
    try { jar = JSON.parse(session.sessionCookie); } catch { /* ignore */ }
    if (!jar.liAt) return res.status(400).json({ success: false, error: 'Saved LinkedIn session is not a live login cookie.' });

    const jobId = user.id;
    if (extractJobs.get(jobId)?.running) {
      return res.json({ success: true, jobId, message: 'Extract already running' });
    }
    extractJobs.set(jobId, { running: true, done: false, count: 0, first: 0, second: 0 });
    res.json({ success: true, jobId, message: 'Extracting 1st-degree contacts, then paging 2nd-degree search.' });

    const cookieJar = { liAt: jar.liAt, jsession: jar.jsession || '' };
    void (async () => {
      try {
        const firstResult = await extractFirstDegree(cookieJar, session.name, {
          max: 8000,
          onProgress: (n) => {
            const job = extractJobs.get(jobId);
            if (job) extractJobs.set(jobId, { ...job, count: n, first: n });
          },
        });
        const first = firstResult.people;
        if (!first.length) {
          extractJobs.set(jobId, {
            running: false,
            done: true,
            count: 0,
            first: 0,
            second: 0,
            error: firstResult.error || "LinkedIn returned zero connections. Paste a fresh Cookie-Editor JSON.",
          });
          return;
        }
        const second = await extractSecondDegree(cookieJar, session.name, {
          max: 2500,
          onProgress: (n) => {
            const job = extractJobs.get(jobId);
            if (job) extractJobs.set(jobId, { ...job, second: n, count: first.length + n });
          },
        });
        const people = [...first];
        const seen = new Set(first.map((p) => p.profileUrl.toLowerCase()));
        for (const p of second) {
          if (seen.has(p.profileUrl.toLowerCase())) continue;
          seen.add(p.profileUrl.toLowerCase());
          people.push(p);
        }
        const csvPath = contactsPath(user.id);
        writeFileSync(csvPath, connectionsToCsv(people));
        extractJobs.set(jobId, {
          running: false,
          done: true,
          count: people.length,
          first: first.length,
          second: people.length - first.length,
          csvPath,
        });
      } catch (err: any) {
        extractJobs.set(jobId, {
          running: false,
          done: true,
          count: extractJobs.get(jobId)?.count || 0,
          first: extractJobs.get(jobId)?.first || 0,
          second: extractJobs.get(jobId)?.second || 0,
          error: err.message || 'Extract failed',
        });
      }
    })();
  });

  app.post("/api/linkedin/one-click", async (req, res) => {
    let user = currentUser(req);
    if (!user) {
      const guest = createGuest();
      user = guest.user;
      res.setHeader("Set-Cookie", `lb_sid=${guest.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    const existing = sessionFor(req);
    if (existing?.sessionCookie) {
      return res.json({ success: true, alreadyConnected: true, message: "Session already saved. Extracting contacts." });
    }
    const profileUrl = String(req.body?.profileUrl || "").trim();
    const uid = user.id;
    const job = await captureLinkedInLogin(uid, profileUrl || undefined, (jar, profile) => {
      saveLinkedIn(uid, {
        id: `li_${Date.now()}`,
        name: profile?.name || "LinkedIn member",
        headline: profile?.headline || "",
        username: profile?.username,
        profile_url: profile?.profile_url,
        avatar_url: profile?.avatar_url,
        location: "",
        connectedAt: new Date().toISOString(),
        authType: "agent-reach-cookie",
        sessionCookie: JSON.stringify(jar),
      });
    });
    res.json({ success: true, running: job.running, message: job.message });
  });

  app.get("/api/linkedin/pair-code", (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Sign in first." });
    const profileUrl = String(req.query.profileUrl || "");
    const code = issuePairCode(user.id, profileUrl);
    res.json({ success: true, code, bossUrl: `http://127.0.0.1:${PORT}` });
  });

  app.post("/api/linkedin/extension-connect", async (req, res) => {
    const code = String(req.body?.pairCode || "");
    const pair = consumePairCode(code);
    if (!pair) {
      return res.status(400).json({ success: false, error: "Connect code is missing or expired. Generate a new one in LinkedIn Boss." });
    }
    const liAt = String(req.body?.liAt || req.body?.li_at || "");
    let jsession = String(req.body?.jsession || req.body?.JSESSIONID || "").replace(/^"|"$/g, "");
    if (!liAt || liAt.length < 20) {
      return res.status(400).json({ success: false, error: "No LinkedIn li_at cookie. Log into linkedin.com in this Chrome, then try again." });
    }
    if (jsession && !jsession.startsWith("ajax:")) jsession = `ajax:${jsession}`;
    const jar = { liAt, jsession };
    if (!jar.jsession) {
      try { jar.jsession = await discoverJsession(jar.liAt); } catch { /* ignore */ }
    }
    let me = { name: "LinkedIn member", headline: "", username: "", profile_url: pair.profileUrl || "https://www.linkedin.com", avatar_url: "" };
    try {
      me = await fetchVoyagerMe(jar);
    } catch (e: any) {
      return res.status(400).json({
        success: false,
        error: e.message || "LinkedIn rejected those cookies. Stay logged in on linkedin.com and retry.",
      });
    }
    const cookieSession: LinkedInSession = {
      id: `li_${Date.now()}`,
      name: me.name,
      headline: me.headline,
      username: me.username,
      profile_url: me.profile_url,
      avatar_url: me.avatar_url,
      location: "",
      connectedAt: new Date().toISOString(),
      authType: "agent-reach-cookie",
      sessionCookie: JSON.stringify(jar),
    };
    saveLinkedIn(pair.userId, cookieSession as unknown as Record<string, unknown>);
    retirePairCode(code);
    res.json({ success: true, profile: cookieSession, canExtract: true });
  });

  app.post("/api/linkedin/open-chrome", async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Sign in first." });
    try {
      const profileUrl = String(req.body?.profileUrl || "").trim();
      const opened = await openChromeForLinkedIn(user.id, profileUrl || undefined);
      res.json({ success: true, ...opened });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message || "Could not open Chrome. Install Google Chrome." });
    }
  });

  app.post("/api/linkedin/claim-session", async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Sign in first." });
    const profileUrl = String(req.body?.profileUrl || "").trim();
    const claimed = await claimChromeSession(user.id, profileUrl || undefined);
    if ("error" in claimed && claimed.error) {
      return res.status(400).json({ success: false, error: claimed.error });
    }
    const { jar, profile } = claimed as { jar: { liAt: string; jsession: string }; profile: any };
    const cookieSession: LinkedInSession = {
      id: `li_${Date.now()}`,
      name: profile?.name || "LinkedIn member",
      headline: profile?.headline || "",
      username: profile?.username,
      profile_url: profile?.profile_url || profileUrl,
      avatar_url: profile?.avatar_url,
      location: "",
      connectedAt: new Date().toISOString(),
      authType: "agent-reach-cookie",
      sessionCookie: JSON.stringify(jar),
    };
    persistSession(req, cookieSession);
    res.json({ success: true, profile: cookieSession, canExtract: true });
  });

  app.get("/api/linkedin/one-click-status", async (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Not signed in" });
    const job = browserJob(user.id);
    if (!job) return res.json({ success: true, running: false, done: false });
    if (job.done && job.jar && !job.error) {
      const cookieSession: LinkedInSession = {
        id: `li_${Date.now()}`,
        name: job.profile?.name || "LinkedIn member",
        headline: job.profile?.headline || "",
        username: job.profile?.username,
        profile_url: job.profile?.profile_url,
        avatar_url: job.profile?.avatar_url,
        location: "",
        connectedAt: new Date().toISOString(),
        authType: "agent-reach-cookie",
        sessionCookie: JSON.stringify(job.jar),
      };
      persistSession(req, cookieSession);
    }
    res.json({
      success: !job.error,
      running: job.running,
      done: job.done,
      message: job.message,
      error: job.error,
      connected: Boolean(job.jar),
      profile: job.profile,
    });
  });

  app.get('/api/linkedin/extract-status', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Not signed in' });
    const job = extractJobs.get(user.id);
    const csv = contactsPath(user.id);
    res.json({
      success: true,
      running: Boolean(job?.running),
      done: Boolean(job?.done || existsSync(csv)),
      count: job?.count || 0,
      first: job?.first || 0,
      second: job?.second || 0,
      error: job?.error,
      hasCsv: existsSync(csv),
    });
  });

  app.get('/api/linkedin/contacts.csv', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).send('Sign in first');
    const csv = contactsPath(user.id);
    if (!existsSync(csv)) {
      return res.status(404).json({
        success: false,
        error: 'No extracted contacts yet. Stay in the app and click Extract contacts — then Download CSV from the contacts list.',
      });
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="linkedin-contacts.csv"');
    res.send(readFileSync(csv, 'utf8'));
  });

  // Fetch live LinkedIn connections (cookie) or Wikidata company peers (public)
  app.get('/api/linkedin/network', async (req, res) => {
    try {
      const linkedinSession = sessionFor(req);
      const user = currentUser(req);
      if (user && existsSync(contactsPath(user.id))) {
        const connections = csvToConnections(readFileSync(contactsPath(user.id), 'utf8'));
        return res.json({
          success: connections.length > 0,
          authenticated: true,
          isLiveScraped: true,
          source: 'linkedin',
          totalFound: connections.length,
          user: {
            name: linkedinSession?.name || user.email,
            headline: linkedinSession?.headline || '',
            company: (linkedinSession as any)?.company || '',
            location: linkedinSession?.location || '',
            profileUrl: linkedinSession?.profile_url || ''
          },
          connections
        });
      }
      if (!linkedinSession) {
        return res.json({
          success: false,
          authenticated: false,
          connections: [],
          message: 'No active LinkedIn session'
        });
      }

      let connections: Awaited<ReturnType<typeof fetchVoyagerConnections>> = [];
      let source: 'linkedin' | 'wikidata' | 'none' = 'none';

      if (linkedinSession.sessionCookie) {
        try {
          const jar = JSON.parse(linkedinSession.sessionCookie);
          if (jar?.liAt) {
            connections = await fetchVoyagerConnections(jar, linkedinSession.name);
            if (connections.length) source = 'linkedin';
          }
        } catch (err) {
          console.warn('[linkedin] voyager connections', err);
        }
      }

      res.json({
        success: connections.length > 0,
        authenticated: true,
        isLiveScraped: source === 'linkedin',
        source,
        totalFound: connections.length,
        user: {
          name: linkedinSession.name,
          headline: linkedinSession.headline,
          company: (linkedinSession as any).company || '',
          location: linkedinSession.location || '',
          profileUrl: linkedinSession.profile_url || ''
        },
        connections
      });
    } catch (e: any) {
      console.error('Network fetch error:', e);
      res.status(500).json({ success: false, error: e.message, connections: [] });
    }
  });

  app.post('/api/network/peers', async (req, res) => {
    try {
      const company = String(req.body?.company || '').trim();
      const industry = String(req.body?.industry || req.body?.headline || '').trim();
      if (company.length < 2) {
        return res.json({ success: false, connections: [], message: 'Enter a company to look up live public peers.' });
      }
      const connections = await wikidataCompanyPeers(company, industry);
      res.json({
        success: connections.length > 0,
        source: 'wikidata',
        totalFound: connections.length,
        connections
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message, connections: [] });
    }
  });

  app.post('/api/profile/analyze', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      if (text.length < 8) {
        return res.status(400).json({ success: false, error: 'Paste resume or profile text.' });
      }
      const profile = await analyzeProfileText(text);
      res.json({ success: true, profile });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Send LinkedIn Connection Request via Agent Reach
  app.post('/api/linkedin/connect-request', async (req, res) => {
    try {
      const { profileId, profileUrl, note } = req.body || {};
      
      const inviteSession = sessionFor(req);
      if (!inviteSession?.sessionCookie) {
        return res.json({
          success: false,
          profileId,
          profileUrl,
          error: 'A live LinkedIn cookie session is required to send invites. Open the profile on LinkedIn instead.'
        });
      }

      let jar: { liAt?: string; jsession?: string } = {};
      try { jar = JSON.parse(inviteSession.sessionCookie); } catch { /* ignore */ }
      if (!jar.liAt) {
        return res.json({ success: false, error: 'Session cookie is not a live LinkedIn login.', profileUrl });
      }

      const inviteRes = await fetch('https://www.linkedin.com/voyager/api/growth/normInvitations', {
        method: 'POST',
        headers: {
          ...voyagerHeaders({ liAt: jar.liAt, jsession: jar.jsession || '' }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invitee: {
            'com.linkedin.voyager.growth.invitation.InviteeProfile': { profileId }
          },
          message: note || ''
        })
      });
      if (!inviteRes.ok) {
        return res.json({
          success: false,
          profileUrl,
          error: `LinkedIn rejected the invite (${inviteRes.status}). Open the profile URL to connect in the browser.`
        });
      }
      res.json({ success: true, profileId, message: 'Connection request sent on LinkedIn' });
    } catch (e: any) {
      console.error('LinkedIn connect error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Share / Post to LinkedIn via Agent Reach
  app.post('/api/linkedin/post', async (req, res) => {
    try {
      const { text, imageBase64 } = req.body || {};
      if (!text && !imageBase64) {
        return res.status(400).json({ success: false, error: 'Post text or image is required.' });
      }

      let mediaUrl = '';
      if (imageBase64 && imageBase64.startsWith('data:image')) {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/);
        if (match && match.length === 3) {
          const mimeType = match[1];
          const buffer = Buffer.from(match[2], 'base64');
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const mediaId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          mediaShareCache.set(mediaId, { buffer, mimeType });
          
          const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
          const host = appUrl || `${req.protocol}://${req.get('host')}`;
          mediaUrl = `${host}/api/media-share/${mediaId}.${ext}`;
        }
      }

      const postBody = text || 'Shared from LinkedIn Boss';

      // 1-click LinkedIn Share Intent URL
      const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postBody)}`;

      // Direct voyager session post if valid session cookie is present
      let directVoyagerSuccess = false;
      if (activeLinkedInSession?.sessionCookie) {
        try {
          const voyagerPostRes = await fetch('https://www.linkedin.com/voyager/api/contentcreation/normShares', {
            method: 'POST',
            headers: {
              'Cookie': `li_at=${activeLinkedInSession.sessionCookie}; JSESSIONID="ajax:123456789"`,
              'csrf-token': 'ajax:123456789',
              'x-restli-protocol-version': '2.0.0',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
              text: { text: postBody },
              distribution: { feedDistribution: 'MAIN_FEED' }
            })
          });
          if (voyagerPostRes.ok) {
            directVoyagerSuccess = true;
          }
        } catch (vErr) {
          console.warn('Voyager direct share notice (falling back to share intent):', vErr);
        }
      }

      res.json({
        success: true,
        directVoyagerSuccess,
        shareUrl,
        postText: postBody,
        imageUrl: mediaUrl,
        profile: activeLinkedInSession
      });
    } catch (e: any) {
      console.error('LinkedIn share error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/video-download', async (req, res) => {
    try {
      const fileId = req.query.fileId as string;
      if (!fileId) {
        return res.status(400).json({ error: "fileId is required" });
      }

      let buffer = videoCache.get(fileId);
      if (!buffer) {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${apiKey}`;
        const upstream = await fetch(url);
        if (!upstream.ok) {
          return res.status(upstream.status).send(`Failed to fetch video: ${upstream.statusText}`);
        }
        buffer = Buffer.from(await upstream.arrayBuffer());
        if (videoCache.size >= 12) {
          const oldest = videoCache.keys().next().value;
          if (oldest) videoCache.delete(oldest);
        }
        videoCache.set(fileId, buffer);
      }

      const total = buffer.length;
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        let start = match && match[1] ? parseInt(match[1], 10) : 0;
        let end = match && match[2] ? parseInt(match[2], 10) : total - 1;
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end) || end >= total) end = total - 1;
        if (start > end || start >= total) {
          res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
          return;
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', end - start + 1);
        res.end(buffer.subarray(start, end + 1));
      } else {
        res.setHeader('Content-Length', total);
        res.end(buffer);
      }
    } catch(e: any) {
      console.error("Video download error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

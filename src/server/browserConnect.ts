import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { discoverJsession, fetchVoyagerMe, type CookieJar } from "./liveNetwork";

export type BrowserJob = {
  running: boolean;
  done: boolean;
  message: string;
  error?: string;
  jar?: CookieJar;
  profile?: { name: string; headline: string; username: string; profile_url: string; avatar_url: string };
};

const jobs = new Map<string, BrowserJob>();
const procs = new Map<string, ChildProcess>();
const debugPorts = new Map<string, number>();

export function browserJob(userId: string) {
  return jobs.get(userId);
}

export async function openChromeForLinkedIn(userId: string, profileUrl?: string) {
  const dir = path.join(homedir(), ".linkedin-boss", "chrome-profile", userId);
  mkdirSync(dir, { recursive: true });
  const port = 9222 + Math.floor(Math.random() * 80);
  const target = profileUrl?.includes("linkedin.com") ? profileUrl : "https://www.linkedin.com/login";
  const bin = chromeBinary();
  const child = spawn(
    bin,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${dir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-features=Translate",
      target,
    ],
    { detached: false, stdio: "ignore" },
  );
  procs.set(userId, child);
  debugPorts.set(userId, port);
  await waitForCdp(port, 25000);
  return { port, message: "Chrome is open on LinkedIn. Log in there, then come back and click I've logged in." };
}

export async function claimChromeSession(userId?: string, profileUrl?: string) {
  let jar: CookieJar | null = null;
  const port = userId ? debugPorts.get(userId) : undefined;
  if (port) {
    try {
      jar = await readLinkedInCookies(port);
    } catch {
      jar = null;
    }
  }
  if (!jar) jar = await findOpenChromeSession(userId);
  if (!jar) {
    return { error: "No LinkedIn session yet. Log into LinkedIn in the Chrome window, then click I've logged in again." };
  }
  if (!jar.jsession) jar.jsession = await discoverJsession(jar.liAt);
  let profile = {
    name: "LinkedIn member",
    headline: "",
    username: "",
    profile_url: profileUrl || "https://www.linkedin.com",
    avatar_url: "",
  };
  try {
    profile = await fetchVoyagerMe(jar);
  } catch {
    /* cookie is enough to extract contacts */
  }
  if (profileUrl) profile.profile_url = profile.profile_url || profileUrl;
  return { jar, profile };
}

function chromeBinary() {
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const macCanary = "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary";
  const win = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (process.platform === "darwin" && existsSync(mac)) return mac;
  if (process.platform === "darwin" && existsSync(macCanary)) return macCanary;
  if (process.platform === "win32" && existsSync(win)) return win;
  return process.platform === "win32" ? "chrome" : "google-chrome";
}

async function cdpVersion(port: number, ms = 400) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(ms) });
    if (res.ok) return (await res.json()) as { webSocketDebuggerUrl: string };
  } catch {
    return null;
  }
  return null;
}

async function waitForCdp(port: number, ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const version = await cdpVersion(port, 500);
    if (version) return version;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Chrome started but debugging port did not open.");
}

function cdp(wsUrl: string, method: string, params?: Record<string, unknown>) {
  return new Promise<any>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = Math.floor(Math.random() * 1e9);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Chrome DevTools timed out"));
    }, 8000);
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.close();
        if (msg.error) reject(new Error(msg.error.message || method));
        else resolve(msg.result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Could not talk to Chrome"));
    });
  });
}

type CdpCookie = { name: string; value: string; domain?: string };

function jarFromCookies(cookies: CdpCookie[]): CookieJar | null {
  const li = cookies.filter((c) => /linkedin/i.test(c.domain || "") || /li_at|JSESSIONID/i.test(c.name));
  const pool = li.length ? li : cookies;
  const liAt = pool.find((c) => c.name === "li_at")?.value || "";
  const jsessionRaw = (pool.find((c) => c.name === "JSESSIONID")?.value || "").replace(/^"|"$/g, "");
  if (liAt.length < 20) return null;
  return {
    liAt,
    jsession: jsessionRaw.startsWith("ajax:") ? jsessionRaw : jsessionRaw ? `ajax:${jsessionRaw}` : "",
  };
}

async function readLinkedInCookies(port: number): Promise<CookieJar | null> {
  const version = await cdpVersion(port, 400);
  if (!version) return null;
  let pages: { type?: string; url?: string; webSocketDebuggerUrl?: string }[] = [];
  try {
    pages = (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(800) }).then((r) => r.json())) as typeof pages;
  } catch {
    pages = [];
  }
  const page = pages.find((p) => p.type === "page" && /linkedin\.com/i.test(p.url || ""));
  const targets = [page?.webSocketDebuggerUrl, version.webSocketDebuggerUrl].filter(Boolean) as string[];

  for (const wsUrl of targets) {
    for (const [method, params] of [
      ["Storage.getCookies", undefined],
      ["Network.getCookies", { urls: ["https://www.linkedin.com/", "https://www.linkedin.com/feed/"] }],
      ["Network.getAllCookies", undefined],
    ] as const) {
      try {
        const result = await cdp(wsUrl, method, params as Record<string, unknown> | undefined);
        const cookies = (result?.cookies || []) as CdpCookie[];
        const jar = jarFromCookies(cookies);
        if (jar) return jar;
      } catch {
        /* next API — Chrome 153 removed Network.getAllCookies on the browser target */
      }
    }
  }
  return null;
}

async function findOpenChromeSession(userId?: string): Promise<CookieJar | null> {
  const preferred = userId ? debugPorts.get(userId) : undefined;
  const ports = [...new Set([preferred, 9222, 9223, 9224, 9225, 9226].filter((p): p is number => Boolean(p)))];
  for (const port of ports) {
    try {
      const jar = await readLinkedInCookies(port);
      if (jar) return jar;
    } catch {
      /* no debugger on this port */
    }
  }
  return null;
}

export async function captureLinkedInLogin(
  userId: string,
  profileUrl?: string,
  onCaptured?: (jar: CookieJar, profile: BrowserJob["profile"]) => void,
): Promise<BrowserJob> {
  const existing = jobs.get(userId);
  if (existing?.running) return existing;

  const job: BrowserJob = {
    running: true,
    done: false,
    message: "Opening Google Chrome on LinkedIn. Log in there if asked — that is a normal Chrome window, not a bot.",
  };
  jobs.set(userId, job);

  const finish = async (jar: CookieJar) => {
    if (!jar.jsession) jar.jsession = await discoverJsession(jar.liAt);
    let profile = {
      name: "LinkedIn member",
      headline: "",
      username: "",
      profile_url: profileUrl || "https://www.linkedin.com",
      avatar_url: "",
    };
    try {
      profile = await fetchVoyagerMe(jar);
    } catch {
      /* cookie is enough */
    }
    if (profileUrl && !profile.profile_url) profile.profile_url = profileUrl;
    job.jar = jar;
    job.profile = profile;
    job.running = false;
    job.done = true;
    job.message = `Signed in as ${profile.name}. Loading contacts…`;
    onCaptured?.(jar, profile);
  };

  void (async () => {
    try {
      const already = await findOpenChromeSession(userId);
      if (already) {
        job.message = "Found your LinkedIn Chrome window. Connecting…";
        await finish(already);
        return;
      }
    } catch {
      /* open a new window */
    }

    const dir = path.join(homedir(), ".linkedin-boss", "chrome-profile", userId);
    mkdirSync(dir, { recursive: true });
    const port = 9222 + Math.floor(Math.random() * 80);
    const target = profileUrl?.includes("linkedin.com")
      ? profileUrl
      : "https://www.linkedin.com/feed/";
    const bin = chromeBinary();
    let child: ChildProcess | null = null;
    try {
      child = spawn(
        bin,
        [
          `--remote-debugging-port=${port}`,
          `--user-data-dir=${dir}`,
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-features=Translate",
          target,
        ],
        { detached: false, stdio: "ignore" },
      );
      procs.set(userId, child);
      job.message = "Chrome is open. Log into LinkedIn in that window (one time). We wait for the session cookie.";

      const deadline = Date.now() + 5 * 60 * 1000;
      let jar: CookieJar | null = null;
      while (Date.now() < deadline) {
        try {
          jar = await readLinkedInCookies(port);
        } catch {
          jar = null;
        }
        if (jar) break;
        job.message = "Waiting for you to finish LinkedIn login in Chrome…";
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (!jar) {
        job.running = false;
        job.done = true;
        job.error = "Timed out. Click Connect again and sign into LinkedIn in the Chrome window that opens.";
        return;
      }
      await finish(jar);
    } catch (err: any) {
      job.running = false;
      job.done = true;
      job.error =
        err?.message ||
        "Could not open Google Chrome. Install Chrome, then click Connect again.";
    }
  })();

  return job;
}

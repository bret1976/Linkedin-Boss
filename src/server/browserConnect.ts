import { existsSync, mkdirSync } from "fs";
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

export function browserJob(userId: string) {
  return jobs.get(userId);
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

async function waitForCdp(port: number, ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return (await res.json()) as { webSocketDebuggerUrl: string };
    } catch {
      /* Chrome still starting */
    }
    await new Promise((r) => setTimeout(r, 300));
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

async function readLinkedInCookies(port: number): Promise<CookieJar | null> {
  const version = await waitForCdp(port);
  const result = await cdp(version.webSocketDebuggerUrl, "Network.getAllCookies");
  const cookies = (result?.cookies || []) as { name: string; value: string; domain?: string }[];
  const liAt = cookies.find((c) => c.name === "li_at" && /linkedin/i.test(c.domain || ""))?.value
    || cookies.find((c) => c.name === "li_at")?.value
    || "";
  const jsessionRaw = cookies.find((c) => c.name === "JSESSIONID" && /linkedin/i.test(c.domain || ""))?.value
    || cookies.find((c) => c.name === "JSESSIONID")?.value
    || "";
  const jsession = jsessionRaw.replace(/^"|"$/g, "");
  if (liAt.length < 20) return null;
  return {
    liAt,
    jsession: jsession.startsWith("ajax:") ? jsession : jsession ? `ajax:${jsession}` : "",
  };
}

export async function captureLinkedInLogin(userId: string, profileUrl?: string): Promise<BrowserJob> {
  const existing = jobs.get(userId);
  if (existing?.running) return existing;

  const job: BrowserJob = {
    running: true,
    done: false,
    message: "Opening Google Chrome on LinkedIn. Log in there if asked — that is a normal Chrome window, not a bot.",
  };
  jobs.set(userId, job);

  void (async () => {
    const dir = path.join(process.cwd(), "data", "chrome-profile", userId);
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
        /* extract can still run with the cookie */
      }
      if (profileUrl && !profile.profile_url) profile.profile_url = profileUrl;

      job.jar = jar;
      job.profile = profile;
      job.running = false;
      job.done = true;
      job.message = `Signed in as ${profile.name}. Loading contacts…`;
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

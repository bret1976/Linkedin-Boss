import { mkdirSync } from "fs";
import path from "path";
import { chromium, type BrowserContext } from "playwright";
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
const contexts = new Map<string, BrowserContext>();

export function browserJob(userId: string) {
  return jobs.get(userId);
}

export async function cancelBrowser(userId: string) {
  const ctx = contexts.get(userId);
  if (ctx) {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    contexts.delete(userId);
  }
}

export async function captureLinkedInLogin(userId: string): Promise<BrowserJob> {
  const existing = jobs.get(userId);
  if (existing?.running) return existing;

  const job: BrowserJob = {
    running: true,
    done: false,
    message: "Opening Chrome. Log into LinkedIn in that window if it asks.",
  };
  jobs.set(userId, job);

  void (async () => {
    const dir = path.join(process.cwd(), "data", "browser", userId);
    mkdirSync(dir, { recursive: true });
    let context: BrowserContext | null = null;
    try {
      const launch = {
        headless: false as const,
        viewport: { width: 1280, height: 860 },
        args: ["--disable-blink-features=AutomationControlled"],
      };
      try {
        context = await chromium.launchPersistentContext(dir, { ...launch, channel: "chrome" });
      } catch {
        context = await chromium.launchPersistentContext(dir, launch);
      }
      contexts.set(userId, context);
      const page = context.pages()[0] || (await context.newPage());
      await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 45000 });
      job.message = "Chrome is open. Log into LinkedIn there. This screen waits until you are in.";

      const deadline = Date.now() + 5 * 60 * 1000;
      let jar: CookieJar | null = null;
      while (Date.now() < deadline) {
        const cookies = await context.cookies("https://www.linkedin.com");
        const liAt = cookies.find((c) => c.name === "li_at")?.value || "";
        const jsession = (cookies.find((c) => c.name === "JSESSIONID")?.value || "").replace(/^"|"$/g, "");
        const url = page.url();
        const loggedIn = liAt.length > 20 && !/\/login|\/checkpoint|\/uas\/login/i.test(url);
        if (loggedIn) {
          jar = { liAt, jsession: jsession.startsWith("ajax:") ? jsession : jsession ? `ajax:${jsession}` : "" };
          break;
        }
        job.message = "Waiting for LinkedIn login in the Chrome window…";
        await page.waitForTimeout(1500);
      }

      if (!jar) {
        job.running = false;
        job.done = true;
        job.error = "Timed out waiting for LinkedIn login. Click the button again and sign in in the Chrome window.";
        return;
      }
      if (!jar.jsession) jar.jsession = await discoverJsession(jar.liAt);

      let profile = {
        name: "LinkedIn member",
        headline: "",
        username: "",
        profile_url: "https://www.linkedin.com",
        avatar_url: "",
      };
      try {
        profile = await fetchVoyagerMe(jar);
      } catch {
        /* cookie is enough to extract */
      }

      job.jar = jar;
      job.profile = profile;
      job.running = false;
      job.done = true;
      job.message = `Signed in as ${profile.name}. Extracting contacts…`;
    } catch (err: any) {
      job.running = false;
      job.done = true;
      job.error = err?.message || "Could not open Chrome. Install Google Chrome and try again.";
    } finally {
      if (context) {
        try {
          await context.close();
        } catch {
          /* ignore */
        }
        contexts.delete(userId);
      }
    }
  })();

  return job;
}

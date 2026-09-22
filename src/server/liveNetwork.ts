/**
 * Live people + LinkedIn session helpers. No celebrity seed lists.
 */

export type LivePerson = {
  id: string;
  name: string;
  headline: string;
  company: string;
  industry: string;
  location: string;
  avatarUrl: string;
  connectionDegree: "1st" | "2nd" | "3rd+";
  mutualConnectionsCount: number;
  sharedMutualConnections: string[];
  skills: string[];
  graphLayer: "direct" | "extended" | "venture" | "ai-tech" | "executive";
  profileUrl: string;
  source: "linkedin" | "wikidata";
};

export type CookieJar = { liAt: string; jsession: string };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const WIKI_UA = "LinkedinBoss/1.0 (https://github.com/bret1976/Linkedin-Boss)";

export function parseLinkedInCookies(raw: string): CookieJar | null {
  const text = String(raw || "").trim();
  if (!text) return null;
  let liAt = "";
  let jsession = "";

  const take = (name: string, value: string) => {
    const n = name.trim();
    const v = String(value || "").trim().replace(/^"|"$/g, "");
    if (n === "li_at" || n === "li_a") liAt = v;
    if (n === "JSESSIONID" || n === "jsessionid") jsession = v;
  };

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed.cookies || parsed.Cookies || [];
      if (Array.isArray(rows)) {
        for (const item of rows) {
          take(String(item?.name || item?.Name || ""), String(item?.value || item?.Value || ""));
        }
      }
    } catch {
      /* fall through */
    }
  }

  const cookieMap = new Map<string, string>();
  for (const part of text.split(/;\s*/)) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    cookieMap.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim().replace(/^"|"$/g, ""));
  }
  if (!liAt) liAt = cookieMap.get("li_at") || cookieMap.get("li_a") || "";
  if (!jsession) jsession = cookieMap.get("JSESSIONID") || "";

  const named = text.match(/\bli_at["']?\s*[:=]\s*["']?([A-Za-z0-9_\-]+)/);
  if (!liAt && named?.[1]) liAt = named[1];
  if (!liAt && /^AQE/i.test(text) && !text.includes("=")) liAt = text.replace(/\s+/g, "");
  if (!liAt && text.startsWith("li_at=")) liAt = text.replace(/^li_at=/, "").split(";")[0].trim();

  if (!liAt || liAt.length < 10) return null;
  if (jsession && !jsession.startsWith("ajax:")) jsession = jsession.includes("ajax") ? jsession : `ajax:${jsession}`;
  return { liAt, jsession };
}

export function voyagerHeaders(jar: CookieJar): Record<string, string> {
  const csrf = jar.jsession || "ajax:linkedin-boss";
  const cookie = jar.jsession
    ? `li_at=${jar.liAt}; JSESSIONID="${jar.jsession}"`
    : `li_at=${jar.liAt}`;
  return {
    Cookie: cookie,
    "csrf-token": csrf,
    "x-restli-protocol-version": "2.0.0",
    "User-Agent": UA,
    Accept: "application/vnd.linkedin.normalized+json+2.1",
  };
}

export async function discoverJsession(liAt: string): Promise<string> {
  for (const url of ["https://www.linkedin.com/feed/", "https://www.linkedin.com/", "https://www.linkedin.com/mynetwork/"]) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { Cookie: `li_at=${liAt}`, "User-Agent": UA, Accept: "text/html" },
      });
      const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      const joined = [...setCookie, res.headers.get("set-cookie") || ""].join("; ");
      const match = joined.match(/JSESSIONID="?(ajax:[^";]+)/i);
      if (match?.[1]) return match[1];
    } catch {
      /* next */
    }
  }
  return "";
}

function layerFromHeadline(headline: string): LivePerson["graphLayer"] {
  const t = headline.toLowerCase();
  if (/venture|investor|capital|angel|partner @|general partner/.test(t)) return "venture";
  if (/\bai\b|engineer|research|machine learning|data scien/.test(t)) return "ai-tech";
  if (/ceo|founder|cto|cfo|coo|president|managing director|\bvp\b|chief /.test(t)) return "executive";
  return "direct";
}

function industryFromHeadline(headline: string): string {
  const t = headline.toLowerCase();
  if (/venture|investor|capital/.test(t)) return "Venture Capital";
  if (/\bai\b|machine learning|software|engineer/.test(t)) return "Technology";
  if (/health|bio/.test(t)) return "Healthcare";
  return "Professional Services";
}

export function companyFromHeadline(headline: string): string {
  const text = headline || "";
  const at = text.match(/(?:^|\s)(?:at|@)\s+([^|,•\n]+)/i);
  if (at?.[1]) return at[1].replace(/\s+/g, " ").trim();
  const parts = text.split(/\s*[|•]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/^(?:at|@)\s+/i, "");
    if (last.length > 1 && last.length < 80) return last;
  }
  return "";
}

function looksLikePerson(title: string, extract: string): boolean {
  if (/^list of|venture capital firm|private equity firm/i.test(title)) return false;
  if (/\bborn\b|\bentrepreneur\b|\binvestor\b|\bexecutive\b|\bpartner\b|\bCEO\b/i.test(`${title} ${extract}`)) return true;
  if (/is a .{0,60}(firm|company|enterprises)\b/i.test(extract) && !/\bborn\b/.test(extract)) return false;
  return /\bhe\b|\bshe\b|\bhis\b|\bher\b/.test(extract);
}

async function wikipediaCompanyPeople(company: string, industry = ""): Promise<LivePerson[]> {
  const data = (await wikiJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${company} partner OR founder OR CEO`)}&srlimit=16&format=json`,
  )) as { query?: { search?: { title: string }[] } };
  const out: LivePerson[] = [];
  for (const hit of data.query?.search || []) {
    const portrait = await wikipediaPortrait(hit.title);
    if (!looksLikePerson(hit.title, portrait.extract)) continue;
    out.push({
      id: `wiki-${hit.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: hit.title,
      headline: portrait.extract.split(".")[0] || `Associated with ${company}`,
      company,
      industry: industry || industryFromHeadline(portrait.extract),
      location: "",
      avatarUrl: portrait.image,
      connectionDegree: "3rd+",
      mutualConnectionsCount: 0,
      sharedMutualConnections: [],
      skills: skillsFromText(company, industry, portrait.extract),
      graphLayer: layerFromHeadline(`${hit.title} ${portrait.extract} ${company}`),
      profileUrl: portrait.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/\s+/g, "_"))}`,
      source: "wikidata",
    });
  }
  return out;
}

function skillsFromText(...parts: string[]): string[] {
  const blob = parts.join(" ");
  const hits = [
    "Venture Capital",
    "Artificial Intelligence",
    "Product Strategy",
    "Software Engineering",
    "Sales",
    "Marketing",
    "Finance",
    "Operations",
    "Design",
    "Data Science",
    "Machine Learning",
    "Partnerships",
  ].filter((s) => blob.toLowerCase().includes(s.toLowerCase()));
  return hits.slice(0, 6);
}

export async function fetchVoyagerMe(jar: CookieJar) {
  const res = await fetch("https://www.linkedin.com/voyager/api/me", { headers: voyagerHeaders(jar) });
  if (!res.ok) {
    const err = new Error(`LinkedIn session rejected (${res.status}). Export a fresh Cookie-Editor JSON while you are logged into linkedin.com.`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as Record<string, unknown>;
  const included = (Array.isArray(data.included) ? data.included : []) as Record<string, unknown>[];
  const mini =
    (data.miniProfile as Record<string, unknown> | undefined) ||
    included.find((e) => e.firstName || (e.miniProfile as Record<string, unknown> | undefined)?.firstName) ||
    {};
  const profile = ((mini.miniProfile as Record<string, unknown>) || mini) as Record<string, unknown>;
  const first = String(profile.firstName || data.firstName || "");
  const last = String(profile.lastName || data.lastName || "");
  const publicId = String(profile.publicIdentifier || data.publicIdentifier || "");
  return {
    name: `${first} ${last}`.trim() || "LinkedIn member",
    headline: String(profile.occupation || profile.headline || ""),
    username: publicId,
    profile_url: publicId ? `https://www.linkedin.com/in/${publicId}` : "https://www.linkedin.com",
    avatar_url: "",
  };
}

export async function fetchVoyagerFullProfile(jar: CookieJar, publicId = "") {
  const me = await fetchVoyagerMe(jar);
  const id = publicId || me.username;
  const headlineBits = [me.headline];
  const companies: string[] = [];
  const skills: string[] = [];
  let location = "";
  let industry = industryFromHeadline(me.headline);

  const urls = id
    ? [
        `https://www.linkedin.com/voyager/api/identity/profiles/${encodeURIComponent(id)}/profileView`,
        `https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${encodeURIComponent(id)}`,
      ]
    : [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: voyagerHeaders(jar) });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      const profile = (data.profile as Record<string, unknown>) || {};
      if (profile.headline) headlineBits.push(String(profile.headline));
      if (profile.industryName) industry = String(profile.industryName);
      const loc = profile.geoLocationName || profile.locationName;
      if (loc) location = String(loc);
      const posView = data.positionView as { elements?: Record<string, unknown>[] } | undefined;
      for (const pos of posView?.elements || []) {
        const title = String(pos.title || "");
        const company = String(pos.companyName || (pos.company as { name?: string } | undefined)?.name || "");
        if (title) headlineBits.push(title);
        if (company) companies.push(company);
      }
      for (const item of collectMinis(data)) {
        const type = String(item["$type"] || item.type || "");
        if (/[Pp]osition/.test(type) || item.companyName) {
          const company = String(item.companyName || "");
          const title = String(item.title || "");
          if (company) companies.push(company);
          if (title) headlineBits.push(title);
        }
        if (/[Ss]kill/.test(type) && item.name) skills.push(String(item.name));
      }
      break;
    } catch {
      /* try next */
    }
  }

  const headline = headlineBits.filter(Boolean)[0] || me.headline;
  const company = companies[0] || companyFromHeadline(headline);
  const extraSkills = skillsFromText(headline, company, industry, ...skills);
  return {
    ...me,
    headline,
    company,
    industry,
    location,
    skills: [...new Set([...skills, ...extraSkills])].slice(0, 12),
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function personFromMini(
  item: Record<string, unknown>,
  userName: string,
  degree: LivePerson["connectionDegree"],
): LivePerson | null {
  const mini = ((item.miniProfile as Record<string, unknown>) || item) as Record<string, unknown>;
  const first = String(mini.firstName || item.firstName || "");
  const last = String(mini.lastName || item.lastName || "");
  const fullName = `${first} ${last}`.trim() || String(mini.publicIdentifier || "");
  const publicId = String(mini.publicIdentifier || item.publicId || "");
  if (fullName.length < 2) return null;
  const occupation = String(mini.occupation || mini.headline || item.headline || "");
  let avatar = "";
  const pic = (mini.picture || item.picture) as
    | { rootUrl?: string; artifacts?: { fileIdentifyingUrlPathSegment?: string }[] }
    | undefined;
  if (pic?.rootUrl && pic.artifacts?.length) {
    const lastArt = pic.artifacts[pic.artifacts.length - 1];
    avatar = `${pic.rootUrl}${lastArt.fileIdentifyingUrlPathSegment || ""}`;
  }
  return {
    id: `li-${publicId || fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: fullName,
    headline: occupation || "LinkedIn connection",
    company: companyFromHeadline(occupation) || "",
    industry: industryFromHeadline(occupation),
    location: String(item.location || ""),
    avatarUrl: avatar,
    connectionDegree: degree,
    mutualConnectionsCount: Number(item.mutualConnectionsCount || 0) || 0,
    sharedMutualConnections: userName ? [userName] : [],
    skills: skillsFromText(occupation),
    graphLayer: layerFromHeadline(occupation),
    profileUrl: publicId ? `https://www.linkedin.com/in/${publicId}` : "https://www.linkedin.com",
    source: "linkedin",
  };
}

function collectMinis(data: Record<string, unknown>): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const push = (item: unknown) => {
    if (item && typeof item === "object") rows.push(item as Record<string, unknown>);
  };
  if (Array.isArray(data.included)) data.included.forEach(push);
  if (Array.isArray(data.elements)) data.elements.forEach(push);
  const nested = data.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.elements)) nested.elements.forEach(push);
  return rows;
}

export type ExtractResult = { people: LivePerson[]; error?: string; lastStatus?: number };

function ingestPeople(out: LivePerson[], seen: Set<string>, items: Record<string, unknown>[], userName: string, degree: LivePerson["connectionDegree"]) {
  let added = 0;
  for (const item of items) {
    const person = personFromMini(item, userName, degree);
    if (!person) continue;
    const key = person.profileUrl.toLowerCase();
    if (seen.has(key) || seen.has(person.name.toLowerCase())) continue;
    seen.add(key);
    seen.add(person.name.toLowerCase());
    out.push(person);
    added++;
  }
  return added;
}

async function scrapeConnectionsHtml(jar: CookieJar, userName: string, seen: Set<string>, out: LivePerson[]) {
  const res = await fetch("https://www.linkedin.com/mynetwork/invite-connect/connections/", {
    headers: { ...voyagerHeaders(jar), Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) return res.status;
  const html = await res.text();
  const blobs = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)].map((m) =>
    m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'"),
  );
  for (const blob of blobs) {
    if (!blob.includes("publicIdentifier") && !blob.includes("firstName")) continue;
    try {
      const data = JSON.parse(blob);
      const rows = collectMinis(typeof data === "object" && data ? data : {});
      if (Array.isArray(data)) data.forEach((item) => typeof item === "object" && item && rows.push(item));
      ingestPeople(out, seen, rows, userName, "1st");
    } catch {
      const ids = [...blob.matchAll(/"publicIdentifier"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      const firsts = [...blob.matchAll(/"firstName"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      const lasts = [...blob.matchAll(/"lastName"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      const occs = [...blob.matchAll(/"occupation"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      for (let i = 0; i < ids.length; i++) {
        ingestPeople(
          out,
          seen,
          [
            {
              firstName: firsts[i] || "",
              lastName: lasts[i] || "",
              publicIdentifier: ids[i],
              occupation: occs[i] || "",
            },
          ],
          userName,
          "1st",
        );
      }
    }
  }
  return res.status;
}

export async function extractFirstDegree(
  jar: CookieJar,
  userName: string,
  opts: { max?: number; onProgress?: (count: number) => void } = {},
): Promise<ExtractResult> {
  const max = opts.max ?? 8000;
  const pageSize = 50;
  const seen = new Set<string>();
  const out: LivePerson[] = [];
  let lastStatus = 0;
  const bases = [
    (start: number) =>
      `https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.relationships.Connection-26&count=${pageSize}&start=${start}&q=search`,
    (start: number) =>
      `https://www.linkedin.com/voyager/api/relationships/connections?count=${pageSize}&start=${start}&sortType=RECENTLY_ADDED`,
    (start: number) =>
      `https://www.linkedin.com/voyager/api/search/hits?q=people&origin=MEMBER_PROFILE_CANNED_SEARCH&count=${pageSize}&start=${start}&facetNetwork=${encodeURIComponent('["F"]')}`,
  ];

  for (const makeUrl of bases) {
    let emptyPages = 0;
    for (let start = 0; start < max; start += pageSize) {
      let added = 0;
      try {
        const res = await fetch(makeUrl(start), { headers: voyagerHeaders(jar) });
        lastStatus = res.status;
        if (!res.ok) {
          emptyPages++;
          if (emptyPages >= 2) break;
          continue;
        }
        const data = (await res.json()) as Record<string, unknown>;
        added = ingestPeople(out, seen, collectMinis(data), userName, "1st");
      } catch {
        emptyPages++;
      }
      opts.onProgress?.(out.length);
      if (!added) {
        emptyPages++;
        if (emptyPages >= 2) break;
      } else {
        emptyPages = 0;
      }
      await sleep(350);
    }
    if (out.length) break;
  }

  if (!out.length) {
    try {
      lastStatus = await scrapeConnectionsHtml(jar, userName, seen, out);
      opts.onProgress?.(out.length);
    } catch {
      /* ignore */
    }
  }

  if (!out.length) {
    return {
      people: [],
      lastStatus,
      error:
        lastStatus === 401 || lastStatus === 403
          ? `LinkedIn rejected the session (${lastStatus}). Export a fresh Cookie-Editor JSON while logged into linkedin.com — a profile URL cannot list contacts.`
          : `LinkedIn returned no connections (HTTP ${lastStatus || "no response"}). The cookie is missing, expired, or LinkedIn blocked the extract.`,
    };
  }
  return { people: out, lastStatus };
}

export async function extractSecondDegree(
  jar: CookieJar,
  userName: string,
  opts: { max?: number; onProgress?: (count: number) => void } = {},
): Promise<LivePerson[]> {
  const max = opts.max ?? 2000;
  const pageSize = 50;
  const seen = new Set<string>();
  const out: LivePerson[] = [];
  const urls = (start: number) => [
    `https://www.linkedin.com/voyager/api/search/hits?q=all&origin=SWITCH_SEARCH_VERTICAL&count=${pageSize}&start=${start}&facetNetwork=${encodeURIComponent('["S"]')}`,
    `https://www.linkedin.com/voyager/api/search/blended?filters=List(network-%3ES)&keywords=&count=${pageSize}&start=${start}`,
  ];

  for (let start = 0; start < max; start += pageSize) {
    let added = 0;
    for (const url of urls(start)) {
      try {
        const res = await fetch(url, { headers: voyagerHeaders(jar) });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        for (const item of collectMinis(data)) {
          const person = personFromMini(item, userName, "2nd");
          if (!person) continue;
          const key = person.profileUrl.toLowerCase();
          if (seen.has(key) || seen.has(person.name.toLowerCase())) continue;
          seen.add(key);
          seen.add(person.name.toLowerCase());
          out.push(person);
          added++;
        }
        if (added) break;
      } catch {
        /* next url */
      }
    }
    opts.onProgress?.(out.length);
    if (!added) break;
    await sleep(500);
  }
  return out;
}

export async function fetchVoyagerConnections(jar: CookieJar, userName: string): Promise<LivePerson[]> {
  const result = await extractFirstDegree(jar, userName, { max: 8000 });
  return result.people;
}

export function connectionsToCsv(people: LivePerson[]): string {
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const header = "First Name,Last Name,URL,Company,Position,Degree,Industry,Location";
  const lines = people.map((p) => {
    const parts = p.name.split(/\s+/);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");
    return [first, last, p.profileUrl, p.company, p.headline, p.connectionDegree, p.industry, p.location]
      .map(esc)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export function csvToConnections(csv: string): LivePerson[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const out: LivePerson[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
    const get = (name: string, idx: number) => {
      const i = header.split(",").findIndex((h) => h.replace(/"/g, "").trim() === name);
      return (i >= 0 ? cols[i] : cols[idx]) || "";
    };
    const first = get("first name", 0);
    const last = get("last name", 1);
    const url = get("url", 2);
    const company = get("company", 3);
    const position = get("position", 4);
    const degree = (get("degree", 5) || "1st") as LivePerson["connectionDegree"];
    const name = `${first} ${last}`.trim();
    if (!name) continue;
    out.push({
      id: `csv-${url || name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      headline: position,
      company,
      industry: industryFromHeadline(`${position} ${company}`),
      location: get("location", 7),
      avatarUrl: "",
      connectionDegree: degree === "2nd" || degree === "3rd+" ? degree : "1st",
      mutualConnectionsCount: 0,
      sharedMutualConnections: [],
      skills: skillsFromText(position, company),
      graphLayer: layerFromHeadline(`${position} ${company}`),
      profileUrl: url || "https://www.linkedin.com",
      source: "linkedin",
    });
  }
  return out;
}

async function wikiJson(url: string, ms = 12000) {
  const res = await fetch(url, {
    headers: { "User-Agent": WIKI_UA, Accept: "application/json" },
    signal: AbortSignal.timeout(ms),
  });
  if (res.status === 429) throw new Error("Wikidata 429");
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  return res.json();
}

async function wikipediaPortrait(name: string): Promise<{ extract: string; image: string; url: string }> {
  const slug = encodeURIComponent(name.replace(/\s+/g, "_"));
  try {
    const data = (await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)) as {
      type?: string;
      extract?: string;
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    if (data.type === "disambiguation") return { extract: "", image: "", url: "" };
    return {
      extract: data.extract || "",
      image: data.thumbnail?.source || "",
      url: data.content_urls?.desktop?.page || "",
    };
  } catch {
    return { extract: "", image: "", url: "" };
  }
}

export async function wikidataCompanyPeers(company: string, industry = ""): Promise<LivePerson[]> {
  const org = company.trim();
  if (org.length < 2) return [];
  try {
  const search = (await wikiJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(org)}&language=en&format=json&type=item&limit=3`,
  )) as { search?: { id: string; label?: string }[] };
  const qid = search.search?.[0]?.id;
  if (!qid) return wikipediaCompanyPeople(org, industry);

  const sparql = `SELECT DISTINCT ?person ?personLabel ?linkedin ?img WHERE {
    ?person wdt:P108 wd:${qid}.
    OPTIONAL { ?person wdt:P6634 ?linkedin }
    OPTIONAL { ?person wdt:P18 ?img }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 36`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const data = (await wikiJson(url)) as {
    results?: { bindings?: Record<string, { value?: string }>[] };
  };
  const rows = data.results?.bindings || [];
  const out: LivePerson[] = [];
  for (const row of rows) {
    const name = row.personLabel?.value || "";
    if (!name || name.startsWith("Q") || name === org) continue;
    const linkedin = row.linkedin?.value || "";
    const img = row.img?.value || "";
    const commons = img.includes("Special:FilePath")
      ? img
      : img
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img.split("/").pop() || "")}?width=400`
        : "";
    const portrait = commons ? { extract: "", image: commons, url: "" } : await wikipediaPortrait(name);
    const headline = `${name} · ${org}`;
    out.push({
      id: `wd-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      headline: portrait.extract ? portrait.extract.split(".")[0] : `Works with ${org}`,
      company: org,
      industry: industry || industryFromHeadline(org),
      location: "",
      avatarUrl: portrait.image || commons,
      connectionDegree: "3rd+",
      mutualConnectionsCount: 0,
      sharedMutualConnections: [],
      skills: skillsFromText(org, industry, portrait.extract),
      graphLayer: layerFromHeadline(`${headline} ${org} ${industry}`),
      profileUrl: linkedin
        ? `https://www.linkedin.com/in/${linkedin}`
        : portrait.url || `https://www.wikidata.org/wiki/${row.person?.value?.split("/").pop() || ""}`,
      source: "wikidata",
    });
  }
  return out.length ? out : wikipediaCompanyPeople(org, industry);
  } catch {
    return wikipediaCompanyPeople(org, industry);
  }
}

export function parseProfileFromText(text: string): {
  name: string;
  headline: string;
  company: string;
  industry: string;
  location: string;
  skills: string[];
  summary: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const name = (lines[0] || "").replace(/[^a-zA-Z ,.'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const headline = (lines[1] || lines.find((l) => /founder|engineer|director|manager|officer|partner/i.test(l)) || "").slice(0, 160);
  const companyLine = lines.find((l) => /(?:at|@)\s+\S/.test(l)) || "";
  const company = companyFromHeadline(companyLine) || (lines.find((l) => /inc\.|labs|capital|ventures|studio/i.test(l)) || "").slice(0, 80);
  const locLine = lines.find((l) => /,\s*[A-Z]{2}\b|united states|remote/i.test(l)) || "";
  const skillsIdx = lines.findIndex((l) => /^skills\b/i.test(l));
  const skills =
    skillsIdx >= 0
      ? lines
          .slice(skillsIdx + 1, skillsIdx + 8)
          .join(",")
          .split(/[,•|]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2 && s.length < 40)
          .slice(0, 8)
      : skillsFromText(text);
  return {
    name: name || "Unknown",
    headline: headline || "Professional",
    company,
    industry: industryFromHeadline(`${headline} ${text.slice(0, 400)}`),
    location: locLine.slice(0, 80),
    skills,
    summary: text.slice(0, 1200),
  };
}

export async function analyzeProfileText(text: string): Promise<ReturnType<typeof parseProfileFromText>> {
  const fallback = parseProfileFromText(text);
  const key = process.env.XAI_API_KEY?.trim();
  if (!key || text.trim().length < 40) return fallback;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Extract a professional profile as JSON only: {name,headline,company,industry,location,skills:string[]}. Use only facts in the text. Empty string if unknown.",
          },
          { role: "user", content: text.slice(0, 8000) },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content || "";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      name: String(json.name || fallback.name),
      headline: String(json.headline || fallback.headline),
      company: String(json.company || fallback.company),
      industry: String(json.industry || fallback.industry),
      location: String(json.location || fallback.location),
      skills: Array.isArray(json.skills) ? json.skills.map(String).slice(0, 8) : fallback.skills,
      summary: fallback.summary,
    };
  } catch {
    return fallback;
  }
}

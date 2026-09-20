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

  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const name = String(item?.name || "");
          const value = String(item?.value || "");
          if (name === "li_at") liAt = value;
          if (name === "JSESSIONID") jsession = value.replace(/^"|"$/g, "");
        }
      }
    } catch {
      /* fall through */
    }
  }

  const cookieMap = new Map<string, string>();
  for (const part of text.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    cookieMap.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim().replace(/^"|"$/g, ""));
  }
  if (!liAt) liAt = cookieMap.get("li_at") || "";
  if (!jsession) jsession = cookieMap.get("JSESSIONID") || "";

  if (!liAt && /^AQE/i.test(text) && !text.includes("=")) liAt = text;
  if (!liAt && text.startsWith("li_at=")) liAt = text.replace(/^li_at=/, "").split(";")[0].trim();

  if (!liAt || liAt.length < 10) return null;
  if (jsession && !jsession.startsWith("ajax:")) jsession = jsession.startsWith("ajax") ? jsession : `ajax:${jsession}`;
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
  try {
    const res = await fetch("https://www.linkedin.com/feed/", {
      method: "GET",
      redirect: "manual",
      headers: { Cookie: `li_at=${liAt}`, "User-Agent": UA },
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    const joined = setCookie.join("; ") + (res.headers.get("set-cookie") || "");
    const match = joined.match(/JSESSIONID="?(ajax:[^";]+)/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
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

function companyFromHeadline(headline: string): string {
  const m = headline.match(/(?:at|@)\s+([^|,•\n]+)/i);
  return (m?.[1] || "").trim();
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
  if (!res.ok) throw new Error(`LinkedIn session rejected (${res.status}). Paste a fresh li_at + JSESSIONID cookie export.`);
  const data = (await res.json()) as Record<string, unknown>;
  const included = (Array.isArray(data.included) ? data.included : []) as Record<string, unknown>[];
  const mini =
    included.find((e) => e.firstName || (e.miniProfile as Record<string, unknown> | undefined)?.firstName) || {};
  const profile = ((mini.miniProfile as Record<string, unknown>) || mini) as Record<string, unknown>;
  const first = String(profile.firstName || "");
  const last = String(profile.lastName || "");
  const publicId = String(profile.publicIdentifier || "");
  return {
    name: `${first} ${last}`.trim() || "LinkedIn member",
    headline: String(profile.occupation || ""),
    username: publicId,
    profile_url: publicId ? `https://www.linkedin.com/in/${publicId}` : "https://www.linkedin.com",
    avatar_url: "",
  };
}

export async function fetchVoyagerConnections(jar: CookieJar, userName: string): Promise<LivePerson[]> {
  const endpoints = [
    "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.relationships.Connection-26&count=50&q=search",
    "https://www.linkedin.com/voyager/api/relationships/connections?count=50&sortType=RECENTLY_ADDED",
  ];
  const out: LivePerson[] = [];
  const seen = new Set<string>();

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: voyagerHeaders(jar) });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      const rows = (Array.isArray(data.included) ? data.included : Array.isArray(data.elements) ? data.elements : []) as Record<
        string,
        unknown
      >[];
      for (const item of rows) {
        const mini = ((item.miniProfile as Record<string, unknown>) || item) as Record<string, unknown>;
        const first = String(mini.firstName || "");
        const last = String(mini.lastName || "");
        const fullName = `${first} ${last}`.trim();
        const publicId = String(mini.publicIdentifier || "");
        if (fullName.length < 2 || seen.has(fullName.toLowerCase())) continue;
        seen.add(fullName.toLowerCase());
        const occupation = String(mini.occupation || mini.headline || "");
        let avatar = "";
        const pic = (mini.picture || item.picture) as { rootUrl?: string; artifacts?: { fileIdentifyingUrlPathSegment?: string }[] } | undefined;
        if (pic?.rootUrl && pic.artifacts?.length) {
          const lastArt = pic.artifacts[pic.artifacts.length - 1];
          avatar = `${pic.rootUrl}${lastArt.fileIdentifyingUrlPathSegment || ""}`;
        }
        out.push({
          id: `li-${publicId || out.length}`,
          name: fullName,
          headline: occupation || "LinkedIn connection",
          company: companyFromHeadline(occupation) || "",
          industry: industryFromHeadline(occupation),
          location: "",
          avatarUrl: avatar,
          connectionDegree: "1st",
          mutualConnectionsCount: 0,
          sharedMutualConnections: userName ? [userName] : [],
          skills: skillsFromText(occupation),
          graphLayer: layerFromHeadline(occupation),
          profileUrl: publicId ? `https://www.linkedin.com/in/${publicId}` : "https://www.linkedin.com",
          source: "linkedin",
        });
      }
      if (out.length) break;
    } catch {
      /* try next */
    }
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

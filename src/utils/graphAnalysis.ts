import { LinkedInMatchProfile, UserUploadedProfile } from '../types/knowledgeGraph';

export type CandidateProfile = Omit<LinkedInMatchProfile, 'matchScore' | 'scorecard' | 'keyAlignmentReasons' | 'recommendedPitch'>;

const STOP = new Set(
  "the a an and or of to for in on at as by with from this that those these your our their its it's is are was were be been being not no yes just more most via into over under and who what how".split(
    " ",
  ),
);

const ROLE_GROUPS: [string, string[]][] = [
  ["founder", ["founder", "cofounder", "co-founder", "ceo", "owner", "entrepreneur", "studio"]],
  ["product", ["product", "cpo", "roadmap"]],
  ["engineer", ["engineer", "developer", "software", "cto", "swe", "programmer", "technical"]],
  ["design", ["design", "designer", "ux", "ui", "brand"]],
  ["sales", ["sales", "account", "revenue", "sdr", "ae", "go-to-market", "gtm"]],
  ["marketing", ["marketing", "growth", "content", "demand"]],
  ["investor", ["investor", "partner", "venture", "capital", "gp", "angel"]],
  ["talent", ["recruiter", "talent", "people", "hr"]],
  ["finance", ["finance", "cfo", "controller", "accounting"]],
  ["ops", ["operations", "coo", "ops", "chief of staff"]],
  ["video", ["video", "film", "media", "creative", "director", "producer", "editor"]],
  ["ai", ["ai", "ml", "machine", "llm", "artificial"]],
];

function tokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return { count: 0, jaccard: 0, shared: [] as string[] };
  const shared: string[] = [];
  for (const w of a) if (b.has(w)) shared.push(w);
  return { count: shared.length, jaccard: shared.length / (a.size + b.size - shared.length), shared };
}

function roles(text: string) {
  const t = text.toLowerCase();
  return ROLE_GROUPS.filter(([, words]) => words.some((w) => t.includes(w))).map(([name]) => name);
}

function clamp(n: number, lo = 1, hi = 99) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export function calculateProfileMatch(
  seed: CandidateProfile,
  user: UserUploadedProfile
): LinkedInMatchProfile {
  const userBlob = `${user.name} ${user.headline} ${user.industry} ${user.company} ${(user.skills || []).join(" ")}`;
  const seedBlob = `${seed.name} ${seed.headline} ${seed.industry} ${seed.company} ${(seed.skills || []).join(" ")}`;
  const title = overlap(tokens(userBlob), tokens(seedBlob));
  const company = overlap(tokens(user.company || ""), tokens(seed.company || ""));
  const sameCompany =
    Boolean(user.company && seed.company) &&
    (user.company.toLowerCase() === seed.company.toLowerCase() || company.count > 0);
  const userRoles = roles(userBlob);
  const seedRoles = roles(seedBlob);
  const sharedRoles = userRoles.filter((r) => seedRoles.includes(r));

  const industryAlignment = clamp(
    sharedRoles.length ? 55 + sharedRoles.length * 14 + title.count * 3 : title.jaccard * 90,
  );
  const businessSynergy = clamp(sameCompany ? 92 + Math.min(6, title.count) : title.jaccard * 55 + company.jaccard * 30);
  const networkOverlap = clamp(
    (seed.connectionDegree === "1st" ? 28 : seed.connectionDegree === "2nd" ? 12 : 4) +
      (sameCompany ? 40 : 0) +
      (seed.mutualConnectionsCount ? Math.min(20, seed.mutualConnectionsCount) : 0),
  );
  const collaborationPotential = clamp(industryAlignment * 0.5 + businessSynergy * 0.35 + networkOverlap * 0.15);

  const matchScore = clamp(
    industryAlignment * 0.38 + businessSynergy * 0.32 + collaborationPotential * 0.18 + networkOverlap * 0.12,
  );

  const keyAlignmentReasons: string[] = [];
  if (sameCompany) keyAlignmentReasons.push(`Same company: ${seed.company}.`);
  if (sharedRoles.length) keyAlignmentReasons.push(`Same function: ${sharedRoles.join(", ")}.`);
  if (title.shared.length) keyAlignmentReasons.push(`Shared language: ${title.shared.slice(0, 8).join(", ")}.`);
  if (!keyAlignmentReasons.length) {
    keyAlignmentReasons.push(`Different work: "${seed.headline || "no title"}" vs your "${user.headline || "profile"}".`);
  }
  keyAlignmentReasons.push(
    seed.connectionDegree === "1st" ? "1st-degree LinkedIn connection." : "Not a 1st-degree connection.",
  );

  const hook = sharedRoles[0] || title.shared[0] || seed.company || "your work";
  const recommendedPitch = `Hi ${seed.name.split(" ")[0]}, ${sameCompany ? `we both have a ${seed.company} connection` : `your ${hook} work overlaps with what I do`}. I'd like to compare notes.`;

  return {
    ...seed,
    matchScore,
    scorecard: {
      businessSynergy,
      networkOverlap,
      industryAlignment,
      collaborationPotential
    },
    keyAlignmentReasons,
    recommendedPitch,
    connected: false
  };
}

export function generateAnalyzedProfiles(
  user: UserUploadedProfile,
  totalCards: number = 20000,
  customConnections?: CandidateProfile[]
): LinkedInMatchProfile[] {
  if (!customConnections?.length) return [];
  return customConnections
    .slice(0, totalCards)
    .map((p) => calculateProfileMatch(p, user))
    .sort((a, b) => b.matchScore - a.matchScore);
}

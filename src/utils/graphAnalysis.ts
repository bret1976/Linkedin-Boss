import { LinkedInMatchProfile, UserUploadedProfile } from '../types/knowledgeGraph';

export type CandidateProfile = Omit<LinkedInMatchProfile, 'matchScore' | 'scorecard' | 'keyAlignmentReasons' | 'recommendedPitch'>;

/**
 * Calculates a personalized matching scorecard and reasoning for a target profile
 * relative to the uploaded/active user profile.
 */
const STOP = new Set(
  "the a an and or of to for in on at as by with from this that those these your our their its it's is are was were be been being not no yes just more most at via into over under".split(
    " ",
  ),
);

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

export function calculateProfileMatch(
  seed: CandidateProfile,
  user: UserUploadedProfile
): LinkedInMatchProfile {
  const userSkills = user.skills || [];
  const seedSkills = seed.skills || [];
  const userTitle = tokens(`${user.headline} ${user.industry} ${userSkills.join(" ")}`);
  const seedTitle = tokens(`${seed.headline} ${seed.industry} ${seedSkills.join(" ")}`);
  const userCo = tokens(user.company || "");
  const seedCo = tokens(seed.company || "");
  const title = overlap(userTitle, seedTitle);
  const company = overlap(userCo, seedCo);
  const sameCompany =
    Boolean(user.company && seed.company) &&
    (user.company.toLowerCase() === seed.company.toLowerCase() || company.count > 0);

  let industryAlignment = Math.round(title.jaccard * 100);
  if (title.count >= 3) industryAlignment = Math.min(99, industryAlignment + 12);
  if (title.count === 0) industryAlignment = Math.min(industryAlignment, 18);

  let businessSynergy = sameCompany ? 88 + Math.min(10, title.count) : Math.round(title.jaccard * 70);
  if (!sameCompany && company.count) businessSynergy += 10;

  let networkOverlap =
    seed.connectionDegree === "1st" ? 72 : seed.connectionDegree === "2nd" ? 44 : 18;
  if (sameCompany) networkOverlap += 14;
  if (seed.mutualConnectionsCount) networkOverlap += Math.min(12, Math.floor(seed.mutualConnectionsCount / 8));

  let collaborationPotential = Math.round(businessSynergy * 0.4 + industryAlignment * 0.4 + networkOverlap * 0.2);

  businessSynergy = Math.min(99, Math.max(4, businessSynergy));
  networkOverlap = Math.min(99, Math.max(4, networkOverlap));
  industryAlignment = Math.min(99, Math.max(4, industryAlignment));
  collaborationPotential = Math.min(99, Math.max(4, collaborationPotential));

  const overallMatch = Math.round(
    industryAlignment * 0.4 +
      businessSynergy * 0.3 +
      networkOverlap * 0.15 +
      collaborationPotential * 0.15,
  );

  const keyAlignmentReasons: string[] = [];
  if (sameCompany) keyAlignmentReasons.push(`Same organization: ${seed.company}.`);
  if (title.shared.length) {
    keyAlignmentReasons.push(`Shared role language: ${title.shared.slice(0, 6).join(", ")}.`);
  } else {
    keyAlignmentReasons.push(`Different function: "${seed.headline || "no title"}" vs your "${user.headline || "profile"}".`);
  }
  keyAlignmentReasons.push(
    seed.connectionDegree === "1st"
      ? "Already a 1st-degree LinkedIn connection."
      : seed.connectionDegree === "2nd"
        ? "2nd-degree: reachable through someone you already know."
        : "Not in your extracted LinkedIn graph.",
  );

  const hook = title.shared[0] || seed.company || seed.industry || "your work";
  const recommendedPitch = `Hi ${seed.name.split(" ")[0]}, ${sameCompany ? `we both have a ${seed.company} connection` : `your work around ${hook} overlaps with what I do`}. I'd like to compare notes.`;

  return {
    ...seed,
    matchScore: overallMatch,
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

/**
 * Score live people against the uploaded profile. Empty input → empty globe.
 */
export function generateAnalyzedProfiles(
  user: UserUploadedProfile,
  totalCards: number = 20000,
  customConnections?: CandidateProfile[]
): LinkedInMatchProfile[] {
  const analyzed: LinkedInMatchProfile[] = [];

  if (!customConnections?.length) return [];
  const sourceProfiles: CandidateProfile[] = customConnections;

  const cap = Math.min(sourceProfiles.length, totalCards);
  for (let i = 0; i < cap; i++) {
    analyzed.push(calculateProfileMatch(sourceProfiles[i], user));
  }

  // Sort descending by match score so best matches appear prominently
  return analyzed.sort((a, b) => b.matchScore - a.matchScore);
}

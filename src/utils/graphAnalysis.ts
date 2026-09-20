import { LinkedInMatchProfile, UserUploadedProfile } from '../types/knowledgeGraph';
import { SEED_LINKEDIN_PROFILES } from '../data/networkGraphData';

/**
 * Deterministic hash algorithm to compute stable contextual weights based on user profile text.
 */
function hashText(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Calculates a personalized matching scorecard and reasoning for a target profile
 * relative to the uploaded/active user profile.
 */
export function calculateProfileMatch(
  seed: typeof SEED_LINKEDIN_PROFILES[0],
  user: UserUploadedProfile
): LinkedInMatchProfile {
  const userText = `${user.name} ${user.headline} ${user.industry} ${user.skills.join(' ')} ${user.company || ''}`.toLowerCase();
  const targetText = `${seed.name} ${seed.headline} ${seed.industry} ${seed.skills.join(' ')} ${seed.company}`.toLowerCase();

  // 1. Calculate shared skill overlap
  const sharedSkills = seed.skills.filter(skill => 
    userText.includes(skill.toLowerCase()) || 
    user.skills.some(us => us.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(us.toLowerCase()))
  );

  const baseHash = hashText(`${user.name}:${seed.id}`);
  const synergyJitter = (baseHash % 16) - 8;

  // 2. Compute component scores (0 - 100)
  let businessSynergy = 78 + Math.min(18, sharedSkills.length * 6) + synergyJitter;
  let networkOverlap = seed.connectionDegree === '1st' ? 92 : seed.connectionDegree === '2nd' ? 84 : 72;
  networkOverlap += Math.min(10, Math.floor(seed.mutualConnectionsCount / 5));

  let industryAlignment = 75;
  if (user.industry && (
    targetText.includes(user.industry.toLowerCase()) || 
    userText.includes(seed.industry.toLowerCase()) ||
    (userText.includes('tech') && targetText.includes('tech')) ||
    (userText.includes('ai') && targetText.includes('ai'))
  )) {
    industryAlignment = 94;
  } else {
    industryAlignment += (baseHash % 12);
  }

  let collaborationPotential = Math.round(
    (businessSynergy * 0.4) + (networkOverlap * 0.3) + (industryAlignment * 0.3)
  );

  // Clamp 65 - 99
  businessSynergy = Math.min(99, Math.max(68, businessSynergy));
  networkOverlap = Math.min(99, Math.max(65, networkOverlap));
  industryAlignment = Math.min(99, Math.max(66, industryAlignment));
  collaborationPotential = Math.min(99, Math.max(70, collaborationPotential));

  const overallMatch = Math.round(
    businessSynergy * 0.35 +
    networkOverlap * 0.25 +
    industryAlignment * 0.20 +
    collaborationPotential * 0.20
  );

  // Generate alignment reasons
  const keyAlignmentReasons: string[] = [];
  if (seed.mutualConnectionsCount > 20) {
    keyAlignmentReasons.push(
      `Strong network proximity with ${seed.mutualConnectionsCount} mutual connections (including ${seed.sharedMutualConnections.slice(0, 2).join(' & ')}).`
    );
  } else {
    keyAlignmentReasons.push(
      `Bridge node connecting your 1st-degree circle to ${seed.sharedMutualConnections[0] || 'executive peers'} in ${seed.location}.`
    );
  }

  if (sharedSkills.length > 0) {
    keyAlignmentReasons.push(
      `Direct domain synergy across shared competencies in ${sharedSkills.join(', ')}.`
    );
  } else {
    keyAlignmentReasons.push(
      `Complementary cross-functional value in ${seed.skills.slice(0, 2).join(' & ')} to accelerate current business objectives.`
    );
  }

  if (seed.graphLayer === 'venture') {
    keyAlignmentReasons.push('Active syndicate & capital pipeline aligned with strategic growth initiatives.');
  } else if (seed.graphLayer === 'ai-tech') {
    keyAlignmentReasons.push('High-impact technical architecture & engineering leadership track record.');
  } else if (seed.graphLayer === 'executive') {
    keyAlignmentReasons.push('Direct C-level decision-making capacity for enterprise pilots and strategic alliances.');
  } else {
    keyAlignmentReasons.push('Strategic commercial channel partner with proven market expansion leverage.');
  }

  const recommendedPitch = `Hi ${seed.name.split(' ')[0]}, I noticed our shared connections with ${seed.sharedMutualConnections[0] || 'mutual leaders'} and our mutual focus on ${seed.skills[0] || seed.industry}. I'd love to connect to discuss potential strategic synergies and exchange perspectives.`;

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
 * Candidate seed profile interface accepted by graph matching.
 */
export type CandidateProfile = Omit<LinkedInMatchProfile, 'matchScore' | 'scorecard' | 'keyAlignmentReasons' | 'recommendedPitch'>;

/**
 * Builds the full array of analyzed LinkedIn profiles mapped across the 48 globe positions.
 * If liveConnections are provided (e.g. from the connected LinkedIn account), they are utilized
 * directly. If not, the engine synthesizes a personalized network ecosystem based on the user's
 * real name, company, industry, and skills.
 */
export function generateAnalyzedProfiles(
  user: UserUploadedProfile,
  totalCards: number = 48,
  customConnections?: CandidateProfile[]
): LinkedInMatchProfile[] {
  const analyzed: LinkedInMatchProfile[] = [];

  // Determine source profiles
  let sourceProfiles: CandidateProfile[] = [];

  if (customConnections && customConnections.length > 0) {
    sourceProfiles = [...customConnections];
  } else {
    // Generate an authentic personalized network around the connected user
    // ensuring 1st, 2nd, and 3rd degree connections dynamically anchor to user's identity
    sourceProfiles = SEED_LINKEDIN_PROFILES.map((seed, idx) => {
      // Personalize mutual connections and shared references to the connected user
      const mutuals = seed.sharedMutualConnections ? [...seed.sharedMutualConnections] : [];
      if (!mutuals.includes(user.name)) {
        mutuals[0] = user.name;
      }

      // If degree is 1st, relate company or industry directly to user's orbit
      let company = seed.company;
      if (seed.connectionDegree === '1st' && idx % 3 === 0 && user.company) {
        company = `${user.company} Partner`;
      }

      return {
        ...seed,
        company,
        sharedMutualConnections: mutuals,
      };
    });
  }

  const poolCount = sourceProfiles.length;

  for (let i = 0; i < totalCards; i++) {
    const candidate = sourceProfiles[i % poolCount];
    const indexSuffix = i >= poolCount ? `-${Math.floor(i / poolCount) + 1}` : '';
    const instanceCandidate: CandidateProfile = {
      ...candidate,
      id: `${candidate.id}${indexSuffix}`,
      name: i >= poolCount ? candidate.name : candidate.name
    };

    const calculated = calculateProfileMatch(instanceCandidate, user);
    analyzed.push(calculated);
  }

  // Sort descending by match score so best matches appear prominently
  return analyzed.sort((a, b) => b.matchScore - a.matchScore);
}

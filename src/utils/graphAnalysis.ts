import { LinkedInMatchProfile, UserUploadedProfile } from '../types/knowledgeGraph';

export type CandidateProfile = Omit<LinkedInMatchProfile, 'matchScore' | 'scorecard' | 'keyAlignmentReasons' | 'recommendedPitch'>;

/**
 * Calculates a personalized matching scorecard and reasoning for a target profile
 * relative to the uploaded/active user profile.
 */
export function calculateProfileMatch(
  seed: CandidateProfile,
  user: UserUploadedProfile
): LinkedInMatchProfile {
  const userSkills = user.skills || [];
  const seedSkills = seed.skills || [];
  const userText = `${user.name} ${user.headline} ${user.industry} ${userSkills.join(' ')} ${user.company || ''}`.toLowerCase();
  const targetText = `${seed.name} ${seed.headline} ${seed.industry} ${seedSkills.join(' ')} ${seed.company}`.toLowerCase();

  // 1. Calculate shared skill overlap
  const sharedSkills = seedSkills.filter(skill => 
    userText.includes(skill.toLowerCase()) || 
    userSkills.some(us => us.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(us.toLowerCase()))
  );

  let businessSynergy = 55 + Math.min(40, sharedSkills.length * 8);
  let networkOverlap = seed.connectionDegree === '1st' ? 88 : seed.connectionDegree === '2nd' ? 70 : 45;
  if (seed.mutualConnectionsCount) networkOverlap += Math.min(12, Math.floor(seed.mutualConnectionsCount / 5));

  let industryAlignment = 48;
  if (user.industry && (
    targetText.includes(user.industry.toLowerCase()) ||
    userText.includes(seed.industry.toLowerCase()) ||
    (userText.includes('tech') && targetText.includes('tech')) ||
    (userText.includes('ai') && targetText.includes('ai'))
  )) {
    industryAlignment = 86;
  }
  if (user.company && targetText.includes(user.company.toLowerCase())) {
    industryAlignment = Math.min(96, industryAlignment + 10);
    networkOverlap = Math.min(96, networkOverlap + 8);
  }

  let collaborationPotential = Math.round(
    (businessSynergy * 0.4) + (networkOverlap * 0.3) + (industryAlignment * 0.3)
  );

  businessSynergy = Math.min(99, Math.max(20, businessSynergy));
  networkOverlap = Math.min(99, Math.max(15, networkOverlap));
  industryAlignment = Math.min(99, Math.max(20, industryAlignment));
  collaborationPotential = Math.min(99, Math.max(20, collaborationPotential));

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
 * Score live people against the uploaded profile. Empty input → empty globe.
 */
export function generateAnalyzedProfiles(
  user: UserUploadedProfile,
  totalCards: number = 48,
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

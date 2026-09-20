export interface LinkedInMatchProfile {
  id: string;
  name: string;
  headline: string;
  company: string;
  industry: string;
  location: string;
  avatarUrl: string;
  connectionDegree: '1st' | '2nd' | '3rd+';
  mutualConnectionsCount: number;
  sharedMutualConnections: string[];
  matchScore: number; // 0 - 100
  scorecard: {
    businessSynergy: number; // 0 - 100
    networkOverlap: number;  // 0 - 100
    industryAlignment: number; // 0 - 100
    collaborationPotential: number; // 0 - 100
  };
  keyAlignmentReasons: string[];
  recommendedPitch: string;
  skills: string[];
  graphLayer: 'direct' | 'extended' | 'venture' | 'ai-tech' | 'executive';
  profileUrl: string;
  connected?: boolean;
}

export interface GraphAnalysisOverlay {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  filterFn?: (profile: LinkedInMatchProfile) => boolean;
}

export interface KnowledgeGraphEdge {
  from: string; // source profile id or 'user'
  to: string;   // target profile id
  weight: number;
  type: 'mutual-connection' | 'shared-company' | 'deal-collaboration' | 'industry-peer';
  label: string;
}

export interface UserUploadedProfile {
  name: string;
  headline: string;
  industry: string;
  location: string;
  company?: string;
  avatarUrl?: string;
  summary?: string;
  skills: string[];
  connectionsCount?: number;
}

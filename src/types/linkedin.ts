export interface LinkedInProfile {
  id: string;
  name: string;
  headline?: string;
  username?: string;
  avatar_url?: string;
  profile_url?: string;
  location?: string;
  connectedAt?: string;
  authType: 'agent-reach-cookie' | 'profile-url' | 'quick-session';
}

export interface LinkedInStatus {
  connected: boolean;
  profile: LinkedInProfile | null;
  agentReachActive: boolean;
  error?: string;
}

export interface LinkedInPostResult {
  success: boolean;
  shareUrl?: string;
  postText?: string;
  imageUrl?: string;
  data?: any;
  error?: string;
}

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import GalleryGlobe from './components/GalleryGlobe';
import IntroScreen from './components/IntroScreen';
import ProfileDetailsModal from './components/ProfileDetailsModal';
import GraphOverlayControls from './components/GraphOverlayControls';
import LoadingOverlay from './components/LoadingOverlay';
import LinkedInButton from './components/LinkedInButton';
import LinkedInModal from './components/LinkedInModal';
import { useLinkedIn } from './hooks/useLinkedIn';
import { LinkedInMatchProfile, UserUploadedProfile } from './types/knowledgeGraph';
import { DEFAULT_OVERLAYS } from './data/networkGraphData';
import { generateAnalyzedProfiles } from './utils/graphAnalysis';
import { TOTAL_CARDS } from './data';
import { Sparkles, RefreshCw, Layers, CheckCircle2, Globe2 } from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserUploadedProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<LinkedInMatchProfile | null>(null);
  const [isLoadingGlobe, setIsLoadingGlobe] = useState(false);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [activeOverlayId, setActiveOverlayId] = useState<string>('all');
  const [profiles, setProfiles] = useState<LinkedInMatchProfile[]>([]);
  const [connectNotification, setConnectNotification] = useState<string | null>(null);
  const [liveNetworkMeta, setLiveNetworkMeta] = useState<{ isLive: boolean; totalFound: number } | null>(null);

  const {
    status,
    isLoading: isLinkedInLoading,
    isConnecting,
    error: linkedInError,
    checkStatus: refreshLinkedInStatus,
    connect: connectLinkedIn,
    disconnect: disconnectLinkedIn
  } = useLinkedIn();

  // Fetch live network connections from LinkedIn session or synthesize from userProfile
  useEffect(() => {
    let isCancelled = false;

    const buildNetwork = async () => {
      if (!userProfile) return;

      // If LinkedIn session is active, request live network graph connections
      if (status.connected) {
        try {
          const netRes = await fetch('/api/linkedin/network');
          if (netRes.ok) {
            const netData = await netRes.json();
            if (!isCancelled && netData.success && Array.isArray(netData.connections) && netData.connections.length > 0) {
              const analyzed = generateAnalyzedProfiles(userProfile, TOTAL_CARDS, netData.connections);
              setProfiles(analyzed);
              setLiveNetworkMeta({ isLive: true, totalFound: netData.connections.length });
              return;
            }
          }
        } catch (e) {
          console.warn('Live network fetch notice:', e);
        }
      }

      // If no custom live connections or offline/mock session, synthesize personalized network
      if (!isCancelled) {
        const analyzed = generateAnalyzedProfiles(userProfile, TOTAL_CARDS);
        setProfiles(analyzed);
        setLiveNetworkMeta(status.connected ? { isLive: true, totalFound: TOTAL_CARDS } : null);
      }
    };

    buildNetwork();

    return () => {
      isCancelled = true;
    };
  }, [userProfile, status.connected]);

  // Synchronize with active LinkedIn session if connected via Agent Reach
  useEffect(() => {
    if (status.connected && status.profile) {
      const activeUser: UserUploadedProfile = {
        name: status.profile.name,
        headline: status.profile.headline || 'LinkedIn Professional',
        company: 'Connected Network',
        industry: status.profile.headline?.toLowerCase().includes('venture') ? 'Venture Capital & Private Equity'
          : status.profile.headline?.toLowerCase().includes('ai') ? 'Artificial Intelligence & Software'
          : 'Technology & Management',
        location: status.profile.location || 'United States',
        skills: ['Generative AI', 'Venture Capital', 'Product Strategy', 'B2B Enterprise', 'Strategic Alliances'],
        avatarUrl: status.profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
      };
      setUserProfile(activeUser);
      setIsLoadingGlobe(true);
    }
  }, [status.connected, status.profile]);

  const activeOverlay = useMemo(() => {
    return DEFAULT_OVERLAYS.find(o => o.id === activeOverlayId) || DEFAULT_OVERLAYS[0];
  }, [activeOverlayId]);

  const filteredMatchCount = useMemo(() => {
    if (activeOverlayId === 'venture') {
      return profiles.filter(p => p.graphLayer === 'venture').length;
    }
    if (activeOverlayId === 'ai-tech') {
      return profiles.filter(p => p.graphLayer === 'ai-tech').length;
    }
    if (activeOverlayId === 'executive') {
      return profiles.filter(p => p.graphLayer === 'executive').length;
    }
    if (activeOverlayId === 'high-match') {
      return profiles.filter(p => p.matchScore >= 90).length;
    }
    return profiles.length;
  }, [profiles, activeOverlayId]);

  const handleSendConnectionInvite = async (profileId: string, customNote?: string): Promise<boolean> => {
    try {
      const target = profiles.find(p => p.id === profileId);
      const res = await fetch('/api/linkedin/connect-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          profileUrl: target?.profileUrl,
          note: customNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, connected: true } : p));
        if (selectedProfile && selectedProfile.id === profileId) {
          setSelectedProfile(prev => prev ? { ...prev, connected: true } : null);
        }
        setConnectNotification(`Connection request sent to ${target?.name || 'profile'}!`);
        setTimeout(() => setConnectNotification(null), 4000);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Connection dispatch error:', e);
      return false;
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Left Branding & Active Graph Metadata */}
      {userProfile && !selectedProfile && (
        <div className="absolute top-6 left-6 z-40 flex flex-col gap-1 pointer-events-auto max-w-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0077b5] animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest uppercase text-white">
              Visual Knowledge Graph
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 mt-1 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
                Active User Perspective
              </div>
              {liveNetworkMeta?.isLive && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-600/50 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Live Network Active
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white truncate">
              {userProfile.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {userProfile.headline}
            </div>
            {status.connected && (
              <div className="text-[10px] text-sky-300 mt-1 border-t border-slate-800 pt-1 flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-sky-400" />
                <span>Synchronized with LinkedIn profile network</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Right LinkedIn Account Control */}
      {!selectedProfile && (
        <div className="absolute top-6 right-6 z-40">
          <LinkedInButton
            status={status}
            onClick={() => setIsLinkedInModalOpen(true)}
          />
        </div>
      )}

      {/* Connection notification banner */}
      <AnimatePresence>
        {connectNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-none shadow-xl border border-emerald-400 flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{connectNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!userProfile ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-gray-900 z-50">
          <IntroScreen
            onStart={(profile) => {
              setUserProfile(profile);
              setIsLoadingGlobe(true);
            }}
            onOpenLinkedIn={() => setIsLinkedInModalOpen(true)}
          />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {isLoadingGlobe && (
              <motion.div
                key="loading-overlay"
                className="absolute inset-0 z-40 bg-white text-gray-900"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <LoadingOverlay onComplete={() => setIsLoadingGlobe(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3D Knowledge Graph Sphere Canvas */}
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={
              isLoadingGlobe
                ? { scale: 1, opacity: 0 }
                : { scale: selectedProfile ? 0.85 : 1, opacity: selectedProfile ? 0.25 : 1 }
            }
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 ${selectedProfile ? 'pointer-events-none' : ''}`}
          >
            <GalleryGlobe
              profiles={profiles}
              activeOverlayId={activeOverlayId}
              overlayColor={activeOverlay.color}
              onSelectProfile={(p) => setSelectedProfile(p)}
            />
          </motion.div>

          {/* Bottom Left Relationship Overlays Controls */}
          {!isLoadingGlobe && !selectedProfile && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute bottom-6 left-6 z-40 pointer-events-auto"
            >
              <GraphOverlayControls
                overlays={DEFAULT_OVERLAYS}
                activeOverlayId={activeOverlayId}
                onSelectOverlay={(id) => setActiveOverlayId(id)}
                matchCount={filteredMatchCount}
                totalCount={profiles.length}
              />
            </motion.div>
          )}

          {/* Bottom Center Re-Analyze Button */}
          {!isLoadingGlobe && !selectedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute bottom-6 right-6 flex items-center gap-3 z-30"
            >
              <button
                onClick={() => {
                  setUserProfile(null);
                  setSelectedProfile(null);
                }}
                className="px-4 py-2 text-[10px] text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload New Profile</span>
              </button>
            </motion.div>
          )}

          {/* Profile Match Scorecard & Strategic Alignment Modal */}
          <AnimatePresence>
            {selectedProfile && (
              <ProfileDetailsModal
                key="profile-details-modal"
                profile={selectedProfile}
                userProfileName={userProfile.name}
                onClose={() => setSelectedProfile(null)}
                onConnect={handleSendConnectionInvite}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {/* LinkedIn Connection Modal (Zero API fees / Session setup) */}
      <LinkedInModal
        isOpen={isLinkedInModalOpen}
        onClose={() => setIsLinkedInModalOpen(false)}
        status={status}
        isLoading={isLinkedInLoading}
        isConnecting={isConnecting}
        error={linkedInError}
        onConnect={connectLinkedIn}
        onDisconnect={disconnectLinkedIn}
        onRefresh={refreshLinkedInStatus}
      />
    </div>
  );
}

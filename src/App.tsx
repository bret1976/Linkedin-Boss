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
  const [liveNetworkMeta, setLiveNetworkMeta] = useState<{ isLive: boolean; totalFound: number; source?: string } | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

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

      setNetworkError(null);

      if (status.connected) {
        try {
          const netRes = await fetch('/api/linkedin/network');
          if (netRes.ok) {
            const netData = await netRes.json();
            if (!isCancelled && Array.isArray(netData.connections) && netData.connections.length > 0) {
              const analyzed = generateAnalyzedProfiles(userProfile, TOTAL_CARDS, netData.connections);
              setProfiles(analyzed);
              setLiveNetworkMeta({ isLive: netData.source === 'linkedin', totalFound: netData.connections.length, source: netData.source });
              return;
            }
          }
        } catch (e) {
          console.warn('Live network fetch notice:', e);
        }
      }

      if (userProfile.company && userProfile.company.length > 1) {
        try {
          const peerRes = await fetch('/api/network/peers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: userProfile.company, industry: userProfile.industry, headline: userProfile.headline })
          });
          const peerData = await peerRes.json();
          if (!isCancelled && Array.isArray(peerData.connections) && peerData.connections.length > 0) {
            const analyzed = generateAnalyzedProfiles(userProfile, TOTAL_CARDS, peerData.connections);
            setProfiles(analyzed);
            setLiveNetworkMeta({ isLive: false, totalFound: peerData.connections.length, source: 'wikidata' });
            return;
          }
        } catch (e) {
          console.warn('Peer lookup notice:', e);
        }
      }

      if (!isCancelled) {
        setProfiles([]);
        setLiveNetworkMeta({ isLive: false, totalFound: 0 });
        setNetworkError('No live people found. Connect LinkedIn with a cookie export, or enter a real company Wikidata knows (for public peers).');
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
      const headline = status.profile.headline || '';
      const at = headline.match(/(?:at|@)\s+([^|,•]+)/i);
      const activeUser: UserUploadedProfile = {
        name: status.profile.name,
        headline: headline || 'LinkedIn member',
        company: at?.[1]?.trim() || '',
        industry: /venture|capital/i.test(headline) ? 'Venture Capital' : /ai|software|engineer/i.test(headline) ? 'Technology' : '',
        location: status.profile.location || '',
        skills: headline.split(/[|,•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 40).slice(0, 6),
        avatarUrl: status.profile.avatar_url || ''
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
      if (data.profileUrl) {
        window.open(data.profileUrl, '_blank', 'noopener,noreferrer');
      }
      setConnectNotification(data.error || 'Could not send invite from this session.');
      setTimeout(() => setConnectNotification(null), 5000);
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
              LinkedIn Boss
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 mt-1 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
                Active User Perspective
              </div>
              {liveNetworkMeta?.source === 'linkedin' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-600/50 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Live LinkedIn
                </span>
              )}
              {liveNetworkMeta?.source === 'wikidata' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 border border-amber-600/50 uppercase tracking-widest">
                  Public Wikidata peers
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
            {profiles.length > 0 ? (
              <GalleryGlobe
                profiles={profiles}
                activeOverlayId={activeOverlayId}
                overlayColor={activeOverlay.color}
                onSelectProfile={(p) => setSelectedProfile(p)}
              />
            ) : !isLoadingGlobe ? (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="max-w-md text-center space-y-3 bg-slate-900/90 border border-slate-700 p-6">
                  <p className="text-sm font-semibold text-white">No live people on the globe yet</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {networkError || 'Connect LinkedIn with a cookie export to load your real 1st-degree network, or enter a company Wikidata knows to plot public colleagues.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLinkedInModalOpen(true)}
                    className="px-4 py-2 bg-[#0077b5] text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Connect LinkedIn
                  </button>
                </div>
              </div>
            ) : null}
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

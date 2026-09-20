import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Linkedin, 
  CheckCircle2, 
  UserCheck, 
  Send, 
  TrendingUp, 
  Share2, 
  Building2, 
  MapPin, 
  Users, 
  Award, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

interface ProfileDetailsModalProps {
  profile: LinkedInMatchProfile;
  userProfileName?: string;
  onClose: () => void;
  onConnect: (profileId: string, customNote?: string) => Promise<boolean>;
}

export default function ProfileDetailsModal({
  profile,
  userProfileName = 'You',
  onClose,
  onConnect
}: ProfileDetailsModalProps) {
  const [connectNote, setConnectNote] = useState(profile.recommendedPitch);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(profile.connected || false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customNoteOpen, setCustomNoteOpen] = useState(false);

  const handleSendConnection = async () => {
    setIsSending(true);
    try {
      const success = await onConnect(profile.id, connectNote);
      if (success) {
        setIsConnected(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(profile.profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getScoreBadgeColor = (val: number) => {
    if (val >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (val >= 80) return 'text-sky-700 bg-sky-50 border-sky-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-xs"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-[#004182] to-[#0077b5] px-6 py-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-[#0077b5] font-black rounded-xs flex items-center justify-center text-xl">
              in
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-sky-200 font-semibold">
                  Multi-Degree Graph Analysis
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-medium">
                  {profile.connectionDegree} Connection
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                AI Match Scorecard & Strategic Alignment
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {/* Section 1: Hero Identity Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-gray-100">
            <div className="relative flex-shrink-0">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
              />
              <span className="absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-900 text-white shadow-xs border-2 border-white">
                {profile.connectionDegree}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {profile.name}
                </h1>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getScoreBadgeColor(profile.matchScore)}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{profile.matchScore}% OVERALL MATCH</span>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mt-1">
                {profile.headline}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-3">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {profile.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {profile.location}
                </span>
                <span className="flex items-center gap-1 text-sky-700 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {profile.mutualConnectionsCount} mutual connections
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSendConnection}
                disabled={isConnected || isSending}
                className={`px-5 py-3 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isConnected
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-[#0077b5] hover:bg-[#005c8d] text-white shadow-xs hover:shadow-md'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected</span>
                  </>
                ) : isSending ? (
                  <span>Sending Invite...</span>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Connect Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyProfile}
                className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Copy profile URL"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Why They Are The Best Match (Scorecard Breakdown) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Synergy Rating Scorecard
                </h3>
                <p className="text-xs text-gray-500">
                  Calculated using 1st & 2nd-degree contact graph proximity, domain overlap, and collaboration probability.
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-600">
                Network Proximity Index
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1 */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-none space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">Business Synergy</span>
                  <span className="font-bold text-emerald-700">{profile.scorecard.businessSynergy}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${profile.scorecard.businessSynergy}%` }} 
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  High potential for joint business ventures and client deal flow.
                </p>
              </div>

              {/* Metric 2 */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-none space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">Network Overlap</span>
                  <span className="font-bold text-sky-700">{profile.scorecard.networkOverlap}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 rounded-full" 
                    style={{ width: `${profile.scorecard.networkOverlap}%` }} 
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {profile.mutualConnectionsCount} shared nodes across leadership contacts.
                </p>
              </div>

              {/* Metric 3 */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-none space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">Industry Alignment</span>
                  <span className="font-bold text-purple-700">{profile.scorecard.industryAlignment}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${profile.scorecard.industryAlignment}%` }} 
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Strong competency match in {profile.industry}.
                </p>
              </div>

              {/* Metric 4 */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-none space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">Collaboration Potential</span>
                  <span className="font-bold text-amber-700">{profile.scorecard.collaborationPotential}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${profile.scorecard.collaborationPotential}%` }} 
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  High willingness score for reciprocal introductions.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Deep Strategic Alignment Analysis */}
          <div className="bg-sky-50/60 border border-sky-100 p-5 space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-700" />
              Why this profile is one of your strongest matches
            </h4>
            <div className="space-y-2">
              {profile.keyAlignmentReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 flex-shrink-0" />
                  <p className="leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-sky-200/60 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Key Overlapping Skills:</span>
              {profile.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 bg-white border border-sky-200 text-sky-900 text-xs font-medium rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Section 4: Mutual Connections Graph Path */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-700" />
              Shared Network Bridge (Path from {userProfileName})
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 bg-gray-900 text-white font-medium">
                You ({userProfileName})
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {profile.sharedMutualConnections.map((peer, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-800 font-medium">
                    {peer}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
              <span className="px-3 py-1.5 bg-[#0077b5] text-white font-semibold flex items-center gap-1">
                <Linkedin className="w-3.5 h-3.5" />
                {profile.name} ({profile.connectionDegree})
              </span>
            </div>
          </div>

          {/* Section 5: Customized Connection Pitch Note */}
          <div className="border border-gray-200 p-5 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-700" />
                Personalized Connection Pitch
              </span>
              <button
                type="button"
                onClick={() => setCustomNoteOpen(!customNoteOpen)}
                className="text-xs text-sky-700 hover:underline font-medium cursor-pointer"
              >
                {customNoteOpen ? 'Hide editor' : 'Customize note'}
              </button>
            </div>

            {customNoteOpen ? (
              <textarea
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 bg-white border border-gray-300 focus:outline-hidden focus:border-[#0077b5] text-gray-800"
                placeholder="Write a personalized note to send with your connection request..."
              />
            ) : (
              <p className="text-xs text-gray-600 italic bg-white p-3 border border-gray-200">
                "{connectNote}"
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-400">
                Connection requests with personalized context have a 78% higher acceptance rate.
              </span>
              <button
                type="button"
                onClick={handleSendConnection}
                disabled={isConnected || isSending}
                className={`px-5 py-2.5 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                  isConnected
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-[#0077b5] hover:bg-[#005c8d] text-white'
                }`}
              >
                {isConnected ? 'Invitation Sent ✓' : isSending ? 'Sending...' : 'Send Request With Note'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Multi-graph correlation synced with LinkedIn network topology</span>
          </div>

          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#0077b5] hover:underline font-semibold"
          >
            <span>View full profile on LinkedIn</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

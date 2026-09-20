import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Linkedin, CheckCircle2, AlertCircle, Loader2, Unlink, ExternalLink, ShieldCheck, Key, User, Zap, HelpCircle } from 'lucide-react';
import { LinkedInStatus } from '../types/linkedin';
import { ConnectOptions } from '../hooks/useLinkedIn';

interface LinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LinkedInStatus;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  onConnect: (options: ConnectOptions) => Promise<any>;
  onDisconnect: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export default function LinkedInModal({
  isOpen,
  onClose,
  status,
  isLoading,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
  onRefresh
}: LinkedInModalProps) {
  const [activeTab, setActiveTab] = useState<'cookie' | 'profile'>('cookie');
  const [cookieInput, setCookieInput] = useState('');
  const [profileUrlInput, setProfileUrlInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  if (!isOpen) return null;

  const handleCookieConnect = async () => {
    if (!cookieInput.trim()) {
      setActionError('Please paste your li_at session cookie or Cookie-Editor JSON export.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await onConnect({
        type: 'cookie',
        cookie: cookieInput.trim(),
        name: displayName.trim() || undefined,
        headline: headline.trim() || undefined
      });
      setActionSuccess('Connected to LinkedIn via Agent Reach browser session!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to connect session');
    }
  };

  const handleProfileConnect = async () => {
    if (!profileUrlInput.trim()) {
      setActionError('Please enter your LinkedIn profile URL or username.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await onConnect({
        type: 'profile-url',
        profileUrl: profileUrlInput.trim(),
        name: displayName.trim() || undefined,
        headline: headline.trim() || undefined
      });
      setActionSuccess('LinkedIn profile connected!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e.message || 'Failed to link profile');
    }
  };

  const handleDisconnect = async () => {
    setActionError(null);
    try {
      await onDisconnect();
    } catch (e: any) {
      setActionError(e.message || 'Disconnect failed');
    }
  };

  const profile = status.profile;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white border border-gray-900 shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 max-h-[92vh] overflow-y-auto"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0077b5] text-white flex items-center justify-center shadow-xs">
              <Linkedin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">
                  Connect LinkedIn
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">
                  Zero API Fees
                </span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
                Agent Reach Session & Profile Integration
              </p>
            </div>
          </div>

          {/* Alert messages */}
          {(error || actionError) && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold mb-0.5">Connection Notice</p>
                <p>{actionError || error}</p>
              </div>
            </div>
          )}

          {actionSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {status.connected && profile ? (
            /* Connected State */
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-3">
                  Active LinkedIn Connection
                </span>

                <div className="flex items-start justify-between gap-4 p-3.5 bg-white border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-12 h-12 object-cover border border-gray-200 rounded-none"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#0077b5] text-white font-bold flex items-center justify-center text-sm border border-gray-200">
                        {profile.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {profile.name}
                      </p>
                      {profile.headline && (
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {profile.headline}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Connected</span>
                        </span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {profile.authType === 'agent-reach-cookie'
                            ? 'Browser Session'
                            : profile.authType === 'profile-url'
                            ? 'Profile URL'
                            : 'Quick Demo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:border-red-300 border border-gray-200 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                    title="Disconnect LinkedIn account"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">
                  Your LinkedIn profile is linked with <strong>zero API fees</strong>. You can now publish your AI travel remixes, cinematic cards, and journey stories directly from any location card.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-900 hover:bg-black text-white uppercase tracking-widest text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected State: Tabs for Connection Methods */
            <div className="space-y-5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Connect your LinkedIn account using <strong>Agent Reach</strong> — zero API keys, zero subscription fees, powered by open browser session reuse.
              </p>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-2 border border-gray-200 bg-gray-100 p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('cookie'); setActionError(null); }}
                  className={`py-2 px-2.5 text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'cookie'
                      ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-[#0077b5]" />
                  <span className="truncate">Browser Cookie</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('profile'); setActionError(null); }}
                  className={`py-2 px-2.5 text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#0077b5]" />
                  <span className="truncate">Profile Link</span>
                </button>
              </div>

              {/* Tab 1: Cookie-Editor / Session Cookie */}
              {activeTab === 'cookie' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      LinkedIn Session Cookie (<code className="font-mono text-emerald-700">li_at</code> or JSON)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="text-[11px] text-[#0077b5] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <HelpCircle className="w-3 h-3" />
                      {showInstructions ? 'Hide guide' : 'How to get cookie?'}
                    </button>
                  </div>

                  {showInstructions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1.5"
                    >
                      <p className="font-semibold">Step-by-step from Agent Reach Guide:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800">
                        <li>Open <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">linkedin.com <ExternalLink className="w-2.5 h-2.5" /></a> logged in.</li>
                        <li>Install the free <strong>Cookie-Editor</strong> browser extension (or press <kbd className="bg-white px-1 border border-blue-300">F12</kbd> &rarr; Application &rarr; Cookies).</li>
                        <li>Find and copy the <code className="bg-white px-1 py-0.5 border border-blue-300 font-mono">li_at</code> cookie, or click <strong>Export &rarr; JSON</strong> and paste it below.</li>
                      </ol>
                    </motion.div>
                  )}

                  <textarea
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                    placeholder='Paste li_at cookie value (AQED...) or Cookie-Editor JSON array'
                    rows={3}
                    className="w-full p-2.5 text-xs font-mono border border-gray-300 focus:outline-none focus:border-gray-900 bg-white"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full p-2 text-xs border border-gray-300 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Headline / Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Designer & Explorer"
                        className="w-full p-2 text-xs border border-gray-300 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCookieConnect}
                    disabled={isConnecting || !cookieInput.trim()}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 border border-gray-900 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Session...</span>
                      </>
                    ) : (
                      <>
                        <Linkedin className="w-4 h-4 text-[#0077b5]" />
                        <span>Connect with Agent Reach Session</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Profile URL */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      LinkedIn Profile URL or Handle
                    </label>
                    <input
                      type="text"
                      value={profileUrlInput}
                      onChange={(e) => setProfileUrlInput(e.target.value)}
                      placeholder="https://www.linkedin.com/in/yourname or yourname"
                      className="w-full p-2.5 text-xs border border-gray-300 focus:outline-none focus:border-gray-900"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Links your public LinkedIn identity for 1-click feed sharing with verified profile credentials.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full p-2 text-xs border border-gray-300 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Professional Headline
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Tech Innovator & Wanderer"
                        className="w-full p-2 text-xs border border-gray-300 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleProfileConnect}
                    disabled={isConnecting || !profileUrlInput.trim()}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 border border-gray-900 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resolving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Linkedin className="w-4 h-4 text-[#0077b5]" />
                        <span>Link Profile with Agent Reach</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Zero API fee footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Agent Reach open session integration
                </span>
                <span className="font-semibold text-gray-700">100% Free & Zero API Keys</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

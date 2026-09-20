import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Linkedin, Loader2, CheckCircle2, AlertCircle, Share2, Copy, Download, ExternalLink, Globe } from 'lucide-react';
import { LinkedInStatus, LinkedInPostResult } from '../types/linkedin';

interface LinkedInShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  image: string;
  info: string;
  status: LinkedInStatus;
  onOpenConnect: () => void;
  onPublish: (text: string, imageBase64?: string) => Promise<LinkedInPostResult>;
}

export default function LinkedInShareModal({
  isOpen,
  onClose,
  location,
  image,
  info,
  status,
  onOpenConnect,
  onPublish
}: LinkedInShareModalProps) {
  const isConnected = status.connected && Boolean(status.profile);
  const profile = status.profile;

  const [postText, setPostText] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [lastShareUrl, setLastShareUrl] = useState<string>('');

  // Default travel caption
  useEffect(() => {
    if (location) {
      const summaryText = info
        .split('\n')
        .filter((l) => !l.trim().startsWith('#') && l.trim().length > 0)
        .join(' ')
        .slice(0, 180);

      const defaultCaption = `Exploring ${location} with Remix Anywhere! ✈️🌍\n\n${summaryText ? `${summaryText}...\n\n` : ''}Generated with AI travel transformation and globe discovery. Where should my next destination be?\n\n#RemixAnywhere #Travel #AI #Wanderlust #Exploration`;
      setPostText(defaultCaption);
    }
  }, [location, info]);

  if (!isOpen) return null;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleDownloadImage = () => {
    try {
      const link = document.createElement('a');
      link.href = image;
      link.download = `remix-${location.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Download image failed', e);
    }
  };

  const handleShare = async () => {
    if (!postText.trim()) return;
    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      // 1. Copy text to clipboard for convenience
      try {
        await navigator.clipboard.writeText(postText);
        setCopiedCaption(true);
      } catch (e) {
        // clipboard copy optional
      }

      // 2. Dispatch to backend API
      const result = await onPublish(postText, image);
      if (result.success) {
        setPublishSuccess(true);
        const shareUrl = result.shareUrl || `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}`;
        setLastShareUrl(shareUrl);

        // 3. Open LinkedIn share dialog in a popup or new tab
        const width = 640;
        const height = 680;
        const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
        const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

        window.open(
          shareUrl,
          'linkedin_share_window',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );
      } else {
        setPublishError(result.error || 'Failed to dispatch post');
      }
    } catch (err: any) {
      setPublishError(err.message || 'An error occurred while preparing your LinkedIn share.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 font-sans">
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
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white border border-gray-900 shadow-2xl w-full max-w-xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
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
            <div className="w-9 h-9 bg-[#0077b5] text-white flex items-center justify-center shadow-xs">
              <Linkedin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-gray-900 leading-none">
                  Share to LinkedIn
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">
                  Agent Reach
                </span>
              </div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">
                Zero API Fees • Browser Session Sharing
              </p>
            </div>
          </div>

          {!isConnected ? (
            /* Not Connected View */
            <div className="space-y-6 py-3">
              <div className="p-4 bg-gray-50 border border-gray-200 text-sm text-gray-700 leading-relaxed space-y-2">
                <p>
                  Connect your LinkedIn account via <strong>Agent Reach</strong> to publish your remixed adventure portrait of <strong>{location}</strong> with zero API fees.
                </p>
                <p className="text-xs text-gray-500">
                  Reuses your existing browser session or profile link — no paid developer keys required!
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 uppercase tracking-widest text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConnect();
                  }}
                  className="px-6 py-3 bg-gray-900 hover:bg-black text-white uppercase tracking-widest text-xs font-bold flex items-center gap-2 border border-gray-900 transition-colors cursor-pointer"
                >
                  <Linkedin className="w-4 h-4 text-[#0077b5]" />
                  Connect LinkedIn First
                </button>
              </div>
            </div>
          ) : (
            /* Connected Post Composer */
            <div className="space-y-5">
              {publishError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {publishSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>LinkedIn Share Prepared & Caption Copied!</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Caption has been copied to your clipboard. The LinkedIn share dialog opened in a new window.
                  </p>
                  {lastShareUrl && (
                    <div className="pt-1">
                      <a
                        href={lastShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0077b5] underline hover:text-[#005582]"
                      >
                        Re-open LinkedIn Share Window <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* LinkedIn Post Author Card */}
              {profile && (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-10 h-10 object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[#0077b5] text-white flex items-center justify-center text-xs font-bold border border-gray-200">
                        {profile.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {profile.name}
                        </span>
                        <span className="text-[10px] text-gray-400">• 1st</span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {profile.headline || 'LinkedIn Member'}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                        <span>Just now</span>
                        <span>•</span>
                        <Globe className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-1 border border-emerald-200">
                    Active Session
                  </span>
                </div>
              )}

              {/* Post Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    Post Caption & Reflection
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="text-[11px] text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedCaption ? 'Copied!' : 'Copy text'}
                  </button>
                </div>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={5}
                  disabled={isPublishing}
                  maxLength={3000}
                  className="w-full p-3 text-xs border border-gray-300 focus:outline-none focus:border-gray-900 leading-relaxed font-sans resize-none bg-white"
                  placeholder="What would you like to share about this destination?"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>Formatting & hashtags supported</span>
                  <span>{postText.length} / 3000</span>
                </div>
              </div>

              {/* Media Preview Box */}
              <div className="p-3 border border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={image}
                    alt={location}
                    className="w-14 h-16 object-cover border border-gray-300 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{location}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      High-resolution remixed journey visual
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-2.5 py-1.5 text-xs text-gray-700 hover:text-black border border-gray-300 hover:border-gray-500 bg-white flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  title="Download image to attach manually if needed"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Image</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="px-3.5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCaption ? 'Copied' : 'Copy Caption'}</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPublishing}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 uppercase tracking-widest text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={isPublishing || !postText.trim()}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white uppercase tracking-widest text-xs font-bold flex items-center gap-2 border border-gray-900 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing Share...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>1-Click Share to LinkedIn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

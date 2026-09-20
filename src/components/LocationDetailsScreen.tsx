import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Linkedin } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';

interface LocationDetailsProps {
  data: { image: string; location: string; info: string };
  onClose: () => void;
  onShareLinkedIn?: () => void;
}

export default function LocationDetailsScreen({ data, onClose, onShareLinkedIn }: LocationDetailsProps) {
  const info = data.info;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: any = null;

    const generateVideo = async () => {
      setIsVideoLoading(true);
      setVideoError(false);
      try {
        const response = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageBase64: data.image,
            prompt: `A beautiful cinematic panning video of ${data.location}`
          })
        });
        const result = await response.json();
        
        if (!result.success || !result.fileId) {
          throw new Error('Failed to start video generation');
        }

        const fileId = result.fileId;

        pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/video-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileId })
            });
            const statusResult = await statusRes.json();

            if (statusResult.done && isMounted) {
              clearInterval(pollInterval);
              setVideoUrl(`/api/video-download?fileId=${encodeURIComponent(fileId)}`);
              setIsVideoLoading(false);
            }
          } catch(e) {
            console.error("Polling error", e);
            if (isMounted) {
               setVideoError(true);
               setIsVideoLoading(false);
               clearInterval(pollInterval);
            }
          }
        }, 5000);
      } catch (e) {
        console.error("Video generation error:", e);
        if (isMounted) {
          setVideoError(true);
          setIsVideoLoading(false);
        }
      }
    };

    if (data.image && data.image.startsWith('data:image')) {
      generateVideo();
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [data.image, data.location]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6 sm:p-12"
    >
      {/* Background click listener */}
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white shadow-[0_0_80px_rgba(0,0,0,0.15)] flex flex-col md:flex-row w-full max-w-6xl h-full max-h-[800px] relative rounded-none z-10 overflow-hidden"
      >
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-3 bg-white hover:bg-gray-100 transition-colors z-20 shadow-sm border border-gray-200 rounded-full flex items-center justify-center"
        >
          <X className="w-6 h-6 text-gray-900" />
        </button>

        <div className="w-full md:w-[45%] h-64 md:h-full bg-gray-100 flex-shrink-0 relative overflow-hidden group">
          {videoUrl ? (
            <video 
              src={videoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover" 
            />
          ) : (
            <>
              <img 
                src={data.image} 
                alt={data.location} 
                className="w-full h-full object-cover transition-transform duration-[20s] ease-linear hover:scale-110" 
              />
              {isVideoLoading && (
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Creating cinematic video...</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-full h-full md:w-[55%] flex flex-col p-6 sm:p-8 md:p-14 overflow-y-auto bg-white justify-center">
          <div className="font-sans text-gray-600 text-base md:text-lg space-y-6 [&>h1]:text-2xl [&>h1]:md:text-4xl [&>h1]:font-bold [&>h1]:tracking-tight [&>h1]:text-gray-900 [&>h1]:mb-4 [&>h1]:leading-tight [&>p]:leading-relaxed [&>p]:text-gray-700">
            <Markdown>{info.split('\n').find(l => l.trim().startsWith('#')) || `# ${data.location}`}</Markdown>
            
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              <Markdown>{info.split('\n').filter(l => !l.trim().startsWith('#')).join('\n')}</Markdown>
            </div>

            {videoUrl && (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Cinematic Video Active</span>
              </div>
            )}

            {onShareLinkedIn && (
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onShareLinkedIn}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#0077b5] hover:bg-[#005c8d] text-white uppercase tracking-wider text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>Share to LinkedIn</span>
                </button>
                <span className="text-[11px] text-gray-400">Zero API Fees • Agent Reach</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

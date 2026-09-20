import { Linkedin } from 'lucide-react';
import { LinkedInStatus } from '../types/linkedin';

interface LinkedInButtonProps {
  status: LinkedInStatus;
  onClick: () => void;
  className?: string;
}

export default function LinkedInButton({ status, onClick, className = '' }: LinkedInButtonProps) {
  const isConnected = status.connected && Boolean(status.profile);
  const profile = status.profile;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium uppercase tracking-widest transition-all bg-white/95 backdrop-blur-xs border border-gray-900 hover:bg-gray-50 shadow-xs group cursor-pointer ${className}`}
      title={isConnected ? `LinkedIn Connected: ${profile?.name || 'Account'}` : 'Connect to LinkedIn (Zero API fees)'}
    >
      <div className="relative flex items-center justify-center">
        <Linkedin className="w-4 h-4 text-[#0077b5] transition-transform group-hover:scale-105" />
        {isConnected && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
        )}
      </div>

      <span className="text-gray-900 font-semibold text-[11px] whitespace-nowrap">
        {isConnected
          ? (profile?.name ? `${profile.name.split(' ')[0]} (LinkedIn)` : 'LinkedIn Connected')
          : 'Connect LinkedIn'}
      </span>
    </button>
  );
}


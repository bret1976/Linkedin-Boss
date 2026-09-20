import { Layers, Check, Sparkles, Filter, Users } from 'lucide-react';
import { GraphAnalysisOverlay } from '../types/knowledgeGraph';

interface GraphOverlayControlsProps {
  overlays: GraphAnalysisOverlay[];
  activeOverlayId: string;
  onSelectOverlay: (id: string) => void;
  matchCount: number;
  totalCount: number;
}

export default function GraphOverlayControls({
  overlays,
  activeOverlayId,
  onSelectOverlay,
  matchCount,
  totalCount
}: GraphOverlayControlsProps) {
  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-lg p-3 sm:p-4 flex flex-col gap-2.5 max-w-sm w-full">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0077b5]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Relationship Analysis Overlays
          </span>
        </div>
        <span className="text-[11px] font-semibold text-gray-500">
          {matchCount} / {totalCount} Nodes
        </span>
      </div>

      <p className="text-[11px] text-gray-500 leading-tight">
        Overlay graph filters to isolate high-affinity clusters across your 1st and 2nd-degree connections:
      </p>

      <div className="flex flex-col gap-1.5 pt-1">
        {overlays.map((overlay) => {
          const isActive = overlay.id === activeOverlayId;
          return (
            <button
              key={overlay.id}
              onClick={() => onSelectOverlay(overlay.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-gray-900 text-white font-medium shadow-xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: overlay.color }}
                />
                <span className="truncate">{overlay.name}</span>
              </div>

              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

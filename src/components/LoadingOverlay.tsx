import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Users, GitMerge, Award } from 'lucide-react';

const LOADING_STAGES = [
  { text: "Ingesting user profile topology & skill vectors...", icon: Cpu },
  { text: "Traversing 1st & 2nd-degree contact graphs...", icon: Users },
  { text: "Resolving mutual connection bridges & executive nodes...", icon: GitMerge },
  { text: "Computing multi-dimensional synergy scorecards...", icon: Award }
];

export default function LoadingOverlay({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev < LOADING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    const timeout = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  const CurrentIcon = LOADING_STAGES[index].icon;

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col items-center justify-center pointer-events-none w-full p-6">
      <div className="flex flex-col items-center max-w-sm text-center">
        <div className="w-16 h-16 rounded-full border-4 border-sky-100 border-t-[#0077b5] animate-spin mb-6 flex items-center justify-center">
          <CurrentIcon className="w-6 h-6 text-[#0077b5] animate-pulse" />
        </div>

        <div className="h-10 relative flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-gray-700 font-medium text-xs tracking-wider uppercase whitespace-normal text-center"
            >
              {LOADING_STAGES[index].text}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-[#0077b5] transition-all duration-500 rounded-full"
            style={{ width: `${((index + 1) / LOADING_STAGES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../data';
import Globe from './Globe';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const DEFAULT_CAMERA_Z = isMobile ? 28.8 : 20.5;

function CameraController({ targetZ }: { targetZ: React.MutableRefObject<number> }) {
  useFrame((state) => {
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetZ.current,
      0.05
    );
  });
  return null;
}

interface GalleryGlobeProps {
  profiles: LinkedInMatchProfile[];
  activeOverlayId: string;
  overlayColor: string;
  onSelectProfile: (profile: LinkedInMatchProfile) => void;
}

export default function GalleryGlobe({
  profiles,
  activeOverlayId,
  overlayColor,
  onSelectProfile
}: GalleryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const targetZ = useRef(DEFAULT_CAMERA_Z);
  const rotationState = useRef({ x: 0, y: 0 });
  const velocityState = useRef({ x: 0, y: 0.002 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastInteractionTime = useRef(Date.now() - 3000);
  const pointerPos = useRef({ x: 0, y: 0 });

  // Cursor Tooltip UI
  const [hoveredProfile, setHoveredProfile] = useState<LinkedInMatchProfile | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      lastInteractionTime.current = Date.now();
      const delta = e.deltaY;
      targetZ.current += delta * 0.015;
      targetZ.current = Math.max(-GLOBE_RADIUS * 0.8, Math.min(isMobile ? 35 : 28, targetZ.current));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    lastInteractionTime.current = Date.now();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    pointerPos.current = { x: e.clientX, y: e.clientY };
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
    }

    if (!isDragging.current) return;

    const deltaX = e.clientX - lastMouse.current.x;
    const deltaY = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    velocityState.current.y += deltaX * 0.005;
    velocityState.current.x += deltaY * 0.005;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
    >
      <Canvas
        camera={{ position: [0, 0, DEFAULT_CAMERA_Z], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraController targetZ={targetZ} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <Suspense fallback={null}>
          <Globe
            profiles={profiles}
            activeOverlayId={activeOverlayId}
            overlayColor={overlayColor}
            rotationState={rotationState}
            velocityState={velocityState}
            isDragging={isDragging}
            lastInteraction={lastInteractionTime}
            onSelectProfile={onSelectProfile}
            onHoverProfile={(p) => setHoveredProfile(p)}
            onHoverOut={() => setHoveredProfile(null)}
          />
        </Suspense>
      </Canvas>

      {/* Floating Hover Indicator Tooltip */}
      {hoveredProfile && (
        <div
          ref={tooltipRef}
          className="fixed top-0 left-0 pointer-events-none z-50 bg-gray-900/95 text-white text-xs px-3.5 py-2.5 shadow-xl border border-white/20 max-w-xs flex flex-col gap-1 backdrop-blur-xs"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-white text-sm truncate">{hoveredProfile.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">
              {hoveredProfile.matchScore}% MATCH
            </span>
          </div>
          <div className="text-[11px] text-gray-300 line-clamp-1">{hoveredProfile.headline}</div>
          <div className="text-[10px] text-sky-400 font-medium">
            {hoveredProfile.company} • {hoveredProfile.mutualConnectionsCount} mutual connections
          </div>
        </div>
      )}
    </div>
  );
}

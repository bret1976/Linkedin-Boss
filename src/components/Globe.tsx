import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateFibonacciSphere } from '../utils/math';
import { GLOBE_RADIUS } from '../data';
import Card from './Card';
import NetworkEdges from './NetworkEdges';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

interface GlobeProps {
  profiles: LinkedInMatchProfile[];
  activeOverlayId: string;
  overlayColor: string;
  rotationState: React.MutableRefObject<{ x: number; y: number }>;
  velocityState: React.MutableRefObject<{ x: number; y: number }>;
  isDragging: React.MutableRefObject<boolean>;
  lastInteraction: React.MutableRefObject<number>;
  onSelectProfile: (profile: LinkedInMatchProfile) => void;
  onHoverProfile?: (profile: LinkedInMatchProfile) => void;
  onHoverOut?: () => void;
}

export default function Globe({
  profiles,
  activeOverlayId,
  overlayColor,
  rotationState,
  velocityState,
  isDragging,
  lastInteraction,
  onSelectProfile,
  onHoverProfile,
  onHoverOut
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Precalculate spherical positions
  const { positions, cardData } = useMemo(() => {
    const count = Math.max(profiles.length, 1);
    const rawPositions = generateFibonacciSphere(count, GLOBE_RADIUS);
    const data = rawPositions.map((pos, i) => ({
      position: pos,
      scale: 0.78 + ((i % 5) * 0.04)
    }));
    return { positions: rawPositions, cardData: data };
  }, [profiles.length]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Apply rotation velocity
    rotationState.current.x += velocityState.current.x;
    rotationState.current.y += velocityState.current.y;

    // Pitch clamping
    rotationState.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationState.current.x));

    if (!isDragging.current) {
      velocityState.current.x *= 0.92;
      velocityState.current.y *= 0.92;

      // Ambient idle spin
      if (Date.now() - lastInteraction.current > 2000) {
        velocityState.current.y += 0.00015;
      }
    } else {
      velocityState.current.x *= 0.3;
      velocityState.current.y *= 0.3;
    }

    groupRef.current.rotation.x = rotationState.current.x;
    groupRef.current.rotation.y = rotationState.current.y;
  });

  return (
    <group ref={groupRef}>
      {/* 3D Visual Network Graph Relationships Overlay */}
      <NetworkEdges
        cardPositions={positions}
        profiles={profiles}
        activeOverlayColor={overlayColor}
      />

      {/* Spherical Card Grid */}
      {cardData.map((data, i) => {
        const profile = profiles[i];
        if (!profile) return null;

        // Check if card matches active overlay filter
        let isDimmed = false;
        if (activeOverlayId === 'venture') {
          isDimmed = profile?.graphLayer !== 'venture';
        } else if (activeOverlayId === 'ai-tech') {
          isDimmed = profile?.graphLayer !== 'ai-tech';
        } else if (activeOverlayId === 'executive') {
          isDimmed = profile?.graphLayer !== 'executive';
        } else if (activeOverlayId === 'high-match') {
          isDimmed = (profile?.matchScore || 0) < 90;
        }

        return (
          <Card
            key={profile ? `${profile.id}-${i}` : i}
            index={i}
            position={data.position}
            scale={data.scale}
            profile={profile}
            dimmed={isDimmed}
            onSelectProfile={(p) => {
              if (!isDragging.current) {
                onSelectProfile(p);
              }
            }}
            onHoverProfile={onHoverProfile}
            onHoverOut={onHoverOut}
          />
        );
      })}
    </group>
  );
}

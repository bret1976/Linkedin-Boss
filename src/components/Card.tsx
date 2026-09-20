import * as THREE from 'three';
import { useMemo, useRef, useState, useEffect } from 'react';
import { CARD_WIDTH, CARD_HEIGHT, GLOBE_RADIUS } from '../data';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';
import { createProfileCardTexture } from '../utils/cardTexture';

interface CardProps {
  index: number;
  position: THREE.Vector3;
  scale?: number;
  profile?: LinkedInMatchProfile;
  dimmed?: boolean;
  highlighted?: boolean;
  onSelectProfile?: (profile: LinkedInMatchProfile) => void;
  onHoverProfile?: (profile: LinkedInMatchProfile) => void;
  onHoverOut?: () => void;
}

export default function Card({
  index,
  position,
  scale = 1,
  profile,
  dimmed = false,
  highlighted = false,
  onSelectProfile,
  onHoverProfile,
  onHoverOut
}: CardProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;

    if (!profile) {
      return;
    }

    // Preload profile image and generate canvas card texture
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = profile.avatarUrl;

    const renderCard = () => {
      if (!active) return;
      const cardTex = createProfileCardTexture(profile, img);
      setTexture(cardTex);
    };

    img.onload = () => {
      renderCard();
    };

    img.onerror = () => {
      // Fallback without avatar image
      renderCard();
    };

    // Stagger render to prevent frame drops on initial setup
    const timeout = setTimeout(() => {
      if (active && !texture) {
        renderCard();
      }
    }, (index % 12) * 50);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [profile, index]);

  useEffect(() => {
    if (hovered && profile && onHoverProfile) {
      onHoverProfile(profile);
    }
  }, [profile, hovered, onHoverProfile]);

  const rotationQuaternion = useMemo(() => {
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.lookAt(position.clone().multiplyScalar(2));
    return dummy.quaternion.clone();
  }, [position]);

  const geometry = useMemo(() => {
    const width = CARD_WIDTH * scale;
    const height = CARD_HEIGHT * scale;
    const geo = new THREE.PlaneGeometry(width, height, 32, 32);
    const pos = geo.attributes.position;

    // Curve the plane to match the sphere's surface
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      const theta = x / GLOBE_RADIUS;
      const phi = y / GLOBE_RADIUS;

      const newX = GLOBE_RADIUS * Math.sin(theta) * Math.cos(phi);
      const newY = GLOBE_RADIUS * Math.sin(phi);
      const newZ = GLOBE_RADIUS * Math.cos(theta) * Math.cos(phi) - GLOBE_RADIUS;

      pos.setXYZ(i, newX, newY, newZ);
    }

    geo.computeVertexNormals();
    return geo;
  }, [scale]);

  // Adjust card scale and opacity if filtered out or highlighted
  const opacity = dimmed ? 0.22 : hovered ? 1.0 : 0.95;

  return (
    <mesh
      position={position}
      quaternion={rotationQuaternion}
      ref={meshRef}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        if (profile && onSelectProfile) {
          onSelectProfile(profile);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
        if (profile && onHoverProfile) {
          onHoverProfile(profile);
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
        if (onHoverOut) {
          onHoverOut();
        }
      }}
    >
      {texture && (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent={true}
          opacity={opacity}
        />
      )}
    </mesh>
  );
}

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

interface NetworkEdgesProps {
  cardPositions: THREE.Vector3[];
  profiles: LinkedInMatchProfile[];
  activeOverlayColor: string;
}

export default function NetworkEdges({ cardPositions, profiles, activeOverlayColor }: NetworkEdgesProps) {
  // Generate relationship line pairs between connected profiles
  const lineSegments = useMemo(() => {
    const points: number[] = [];
    const colors: number[] = [];
    const baseColor = new THREE.Color(activeOverlayColor || '#0077b5');
    const weakColor = new THREE.Color('#94a3b8');

    const profileMap = new Map<string, number>();
    profiles.forEach((p, idx) => {
      profileMap.set(p.name, idx);
      profileMap.set(p.id, idx);
    });

    for (let i = 0; i < Math.min(cardPositions.length, profiles.length); i++) {
      const sourceProfile = profiles[i];
      const sourcePos = cardPositions[i];

      // Draw lines between mutual connections
      sourceProfile.sharedMutualConnections.forEach((mutualName) => {
        const targetIdx = profileMap.get(mutualName);
        if (targetIdx !== undefined && targetIdx < cardPositions.length && targetIdx !== i) {
          const targetPos = cardPositions[targetIdx];

          // Pull slightly inward toward globe surface center so lines arc cleanly behind/under cards
          const centerScale = 0.88;
          points.push(
            sourcePos.x * centerScale, sourcePos.y * centerScale, sourcePos.z * centerScale,
            targetPos.x * centerScale, targetPos.y * centerScale, targetPos.z * centerScale
          );

          // Give 1st degree strong color, others softer
          const isDirect = sourceProfile.connectionDegree === '1st';
          const c = isDirect ? baseColor : weakColor;
          colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [cardPositions, profiles, activeOverlayColor]);

  if (!lineSegments || lineSegments.getAttribute('position').count === 0) {
    return null;
  }

  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

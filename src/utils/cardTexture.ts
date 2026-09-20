import * as THREE from 'three';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

/**
 * Creates a canvas-rendered photorealistic LinkedIn Profile Card texture.
 * Features:
 * - Clean professional background
 * - Real user avatar circular crop with degree badge (1st, 2nd, 3rd)
 * - Match synergy pill score badge (e.g. 96% Match)
 * - Full Name in crisp typography
 * - Headline & Current Company
 * - Industry & Location tag
 * - Mutual connections indicator
 */
export function createProfileCardTexture(
  profile: LinkedInMatchProfile,
  avatarImg: HTMLImageElement | null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const width = 512;
  const height = 640;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const dummy = new THREE.CanvasTexture(canvas);
    return dummy;
  }

  // High quality antialiasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Top banner accent
  const bannerGrad = ctx.createLinearGradient(0, 0, width, 140);
  if (profile.graphLayer === 'venture') {
    bannerGrad.addColorStop(0, '#064e3b');
    bannerGrad.addColorStop(1, '#059669');
  } else if (profile.graphLayer === 'ai-tech') {
    bannerGrad.addColorStop(0, '#312e81');
    bannerGrad.addColorStop(1, '#4f46e5');
  } else if (profile.graphLayer === 'executive') {
    bannerGrad.addColorStop(0, '#78350f');
    bannerGrad.addColorStop(1, '#d97706');
  } else {
    bannerGrad.addColorStop(0, '#004182');
    bannerGrad.addColorStop(1, '#0077b5');
  }
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, width, 130);

  // Subtle grid overlay on banner
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 130);
    ctx.stroke();
  }

  // Top match badge (Pill in banner)
  const score = profile.matchScore;
  const scoreColor = score >= 90 ? '#10b981' : score >= 80 ? '#3b82f6' : '#f59e0b';
  
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(width - 160, 16, 144, 34, 17);
  ctx.fill();

  ctx.fillStyle = scoreColor;
  ctx.beginPath();
  ctx.arc(width - 144, 33, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${score}% MATCH`, width - 130, 39);
  ctx.restore();

  // LinkedIn Logo mark at top left
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(16, 16, 34, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#0077b5';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('in', 22, 42);
  ctx.restore();

  // 2. Avatar Circle & Ring
  const avatarCenterX = width / 2;
  const avatarCenterY = 130;
  const avatarRadius = 66;

  // Outer border ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();

  // Draw Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
    ctx.drawImage(
      avatarImg,
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } else {
    // Fallback gradient portrait
    const fallbackGrad = ctx.createLinearGradient(0, 70, 0, 200);
    fallbackGrad.addColorStop(0, '#64748b');
    fallbackGrad.addColorStop(1, '#334155');
    ctx.fillStyle = fallbackGrad;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    ctx.fillText(initials, avatarCenterX, avatarCenterY + 12);
  }
  ctx.restore();

  // Connection Degree Badge (1st, 2nd, 3rd)
  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(avatarCenterX + 46, avatarCenterY + 44, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(profile.connectionDegree, avatarCenterX + 46, avatarCenterY + 48);
  ctx.restore();

  // 3. Profile Text Details
  ctx.textAlign = 'center';

  // Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(profile.name, avatarCenterX, 235);

  // Company / Role Tag
  ctx.fillStyle = '#0284c7';
  ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(profile.company.toUpperCase(), avatarCenterX, 258);

  // Headline (Wrapped neatly to 2 lines max)
  ctx.fillStyle = '#475569';
  ctx.font = '400 16px -apple-system, BlinkMacSystemFont, sans-serif';
  
  const words = profile.headline.split(' ');
  let line1 = '';
  let line2 = '';
  for (const word of words) {
    if (ctx.measureText(line1 + word).width < 420 && !line2) {
      line1 += `${word} `;
    } else if (ctx.measureText(line2 + word).width < 420) {
      line2 += `${word} `;
    }
  }
  ctx.fillText(line1.trim(), avatarCenterX, 288);
  if (line2) {
    ctx.fillText(line2.trim() + (words.length > 15 ? '...' : ''), avatarCenterX, 312);
  }

  // Divider line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 335);
  ctx.lineTo(width - 40, 335);
  ctx.stroke();

  // 4. Scorecard Breakdown Mini Bars
  ctx.textAlign = 'left';
  const barStartY = 360;
  const barWidth = 190;
  const barHeight = 8;

  // Left col: Business Synergy
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Business Synergy', 44, barStartY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${profile.scorecard.businessSynergy}%`, 44 + barWidth, barStartY);

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(44, barStartY + 6, barWidth, barHeight, 4);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(44, barStartY + 6, barWidth * (profile.scorecard.businessSynergy / 100), barHeight, 4);
  ctx.fill();

  // Right col: Network Overlap
  ctx.textAlign = 'left';
  const rightColX = 278;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Network Overlap', rightColX, barStartY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${profile.scorecard.networkOverlap}%`, rightColX + barWidth, barStartY);

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(rightColX, barStartY + 6, barWidth, barHeight, 4);
  ctx.fill();
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(rightColX, barStartY + 6, barWidth * (profile.scorecard.networkOverlap / 100), barHeight, 4);
  ctx.fill();

  // Row 2: Industry Alignment & Collaboration
  const row2Y = 405;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Industry Alignment', 44, row2Y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${profile.scorecard.industryAlignment}%`, 44 + barWidth, row2Y);

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(44, row2Y + 6, barWidth, barHeight, 4);
  ctx.fill();
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.roundRect(44, row2Y + 6, barWidth * (profile.scorecard.industryAlignment / 100), barHeight, 4);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Collaboration Index', rightColX, row2Y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${profile.scorecard.collaborationPotential}%`, rightColX + barWidth, row2Y);

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(rightColX, row2Y + 6, barWidth, barHeight, 4);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(rightColX, row2Y + 6, barWidth * (profile.scorecard.collaborationPotential / 100), barHeight, 4);
  ctx.fill();

  // 5. Skills Tags (Pills)
  const skillsY = 460;
  let curSkillX = 44;
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif';

  profile.skills.slice(0, 3).forEach((skill) => {
    const textW = ctx.measureText(skill).width;
    const pillW = textW + 22;
    if (curSkillX + pillW < width - 40) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(curSkillX, skillsY, pillW, 26, 13);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.fillText(skill, curSkillX + 11, skillsY + 17);

      curSkillX += pillW + 8;
    }
  });

  // 6. Mutual connections footer
  const footerY = 510;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(36, footerY, width - 72, 46, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🔗 ${profile.mutualConnectionsCount} Mutual Connections`, 50, footerY + 28);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(profile.location, width - 50, footerY + 28);

  // 7. Click to Open Profile Banner
  ctx.fillStyle = '#0077b5';
  ctx.fillRect(0, height - 52, width, 52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(profile.connected ? '✓ CONNECTED ON LINKEDIN' : 'CLICK TO VIEW MATCH SCORECARD & CONNECT →', width / 2, height - 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

// Avatar 2D modulaire (SVG) : teint, coiffure, couleurs, barbe, visage, corpulence, maillot.
// L'apparence évolue avec l'âge (proportions enfant/ado/adulte, barbe autorisée à partir de 16 ans).

import { useId } from 'react';
import type { Appearance } from '../game/types';

export const SKIN_TONES = ['#f7d9c4', '#ecc19f', '#d6a27c', '#b47c55', '#8c5a3b', '#5f3a25'];
export const HAIR_COLORS = ['#1b1b1b', '#3b2416', '#6b4423', '#a8692f', '#d9b26f', '#e8e0cf', '#8a8a8a', '#b5332e'];
export const EYE_COLORS = ['#3e2a1f', '#5d4037', '#2e6b3a', '#3b6ea8', '#7a8c99'];
export const HAIR_STYLES: { id: string; label: string }[] = [
  { id: 'short', label: 'Court' },
  { id: 'buzz', label: 'Rasé' },
  { id: 'curly', label: 'Bouclé' },
  { id: 'afro', label: 'Afro' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Chignon' },
  { id: 'mohawk', label: 'Crête' },
  { id: 'braids', label: 'Tresses' },
  { id: 'bald', label: 'Chauve' },
];
export const KIT_COLORS = ['#1fa860', '#c62828', '#1565c0', '#f9a825', '#6a1b9a', '#212121', '#ffffff', '#00838f', '#ef6c00', '#ad1457', '#5d4037', '#90caf9'];
export const KIT_PATTERNS: { id: string; label: string }[] = [
  { id: 'plain', label: 'Uni' },
  { id: 'stripes', label: 'Rayures' },
  { id: 'hoops', label: 'Cerceaux' },
  { id: 'sash', label: 'Écharpe' },
  { id: 'halves', label: 'Bicolore' },
];
export const BOOT_COLORS = ['#1b1b1b', '#ffffff', '#e53935', '#ffd600', '#00e676', '#2979ff', '#ff6d00', '#d500f9'];
export const ACCESSORIES: { id: string; label: string }[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'headband', label: 'Bandeau' },
  { id: 'wristband', label: 'Poignets' },
  { id: 'gloves', label: 'Gants' },
];
export const BEARDS: { id: string; label: string }[] = [
  { id: 'none', label: 'Aucune' },
  { id: 'stubble', label: 'Naissante' },
  { id: 'goatee', label: 'Bouc' },
  { id: 'full', label: 'Fournie' },
];

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface Props {
  a: Appearance;
  age: number;
  size?: number;
  colors?: [string, string];
  showNumber?: boolean;
  ring?: boolean;
}

/** Tête (visage, cheveux, barbe) dans le repère du buste : centre (100, 92). */
function Head({ a, age }: { a: Appearance; age: number }) {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[2];
  const skinDark = shade(skin, -28);
  const hair = a.hairColor;
  const child = age < 12;
  const teen = age >= 12 && age < 17;
  void teen;
  // Proportions selon l'âge et la morphologie
  const headScale = child ? 1.12 : teen ? 1.04 : 1;
  const cx = 100;
  const headCy = 92;
  const rx = (a.faceShape === 'round' ? 40 : a.faceShape === 'square' ? 38 : 36) * headScale;
  const ry = (a.faceShape === 'round' ? 41 : 45) * headScale;
  const beardOk = age >= 16 && a.beard !== 'none';
  const top = headCy - ry;

  const headShape =
    a.faceShape === 'square' ? (
      <rect x={cx - rx} y={headCy - ry} width={rx * 2} height={ry * 2} rx={rx * 0.55} fill={skin} />
    ) : (
      <ellipse cx={cx} cy={headCy} rx={rx} ry={ry} fill={skin} />
    );

  const hairEl = (() => {
    switch (a.hairStyle) {
      case 'buzz':
        return <path d={`M${cx - rx + 2} ${headCy - 6} Q${cx - rx} ${top - 2} ${cx} ${top - 3} Q${cx + rx} ${top - 2} ${cx + rx - 2} ${headCy - 6} Q${cx} ${top + 14} ${cx - rx + 2} ${headCy - 6}Z`} fill={hair} opacity={0.75} />;
      case 'curly':
        return (
          <g fill={hair}>
            {Array.from({ length: 9 }).map((_, i) => {
              const ang = Math.PI * (0.95 + (i / 8) * 1.1);
              return <circle key={i} cx={cx + Math.cos(ang) * rx * 0.88} cy={headCy - 8 + Math.sin(ang) * ry * 0.92} r={13 * headScale} />;
            })}
            <ellipse cx={cx} cy={top + 10} rx={rx * 0.8} ry={14} />
          </g>
        );
      case 'afro':
        return <ellipse cx={cx} cy={headCy - 22} rx={rx * 1.38} ry={ry * 1.05} fill={hair} />;
      case 'long':
        return (
          <g fill={hair}>
            <path d={`M${cx - rx - 4} ${headCy + 40} Q${cx - rx - 10} ${top - 6} ${cx} ${top - 8} Q${cx + rx + 10} ${top - 6} ${cx + rx + 4} ${headCy + 40} L${cx + rx - 6} ${headCy + 40} Q${cx + rx - 4} ${top + 22} ${cx} ${top + 16} Q${cx - rx + 4} ${top + 22} ${cx - rx + 6} ${headCy + 40}Z`} />
          </g>
        );
      case 'bun':
        return (
          <g fill={hair}>
            <circle cx={cx} cy={top - 10} r={15} />
            <path d={`M${cx - rx} ${headCy - 4} Q${cx - rx - 2} ${top - 4} ${cx} ${top - 4} Q${cx + rx + 2} ${top - 4} ${cx + rx} ${headCy - 4} Q${cx} ${top + 12} ${cx - rx} ${headCy - 4}Z`} />
          </g>
        );
      case 'mohawk':
        return <path d={`M${cx - 10} ${top + 18} Q${cx - 14} ${top - 18} ${cx} ${top - 22} Q${cx + 14} ${top - 18} ${cx + 10} ${top + 18}Z`} fill={hair} />;
      case 'braids':
        return (
          <g fill={hair}>
            <path d={`M${cx - rx} ${headCy - 2} Q${cx - rx - 2} ${top - 4} ${cx} ${top - 5} Q${cx + rx + 2} ${top - 4} ${cx + rx} ${headCy - 2} Q${cx} ${top + 10} ${cx - rx} ${headCy - 2}Z`} />
            {[-0.8, -0.4, 0, 0.4, 0.8].map((k) => (
              <rect key={k} x={cx + k * rx - 3} y={top - 2} width={6} height={24} rx={3} fill={shade(hair, 20)} />
            ))}
          </g>
        );
      case 'bald':
        return null;
      default:
        return <path d={`M${cx - rx} ${headCy - 2} Q${cx - rx - 4} ${top - 8} ${cx + 6} ${top - 8} Q${cx + rx + 6} ${top - 4} ${cx + rx} ${headCy - 6} Q${cx + 10} ${top + 10} ${cx - 16} ${top + 14} Q${cx - rx + 6} ${top + 22} ${cx - rx} ${headCy - 2}Z`} fill={hair} />;
    }
  })();

  const beardEl = beardOk
    ? a.beard === 'stubble'
      ? <path d={`M${cx - rx + 6} ${headCy + 10} Q${cx} ${headCy + ry + 6} ${cx + rx - 6} ${headCy + 10} Q${cx} ${headCy + ry - 8} ${cx - rx + 6} ${headCy + 10}Z`} fill={hair} opacity={0.35} />
      : a.beard === 'goatee'
        ? <path d={`M${cx - 12} ${headCy + 26} Q${cx} ${headCy + ry + 6} ${cx + 12} ${headCy + 26} Q${cx} ${headCy + 34} ${cx - 12} ${headCy + 26}Z`} fill={hair} />
        : <path d={`M${cx - rx + 2} ${headCy + 4} Q${cx - rx + 4} ${headCy + ry + 8} ${cx} ${headCy + ry + 10} Q${cx + rx - 4} ${headCy + ry + 8} ${cx + rx - 2} ${headCy + 4} Q${cx + 14} ${headCy + 24} ${cx} ${headCy + 22} Q${cx - 14} ${headCy + 24} ${cx - rx + 2} ${headCy + 4}Z`} fill={hair} />
    : null;

  const eyeY = headCy - 2;
  const eyeDx = rx * 0.4;
  const behindHair = a.hairStyle === 'afro' || a.hairStyle === 'long';

  return (
    <g>
      {behindHair && hairEl}
      <ellipse cx={cx - rx + 1} cy={headCy + 4} rx="7" ry="10" fill={skinDark} />
      <ellipse cx={cx + rx - 1} cy={headCy + 4} rx="7" ry="10" fill={skinDark} />
      {headShape}
      <ellipse cx={cx - eyeDx} cy={eyeY} rx="7.5" ry="5.5" fill="#fff" />
      <ellipse cx={cx + eyeDx} cy={eyeY} rx="7.5" ry="5.5" fill="#fff" />
      <circle cx={cx - eyeDx} cy={eyeY} r="3.8" fill={a.eyeColor} />
      <circle cx={cx + eyeDx} cy={eyeY} r="3.8" fill={a.eyeColor} />
      <circle cx={cx - eyeDx + 1} cy={eyeY - 1} r="1.3" fill="#fff" />
      <circle cx={cx + eyeDx + 1} cy={eyeY - 1} r="1.3" fill="#fff" />
      <path d={`M${cx - eyeDx - 9} ${eyeY - 11} Q${cx - eyeDx} ${eyeY - 15} ${cx - eyeDx + 9} ${eyeY - 11}`} stroke={a.hairStyle === 'bald' ? shade(skin, -60) : hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d={`M${cx + eyeDx - 9} ${eyeY - 11} Q${cx + eyeDx} ${eyeY - 15} ${cx + eyeDx + 9} ${eyeY - 11}`} stroke={a.hairStyle === 'bald' ? shade(skin, -60) : hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d={`M${cx} ${eyeY + 4} Q${cx - 5} ${eyeY + 18} ${cx} ${eyeY + 20} Q${cx + 4} ${eyeY + 21} ${cx + 5} ${eyeY + 18}`} stroke={skinDark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={`M${cx - 11} ${eyeY + 30} Q${cx} ${eyeY + 38} ${cx + 11} ${eyeY + 30}`} stroke={shade(skin, -70)} strokeWidth="3" fill="none" strokeLinecap="round" />
      {beardEl}
      {!behindHair && hairEl}
      {a.accessory === 'headband' && <rect x={cx - rx - 2} y={top + ry * 0.42} width={rx * 2 + 4} height={8} rx={4} fill={a.kitColor2 || '#ffffff'} opacity={0.95} />}
    </g>
  );
}

/** Motif de maillot appliqué dans un clipPath. */
function KitPattern({ pattern, color2, x, y, w, h }: { pattern: string; color2: string; x: number; y: number; w: number; h: number }) {
  if (pattern === 'stripes') return <g fill={color2}>{Array.from({ length: 5 }).map((_, i) => <rect key={i} x={x + (w / 9) * (i * 2 + 1)} y={y} width={w / 9} height={h} />)}</g>;
  if (pattern === 'hoops') return <g fill={color2}>{Array.from({ length: 4 }).map((_, i) => <rect key={i} x={x} y={y + (h / 7) * (i * 2 + 1)} width={w} height={h / 7} />)}</g>;
  if (pattern === 'sash') return <path d={`M${x} ${y + h * 0.05} L${x + w * 0.22} ${y} L${x + w} ${y + h * 0.95} L${x + w * 0.78} ${y + h}Z`} fill={color2} />;
  if (pattern === 'halves') return <rect x={x + w / 2} y={y} width={w / 2} height={h} fill={color2} />;
  return null;
}

export function Avatar({ a, age, size = 120, colors, showNumber = true, ring = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const kit: [string, string] = colors ?? [a.kitColor || '#1fa860', a.kitColor2 || '#ffffff'];
  const child = age < 12;
  const teen = age >= 12 && age < 17;
  const buildW = a.build === 'strong' ? 1.14 : a.build === 'slim' ? 0.9 : 1;
  const ageW = child ? 0.78 : teen ? 0.9 : 1;
  const shoulder = 70 * buildW * ageW;
  const cx = 100;
  const skinDark = shade(SKIN_TONES[a.skin] ?? SKIN_TONES[2], -28);
  const jersey = `M${cx - shoulder} 220 Q${cx - shoulder} 160 ${cx - 22} 150 L${cx + 22} 150 Q${cx + shoulder} 160 ${cx + shoulder} 220Z`;
  const usePattern = !colors && a.kitPattern && a.kitPattern !== 'plain';
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" role="img" aria-label="Avatar du joueur">
      {ring && <circle cx="100" cy="110" r="98" fill={kit[0]} opacity="0.13" />}
      <defs><clipPath id={`j${uid}`}><path d={jersey} /></clipPath></defs>
      <path d={jersey} fill={kit[0]} />
      {usePattern && <g clipPath={`url(#j${uid})`}><KitPattern pattern={a.kitPattern} color2={kit[1]} x={cx - shoulder} y={150} w={shoulder * 2} h={70} /></g>}
      <path d={`M${cx - 22} 150 L${cx} 172 L${cx + 22} 150`} fill="none" stroke={kit[1]} strokeWidth="5" strokeLinejoin="round" />
      {showNumber && (
        <text x={cx} y="208" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="30" fill={usePattern ? '#ffffff' : kit[1]} stroke={usePattern ? kit[0] : 'none'} strokeWidth={usePattern ? 1.5 : 0} opacity="0.95">
          {a.jerseyNumber}
        </text>
      )}
      <rect x={cx - 13} y={118} width="26" height={36} fill={skinDark} />
      <Head a={a} age={age} />
    </svg>
  );
}

/** Silhouette complète : la taille, la corpulence et l'équipement complet sont visibles. */
export function PlayerFigure({ a, age, height = 300, colors, position }: { a: Appearance; age: number; height?: number; colors?: [string, string]; position?: string }) {
  const uid = useId().replace(/:/g, '');
  const kit: [string, string] = colors ?? [a.kitColor || '#1fa860', a.kitColor2 || '#ffffff'];
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[2];
  const skinDark = shade(skin, -24);
  const child = age < 12;
  const teen = age >= 12 && age < 17;
  const hF = a.heightClass === 'tall' ? 1.09 : a.heightClass === 'small' ? 0.91 : 1;
  const ageH = child ? 0.74 : teen ? 0.9 : 1;
  const bw = a.build === 'strong' ? 1.18 : a.build === 'slim' ? 0.86 : 1;
  const ageWd = child ? 0.86 : teen ? 0.94 : 1;
  const u = hF * ageH;
  const w = bw * ageWd;
  const cx = 100;
  const ground = 392;
  const bootH = 12 * u, sockH = 64 * u, kneeH = 30 * u, shortsH = 40 * u, torsoH = 100 * u, neckH = 10 * u;
  const yBootTop = ground - bootH;
  const ySockTop = yBootTop - sockH;
  const yShortsBottom = ySockTop - kneeH;
  const yShortsTop = yShortsBottom - shortsH;
  const yShoulder = yShortsTop - torsoH;
  const yNeckTop = yShoulder - neckH;
  const legW = 20 * w * Math.max(0.9, u);
  const sh = 44 * w * Math.max(0.9, u);
  const hip = 32 * w * Math.max(0.9, u);
  const headK = (child ? 0.62 : teen ? 0.56 : 0.52) * Math.max(0.92, u);
  const headCyLocal = 92;
  const headBottomLocal = 140;
  const headTx = cx - 100 * headK;
  const headTy = yNeckTop + 4 - headBottomLocal * headK;
  const torso = `M${cx - sh} ${yShoulder + 6} Q${cx - sh - 2} ${yShoulder} ${cx - sh + 10} ${yShoulder} L${cx + sh - 10} ${yShoulder} Q${cx + sh + 2} ${yShoulder} ${cx + sh} ${yShoulder + 6} L${cx + hip + 4} ${yShortsTop + 4} L${cx - hip - 4} ${yShortsTop + 4}Z`;
  const armLen = 92 * u;
  const pattern = !colors && a.kitPattern && a.kitPattern !== 'plain';
  const gloves = a.accessory === 'gloves' || position === 'GK';
  void headCyLocal;
  return (
    <svg width={height * 0.5} height={height} viewBox="0 0 200 400" role="img" aria-label="Silhouette du joueur">
      <ellipse cx={cx} cy={ground + 3} rx={60 * w} ry="6" fill="#000" opacity="0.35" />
      {/* Bras */}
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={`M${cx + d * (sh - 4)} ${yShoulder + 4} L${cx + d * (sh + 12 * w)} ${yShoulder + armLen * 0.95} L${cx + d * (sh + 1)} ${yShoulder + armLen} L${cx + d * (sh - 10)} ${yShoulder + 20}Z`} fill={skin} />
          <path d={`M${cx + d * (sh - 6)} ${yShoulder + 2} L${cx + d * (sh + 9 * w)} ${yShoulder + armLen * 0.38} L${cx + d * (sh - 4)} ${yShoulder + armLen * 0.42} L${cx + d * (sh - 12)} ${yShoulder + 18}Z`} fill={kit[0]} />
          {gloves ? <circle cx={cx + d * (sh + 7 * w)} cy={yShoulder + armLen} r={9 * w} fill={kit[1]} stroke="#0003" /> : <circle cx={cx + d * (sh + 7 * w)} cy={yShoulder + armLen} r={6.5 * w} fill={skin} />}
          {a.accessory === 'wristband' && <rect x={cx + d * (sh + 7 * w) - 7 * w} y={yShoulder + armLen - 14} width={14 * w} height={6} rx={2} fill={kit[1]} />}
        </g>
      ))}
      {/* Jambes */}
      {[-1, 1].map((d) => {
        const lx = cx + d * (legW * 0.5 + 3) - legW / 2;
        return (
          <g key={d}>
            <rect x={lx} y={yShortsBottom - 4} width={legW} height={kneeH + 8} fill={skin} />
            <rect x={lx - 1} y={ySockTop} width={legW + 2} height={sockH} rx={4} fill={kit[0]} />
            <rect x={lx - 1} y={ySockTop + 6} width={legW + 2} height={5} fill={kit[1]} opacity={0.9} />
            <path d={`M${lx - 2} ${yBootTop} L${lx + legW + 2} ${yBootTop} L${lx + legW + 2 + d * 8} ${ground} L${lx - 2 + Math.min(0, d * 8)} ${ground}Z`} fill={a.bootsColor || '#1b1b1b'} />
            <rect x={lx - 2 + Math.min(0, d * 8)} y={ground - 3} width={legW + 12} height={3} fill="#0006" />
          </g>
        );
      })}
      {/* Short */}
      <path d={`M${cx - hip - 4} ${yShortsTop} L${cx + hip + 4} ${yShortsTop} L${cx + hip + 8} ${yShortsBottom} L${cx + 2} ${yShortsBottom} L${cx} ${yShortsTop + shortsH * 0.4} L${cx - 2} ${yShortsBottom} L${cx - hip - 8} ${yShortsBottom}Z`} fill={kit[1] === kit[0] ? shade(kit[0], -40) : kit[1]} stroke="#0004" strokeWidth="1" />
      {/* Maillot */}
      <defs><clipPath id={`t${uid}`}><path d={torso} /></clipPath></defs>
      <rect x={cx - 9} y={yNeckTop} width={18} height={neckH + 8} fill={skinDark} />
      <path d={torso} fill={kit[0]} />
      {pattern && <g clipPath={`url(#t${uid})`}><KitPattern pattern={a.kitPattern} color2={kit[1]} x={cx - sh} y={yShoulder} w={sh * 2} h={torsoH + 6} /></g>}
      <path d={`M${cx - 10} ${yShoulder} L${cx} ${yShoulder + 10} L${cx + 10} ${yShoulder}`} fill="none" stroke={kit[1]} strokeWidth="3" />
      <text x={cx} y={yShoulder + torsoH * 0.62} textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize={34 * Math.max(0.8, u)} fill={pattern ? '#ffffff' : kit[1]} stroke={pattern ? kit[0] : 'none'} strokeWidth={pattern ? 1.2 : 0}>{a.jerseyNumber}</text>
      <g transform={`translate(${headTx} ${headTy}) scale(${headK})`}><Head a={a} age={age} /></g>
    </svg>
  );
}

export function NpcAvatar({ skin, hair, hairColor, age, size = 44 }: { skin: number; hair: string; hairColor: string; age: 'child' | 'teen' | 'adult' | 'senior'; size?: number }) {
  const a: Appearance = { skin, hairStyle: hair, hairColor, eyeColor: '#3e2a1f', beard: 'none', faceShape: 'oval', heightClass: 'medium', build: 'normal', jerseyNumber: 0, kitColor: '#2a3d35', kitColor2: '#2a3d35', kitPattern: 'plain', bootsColor: '#1b1b1b', accessory: 'none' };
  const years = age === 'child' ? 9 : age === 'teen' ? 15 : age === 'adult' ? 40 : 65;
  return <Avatar a={a} age={years} size={size} colors={['#2a3d35', '#2a3d35']} showNumber={false} ring={false} />;
}

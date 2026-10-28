// Avatar 2D modulaire (SVG) : teint, coiffure, couleurs, barbe, visage, corpulence, maillot.
// L'apparence évolue avec l'âge (proportions enfant/ado/adulte, barbe autorisée à partir de 16 ans).

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

export function Avatar({ a, age, size = 120, colors = ['#1fa860', '#ffffff'], showNumber = true, ring = true }: Props) {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[2];
  const skinDark = shade(skin, -28);
  const hair = a.hairColor;
  const child = age < 12;
  const teen = age >= 12 && age < 17;
  // Proportions selon l'âge et la morphologie
  const headScale = child ? 1.12 : teen ? 1.04 : 1;
  const buildW = a.build === 'strong' ? 1.14 : a.build === 'slim' ? 0.9 : 1;
  const ageW = child ? 0.78 : teen ? 0.9 : 1;
  const shoulder = 70 * buildW * ageW;
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
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" role="img" aria-label="Avatar du joueur">
      {ring && <circle cx="100" cy="110" r="98" fill={colors[0]} opacity="0.13" />}
      {/* Maillot */}
      <path d={`M${cx - shoulder} 220 Q${cx - shoulder} 160 ${cx - 22} 150 L${cx + 22} 150 Q${cx + shoulder} 160 ${cx + shoulder} 220Z`} fill={colors[0]} />
      <path d={`M${cx - 22} 150 L${cx} 172 L${cx + 22} 150`} fill="none" stroke={colors[1]} strokeWidth="5" strokeLinejoin="round" />
      {showNumber && (
        <text x={cx} y="208" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="30" fill={colors[1]} opacity="0.95">
          {a.jerseyNumber}
        </text>
      )}
      {/* Cou */}
      <rect x={cx - 13} y={headCy + ry - 14} width="26" height={150 - (headCy + ry - 14) + 4} fill={skinDark} />
      {behindHair && hairEl}
      {/* Oreilles */}
      <ellipse cx={cx - rx + 1} cy={headCy + 4} rx="7" ry="10" fill={skinDark} />
      <ellipse cx={cx + rx - 1} cy={headCy + 4} rx="7" ry="10" fill={skinDark} />
      {headShape}
      {/* Yeux */}
      <ellipse cx={cx - eyeDx} cy={eyeY} rx="7.5" ry="5.5" fill="#fff" />
      <ellipse cx={cx + eyeDx} cy={eyeY} rx="7.5" ry="5.5" fill="#fff" />
      <circle cx={cx - eyeDx} cy={eyeY} r="3.8" fill={a.eyeColor} />
      <circle cx={cx + eyeDx} cy={eyeY} r="3.8" fill={a.eyeColor} />
      <circle cx={cx - eyeDx + 1} cy={eyeY - 1} r="1.3" fill="#fff" />
      <circle cx={cx + eyeDx + 1} cy={eyeY - 1} r="1.3" fill="#fff" />
      {/* Sourcils */}
      <path d={`M${cx - eyeDx - 9} ${eyeY - 11} Q${cx - eyeDx} ${eyeY - 15} ${cx - eyeDx + 9} ${eyeY - 11}`} stroke={a.hairStyle === 'bald' ? shade(skin, -60) : hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d={`M${cx + eyeDx - 9} ${eyeY - 11} Q${cx + eyeDx} ${eyeY - 15} ${cx + eyeDx + 9} ${eyeY - 11}`} stroke={a.hairStyle === 'bald' ? shade(skin, -60) : hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      {/* Nez & bouche */}
      <path d={`M${cx} ${eyeY + 4} Q${cx - 5} ${eyeY + 18} ${cx} ${eyeY + 20} Q${cx + 4} ${eyeY + 21} ${cx + 5} ${eyeY + 18}`} stroke={skinDark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={`M${cx - 11} ${eyeY + 30} Q${cx} ${eyeY + 38} ${cx + 11} ${eyeY + 30}`} stroke={shade(skin, -70)} strokeWidth="3" fill="none" strokeLinecap="round" />
      {beardEl}
      {!behindHair && hairEl}
    </svg>
  );
}

export function NpcAvatar({ skin, hair, hairColor, age, size = 44 }: { skin: number; hair: string; hairColor: string; age: 'child' | 'teen' | 'adult' | 'senior'; size?: number }) {
  const a: Appearance = { skin, hairStyle: hair, hairColor, eyeColor: '#3e2a1f', beard: 'none', faceShape: 'oval', heightClass: 'medium', build: 'normal', jerseyNumber: 0 };
  const years = age === 'child' ? 9 : age === 'teen' ? 15 : age === 'adult' ? 40 : 65;
  return <Avatar a={a} age={years} size={size} colors={['#2a3d35', '#2a3d35']} showNumber={false} ring={false} />;
}

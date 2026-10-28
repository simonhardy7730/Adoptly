// Composants d'interface réutilisables.
import type { ReactNode } from 'react';

export const fmtMoney = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 })} €`;
export const fmtInt = (v: number) => Math.round(v).toLocaleString('fr-FR');

export function StatBar({ label, value, max = 100, color, suffix, hint }: { label: ReactNode; value: number; max?: number; color?: 'auto' | 'gold' | 'blue'; suffix?: string; hint?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cls = color === 'gold' ? 'gold' : color === 'blue' ? 'blue' : color === 'auto' ? (pct < 25 ? 'bad' : pct < 45 ? 'warn' : '') : '';
  return (
    <div className="stat-row" title={hint}>
      <span className="label">{label}</span>
      <span className="value">{Number.isInteger(value) ? value : value.toFixed(max <= 20 ? 1 : 0)}{suffix}</span>
      <div className={`bar ${cls}`}><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function MiniBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return <div className={`bar ${color ?? (pct < 25 ? 'bad' : pct < 45 ? 'warn' : '')}`}><span style={{ width: `${pct}%` }} /></div>;
}

export function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="stars" title={`${value}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < full ? 1 : i === full && half ? 0.55 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

export function Crest({ name, colors, size = 42 }: { name: string; colors: [string, string]; size?: number }) {
  const initials = name.split(' ').filter((w) => w.length > 1).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  return <div className="crest" style={{ width: size, height: size, background: `linear-gradient(135deg, ${colors[0]}, ${colors[0]}cc)`, color: colors[1], fontSize: size / 3 }}>{initials}</div>;
}

export function BrandChip({ logo, color, size = 38 }: { logo: string; color: string; size?: number }) {
  return <div className="brand-chip" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>{logo}</div>;
}

export function Modal({ children, wide, onClose }: { children: ReactNode; wide?: boolean; onClose?: () => void }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`}>{children}</div>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ratingColor(r: number) {
  return r >= 8 ? '#2fd17a' : r >= 7 ? '#b6f36a' : r >= 6 ? '#f4c95d' : r >= 5 ? '#ff9f43' : '#ff6b6b';
}

// Affichage Canvas du moteur 2D. Ne modifie jamais l'état de la simulation : il le lit et le dessine.

import type { SimPlayer, SimState } from './types';
import { attackDir } from './sim';

export interface ViewOpts {
  names: boolean;
  tactics: boolean;
  effects: boolean;
}

export interface Camera {
  zoom: number;
  fx: number; // point de focus (mètres)
  fy: number;
}

const GRASS_A = '#17583a';
const GRASS_B = '#1b6442';
const SURROUND = '#0d2219';
const LINE = 'rgba(236, 248, 240, 0.78)';

interface Geo {
  scale: number;
  ox: number;
  oy: number;
}

export function geometry(s: SimState, w: number, h: number): Geo {
  const { L, W } = s.cfg.pitch;
  const margin = 5;
  const scale = Math.min(w / (L + margin * 2), h / (W + margin * 2));
  return { scale, ox: (w - L * scale) / 2, oy: (h - W * scale) / 2 };
}

let pitchCache: { key: string; canvas: HTMLCanvasElement } | null = null;

function drawPitch(s: SimState, w: number, h: number, g: Geo, dpr: number): HTMLCanvasElement {
  const p = s.cfg.pitch;
  const key = `${w}x${h}x${p.L}x${dpr}`;
  if (pitchCache && pitchCache.key === key) return pitchCache.canvas;
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const X = (m: number) => g.ox + m * g.scale;
  const Y = (m: number) => g.oy + m * g.scale;
  ctx.fillStyle = SURROUND;
  ctx.fillRect(0, 0, w, h);
  // bandes de tonte
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? GRASS_A : GRASS_B;
    ctx.fillRect(X((p.L / bands) * i), Y(0) - 3 * g.scale, (p.L / bands) * g.scale + 1, (p.W + 6) * g.scale);
  }
  // vignette douce
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1.2, 0.12 * g.scale);
  ctx.strokeRect(X(0), Y(0), p.L * g.scale, p.W * g.scale);
  ctx.beginPath();
  ctx.moveTo(X(p.L / 2), Y(0));
  ctx.lineTo(X(p.L / 2), Y(p.W));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(p.L / 2), Y(p.W / 2), p.circle * g.scale, 0, Math.PI * 2);
  ctx.stroke();
  const dot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(X(x), Y(y), Math.max(1.5, 0.22 * g.scale), 0, Math.PI * 2);
    ctx.fillStyle = LINE;
    ctx.fill();
  };
  dot(p.L / 2, p.W / 2);
  for (const side of [0, 1]) {
    const gx = side === 0 ? 0 : p.L;
    const d = side === 0 ? 1 : -1;
    ctx.strokeRect(Math.min(X(gx), X(gx + d * p.boxDepth)), Y(p.W / 2 - p.boxW / 2), p.boxDepth * g.scale, p.boxW * g.scale);
    ctx.strokeRect(Math.min(X(gx), X(gx + d * p.sixDepth)), Y(p.W / 2 - p.sixW / 2), p.sixDepth * g.scale, p.sixW * g.scale);
    dot(gx + d * p.spot, p.W / 2);
    // arc de la surface
    ctx.save();
    ctx.beginPath();
    ctx.rect(side === 0 ? X(p.boxDepth) : 0, 0, side === 0 ? w : X(p.L - p.boxDepth), h);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(X(gx + d * p.spot), Y(p.W / 2), p.circle * g.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // cages et filets
    const gw = p.goalW * g.scale;
    const depth = 2 * g.scale;
    const gx0 = side === 0 ? X(0) - depth : X(p.L);
    const gy0 = Y(p.W / 2 - p.goalW / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(gx0, gy0, depth, gw);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(gx0, gy0 + (gw / 6) * k);
      ctx.lineTo(gx0 + depth, gy0 + (gw / 6) * k);
      ctx.stroke();
    }
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(gx0 + (depth / 3) * k, gy0);
      ctx.lineTo(gx0 + (depth / 3) * k, gy0 + gw);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, 0.2 * g.scale);
    ctx.strokeRect(gx0, gy0, depth, gw);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1.2, 0.12 * g.scale);
    // poteaux de corner
    for (const cy of [0, p.W]) {
      ctx.beginPath();
      ctx.arc(X(gx), Y(cy), 1 * g.scale, side === 0 ? (cy === 0 ? 0 : -Math.PI / 2) : cy === 0 ? Math.PI / 2 : Math.PI, side === 0 ? (cy === 0 ? Math.PI / 2 : 0) : cy === 0 ? Math.PI : Math.PI * 1.5);
      ctx.stroke();
    }
  }
  pitchCache = { key, canvas: c };
  return c;
}

function shade(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}

/** Joueur stylisé (vue de trois-quarts) : jambes, bras, maillot, tête ; la pose dépend de l'animation. */
function drawPlayer(ctx: CanvasRenderingContext2D, s: SimState, p: SimPlayer, x: number, y: number, H: number, opts: ViewOpts) {
  const team = s.cfg.teams[p.team];
  const kit = p.role === 'GK' ? team.gkColor : team.colors[0];
  const kit2 = team.colors[1];
  const skin = p.look?.skin ?? '#d6a27c';
  const hair = p.look?.hairColor ?? '#2b1d14';
  const u = H / 20;
  const face = Math.cos(p.facing) >= 0 ? 1 : -1;
  const k = p.animDur > 0 ? Math.min(1, p.animT / p.animDur) : 0;
  const a = p.anim;
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.4, u * 4.6, u * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.isUser) {
    ctx.strokeStyle = '#2fd17a';
    ctx.lineWidth = Math.max(1.5, u * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.4, u * 5.6, u * 2.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (s.ball.owner === p.id) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.4, u * 5, u * 1.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y);
  // poses globales
  let lift = 0;
  if (a === 'header') lift = Math.sin(k * Math.PI) * u * 5;
  if (a === 'celebrate') lift = Math.abs(Math.sin(p.animT * 9)) * u * 3;
  if (a === 'dive') {
    const dir = Math.sin(p.animDir) >= 0 ? 1 : -1; // plongeon vers le haut/bas du but (vu de dessus : sur le côté)
    ctx.translate(0, dir * u * 3 * Math.min(1, k * 2));
    ctx.rotate(-face * Math.PI / 2 * Math.min(1, k * 2.5));
  }
  if (a === 'tackle') ctx.rotate(face * 1.1 * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2));
  if (a === 'down') ctx.rotate(face * Math.PI / 2);
  ctx.translate(0, -lift);
  if (face < 0) ctx.scale(-1, 1);
  const lean = a === 'run' || a === 'dribble' ? 0.12 : a === 'shoot' ? -0.15 * Math.sin(k * Math.PI) : 0;
  ctx.rotate(lean);
  // jambes
  const moving = a === 'run' || a === 'dribble' ? 1 : a === 'walk' ? 0.5 : 0;
  const sw = Math.sin(p.runPhase) * 0.75 * moving;
  const hipY = -8.5 * u;
  const legLen = 8.5 * u;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.9 * u;
  const leg = (angle: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(Math.sin(angle) * legLen, hipY + Math.cos(angle) * legLen);
    ctx.stroke();
  };
  let back = -sw;
  let front = sw;
  if (a === 'pass' || a === 'shoot') {
    const kick = a === 'shoot' ? 1.5 : 1.0;
    const phase = k < 0.35 ? -k / 0.35 * 0.6 : (k - 0.35) / 0.65 * kick;
    front = phase;
    back = -0.15;
  }
  if (a === 'tackle') { front = 1.2; back = 0.6; }
  if (a === 'control') { front = 0.35; back = -0.1; }
  if (a === 'celebrate') { front = 0.35 * Math.sin(p.animT * 9); back = -front; }
  const sock = shade(kit2, -10);
  leg(back, shade(sock, -30));
  leg(front, sock);
  // short
  ctx.fillStyle = shade(kit2, -40);
  ctx.fillRect(-2.6 * u, hipY - 1.6 * u, 5.2 * u, 2.6 * u);
  // bras
  ctx.lineWidth = 1.5 * u;
  ctx.strokeStyle = skin;
  const sh = -15.5 * u;
  const arm = (dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(0, sh);
    ctx.lineTo(dx * u, sh + dy * u);
    ctx.stroke();
  };
  if (a === 'celebrate') { arm(-4, -6); arm(4, -6); }
  else if (a === 'catch' || (a === 'dive' && p.role === 'GK')) { arm(5.5, -1.5); arm(5, 1); }
  else if (a === 'header') { arm(-3.5, -3); arm(3.5, -3); }
  else { arm(-Math.sin(sw) * 4 - 1, 5.5); arm(Math.sin(sw) * 4 + 1, 5.5); }
  // maillot
  ctx.fillStyle = kit;
  ctx.beginPath();
  ctx.roundRect(-3.2 * u, -16.6 * u, 6.4 * u, 7.6 * u, 1.6 * u);
  ctx.fill();
  if (p.role !== 'GK') {
    ctx.fillStyle = kit2;
    ctx.fillRect(-3.2 * u, -16.6 * u, 6.4 * u, 1.1 * u);
  }
  // gants du gardien
  if (p.role === 'GK') {
    ctx.fillStyle = '#f5f5f5';
    const hands = a === 'catch' || a === 'dive' ? [[5.5, -1.5], [5, 1]] : a === 'celebrate' ? [[-4, -6], [4, -6]] : [[-Math.sin(sw) * 4 - 1, 5.5], [Math.sin(sw) * 4 + 1, 5.5]];
    for (const [dx, dy] of hands) {
      ctx.beginPath();
      ctx.arc(dx * u, sh + dy * u, 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // tête
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0.4 * u, -19.3 * u, 2.7 * u, 0, Math.PI * 2);
  ctx.fill();
  if (p.look?.hair !== 'bald') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    const big = p.look?.hair === 'afro' ? 1.35 : 1.05;
    ctx.arc(0.2 * u, -20 * u, 2.75 * u * big, Math.PI * 1.02, Math.PI * 2.02);
    ctx.fill();
  }
  ctx.restore();
  // carton
  if (p.cardUntil > s.t) {
    ctx.fillStyle = p.sentOff ? '#e53935' : '#ffd600';
    ctx.fillRect(x - u * 1.2, y - H * 1.35 - u * 3, u * 2.4, u * 3.4);
  }
  // marqueur « TOI »
  if (p.isUser) {
    ctx.fillStyle = '#2fd17a';
    ctx.beginPath();
    const ty = y - H * 1.32 - lift;
    ctx.moveTo(x - u * 1.8, ty - u * 2.2);
    ctx.lineTo(x + u * 1.8, ty - u * 2.2);
    ctx.lineTo(x, ty);
    ctx.closePath();
    ctx.fill();
  }
  if (opts.names || p.isUser) {
    ctx.font = `600 ${Math.max(9, u * 3.1)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = p.isUser ? '#2fd17a' : 'rgba(255,255,255,0.85)';
    ctx.fillText(`${p.num} ${p.name}`, x, y + u * 4.8);
  }
}

function drawBall(ctx: CanvasRenderingContext2D, s: SimState, g: Geo) {
  const b = s.ball;
  const x = g.ox + b.pos.x * g.scale;
  const y = g.oy + b.pos.y * g.scale;
  const r = Math.max(3, 0.34 * g.scale * 1.5) * (1 + b.z * 0.06);
  ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.2, b.z * 0.03)})`;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.4, r * (1 + b.z * 0.05), r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const by = y - b.z * g.scale * 0.9;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(x + r * 0.15, by - r * 0.1, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

function drawTactics(ctx: CanvasRenderingContext2D, s: SimState, g: Geo) {
  for (const team of [0, 1] as const) {
    const col = s.cfg.teams[team].colors[0];
    const ps = s.players.filter((p) => p.team === team && p.onPitch && !p.sentOff && p.role !== 'GK');
    // lignes par poste
    for (const role of ['DEF', 'MID', 'ATT'] as const) {
      const line = ps.filter((p) => p.role === role).sort((a, b) => a.pos.y - b.pos.y);
      if (line.length < 2) continue;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      line.forEach((p, i) => (i ? ctx.lineTo(g.ox + p.pos.x * g.scale, g.oy + p.pos.y * g.scale) : ctx.moveTo(g.ox + p.pos.x * g.scale, g.oy + p.pos.y * g.scale)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // cibles de placement
    for (const p of ps) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      const tx = g.ox + p.target.x * g.scale;
      const ty = g.oy + p.target.y * g.scale;
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty - 3); ctx.lineTo(tx + 3, ty + 3); ctx.moveTo(tx + 3, ty - 3); ctx.lineTo(tx - 3, ty + 3);
      ctx.stroke();
    }
  }
  // sens du jeu
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left';
  const d0 = attackDir(s, 0);
  ctx.fillText(`${s.cfg.teams[0].short} ${d0 > 0 ? '→' : '←'}   ${s.cfg.teams[1].short} ${d0 > 0 ? '←' : '→'}`, 10, 16);
}

/** Dessine une image du match. `cam` lisse le zoom côté affichage. */
export function drawFrame(ctx: CanvasRenderingContext2D, s: SimState, w: number, h: number, dpr: number, opts: ViewOpts, cam: Camera) {
  const g = geometry(s, w, h);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // caméra : zoom léger sur l'action pendant les moments forts
  const zoomWanted = opts.effects && s.t < s.focusUntil ? 1.35 : 1;
  cam.zoom += (zoomWanted - cam.zoom) * 0.06;
  const fx = s.ball.pos.x;
  const fy = s.ball.pos.y;
  cam.fx += (fx - cam.fx) * 0.08;
  cam.fy += (fy - cam.fy) * 0.08;
  const cx = g.ox + cam.fx * g.scale;
  const cy = g.oy + cam.fy * g.scale;
  const z = cam.zoom;
  const tx = (w / 2 - cx) * (z - 1) / z;
  const ty = (h / 2 - cy) * (z - 1) / z;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(z, z);
  ctx.translate(-w / 2 + tx, -h / 2 + ty);
  ctx.drawImage(drawPitch(s, w, h, g, dpr), 0, 0, w, h);
  if (opts.tactics) drawTactics(ctx, s, g);
  // silhouettes volontairement agrandies (≈ 3 m) pour rester lisibles sur un terrain entier
  const H = Math.max(20, Math.min(60, 3.1 * g.scale));
  const list = s.players.filter((p) => p.onPitch && !p.sentOff).sort((a, b) => a.pos.y - b.pos.y);
  const ballY = s.ball.pos.y;
  let ballDrawn = false;
  for (const p of list) {
    if (!ballDrawn && p.pos.y > ballY) { drawBall(ctx, s, g); ballDrawn = true; }
    drawPlayer(ctx, s, p, g.ox + p.pos.x * g.scale, g.oy + p.pos.y * g.scale, H, opts);
  }
  if (!ballDrawn) drawBall(ctx, s, g);
  ctx.restore();
}

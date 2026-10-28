// 공간 배치. 면적과 브랜드별 행거 수로 자동 배치를 만들고, 3D 조감도로 보여 준다.
// 팀이 직접 옮기고(평면), 브랜드를 바꾸고, 사진을 걸 수 있다. 고친 배치는 team.layout에 저장된다.
// 자동 배치: 의류는 벽 행거, 소품은 가운데 진열대, 입구 맞은편 벽은 회차마다 다른 브랜드.
import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMe } from '@/store/hooks';
import { brandById, spaceById } from '@/store/logic';
import { saveTeamLayout } from '@/store/actions';
import { askAi, type LayoutOut, type LayoutZone } from '@/store/ai';
import { newId } from '@/store/store';
import { brandCoverSrc, spaceSrc } from '@/data/photos';
import { pickPhotos } from '@/components/photoPick';
import { AiSource, Button, cx } from '@/components/ui';
import type { BrandProfile, LayoutBox, LayoutKind, Team, TeamLayout } from '@/types';

// 실사 3D(three.js)는 배치 탭을 열 때만 불러온다. WebGL이 없는 기기는 가벼운 3D로 보여 준다
const Room3DGL = lazy(() => import('./Room3DGL'));
const hasWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();

const HANGER = 1.2; // 행거 1개 폭(m)
const DEPTH = 0.5; // 행거 깊이(m)
const FIT = 1.3; // 피팅룸 한 변(m)
const COUNTER = { w: 1.6, d: 0.6 };
const DOOR = 1.4;
const TABLE = { w: 1.1, d: 0.9 };
// 3D에서 물건 높이(m)
const HEIGHT: Record<LayoutKind, number> = { hanger: 1.5, table: 0.8, fit: 2.1, counter: 1.0, mirror: 1.8, photo: 2.2 };
// AI가 놓을 수 있는 물건 크기(m, 회전 0일 때)
const SIZE = { hanger: { w: HANGER, h: DEPTH }, table: { w: TABLE.w, h: TABLE.d }, photo: { w: 2.0, h: 0.3 } } as const;
const WALL = 2.4;
// 브랜드끼리 잘 구분되는 옅은 색
const PALETTE = ['#cdd9ea', '#ecd5c3', '#d3e4cd', '#e7d0e2', '#ece2b8', '#cfe6e6'];

type Member = { brand: BrandProfile; hangers: number; slotLabel: string };

function isWallCategory(b: BrandProfile, slotLabel: string) {
  return slotLabel.includes('의류') || b.tags.categories.includes('의류');
}

export function roomSize(area: number) {
  // 가로가 조금 긴 직사각형으로 본다
  const W = Math.max(4, Math.round(Math.sqrt(area * 1.4) * 10) / 10);
  const H = Math.max(3.5, Math.round((area / W) * 10) / 10);
  return { W, H };
}

/** 자동 배치. zones를 주면(AI 제안) 그 벽을 먼저 쓰고, 없으면 회차 순서대로 맞은편 벽부터 채운다 */
export function planLayout(area: number, members: Member[], round: number, zones?: Record<string, LayoutZone>) {
  const { W, H } = roomSize(area);
  const boxes: LayoutBox[] = [
    { id: 'fit', kind: 'fit', x: W - FIT, y: 0, w: FIT, h: FIT, label: '피팅룸' },
    { id: 'mirror', kind: 'mirror', x: W - FIT - 0.15, y: FIT + 0.2, w: 0.1, h: 1.0 },
    { id: 'counter', kind: 'counter', x: W - COUNTER.w - 0.3, y: H - COUNTER.d - 0.2, w: COUNTER.w, h: COUNTER.d, label: '계산대' },
  ];

  // 벽 행거 자리: 뒤 벽(왼→오), 왼쪽 벽(아래→위), 오른쪽 벽(피팅룸과 계산대 사이)
  type Seg = { zone: LayoutZone; x: number; y: number; dx: number; dy: number; len: number };
  const segs: Seg[] = [
    { zone: 'back', x: 0.2 + DEPTH, y: 0, dx: 1, dy: 0, len: W - FIT - 0.4 - DEPTH },
    { zone: 'left', x: 0, y: H - 0.6, dx: 0, dy: -1, len: H - 0.6 - 0.2 },
    { zone: 'right', x: W, y: FIT + 1.4, dx: 0, dy: 1, len: Math.max(0, H - COUNTER.d - 0.2 - (FIT + 1.4) - 0.3) },
  ];
  const slots: { zone: LayoutZone; x: number; y: number; w: number; h: number; used?: boolean }[] = [];
  segs.forEach((s) => {
    const n = Math.floor(s.len / HANGER);
    for (let i = 0; i < n; i++) {
      const p = i * HANGER;
      if (s.dx) slots.push({ zone: s.zone, x: s.x + p, y: s.y, w: HANGER, h: DEPTH });
      else if (s.dy < 0) slots.push({ zone: s.zone, x: s.x, y: s.y - p - HANGER, w: DEPTH, h: HANGER });
      else slots.push({ zone: s.zone, x: s.x - DEPTH, y: s.y + p, w: DEPTH, h: HANGER });
    }
  });

  const toTable = (m: Member) => (zones ? zones[m.brand.id] === 'center' : !isWallCategory(m.brand, m.slotLabel));
  const wall = members.filter((m) => !toTable(m));
  const small = members.filter(toTable);
  // 의류 브랜드 순서를 회차만큼 돌려서 맞은편 벽을 번갈아 쓴다
  const k = wall.length ? (round - 1) % wall.length : 0;
  const wallOrder = zones ? wall : [...wall.slice(k), ...wall.slice(0, k)];
  const overflow: { brand: BrandProfile; n: number }[] = [];
  wallOrder.forEach((m) => {
    const want = zones?.[m.brand.id];
    let left = 0;
    for (let i = 0; i < m.hangers; i++) {
      const s = (want && slots.find((x) => !x.used && x.zone === want)) || slots.find((x) => !x.used);
      if (!s) { left++; continue; }
      s.used = true;
      boxes.push({ id: newId('lb'), kind: 'hanger', x: s.x, y: s.y, w: s.w, h: s.h, brandId: m.brand.id });
    }
    if (left) overflow.push({ brand: m.brand, n: left });
  });

  // 가운데 진열대: 소품 브랜드 + 벽에 못 들어간 행거
  const tableBrands = [...small.map((m) => m.brand), ...overflow.map((o) => o.brand)];
  const cols = Math.min(2, tableBrands.length);
  tableBrands.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = W / 2 - (cols * TABLE.w + (cols - 1) * 0.4) / 2;
    boxes.push({ id: newId('lb'), kind: 'table', x: x0 + col * (TABLE.w + 0.4), y: H / 2 - TABLE.d - 0.1 + row * (TABLE.d + 0.4), w: TABLE.w, h: TABLE.d, brandId: b.id });
  });

  // 남은 벽에 포토존 하나 (왼쪽 벽 아래쪽이 비어 있으면)
  const free = slots.filter((x) => !x.used && x.zone === 'left');
  if (free.length >= 2) boxes.push({ id: newId('lb'), kind: 'photo', x: 0, y: free[0].y - 0.8, w: 0.3, h: 2.0, label: '포토존' });

  const back = boxes.find((b) => b.kind === 'hanger' && b.y === 0);
  return { W, H, boxes, overflow, facingBrandId: back?.brandId, wallFree: slots.filter((s) => !s.used).length, tableBrands, path: rulePath(W, H) };
}

/** 기본 동선: 입구 → 가운데 → 왼쪽 벽 → 맞은편 벽 → 피팅룸 → 계산대 */
export function rulePath(W: number, H: number) {
  return [
    { x: W / 2, y: H - 0.3 }, { x: W / 2 - 0.4, y: H * 0.68 }, { x: 1.3, y: H * 0.45 }, { x: W * 0.35, y: 1.0 },
    { x: W - FIT - 0.5, y: FIT + 0.4 }, { x: W - COUNTER.w / 2 - 0.3, y: H - COUNTER.d - 0.8 },
  ];
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** AI가 준 물건 목록을 방 안에 맞게 다듬는다. 고정물이나 앞 물건과 많이 겹치면 뺀다 */
export function fromAiItems(W: number, H: number, fixed: LayoutBox[], members: Member[], out: LayoutOut) {
  const boxes: LayoutBox[] = [...fixed];
  out.items.forEach((it) => {
    const size = SIZE[it.kind];
    if (!size) return;
    const [w, h] = it.rotate === 90 ? [size.h, size.w] : [size.w, size.h];
    const x = Math.max(0, Math.min(W - w, Math.round(Number(it.x) * 10) / 10));
    const y = Math.max(0, Math.min(H - h, Math.round(Number(it.y) * 10) / 10));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const box = { x, y, w, h };
    if (boxes.some((b) => overlap(b, box) > 0.25 * w * h)) return;
    const m = members.find((mm) => mm.brand.name === it.brand.trim());
    if (it.kind !== 'photo' && !m) return;
    boxes.push({ id: newId('lb'), kind: it.kind, ...box, brandId: m?.brand.id, label: it.kind === 'photo' ? '포토존' : undefined });
  });
  const path = out.path.map((p) => ({ x: Math.max(0.1, Math.min(W - 0.1, Number(p.x))), y: Math.max(0.1, Math.min(H - 0.1, Number(p.y))) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  // 모든 브랜드가 한 자리 이상 받았을 때만 쓴다
  const ok = members.every((m) => boxes.some((b) => b.brandId === m.brand.id));
  return ok ? { boxes, path: path.length >= 2 ? path : rulePath(W, H) } : null;
}

/** 가운데 통로에서 가장 좁은 폭(대략). 벽 행거 안쪽 선과 진열대 사이 */
function aisleWidth(W: number, boxes: LayoutBox[]) {
  const tables = boxes.filter((b) => b.kind === 'table');
  if (!tables.length) return Math.round((W - 2 * DEPTH) * 10) / 10;
  const minX = Math.min(...tables.map((t) => t.x));
  const maxX = Math.max(...tables.map((t) => t.x + t.w));
  return Math.round(Math.min(minX - DEPTH, W - DEPTH - maxX) * 10) / 10;
}

// ───────── 3D ─────────

type Part = { x: number; y: number; z: number; w: number; d: number; h: number; side: CSSProperties; top?: CSSProperties };

/** 직육면체 하나. 바닥에서 z만큼 띄워 놓는다. 보이지 않는 면은 그리지 않는다(backface hidden) */
function Cuboid({ p, s, hit }: { p: Part; s: number; hit?: boolean }) {
  const sides = [0, 90, 180, 270].map((k) => {
    const long = k % 180 === 0;
    const L = long ? p.w : p.d;
    const half = long ? p.d / 2 : p.w / 2;
    // 면마다 밝기를 달리해 입체감을 준다
    const shade = [1, 0.88, 0.8, 0.93][k / 90];
    return (
      <div key={k} style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', transform: `rotateZ(${k}deg) translateY(${half * s}px)` }}>
        <div style={{ ...p.side, position: 'absolute', left: (-L * s) / 2, top: -p.h * s, width: L * s, height: p.h * s, transformOrigin: 'bottom', transform: 'rotateX(-90deg)', backfaceVisibility: 'hidden', filter: `brightness(${shade})`, pointerEvents: hit ? 'auto' : 'none' }} />
      </div>
    );
  });
  return (
    <div style={{ position: 'absolute', left: p.x * s, top: p.y * s, width: p.w * s, height: p.d * s, transformStyle: 'preserve-3d', transform: `translateZ(${p.z * s}px)` }}>
      {sides}
      <div style={{ ...(p.top ?? p.side), position: 'absolute', inset: 0, transform: `translateZ(${p.h * s}px)`, pointerEvents: hit ? 'auto' : 'none' }} />
    </div>
  );
}

const METAL: CSSProperties = { background: '#2b2b2f' };
const WOOD: CSSProperties = { background: 'linear-gradient(90deg, #c9a77f, #b8936a 40%, #c7a37a 70%, #b48c62)' };
const WHITE: CSSProperties = { background: '#f7f6f3', border: '1px solid rgba(0,0,0,.12)' };
// 옷걸이에 걸린 옷 모양(어깨선)
const SHIRT = 'polygon(43% 0, 57% 0, 100% 11%, 97% 100%, 3% 100%, 0 11%)';

/** 사진 한 장을 여러 벌로 나눠 보이게: 옷마다 사진의 다른 부분을 쓴다 */
function cloth(photo: string | undefined, color: string, i: number): CSSProperties {
  if (photo) return { background: `url(${photo}) ${(i * 37) % 100}% ${30 + ((i * 23) % 40)}% / 520% auto no-repeat, ${color}`, clipPath: SHIRT };
  return { background: color, filter: `brightness(${0.82 + ((i * 7) % 5) * 0.06})`, clipPath: SHIRT };
}

/** 물건 하나를 실제 모양에 가깝게 여러 조각으로 나눈다 */
function partsOf(b: LayoutBox, photo: string | undefined, color: string): Part[] {
  const along = b.w >= b.h; // 행거 봉이 놓이는 방향
  const L = along ? b.w : b.h;
  const D = along ? b.h : b.w;
  // 봉 방향 좌표(t)와 깊이 좌표(u)로 그린 뒤 실제 x, y로 바꾼다
  const at = (t: number, u: number, tw: number, ud: number) => (along ? { x: b.x + t, y: b.y + u, w: tw, d: ud } : { x: b.x + u, y: b.y + t, w: ud, d: tw });
  const out: Part[] = [];
  if (b.kind === 'hanger') {
    const pole = 0.035;
    [0.03, L - 0.03 - pole].forEach((t) => {
      out.push({ ...at(t, D / 2 - pole / 2, pole, pole), z: 0, h: 1.55, side: METAL });
      out.push({ ...at(t - 0.02, 0.02, pole + 0.04, D - 0.04), z: 0, h: 0.03, side: METAL });
    });
    out.push({ ...at(0.03, D / 2 - 0.015, L - 0.06, 0.03), z: 1.5, h: 0.03, side: METAL });
    const n = Math.max(3, Math.round(L / 0.12));
    for (let i = 0; i < n; i++) {
      const len = [0.85, 0.7, 1.0, 0.75, 0.9][i % 5];
      const t = 0.12 + (i * (L - 0.24)) / Math.max(1, n - 1) - 0.035;
      out.push({ ...at(t, 0.04, 0.07, D - 0.08), z: 1.47 - len, h: len, side: cloth(photo, color, i), top: { background: 'transparent' } });
      // 옷걸이 어깨선
      out.push({ ...at(t + 0.025, 0.08, 0.015, D - 0.16), z: 1.46, h: 0.015, side: { background: '#8a6d4f' } });
    }
  } else if (b.kind === 'table') {
    const leg = 0.05;
    [[0.04, 0.04], [L - 0.04 - leg, 0.04], [0.04, D - 0.04 - leg], [L - 0.04 - leg, D - 0.04 - leg]].forEach(([t, u]) => out.push({ ...at(t, u, leg, leg), z: 0, h: 0.74, side: WOOD }));
    out.push({ ...at(0, 0, L, D), z: 0.74, h: 0.04, side: WOOD, top: photo ? { background: `linear-gradient(rgba(201,167,127,.25), rgba(201,167,127,.25)), url(${photo}) center/cover` } : WOOD });
    // 위에 놓인 상품 몇 개
    [[0.15, 0.2, 0.22, 0.12], [L / 2 - 0.1, D / 2 - 0.05, 0.2, 0.08], [L - 0.4, D - 0.4, 0.24, 0.16]].forEach(([t, u, size, h], i) => {
      out.push({ ...at(t, u, size, size * 0.8), z: 0.78, h, side: photo ? { background: `url(${photo}) ${i * 40}% 50% / 400% auto, ${color}` } : { background: color } });
    });
  } else if (b.kind === 'fit') {
    // 커튼 두 면(앞, 왼쪽)과 위 봉
    const curtain: CSSProperties = { background: 'repeating-linear-gradient(90deg, #d9cfc2 0 9px, #cbbfae 9px 14px, #e2d9cd 14px 20px)' };
    out.push({ x: b.x, y: b.y + b.h - 0.02, z: 0.05, w: b.w, d: 0.02, h: 2.0, side: curtain });
    out.push({ x: b.x, y: b.y, z: 0.05, w: 0.02, d: b.h, h: 2.0, side: curtain });
    out.push({ x: b.x, y: b.y + b.h - 0.03, z: 2.08, w: b.w, d: 0.03, h: 0.03, side: METAL });
  } else if (b.kind === 'mirror') {
    out.push({ ...b, d: b.h, z: 0.05, h: 1.75, side: { background: 'linear-gradient(135deg, #e9eef2, #b7c2cc 45%, #eef2f5 60%, #a9b4be)', border: '3px solid #2b2b2f' } });
  } else if (b.kind === 'photo') {
    // 포토존: 사진을 입힌 배경벽과 조명 하나
    out.push({ ...b, d: b.h, z: 0, h: 2.2, side: photo ? { background: `url(${photo}) center/cover, ${color}` } : { background: 'linear-gradient(135deg, #efe7dc, #d9cbb8)' }, top: { background: '#f4f2ee' } });
    const front = along ? { x: b.x + L / 2 - 0.05, y: b.y + D + 0.9 } : { x: b.x + D + 0.9, y: b.y + L / 2 - 0.05 };
    out.push({ ...front, z: 0, w: 0.04, d: 0.04, h: 1.7, side: METAL });
    out.push({ x: front.x - 0.12, y: front.y - 0.12, z: 1.7, w: 0.28, d: 0.28, h: 0.2, side: { background: '#f7f6f3', border: '1px solid rgba(0,0,0,.2)' } });
  } else if (b.kind === 'counter') {
    out.push({ ...b, d: b.h, z: 0, h: 0.95, side: WHITE, top: WOOD });
    out.push({ x: b.x + b.w - 0.45, y: b.y + 0.15, z: 0.95, w: 0.3, d: 0.25, h: 0.12, side: { background: '#3a3a3f' } });
  }
  return out;
}

/** 손님 동선 화살표. 3D 바닥과 평면도에서 같이 쓴다 */
function PathArrows({ path, scale }: { path: { x: number; y: number }[]; scale: number }) {
  if (path.length < 2) return null;
  const pts = path.map((p) => `${p.x * scale},${p.y * scale}`).join(' ');
  return (
    <>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#e0482a" />
        </marker>
      </defs>
      <polyline points={pts} fill="none" stroke="#e0482a" strokeWidth={2.5} strokeDasharray="7 5" strokeLinejoin="round" markerMid="url(#ah)" markerEnd="url(#ah)" />
    </>
  );
}

function Room3D({ W, H, boxes, angle, wallPhoto, colorOf, photoOf, nameOf, selected, onPick, path }: {
  W: number; H: number; boxes: LayoutBox[]; angle: number; wallPhoto: string; path?: { x: number; y: number }[];
  colorOf: (id?: string) => string; photoOf: (b: LayoutBox) => string | undefined; nameOf: (id?: string) => string;
  selected: string | null; onPick: (id: string) => void;
}) {
  const s = Math.min(305 / W, 235 / H);
  const line = '1px solid rgba(17,17,17,.18)';
  // 카메라를 향하는 이름표 (방을 돌려도 똑바로 보이게 되돌려 세운다)
  const labels = new Map<string, { x: number; y: number; n: number; z: number }>();
  boxes.forEach((b) => {
    if (!b.brandId || (b.kind !== 'hanger' && b.kind !== 'table')) return;
    const l = labels.get(b.brandId) ?? { x: 0, y: 0, n: 0, z: 0 };
    l.x += b.x + b.w / 2; l.y += b.y + b.h / 2; l.n += 1; l.z = Math.max(l.z, b.kind === 'hanger' ? 1.9 : 1.15);
    labels.set(b.brandId, l);
  });
  // 안쪽을 향한 벽. 바깥에서 보이는 벽은 그리지 않아 방 안이 들여다보인다
  const walls = [
    { k: 0, L: W, half: H / 2, photo: true },
    { k: -90, L: H, half: W / 2 },
    { k: 90, L: H, half: W / 2 },
  ].map((w) => (
    <div key={w.k} style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', transform: `rotateZ(${w.k}deg) translateY(${-w.half * s}px)` }}>
      <div style={{
        position: 'absolute', left: (-w.L * s) / 2, top: -WALL * s, width: w.L * s, height: WALL * s, transformOrigin: 'bottom', transform: 'rotateX(-90deg)', backfaceVisibility: 'hidden',
        background: `linear-gradient(to top, #d9d3c9 0 6px, transparent 6px), radial-gradient(ellipse at 50% 0%, rgba(255,244,226,.85), transparent 60%), ${w.photo && wallPhoto ? `linear-gradient(rgba(250,249,246,.55), rgba(250,249,246,.55)), url(${wallPhoto}) center/cover` : 'linear-gradient(#f7f5f1, #ece8e1)'}`,
        borderTop: line, borderLeft: line, borderRight: line,
      }} />
    </div>
  ));
  return (
    <div style={{ position: 'absolute', left: '50%', top: '61%', width: W * s, height: H * s, transformStyle: 'preserve-3d', transform: `translate(-50%, -50%) rotateX(55deg) rotateZ(${angle}deg)` }}>
      {/* 나무 바닥 + 가운데가 밝은 조명 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(255,250,240,.55), rgba(120,90,60,.12) 75%), repeating-linear-gradient(90deg, #dcc8ad 0 22px, #cfb898 22px 23px, #e3d1b8 23px 45px, #cfb898 45px 46px)', border: '2px solid #4a4038' }} />
      {/* 입구 매트 */}
      <div style={{ position: 'absolute', left: (W / 2 - 0.6) * s, top: (H - 0.7) * s, width: 1.2 * s, height: 0.55 * s, background: '#5b5550', opacity: 0.85 }} />
      {/* 손님 동선 */}
      {path && <svg width={W * s} height={H * s} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: 'translateZ(1px)' }}><PathArrows path={path} scale={s} /></svg>}
      {/* 물건 그림자 */}
      {boxes.filter((b) => b.kind !== 'mirror').map((b) => (
        <div key={'sh' + b.id} style={{ position: 'absolute', left: (b.x + 0.06) * s, top: (b.y + 0.08) * s, width: b.w * s, height: b.h * s, background: 'rgba(60,40,20,.28)', filter: 'blur(5px)' }} />
      ))}
      {/* 입구 옆 화분 */}
      {[{ x: 0.35, y: H - 0.75 }].map((pl, i) => (
        <div key={'pl' + i} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
          <Cuboid p={{ x: pl.x, y: pl.y, z: 0, w: 0.35, d: 0.35, h: 0.4, side: { background: '#e9e4dc', border: '1px solid rgba(0,0,0,.1)' }, top: { background: '#6b5a48' } }} s={s} />
          {[0, 90].map((r) => (
            <div key={r} style={{ position: 'absolute', left: (pl.x + 0.175) * s, top: (pl.y + 0.175) * s, transformStyle: 'preserve-3d', transform: `translateZ(${0.4 * s}px) rotateZ(${r}deg)` }}>
              <div style={{ position: 'absolute', left: -0.4 * s, top: -0.9 * s, width: 0.8 * s, height: 0.9 * s, transformOrigin: 'bottom', transform: 'rotateX(-90deg)', background: 'radial-gradient(ellipse at 50% 55%, #5f7d55 0 38%, #4d6a45 39% 48%, transparent 50%)' }} />
            </div>
          ))}
        </div>
      ))}
      {/* 입구 */}
      <div style={{ position: 'absolute', left: (W / 2 - DOOR / 2) * s, top: H * s - 3, width: DOOR * s, height: 6, background: '#f6f5f3' }} />
      <div style={{ position: 'absolute', left: (W / 2 - 1) * s, top: H * s + 6, width: 2 * s, textAlign: 'center', fontSize: 11, color: '#4a4a52' }}>입구</div>
      {walls}
      {boxes.map((b) => {
        const pick = b.kind === 'hanger' || b.kind === 'table' || b.kind === 'photo';
        return (
          <div key={b.id} onClick={pick ? () => onPick(b.id) : undefined} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
            {/* 고른 물건은 바닥에 테두리 */}
            {selected === b.id && <div style={{ position: 'absolute', left: (b.x - 0.06) * s, top: (b.y - 0.06) * s, width: (b.w + 0.12) * s, height: (b.h + 0.12) * s, border: '2px solid #111', background: 'rgba(17,17,17,.08)' }} />}
            <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none', cursor: pick ? 'pointer' : undefined }}>
              {partsOf(b, photoOf(b), colorOf(b.brandId)).map((p, i) => <Cuboid key={i} p={p} s={s} hit={pick} />)}
            </div>
          </div>
        );
      })}
      {[...labels.entries()].map(([id, l]) => (
        <div key={'lb' + id} style={{ position: 'absolute', left: Math.min(W - 0.8, Math.max(0.8, l.x / l.n)) * s, top: Math.max(0.9, l.y / l.n) * s, transformStyle: 'preserve-3d', transform: `translateZ(${l.z * s}px) rotateZ(${-angle}deg) rotateX(-55deg)`, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap', background: '#fff', border: '1px solid #111', padding: '2px 6px', fontSize: 10, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, background: colorOf(id), border: '1px solid rgba(0,0,0,.3)' }} />{nameOf(id)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── 평면(끌어서 옮기기) ─────────

function Plan2D({ W, H, boxes, colorOf, initialOf, selected, onPick, onMove, path }: {
  W: number; H: number; boxes: LayoutBox[]; path?: { x: number; y: number }[]; colorOf: (id?: string) => string; initialOf: (id?: string) => string;
  selected: string | null; onPick: (id: string) => void; onMove: (id: string, x: number, y: number, done: boolean) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const scale = 330 / W;
  const toM = (e: React.PointerEvent) => {
    const pt = svg.current!.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: p.x / scale, y: p.y / scale };
  };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return (
    <svg ref={svg} viewBox={`-6 -6 ${W * scale + 12} ${H * scale + 30}`} className="w-full bg-white touch-none select-none" role="img" aria-label="공간 배치 평면도"
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const b = boxes.find((x) => x.id === d.id)!;
        const p = toM(e);
        d.moved = true;
        onMove(d.id, clamp(Math.round((p.x - d.dx) * 10) / 10, 0, W - b.w), clamp(Math.round((p.y - d.dy) * 10) / 10, 0, H - b.h), false);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const b = boxes.find((x) => x.id === d.id)!;
        if (d.moved) onMove(d.id, b.x, b.y, true);
        else onPick(d.id);
      }}
    >
      <rect x={0} y={0} width={W * scale} height={H * scale} fill="#fafafa" stroke="#111" strokeWidth={2} />
      <line x1={(W / 2 - DOOR / 2) * scale} y1={H * scale} x2={(W / 2 + DOOR / 2) * scale} y2={H * scale} stroke="#fafafa" strokeWidth={4} />
      <text x={(W / 2) * scale} y={H * scale + 16} textAnchor="middle" fontSize={11} fill="#5d5d66">입구</text>
      {path && <PathArrows path={path} scale={scale} />}
      {boxes.map((b) => {
        const movable = b.kind === 'hanger' || b.kind === 'table' || b.kind === 'photo';
        return (
          <g key={b.id}
            onPointerDown={movable ? (e) => { (e.target as Element).setPointerCapture?.(e.pointerId); const p = toM(e); drag.current = { id: b.id, dx: p.x - b.x, dy: p.y - b.y, moved: false }; } : undefined}
            style={{ cursor: movable ? 'grab' : undefined }}>
            <rect x={b.x * scale} y={b.y * scale} width={b.w * scale} height={b.h * scale}
              fill={b.kind === 'fit' ? '#fff' : b.kind === 'counter' ? '#e4e4e7' : b.kind === 'mirror' ? '#8e8e96' : b.kind === 'photo' && !b.brandId ? '#e8dfd2' : colorOf(b.brandId)}
              stroke={selected === b.id ? '#111' : b.kind === 'mirror' ? 'none' : '#33333a'} strokeWidth={selected === b.id ? 2.5 : 1} strokeDasharray={b.kind === 'fit' ? '4 3' : undefined} />
            {b.label && <text x={(b.x + b.w / 2) * scale} y={(b.y + b.h / 2) * scale + 4} textAnchor="middle" fontSize={10} fill="#33333a" pointerEvents="none">{b.label}</text>}
            {movable && <text x={(b.x + b.w / 2) * scale} y={(b.y + b.h / 2) * scale + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#33333a" pointerEvents="none">{initialOf(b.brandId)}</text>}
          </g>
        );
      })}
      <text x={W * scale} y={H * scale + 16} textAnchor="end" fontSize={10} fill="#8e8e96">{W}m × {H}m</text>
    </svg>
  );
}

function ToolButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="h-9 px-3 rounded border border-ink-300 text-[13px] font-semibold text-ink-900 whitespace-nowrap disabled:opacity-40">{children}</button>;
}

export function TeamLayoutTab({ team }: { team: Team }) {
  const { db } = useMe();
  const sp = spaceById(db, team.spaceId);
  const area = sp?.areaM2 ?? 33;
  const members: Member[] = team.members.map((m) => ({ brand: brandById(db, m.brandId)!, hangers: Math.max(1, m.hangers), slotLabel: m.slotLabel })).filter((m) => m.brand);
  const auto = useMemo(() => planLayout(area, members, team.round), [area, team.round, JSON.stringify(team.members)]); // eslint-disable-line react-hooks/exhaustive-deps
  const { W, H } = auto;
  const saved = team.layout;
  const [draft, setDraft] = useState<LayoutBox[] | null>(null); // 끄는 중인 배치
  const boxes = draft ?? saved?.boxes ?? auto.boxes;
  const path = saved ? saved.path : auto.path;
  const [view, setView] = useState<'3d' | 'walk' | 'plan'>('3d');
  const [angle, setAngle] = useState(-24);
  const [sel, setSel] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const rot = useRef<{ x: number; a: number; moved: boolean } | null>(null);

  const save = (next: Partial<TeamLayout>) => saveTeamLayout(team.id, { boxes, ...saved, ...next });
  const setBoxes = (next: LayoutBox[]) => save({ boxes: next });
  const selected = boxes.find((b) => b.id === sel);

  const color = (id?: string) => {
    const i = members.findIndex((m) => m.brand.id === id);
    return i >= 0 ? PALETTE[i % PALETTE.length] : '#f4f4f5';
  };
  const nameOf = (id?: string) => members.find((m) => m.brand.id === id)?.brand.name ?? '';
  const initial = (id?: string) => nameOf(id)[0] ?? '';
  const photoOf = (b: LayoutBox) => {
    if (b.photo) return b.photo;
    const br = brandById(db, b.brandId);
    return br && (b.kind === 'hanger' || b.kind === 'table') ? brandCoverSrc(br) : undefined;
  };
  const wallPhoto = saved?.wallPhoto ?? (sp ? spaceSrc(sp, 0, 800) : '');

  const add = (kind: 'hanger' | 'table') => {
    const brandId = selected?.brandId ?? members[0]?.brand.id;
    const b: LayoutBox = kind === 'hanger'
      ? { id: newId('lb'), kind, x: W / 2 - HANGER / 2, y: H - 1.6, w: HANGER, h: DEPTH, brandId }
      : { id: newId('lb'), kind, x: W / 2 - TABLE.w / 2, y: H / 2, w: TABLE.w, h: TABLE.d, brandId };
    setBoxes([...boxes, b]);
    setSel(b.id);
    setView('plan');
  };
  // AI가 물건 개수·위치·포토존·동선까지 정한다. 키가 없거나 결과가 맞지 않으면 규칙 배치로
  const askLayout = async () => {
    setAsking(true);
    const fixed = auto.boxes.filter((b) => b.kind === 'fit' || b.kind === 'mirror' || b.kind === 'counter');
    const r = await askAi<LayoutOut>('layout', {
      공간: { 가로m: W, 세로m: H, 면적: area, 입구: { x: W / 2, y: H, 폭: DOOR } },
      고정물: fixed.map((b) => ({ 이름: b.label ?? '거울', x: b.x, y: b.y, 가로: b.w, 세로: b.h })),
      회차: team.round,
      브랜드: members.map((m) => ({ 이름: m.brand.name, 카테고리: m.brand.tags.categories, 무드: m.brand.tags.moods, 행거수: m.hangers })),
    }, () => ({ items: [], path: [], tips: [] }));
    const fromAi = r.source === 'ai' ? fromAiItems(W, H, fixed, members, r.result) : null;
    if (fromAi) {
      saveTeamLayout(team.id, { boxes: fromAi.boxes, path: fromAi.path, wallPhoto: saved?.wallPhoto, source: 'ai', tips: r.result.tips.length ? r.result.tips : undefined });
    } else {
      // 예시: 회차를 하나 돌린 규칙 배치로 바꿔 보여 준다
      const plan = planLayout(area, members, team.round + (saved?.source === 'example' ? 2 : 1));
      saveTeamLayout(team.id, { boxes: plan.boxes, path: plan.path, wallPhoto: saved?.wallPhoto, source: 'example' });
    }
    setSel(null);
    setAsking(false);
  };

  const aisle = aisleWidth(W, boxes);
  const hangerCount = (id: string) => boxes.filter((b) => b.kind === 'hanger' && b.brandId === id).length;
  const tables = boxes.filter((b) => b.kind === 'table');
  const facing = boxes.find((b) => b.kind === 'hanger' && b.y < 0.3);
  const tips = saved?.tips ?? ([
    facing && `입구 맞은편 벽은 들어오자마자 보이는 자리예요. 지금은 ${nameOf(facing.brandId)} 자리예요.`,
    tables.length > 0 && `${[...new Set(tables.map((t) => nameOf(t.brandId)))].join(', ')}는 가운데 진열대에 두어 손님이 만져 보기 쉬워요.`,
    `통로 폭은 약 ${aisle}m예요. ${aisle < 1.2 ? '1.2m보다 좁아 두 사람이 지나가기 어려워요.' : '두 사람이 엇갈려 지나갈 수 있어요.'}`,
  ].filter(Boolean) as string[]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold">배치</div>
          <div className="text-[12px] text-ink-500">{sp ? `${sp.name} · ${area}㎡` : `공간 확정 전 · ${area}㎡ 기준`}</div>
        </div>
        <div className="flex rounded border border-ink-300 overflow-hidden text-[13px] font-semibold">
          {((hasWebGL ? ['3d', 'walk', 'plan'] : ['3d', 'plan']) as ('3d' | 'walk' | 'plan')[]).map((k) => (
            <button key={k} onClick={() => setView(k)} className={cx('px-3 h-8', view === k ? 'bg-ink-100 text-ink-900' : 'text-ink-500')}>{k === '3d' ? '3D' : k === 'walk' ? '걸어 보기' : '평면'}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 -mx-4 bg-[#f6f5f3] border-y border-ink-100">
        {view !== 'plan' && hasWebGL ? (
          <div className="relative h-[400px]" style={{ background: '#ebe8e3' }}>
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-500">3D 매장을 불러오는 중</div>}>
              <Room3DGL W={W} H={H} boxes={boxes} path={path} wallPhoto={wallPhoto} mode={view === 'walk' ? 'walk' : 'orbit'} colorOf={color} photoOf={photoOf} nameOf={nameOf} selected={sel} onPick={(id) => setSel(sel === id ? null : id)}
                onMove={(id, x, y) => setBoxes(boxes.map((b) => (b.id === id ? { ...b, x, y } : b)))} />
            </Suspense>
            <div className="absolute left-3 bottom-2 text-[11px] text-ink-700 pointer-events-none bg-white/70 px-1.5">{view === 'walk' ? '밀어서 둘러보기 · 바닥을 누르면 걸어가요' : sel ? '고른 물건을 끌어서 옮겨요' : '밀어서 돌리기 · 두 손가락으로 확대 · 물건을 눌러 고르기'}</div>
          </div>
        ) : view !== 'plan' ? (
          <div
            className="relative h-[380px] overflow-hidden touch-none select-none"
            style={{ perspective: 1100, background: 'linear-gradient(#f7f6f4, #ebe9e5)' }}
            onPointerDown={(e) => { rot.current = { x: e.clientX, a: angle, moved: false }; }}
            onPointerMove={(e) => {
              const r = rot.current;
              if (!r) return;
              const dx = e.clientX - r.x;
              if (Math.abs(dx) > 4) r.moved = true;
              setAngle(Math.max(-70, Math.min(70, r.a + dx * 0.4)));
            }}
            onPointerUp={() => { rot.current = null; }}
            onClickCapture={(e) => { if (rot.current?.moved) e.stopPropagation(); }}
          >
            <Room3D W={W} H={H} boxes={boxes} path={path} angle={angle} wallPhoto={wallPhoto} colorOf={color} photoOf={photoOf} nameOf={nameOf} selected={sel} onPick={(id) => setSel(sel === id ? null : id)} />
            <div className="absolute left-3 bottom-2 text-[11px] text-ink-500 pointer-events-none">옆으로 밀어 돌려 보기 · 행거를 눌러 바꾸기</div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <Plan2D W={W} H={H} boxes={boxes} path={path} colorOf={color} initialOf={initial} selected={sel}
              onPick={(id) => setSel(sel === id ? null : id)}
              onMove={(id, x, y, done) => {
                const next = boxes.map((b) => (b.id === id ? { ...b, x, y } : b));
                if (done) { setDraft(null); setBoxes(next); } else setDraft(next);
              }} />
            <div className="text-[11px] text-ink-500 mt-1">행거·진열대를 끌어서 옮겨요</div>
          </div>
        )}
      </div>

      {selected ? (
        <div className="mt-3 rounded border border-ink-900 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">{selected.kind === 'hanger' ? '행거' : selected.kind === 'photo' ? '포토존' : '진열대'} · {nameOf(selected.brandId) || (selected.kind === 'photo' ? '공용' : '빈 자리')}</div>
            <button className="text-[12px] text-ink-500" onClick={() => setSel(null)}>닫기</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {members.map((m) => (
              <button key={m.brand.id} onClick={() => setBoxes(boxes.map((b) => (b.id === selected.id ? { ...b, brandId: m.brand.id, photo: undefined } : b)))}
                className={cx('h-8 px-2.5 rounded border text-[12px] flex items-center gap-1.5', selected.brandId === m.brand.id ? 'border-ink-900 font-bold' : 'border-ink-300')}>
                <span className="w-2.5 h-2.5" style={{ background: color(m.brand.id) }} />{m.brand.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
            <ToolButton onClick={async () => { const [p] = await pickPhotos(1, 600); if (p) setBoxes(boxes.map((b) => (b.id === selected.id ? { ...b, photo: p } : b))); }}>사진 넣기</ToolButton>
            <ToolButton onClick={() => setBoxes(boxes.map((b) => (b.id === selected.id ? { ...b, w: b.h, h: b.w } : b)))}>돌리기</ToolButton>
            <ToolButton onClick={() => { setBoxes(boxes.filter((b) => b.id !== selected.id)); setSel(null); }}>빼기</ToolButton>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          <ToolButton onClick={askLayout} disabled={asking}>{asking ? '배치 받는 중' : 'AI 배치 받기'}</ToolButton>
          <ToolButton onClick={() => add('hanger')}>+ 행거</ToolButton>
          <ToolButton onClick={() => add('table')}>+ 진열대</ToolButton>
          <ToolButton onClick={async () => { const [p] = await pickPhotos(1, 900); if (p) save({ wallPhoto: p }); }}>벽 사진</ToolButton>
          {saved && <ToolButton onClick={() => { saveTeamLayout(team.id, undefined); setSel(null); }}>처음으로</ToolButton>}
        </div>
      )}
      {saved?.source && <div className="mt-2"><AiSource source={saved.source} /></div>}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]">
        {members.map((m) => (
          <span key={m.brand.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-ink-700" style={{ background: color(m.brand.id) }} />
            {m.brand.name} <span className="text-ink-500">{hangerCount(m.brand.id) ? `행거 ${hangerCount(m.brand.id)}` : '진열대'}</span>
          </span>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5">
        {tips.map((t) => <li key={t} className="text-[13px] text-ink-700 flex"><span className="w-1 h-1 bg-ink-900 mt-[8px] mr-2 shrink-0" />{t}</li>)}
      </ul>
    </div>
  );
}

// 공간 배치. 면적과 브랜드별 행거 수로 자동 배치를 만들고, 3D 조감도로 보여 준다.
// 팀이 직접 옮기고(평면), 브랜드를 바꾸고, 사진을 걸 수 있다. 고친 배치는 team.layout에 저장된다.
// 자동 배치: 의류는 벽 행거, 소품은 가운데 진열대, 입구 맞은편 벽은 회차마다 다른 브랜드.
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMe } from '@/store/hooks';
import { brandById, spaceById } from '@/store/logic';
import { saveTeamLayout } from '@/store/actions';
import { askAi, type LayoutOut, type LayoutZone } from '@/store/ai';
import { newId } from '@/store/store';
import { brandCoverSrc, spaceSrc } from '@/data/photos';
import { pickPhotos } from '@/components/photoPick';
import { AiSource, Button, cx } from '@/components/ui';
import type { BrandProfile, LayoutBox, LayoutKind, Team, TeamLayout } from '@/types';

const HANGER = 1.2; // 행거 1개 폭(m)
const DEPTH = 0.5; // 행거 깊이(m)
const FIT = 1.3; // 피팅룸 한 변(m)
const COUNTER = { w: 1.6, d: 0.6 };
const DOOR = 1.4;
const TABLE = { w: 1.1, d: 0.9 };
// 3D에서 물건 높이(m)
const HEIGHT: Record<LayoutKind, number> = { hanger: 1.5, table: 0.8, fit: 2.1, counter: 1.0, mirror: 1.8 };
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

  const back = boxes.find((b) => b.kind === 'hanger' && b.y === 0);
  return { W, H, boxes, overflow, facingBrandId: back?.brandId, wallFree: slots.filter((s) => !s.used).length, tableBrands };
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

/** 직육면체. 바닥 (x, y)에 놓이고 높이 h. 보이지 않는 면은 그리지 않는다(backface hidden) */
function Cuboid({ x, y, w, d, h, s, face, top, onPick, selected }: {
  x: number; y: number; w: number; d: number; h: number; s: number;
  face: CSSProperties; top: CSSProperties; onPick?: () => void; selected?: boolean;
}) {
  const sides = [0, 90, 180, 270].map((k) => {
    const long = k % 180 === 0;
    const L = long ? w : d;
    const half = long ? d / 2 : w / 2;
    // 면마다 밝기를 달리해 입체감을 준다
    const shade = [1, 0.9, 0.82, 0.94][k / 90];
    return (
      <div key={k} style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', transform: `rotateZ(${k}deg) translateY(${half * s}px)` }}>
        <div style={{ ...face, position: 'absolute', left: (-L * s) / 2, top: -h * s, width: L * s, height: h * s, transformOrigin: 'bottom', transform: 'rotateX(-90deg)', backfaceVisibility: 'hidden', filter: `brightness(${shade})`, boxShadow: selected ? 'inset 0 0 0 3px #111' : undefined }} />
      </div>
    );
  });
  return (
    <div onClick={onPick} style={{ position: 'absolute', left: x * s, top: y * s, width: w * s, height: d * s, transformStyle: 'preserve-3d', cursor: onPick ? 'pointer' : undefined }}>
      {sides}
      <div style={{ ...top, position: 'absolute', inset: 0, transform: `translateZ(${h * s}px)`, boxShadow: selected ? 'inset 0 0 0 3px #111' : undefined }} />
    </div>
  );
}

function Room3D({ W, H, boxes, angle, wallPhoto, colorOf, photoOf, nameOf, selected, onPick }: {
  W: number; H: number; boxes: LayoutBox[]; angle: number; wallPhoto: string;
  colorOf: (id?: string) => string; photoOf: (b: LayoutBox) => string | undefined; nameOf: (id?: string) => string;
  selected: string | null; onPick: (id: string) => void;
}) {
  const s = Math.min(300 / W, 230 / H);
  const line = '1px solid rgba(17,17,17,.35)';
  // 안쪽을 향한 벽. 바깥에서 보이는 벽은 그리지 않아 방 안이 들여다보인다
  const walls = [
    { k: 0, L: W, half: H / 2, photo: true },
    { k: -90, L: H, half: W / 2 },
    { k: 90, L: H, half: W / 2 },
  ].map((w) => (
    <div key={w.k} style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', transform: `rotateZ(${w.k}deg) translateY(${-w.half * s}px)` }}>
      <div style={{
        position: 'absolute', left: (-w.L * s) / 2, top: -WALL * s, width: w.L * s, height: WALL * s, transformOrigin: 'bottom', transform: 'rotateX(-90deg)', backfaceVisibility: 'hidden',
        background: w.photo ? `linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.55)), url(${wallPhoto}) center/cover` : '#f1efec',
        borderTop: line, borderLeft: line, borderRight: line,
      }} />
    </div>
  ));
  return (
    <div style={{ position: 'absolute', left: '50%', top: '56%', width: W * s, height: H * s, transformStyle: 'preserve-3d', transform: `translate(-50%, -50%) rotateX(58deg) rotateZ(${angle}deg)` }}>
      <div style={{ position: 'absolute', inset: 0, background: '#e9e4dc', border: '2px solid #33333a' }} />
      {/* 입구 */}
      <div style={{ position: 'absolute', left: (W / 2 - DOOR / 2) * s, top: H * s - 3, width: DOOR * s, height: 6, background: '#fff' }} />
      <div style={{ position: 'absolute', left: (W / 2 - 1) * s, top: H * s + 6, width: 2 * s, textAlign: 'center', fontSize: 11, color: '#5d5d66' }}>입구</div>
      {walls}
      {boxes.map((b) => {
        const photo = photoOf(b);
        const base = b.kind === 'fit' ? 'rgba(255,255,255,.55)' : b.kind === 'counter' ? '#d9d9de' : b.kind === 'mirror' ? '#b9c0c8' : colorOf(b.brandId);
        const face: CSSProperties = { background: photo ? `url(${photo}) center/cover, ${base}` : base, border: b.kind === 'fit' ? '1px dashed #33333a' : '1px solid rgba(17,17,17,.4)' };
        const top: CSSProperties = { background: b.kind === 'table' && photo ? `url(${photo}) center/cover` : base, border: '1px solid rgba(17,17,17,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#33333a', overflow: 'hidden' };
        return (
          <Cuboid key={b.id} x={b.x} y={b.y} w={b.w} d={b.h} h={HEIGHT[b.kind]} s={s} face={face}
            top={top}
            onPick={b.kind === 'hanger' || b.kind === 'table' ? () => onPick(b.id) : undefined} selected={selected === b.id} />
        );
      })}
    </div>
  );
}

// ───────── 평면(끌어서 옮기기) ─────────

function Plan2D({ W, H, boxes, colorOf, initialOf, selected, onPick, onMove }: {
  W: number; H: number; boxes: LayoutBox[]; colorOf: (id?: string) => string; initialOf: (id?: string) => string;
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
      {boxes.map((b) => {
        const movable = b.kind === 'hanger' || b.kind === 'table';
        return (
          <g key={b.id}
            onPointerDown={movable ? (e) => { (e.target as Element).setPointerCapture?.(e.pointerId); const p = toM(e); drag.current = { id: b.id, dx: p.x - b.x, dy: p.y - b.y, moved: false }; } : undefined}
            style={{ cursor: movable ? 'grab' : undefined }}>
            <rect x={b.x * scale} y={b.y * scale} width={b.w * scale} height={b.h * scale}
              fill={b.kind === 'fit' ? '#fff' : b.kind === 'counter' ? '#e4e4e7' : b.kind === 'mirror' ? '#8e8e96' : colorOf(b.brandId)}
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
  const [view, setView] = useState<'3d' | 'plan'>('3d');
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
  const askLayout = async () => {
    setAsking(true);
    const r = await askAi<LayoutOut>('layout', {
      공간: { 가로m: W, 세로m: H, 면적: area }, 회차: team.round,
      브랜드: members.map((m) => ({ 이름: m.brand.name, 카테고리: m.brand.tags.categories, 무드: m.brand.tags.moods, 행거수: m.hangers })),
    }, () => ({
      zones: auto.boxes.filter((b) => b.brandId).map((b) => ({ brand: nameOf(b.brandId), zone: (b.kind === 'table' ? 'center' : b.y === 0 ? 'back' : b.x < W / 2 ? 'left' : 'right') as LayoutZone })),
      tips: [],
    }));
    const zones: Record<string, LayoutZone> = {};
    r.result.zones.forEach((z) => {
      const m = members.find((x) => x.brand.name === z.brand);
      if (m && !zones[m.brand.id]) zones[m.brand.id] = z.zone;
    });
    const plan = planLayout(area, members, team.round, Object.keys(zones).length ? zones : undefined);
    saveTeamLayout(team.id, { boxes: plan.boxes, wallPhoto: saved?.wallPhoto, source: r.source, tips: r.result.tips.length ? r.result.tips : undefined });
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
          {(['3d', 'plan'] as const).map((k) => (
            <button key={k} onClick={() => setView(k)} className={cx('px-3 h-8', view === k ? 'bg-ink-100 text-ink-900' : 'text-ink-500')}>{k === '3d' ? '3D' : '평면'}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 -mx-4 bg-[#f6f5f3] border-y border-ink-100">
        {view === '3d' ? (
          <div
            className="relative h-[340px] overflow-hidden touch-none select-none"
            style={{ perspective: 1100 }}
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
            <Room3D W={W} H={H} boxes={boxes} angle={angle} wallPhoto={wallPhoto} colorOf={color} photoOf={photoOf} nameOf={nameOf} selected={sel} onPick={(id) => setSel(sel === id ? null : id)} />
            <div className="absolute left-3 bottom-2 text-[11px] text-ink-500 pointer-events-none">옆으로 밀어 돌려 보기 · 행거를 눌러 바꾸기</div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <Plan2D W={W} H={H} boxes={boxes} colorOf={color} initialOf={initial} selected={sel}
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
            <div className="text-sm font-bold">{selected.kind === 'hanger' ? '행거' : '진열대'} · {nameOf(selected.brandId) || '빈 자리'}</div>
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

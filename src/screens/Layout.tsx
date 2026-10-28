// 공간 배치 제안. 면적과 브랜드별 행거 수로 평면도를 그린다.
// 의류는 벽 행거, 주얼리·가방·모자 같은 소품은 가운데 진열대로 보내고,
// 입구 맞은편(첫눈에 보이는 벽)은 회차마다 다른 브랜드가 쓰도록 순서를 돌린다.
import { useMemo } from 'react';
import { useMe } from '@/store/hooks';
import { brandById, spaceById } from '@/store/logic';
import type { BrandProfile, Team } from '@/types';

const HANGER = 1.2; // 행거 1개 폭(m)
const DEPTH = 0.5; // 행거 깊이(m)
const FIT = 1.3; // 피팅룸 한 변(m)
const COUNTER = { w: 1.6, d: 0.6 };
const DOOR = 1.4;

type Box = { x: number; y: number; w: number; h: number; brandId?: string; label?: string; kind: 'hanger' | 'table' | 'fit' | 'counter' | 'mirror' };

function isWallCategory(b: BrandProfile, slotLabel: string) {
  return slotLabel.includes('의류') || b.tags.categories.includes('의류');
}

export function planLayout(area: number, members: { brand: BrandProfile; hangers: number; slotLabel: string }[], round: number) {
  // 가로가 조금 긴 직사각형으로 본다
  const W = Math.max(4, Math.round(Math.sqrt(area * 1.4) * 10) / 10);
  const H = Math.max(3.5, Math.round((area / W) * 10) / 10);
  const boxes: Box[] = [
    { kind: 'fit', x: W - FIT, y: 0, w: FIT, h: FIT, label: '피팅룸' },
    { kind: 'mirror', x: W - FIT - 0.15, y: FIT + 0.2, w: 0.1, h: 1.0, label: '' },
    { kind: 'counter', x: W - COUNTER.w - 0.3, y: H - COUNTER.d - 0.2, w: COUNTER.w, h: COUNTER.d, label: '계산대' },
  ];

  // 벽 행거 자리: 왼쪽 벽(아래→위), 뒤 벽(왼→오), 오른쪽 벽(위→아래, 피팅룸과 계산대 사이)
  type Seg = { x: number; y: number; dx: number; dy: number; len: number; facing: boolean };
  const segs: Seg[] = [
    { x: 0, y: H - 0.6, dx: 0, dy: -1, len: H - 0.6 - 0.2, facing: false },
    { x: 0.2 + DEPTH, y: 0, dx: 1, dy: 0, len: W - FIT - 0.4 - DEPTH, facing: true },
    { x: W, y: FIT + 1.4, dx: 0, dy: 1, len: Math.max(0, H - COUNTER.d - 0.2 - (FIT + 1.4) - 0.3), facing: false },
  ];
  const slots: { x: number; y: number; w: number; h: number; facing: boolean }[] = [];
  segs.forEach((s) => {
    const n = Math.floor(s.len / HANGER);
    for (let i = 0; i < n; i++) {
      const p = i * HANGER;
      if (s.dx) slots.push({ x: s.x + p, y: s.y, w: HANGER, h: DEPTH, facing: s.facing });
      else if (s.dy < 0) slots.push({ x: s.x, y: s.y - p - HANGER, w: DEPTH, h: HANGER, facing: s.facing });
      else slots.push({ x: s.x - DEPTH, y: s.y + p, w: DEPTH, h: HANGER, facing: s.facing });
    }
  });

  // 의류 브랜드 순서를 회차만큼 돌려서 맞은편 벽을 번갈아 쓴다
  const wall = members.filter((m) => isWallCategory(m.brand, m.slotLabel));
  const small = members.filter((m) => !isWallCategory(m.brand, m.slotLabel));
  const k = wall.length ? (round - 1) % wall.length : 0;
  const wallOrder = [...wall.slice(k), ...wall.slice(0, k)];
  // 맞은편 벽(뒤 벽) 칸을 먼저 쓰도록 정렬: 뒤 벽 → 왼쪽 → 오른쪽
  const ordered = [...slots.filter((s) => s.facing), ...slots.filter((s) => !s.facing)];
  let si = 0;
  const overflow: { brand: BrandProfile; n: number }[] = [];
  wallOrder.forEach((m) => {
    let left = 0;
    for (let i = 0; i < m.hangers; i++) {
      const s = ordered[si++];
      if (!s) { left++; continue; }
      boxes.push({ kind: 'hanger', ...s, brandId: m.brand.id });
    }
    if (left) overflow.push({ brand: m.brand, n: left });
  });

  // 가운데 진열대: 소품 브랜드 + 벽에 못 들어간 행거
  const tableBrands = [...small.map((m) => m.brand), ...overflow.map((o) => o.brand)];
  const tw = Math.min(2.4, W - 2 * (DEPTH + 1.2));
  const th = 0.9;
  tableBrands.forEach((b, i) => {
    const cols = Math.min(2, tableBrands.length);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cw = tw / cols - 0.2;
    boxes.push({ kind: 'table', x: (W - tw) / 2 + col * (cw + 0.4), y: H / 2 - th - 0.1 + row * (th + 0.4), w: cw, h: th, brandId: b.id });
  });

  const usedWall = Math.min(si, ordered.length) * HANGER;
  const aisle = Math.round((W - 2 * DEPTH - tw) / 2 * 10) / 10;
  return { W, H, boxes, overflow, facingBrand: wallOrder[0]?.brand, wallFree: Math.max(0, ordered.length - si), usedWall, aisle, tableBrands };
}

export function TeamLayoutTab({ team }: { team: Team }) {
  const { db } = useMe();
  const sp = spaceById(db, team.spaceId);
  const area = sp?.areaM2 ?? 33;
  const members = team.members.map((m) => ({ brand: brandById(db, m.brandId)!, hangers: Math.max(1, m.hangers), slotLabel: m.slotLabel })).filter((m) => m.brand);
  const plan = useMemo(() => planLayout(area, members, team.round), [area, team.round, JSON.stringify(team.members)]); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = 330 / plan.W;
  // 브랜드끼리 잘 구분되는 옅은 색
  const PALETTE = ['#cdd9ea', '#ecd5c3', '#d3e4cd', '#e7d0e2', '#ece2b8', '#cfe6e6'];
  const color = (id?: string) => {
    const i = members.findIndex((m) => m.brand.id === id);
    return i >= 0 ? PALETTE[i % PALETTE.length] : '#f4f4f5';
  };
  const initial = (id?: string) => members.find((m) => m.brand.id === id)?.brand.name[0] ?? '';
  const tips = [
    plan.facingBrand && `입구 맞은편 벽은 들어오자마자 보이는 자리예요. 이번 ${team.round}회차는 ${plan.facingBrand.name} 차례이고, 다음 회차엔 다음 브랜드로 돌아가요.`,
    plan.tableBrands.length > 0 && `${plan.tableBrands.map((b) => b.name).join(', ')}는 가운데 진열대에 두어 손님이 만져 보기 쉽게 했어요.`,
    plan.overflow.length > 0 && `벽이 모자라 ${plan.overflow.map((o) => `${o.brand.name} ${o.n}개`).join(', ')}는 가운데로 옮겼어요. 행거 수를 줄이거나 더 넓은 공간을 고려해 보세요.`,
    `통로 폭은 약 ${plan.aisle}m예요. ${plan.aisle < 1.2 ? '1.2m보다 좁아 두 사람이 지나가기 어려워요. 가운데 진열대를 줄여 보세요.' : '두 사람이 엇갈려 지나갈 수 있어요.'}`,
    '피팅룸 앞에 거울을 두고, 계산대는 입구 옆에 두어 나가는 동선에서 결제하게 했어요.',
    plan.wallFree > 0 && `벽에 행거 ${plan.wallFree}개 자리가 남아요. 포토존이나 공용 디스플레이로 쓰기 좋아요.`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="font-bold">배치 제안</div>
        <div className="text-[12px] text-ink-500">{sp ? `${sp.name} · ${area}㎡` : `공간 확정 전 · ${area}㎡ 기준 예시`}</div>
      </div>
      <div className="text-[12px] text-ink-500 mt-0.5">면적과 브랜드별 행거 수로 그린 평면도예요. 실측과 다를 수 있어 현장에서 조정해 주세요</div>

      <svg viewBox={`-6 -6 ${plan.W * scale + 12} ${plan.H * scale + 30}`} className="w-full mt-3 bg-white" role="img" aria-label="공간 배치 평면도">
        <rect x={0} y={0} width={plan.W * scale} height={plan.H * scale} fill="#fafafa" stroke="#111" strokeWidth={2} />
        {/* 입구 */}
        <line x1={(plan.W / 2 - DOOR / 2) * scale} y1={plan.H * scale} x2={(plan.W / 2 + DOOR / 2) * scale} y2={plan.H * scale} stroke="#fafafa" strokeWidth={4} />
        <text x={(plan.W / 2) * scale} y={plan.H * scale + 16} textAnchor="middle" fontSize={11} fill="#5d5d66">입구</text>
        {plan.boxes.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x * scale} y={b.y * scale} width={b.w * scale} height={b.h * scale}
              fill={b.kind === 'fit' ? '#fff' : b.kind === 'counter' ? '#e4e4e7' : b.kind === 'mirror' ? '#8e8e96' : color(b.brandId)}
              stroke={b.kind === 'mirror' ? 'none' : '#33333a'} strokeWidth={1} strokeDasharray={b.kind === 'fit' ? '4 3' : undefined}
            />
            {b.label && <text x={(b.x + b.w / 2) * scale} y={(b.y + b.h / 2) * scale + 4} textAnchor="middle" fontSize={10} fill="#33333a">{b.label}</text>}
            {(b.kind === 'table' || b.kind === 'hanger') && <text x={(b.x + b.w / 2) * scale} y={(b.y + b.h / 2) * scale + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#33333a">{initial(b.brandId)}</text>}
          </g>
        ))}
        <text x={plan.W * scale} y={plan.H * scale + 16} textAnchor="end" fontSize={10} fill="#8e8e96">{plan.W}m × {plan.H}m</text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]">
        {members.map((m) => (
          <span key={m.brand.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-ink-700" style={{ background: color(m.brand.id) }} />
            {m.brand.name} <span className="text-ink-500">{plan.tableBrands.some((b) => b.id === m.brand.id) ? '진열대' : `행거 ${m.hangers}`}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 font-bold text-sm">이렇게 배치했어요</div>
      <ul className="mt-2 space-y-1.5">
        {tips.map((t) => <li key={t} className="text-[13px] text-ink-700 flex"><span className="w-1 h-1 bg-ink-900 mt-[8px] mr-2 shrink-0" />{t}</li>)}
      </ul>
    </div>
  );
}

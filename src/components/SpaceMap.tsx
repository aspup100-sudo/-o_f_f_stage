// 공간 탭 상단 지도: 지역별 공간 수를 말풍선(숫자 + 지역 이름)으로 보여 준다.
// 카카오맵 키가 있으면 실제 지도를, 없으면 한강이 그려진 간략 지도를 쓴다.
import { useMemo } from 'react';
import { navigate } from '@/store/store';
import { spaceLatLng } from '@/store/logic';
import { REGIONS, REGION_CENTER, type Region, type Space } from '@/types';
import { cx } from './ui';
import { KakaoMap, type MapPin } from './KakaoMap';

// 간략 지도의 위경도 범위 (서울 중심부)
const LNG: [number, number] = [126.86, 127.1];
const LAT: [number, number] = [37.6, 37.5];
const at = ([lat, lng]: [number, number]) => ({ left: `${((lng - LNG[0]) / (LNG[1] - LNG[0])) * 100}%`, top: `${((lat - LAT[0]) / (LAT[1] - LAT[0])) * 100}%` });

function Bubble({ label, count, active, style, onClick }: { label: string; count: number; active: boolean; style: React.CSSProperties; onClick: () => void }) {
  const empty = count === 0;
  return (
    <button type="button" onClick={onClick} style={style} className="absolute -translate-y-1/2 -translate-x-4 flex items-center" aria-label={`${label} 공간 ${count}곳`} aria-pressed={active}>
      <span className={cx('relative z-10 w-9 h-9 rounded-full text-white text-[15px] font-extrabold flex items-center justify-center border-2 border-white shadow', active ? 'bg-ink-900' : empty ? 'bg-ink-300' : 'bg-brand-600')}>{count}</span>
      <span className={cx('-ml-3 pl-4 pr-2.5 h-6 rounded-full text-white text-[12px] font-bold whitespace-nowrap flex items-center shadow', active ? 'bg-ink-900' : empty ? 'bg-ink-400' : 'bg-brand-700')}>{label}</span>
    </button>
  );
}

/** 카카오맵이 없을 때 쓰는 간략 지도. 위치만 가늠할 수 있게 한강과 지역 위치를 그린다 */
function SimpleMap({ counts, selected, onPick }: { counts: Record<Region, number>; selected: Region | null; onPick: (r: Region | null) => void }) {
  return (
    <div className="relative w-full h-full bg-[#f1efec] overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
        <path d="M0 50 C14 58 28 62 38 76 S58 86 72 72 S90 60 100 64" fill="none" stroke="#cfe0ee" strokeWidth="9" strokeLinecap="round" />
        <path d="M0 50 C14 58 28 62 38 76 S58 86 72 72 S90 60 100 64" fill="none" stroke="#e6eff6" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="absolute text-[11px] font-semibold text-[#7ea3c2]" style={{ left: '40%', top: '84%' }}>한강</span>
      {REGIONS.map((r) => (
        <Bubble key={r} label={r} count={counts[r]} active={selected === r} style={at(REGION_CENTER[r])} onClick={() => onPick(selected === r ? null : r)} />
      ))}
    </div>
  );
}

export function SpaceMap({ counts, selected, onPick, spaces, className }: { counts: Record<Region, number>; selected: Region | null; onPick: (r: Region | null) => void; spaces: Space[]; className?: string }) {
  const pins = useMemo<MapPin[]>(() => {
    const clusters: MapPin[] = REGIONS.map((r) => ({ id: `r:${r}`, lat: REGION_CENTER[r][0], lng: REGION_CENTER[r][1], label: r, tone: 'cluster', count: counts[r], active: selected === r }));
    // 지역을 고르면 그 지역 공간은 개별 위치도 함께 보여 준다
    const own: MapPin[] = selected ? spaces.filter((s) => s.region === selected).map((s) => { const [lat, lng] = spaceLatLng(s); return { id: `s:${s.id}`, lat, lng, label: s.name, tone: 'live' as const }; }) : [];
    return [...clusters, ...own];
  }, [counts, selected, spaces]);
  const pick = useMemo(() => (id: string) => {
    if (id.startsWith('s:')) navigate({ name: 'space', id: id.slice(2) });
    else { const r = id.slice(2) as Region; onPick(selected === r ? null : r); }
  }, [onPick, selected]);
  return (
    <KakaoMap
      pins={pins}
      onSelect={pick}
      className={cx('w-full overflow-hidden border border-ink-300', className)}
      fallback={<div className={cx('w-full overflow-hidden border border-ink-300', className)}><SimpleMap counts={counts} selected={selected} onPick={onPick} /></div>}
    />
  );
}

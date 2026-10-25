// 여러 화면에서 쓰는 도메인 컴포넌트
import type { BrandProfile, Popup, ThemeTags } from '@/types';
import { AGE_GROUPS, CATEGORIES, MOODS, PRICE_RANGES } from '@/types';
import type { DB } from '@/data/mock';
import { brandById, daysUntil, period, spaceById, teamById, trustScore, waitCount } from '@/store/logic';
import { DEMO_TODAY } from '@/data/mock';
import { navigate } from '@/store/store';
import { Avatar, Card, Chip, cx, GradeBadge, Icon, StatusPill, Swatch, Tag } from './ui';
import { toast } from '@/store/store';

export function TrustLine({ db, subjectId, compact }: { db: DB; subjectId: string; compact?: boolean }) {
  const t = trustScore(db, subjectId);
  return (
    <div className={cx('flex items-center gap-1.5 flex-wrap', compact ? 'text-[11px]' : 'text-xs')}>
      <GradeBadge grade={t.grade} small={compact} />
      <span className="text-ink-700">
        인증 공동 팝업 {t.verifiedPopups}회{t.avgRating !== null && <> · 평균 {t.avgRating.toFixed(1)}</>}
      </span>
    </div>
  );
}

export function ThemeTagList({ tags, limit }: { tags: ThemeTags; limit?: number }) {
  const all = [
    ...tags.moods.map((m) => ({ t: `#${m}`, tone: 'orange' as const })),
    ...tags.categories.map((c) => ({ t: c, tone: 'gray' as const })),
    { t: tags.price, tone: 'blue' as const },
    ...tags.ages.map((a) => ({ t: a, tone: 'purple' as const })),
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {(limit ? all.slice(0, limit) : all).map((x) => (
        <Tag key={x.t} tone={x.tone}>{x.t}</Tag>
      ))}
    </div>
  );
}

export function BrandLogo({ brand, size = 40 }: { brand: BrandProfile; size?: number }) {
  return <Avatar name={brand.name} hue={brand.logoHue} size={size} />;
}

export function BrandCard({ db, brand, right, reasons, compact }: { db: DB; brand: BrandProfile; right?: React.ReactNode; reasons?: string[]; compact?: boolean }) {
  const imgs = brand.lookbook.slice(0, 3).map((id) => db.lookbookImages.find((i) => i.id === id)!).filter(Boolean);
  if (compact) {
    // 목록용: 룩북 한 장 + 핵심 정보 한 줄씩
    const im = imgs[0];
    return (
      <div className="flex gap-3 py-3">
        <button onClick={() => navigate({ name: 'brand', id: brand.id })} className="w-[84px] h-[104px] shrink-0 rounded-xl overflow-hidden">
          {im ? <Swatch hue={im.hue} pattern={im.pattern} rounded="" className="w-full h-full" /> : <Swatch hue={brand.logoHue} rounded="" className="w-full h-full" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <button className="flex-1 min-w-0 text-left" onClick={() => navigate({ name: 'brand', id: brand.id })}>
              <div className="font-bold text-[15px] truncate">{brand.name}</div>
              <TrustLine db={db} subjectId={brand.id} compact />
            </button>
            {right}
          </div>
          <p className="text-[13px] text-ink-700 mt-1 line-clamp-1">{brand.intro}</p>
          <div className="mt-1.5">
            <ThemeTagList tags={brand.tags} limit={3} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <Card className="overflow-hidden">
      <button className="w-full text-left" onClick={() => navigate({ name: 'brand', id: brand.id })}>
        <div className="grid grid-cols-3 gap-0.5 h-36">
          {imgs.length ? (
            imgs.map((im, i) => <Swatch key={im.id} hue={im.hue} pattern={im.pattern} label={i === 0 ? im.label : undefined} rounded="" className="h-full" />)
          ) : (
            <Swatch hue={brand.logoHue} className="col-span-3 h-full" rounded="" label="룩북 준비 중" />
          )}
        </div>
      </button>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <BrandLogo brand={brand} size={36} />
          <button className="flex-1 min-w-0 text-left" onClick={() => navigate({ name: 'brand', id: brand.id })}>
            <div className="font-bold text-[15px] truncate">{brand.name}</div>
            <TrustLine db={db} subjectId={brand.id} compact />
          </button>
          {right}
        </div>
        <p className="text-[13px] text-ink-700 mt-2 line-clamp-2">{brand.intro}</p>
        <div className="mt-2">
          <ThemeTagList tags={brand.tags} limit={6} />
        </div>
        {reasons && reasons.length > 0 && (
          <div className="mt-2.5 rounded-lg bg-brand-50 px-2.5 py-2 text-[12px] text-brand-700 space-y-0.5">
            {reasons.slice(0, 3).map((r) => (
              <div key={r}>✓ {r}</div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/** 선택지에서만 고르는 테마 태그 입력 */
export function TagPicker({ value, onChange }: { value: ThemeTags; onChange: (t: ThemeTags) => void }) {
  const toggle = <T extends string>(arr: T[], v: T, max?: number): T[] => {
    if (arr.includes(v)) return arr.filter((x) => x !== v);
    if (max && arr.length >= max) {
      toast(`최대 ${max}개까지 고를 수 있어요`);
      return arr;
    }
    return [...arr, v];
  };
  const Group = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <div className="text-[13px] font-semibold mb-1.5">
        {title} <span className="text-ink-500 font-normal text-[11px]">{sub}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
  return (
    <div>
      <Group title="무드" sub={`최대 3개 · ${value.moods.length}/3`}>
        {MOODS.map((m) => <Chip key={m} active={value.moods.includes(m)} onClick={() => onChange({ ...value, moods: toggle(value.moods, m, 3) })}>{m}</Chip>)}
      </Group>
      <Group title="카테고리" sub="1개 이상">
        {CATEGORIES.map((c) => <Chip key={c} active={value.categories.includes(c)} onClick={() => onChange({ ...value, categories: toggle(value.categories, c) })}>{c}</Chip>)}
      </Group>
      <Group title="가격대" sub="1개">
        {PRICE_RANGES.map((p) => <Chip key={p} active={value.price === p} onClick={() => onChange({ ...value, price: p })}>{p}</Chip>)}
      </Group>
      <Group title="주 고객 연령" sub={`최대 2개 · ${value.ages.length}/2`}>
        {AGE_GROUPS.map((a) => <Chip key={a} active={value.ages.includes(a)} onClick={() => onChange({ ...value, ages: toggle(value.ages, a, 2) })}>{a}</Chip>)}
      </Group>
    </div>
  );
}

export function PopupBannerCard({ db, popup, wide }: { db: DB; popup: Popup; wide?: boolean }) {
  const team = teamById(db, popup.teamId);
  const space = spaceById(db, popup.spaceId);
  const brands = team?.members.map((m) => brandById(db, m.brandId)!).filter(Boolean) ?? [];
  return (
    <button onClick={() => navigate({ name: 'popup', id: popup.id })} className={cx('text-left shrink-0 rounded-2xl overflow-hidden bg-ink-900 text-white relative', wide ? 'w-full' : 'w-[280px]')}>
      <div className="flex h-24">
        {brands.slice(0, 4).map((b) => (
          <Swatch key={b.id} hue={b.logoHue} pattern="stripe" rounded="" className="flex-1 opacity-90" />
        ))}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <StatusPill status={popup.status} />
          <span className="text-[11px] text-white/70">{period(popup.period)} · {space?.region}</span>
        </div>
        <div className="font-bold text-[15px]">{popup.title}</div>
        <div className="text-[12px] text-white/70 mt-0.5 truncate">{brands.map((b) => b.name).join(' × ')}</div>
        {popup.status === '예정' && waitCount(popup) > 0 && <div className="text-[11px] text-brand-200 mt-1.5 font-semibold">🔔 {waitCount(popup)}명이 오픈을 기다려요</div>}
        {popup.status === '진행 중' && (() => {
          const n = db.visits.filter((v) => v.popupId === popup.id).length;
          const end = popup.period.end === DEMO_TODAY ? '오늘 마지막 날' : `${daysUntil(popup.period.end)}일 남음`;
          return <div className="text-[11px] text-brand-200 mt-1.5 font-semibold">⏳ {end}{n > 0 ? ` · ${n}명 방문 인증` : ''}</div>;
        })()}
      </div>
    </button>
  );
}

export function LookbookGrid({ db, ids, onPick, picked }: { db: DB; ids: string[]; onPick?: (id: string) => void; picked?: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {ids.map((id) => {
        const im = db.lookbookImages.find((i) => i.id === id);
        if (!im) return null;
        const on = picked?.includes(id);
        return (
          <button key={id} onClick={() => onPick?.(id)} disabled={!onPick} className="relative aspect-square">
            <Swatch hue={im.hue} pattern={im.pattern} label={im.label} className="w-full h-full" rounded="rounded-lg" />
            {im.fromInstagram && <span className="absolute top-1 right-1 text-[9px] bg-white/85 rounded px-1">IG</span>}
            {on && (
              <span className="absolute inset-0 rounded-lg ring-4 ring-brand-500 ring-inset flex items-start justify-start p-1">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                  <Icon name="check" className="w-3.5 h-3.5" />
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ScreenTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-2 flex items-center justify-between">
      <h1 className="text-xl font-extrabold">{children}</h1>
      {right}
    </div>
  );
}

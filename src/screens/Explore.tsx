import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { isListedBrand, josa, recommendations } from '@/store/logic';
import { BrandCard, PopupBannerCard } from '@/components/common';
import { Chip, cx, Empty, Sheet, Button, Icon, Tag } from '@/components/ui';
import { CATEGORIES, MOODS, PRICE_RANGES, type Category, type Mood, type PriceRange } from '@/types';
import { BrandActions } from './BrandActions';
import { ShowcaseList } from './Showcase';
import { QnaList } from './Qna';
import { MagazineList, MagazineThumb } from './Magazine';
import { TodayBrand, TodayLandlord, TodayRental, TodayVisitor } from './Today';

type View = 'brand' | 'magazine' | 'showcase' | 'qna';

export default function Explore() {
  const [view, setView] = useState<View>('brand');
  return (
    <div>
      <div className="sticky top-14 z-20 bg-white px-4 flex gap-5 border-b border-ink-100">
        {([{ key: 'brand', label: '홈' }, { key: 'magazine', label: '매거진' }, { key: 'showcase', label: '팝업자랑' }, { key: 'qna', label: 'Q&A' }] as { key: View; label: string }[]).map((it) => (
          <button
            key={it.key}
            onClick={() => { setView(it.key); window.scrollTo?.(0, 0); }}
            className={cx('h-11 text-[16px] font-extrabold border-b-2 -mb-px', view === it.key ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-300')}
          >
            {it.label}
          </button>
        ))}
      </div>
      {view === 'brand' && <BrandFeed onMore={() => setView('magazine')} />}
      {view === 'magazine' && <MagazineList />}
      {view === 'showcase' && <ShowcaseList />}
      {view === 'qna' && <QnaList />}
    </div>
  );
}

function BrandFeed({ onMore }: { onMore: () => void }) {
  const { db, brand, role } = useMe();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [price, setPrice] = useState<PriceRange | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const popups = db.popups.filter((p) => p.status !== '종료');
  const recs = brand ? recommendations(db, brand, 5) : [];
  const list = db.brands
    .filter((b) => isListedBrand(db, b) && b.id !== brand?.id)
    .filter((b) => !moods.length || b.tags.moods.some((m) => moods.includes(m)))
    .filter((b) => !cats.length || b.tags.categories.some((c) => cats.includes(c)))
    .filter((b) => !price || b.tags.price === price);
  const filterCount = moods.length + cats.length + (price ? 1 : 0);

  return (
    <div>
      {role === 'brand' && <TodayBrand />}
      {role === 'visitor' && <TodayVisitor />}
      {role === 'landlord' && <TodayLandlord />}
      {role === 'rental' && <TodayRental />}
      <section className="pt-6">
        <div className="px-4 flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-[15px]">진행 중·예정 공동 팝업</h2>
          <span className="text-xs text-ink-500">{popups.length}곳</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
          {popups.map((p) => (
            <PopupBannerCard key={p.id} db={db} popup={p} />
          ))}
        </div>
      </section>

      <section className="pt-6">
        <div className="px-4 flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-[15px]">매거진 · 팝업 트렌드</h2>
          <button onClick={onMore} className="text-xs text-ink-500">전체 보기 ›</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
          {db.magazines.filter((m) => !m.hidden).slice(0, 4).map((m) => <MagazineThumb key={m.id} post={m} />)}
        </div>
      </section>

      {brand && recs.length > 0 && (
        <section className="pt-6">
          <div className="px-4 mb-2.5">
            <h2 className="font-bold text-[15px]">
              <span className="text-brand-500">{brand.name}</span>{josa(brand.name, '과', '와').slice(brand.name.length)} 잘 맞는 브랜드
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">무드·가격대·고객층은 비슷하고, 카테고리는 다를수록 잘 맞아요</p>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
            {recs.map((r) => (
              <div key={r.brand.id} className="w-[290px] shrink-0">
                <BrandCard db={db} brand={r.brand} reasons={r.reasons} right={<BrandActions brandId={r.brand.id} />} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pt-6 px-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-[15px]">브랜드 둘러보기</h2>
          <button onClick={() => setFilterOpen(true)} className="flex items-center gap-1 text-sm font-semibold">
            <Icon name="search" className="w-4 h-4" /> 필터{filterCount > 0 && <span className="text-brand-500">{filterCount}</span>}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4">
          <Chip active={!filterCount} onClick={() => { setMoods([]); setCats([]); setPrice(null); }}>전체</Chip>
          {MOODS.map((m) => (
            <Chip key={m} active={moods.includes(m)} onClick={() => setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])}>#{m}</Chip>
          ))}
        </div>
        {(cats.length > 0 || price) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cats.map((c) => <Tag key={c}>{c}</Tag>)}
            {price && <Tag tone="blue">{price}</Tag>}
          </div>
        )}
        <div className="rounded-2xl bg-white px-3.5 divide-y divide-ink-100">
          {(showAll ? list : list.slice(0, 6)).map((b) => (
            <BrandCard key={b.id} compact db={db} brand={b} right={<BrandActions brandId={b.id} />} />
          ))}
          {!list.length && <Empty icon="search">조건에 맞는 브랜드가 없어요</Empty>}
        </div>
        {!showAll && list.length > 6 && (
          <button onClick={() => setShowAll(true)} className="w-full h-11 mt-3 rounded-xl border border-ink-200 bg-white text-sm font-semibold">
            브랜드 {list.length - 6}곳 더 보기
          </button>
        )}
        <div className="h-6" />
      </section>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="필터">
        <div className="text-[13px] font-semibold mb-2">무드</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {MOODS.map((m) => <Chip key={m} active={moods.includes(m)} onClick={() => setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])}>{m}</Chip>)}
        </div>
        <div className="text-[13px] font-semibold mb-2">카테고리</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CATEGORIES.map((c) => <Chip key={c} active={cats.includes(c)} onClick={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])}>{c}</Chip>)}
        </div>
        <div className="text-[13px] font-semibold mb-2">가격대</div>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {PRICE_RANGES.map((p) => <Chip key={p} active={price === p} onClick={() => setPrice(price === p ? null : p)}>{p}</Chip>)}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setMoods([]); setCats([]); setPrice(null); }}>초기화</Button>
          <Button full onClick={() => setFilterOpen(false)}>{list.length}개 브랜드 보기</Button>
        </div>
      </Sheet>
    </div>
  );
}

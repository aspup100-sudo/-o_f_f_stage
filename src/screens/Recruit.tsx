import { useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { navigate } from '@/store/store';
import { applyRecruitment, createRecruitment, decideApplication, simulateApplicants, type RecruitDraft } from '@/store/actions';
import { brandById, manwon, period, slotShare, spaceById } from '@/store/logic';
import { BrandLogo, ScreenTitle, ThemeTagList, TrustLine } from '@/components/common';
import { Button, Card, Chip, cx, Demo, Empty, Field, inputCls, Segmented, Sheet, StatusPill, SubHeader, Tag, textareaCls } from '@/components/ui';
import { CATEGORIES, REGIONS, type Category, type Recruitment, type RecruitStatus, type Region, type SlotStatus } from '@/types';
import type { DB } from '@/data/mock';
import { ProposeSpaceButton } from './SpaceLandlord';

const SLOT_STYLE: Record<SlotStatus, string> = {
  모집자: 'bg-ink-900 text-white border-ink-900',
  확정: 'bg-emerald-500 text-white border-emerald-500',
  '협의 중': 'bg-amber-100 text-amber-800 border-amber-300',
  '비어 있음': 'bg-white text-ink-500 border-dashed border-ink-300',
};

export function RecruitCard({ db, r }: { db: DB; r: Recruitment }) {
  const host = brandById(db, r.hostBrandId)!;
  const empty = r.slots.filter((s) => s.status === '비어 있음').length;
  const share = slotShare(r.totalBudget, r.slots, 1, r.slotMode);
  const sp = spaceById(db, r.spaceId);
  return (
    <Card className="p-4" onClick={() => navigate({ name: 'recruit', id: r.id })}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusPill status={r.status} />
        <Tag>{r.slotMode === 'hanger' ? '행거 단위' : '카테고리 슬롯'}</Tag>
        {r.spaceConfirmed && <Tag tone="green">공간 확정</Tag>}
      </div>
      <div className="font-bold text-[15px] leading-snug">{r.title}</div>
      <div className="text-[13px] text-ink-500 mt-1">📍 {r.region}{sp ? ` · ${sp.name}` : ''} · 📅 {period(r.period)}</div>
      <div className="flex items-center gap-1 mt-2.5">
        {r.slots.map((s) => (
          <span key={s.id} className={cx('h-2 flex-1 rounded-full border', SLOT_STYLE[s.status])} />
        ))}
      </div>
      <div className="flex items-end justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          <BrandLogo brand={host} size={22} />
          <span className="text-[13px] font-medium">{host.name}</span>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-ink-500">{r.slotMode === 'hanger' ? '행거 1개' : '1자리'} 분담금</div>
          <div className="font-extrabold text-brand-600">{manwon(share)}</div>
        </div>
      </div>
      <div className="text-[12px] text-ink-700 mt-1">남은 자리 <b>{empty}</b> / {r.slots.length}</div>
    </Card>
  );
}

export function RecruitsTab() {
  const { db } = useMe();
  const [st, setSt] = useState<RecruitStatus | '전체'>('전체');
  const [region, setRegion] = useState<Region | '전체'>('전체');
  const list = db.recruitments.filter((r) => (st === '전체' || r.status === st) && (region === '전체' || r.region === region));
  return (
    <div>
      <ScreenTitle right={<Button size="sm" onClick={() => guard(() => navigate({ name: 'recruitNew' }))}>+ 모집글 쓰기</Button>}>같이 열기</ScreenTitle>
      <p className="px-4 text-[13px] text-ink-500 -mt-1 mb-2">함께 팝업을 열 팀원을 모아요. 정원이 차면 자동으로 팀이 만들어져요.</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2">
        {(['전체', '모집 중', '협의 중', '마감'] as const).map((s) => <Chip key={s} active={st === s} onClick={() => setSt(s)}>{s}</Chip>)}
        <span className="w-px bg-ink-300 mx-1" />
        {(['전체', ...REGIONS] as const).map((r) => <Chip key={'r' + r} active={region === r} onClick={() => setRegion(r)}>{r === '전체' ? '모든 지역' : r}</Chip>)}
      </div>
      <div className="px-4 space-y-3 mt-2">
        {list.map((r) => <RecruitCard key={r.id} db={db} r={r} />)}
        {!list.length && <Empty>조건에 맞는 모집글이 없어요</Empty>}
      </div>
    </div>
  );
}

export function RecruitDetail({ id }: { id: string }) {
  const { db, brand, role } = useMe();
  const r = db.recruitments.find((x) => x.id === id);
  const [applyOpen, setApplyOpen] = useState(false);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  if (!r) return <Empty>모집글을 찾을 수 없어요</Empty>;
  const host = brandById(db, r.hostBrandId)!;
  const isHost = brand?.id === r.hostBrandId;
  const sp = spaceById(db, r.spaceId);
  const apps = db.recruitApplications.filter((a) => a.recruitmentId === r.id);
  const myApp = brand && apps.find((a) => a.brandId === brand.id && a.status !== 'rejected');
  const inSlot = brand && r.slots.some((s) => s.brandId === brand.id);
  const empties = r.slots.filter((s) => s.status === '비어 있음');
  const totalHangers = r.slots.reduce((s, x) => s + x.hangers, 0);

  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="모집글" />
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <StatusPill status={r.status} />
          <Tag>{r.slotMode === 'hanger' ? '행거 단위' : '카테고리 슬롯'}</Tag>
        </div>
        <h1 className="text-xl font-extrabold leading-snug">{r.title}</h1>
        <p className="text-sm text-ink-700 mt-2 leading-relaxed">{r.intro}</p>
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <Info label="희망 지역" value={r.region} />
          <Info label="일정" value={period(r.period)} />
          <Info label="총 예산" value={manwon(r.totalBudget)} />
          <Info label={r.slotMode === 'hanger' ? '행거 1개 분담금' : '1자리 분담금'} value={manwon(slotShare(r.totalBudget, r.slots, 1, r.slotMode))} accent />
        </div>
        <div className="mt-3 rounded-xl border border-ink-100 p-3 text-sm">
          <div className="text-[12px] text-ink-500 mb-0.5">공간</div>
          {r.spaceConfirmed && sp ? (
            <button className="font-semibold underline underline-offset-2" onClick={() => navigate({ name: 'space', id: sp.id })}>✅ 확정: {sp.name} ›</button>
          ) : (
            <span className="font-semibold">아직 미정 · 팀이 꾸려지면 함께 찾아요</span>
          )}
        </div>

        <h3 className="font-bold mt-6 mb-2">자리 구성 <span className="text-ink-500 text-sm font-normal">{r.slots.length - empties.length}/{r.slots.length}</span></h3>
        <div className={cx('grid gap-2', r.slotMode === 'hanger' ? 'grid-cols-3' : 'grid-cols-2')}>
          {r.slots.map((s) => {
            const b = brandById(db, s.brandId);
            return (
              <div key={s.id} className={cx('rounded-xl border p-2.5 min-h-[72px] flex flex-col justify-between', SLOT_STYLE[s.status])}>
                <div className="text-[12px] font-bold">{r.slotMode === 'hanger' ? `🧥 ${s.label}` : s.label}</div>
                <div>
                  <div className="text-[11px] opacity-80">{s.status}</div>
                  {b && <div className="text-[12px] font-semibold truncate">{b.name}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {r.slotMode === 'hanger' && <p className="text-[11px] text-ink-500 mt-2">분담금은 행거 수에 비례해요 (총 {totalHangers}개).</p>}

        <h3 className="font-bold mt-6 mb-2">모집자</h3>
        <Card className="p-3 flex items-center gap-3" onClick={() => navigate({ name: 'brand', id: host.id })}>
          <BrandLogo brand={host} size={44} />
          <div className="flex-1">
            <div className="font-bold">{host.name}</div>
            <TrustLine db={db} subjectId={host.id} compact />
          </div>
          <span className="text-ink-300">›</span>
        </Card>

        {isHost && (
          <>
            <div className="flex items-center justify-between mt-6 mb-2">
              <h3 className="font-bold">지원자 {apps.length}</h3>
              {empties.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => simulateApplicants(r.id)}>지원자 불러오기 <Demo /></Button>
              )}
            </div>
            {apps.length === 0 && <div className="text-sm text-ink-500 py-3">아직 지원자가 없어요.</div>}
            <div className="space-y-2">
              {apps.map((a) => {
                const b = brandById(db, a.brandId)!;
                const slot = r.slots.find((s) => s.id === a.slotId);
                return (
                  <Card key={a.id} className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo brand={b} size={40} />
                      <button className="flex-1 text-left" onClick={() => navigate({ name: 'brand', id: b.id })}>
                        <div className="font-bold text-sm">{b.name} <span className="text-ink-500 font-normal text-xs">· {slot?.label} 지원</span></div>
                        <TrustLine db={db} subjectId={b.id} compact />
                      </button>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="mt-2"><ThemeTagList tags={b.tags} limit={5} /></div>
                    <p className="text-sm text-ink-700 mt-2">"{a.message}"</p>
                    {a.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button variant="secondary" size="sm" onClick={() => decideApplication(a.id, false)}>거절</Button>
                        <Button size="sm" onClick={() => decideApplication(a.id, true)}>수락</Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
        {r.teamId && (isHost || inSlot) && (
          <Button full variant="dark" className="mt-4" onClick={() => navigate({ name: 'team', id: r.teamId! })}>팀 공간으로 가기</Button>
        )}
      </div>

      {role === 'brand' && !isHost && !inSlot && r.status !== '마감' && (
        <div className="sticky bottom-0 bg-white border-t border-ink-100 p-3">
          {myApp ? (
            <Button full disabled>지원 완료 · 모집자 검토 중</Button>
          ) : (
            <Button full size="lg" disabled={!empties.length} onClick={() => guard(() => { setSlotId(empties[0]?.id ?? null); setApplyOpen(true); })}>
              {empties.length ? '지원하기' : '빈 자리가 없어요'}
            </Button>
          )}
        </div>
      )}
      {role === 'landlord' && r.status !== '마감' && (
        <div className="sticky bottom-0 bg-white border-t border-ink-100 p-3">
          <ProposeSpaceButton recruitmentId={r.id} />
        </div>
      )}

      <Sheet open={applyOpen} onClose={() => setApplyOpen(false)} title="지원하기">
        <Field label="원하는 자리">
          <div className="flex flex-wrap gap-1.5">
            {empties.map((s) => <Chip key={s.id} active={slotId === s.id} onClick={() => setSlotId(s.id)}>{s.label}</Chip>)}
          </div>
        </Field>
        <Field label="지원 메시지" hint={`${msg.length}/200`}>
          <textarea className={textareaCls} maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="어떤 상품으로 함께하고 싶은지 알려 주세요" />
        </Field>
        {brand && (
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-ink-700 mb-1.5">자동 첨부되는 내 프로필</div>
            <Card className="p-3 flex items-center gap-2.5">
              <BrandLogo brand={brand} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{brand.name}</div>
                <TrustLine db={db} subjectId={brand.id} compact />
              </div>
              <Tag>룩북 {brand.lookbook.length}장</Tag>
            </Card>
          </div>
        )}
        <Button full size="lg" disabled={!slotId || !msg.trim()} onClick={() => { applyRecruitment(r.id, brand!.id, slotId!, msg); setApplyOpen(false); setMsg(''); }}>지원서 보내기</Button>
      </Sheet>
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-100/60 p-3">
      <div className="text-[11px] text-ink-500">{label}</div>
      <div className={cx('font-bold mt-0.5', accent && 'text-brand-600')}>{value}</div>
    </div>
  );
}

export function RecruitNew() {
  const { db, brand } = useMe();
  const myCat = (brand?.tags.categories[0] ?? '의류') as Category;
  const [d, setD] = useState<RecruitDraft>({
    title: '', intro: '', region: '성동구', period: { start: '2026-12-11', end: '2026-12-13' }, totalBudget: 2400000,
    spaceConfirmed: false, spaceId: undefined, slotMode: 'category',
    categorySlots: [{ category: myCat, count: 1 }, { category: myCat === '주얼리' ? '의류' : '주얼리', count: 1 }, { category: '가방', count: 1 }],
    hostCategory: myCat, hangerCount: 6, hostHangers: 2,
  });
  const slotsPreview = d.slotMode === 'category' ? d.categorySlots.reduce((s, c) => s + c.count, 0) : d.hangerCount;
  const share = slotsPreview ? d.totalBudget / slotsPreview : 0;
  const ok = d.title.trim() && slotsPreview >= 2 && (!d.spaceConfirmed || d.spaceId) && (d.slotMode === 'hanger' || d.categorySlots.some((c) => c.category === d.hostCategory && c.count > 0));
  const regionSpaces = db.spaces.filter((s) => s.region === d.region);

  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="모집글 쓰기" />
      <div className="p-4">
        <Field label="제목" required>
          <input className={inputCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="예) 연말 성수 공동 팝업 같이 해요" />
        </Field>
        <Field label="소개">
          <textarea className={textareaCls} value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} placeholder="어떤 무드의 팝업인지, 어떤 브랜드를 찾는지" />
        </Field>
        <Field label="희망 지역">
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => <Chip key={r} active={d.region === r} onClick={() => setD({ ...d, region: r, spaceId: undefined })}>{r}</Chip>)}
          </div>
        </Field>
        <Field label="일정">
          <div className="flex items-center gap-2">
            <input type="date" className={inputCls} value={d.period.start} onChange={(e) => setD({ ...d, period: { ...d.period, start: e.target.value } })} />
            <span>~</span>
            <input type="date" className={inputCls} value={d.period.end} onChange={(e) => setD({ ...d, period: { ...d.period, end: e.target.value } })} />
          </div>
        </Field>
        <Field label="총 예산" hint="대관료와 공통비를 합친 예상 금액">
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} step={10} value={d.totalBudget / 10000} onChange={(e) => setD({ ...d, totalBudget: Number(e.target.value) * 10000 })} />
            <span className="text-sm shrink-0">만원</span>
          </div>
        </Field>
        <Field label="공간 확정 여부">
          <Segmented items={[{ key: 'no', label: '아직 미정' }, { key: 'yes', label: '확정됨' }]} value={d.spaceConfirmed ? 'yes' : 'no'} onChange={(k) => setD({ ...d, spaceConfirmed: k === 'yes' })} />
          {d.spaceConfirmed && (
            <div className="mt-2 space-y-1.5">
              {regionSpaces.map((s) => (
                <button key={s.id} type="button" onClick={() => setD({ ...d, spaceId: s.id })} className={cx('w-full text-left rounded-xl border p-3 text-sm', d.spaceId === s.id ? 'border-ink-900 bg-ink-100' : 'border-ink-300')}>
                  <b>{s.name}</b> <span className="text-ink-500">· 1일 {manwon(s.dailyFee)} · {s.areaM2}㎡</span>
                </button>
              ))}
              {!regionSpaces.length && <p className="text-xs text-ink-500">{d.region}에 등록된 공간이 없어요.</p>}
            </div>
          )}
        </Field>
        <Field label="자리 구성 방식">
          <Segmented items={[{ key: 'category', label: '카테고리 슬롯' }, { key: 'hanger', label: '행거 단위' }]} value={d.slotMode} onChange={(k) => setD({ ...d, slotMode: k })} />
        </Field>
        {d.slotMode === 'category' ? (
          <div className="mb-4 -mt-1">
            {d.categorySlots.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select className={inputCls} value={c.category} onChange={(e) => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, category: e.target.value as Category } : x)) })}>
                  {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
                <Button variant="secondary" onClick={() => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, count: Math.max(0, x.count - 1) } : x)) })}>−</Button>
                <span className="w-12 text-center font-bold">{c.count}자리</span>
                <Button variant="secondary" onClick={() => setD({ ...d, categorySlots: d.categorySlots.map((x, j) => (j === i ? { ...x, count: x.count + 1 } : x)) })}>+</Button>
              </div>
            ))}
            <button type="button" className="text-sm text-brand-600 font-semibold" onClick={() => setD({ ...d, categorySlots: [...d.categorySlots, { category: '기타 액세서리', count: 1 }] })}>+ 카테고리 추가</button>
            <div className="mt-3 text-[13px] font-semibold text-ink-700 mb-1.5">내가 쓸 자리</div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(d.categorySlots.filter((c) => c.count > 0).map((c) => c.category))].map((c) => <Chip key={c} active={d.hostCategory === c} onClick={() => setD({ ...d, hostCategory: c })}>{c}</Chip>)}
            </div>
          </div>
        ) : (
          <div className="mb-4 -mt-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm w-20">전체 행거</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hangerCount: Math.max(2, d.hangerCount - 1), hostHangers: Math.min(d.hostHangers, d.hangerCount - 2) })}>−</Button>
              <span className="w-12 text-center font-bold">{d.hangerCount}개</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hangerCount: d.hangerCount + 1 })}>+</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-20">내 행거</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hostHangers: Math.max(1, d.hostHangers - 1) })}>−</Button>
              <span className="w-12 text-center font-bold">{d.hostHangers}개</span>
              <Button variant="secondary" onClick={() => setD({ ...d, hostHangers: Math.min(d.hangerCount - 1, d.hostHangers + 1) })}>+</Button>
            </div>
            <div className="grid grid-cols-6 gap-1 mt-3">
              {Array.from({ length: d.hangerCount }).map((_, i) => (
                <div key={i} className={cx('h-10 rounded-lg border text-[10px] flex items-center justify-center', i < d.hostHangers ? SLOT_STYLE['모집자'] : SLOT_STYLE['비어 있음'])}>{i + 1}</div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-brand-50 p-4 mb-4">
          <div className="text-[13px] text-brand-700">{d.slotMode === 'hanger' ? '행거 1개' : '1자리'} 분담금 (자동 계산)</div>
          <div className="text-2xl font-extrabold text-brand-700">{manwon(share)}</div>
          <div className="text-[12px] text-brand-700/80">총 {manwon(d.totalBudget)} ÷ {slotsPreview}{d.slotMode === 'hanger' ? '개 행거' : '자리'}</div>
          {d.slotMode === 'hanger' && <div className="text-[12px] text-brand-700/80 mt-0.5">내 부담: {manwon(share * d.hostHangers)} (행거 {d.hostHangers}개)</div>}
        </div>
        <Button full size="lg" disabled={!ok} onClick={() => createRecruitment(brand!.id, d)}>모집글 올리기</Button>
      </div>
    </div>
  );
}


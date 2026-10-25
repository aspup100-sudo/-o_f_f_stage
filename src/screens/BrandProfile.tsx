import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { guard } from '@/store/hooks';
import { navigate } from '@/store/store';
import { shareLink } from '@/store/share';
import { brandById, displayName, josa, learnMatchWeights, matchPct, matchScore, period, reviewAvg, spaceById, teamsOfBrand, trustEvents, trustScore, userById } from '@/store/logic';
import { BrandLogo, LookbookGrid, ThemeTagList } from '@/components/common';
import { Button, Card, Empty, GradeBadge, Icon, Stars, StatusPill, SubHeader, Swatch, Tabs, Tag, Ic } from '@/components/ui';
import { BrandActions } from './BrandActions';
import { ReportButton } from './Report';
import type { Review } from '@/types';

export default function BrandProfileScreen({ id }: { id: string }) {
  const { db, role, brand: me, userId } = useMe();
  const brand = brandById(db, id);
  const [tab, setTab] = useState<'lookbook' | 'history' | 'reviews'>('lookbook');
  if (!brand) return <Empty>브랜드를 찾을 수 없어요</Empty>;
  const t = trustScore(db, brand.id);
  const isMe = me?.id === brand.id;
  const teams = teamsOfBrand(db, brand.id);
  const owner = userById(db, brand.userId);

  return (
    <div className="bg-white min-h-screen">
      <SubHeader
        title={brand.name}
        right={
          <div className="flex items-center gap-3">
            <button className="text-[13px] font-semibold text-ink-700" onClick={() => shareLink(brand.name, isMe ? `OFF STAGE에서 ${brand.name}${josa(brand.name, '과', '와').slice(brand.name.length)} 같이 팝업 열 브랜드를 찾아요` : `${brand.name} · OFF STAGE 브랜드`)}>공유</button>
            {!isMe && <ReportButton targetType="profile" targetId={brand.id} targetLabel={`브랜드: ${brand.name}`} />}
          </div>
        }
      />
      <Swatch hue={brand.logoHue} pattern="stripe" rounded="" className="h-24 w-full" />
      <div className="px-4">
        <div className="relative flex flex-col items-start gap-2 -mt-9">
          <span className="rounded-full ring-4 ring-white bg-white shrink-0"><BrandLogo brand={brand} size={72} /></span>
          <div className="w-full min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-extrabold truncate">{brand.name}</h1>
              {owner?.verifyStatus === 'verified' && <Icon name="shield" className="w-4 h-4 text-emerald-500" />}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <GradeBadge grade={t.grade} />
              <span className="text-xs text-ink-500">신뢰 지수 {t.score % 1 ? t.score.toFixed(1) : t.score}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 mt-4 rounded bg-ink-100/70 py-3 text-center">
          <div>
            <div className="text-lg font-extrabold">{t.verifiedPopups}회</div>
            <div className="text-[11px] text-ink-500">인증 공동 팝업</div>
          </div>
          <div className="border-x border-ink-300/60">
            <div className="text-lg font-extrabold">{t.avgRating !== null ? t.avgRating.toFixed(1) : '-'}</div>
            <div className="text-[11px] text-ink-500">후기 평균 ({t.reviewCount})</div>
          </div>
          <div>
            <div className="text-lg font-extrabold">{brand.followers.length}</div>
            <div className="text-[11px] text-ink-500">팔로워</div>
          </div>
        </div>
        {t.grade === '새싹' && <p className="text-[12px] text-lime-700 mt-2"><Ic n="leaf" />OFF STAGE에서 첫 공동 팝업을 준비 중인 새싹 브랜드예요.</p>}
        <p className="text-sm text-ink-700 leading-relaxed mt-4">{brand.intro}</p>
        <div className="mt-3">
          <ThemeTagList tags={brand.tags} />
        </div>
        {brand.channels.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {brand.channels.map((c) => (
              <a key={c.label} href={c.url} target="_blank" rel="noreferrer" className="text-[12px] px-2.5 h-7 inline-flex items-center rounded-full border border-ink-300 text-ink-700">
                {c.label} ↗
              </a>
            ))}
          </div>
        )}
        {brand.news && brand.news.length > 0 && (
          <div className="mt-4 rounded border border-ink-100 p-3.5">
            <div className="text-[12px] font-bold text-ink-500 mb-1"><Ic n="megaphone" />최근 소식</div>
            {brand.news.slice(0, 2).map((n) => (
              <div key={n.id} className="text-sm py-1"><span className="text-ink-900">{n.text}</span> <span className="text-[11px] text-ink-500">{n.at.slice(5, 10).replace('-', '/')}</span></div>
            ))}
          </div>
        )}
        {role === 'brand' && !isMe && me && <MatchCard me={me} other={brand} />}
        <div className="flex gap-2 mt-4">
          {role === 'brand' && !isMe && (
            <>
              <Button full onClick={() => guard(() => navigate({ name: 'propose', toBrandId: brand.id }))}>같이 해요 제안하기</Button>
              <BrandActions brandId={brand.id} big />
            </>
          )}
          {role === 'visitor' && <div className="flex-1 [&>button]:w-full"><BrandActions brandId={brand.id} big /></div>}
          {isMe && <Button variant="secondary" full onClick={() => navigate({ name: 'tab', tab: 'me' })}>내 정보에서 프로필 수정</Button>}
        </div>
      </div>

      <Tabs
        className="mt-5 sticky top-12 z-10"
        items={[{ key: 'lookbook', label: `룩북 ${brand.lookbook.length}` }, { key: 'history', label: '일정·이력' }, { key: 'reviews', label: `후기·신뢰` }]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'lookbook' && (
        <div className="p-1">
          {brand.lookbook.length ? <LookbookGrid db={db} ids={brand.lookbook} /> : <Empty>아직 룩북이 없어요</Empty>}
        </div>
      )}
      {tab === 'history' && (
        <div className="px-4 py-4 space-y-6">
          <div>
            <h3 className="font-bold text-[15px] mb-2">팝업 가능 일정</h3>
            <div className="flex flex-wrap gap-1.5">
              {brand.availability.map((a) => (
                <Tag key={a.start} tone="green"><Ic n="calendar" />{a.start.slice(0, 4)}. {period(a)}</Tag>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-[15px] mb-2">공동 팝업 이력</h3>
            {teams.length === 0 && <Empty>아직 함께한 팝업이 없어요</Empty>}
            <div className="space-y-2">
              {teams.map((tm) => {
                const others = tm.members.filter((m) => m.brandId !== brand.id).map((m) => brandById(db, m.brandId)!);
                const sp = spaceById(db, tm.spaceId);
                const posts = db.showcases.filter((s) => s.teamId === tm.id && !s.hidden);
                const pops = db.popups.filter((p) => p.teamId === tm.id);
                return (
                  <Card key={tm.id} className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{tm.name}</span>
                      <StatusPill status={tm.stage} />
                      {pops.length > 1 && <Tag>{pops.length}회차</Tag>}
                    </div>
                    <div className="text-[13px] text-ink-700 mt-1">
                      함께한 브랜드:{' '}
                      {others.map((o, i) => (
                        <button key={o.id} className="underline underline-offset-2" onClick={() => navigate({ name: 'brand', id: o.id })}>
                          {o.name}{i < others.length - 1 ? ', ' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="text-[13px] text-ink-500 mt-0.5">
                      {sp ? <button className="underline underline-offset-2" onClick={() => navigate({ name: 'space', id: sp.id })}>{sp.name}</button> : '공간 미정'} · {period(tm.period)}
                    </div>
                    {posts.map((p) => (
                      <button key={p.id} onClick={() => navigate({ name: 'showcase', id: p.id })} className="mt-2 w-full text-left text-[13px] font-semibold text-brand-600">
                        <Ic n="camera" />팝업자랑: {p.title} ›
                      </button>
                    ))}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {tab === 'reviews' && <ReviewsTab brandId={brand.id} />}
    </div>
  );
}

function ReviewsTab({ brandId }: { brandId: string }) {
  const { db } = useMe();
  const teamIds = teamsOfBrand(db, brandId).map((t) => t.id);
  const fromBrands = db.reviews.filter((r) => !r.hidden && r.kind === 'brand_to_brand' && r.targetId === brandId);
  const fromSpaces = db.reviews.filter((r) => !r.hidden && r.kind === 'space_to_team' && teamIds.includes(r.targetId));
  const fromVisitors = db.reviews.filter((r) => !r.hidden && r.kind === 'visitor_brand' && r.targetId === brandId);
  const events = trustEvents(db, brandId);
  const t = trustScore(db, brandId);
  return (
    <div className="px-4 py-4 space-y-6">
      <ReviewGroup title="함께한 브랜드가 남긴 후기" reviews={fromBrands} />
      <ReviewGroup title="공간 운영자가 남긴 후기" reviews={fromSpaces} />
      <ReviewGroup title="방문객 후기" reviews={fromVisitors} />
      <div>
        <h3 className="font-bold text-[15px] mb-1">신뢰 지수 내역</h3>
        <p className="text-xs text-ink-500 mb-2">50점에서 시작해요. 같은 상대와 반복된 후기는 두 번째부터 절반만 반영돼요.</p>
        <Card className="divide-y divide-ink-100">
          <div className="flex justify-between px-3.5 py-2.5 text-sm">
            <span>시작 점수</span>
            <span className="font-semibold">50</span>
          </div>
          {events.map((e) => (
            <div key={e.id} className="flex justify-between px-3.5 py-2.5 text-sm">
              <span className="text-ink-700">{e.note} <span className="text-ink-500 text-xs">{e.at}</span></span>
              <span className={e.delta >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{e.delta > 0 ? '+' : ''}{e.delta}</span>
            </div>
          ))}
          <div className="flex justify-between px-3.5 py-2.5 text-sm font-bold bg-ink-100/50">
            <span>현재</span>
            <span>{t.score}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ReviewGroup({ title, reviews }: { title: string; reviews: Review[] }) {
  const { db } = useMe();
  return (
    <div>
      <h3 className="font-bold text-[15px] mb-2">
        {title} <span className="text-ink-500 font-normal text-sm">{reviews.length}</span>
      </h3>
      {reviews.length === 0 && <div className="text-sm text-ink-500 py-2">아직 없어요</div>}
      <div className="space-y-2">
        {reviews.map((r) => (
          <Card key={r.id} className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">{displayName(db, r.authorId)}</span>
              <div className="flex items-center gap-1">
                <Stars value={Math.round(reviewAvg(r))} size="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{reviewAvg(r).toFixed(1)}</span>
              </div>
            </div>
            {Object.keys(r.scores).length > 1 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(r.scores).map(([k, v]) => (
                  <Tag key={k}>{k} {v}</Tag>
                ))}
              </div>
            )}
            <p className="text-sm text-ink-700 mt-1.5">{r.comment}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[11px] text-ink-500">{r.createdAt}</span>
              <ReportButton targetType="review" targetId={r.id} targetLabel={`리뷰: "${r.comment.slice(0, 20)}"`} small />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** 브랜드끼리 보는 '나와의 궁합'. 추천 점수를 사람이 읽기 쉬운 %로 바꿔 보여 준다. */
function MatchCard({ me, other }: { me: import('@/types').BrandProfile; other: import('@/types').BrandProfile }) {
  const { db } = useMe();
  const m = matchScore(db, me, other);
  const pct = matchPct(m.score);
  const [open, setOpen] = useState(false);
  const learned = learnMatchWeights(db);
  const word = pct >= 80 ? '찰떡 궁합' : pct >= 60 ? '잘 맞아요' : pct >= 45 ? '무난해요' : '색이 많이 달라요';
  return (
    <div className="mt-4 rounded bg-brand-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{josa(me.name, '과', '와')}의 궁합</span>
        <span className="text-[13px] font-extrabold text-brand-600">{pct}% · {word}</span>
      </div>
      <div className="h-2 rounded-full bg-white mt-2 overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
      {m.reasons.length > 0 && (
        <div className="mt-2.5 space-y-0.5">
          {m.reasons.slice(0, 3).map((r) => <div key={r} className="text-[12px] text-brand-700 flex"><Ic n="check" />{r}</div>)}
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="mt-2 text-[12px] font-semibold text-ink-500">{open ? '접기 ▴' : '이렇게 계산했어요 ▾'}</button>
      {open && (
        <div className="mt-2 rounded-xl bg-white p-3 text-[12px]">
          {m.parts.map((x) => (
            <div key={x.label} className="flex justify-between py-0.5">
              <span className="text-ink-700">{x.label}</span>
              <span className={x.pts > 0 ? 'font-bold text-brand-600' : x.pts < 0 ? 'font-bold text-rose-500' : 'text-ink-500'}>{x.pts > 0 ? '+' : ''}{x.pts}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-ink-100 mt-1.5 pt-1.5 font-bold"><span>합계 {m.score}점</span><span>40 + {m.score}×4 = {pct}%</span></div>
          <p className="text-[11px] text-ink-500 mt-1.5">가입할 때 고른 무드·카테고리·가격대·고객 연령 태그로 계산해요. 태그는 내 정보에서 바꿀 수 있어요.{learned.samples > 0 && ` 항목별 점수는 실제로 함께 팝업을 연 ${learned.samples}쌍의 후기 결과로 자동 보정돼요.`} (데모)</p>
        </div>
      )}
    </div>
  );
}

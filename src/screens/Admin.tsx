import { RENTAL_ON } from '@/config';
import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { decideVerification, resolveReport } from '@/store/actions';
import { BASE_WEIGHTS, daysUntil, displayName, learnMatchWeights, rentalQuote, WEIGHT_LABEL, won } from '@/store/logic';
import { ScreenTitle } from '@/components/common';
import { Button, Card, Empty, Segmented, Tag } from '@/components/ui';
import { ROLE_LABEL } from '@/config';

export function VerifyTab() {
  const { db } = useMe();
  const pending = db.users.filter((u) => u.verifyStatus === 'pending');
  const done = db.users.filter((u) => (u.role === 'brand' || u.role === 'landlord') && (u.verifyStatus === 'verified' || u.verifyStatus === 'rejected')).slice(-6).reverse();
  return (
    <div>
      <ScreenTitle>사업자 인증 승인</ScreenTitle>
      <p className="px-4 text-[13px] text-ink-500 -mt-1 mb-3">데모에서는 사업자등록번호 형식만 확인해요. 실제로는 국세청 조회 결과를 함께 봐요.</p>
      <div className="px-4 space-y-2">
        <h3 className="text-[17px] font-extrabold tracking-tight">대기 {pending.length}</h3>
        {pending.length === 0 && <Empty icon="shield">대기 중인 인증이 없어요</Empty>}
        {pending.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">{u.name}</div>
              <Tag>{ROLE_LABEL[u.role]}</Tag>
            </div>
            <div className="text-sm text-ink-700 mt-1">사업자등록번호 <b className="tabular-nums">{u.bizNumber}</b></div>
            <div className="text-[12px] text-ink-500">가입 {u.createdAt} · {u.provider === 'kakao' ? '카카오' : '네이버'} 로그인</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => decideVerification(u.id, false)}>반려</Button>
              <Button size="sm" onClick={() => decideVerification(u.id, true)}>승인</Button>
            </div>
          </Card>
        ))}
        <h3 className="text-[17px] font-extrabold tracking-tight pt-4">최근 처리</h3>
        <Card className="divide-y divide-ink-100">
          {done.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
              <span>{u.name} <span className="text-ink-500 text-xs">{ROLE_LABEL[u.role]}</span></span>
              <Tag tone={u.verifyStatus === 'verified' ? 'green' : 'red'}>{u.verifyStatus === 'verified' ? '승인' : '반려'}</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const STATUS_LABEL = { open: '대기', warned: '경고', hidden: '숨김', penalized: '신뢰 지수 차감', dismissed: '기각' } as const;

export function ReportsTab() {
  const { db } = useMe();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const list = db.reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open'));
  return (
    <div>
      <ScreenTitle>신고 처리</ScreenTitle>
      <div className="px-4 mb-3">
        <Segmented items={[{ key: 'open', label: `대기 ${db.reports.filter((r) => r.status === 'open').length}` }, { key: 'done', label: '처리 완료' }]} value={tab} onChange={setTab} />
      </div>
      <div className="px-4 space-y-2">
        {list.length === 0 && <Empty icon="flag">신고가 없어요</Empty>}
        {list.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-1.5">
              <Tag tone="red">{r.reason}</Tag>
              <Tag>{{ profile: '프로필', post: '게시글', review: '리뷰', chat: '채팅' }[r.targetType]}</Tag>
              {r.status !== 'open' && <Tag tone="green">{STATUS_LABEL[r.status]}</Tag>}
            </div>
            <div className="font-semibold text-sm mt-2">{r.targetLabel}</div>
            {r.detail && <p className="text-sm text-ink-700 mt-1">"{r.detail}"</p>}
            <div className="text-[12px] text-ink-500 mt-1">신고자 {displayName(db, r.reporterId)} · {r.at.slice(0, 10)}</div>
            {(() => {
              const same = db.reports.filter((x) => x.targetId === r.targetId).length;
              const brand = r.targetType === 'profile' ? db.brands.find((b) => b.id === r.targetId) : undefined;
              return (
                <div className="flex items-center gap-2 mt-1.5 text-[12px]">
                  {same > 1 && <span className="font-semibold text-red-600">같은 대상 신고 누적 {same}건</span>}
                  {brand && <button className="font-semibold text-brand-600" onClick={() => navigate({ name: 'brand', id: brand.id })}>프로필 보기 ›</button>}
                </div>
              );
            })()}
            {r.status === 'open' && (
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                <Button size="sm" variant="secondary" onClick={() => resolveReport(r.id, 'warned')}>경고</Button>
                <Button size="sm" variant="secondary" disabled={r.targetType === 'chat'} onClick={() => resolveReport(r.id, 'hidden')}>숨김</Button>
                <Button size="sm" variant="danger" onClick={() => resolveReport(r.id, 'penalized')}>-5점</Button>
                <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'dismissed')}>기각</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/** 운영 지표: 앱 안 데이터로 바로 계산한다 (가짜 숫자 없음). */
export function StatsTab() {
  const { db } = useMe();
  const newUsers = db.users.filter((u) => u.createdAt && daysUntil(u.createdAt.slice(0, 10)) >= -7).length;
  const pending = db.users.filter((u) => u.verifyStatus === 'pending').length;
  const openReports = db.reports.filter((r) => r.status === 'open').length;
  const teams = { 준비: db.teams.filter((t) => t.stage === '준비 중').length, 운영: db.teams.filter((t) => t.stage === '운영 중').length, 종료: db.teams.filter((t) => t.stage === '종료').length };
  const verified = db.completions.filter((c) => c.verified).length;
  const rentalSum = db.rentalOrders.filter((o) => o.status !== 'requested' && o.status !== 'rejected').reduce((s, o) => s + rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery).total, 0);
  const rentalSaved = db.rentalOrders.filter((o) => o.status !== 'requested' && o.status !== 'rejected').reduce((s, o) => s + rentalQuote(db, o.partnerId, o.lines, o.dates, o.delivery).saved, 0);
  const waits = db.popups.reduce((s, p) => s + (p.waiters?.length ?? 0), 0);
  const tile = (label: string, value: string | number, hint?: string) => (
    <Card className="p-3.5">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className="text-xl font-extrabold mt-0.5">{value}</div>
      {hint && <div className="text-[12px] text-ink-500 mt-0.5">{hint}</div>}
    </Card>
  );
  return (
    <div>
      <ScreenTitle>운영 지표</ScreenTitle>
      <div className="px-4 space-y-4 pb-6">
        {(pending > 0 || openReports > 0) && (
          <Card className="p-3.5 border-ink-900" onClick={() => navigate({ name: 'tab', tab: pending ? 'verify' : 'reports' })}>
            <div className="text-sm font-bold">처리할 일: 인증 대기 {pending}건 · 신고 {openReports}건 ›</div>
          </Card>
        )}
        <div>
          <h3 className="text-[17px] font-extrabold tracking-tight mb-3">사람</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('브랜드', db.brands.length, `인증 ${db.users.filter((u) => u.role === 'brand' && u.verifyStatus === 'verified').length}곳`)}
            {tile('임대인 공간', db.spaces.length, `임대인 ${db.landlords.length}명`)}
            {tile('방문객', db.visitors.length, `팔로우 ${db.visitors.reduce((s, v) => s + v.following.length, 0)}건`)}
            {tile('최근 7일 가입', newUsers)}
          </div>
        </div>
        <div>
          <h3 className="text-[17px] font-extrabold tracking-tight mb-3">공동 팝업</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('팀', db.teams.length, `준비 ${teams.준비} · 운영 ${teams.운영} · 종료 ${teams.종료}`)}
            {tile('인증 공동 팝업', verified)}
            {tile('방문 인증', db.visits.length, `오픈 알림 신청 ${waits}건`)}
            {tile('모집글', db.recruitments.length, `모집 중 ${db.recruitments.filter((r) => r.status === '모집 중').length}`)}
          </div>
        </div>
        {(() => {
          // 다시 쓰는지: 같은 사람이 두 번째로 돌아왔는가
          const brandTeams = db.brands.map((b) => db.teams.filter((t) => t.members.some((m) => m.brandId === b.id)).reduce((n, t) => n + t.round, 0)).filter((n) => n > 0);
          const repeatBrands = brandTeams.filter((n) => n >= 2).length;
          const perVisitor = db.visitors.map((v) => new Set(db.visits.filter((x) => x.userId === v.userId).map((x) => x.popupId)).size).filter((n) => n > 0);
          const repeatVisitors = perVisitor.filter((n) => n >= 2).length;
          const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
          return (
            <div>
              <h3 className="text-[17px] font-extrabold tracking-tight mb-3">다시 쓰는 비율</h3>
              <div className="grid grid-cols-2 gap-2">
                {tile('공동 팝업을 두 번 이상 연 브랜드', pct(repeatBrands, brandTeams.length), `${brandTeams.length}곳 중 ${repeatBrands}곳`)}
                {tile('두 곳 이상 방문한 방문객', pct(repeatVisitors, perVisitor.length), `${perVisitor.length}명 중 ${repeatVisitors}명`)}
                {tile('2회차로 이어진 팀', db.teams.filter((t) => t.round >= 2).length, '같은 팀이 다시 연 팝업')}
              </div>
            </div>
          );
        })()}
        {(() => {
          const L = learnMatchWeights(db);
          return (
            <div>
              <h3 className="text-[17px] font-extrabold tracking-tight mb-1">궁합 공식 자동 조정</h3>
              <p className="text-[12px] text-ink-500 mb-2">함께 팝업을 끝낸 브랜드 쌍이 서로 남긴 업무 후기와 재결합 여부를 보고, 결과가 좋았던 쌍에서 자주 보인 특징의 가중치를 올려요. 표본이 적을수록 기본값에 가깝게 둬요.</p>
              <Card className="p-3.5">
                <div className="flex justify-between text-[12px] text-ink-500 mb-1.5"><span>학습한 팀 결과 {L.samples}쌍</span><span>반영 비율 {Math.round(L.trust * 100)}%</span></div>
                {(Object.keys(BASE_WEIGHTS) as (keyof typeof BASE_WEIGHTS)[]).map((k) => {
                  const d = Math.round((L.weights[k] - BASE_WEIGHTS[k]) * 100) / 100;
                  return (
                    <div key={k} className="flex items-center justify-between py-1 text-[13px] border-t border-ink-100 first:border-0">
                      <span className="text-ink-700">{WEIGHT_LABEL[k]}</span>
                      <span className="tabular-nums">
                        <span className="text-ink-500">{BASE_WEIGHTS[k]} → </span><b>{L.weights[k]}</b>
                        {d !== 0 && <span className={d > 0 === BASE_WEIGHTS[k] > 0 ? 'text-emerald-700 ml-1' : 'text-red-500 ml-1'}>{d > 0 ? '▲' : '▼'}</span>}
                      </span>
                    </div>
                  );
                })}
                {L.pairs.length > 0 && (
                  <details className="mt-2 text-[12px]">
                    <summary className="text-ink-500 cursor-pointer">학습에 쓴 팀 결과 보기</summary>
                    <div className="mt-1.5 space-y-0.5">
                      {L.pairs.map((p) => <div key={p.a.id + p.b.id} className="flex justify-between"><span>{p.a.name} × {p.b.name}</span><span className="text-ink-500">{p.why} → {Math.round(p.y * 100)}점</span></div>)}
                    </div>
                  </details>
                )}
              </Card>
            </div>
          );
        })()}
        {RENTAL_ON && <div>
          <h3 className="text-[17px] font-extrabold tracking-tight mb-3">렌탈 제휴</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('렌탈 거래액', won(rentalSum), `${db.rentalOrders.length}건 요청`)}
            {tile('브랜드가 아낀 금액', won(rentalSaved), '정가 대비')}
          </div>
        </div>}
        <p className="text-[12px] text-ink-500">모든 수치는 데모 데이터에서 계산돼요.</p>
      </div>
    </div>
  );
}

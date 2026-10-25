import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { decideVerification, resolveReport } from '@/store/actions';
import { daysUntil, displayName, rentalQuote, won } from '@/store/logic';
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
        <h3 className="font-bold">대기 {pending.length}</h3>
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
        <h3 className="font-bold pt-4">최근 처리</h3>
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
      <div className="text-[11px] text-ink-500">{label}</div>
      <div className="text-xl font-extrabold mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500 mt-0.5">{hint}</div>}
    </Card>
  );
  return (
    <div>
      <ScreenTitle>운영 지표</ScreenTitle>
      <div className="px-4 space-y-4 pb-6">
        {(pending > 0 || openReports > 0) && (
          <Card className="p-3.5 border-brand-200 bg-brand-50" onClick={() => navigate({ name: 'tab', tab: pending ? 'verify' : 'reports' })}>
            <div className="text-sm font-bold">처리할 일: 인증 대기 {pending}건 · 신고 {openReports}건 ›</div>
          </Card>
        )}
        <div>
          <h3 className="font-bold mb-2 text-[15px]">사람</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('브랜드', db.brands.length, `인증 ${db.users.filter((u) => u.role === 'brand' && u.verifyStatus === 'verified').length}곳`)}
            {tile('임대인 공간', db.spaces.length, `임대인 ${db.landlords.length}명`)}
            {tile('방문객', db.visitors.length, `팔로우 ${db.visitors.reduce((s, v) => s + v.following.length, 0)}건`)}
            {tile('최근 7일 가입', newUsers)}
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2 text-[15px]">공동 팝업</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('팀', db.teams.length, `준비 ${teams.준비} · 운영 ${teams.운영} · 종료 ${teams.종료}`)}
            {tile('인증 공동 팝업', verified)}
            {tile('방문 인증', db.visits.length, `오픈 알림 신청 ${waits}건`)}
            {tile('모집글', db.recruitments.length, `모집 중 ${db.recruitments.filter((r) => r.status === '모집 중').length}`)}
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2 text-[15px]">렌탈 제휴</h3>
          <div className="grid grid-cols-2 gap-2">
            {tile('렌탈 거래액', won(rentalSum), `${db.rentalOrders.length}건 요청`)}
            {tile('브랜드가 아낀 금액', won(rentalSaved), '정가 대비')}
          </div>
        </div>
        <p className="text-[11px] text-ink-500">모든 수치는 데모 데이터에서 계산돼요.</p>
      </div>
    </div>
  );
}

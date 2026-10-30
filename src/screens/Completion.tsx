import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { askAi, type AiResult, type ReportOut } from '@/store/ai';
import { navigate } from '@/store/store';
import { confirmCompletion, setPopupStatus, simulateOthersConfirm, startNextRound, writeBizReview } from '@/store/actions';
import { brandById, displayName, period, popupById, popupReport, spaceById, teamById, trustScore } from '@/store/logic';
import { AiSource, Button, Card, cx, Demo, Empty, Icon, Sheet, Stars, StatusPill, Tag, textareaCls, GradeBadge, Ic } from '@/components/ui';
import { REVIEW_CRITERIA, type Team } from '@/types';

type BizKind = 'brand_to_brand' | 'brand_to_space' | 'space_to_team';

function ReviewForm({ kind, targetLabel, onSubmit, onClose, open }: { kind: BizKind; targetLabel: string; open: boolean; onClose: () => void; onSubmit: (scores: Record<string, number>, comment: string) => void }) {
  const crit = REVIEW_CRITERIA[kind];
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(crit.map((c) => [c, 5])));
  const [comment, setComment] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title={`${targetLabel} 후기`}>
      <p className="text-[12px] text-ink-500 mb-3">항목별 1~5점과 한 줄 후기를 남겨 주세요. 같은 상대에게 반복해서 남긴 후기는 두 번째부터 신뢰 지수에 절반만 반영돼요.</p>
      <div className="space-y-3 mb-4">
        {crit.map((c) => (
          <div key={c} className="flex items-center justify-between">
            <span className="text-sm font-semibold">{c}</span>
            <Stars value={scores[c]} onChange={(n) => setScores({ ...scores, [c]: n })} />
          </div>
        ))}
      </div>
      <textarea className={textareaCls} maxLength={100} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한 줄 후기" />
      <Button full size="lg" className="mt-3" disabled={!comment.trim()} onClick={() => { onSubmit(scores, comment); setComment(''); onClose(); }}>후기 등록</Button>
    </Sheet>
  );
}

/** 끝난 팝업 성과 리포트 */
export function PopupReportCard({ popupId }: { popupId: string }) {
  const { db } = useMe();
  const p = popupById(db, popupId);
  if (!p) return null;
  const r = popupReport(db, popupId);
  const stat = (label: string, value: string) => (
    <div className="border border-ink-300 p-3">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className="text-lg font-extrabold mt-0.5">{value}</div>
    </div>
  );
  return (
    <div className="bg-white rounded border border-ink-300 p-5">
      <div className="text-[12px] text-ink-500">팝업 리포트 · {period(p.period)}</div>
      <div className="text-xl font-extrabold mt-0.5">{p.title}</div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {stat('방문 인증', `${r.visits}명`)}
        {stat('방문객 평점', r.rating ? `★ ${r.rating.toFixed(1)}` : '-')}
        {stat('방문객 리뷰', `${r.reviewCount}개`)}
        {stat('팀 브랜드 팔로워', `${r.followers}명`)}
      </div>
      {r.bestPair && (
        <div className="mt-3 border-t border-ink-300 pt-3">
          <div className="text-[12px] text-ink-500">방문객이 가장 좋아한 조합</div>
          <div className="font-bold mt-0.5"><Ic n="heart" className="text-red-500" />{brandById(db, r.bestPair[0])?.name} × {brandById(db, r.bestPair[1])?.name} <span className="text-[12px] text-ink-500 font-normal">· {r.bestPairCount}명</span></div>
        </div>
      )}
      <ReportInsight popupId={popupId} />
      <p className="text-[12px] text-ink-500 mt-3">OFFSTAGE 안에서 모인 기록만 보여요. 매출은 팝업자랑에 직접 공개할 수 있어요.</p>
    </div>
  );
}

/** 리뷰·방문 기록을 읽고 반응 좋았던 점, 아쉬운 점, 다음 회차 제안을 정리한다 */
function ReportInsight({ popupId }: { popupId: string }) {
  const { db } = useMe();
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<AiResult<ReportOut> | null>(null);
  const run = async () => {
    const p = popupById(db, popupId)!;
    const r = popupReport(db, popupId);
    const combos = db.comboReviews.filter((c) => c.popupId === popupId);
    const reviews = db.reviews.filter((x) => !x.hidden && x.popupId === popupId && x.kind.startsWith('visitor'));
    const name = (id: string) => brandById(db, id)?.name ?? '';
    setBusy(true);
    setOut(await askAi<ReportOut>('report', {
      팝업: p.title, 일정: period(p.period), 방문인증: r.visits, 평점: r.rating ? r.rating.toFixed(1) : '없음', 오픈알림신청: r.waiting,
      조합리뷰: combos.map((c) => ({ 좋았음: c.good, 별점: c.rating, 조합: c.pairs.map(([a, b]) => `${name(a)}×${name(b)}`), 한줄: c.comment })),
      방문객리뷰: reviews.map((x) => ({ 대상: x.kind === 'visitor_brand' ? name(x.targetId) : '팝업 전체', 점수: x.scores, 한줄: x.comment })),
    }, () => {
      const good = combos.filter((c) => c.good);
      const bad = combos.filter((c) => !c.good);
      return {
        good: [
          r.bestPair && `${name(r.bestPair[0])} × ${name(r.bestPair[1])} 조합을 ${r.bestPairCount}명이 좋다고 했어요.`,
          r.rating >= 4 && `방문객 평점이 ★${r.rating.toFixed(1)}로 높았어요.`,
          good[0]?.comment && `"${good[0].comment}"`,
        ].filter(Boolean) as string[],
        improve: [bad[0]?.comment ? `"${bad[0].comment}"` : r.visits < 5 ? '방문 인증이 적었어요. 입구에 인증 코드 안내를 크게 붙여 보세요.' : '아쉬웠다는 리뷰는 없었어요.'],
        next: [
          r.bestPair ? `${name(r.bestPair[0])}와 ${name(r.bestPair[1])}를 가까이 두는 배치를 유지해요.` : '다음엔 조합 리뷰를 남기면 스탬프를 주는 안내를 해 보세요.',
          r.waiting > 0 ? `오픈 알림을 신청한 ${r.waiting}명에게 다음 회차 소식을 먼저 보내요.` : '오픈 3일 전 같은 날 동시 게시로 홍보해요.',
        ],
      };
    }));
    setBusy(false);
  };
  const sec = (title: string, list: string[]) => list.length > 0 && (
    <div className="mt-3">
      <div className="text-[12px] font-bold text-ink-700">{title}</div>
      <ul className="mt-1 space-y-1">{list.map((t) => <li key={t} className="text-[13px] text-ink-700 flex"><span className="w-1 h-1 bg-ink-900 mt-[8px] mr-2 shrink-0" />{t}</li>)}</ul>
    </div>
  );
  return (
    <div className="mt-3 border-t border-ink-300 pt-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-ink-500">리뷰로 본 반응</div>
        <button onClick={run} disabled={busy} className="text-[12px] font-semibold text-brand-600">{busy ? '정리하는 중' : out ? '다시 정리' : 'AI로 정리하기 ›'}</button>
      </div>
      {out && (
        <>
          {sec('반응 좋았던 점', out.result.good)}
          {sec('아쉬웠던 점', out.result.improve)}
          {sec('다음 회차 제안', out.result.next)}
          <div className="mt-2"><AiSource source={out.source} /></div>
        </>
      )}
    </div>
  );
}

export function NextRoundCard({ team }: { team: Team }) {
  const { db, brand } = useMe();
  if (!brand) return null;
  const next = db.teams.find((t) => t.name === team.name && t.round === team.round + 1);
  return (
    <div className="rounded border border-ink-300 p-4">
      <div className="font-bold">{team.round + 1}회차 준비</div>
      <p className="text-[13px] text-ink-700 mt-1">같은 멤버로 다시 열면 약속서·분담 방식·무드보드를 그대로 가져가요. 공간과 날짜만 새로 정하면 돼요.</p>
      {next ? (
        <Button className="mt-3" variant="secondary" onClick={() => navigate({ name: 'team', id: next.id })}>{team.round + 1}회차 팀으로 가기</Button>
      ) : (
        <Button className="mt-3" onClick={() => startNextRound(team.id, brand.id)}>{team.round + 1}회차 팀 만들기</Button>
      )}
    </div>
  );
}

function CompletionStatus({ popupId }: { popupId: string }) {
  const { db, userId } = useMe();
  const c = db.completions.find((x) => x.popupId === popupId);
  if (!c) return null;
  const mine = c.confirmedBy.includes(userId);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">성사 확인</div>
        {c.verified ? <Tag tone="green">인증 공동 팝업</Tag> : <span className="text-sm font-bold">{c.confirmedBy.length}/{c.required.length}</span>}
      </div>
      <p className="text-[12px] text-ink-500 mb-3">팀원 전원과 임대인이 모두 확인해야 인증 공동 팝업으로 기록되고 후기 작성이 열려요.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {c.required.map((u) => {
          const ok = c.confirmedBy.includes(u);
          const isLandlord = db.landlords.some((l) => l.userId === u);
          return <Tag key={u} tone={ok ? 'green' : 'gray'}>{ok && <Ic n="check" />}{displayName(db, u)}{isLandlord ? ' (임대인)' : ''}</Tag>;
        })}
      </div>
      {!c.verified && (
        <div className="space-y-2">
          <Button full disabled={mine} onClick={() => confirmCompletion(popupId, userId)}>{mine ? '확인 완료 · 다른 참여자를 기다려요' : '네, 팝업을 무사히 마쳤어요 (성사 확인)'}</Button>
          <Button full variant="secondary" onClick={() => simulateOthersConfirm(popupId, userId)}>다른 참여자 확인 받기 <Demo /></Button>
        </div>
      )}
    </Card>
  );
}

export function TeamWrapUp({ team }: { team: Team }) {
  const { db, brand, userId } = useMe();
  const [form, setForm] = useState<null | { kind: BizKind; targetId: string; label: string }>(null);
  const popups = db.popups.filter((p) => p.teamId === team.id);
  const current = popupById(db, team.popupId) ?? popups[0];
  if (!current) {
    return <Empty icon="calendar">공간이 확정되면 팝업 일정이 만들어지고, 끝난 뒤 이곳에서 성사 확인과 후기를 남겨요.</Empty>;
  }
  const comp = db.completions.find((c) => c.popupId === current.id);
  const sp = spaceById(db, current.spaceId)!;
  const written = (kind: string, targetId: string) => db.reviews.some((r) => r.kind === kind && r.authorId === userId && r.targetId === targetId && r.popupId === current.id);
  const myShowcase = db.showcases.find((s) => s.popupId === current.id);
  const t = brand ? trustScore(db, brand.id) : null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button className="font-bold underline underline-offset-2" onClick={() => navigate({ name: 'popup', id: current.id })}>{current.title}</button>
          <StatusPill status={current.status} />
        </div>
        <div className="text-[13px] text-ink-500 mt-0.5">{period(current.period)} · {sp.name}</div>
        {current.status !== '종료' && (
          <div className="mt-3 space-y-2">
            <p className="text-[12px] text-ink-500">데모에서는 날짜를 기다리지 않고 팝업을 진행시킬 수 있어요.</p>
            {current.status === '예정' && <Button full variant="dark" onClick={() => setPopupStatus(current.id, '진행 중')}>팝업 시작하기 <Demo /></Button>}
            {current.status === '진행 중' && <Button full variant="dark" onClick={() => setPopupStatus(current.id, '종료')}>팝업 종료하기 <Demo /></Button>}
          </div>
        )}
      </Card>

      {current.status !== '종료' && (
        <Card className="p-4">
          <div className="font-bold text-[15px] mb-3">팝업이 끝나면 이렇게 마무리해요</div>
          {[
            ['check', '성사 확인', '참여 브랜드와 임대인이 "무사히 마쳤어요"를 눌러요. 인증 공동 팝업 횟수가 올라가요'],
            ['star', '서로 후기', '함께한 브랜드와 공간에 후기를 남겨요. 신뢰 지수에 반영돼요'],
            ['chart', '팝업 리포트', '방문 인증, 조합 리뷰, 오픈 알림 수를 한눈에 봐요'],
            ['repeat', '다음 회차', '같은 팀으로 2회차를 바로 열 수 있어요'],
          ].map(([e, t, d], i) => (
            <div key={t} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full border border-ink-300 text-ink-700 flex items-center justify-center"><Icon name={e} className="w-4 h-4" /></span>
                {i < 3 && <span className="flex-1 w-px bg-ink-100 mt-1" />}
              </div>
              <div className="pb-1">
                <div className="text-sm font-bold">{t}</div>
                <div className="text-[12px] text-ink-500">{d}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
      {current.status === '종료' && <PopupReportCard popupId={current.id} />}
      {current.status === '종료' && comp && <CompletionStatus popupId={current.id} />}

      {comp?.verified && brand && (
        <div>
          <h3 className="text-[20px] font-extrabold tracking-tight mb-3">후기 남기기</h3>
          <div className="space-y-2">
            {team.members.filter((m) => m.brandId !== brand.id).map((m) => {
              const b = brandById(db, m.brandId)!;
              const done = written('brand_to_brand', b.id);
              return (
                <Card key={b.id} className="p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-[12px] text-ink-500 mt-0.5">함께한 브랜드 · 분담금, 역할, 소통</div>
                  </div>
                  <Button size="sm" variant={done ? 'secondary' : 'primary'} className="shrink-0" disabled={done} onClick={() => setForm({ kind: 'brand_to_brand', targetId: b.id, label: b.name })}>{done ? '작성 완료' : '후기 쓰기'}</Button>
                </Card>
              );
            })}
            <Card className="p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{sp.name}</div>
                <div className="text-[12px] text-ink-500 mt-0.5">공간 · 정보 정확성, 소통, 조건, 인수인계</div>
              </div>
              <Button size="sm" variant={written('brand_to_space', sp.id) ? 'secondary' : 'primary'} className="shrink-0" disabled={written('brand_to_space', sp.id)} onClick={() => setForm({ kind: 'brand_to_space', targetId: sp.id, label: sp.name })}>{written('brand_to_space', sp.id) ? '작성 완료' : '후기 쓰기'}</Button>
            </Card>
          </div>
          {t && (
            <div className="mt-4 rounded border border-ink-300 p-3.5 text-sm flex items-center gap-3">
              <span className="flex-1 min-w-0">내 신뢰 지수 <b>{t.score}</b> · 인증 공동 팝업 {t.verifiedPopups}회</span>
              <GradeBadge grade={t.grade} />
            </div>
          )}
          <div className="mt-4 rounded border border-ink-300 p-4">
            <div className="font-bold">팝업자랑으로 경험 남기기</div>
            <p className="text-[13px] text-ink-700 mt-1">함께 연 경험을 기록하면 다음 팀이 참고할 수 있어요. 방문객 조합 리뷰가 글 아래에 같이 보여요.</p>
            {myShowcase ? (
              <Button className="mt-3" variant="secondary" onClick={() => navigate({ name: 'showcase', id: myShowcase.id })}>내 팀 팝업자랑 보기</Button>
            ) : (
              <Button className="mt-3" onClick={() => navigate({ name: 'showcaseNew', teamId: team.id })}>팝업자랑 쓰기</Button>
            )}
          </div>
        </div>
      )}

      {comp?.verified && <NextRoundCard team={team} />}

      {popups.length > 1 && (
        <div>
          <h3 className="text-[20px] font-extrabold tracking-tight mb-3">지난 회차</h3>
          {popups.filter((p) => p.id !== current.id).map((p) => (
            <Card key={p.id} className="p-3 mb-1.5 flex justify-between items-center" onClick={() => navigate({ name: 'popup', id: p.id })}>
              <span className="text-sm font-semibold">{p.title}</span>
              <span className="text-[12px] text-ink-500">{period(p.period)}</span>
            </Card>
          ))}
        </div>
      )}

      {form && (
        <ReviewForm
          open
          kind={form.kind}
          targetLabel={form.label}
          onClose={() => setForm(null)}
          onSubmit={(scores, comment) => writeBizReview({ kind: form.kind, authorId: userId, targetId: form.targetId, teamId: team.id, popupId: current.id, scores, comment })}
        />
      )}
    </div>
  );
}

/** 임대인: 끝난 팝업의 성사 확인과 팀 후기 */
export function LandlordCompletions() {
  const { db, landlord, userId } = useMe();
  const [form, setForm] = useState<null | { teamId: string; popupId: string; label: string }>(null);
  if (!landlord) return null;
  const items = db.completions.filter((c) => c.required.includes(userId));
  const running = db.popups.filter((p) => landlord.spaceIds.includes(p.spaceId) && p.status !== '종료');
  if (!items.length && !running.length) return null;
  return (
    <div className="mb-5">
      {running.length > 0 && (
        <>
          <h3 className="text-[20px] font-extrabold tracking-tight mb-3">내 공간의 팝업</h3>
          <div className="space-y-2 mb-5">
            {running.map((p) => (
              <Card key={p.id} className="p-3.5">
                <div className="flex items-center justify-between">
                  <button className="font-semibold text-sm underline underline-offset-2" onClick={() => navigate({ name: 'popup', id: p.id })}>{p.title}</button>
                  <StatusPill status={p.status} />
                </div>
                <div className="text-[12px] text-ink-500">{spaceById(db, p.spaceId)?.name} · {period(p.period)}</div>
                <Button size="sm" variant="dark" className="mt-2" onClick={() => setPopupStatus(p.id, p.status === '예정' ? '진행 중' : '종료')}>
                  {p.status === '예정' ? '팝업 시작하기' : '팝업 종료하기'} <Demo />
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
      {items.length > 0 && <h3 className="text-[20px] font-extrabold tracking-tight mb-3">끝난 팝업 · 성사 확인</h3>}
      <div className="space-y-3">
        {items.map((c) => {
          const p = popupById(db, c.popupId)!;
          const t = teamById(db, c.teamId)!;
          const done = db.reviews.some((r) => r.kind === 'space_to_team' && r.authorId === userId && r.popupId === p.id);
          return (
            <div key={p.id}>
              <div className="text-[13px] mb-1.5"><b>{t.name}</b> · {p.title} · {period(p.period)}</div>
              {!c.verified ? (
                <CompletionStatus popupId={p.id} />
              ) : (
                <Card className="p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-1"><Icon name="check" className="w-4 h-4 text-emerald-700" /> 인증 공동 팝업</div>
                    <div className="text-[12px] text-ink-500 mt-0.5">팀 · 약속 이행, 이용 규칙, 원상복구, 일정</div>
                  </div>
                  <Button size="sm" className="shrink-0" disabled={done} variant={done ? 'secondary' : 'primary'} onClick={() => setForm({ teamId: t.id, popupId: p.id, label: t.name })}>{done ? '작성 완료' : '팀 후기 쓰기'}</Button>
                </Card>
              )}
            </div>
          );
        })}
      </div>
      {form && (
        <ReviewForm open kind="space_to_team" targetLabel={form.label} onClose={() => setForm(null)} onSubmit={(scores, comment) => writeBizReview({ kind: 'space_to_team', authorId: userId, targetId: form.teamId, teamId: form.teamId, popupId: form.popupId, scores, comment })} />
      )}
    </div>
  );
}

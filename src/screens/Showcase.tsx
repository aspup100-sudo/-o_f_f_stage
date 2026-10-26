import { spaceSrc } from '@/data/photos';
import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate, replace } from '@/store/store';
import { createShowcase, toggleShowcaseHelpful } from '@/store/actions';
import { brandById, displayName, period, spaceById, teamById, teamsOfBrand } from '@/store/logic';
import { BrandLogo } from '@/components/common';
import { Button, Card, cx, Demo, Empty, Field, Icon, inputCls, SubHeader, Swatch, Tag, textareaCls, Ic } from '@/components/ui';
import { ComboReviewList } from './Popup';
import { ReportButton } from './Report';

export function ShowcaseList() {
  const { db, brand } = useMe();
  const list = db.showcases.filter((s) => !s.hidden);
  // 끝난 내 팀 중 아직 자랑글이 없는 팀
  const untold = brand ? teamsOfBrand(db, brand.id).filter((t) => t.stage === '종료' && t.popupId && !db.showcases.some((s) => s.teamId === t.id)) : [];
  return (
    <div className="px-4 pt-4 space-y-3">
      {untold.map((t) => (
        <div key={t.id} className="rounded border border-ink-300 bg-white p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px]">{t.name} 팝업 기록 남기기</div>
            <p className="text-[12px] text-ink-700 mt-0.5">사진 몇 장과 운영 팁 한 줄이면 돼요. 다음 팀원을 찾을 때 신뢰가 쌓여요.</p>
          </div>
          <Button size="sm" onClick={() => navigate({ name: 'showcaseNew', teamId: t.id })}>쓰기</Button>
        </div>
      ))}
      {list.length === 0 && <Empty>아직 팝업자랑이 없어요</Empty>}
      {list.map((s) => {
        const sp = spaceById(db, s.spaceId);
        return (
          <Card key={s.id} className="overflow-hidden" onClick={() => navigate({ name: 'showcase', id: s.id })}>
            <div className="flex h-28 gap-0.5">
              {s.photoHues.slice(0, 3).map((h, i) => <Swatch key={i} src={spaceSrc({ id: s.spaceId ?? s.id }, i)} hue={h} pattern={(['solid', 'dot', 'grid'] as const)[i]} rounded="" className="flex-1" />)}
            </div>
            <div className="p-3.5">
              <div className="font-bold">{s.title}</div>
              <div className="text-[12px] text-ink-500 mt-0.5">{period(s.period)} · {sp?.name} · {teamById(db, s.teamId)?.name}</div>
              <div className="text-[12px] font-semibold text-ink-700 mt-1.5">{s.brandIds.map((b) => `@${brandById(db, b)?.name}`).join('  ')}</div>
              <p className="text-[13px] text-ink-700 mt-2 line-clamp-2"><Ic n="bulb" className="text-ink-500" />{s.tips}</p>
              <div className="text-[12px] text-ink-500 mt-2 flex items-center gap-1"><Icon name="heart" filled={!!s.helpful?.length} className="w-3.5 h-3.5 text-brand-500" /> 팁이 도움됐어요 {s.helpful?.length ?? 0}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function ShowcaseDetail({ id }: { id: string }) {
  const { db, userId } = useMe();
  const s = db.showcases.find((x) => x.id === id);
  if (!s) return <Empty>글을 찾을 수 없어요</Empty>;
  const sp = spaceById(db, s.spaceId);
  const team = teamById(db, s.teamId);
  const teamPopups = db.popups.filter((p) => p.teamId === s.teamId).map((p) => p.id);
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="팝업자랑" right={<ReportButton targetType="post" targetId={s.id} targetLabel={`팝업자랑: ${s.title}`} />} />
      <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
        {s.photoHues.map((h, i) => <Swatch key={i} src={spaceSrc({ id: s.spaceId ?? s.id }, i, 900)} hue={h} pattern={(['solid', 'dot', 'grid', 'stripe'] as const)[i % 4]} rounded="" className="w-72 h-56 shrink-0" label={`현장 사진 ${i + 1}`} />)}
      </div>
      <div className="p-4">
        <h1 className="text-xl font-extrabold">{s.title}</h1>
        <div className="text-[13px] text-ink-500 mt-1">{displayName(db, s.authorId)} · {s.createdAt}</div>
        <div className="mt-4 rounded border border-ink-100 divide-y divide-ink-100 text-sm">
          <div className="flex px-3.5 py-2.5"><span className="w-20 text-ink-500">팀</span><span className="font-semibold">{team?.name}</span></div>
          <div className="flex px-3.5 py-2.5"><span className="w-20 text-ink-500">기간</span><span className="font-semibold">{s.period.start} ~ {s.period.end}</span></div>
          {sp && <button className="flex px-3.5 py-2.5 w-full text-left" onClick={() => navigate({ name: 'space', id: sp.id })}><span className="w-20 text-ink-500">사용 공간</span><span className="font-semibold">{sp.name} ›</span></button>}
        </div>
        <h3 className="text-[17px] font-extrabold tracking-tight mt-8 mb-3">참여 브랜드</h3>
        <div className="flex gap-2 flex-wrap">
          {s.brandIds.map((bid) => {
            const b = brandById(db, bid)!;
            return (
              <button key={bid} onClick={() => navigate({ name: 'brand', id: bid })} className="flex items-center gap-1.5 pl-1 pr-3 h-9 rounded-full border border-ink-300">
                <BrandLogo brand={b} size={28} /><span className="text-sm font-semibold">{b.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[15px] leading-relaxed mt-5 whitespace-pre-line">{s.body}</p>
        <div className="mt-4 border-l-2 border-ink-900 pl-3 py-1">
          <div className="font-bold text-ink-900 mb-1"><Ic n="bulb" />운영 팁</div>
          <p className="text-sm text-ink-900 leading-relaxed">{s.tips}</p>
          {(() => {
            const on = !!s.helpful?.includes(userId);
            return (
              <button onClick={() => toggleShowcaseHelpful(s.id, userId)} className={cx('mt-3 h-9 px-3.5 rounded text-[13px] font-semibold flex items-center gap-1.5', on ? 'bg-brand-500 text-white' : 'bg-white text-ink-900 border border-ink-300')}>
                <Icon name="heart" filled={on} className="w-4 h-4" /> 팁이 도움됐어요 {s.helpful?.length ?? 0}
              </button>
            );
          })()}
        </div>
        {(s.sales || s.visitors) && (
          <div className="mt-3 rounded border border-ink-100 p-4">
            <div className="flex items-center gap-1.5 mb-2"><span className="font-bold text-sm">성과</span><Tag tone="blue">본인 공개 정보</Tag></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {s.sales && <div><div className="text-[12px] text-ink-500">매출</div><div className="font-bold">{s.sales}</div></div>}
              {s.visitors && <div><div className="text-[12px] text-ink-500">방문자 수</div><div className="font-bold">{s.visitors.toLocaleString()}명</div></div>}
            </div>
            <p className="text-[12px] text-ink-500 mt-2">팀이 직접 공개한 수치이며 OFF STAGE가 검증하지 않았어요.</p>
          </div>
        )}
        <h3 className="text-[17px] font-extrabold tracking-tight mt-9 mb-3">방문객 조합 리뷰</h3>
        <ComboReviewList db={db} popupIds={s.popupId ? [s.popupId] : teamPopups} />
      </div>
    </div>
  );
}

export function ShowcaseNew({ teamId }: { teamId: string }) {
  const { db, userId } = useMe();
  const team = teamById(db, teamId);
  const pop = db.popups.find((p) => p.id === team?.popupId);
  const [title, setTitle] = useState(`${pop?.title ?? team?.name} 후기`);
  const [body, setBody] = useState('');
  const [tips, setTips] = useState('');
  const [sales, setSales] = useState('');
  const [visitors, setVisitors] = useState('');
  const [hues, setHues] = useState<number[]>(team ? team.members.map((m) => brandById(db, m.brandId)!.logoHue) : []);
  if (!team || !pop) return <Empty>팀 정보를 찾을 수 없어요</Empty>;
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="팝업자랑 쓰기" />
      <div className="p-4">
        <div className="rounded border border-ink-300 p-3 text-sm mb-4">
          <b>{team.name}</b> · {period(pop.period)} · {spaceById(db, pop.spaceId)?.name}
          <div className="text-[12px] font-semibold text-ink-700 mt-1.5">{team.members.map((m) => `@${brandById(db, m.brandId)!.name}`).join('  ')}</div>
        </div>
        <Field label="사진" hint="데모에서는 예시 사진이 추가돼요">
          <div className="flex gap-1.5 flex-wrap">
            {hues.map((h, i) => <Swatch key={i} hue={h} className="w-16 h-16" />)}
            <button type="button" onClick={() => setHues([...hues, Math.floor(Math.random() * 360)])} className="w-16 h-16 rounded border-2 border-dashed border-ink-300 text-ink-500 text-xs">+ <Demo /></button>
          </div>
        </Field>
        <Field label="제목" required><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="이야기" required><textarea className={textareaCls + ' min-h-[120px]'} value={body} onChange={(e) => setBody(e.target.value)} placeholder="함께 열어 보니 어땠나요?" /></Field>
        <Field label="운영 팁" required><textarea className={textareaCls} value={tips} onChange={(e) => setTips(e.target.value)} placeholder="다음 팀에게 알려 주고 싶은 것" /></Field>
        <div className="flex items-center gap-1.5 mb-2"><span className="text-[13px] font-semibold text-ink-700">성과 (선택)</span><Tag tone="blue">본인 공개 정보</Tag></div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <input className={inputCls} value={sales} onChange={(e) => setSales(e.target.value)} placeholder="매출 (예: 약 500만원)" />
          <input className={inputCls} type="number" value={visitors} onChange={(e) => setVisitors(e.target.value)} placeholder="방문자 수" />
        </div>
        <Button full size="lg" disabled={!title.trim() || !body.trim() || !tips.trim()} onClick={() => {
          const id = createShowcase({ teamId, popupId: pop.id, title, period: pop.period, spaceId: pop.spaceId, brandIds: team.members.map((m) => m.brandId), photoHues: hues, tips, body, sales: sales || undefined, visitors: visitors ? Number(visitors) : undefined, authorId: userId });
          replace({ name: 'showcase', id });
        }}>올리기</Button>
      </div>
    </div>
  );
}

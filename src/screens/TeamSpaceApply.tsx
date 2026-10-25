import { useMe } from '@/store/hooks';
import { navigate, replace, switchRole } from '@/store/store';
import { decideSpaceApplication } from '@/store/actions';
import { manwon, period, spaceById } from '@/store/logic';
import { Button, Card, Demo, Empty, StatusPill, Ic } from '@/components/ui';
import type { Team } from '@/types';
import { SpaceCard } from './Space';

export function TeamSpaceTab({ team }: { team: Team }) {
  const { db } = useMe();
  const apps = db.spaceApplications.filter((a) => a.teamId === team.id);
  const accepted = apps.find((a) => a.status === 'accepted');
  const sp = spaceById(db, accepted?.spaceId);
  const offers = apps.filter((a) => a.direction === 'landlord' && a.status === 'pending');
  const mine = apps.filter((a) => a.direction === 'team');

  if (!team.confirmed) {
    return (
      <Empty icon="shield">
        공동 약속서에 전원이 동의해야 팀 단위로 공간에 지원할 수 있어요.
        <Button size="sm" className="mt-2" onClick={() => replace({ name: 'team', id: team.id, sub: 'agreement' })}>약속서로 가기</Button>
      </Empty>
    );
  }
  return (
    <div className="space-y-4">
      {accepted && sp ? (
        <div>
          <div className="rounded bg-emerald-50 border border-emerald-200 p-3.5 mb-3 text-sm text-emerald-800">
            <Ic n="check" /><b>{sp.name}</b> 이용이 확정됐어요 · {period(accepted.dates)}
          </div>
          <SpaceCard db={db} s={sp} />
        </div>
      ) : (
        <div className="rounded bg-brand-50 p-4">
          <div className="font-bold">아직 공간이 없어요</div>
          <p className="text-[13px] text-ink-700 mt-1">공간 찾기에서 팀 단위로 지원하면 무드보드로 만든 팀 소개 페이지가 함께 전달돼요.</p>
          <Button className="mt-3" onClick={() => navigate({ name: 'tab', tab: 'spaces' })}>공간 찾기</Button>
        </div>
      )}
      {offers.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">임대인이 먼저 제안했어요</h3>
          {offers.map((a) => {
            const s = spaceById(db, a.spaceId)!;
            return (
              <Card key={a.id} className="p-3.5 mb-2">
                <button className="font-bold underline underline-offset-2" onClick={() => navigate({ name: 'space', id: s.id })}>{s.name}</button>
                <div className="text-[13px] text-ink-500">{s.region} · 1일 {manwon(s.dailyFee)} · {period(a.dates)}</div>
                <p className="text-sm mt-1">"{a.message}"</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm" variant="secondary" onClick={() => decideSpaceApplication(a.id, false)}>괜찮아요</Button>
                  <Button size="sm" onClick={() => decideSpaceApplication(a.id, true)}>이 공간으로 할게요</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <div>
        <h3 className="font-bold mb-2">지원 현황</h3>
        {mine.length === 0 && <div className="text-sm text-ink-500">아직 지원한 공간이 없어요</div>}
        <div className="space-y-2">
          {mine.map((a) => {
            const s = spaceById(db, a.spaceId)!;
            return (
              <Card key={a.id} className="p-3.5 flex items-center justify-between" onClick={() => navigate({ name: 'space', id: s.id })}>
                <div>
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-[12px] text-ink-500">{period(a.dates)} · {s.region}</div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill status={a.status} />
                </div>
              </Card>
            );
          })}
        </div>
        {mine.filter((a) => a.status === 'pending').map((a) => {
          const s = spaceById(db, a.spaceId)!;
          const ll = db.landlords.find((l) => l.id === s.landlordId)!;
          return (
            <Button key={a.id} full variant="secondary" className="mt-2" onClick={() => { switchRole('landlord', ll.userId); navigate({ name: 'tab', tab: 'inbox' }); }}>
              {ll.name} 시점으로 수락하러 가기 <Demo />
            </Button>
          );
        })}
      </div>
    </div>
  );
}

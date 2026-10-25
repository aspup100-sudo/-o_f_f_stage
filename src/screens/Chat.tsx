import { useEffect, useRef, useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate } from '@/store/store';
import { markRoomRead, sendMessage } from '@/store/actions';
import { brandOfUser, chatUnread, dday, displayName, teamById, teamPrep, userById } from '@/store/logic';
import { Avatar, Empty, Icon, SubHeader, Card } from '@/components/ui';
import { ReportButton } from './Report';
import { ago } from './Notifications';
import type { Route } from '@/types';

export function ChatListScreen() {
  const { db, userId } = useMe();
  const lastAt = (id: string) => db.messages.filter((m) => m.roomId === id).reduce((t, m) => (m.at > t ? m.at : t), '');
  const rooms = db.chatRooms.filter((r) => r.memberIds.includes(userId)).sort((a, b) => (lastAt(b.id) || b.createdAt).localeCompare(lastAt(a.id) || a.createdAt));
  return (
    <div>
      <SubHeader title="채팅" />
      <div className="p-4 space-y-2">
        {rooms.length === 0 && <Empty icon="chat">아직 채팅이 없어요. 제안이 수락되거나 서로 관심을 표시하면 채팅방이 열려요.</Empty>}
        {rooms.map((r) => {
          const msgs = db.messages.filter((m) => m.roomId === r.id);
          const last = msgs[msgs.length - 1];
          const others = r.memberIds.filter((m) => m !== userId);
          const hue = brandOfUser(db, others[0])?.logoHue ?? 200;
          const team = r.context?.type === 'team' ? teamById(db, r.context.refId) : undefined;
          const unread = chatUnread(db, r.id, userId);
          const who = !last || last.senderId === 'system' ? '' : last.senderId === userId ? '나: ' : r.memberIds.length > 2 ? `${displayName(db, last.senderId)}: ` : '';
          return (
            <Card key={r.id} className="p-3.5 flex items-center gap-3" onClick={() => navigate({ name: 'chat', id: r.id })}>
              <Avatar name={r.title} hue={hue} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold truncate">{r.title}</span>
                  <span className="text-xs text-ink-500 shrink-0">{r.memberIds.length > 2 ? r.memberIds.length : ''}</span>
                  {team && team.popupId && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 rounded px-1.5 py-0.5 shrink-0">{dday(team.period.start)}</span>}
                  <span className="ml-auto text-[11px] text-ink-500 shrink-0">{last ? ago(last.at) : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={unread ? 'text-[13px] text-ink-900 font-semibold truncate flex-1' : 'text-[13px] text-ink-500 truncate flex-1'}>{last ? who + last.text : '대화를 시작해 보세요'}</div>
                  {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{unread}</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ChatScreen({ id }: { id: string }) {
  const { db, userId } = useMe();
  const room = db.chatRooms.find((r) => r.id === id);
  const msgs = db.messages.filter((m) => m.roomId === id);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [msgs.length]);
  useEffect(() => { if (room) markRoomRead(id, userId); }, [id, userId, msgs.length]);
  if (!room) return <Empty>채팅방을 찾을 수 없어요</Empty>;
  const ctx: Route | undefined =
    room.context?.type === 'team' ? { name: 'team', id: room.context.refId } :
    room.context?.type === 'space' ? { name: 'space', id: room.context.refId } :
    room.context?.type === 'recruit' ? { name: 'recruit', id: room.context.refId } :
    room.context?.type === 'interest' ? { name: 'brand', id: room.context.refId } : undefined;
  const send = () => { if (text.trim()) { sendMessage(id, text.trim()); setText(''); } };
  // 팀 채팅방이면 남은 준비 항목으로 빠른 메시지를 만든다
  const team = room.context?.type === 'team' ? teamById(db, room.context.refId) : undefined;
  const myBrand = brandOfUser(db, userId);
  const prep = team && myBrand && team.stage === '준비 중' ? teamPrep(db, team, myBrand.id) : undefined;
  const quick = [
    ...(prep ? prep.steps.filter((x) => !x.done).slice(0, 3).map((x) => {
      const name = x.label.replace(/ \(.*\)$/, '');
      return x.mine
        ? { label: `${name} 할게요`, text: `'${name}' 오늘 안에 할게요!` }
        : { label: `${name} 챙기기`, text: `[오픈 ${dday(team!.period.start)}] '${x.label}' 아직 남았어요! 팀 공간에서 같이 챙겨 주세요!` };
    }) : []),
    { label: '확인했어요', text: '확인했어요!' },
    { label: '좋아요', text: '좋아요!' },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f3f1]">
      <SubHeader
        title={<span>{room.title} <span className="text-ink-500 font-normal text-xs">{room.memberIds.length}명</span></span>}
        right={<ReportButton targetType="chat" targetId={room.id} targetLabel={`채팅: ${room.title}`} />}
      />
      {ctx && (
        <button onClick={() => navigate(ctx)} className="mx-4 mt-3 text-left text-[13px] bg-white rounded-xl px-3 py-2 border border-ink-100 flex items-center gap-2">
          <Icon name="sparkle" className="w-4 h-4 text-brand-500" />
          <span className="flex-1">{prep ? `팀 공간 · 오픈 ${dday(team!.period.start)} · 준비 ${prep.done}/${prep.steps.length}` : room.context?.type === 'team' ? '팀 공간 열기' : room.context?.type === 'space' ? '공간 상세 보기' : room.context?.type === 'interest' ? '상대 브랜드 프로필 보기' : '관련 글 보기'}</span>›
        </button>
      )}
      <div className="flex-1 px-4 py-4 space-y-2.5 pb-40">
        {msgs.map((m) => {
          if (m.senderId === 'system')
            return (
              <div key={m.id} className="text-center">
                <span className="inline-block text-[12px] bg-ink-300/40 text-ink-700 rounded-xl px-3 py-1.5 whitespace-pre-line max-w-[90%]">{m.text}</span>
              </div>
            );
          const mine = m.senderId === userId;
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex gap-2'}>
              {!mine && <Avatar name={displayName(db, m.senderId)} hue={brandOfUser(db, m.senderId)?.logoHue ?? 210} size={32} />}
              <div className="max-w-[75%]">
                {!mine && <div className="text-[11px] text-ink-500 mb-0.5">{userById(db, m.senderId)?.name}</div>}
                <div className={mine ? 'bg-brand-500 text-white rounded rounded-tr-sm px-3 py-2 text-sm' : 'bg-white rounded rounded-tl-sm px-3 py-2 text-sm'}>{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-ink-100 z-40 pb-[env(safe-area-inset-bottom)]">
        {room.memberIds.includes(userId) && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-2.5 pt-2.5">
            {quick.map((q) => (
              <button key={q.label} onClick={() => sendMessage(id, q.text)} className="h-8 px-3 rounded-md border border-ink-300 bg-white text-[12px] font-semibold whitespace-nowrap shrink-0">{q.label}</button>
            ))}
          </div>
        )}
        <div className="p-2.5 flex gap-2">
        <input className="flex-1 h-11 px-3 rounded-xl bg-ink-100 text-sm outline-none" placeholder="메시지 입력" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()} />
        <button onClick={send} className="h-11 px-4 rounded-xl bg-ink-900 text-white text-sm font-bold">전송</button>
        </div>
      </div>
    </div>
  );
}

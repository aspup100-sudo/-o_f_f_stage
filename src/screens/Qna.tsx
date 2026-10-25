import { useState } from 'react';
import { useMe, guard } from '@/store/hooks';
import { navigate, replace } from '@/store/store';
import { answerQna, createQna, openDirectChat } from '@/store/actions';
import { brandOfUser, displayName, landlordOfUser, trustScore } from '@/store/logic';
import { Avatar, Button, Card, Chip, Empty, Field, GradeBadge, Icon, inputCls, SubHeader, Tag, textareaCls, Ic } from '@/components/ui';
import { QNA_TAGS, type QnaTag } from '@/types';
import type { DB } from '@/data/mock';
import { ReportButton } from './Report';

function Author({ db, userId }: { db: DB; userId: string }) {
  const b = brandOfUser(db, userId);
  const l = landlordOfUser(db, userId);
  const grade = b ? trustScore(db, b.id).grade : l ? trustScore(db, l.id).grade : null;
  const role = b ? '브랜드' : l ? '임대인' : '방문객';
  return (
    <button disabled={!b} onClick={() => b && navigate({ name: 'brand', id: b.id })} className="flex items-center gap-1.5 text-left">
      <Avatar name={displayName(db, userId)} hue={b?.logoHue ?? 150} size={24} />
      <span className="text-[13px] font-semibold">{displayName(db, userId)}</span>
      <span className="text-[12px] text-ink-500">{role}</span>
      {grade && <GradeBadge grade={grade} small />}
    </button>
  );
}

export function QnaList() {
  const { db } = useMe();
  const [tag, setTag] = useState<QnaTag | '전체'>('전체');
  const [q, setQ] = useState('');
  const [waiting, setWaiting] = useState(false);
  const answers = (id: string) => db.qnaAnswers.filter((a) => a.postId === id).length;
  const list = db.qnaPosts
    .filter((p) => !p.hidden)
    .filter((p) => tag === '전체' || p.tag === tag)
    .filter((p) => !q || (p.title + p.body).includes(q))
    .filter((p) => !waiting || answers(p.id) === 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const waitingCount = db.qnaPosts.filter((p) => !p.hidden && answers(p.id) === 0).length;
  return (
    <div className="pt-4">
      <div className="px-4 flex gap-2 mb-2">
        <div className="flex-1 relative">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-3.5 text-ink-500" />
          <input className={inputCls + ' pl-9'} placeholder="원상복구, 신고, 비용…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="dark" className="h-11" onClick={() => navigate({ name: 'qnaNew' })}>질문하기</Button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
        {waitingCount > 0 && <Chip active={waiting} onClick={() => setWaiting(!waiting)}>답변 대기 {waitingCount}</Chip>}
        {(['전체', ...QNA_TAGS] as const).map((t) => <Chip key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Chip>)}
      </div>
      <div className="px-4 space-y-2">
        {list.map((p) => {
          const n = answers(p.id);
          return (
            <Card key={p.id} className="p-3.5" onClick={() => navigate({ name: 'qna', id: p.id })}>
              <div className="flex items-center gap-1.5 mb-1"><Tag tone="orange">{p.tag}</Tag><span className="text-[12px] text-ink-500">{p.createdAt}</span></div>
              <div className="font-bold text-[15px]">Q. {p.title}</div>
              <p className="text-[13px] text-ink-500 line-clamp-1 mt-0.5">{p.body}</p>
              {n > 0 ? (() => {
                const first = db.qnaAnswers.filter((x) => x.postId === p.id).sort((x, y) => x.createdAt.localeCompare(y.createdAt))[0];
                const l = landlordOfUser(db, first.authorId);
                return (
                  <div className="mt-2 rounded-md bg-emerald-50/70 px-3 py-2">
                    <div className="text-[12px] font-semibold text-emerald-700">A. {displayName(db, first.authorId)}{l ? ' · 임대인' : brandOfUser(db, first.authorId) ? ' · 브랜드' : ''}{n > 1 ? ` 외 답변 ${n - 1}개` : ''}</div>
                    <p className="text-[13px] text-ink-700 line-clamp-2 mt-0.5">{first.body}</p>
                  </div>
                );
              })() : <div className="text-[12px] mt-1.5 font-semibold text-brand-600"><Ic n="question" />답변을 기다려요 · 첫 답변을 남겨 주세요</div>}
            </Card>
          );
        })}
        {!list.length && <Empty icon="search">검색 결과가 없어요</Empty>}
      </div>
    </div>
  );
}

export function QnaDetail({ id }: { id: string }) {
  const { db, userId, role } = useMe();
  const p = db.qnaPosts.find((x) => x.id === id);
  const [text, setText] = useState('');
  if (!p) return <Empty>글을 찾을 수 없어요</Empty>;
  const answers = db.qnaAnswers.filter((a) => a.postId === p.id);
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="실무 Q&A" right={<ReportButton targetType="post" targetId={p.id} targetLabel={`Q&A: ${p.title}`} />} />
      <div className="p-4">
        <Tag tone="orange">{p.tag}</Tag>
        <h1 className="text-xl font-extrabold mt-2">Q. {p.title}</h1>
        <div className="mt-2"><Author db={db} userId={p.authorId} /></div>
        <p className="text-[15px] leading-relaxed mt-3">{p.body}</p>
        <h3 className="text-[17px] font-extrabold tracking-tight mt-9 mb-3">답변 {answers.length}</h3>
        <div className="space-y-2">
          {answers.map((a) => (
            <Card key={a.id} className="p-3.5">
              <Author db={db} userId={a.authorId} />
              <p className="text-sm text-ink-700 mt-2 leading-relaxed">{a.body}</p>
              {a.authorId !== userId && role !== 'visitor' && role !== 'admin' && (
                <button className="text-[12px] text-ink-700 underline underline-offset-2 mt-2" onClick={() => guard(() => openDirectChat(a.authorId, `Q&A: ${p.title.slice(0, 12)}…`))}><Ic n="lock" /> 비공개로 더 묻기 (채팅)</button>
              )}
            </Card>
          ))}
        </div>
        {role !== 'admin' && (
          <div className="mt-4">
            <textarea className={textareaCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="경험을 나눠 주세요" />
            <Button full className="mt-2" disabled={!text.trim()} onClick={() => { answerQna(p.id, userId, text.trim()); setText(''); }}>답변 등록</Button>
            <p className="text-[12px] text-ink-500 mt-2">가격 협상처럼 민감한 내용은 공개 답변 대신 "비공개로 묻기"를 써 주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function QnaNew() {
  const { userId } = useMe();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<QnaTag>('운영');
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="질문하기" />
      <div className="p-4">
        <Field label="분류">
          <div className="flex flex-wrap gap-1.5">{QNA_TAGS.map((t) => <Chip key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Chip>)}</div>
        </Field>
        <Field label="제목" required><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="내용" required><textarea className={textareaCls + ' min-h-[140px]'} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        {tag === '비용' && <p className="text-[12px] text-ink-700 border-l-2 border-amber-500 pl-2.5 py-1 mb-3">특정 공간의 가격 협상은 공간 상세의 "비공개로 묻기"(채팅)를 이용해 주세요.</p>}
        <Button full size="lg" disabled={!title.trim() || !body.trim()} onClick={() => { const id = createQna(userId, title, body, tag); replace({ name: 'qna', id }); }}>올리기</Button>
      </div>
    </div>
  );
}

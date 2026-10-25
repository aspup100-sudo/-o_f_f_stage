import { useRef, useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate, replace, toast } from '@/store/store';
import { publishMagazine, toggleMagazineHidden, toggleMagazineLike } from '@/store/actions';
import { ScreenTitle } from '@/components/common';
import { Button, Card, Chip, cx, Empty, Field, Icon, inputCls, SubHeader, Tag, textareaCls } from '@/components/ui';
import { MAGAZINE_CATEGORIES, OFFICIAL_INSTAGRAM, REGIONS, type MagazineCard, type MagazineCategory, type MagazinePost, type Region } from '@/types';

/** 공식 인스타그램 링크 */
export function OfficialInsta({ compact }: { compact?: boolean }) {
  return (
    <a
      href={`https://www.instagram.com/${OFFICIAL_INSTAGRAM}/`}
      target="_blank"
      rel="noreferrer"
      className={cx('flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white', compact ? 'px-3 py-2' : 'p-3.5')}
    >
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#f9a03f,#e1306c 55%,#833ab4)' }}>IG</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">@{OFFICIAL_INSTAGRAM}</span>
        <span className="block text-[12px] text-ink-500">공식 인스타그램 · 매거진 카드뉴스를 먼저 받아 보세요</span>
      </span>
      <span className="text-ink-300">↗</span>
    </a>
  );
}

/** 카드뉴스 한 장 */
function CardFace({ post, card, index, total }: { post: Pick<MagazinePost, 'hue' | 'category' | 'title'>; card: MagazineCard; index: number; total: number }) {
  const cover = index === 0;
  return (
    <div
      className="relative aspect-square w-full rounded-3xl overflow-hidden p-6 flex flex-col"
      style={{ background: cover ? `linear-gradient(160deg, hsl(${post.hue} 55% 42%), hsl(${(post.hue + 30) % 360} 50% 22%))` : `hsl(${post.hue} 40% 96%)`, color: cover ? '#fff' : `hsl(${post.hue} 45% 18%)` }}
    >
      <div className="flex items-center justify-between text-[11px] font-bold opacity-80">
        <span>{post.category}</span>
        <span className="tabular-nums">{index + 1} / {total}</span>
      </div>
      <div className={cx('flex-1 flex flex-col', cover ? 'justify-end' : 'justify-center')}>
        {card.stat && <div className="text-5xl font-black tracking-tight mb-2" style={{ color: `hsl(${post.hue} 60% 40%)` }}>{card.stat}</div>}
        <div className={cx('font-extrabold leading-snug', cover ? 'text-[26px]' : 'text-xl')} style={{ textWrap: 'balance' } as React.CSSProperties}>{cover ? post.title : card.heading}</div>
        <p className={cx('mt-2 leading-relaxed', cover ? 'text-sm opacity-80' : 'text-[15px]')}>{card.body}</p>
      </div>
      <div className="text-[11px] font-bold opacity-60">OFF STAGE 매거진 · @{OFFICIAL_INSTAGRAM}</div>
    </div>
  );
}

export function MagazineThumb({ post, wide }: { post: MagazinePost; wide?: boolean }) {
  return (
    <button onClick={() => navigate({ name: 'magazine', id: post.id })} className={cx('text-left shrink-0', wide ? 'w-full' : 'w-[200px]')}>
      <div className="rounded-2xl overflow-hidden">
        <CardFace post={post} card={post.cards[0]} index={0} total={post.cards.length} />
      </div>
      <div className="mt-1.5 text-[12px] text-ink-500">{post.category} · {post.createdAt.slice(5).replace('-', '/')}</div>
      <div className="text-sm font-bold leading-snug line-clamp-2">{post.title}</div>
    </button>
  );
}

export function MagazineList() {
  const { db } = useMe();
  const [cat, setCat] = useState<MagazineCategory | '전체'>('전체');
  const list = db.magazines.filter((m) => !m.hidden && (cat === '전체' || m.category === cat));
  return (
    <div className="px-4 pt-4">
      <p className="text-[13px] text-ink-500 mb-2">팝업 동향, 새로 뜨는 지역, 운영 팁을 카드뉴스로 정리해요.</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
        {(['전체', ...MAGAZINE_CATEGORIES] as const).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {list.map((m) => <MagazineThumb key={m.id} post={m} wide />)}
      </div>
      {!list.length && <Empty>아직 글이 없어요</Empty>}
      <div className="mt-6"><OfficialInsta /></div>
    </div>
  );
}

export function MagazineDetail({ id }: { id: string }) {
  const { db, userId } = useMe();
  const m = db.magazines.find((x) => x.id === id);
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  if (!m) return <Empty>글을 찾을 수 없어요</Empty>;
  const liked = m.likes.includes(userId);
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
  };
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="매거진" />
      <div className="pt-4">
        <div
          ref={ref}
          onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {m.cards.map((c, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-4">
              <CardFace post={m} card={c} index={i} total={m.cards.length} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button disabled={page === 0} onClick={() => go(page - 1)} className="w-9 h-9 rounded-full border border-ink-300 disabled:opacity-30" aria-label="이전 카드">‹</button>
          <div className="flex gap-1.5">
            {m.cards.map((_, i) => <button key={i} onClick={() => go(i)} aria-label={`${i + 1}번 카드`} className={cx('h-1.5 rounded-full transition-all', i === page ? 'w-5 bg-ink-900' : 'w-1.5 bg-ink-300')} />)}
          </div>
          <button disabled={page === m.cards.length - 1} onClick={() => go(page + 1)} className="w-9 h-9 rounded-full border border-ink-300 disabled:opacity-30" aria-label="다음 카드">›</button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5"><Tag tone="orange">{m.category}</Tag>{m.region && <Tag>{m.region}</Tag>}<span className="text-[12px] text-ink-500">{m.createdAt} · OFF STAGE 운영팀</span></div>
        <h1 className="text-xl font-extrabold mt-2">{m.title}</h1>
        <p className="text-sm text-ink-500 mt-0.5">{m.subtitle}</p>
        <div className="flex gap-2 mt-4">
          <Button variant={liked ? 'secondary' : 'dark'} onClick={() => toggleMagazineLike(m.id, userId)}>
            <Icon name="heart" filled={liked} className="w-4 h-4" /> 도움이 됐어요 {m.likes.length}
          </Button>
          <Button variant="secondary" aria-label="공유" onClick={() => shareMagazine(m)}>공유</Button>
          {m.link && <Button variant="secondary" onClick={() => navigate(m.link!)}>{m.link.name === 'tab' ? '이 지역 공간 보기' : m.link.name === 'showcase' ? '팝업자랑 원문 보기' : '관련 글 보기'} ›</Button>}
        </div>
        <div className="mt-6"><OfficialInsta /></div>
      </div>
    </div>
  );
}

/** 관리자: 매거진 관리 */
export function MagazineAdminTab() {
  const { db } = useMe();
  return (
    <div>
      <ScreenTitle right={<Button size="sm" onClick={() => navigate({ name: 'magazineNew' })}>+ 카드뉴스 쓰기</Button>}>매거진</ScreenTitle>
      <div className="px-4 space-y-2">
        <OfficialInsta compact />
        {db.magazines.map((m) => (
          <Card key={m.id} className={cx('p-3 flex gap-3 items-center', m.hidden && 'opacity-50')}>
            <div className="w-16 shrink-0 rounded-xl overflow-hidden" onClick={() => navigate({ name: 'magazine', id: m.id })}>
              <CardFace post={m} card={m.cards[0]} index={0} total={m.cards.length} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-ink-500">{m.category} · {m.createdAt} · 카드 {m.cards.length}장 · ♥ {m.likes.length}</div>
              <div className="font-semibold text-sm truncate">{m.title}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => toggleMagazineHidden(m.id)}>{m.hidden ? '다시 공개' : '숨기기'}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MagazineNew() {
  const [category, setCategory] = useState<MagazineCategory>('뜨는 지역');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [region, setRegion] = useState<Region | undefined>();
  const [hue, setHue] = useState(18);
  const [cards, setCards] = useState<MagazineCard[]>([{ heading: '표지', body: '' }, { heading: '', body: '', stat: '' }]);
  const set = (i: number, patch: Partial<MagazineCard>) => setCards(cards.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const ok = title.trim() && cards.length >= 2 && cards.slice(1).every((c) => c.heading.trim() && c.body.trim());
  return (
    <div className="bg-white min-h-screen">
      <SubHeader title="카드뉴스 쓰기" />
      <div className="p-4">
        <Field label="분류">
          <div className="flex flex-wrap gap-1.5">{MAGAZINE_CATEGORIES.map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}</div>
        </Field>
        <Field label="제목" required><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 11월, 망원이 뜬다" /></Field>
        <Field label="부제"><input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
        <Field label="관련 지역 (선택)">
          <div className="flex flex-wrap gap-1.5">{REGIONS.map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? undefined : r)}>{r}</Chip>)}</div>
        </Field>
        <Field label="표지 색">
          <div className="flex gap-2">{[18, 150, 220, 75, 330, 260].map((h) => <button key={h} onClick={() => setHue(h)} className={cx('w-9 h-9 rounded-full border-2', hue === h ? 'border-ink-900' : 'border-transparent')} style={{ background: `hsl(${h} 55% 42%)` }} aria-label={`색 ${h}`} />)}</div>
        </Field>
        <Field label="표지 설명"><textarea className={textareaCls} value={cards[0].body} onChange={(e) => set(0, { body: e.target.value })} placeholder="표지에 들어갈 한두 줄" /></Field>
        {cards.slice(1).map((c, k) => {
          const i = k + 1;
          return (
            <div key={i} className="rounded-2xl border border-ink-100 p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] font-bold">카드 {i + 1}</span>
                {cards.length > 2 && <button className="text-[12px] text-ink-500" onClick={() => setCards(cards.filter((_, j) => j !== i))}>삭제</button>}
              </div>
              <input className={inputCls + ' mb-2'} value={c.heading} onChange={(e) => set(i, { heading: e.target.value })} placeholder="소제목" />
              <input className={inputCls + ' mb-2'} value={c.stat ?? ''} onChange={(e) => set(i, { stat: e.target.value })} placeholder="강조 숫자 (선택, 예: +48%)" />
              <textarea className={textareaCls} value={c.body} onChange={(e) => set(i, { body: e.target.value })} placeholder="본문" />
            </div>
          );
        })}
        {cards.length < 8 && <button className="text-sm text-brand-600 font-semibold mb-4" onClick={() => setCards([...cards, { heading: '', body: '', stat: '' }])}>+ 카드 추가</button>}
        <div className="text-[13px] font-semibold text-ink-700 mb-1.5">표지 미리보기</div>
        <div className="w-48 mb-4"><CardFace post={{ hue, category, title: title || '제목' }} card={cards[0]} index={0} total={cards.length} /></div>
        <Button full size="lg" disabled={!ok} onClick={() => {
          const id = publishMagazine({ category, title, subtitle, region, hue, cards: cards.map((c) => ({ ...c, stat: c.stat?.trim() || undefined })) });
          replace({ name: 'magazine', id });
        }}>발행하기</Button>
        <p className="text-[11px] text-ink-500 text-center mt-2">발행하면 브랜드와 방문객에게 알림이 가요. 같은 카드를 공식 인스타그램 @{OFFICIAL_INSTAGRAM}에도 올려 보세요.</p>
      </div>
    </div>
  );
}

/** 휴대폰이면 공유 시트를, 아니면 링크 복사를 쓴다. */
async function shareMagazine(m: MagazinePost) {
  const url = 'https://aspup100-sudo.github.io/-o_f_f_stage/'; // 공개 웹 주소
  const text = `${m.title} · OFF STAGE 매거진`;
  try {
    if (navigator.share) {
      await navigator.share({ title: m.title, text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('링크를 복사했어요. 친구에게 붙여 넣어 보내 보세요');
  } catch {
    toast('공유를 취소했어요');
  }
}

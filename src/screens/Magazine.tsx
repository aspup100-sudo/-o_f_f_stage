import { useEffect, useRef, useState } from 'react';
import { useMe } from '@/store/hooks';
import { shareLink } from '@/store/share';
import { navigate, replace } from '@/store/store';
import { markMagazineRead, publishMagazine, toggleMagazineHidden, toggleMagazineLike } from '@/store/actions';
import { daysUntil } from '@/store/logic';
import { ScreenTitle } from '@/components/common';
import { pickPhotos } from '@/components/photoPick';
import { Button, Card, Chip, cx, Empty, Field, Icon, inputCls, SubHeader, Tag, textareaCls } from '@/components/ui';
import { MAGAZINE_CATEGORIES, MAGAZINE_FOOTERS, MAGAZINE_HEADLINES, OFFICIAL_INSTAGRAM, REGIONS, normalizeInstagramUrl, type MagazineCard, type MagazineCategory, type MagazinePost, type Region } from '@/types';

/** 공식 인스타그램 링크 */
export function OfficialInsta({ compact }: { compact?: boolean }) {
  return (
    <a
      href={`https://www.instagram.com/${OFFICIAL_INSTAGRAM}/`}
      target="_blank"
      rel="noreferrer"
      className={cx('flex items-center gap-2.5 rounded border border-ink-100 bg-white', compact ? 'px-3 py-2' : 'p-3.5')}
    >
      <span className="w-9 h-9 rounded flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#f9a03f,#e1306c 55%,#833ab4)' }}>IG</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">@{OFFICIAL_INSTAGRAM}</span>
        <span className="block text-[12px] text-ink-500">공식 인스타그램 · 매거진 카드뉴스를 먼저 받아 보세요</span>
      </span>
      <span className="text-ink-400">↗</span>
    </a>
  );
}

type CoverPost = Pick<MagazinePost, 'hue' | 'category' | 'title'> & Partial<Pick<MagazinePost, 'subtitle' | 'headline' | 'issue' | 'coverImage'>>;

/** 표지: 단색 배경 + 큰 영문 제목 + 한글 제목 (글자 크기는 카드 너비에 비례) */
function CoverFace({ post, className }: { post: CoverPost; className?: string }) {
  // 인스타에 올린 표지 이미지가 있으면 그대로 보여 준다
  if (post.coverImage) {
    return (
      <div className={cx('relative aspect-square w-full overflow-hidden bg-ink-100', className)}>
        <img src={post.coverImage} alt={post.title} draggable={false} className="w-full h-full object-cover block" />
      </div>
    );
  }
  const h = post.hue;
  const headline = (post.headline?.trim() || MAGAZINE_HEADLINES[post.category]).toUpperCase();
  return (
    <div
      className={cx('relative aspect-square w-full overflow-hidden text-white', className)}
      style={{ containerType: 'inline-size', background: `hsl(${h} 54% 57%)` }}
    >
      {/* 하단 색 블록 */}
      <div className="absolute" style={{ left: '43.5%', top: '73.1%', width: '44.4%', bottom: 0, background: `hsl(${h} 54% 45%)` }} />
      <div className="absolute" style={{ left: '87.9%', top: '83.3%', right: 0, bottom: 0, background: `hsl(${h} 62% 70%)` }} />
      <div className="absolute inset-0 flex flex-col" style={{ padding: '6.7cqw' }}>
        <div className="flex items-center justify-between font-extrabold" style={{ fontSize: '2.1cqw', letterSpacing: '.22em' }}>
          <span>OFFSTAGE MAGAZINE</span>
          <span>{post.issue ? `ISSUE ${String(post.issue).padStart(2, '0')}` : post.category}</span>
        </div>
        <div style={{ height: '.25cqw', background: '#fff', marginTop: '3.6cqw' }} />
        <div className="font-black" style={{ fontSize: '15.5cqw', lineHeight: 0.92, letterSpacing: '-.035em', marginTop: '3.4cqw' }}>
          {headline.split(' ').map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div className="font-extrabold break-keep" style={{ fontSize: '4.6cqw', lineHeight: 1.3, marginTop: '5cqw', maxWidth: '78cqw', textWrap: 'balance' } as React.CSSProperties}>{post.title}</div>
        {post.subtitle && <div className="break-keep" style={{ fontSize: '2.4cqw', marginTop: '2.4cqw', opacity: 0.88, maxWidth: '78cqw' }}>{post.subtitle}</div>}
        <div className="mt-auto flex items-end justify-between font-bold" style={{ fontSize: '2.1cqw', letterSpacing: '.2em' }}>
          <span className="relative">{MAGAZINE_FOOTERS[post.category]}</span>
          <span className="relative">SWIPE →</span>
        </div>
      </div>
    </div>
  );
}

/** 카드뉴스 한 장 */
function CardFace({ post, card, index, total }: { post: CoverPost; card: MagazineCard; index: number; total: number }) {
  if (index === 0) return <CoverFace post={post} className="rounded" />;
  return (
    <div
      className="relative aspect-square w-full rounded overflow-hidden p-6 flex flex-col"
      style={{ background: `hsl(${post.hue} 40% 96%)`, color: `hsl(${post.hue} 45% 18%)` }}
    >
      <div className="flex items-center justify-between text-[12px] font-bold opacity-80">
        <span>{post.category}</span>
        <span className="tabular-nums">{index + 1} / {total}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        {card.stat && <div className="text-5xl font-black tracking-tight mb-2" style={{ color: `hsl(${post.hue} 60% 40%)` }}>{card.stat}</div>}
        <div className="font-extrabold leading-snug text-xl" style={{ textWrap: 'balance' } as React.CSSProperties}>{card.heading}</div>
        <p className="mt-2 leading-relaxed text-[15px]">{card.body}</p>
      </div>
      <div className="text-[12px] font-bold opacity-60">OFFSTAGE 매거진 · @{OFFICIAL_INSTAGRAM}</div>
    </div>
  );
}

export function MagazineThumb({ post, wide }: { post: MagazinePost; wide?: boolean }) {
  const { user } = useMe();
  // 최근 7일 안에 올라왔고 아직 안 읽은 글
  const fresh = daysUntil(post.createdAt) >= -7 && !user?.readMagazines?.includes(post.id);
  return (
    <button onClick={() => navigate({ name: 'magazine', id: post.id })} className={cx('block text-left shrink-0 self-start align-top', wide ? 'w-full' : 'w-[200px]')}>
      {/* 목록용 표지: 상세 표지와 같은 디자인 */}
      <div className="relative">
        <CoverFace post={post} className="rounded" />
        {fresh && <span className="absolute top-2 right-2 bg-white text-ink-900 rounded px-1 py-px text-[9px] font-black">NEW</span>}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-500">{post.category} · {post.createdAt.slice(5).replace('-', '/')}</div>
      <div className="text-[13px] text-ink-700 leading-snug line-clamp-2">{post.subtitle}</div>
    </button>
  );
}

export function MagazineList() {
  const { db } = useMe();
  const [cat, setCat] = useState<MagazineCategory | '전체'>('전체');
  const list = db.magazines.filter((m) => !m.hidden && (cat === '전체' || m.category === cat));
  return (
    <div className="px-4 pt-4">
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
  useEffect(() => { setPage(0); ref.current?.scrollTo({ left: 0 }); window.scrollTo({ top: 0 }); markMagazineRead(id, userId); }, [id, userId]);
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
            <div
              key={i}
              className="w-full shrink-0 snap-center px-4 cursor-pointer"
              onClick={(e) => {
                // 인스타 스토리처럼 왼쪽 1/3은 이전, 나머지는 다음 카드
                const r = e.currentTarget.getBoundingClientRect();
                if (e.clientX - r.left < r.width / 3) go(Math.max(0, i - 1));
                else go(Math.min(m.cards.length - 1, i + 1));
              }}
            >
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
          {m.instagramUrl && <a href={m.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded border border-ink-200 px-3 text-sm font-semibold text-ink-900">인스타에서 보기 ↗</a>}
          {m.link && <Button variant="secondary" onClick={() => navigate(m.link!)}>{m.link.name === 'tab' ? '이 지역 공간 보기' : m.link.name === 'showcase' ? '팝업자랑 원문 보기' : '관련 글 보기'} ›</Button>}
        </div>
        {(() => {
          const more = db.magazines.filter((x) => !x.hidden && x.id !== m.id).slice(0, 4);
          if (!more.length) return null;
          return (
            <>
              <h3 className="text-[17px] font-extrabold tracking-tight mt-9 mb-3.5">다른 글도 읽어 보세요</h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {more.map((x) => <MagazineThumb key={x.id} post={x} />)}
              </div>
            </>
          );
        })()}
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
            <div className="w-16 shrink-0 rounded overflow-hidden" onClick={() => navigate({ name: 'magazine', id: m.id })}>
              <CardFace post={m} card={m.cards[0]} index={0} total={m.cards.length} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-ink-500">{m.category} · {m.createdAt} · 카드 {m.cards.length}장 · 좋아요 {m.likes.length}</div>
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
  const [coverImage, setCoverImage] = useState<string | undefined>();
  const [instaRaw, setInstaRaw] = useState('');
  const instagramUrl = normalizeInstagramUrl(instaRaw);
  const instaBad = instaRaw.trim() !== '' && !instagramUrl;
  const [cards, setCards] = useState<MagazineCard[]>([{ heading: '표지', body: '' }, { heading: '', body: '', stat: '' }]);
  const set = (i: number, patch: Partial<MagazineCard>) => setCards(cards.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const ok = title.trim() && !instaBad && cards.length >= 2 && cards.slice(1).every((c) => c.heading.trim() && c.body.trim());
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
        <Field label="표지 이미지 (선택)">
          {coverImage ? (
            <div className="flex items-center gap-3">
              <img src={coverImage} alt="표지 미리보기" className="w-20 h-20 object-cover rounded" />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={async () => { const u = await pickPhotos(1, 1080); if (u[0]) setCoverImage(u[0]); }}>바꾸기</Button>
                <Button size="sm" variant="secondary" onClick={() => setCoverImage(undefined)}>지우기</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={async () => { const u = await pickPhotos(1, 1080); if (u[0]) setCoverImage(u[0]); }}>+ 인스타에 올린 표지 이미지 올리기</Button>
          )}
          <p className="text-[12px] text-ink-500 mt-1.5">올리면 아래 자동 표지 대신 이 이미지가 표지로 보여요. 정사각형(1:1) 이미지가 가장 잘 맞아요.</p>
        </Field>
        <Field label="인스타그램 게시물 링크 (선택)">
          <input className={inputCls} value={instaRaw} onChange={(e) => setInstaRaw(e.target.value)} inputMode="url" placeholder="https://www.instagram.com/p/..." />
          {instaBad && <p className="text-[12px] text-red-600 mt-1">인스타그램 게시물 주소(instagram.com)만 넣을 수 있어요</p>}
          {!instaBad && <p className="text-[12px] text-ink-500 mt-1">글 하단에 "인스타에서 보기" 버튼이 생겨요.</p>}
        </Field>
        <Field label="표지 설명"><textarea className={textareaCls} value={cards[0].body} onChange={(e) => set(0, { body: e.target.value })} placeholder="표지에 들어갈 한두 줄" /></Field>
        {cards.slice(1).map((c, k) => {
          const i = k + 1;
          return (
            <div key={i} className="rounded border border-ink-100 p-3 mb-3">
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
        <div className="text-[13px] font-semibold text-ink-700 mb-1.5">미리보기 <span className="font-normal text-ink-500">· 옆으로 넘겨 보세요</span></div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          {cards.map((c, i) => (
            <div key={i} className="w-48 shrink-0">
              <CardFace post={{ hue, category, title: title || '제목', subtitle, coverImage }} card={i === 0 ? c : { ...c, heading: c.heading || '소제목', body: c.body || '본문이 여기에 들어가요' }} index={i} total={cards.length} />
            </div>
          ))}
        </div>
        <Button full size="lg" disabled={!ok} onClick={() => {
          const id = publishMagazine({ category, title, subtitle, region, hue, coverImage, instagramUrl, cards: cards.map((c) => ({ ...c, stat: c.stat?.trim() || undefined })) });
          replace({ name: 'magazine', id });
        }}>발행하기</Button>
        <p className="text-[12px] text-ink-500 text-center mt-2">발행하면 브랜드와 방문객에게 알림이 가요. 같은 카드를 공식 인스타그램 @{OFFICIAL_INSTAGRAM}에도 올려 보세요.</p>
      </div>
    </div>
  );
}

/** 휴대폰이면 공유 시트를, 아니면 링크 복사를 쓴다. */
function shareMagazine(m: MagazinePost) {
  return shareLink(m.title, `${m.title} · OFF STAGE 매거진`, { name: 'magazine', id: m.id });
}

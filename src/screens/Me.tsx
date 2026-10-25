import { useState } from 'react';
import { useMe } from '@/store/hooks';
import { navigate, update } from '@/store/store';
import { importInstagram, isValidBizNumber, requestVerification, sendFollowerNews, updateBrandProfile } from '@/store/actions';
import { brandById, period, popupById, trustScore } from '@/store/logic';
import { BrandLogo, ScreenTitle, TagPicker, ThemeTagList, TrustLine } from '@/components/common';
import { Avatar, Button, Card, Demo, Field, GradeBadge, Icon, inputCls, Sheet, Tag, textareaCls } from '@/components/ui';
import type { ThemeTags } from '@/types';
import { ROLE_LABEL } from '@/config';
import { RentalMeCard } from './Rental';
import { OfficialInsta } from './Magazine';
import { InstallApp } from '@/components/InstallApp';

export default function MeScreen() {
  const { db, user, role, brand, landlord, visitor } = useMe();
  return (
    <div>
      <ScreenTitle>내 정보</ScreenTitle>
      <div className="px-4 space-y-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            {brand ? <BrandLogo brand={brand} size={52} /> : <Avatar name={user.name || '?'} size={52} hue={200} />}
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-lg truncate">{user.name}</div>
              <div className="flex gap-1 mt-0.5">
                <Tag>{ROLE_LABEL[role]}</Tag>
                <Tag tone={user.provider === 'kakao' ? 'yellow' : 'green'}>{user.provider === 'kakao' ? '카카오' : '네이버'} 로그인</Tag>
              </div>
            </div>
          </div>
          {(brand || landlord) && (
            <div className="mt-3">
              <TrustLine db={db} subjectId={(brand ?? landlord)!.id} />
            </div>
          )}
        </Card>

        {(role === 'brand' || role === 'landlord') && <VerifyCard />}

        {brand && <BrandSection />}
        {landlord && (
          <Card className="p-4">
            <div className="font-bold mb-1">운영 공간 {landlord.spaceIds.length}곳</div>
            <p className="text-sm text-ink-500 mb-3">{landlord.intro}</p>
            <Button variant="secondary" full onClick={() => navigate({ name: 'tab', tab: 'myspaces' })}>내 공간 관리</Button>
          </Card>
        )}
        {visitor && <VisitorSection />}
        {role === 'rental' && <RentalMeCard />}

        <InstallApp />
        <OfficialInsta />

        <Card className="divide-y divide-ink-100">
          <MenuRow icon="bell" label="알림" onClick={() => navigate({ name: 'notifications' })} />
          <MenuRow icon="chat" label="채팅" onClick={() => navigate({ name: 'chatList' })} />
          <MenuRow icon="star" label="신뢰 지수와 등급 안내" onClick={() => setRulesOpen(true)} />
          <MenuRow icon="swap" label="로그아웃 (새 계정으로 가입해 보기)" onClick={() => update((s) => { s.session.stack = [{ name: 'onboarding' }]; s.session.onboarding = { step: 0 }; })} />
        </Card>
      </div>
      <TrustRulesSheet />
    </div>
  );
}

let setRulesOpen: (v: boolean) => void = () => {};
function TrustRulesSheet() {
  const [open, setOpen] = useState(false);
  setRulesOpen = setOpen;
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="신뢰 지수와 등급">
      <div className="space-y-1.5 text-sm mb-4">
        {[['시작 점수', '50'], ['인증 공동 팝업 1회', '+2'], ['받은 후기 평균 4.5 이상', '+1'], ['받은 후기 평균 4.0 미만', '-1'], ['노쇼', '-10'], ['일방적 취소', '-3'], ['신고 확정', '-5']].map(([k, v]) => (
          <div key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></div>
        ))}
      </div>
      <p className="text-xs text-ink-500 mb-4">같은 상대와 반복된 후기는 두 번째부터 반영치를 절반으로 낮춰요. 서로 좋은 후기만 주고받는 것을 막기 위해서예요.</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5"><GradeBadge grade="새싹" /> 인증 팝업 0회</div>
        <div className="flex items-center gap-1.5"><GradeBadge grade="브론즈" /> 55점 미만</div>
        <div className="flex items-center gap-1.5"><GradeBadge grade="실버" /> 55점 이상</div>
        <div className="flex items-center gap-1.5"><GradeBadge grade="골드" /> 58점 이상</div>
      </div>
      <p className="text-xs text-lime-700 mt-4">🌱 새싹은 불이익이 아니에요. 처음 시작하는 브랜드라는 뜻이에요.</p>
    </Sheet>
  );
}

function MenuRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 h-12 text-sm text-left">
      <Icon name={icon} className="w-5 h-5 text-ink-500" />
      <span className="flex-1">{label}</span>
      <span className="text-ink-300">›</span>
    </button>
  );
}

function VerifyCard() {
  const { user, userId } = useMe();
  const [num, setNum] = useState('');
  const st = user.verifyStatus;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">사업자 인증 <Demo /></div>
        {st === 'verified' && <Tag tone="green">인증 완료</Tag>}
        {st === 'pending' && <Tag tone="yellow">인증 대기</Tag>}
        {(st === 'none' || st === 'rejected') && <Tag tone="red">{st === 'rejected' ? '반려됨' : '미인증'}</Tag>}
      </div>
      {st === 'verified' && <p className="text-sm text-ink-500 mt-1">사업자등록번호 {user.bizNumber}</p>}
      {st === 'pending' && <p className="text-sm text-ink-500 mt-1">관리자 승인을 기다리고 있어요. 승인 전에는 둘러보기만 가능해요. (관리자 시점에서 승인해 볼 수 있어요)</p>}
      {(st === 'none' || st === 'rejected') && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input className={inputCls} placeholder="사업자등록번호 10자리" value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d-]/g, ''))} />
            <Button disabled={!isValidBizNumber(num)} onClick={() => requestVerification(userId, num)}>요청</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BrandSection() {
  const { db, brand } = useMe();
  const b = brand!;
  const [edit, setEdit] = useState(false);
  const [intro, setIntro] = useState(b.intro);
  const [tags, setTags] = useState<ThemeTags>(b.tags);
  const [avail, setAvail] = useState(b.availability);
  const [ig, setIg] = useState(b.instagram ?? '');
  const [newsOpen, setNewsOpen] = useState(false);
  const [news, setNews] = useState('');
  const sent = db.proposals.filter((p) => p.fromBrandId === b.id).length;
  const recv = db.proposals.filter((p) => p.toBrandId === b.id && p.status === 'sent').length;
  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold">내 브랜드</div>
          <button className="text-sm text-brand-600 font-semibold" onClick={() => { setIntro(b.intro); setTags(b.tags); setAvail(b.availability); setEdit(true); }}>수정</button>
        </div>
        <ThemeTagList tags={b.tags} />
        <div className="text-[13px] text-ink-500 mt-2">팝업 가능: {b.availability.map(period).join(', ')}</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="secondary" onClick={() => navigate({ name: 'brand', id: b.id })}>내 프로필 보기</Button>
          <Button variant="secondary" onClick={() => navigate({ name: 'proposals' })}>
            제안함 {recv > 0 && <span className="text-brand-500">{recv}</span>}
          </Button>
        </div>
        <p className="text-[11px] text-ink-500 mt-2">받은 제안 대기 {recv}건 · 보낸 제안 {sent}건</p>
        <button onClick={() => setNewsOpen(true)} className="mt-3 w-full rounded-xl bg-brand-50 px-3.5 py-3 text-left flex items-center gap-3">
          <span className="text-xl">📣</span>
          <span className="flex-1">
            <span className="block text-sm font-bold">팔로워 {b.followers.length}명에게 소식 보내기</span>
            <span className="block text-[12px] text-ink-500">팝업 오픈, 신상, 현장 혜택을 알림으로 바로 전해요</span>
          </span>
          <span className="text-ink-300">›</span>
        </button>
      </Card>
      <Sheet open={newsOpen} onClose={() => setNewsOpen(false)} title="팔로워에게 소식 보내기">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['이번 주말 팝업에서 만나요!', '신상 입고했어요. 팝업에서 먼저 보여 드릴게요', '팝업 현장에서 팔로워 10% 할인해요'].map((t) => (
            <button key={t} onClick={() => setNews(t)} className="px-3 h-8 rounded-full border border-ink-300 text-xs">{t}</button>
          ))}
        </div>
        <textarea className={textareaCls} maxLength={80} value={news} onChange={(e) => setNews(e.target.value)} placeholder="80자 이내로 짧게 써 주세요" />
        <p className="text-[11px] text-ink-500 mt-1">{news.length}/80 · 프로필의 '소식'에도 남아요</p>
        <Button full size="lg" className="mt-3" disabled={!news.trim()} onClick={() => { sendFollowerNews(b.id, news.trim()); setNews(''); setNewsOpen(false); }}>보내기</Button>
      </Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title="브랜드 프로필 수정">
        <Field label="소개">
          <textarea className={textareaCls} value={intro} onChange={(e) => setIntro(e.target.value)} />
        </Field>
        <TagPicker value={tags} onChange={setTags} />
        <Field label={<>인스타그램 연동 <Demo /></>} hint="아이디를 입력하면 예시 사진 9장을 룩북 앞쪽에 추가해요">
          <div className="flex gap-2">
            <input className={inputCls} value={ig} onChange={(e) => setIg(e.target.value.replace(/\s/g, ''))} placeholder="instagram_id" />
            <Button variant="dark" disabled={!ig} onClick={() => importInstagram(b.id, ig)}>가져오기</Button>
          </div>
        </Field>
        <Field label="팝업 가능 기간">
          {avail.map((a, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input type="date" className={inputCls} value={a.start} onChange={(e) => setAvail(avail.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
              <span>~</span>
              <input type="date" className={inputCls} value={a.end} onChange={(e) => setAvail(avail.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
              <button className="text-ink-500" onClick={() => setAvail(avail.filter((_, j) => j !== i))}><Icon name="x" className="w-4 h-4" /></button>
            </div>
          ))}
          <button type="button" className="text-sm text-brand-600 font-semibold" onClick={() => setAvail([...avail, { start: '2027-01-01', end: '2027-01-31' }])}>+ 기간 추가</button>
        </Field>
        <Button full disabled={!tags.moods.length || !tags.categories.length} onClick={() => { updateBrandProfile(b.id, { intro, tags, availability: avail }); setEdit(false); }}>저장</Button>
      </Sheet>
    </>
  );
}

function VisitorSection() {
  const { db, visitor, userId } = useMe();
  const stamp = db.stamps.find((s) => s.userId === userId);
  const myReviews = db.reviews.filter((r) => r.authorId === userId).length + db.comboReviews.filter((r) => r.authorId === userId).length;
  return (
    <Card className="p-4">
      <div className="grid grid-cols-3 text-center mb-3">
        <div><div className="text-lg font-extrabold">{visitor!.following.length}</div><div className="text-[11px] text-ink-500">팔로잉</div></div>
        <div><div className="text-lg font-extrabold">{stamp?.popupIds.length ?? 0}</div><div className="text-[11px] text-ink-500">스탬프</div></div>
        <div><div className="text-lg font-extrabold">{myReviews}</div><div className="text-[11px] text-ink-500">작성한 리뷰</div></div>
      </div>
      <div className="text-[13px] font-semibold mb-1.5">팔로우한 브랜드</div>
      <div className="flex flex-wrap gap-1.5">
        {visitor!.following.map((id) => {
          const b = brandById(db, id);
          return b ? (
            <button key={id} onClick={() => navigate({ name: 'brand', id })} className="px-2.5 h-7 rounded-full border border-ink-300 text-xs">{b.name}</button>
          ) : null;
        })}
        {!visitor!.following.length && <span className="text-sm text-ink-500">아직 없어요</span>}
      </div>
      {stamp && stamp.popupIds.length > 0 && (
        <div className="text-[12px] text-ink-500 mt-3">방문한 팝업: {stamp.popupIds.map((p) => popupById(db, p)?.title).join(', ')}</div>
      )}
    </Card>
  );
}


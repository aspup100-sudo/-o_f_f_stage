import { RENTAL_ON, roleOn } from '@/config';
import { LIVE, todayKST } from '@/edition';
import { signOut } from '@/store/auth';
import { useState } from 'react';
import { useApp, switchRole } from '@/store/store';
import { chooseRole, finishOnboarding, goOnboardingStep, isValidBizNumber, socialLogin, submitBizNumber, type BrandDraft } from '@/store/actions';
import { Button, Demo, Field, Icon, inputCls, textareaCls, cx, Swatch } from '@/components/ui';
import { TagPicker } from '@/components/common';
import { INSTAGRAM_SAMPLE_LABELS } from '@/data/mock';
import type { BrandProfile, Role, ThemeTags } from '@/types';
import { lookbookSrc } from '@/data/photos';
import { isListedBrand, matchPct, matchScore } from '@/store/logic';

const STEPS = ['로그인', '역할', '인증', '프로필'];

export default function Onboarding() {
  const ob = useApp((s) => s.session.onboarding) ?? { step: 0 };
  const user = useApp((s) => s.db.users.find((u) => u.id === s.session.onboarding?.userId));
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-12 flex items-center px-4 justify-between">
        {LIVE
          ? <button onClick={() => signOut()} className="text-sm text-ink-500">로그아웃</button>
          : <button onClick={() => switchRole('brand')} className="text-sm text-ink-500">데모로 돌아가기</button>}
        <div className="flex gap-1">
          {(LIVE ? STEPS.filter((x) => x !== '인증') : STEPS).map((s, i, arr) => (
            <span key={s} className={cx('h-1.5 rounded-full', i <= (LIVE && ob.step >= 2 ? ob.step - 1 : ob.step) && arr.length ? 'bg-brand-500 w-6' : 'bg-ink-300 w-3')} />
          ))}
        </div>
      </div>
      <div className="flex-1 px-5 pb-8">
        {ob.step === 0 && <Login />}
        {ob.step === 1 && <RolePick />}
        {ob.step === 2 && user && <BizVerify status={user.verifyStatus} role={user.role} />}
        {ob.step === 3 && user && <ProfileForm role={user.role} />}
      </div>
    </div>
  );
}

function Login() {
  const db = useApp((s) => s.db);
  const recruiting = db.recruitments.filter((r) => r.status === '모집 중').length;
  const popups = db.popups.filter((p) => p.status !== '종료').length;
  return (
    <div className="flex flex-col h-full pt-16">
      <img src="./logo.png" alt="OFFSTAGE" className="w-16 h-16 rounded mb-6" />
      <h1 className="text-[26px] font-extrabold leading-snug">
        혼자 열기 버거운 팝업,
        <br />
        <span className="underline decoration-[3px] underline-offset-4 decoration-brand-500">같이 열면</span> 가벼워져요
      </h1>
      <p className="text-ink-500 mt-3 text-[15px] leading-relaxed break-keep">
        작은 패션 브랜드끼리 팀을 짜고, 공간을 나눠 빌리고, 함께 연 경험을 기록하세요. 거래 수수료는 없어요.
      </p>
      <div className="grid grid-cols-3 gap-0.5 mt-8">
        {db.lookbookImages.filter((im) => ['b1', 'b2', 'b3'].includes(im.brandId)).filter((im, i, a) => a.findIndex((x) => x.brandId === im.brandId) === i).map((im) => (
          <Swatch key={im.id} src={lookbookSrc(im)} hue={im.hue} pattern={im.pattern} className="aspect-[3/4]" rounded="" />
        ))}
      </div>
      <p className="text-[12px] text-ink-500 mt-2">지금 {recruiting}팀이 팀원을 모으고, {popups}곳에서 팝업이 열려요</p>
      <div className="mt-auto pt-12 space-y-2.5">
        <button onClick={() => socialLogin('kakao')} className="w-full h-12 rounded bg-[#FEE500] text-[#191600] font-bold text-[15px]">
          카카오로 시작하기 <Demo />
        </button>
        <button onClick={() => socialLogin('naver')} className="w-full h-12 rounded bg-[#03C75A] text-white font-bold text-[15px]">
          네이버로 시작하기 <Demo />
        </button>
        <p className="text-center text-[12px] text-ink-500 pt-1">데모에서는 버튼을 누르면 바로 로그인돼요.</p>
        <a href="https://www.instagram.com/o_f_f_stage/" target="_blank" rel="noreferrer" className="block text-center text-[12px] text-ink-700 font-semibold pt-2">공식 인스타그램 @o_f_f_stage ↗</a>
      </div>
    </div>
  );
}

function RolePick() {
  const options = ([
    { role: 'brand', title: '브랜드', desc: LIVE ? '다른 브랜드와 팀을 짜서 팝업을 열어요' : '다른 브랜드와 팀을 짜서 팝업을 열어요. 사업자 인증 필요', emoji: 'shirt' },
    { role: 'landlord', title: '임대인 (공간 운영자)', desc: LIVE ? '비는 날 공간을 팀에게 빌려줘요' : '비는 날 공간을 팀에게 빌려줘요. 사업자 인증 필요', emoji: 'building' },
    { role: 'visitor', title: '방문객', desc: '공동 팝업을 구경하고 스탬프를 모아요. 인증 없이 가입', emoji: 'bag' },
  ] as { role: Role; title: string; desc: string; emoji: string }[]).filter((o) => roleOn(o.role));
  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold">어떤 분이신가요?</h1>
      <p className="text-ink-500 text-sm mt-1.5 mb-6">한 계정은 하나의 역할만 가질 수 있어요.</p>
      <div className="space-y-2.5">
        {options.map((o) => (
          <button key={o.role} onClick={() => chooseRole(o.role)} className="w-full text-left p-4 rounded border border-ink-300 flex gap-3 items-center active:bg-ink-100">
            <span className="w-11 h-11 rounded bg-ink-100 flex items-center justify-center shrink-0"><Icon name={o.emoji} className="w-6 h-6" /></span>
            <span className="flex-1">
              <span className="block font-bold">{o.title}</span>
              <span className="block text-[13px] text-ink-500 mt-0.5">{o.desc}</span>
            </span>
            <span className="text-ink-400">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BizVerify({ status, role }: { status: string; role: Role }) {
  const [num, setNum] = useState('');
  const valid = isValidBizNumber(num);
  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold">사업자 인증 <Demo /></h1>
      <p className="text-ink-500 text-sm mt-1.5 mb-6">
        {role === 'brand' ? '브랜드' : '임대인'} 계정은 사업자 인증 후 모집·제안·지원·채팅을 쓸 수 있어요. 데모에서는 10자리 형식만 확인해요.
      </p>
      {status === 'none' && (
        <>
          <Field label="사업자등록번호" hint="숫자 10자리 (하이픈 없이 입력해도 돼요)">
            <input className={inputCls} inputMode="numeric" placeholder="123-45-67890" value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d-]/g, ''))} />
          </Field>
          {num && !valid && <p className="text-xs text-red-500 -mt-2 mb-3">사업자등록번호는 숫자 10자리예요.</p>}
          <Button full size="lg" disabled={!valid} onClick={() => submitBizNumber(num)}>인증 요청</Button>
          <button onClick={() => goOnboardingStep(3)} className="w-full text-center text-sm text-ink-500 mt-4">나중에 할게요 (둘러보기만 가능)</button>
        </>
      )}
      {status === 'pending' && (
        <div className="rounded border border-ink-300 p-5 text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-ink-100 border-t-brand-500 animate-spin mb-3" />
          <div className="font-bold text-ink-900">인증 대기 중</div>
          <div className="text-sm text-ink-500 mt-1">국세청 정보와 대조하고 있어요 (데모: 2초 뒤 완료)</div>
        </div>
      )}
      {status === 'verified' && (
        <>
          <div className="rounded bg-emerald-50 border border-emerald-200 p-5 text-center mb-6">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3">
              <Icon name="check" />
            </div>
            <div className="font-bold text-emerald-700">인증 완료</div>
            <div className="text-sm text-emerald-700 mt-1">이제 모든 기능을 쓸 수 있어요.</div>
          </div>
          <Button full size="lg" onClick={() => goOnboardingStep(3)}>프로필 작성하기</Button>
        </>
      )}
    </div>
  );
}

function ProfileForm({ role }: { role: Role }) {
  if (role === 'brand') return <BrandForm />;
  if (role === 'landlord') return <LandlordForm />;
  return <VisitorForm />;
}

/** 태그를 고르는 동안 지금 등록된 브랜드 중 잘 맞을 곳을 바로 보여 준다 */
function MatchPreview({ tags }: { tags: ThemeTags }) {
  const db = useApp((s) => s.db);
  if (!tags.moods.length || !tags.categories.length) return null;
  const me = { id: '_new', userId: '_new', name: '나', intro: '', tags, channels: [], availability: [], lookbook: [], followers: [], hearts: [], logoHue: 0 } as BrandProfile;
  const top0 = db.brands.filter((b) => isListedBrand(db, b)).map((b) => ({ b, pct: matchPct(matchScore(db, me, b).score) })).sort((x, y) => y.pct - x.pct).slice(0, 3);
  const top = top0;
  if (!top.length) return null;
  return (
    <div className="mb-5 -mt-1 border border-ink-300 p-3.5">
      <div className="text-[13px] font-bold text-brand-700">이 태그라면 이런 브랜드와 잘 맞아요</div>
      <div className="mt-2 space-y-1.5">
        {top.map(({ b, pct }) => (
          <div key={b.id} className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0" style={{ background: `hsl(${b.logoHue} 45% 55%)` }}>{b.name[0]}</span>
            <span className="text-[13px] font-semibold flex-1 truncate">{b.name} <span className="text-ink-500 font-normal">· {b.tags.categories.join('/')}</span></span>
            <span className="text-[13px] font-extrabold text-brand-600">{pct}%</span>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-ink-500 mt-2">무드가 겹치고 카테고리가 다를수록 높아져요. 태그를 바꾸면 바로 다시 계산해요.</p>
    </div>
  );
}

function BrandForm() {
  const [d, setD] = useState<BrandDraft>({
    name: '', intro: '', tags: { moods: [], categories: [], price: '3~7만원', ages: [] }, instagram: '', igImported: false,
    availability: [LIVE ? { start: todayKST(), end: `${todayKST().slice(0, 4)}-12-31` } : { start: '2026-11-15', end: '2026-12-31' }],
  });
  const [ig, setIg] = useState('');
  const ok = d.name.trim() && d.tags.categories.length > 0 && d.tags.moods.length > 0;
  const missing = ([!d.name.trim() && '브랜드 이름', d.tags.categories.length === 0 && '카테고리', d.tags.moods.length === 0 && '무드']).filter(Boolean) as string[];
  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold mb-1">브랜드 프로필</h1>
      <p className="text-ink-500 text-sm mb-6">태그는 추천과 팀 매칭에 쓰여요. 정해진 선택지에서만 골라요.</p>
      <Field label="브랜드 이름" required>
        <input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="예) 바람결상점" />
      </Field>
      <Field label="한 줄 소개">
        <textarea className={textareaCls} maxLength={120} value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} placeholder="어떤 물건을 어떤 마음으로 만드나요?" />
      </Field>
      <div className="text-[13px] font-semibold mb-2 text-ink-700">테마 태그 <span className="text-brand-500">*</span></div>
      <TagPicker value={d.tags} onChange={(tags) => setD({ ...d, tags })} />
      <MatchPreview tags={d.tags} />
      {LIVE ? (
        <Field label="인스타그램 아이디" hint="프로필에 인스타그램 링크로 보여요. 룩북 사진은 가입 후 내 정보에서 올릴 수 있어요">
          <input className={inputCls} value={d.instagram ?? ''} onChange={(e) => setD({ ...d, instagram: e.target.value.replace(/\s|@/g, '') })} placeholder="instagram_id" />
        </Field>
      ) : (
      <>
      <Field label={<>인스타그램 연동 <Demo /></>} hint="계정 아이디를 입력하면 예시 사진 9장을 룩북으로 가져와요">
        <div className="flex gap-2">
          <input className={inputCls} value={ig} onChange={(e) => setIg(e.target.value.replace(/\s/g, ''))} placeholder="instagram_id" />
          <Button variant="dark" disabled={!ig} onClick={() => setD({ ...d, instagram: ig, igImported: true })}>가져오기</Button>
        </div>
      </Field>
      {d.igImported && (
        <div className="grid grid-cols-3 gap-1 mb-4 -mt-1">
          {INSTAGRAM_SAMPLE_LABELS.map((l, i) => (
            <Swatch key={l} hue={(i * 40) % 360} pattern={(['stripe', 'dot', 'grid', 'wave', 'solid', 'circle'] as const)[i % 6]} label={l} className="aspect-square" rounded="rounded" />
          ))}
        </div>
      )}
      </>
      )}
      <Field label="팝업 가능 기간">
        {d.availability.map((a, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input type="date" className={inputCls} value={a.start} onChange={(e) => { const av = [...d.availability]; av[i] = { ...a, start: e.target.value }; setD({ ...d, availability: av }); }} />
            <span>~</span>
            <input type="date" className={inputCls} value={a.end} onChange={(e) => { const av = [...d.availability]; av[i] = { ...a, end: e.target.value }; setD({ ...d, availability: av }); }} />
          </div>
        ))}
        <button type="button" className="text-sm text-brand-600 font-semibold" onClick={() => setD({ ...d, availability: [...d.availability, { start: '2027-01-01', end: '2027-01-31' }] })}>+ 기간 추가</button>
      </Field>
      {!ok && (
        <p className="text-[12px] text-ink-500 text-center mb-2">
          {[!d.name.trim() && '브랜드 이름', !d.tags.moods.length && '무드', !d.tags.categories.length && '카테고리'].filter(Boolean).join(', ')}만 채우면 시작할 수 있어요
        </p>
      )}
      <Button full size="lg" disabled={!ok} onClick={() => finishOnboarding({ brand: d })}>시작하기</Button>
      {!ok && missing.length > 0 && <p className="text-[12px] text-ink-500 text-center mt-2">남은 항목: {missing.join(', ')}</p>}
      {!ok && <p className="text-center text-xs text-ink-500 mt-2">이름, 무드 1개 이상, 카테고리 1개 이상이 필요해요</p>}
    </div>
  );
}

function LandlordForm() {
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold mb-1">임대인 프로필</h1>
      <p className="text-ink-500 text-sm mb-6">공간 등록은 가입 후 "내 공간" 탭에서 할 수 있어요.</p>
      <Field label="운영자 이름(상호)" required>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 골목공간 운영자" />
      </Field>
      <Field label="소개">
        <textarea className={textareaCls} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="어떤 공간을 운영하시나요?" />
      </Field>
      <Button full size="lg" disabled={!name.trim()} onClick={() => finishOnboarding({ landlord: { name, intro } })}>시작하기</Button>
    </div>
  );
}

function VisitorForm() {
  const [nickname, setNickname] = useState('');
  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold mb-1">닉네임을 정해 주세요</h1>
      <p className="text-ink-500 text-sm mb-6">방문객은 인증 없이 바로 시작할 수 있어요.</p>
      <Field label="닉네임" required>
        <input className={inputCls} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예) 주말팝업러" />
      </Field>
      <Button full size="lg" disabled={!nickname.trim()} onClick={() => finishOnboarding({ visitor: { nickname } })}>시작하기</Button>
    </div>
  );
}

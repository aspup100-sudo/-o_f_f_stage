// 정식판 첫 화면: 이메일 로그인·가입
import { useState } from 'react';
import { Button, Field, Sheet, inputCls } from '@/components/ui';
import { sendReset, setNewPassword, signIn, signUp } from '@/store/auth';
import { useApp } from '@/store/store';

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [policy, setPolicy] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ok = validEmail && pw.length >= 6 && (mode === 'in' || agree);

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr(''); setNote('');
    if (mode === 'in') {
      const e = await signIn(email.trim(), pw);
      if (e) setErr(e);
    } else {
      const r = await signUp(email.trim(), pw);
      if (r.error) setErr(r.error);
      else if (r.confirm) setNote(`${email.trim()}로 가입 확인 메일을 보냈어요. 메일의 링크를 누르면 바로 시작돼요.`);
    }
    setBusy(false);
  };

  const reset = async () => {
    if (!validEmail) { setErr('비밀번호를 받을 이메일을 먼저 적어 주세요.'); return; }
    setBusy(true); setErr('');
    const e = await sendReset(email.trim());
    setBusy(false);
    if (e) setErr(e); else setNote('비밀번호를 다시 정하는 메일을 보냈어요. 메일함을 확인해 주세요.');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-5 pb-10">
      <div className="pt-16">
        <img src="./logo.png" alt="OFFSTAGE" className="w-14 h-14 rounded mb-6" />
        <h1 className="text-[26px] font-extrabold leading-snug">
          혼자 열기 버거운 팝업,
          <br />
          <span className="underline decoration-[3px] underline-offset-4 decoration-brand-500">같이 열면</span> 가벼워져요
        </h1>
        <p className="text-ink-500 mt-3 text-[15px] leading-relaxed break-keep">
          작은 패션 브랜드끼리 팀을 짜고, 공간을 나눠 빌리고, 함께 연 경험을 기록하세요. 거래 수수료는 없어요.
        </p>
      </div>

      <form className="mt-10" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="flex border-b border-ink-200 mb-5">
          {(['in', 'up'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setErr(''); setNote(''); }} className={'flex-1 h-11 text-[15px] ' + (mode === m ? 'font-bold text-ink-900 border-b-2 border-ink-900 -mb-px' : 'text-ink-500')}>
              {m === 'in' ? '로그인' : '처음이에요 (가입)'}
            </button>
          ))}
        </div>
        <Field label="이메일">
          <input className={inputCls} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@brand.com" />
        </Field>
        <Field label="비밀번호" hint={mode === 'up' ? '6자 이상' : undefined}>
          <input className={inputCls} type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {mode === 'up' && (
          <label className="flex items-start gap-2 text-[13px] text-ink-700 mb-4">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              <button type="button" className="underline underline-offset-2" onClick={() => setPolicy(true)}>개인정보 수집·이용</button>에 동의해요 (필수)
            </span>
          </label>
        )}
        {err && <p className="text-[13px] text-red-600 mb-3">{err}</p>}
        {note && <p className="text-[13px] text-emerald-700 mb-3">{note}</p>}
        <Button type="submit" full size="lg" disabled={!ok || busy}>{busy ? '잠시만요' : mode === 'in' ? '로그인' : '가입하고 시작하기'}</Button>
        {mode === 'in' && <button type="button" onClick={reset} className="w-full text-center text-[13px] text-ink-500 mt-4">비밀번호를 잊었어요</button>}
      </form>

      <a href="https://www.instagram.com/o_f_f_stage/" target="_blank" rel="noreferrer" className="block text-center text-[12px] text-ink-700 font-semibold mt-auto pt-10">공식 인스타그램 @o_f_f_stage ↗</a>
      <PolicySheet open={policy} onClose={() => setPolicy(false)} />
    </div>
  );
}

export function PolicySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="개인정보 수집·이용 안내">
      <div className="text-[13px] text-ink-700 leading-relaxed space-y-3">
        <p><b>모으는 정보</b><br />이메일, 비밀번호(암호화 저장), 가입 후 직접 적은 브랜드·공간 정보와 올린 사진, 채팅 내용</p>
        <p><b>쓰는 곳</b><br />로그인, 브랜드·공간 소개와 추천, 팀 모집과 공동 팝업 진행, 알림</p>
        <p><b>보관 기간</b><br />탈퇴할 때까지. 탈퇴를 요청하면 지체 없이 지워요.</p>
        <p><b>문의·탈퇴 요청</b><br />공식 인스타그램 @o_f_f_stage DM</p>
        <p className="text-ink-500">결제 정보와 사업자등록번호는 지금 받지 않아요.</p>
      </div>
      <Button full className="mt-5" onClick={onClose}>확인</Button>
    </Sheet>
  );
}

export function RecoverySheet() {
  const open = useApp((s) => !!s.session.recovery);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  return (
    <Sheet open={open} onClose={() => {}} title="새 비밀번호 정하기">
      <Field label="새 비밀번호" hint="6자 이상">
        <input className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      {err && <p className="text-[13px] text-red-600 mb-3">{err}</p>}
      <Button full disabled={pw.length < 6} onClick={async () => { const e = await setNewPassword(pw); setErr(e ?? ''); }}>저장</Button>
    </Sheet>
  );
}

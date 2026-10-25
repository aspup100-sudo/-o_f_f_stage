import { useEffect, useState } from 'react';

// 브라우저가 주는 설치 이벤트. 일찍 올 수 있어서 모듈이 뜨자마자 받아 둔다.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  listeners.forEach((l) => l());
});

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** 홈 화면에 앱으로 설치하는 안내. 이미 앱으로 열었으면 보이지 않는다. */
export function InstallApp() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  if (isStandalone()) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setTick((n) => n + 1);
  };

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white p-3.5">
      <span className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center text-lg">📲</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">OFF STAGE 앱으로 쓰기</span>
        <span className="block text-[12px] text-ink-500">
          {deferred
            ? '홈 화면에 설치하면 앱처럼 바로 열려요'
            : isIOS()
              ? 'Safari 아래 공유 버튼 → "홈 화면에 추가"를 눌러 주세요'
              : '브라우저 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 눌러 주세요'}
        </span>
      </span>
      {deferred && (
        <button onClick={install} className="h-8 px-3 rounded-full bg-ink-900 text-white text-xs font-bold">
          설치
        </button>
      )}
    </div>
  );
}

// 앱 판(edition). 프로토타입(데모)과 정식판을 같은 코드로 만든다.
// 정식판은 `npm run build:live`(VITE_EDITION=live)로 빌드해 /app/ 주소에 올린다.
// 정식판: 진짜 로그인, 별도 서버 표(live_records), 데모 데이터·시연용 버튼 없음.
export const LIVE = import.meta.env.VITE_EDITION === 'live';

/** 오늘 날짜(한국 시간, YYYY-MM-DD) */
export function todayKST() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

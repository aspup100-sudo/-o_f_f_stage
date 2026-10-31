import { useApp, update, getState } from './store';
import { brandOfUser, landlordOfUser, userById } from './logic';
import { LIVE } from '@/edition';

/** 현재 로그인한(데모) 사용자와 역할별 프로필 */
export function useMe() {
  const db = useApp((s) => s.db);
  const role = useApp((s) => s.session.role);
  const userId = useApp((s) => s.session.userByRole[s.session.role]);
  const user = userById(db, userId)!;
  return {
    db, role, user, userId,
    brand: role === 'brand' ? brandOfUser(db, userId) : undefined,
    landlord: role === 'landlord' ? landlordOfUser(db, userId) : undefined,
    visitor: role === 'visitor' ? db.visitors.find((v) => v.userId === userId) : undefined,
    rental: role === 'rental' ? db.rentalPartners.find((r) => r.userId === userId) : undefined,
    // 정식판은 사업자 인증이 준비 중이라 가입한 모두가 쓸 수 있다
    verified: LIVE || user?.verifyStatus === 'verified' || role === 'visitor' || role === 'admin',
  };
}

/** 인증 전 브랜드·임대인이 모집·제안·지원·채팅을 누르면 인증 안내를 띄운다 */
export function guard(action: () => void) {
  if (LIVE) { action(); return; }
  const s = getState();
  const u = userById(s.db, s.session.userByRole[s.session.role]);
  if ((s.session.role === 'brand' || s.session.role === 'landlord') && u?.verifyStatus !== 'verified') {
    update((st) => { st.session.gate = true; });
    return;
  }
  action();
}

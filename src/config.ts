import type { Role } from '@/types';

export const TABS: Record<Role, { key: string; label: string; icon: string }[]> = {
  brand: [
    { key: 'explore', label: '둘러보기', icon: 'home' },
    { key: 'recruits', label: '같이 열기', icon: 'users' },
    { key: 'spaces', label: '공간', icon: 'building' },
    { key: 'myteam', label: '내 팀', icon: 'team' },
    { key: 'me', label: '내 정보', icon: 'user' },
  ],
  landlord: [
    { key: 'explore', label: '둘러보기', icon: 'home' },
    { key: 'myspaces', label: '내 공간', icon: 'building' },
    { key: 'inbox', label: '받은 지원', icon: 'inbox' },
    { key: 'me', label: '내 정보', icon: 'user' },
  ],
  visitor: [
    { key: 'explore', label: '둘러보기', icon: 'home' },
    { key: 'map', label: '팝업 지도', icon: 'map' },
    { key: 'stamps', label: '스탬프', icon: 'stamp' },
    { key: 'me', label: '내 정보', icon: 'user' },
  ],
  rental: [
    { key: 'explore', label: '둘러보기', icon: 'home' },
    { key: 'myitems', label: '내 장비', icon: 'box' },
    { key: 'orders', label: '받은 예약', icon: 'inbox' },
    { key: 'me', label: '내 정보', icon: 'user' },
  ],
  admin: [
    { key: 'verify', label: '인증 승인', icon: 'shield' },
    { key: 'reports', label: '신고 처리', icon: 'flag' },
    { key: 'magazineAdmin', label: '매거진', icon: 'book' },
    { key: 'explore', label: '둘러보기', icon: 'home' },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { brand: '브랜드', landlord: '임대인', visitor: '방문객', admin: '관리자', rental: '렌탈 업체' };


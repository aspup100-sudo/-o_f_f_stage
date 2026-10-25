// 아주 작은 전역 스토어. 실제 서비스에서는 이 자리에 API 호출이 들어간다.
import { useSyncExternalStore } from 'react';
import { createSeed, type DB } from '@/data/mock';
import type { Role, Route } from '@/types';

export const ROLE_HOME: Record<Role, string> = { brand: 'explore', landlord: 'explore', visitor: 'explore', admin: 'stats', rental: 'explore' };

export interface Session {
  role: Role;
  userByRole: Record<Role, string>;
  stack: Route[]; // 화면 스택 (맨 끝이 현재 화면)
  toast?: { id: number; text: string };
  onboarding?: { step: number; userId?: string };
  gate?: boolean; // 사업자 인증 안내 시트
  match?: string; // 서로 관심 매칭된 brandId (채팅 제안 팝업)
}

export interface AppState {
  db: DB;
  session: Session;
}

const STORAGE_KEY = 'offstage-demo-v9';

function initialSession(): Session {
  return {
    role: 'brand',
    userByRole: { brand: 'u_b1', landlord: 'u_l1', visitor: 'u_v1', admin: 'u_admin', rental: 'u_r1' },
    stack: [{ name: 'tab', tab: 'explore' }],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* 저장소를 못 쓰는 환경이면 시드로 시작 */
  }
  return { db: createSeed(), session: initialSession() };
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    const { toast, ...rest } = state.session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ db: state.db, session: rest }));
  } catch {
    /* noop */
  }
}

export function getState() {
  return state;
}

/** 상태를 복제한 뒤 mutate 함수로 고친다. 데이터가 작아서 통째 복제로 충분하다. */
export function update(mutate: (s: AppState) => void) {
  const next = structuredClone(state);
  mutate(next);
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function resetDemo() {
  state = { db: createSeed(), session: initialSession() };
  persist();
  listeners.forEach((l) => l());
}

let toastSeq = 0;
export function toast(text: string) {
  const id = ++toastSeq;
  update((s) => {
    s.session.toast = { id, text };
  });
  setTimeout(() => {
    if (state.session.toast?.id === id) update((s) => { s.session.toast = undefined; });
  }, 2200);
}

// ───────── 내비게이션 ─────────
export function navigate(route: Route) {
  update((s) => {
    if (route.name === 'tab') s.session.stack = [route];
    else s.session.stack.push(route);
  });
  window.scrollTo?.(0, 0);
}
export function replace(route: Route) {
  update((s) => {
    s.session.stack[s.session.stack.length - 1] = route;
  });
}
export function back() {
  update((s) => {
    if (s.session.stack.length > 1) s.session.stack.pop();
  });
}

export function switchRole(role: Role, userId?: string) {
  update((s) => {
    s.session.role = role;
    if (userId) s.session.userByRole[role] = userId;
    s.session.stack = [{ name: 'tab', tab: ROLE_HOME[role] }];
    s.session.onboarding = undefined;
  });
  window.scrollTo?.(0, 0);
}

let idSeq = Date.now() % 100000;
export const newId = (prefix: string) => `${prefix}_${(idSeq++).toString(36)}`;
export const nowISO = () => new Date().toISOString().slice(0, 19);

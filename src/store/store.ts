// 아주 작은 전역 스토어. 실제 서비스에서는 이 자리에 API 호출이 들어간다.
import { useSyncExternalStore } from 'react';
import { createSeed, type DB } from '@/data/mock';
import type { Role, Route } from '@/types';
import { keyOf, listen, pullAll, pushDiff, remoteEnabled } from './remote';

export const ROLE_HOME: Record<Role, string> = { brand: 'explore', landlord: 'explore', visitor: 'explore', admin: 'stats', rental: 'explore' };

export interface Session {
  role: Role;
  userByRole: Record<Role, string>;
  stack: Route[]; // 화면 스택 (맨 끝이 현재 화면)
  toast?: { id: number; text: string };
  onboarding?: { step: number; userId?: string };
  gate?: boolean; // 사업자 인증 안내 시트
  match?: string; // 서로 관심 매칭된 brandId (채팅 제안 팝업)
  sync?: 'local' | 'loading' | 'online' | 'error'; // 서버 동기화 상태
}

export interface AppState {
  db: DB;
  session: Session;
}

const STORAGE_KEY = 'offstage-demo-v10';

function initialSession(): Session {
  return {
    role: 'brand',
    userByRole: { brand: 'u_b1', landlord: 'u_l1', visitor: 'u_v1', admin: 'u_admin', rental: 'u_r1' },
    stack: [{ name: 'tab', tab: 'explore' }],
  };
}

/** 저장된 데이터에 없는 제휴 렌탈 업체·장비·업체 계정을 시드에서 채운다. 이미 있는 데이터는 건드리지 않는다 */
function withSeedRental(db: DB): DB {
  const seed = createSeed();
  const next = { ...db, spaces: [...db.spaces], rentalPartners: [...(db.rentalPartners ?? [])], rentalItems: [...(db.rentalItems ?? [])], users: [...db.users] };
  let changed = false;
  for (const sp of seed.rentalPartners) {
    const i = next.rentalPartners.findIndex((p) => p.id === sp.id);
    if (i < 0) { next.rentalPartners.push(sp); changed = true; }
    else if (!next.rentalPartners[i].perks && sp.perks) { next.rentalPartners[i] = { ...next.rentalPartners[i], perks: sp.perks }; changed = true; }
  }
  for (const si of seed.rentalItems) if (!next.rentalItems.some((x) => x.id === si.id)) { next.rentalItems.push(si); changed = true; }
  next.spaces = next.spaces.map((sp) => {
    const ss = seed.spaces.find((x) => x.id === sp.id);
    if (!ss || (sp.promos && sp.keywords)) return sp;
    changed = true;
    return { ...sp, promos: sp.promos ?? ss.promos, keywords: sp.keywords ?? ss.keywords };
  });
  for (const su of seed.users) if (su.role === 'rental' && !next.users.some((u) => u.id === su.id)) { next.users.push(su); changed = true; }
  return changed ? next : db;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const saved = JSON.parse(raw) as AppState; return { ...saved, db: withSeedRental(saved.db) }; }
  } catch {
    /* 저장소를 못 쓰는 환경이면 시드로 시작 */
  }
  return { db: createSeed(), session: initialSession() };
}

/** 링크로 바로 열 수 있는 화면 */
export const LINKABLE = ['popup', 'recruit', 'space', 'brand', 'magazine', 'showcase'] as const;
export type LinkRoute = Extract<Route, { name: (typeof LINKABLE)[number] }>;

/** 주소 해시를 화면으로 바꾼다. 모르는 모양이면 undefined */
export function routeFromHash(hash: string): LinkRoute | undefined {
  const m = /^#\/([a-z]+)\/([^/?#]+)$/.exec(hash);
  if (!m || !(LINKABLE as readonly string[]).includes(m[1])) return undefined;
  return { name: m[1], id: decodeURIComponent(m[2]) } as LinkRoute;
}

/** 공유 링크(#/popup/p1)로 들어오면 홈 위에 그 화면을 연다. 뒤로 가기는 홈으로 */
function openFromLink(s: AppState): AppState {
  if (typeof location === 'undefined') return s;
  const r = routeFromHash(location.hash);
  if (!r) return s;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* noop */ }
  return { ...s, session: { ...s.session, onboarding: undefined, stack: [{ name: 'tab', tab: ROLE_HOME[s.session.role] }, r] } };
}

let state: AppState = openFromLink(load());
// 앱이 열린 채로 다른 공유 링크를 누른 경우
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { const next = openFromLink(state); if (next !== state) { state = next; listeners.forEach((l) => l()); } });
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
  if (remoteEnabled && synced && next.db !== synced) schedulePush();
}

// ───────── 서버 동기화 ─────────
// synced: 서버와 마지막으로 맞춘 db. 바뀐 부분만 모아서 0.4초 뒤 올린다.
let synced: AppState['db'] | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let pushing = Promise.resolve();
function setSync(v: Session['sync']) {
  state = { ...state, session: { ...state.session, sync: v } };
  listeners.forEach((l) => l());
}
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const base = synced!;
    const target = state.db;
    if (base === target) return;
    synced = target;
    pushing = pushing.then(() => pushDiff(base, target)).then(() => setSync('online')).catch(() => setSync('error'));
  }, 400);
}

if (remoteEnabled) {
  state = { ...state, session: { ...state.session, sync: 'loading' } };
  pullAll(createSeed())
    .then((pulled) => {
      if (!pulled) return;
      const db = withSeedRental(pulled);
      state = { ...state, db, session: { ...state.session, sync: 'online' } };
      synced = db;
      persist();
      listeners.forEach((l) => l());
      listen((row, deleted) => {
        const col = state.db[row.collection as keyof AppState['db']] as unknown as Record<string, unknown>[] | undefined;
        if (!col) return;
        const next = structuredClone(state.db);
        const list = next[row.collection as keyof AppState['db']] as unknown as Record<string, unknown>[];
        const i = list.findIndex((d) => keyOf(row.collection, d) === row.id);
        if (deleted) { if (i >= 0) list.splice(i, 1); }
        else if (i >= 0) list[i] = row.data as Record<string, unknown>;
        else list.push(row.data as Record<string, unknown>);
        // 내가 아직 안 올린 변경이 있으면 그대로 두고, 서버 기준만 함께 갱신한다
        const clean = synced === state.db;
        state = { ...state, db: next };
        if (clean) synced = next;
        persist();
        listeners.forEach((l) => l());
      });
    })
    .catch(() => setSync('error'));
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function resetDemo() {
  // 서버를 쓰는 중이면 모두가 함께 쓰는 데이터라 지우지 않고, 내 화면 상태만 처음으로 돌린다
  if (remoteEnabled) {
    state = { ...state, session: { ...initialSession(), sync: state.session.sync } };
    persist();
    listeners.forEach((l) => l());
    return;
  }
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

// 여러 사람이 동시에 만들어도 겹치지 않게 시간 + 난수로 만든다
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const nowISO = () => new Date().toISOString().slice(0, 19);

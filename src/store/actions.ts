// 상태를 바꾸는 동작 모음. 실제 서비스에서는 각 함수가 API 호출로 바뀐다.
import { update, getState, newId, nowISO, toast, navigate, switchRole } from './store';
import { INSTAGRAM_SAMPLE_LABELS, makeLookbook, DEMO_TODAY } from '@/data/mock';
import type { DB } from '@/data/mock';
import type { DateRange, LoginProvider, NotificationType, Role, Route, ThemeTags } from '@/types';

export function notify(db: DB, userId: string, type: NotificationType, text: string, link?: Route) {
  db.notifications.unshift({ id: newId('n'), userId, type, text, link, read: false, at: nowISO() });
}

export function systemMessage(db: DB, roomId: string, text: string) {
  db.messages.push({ id: newId('m'), roomId, senderId: 'system', text, at: nowISO() });
}

// ───────── 온보딩 ─────────
export function socialLogin(provider: LoginProvider) {
  const id = newId('u');
  update((s) => {
    s.db.users.push({ id, name: '', role: 'visitor', provider, verifyStatus: 'none', createdAt: DEMO_TODAY });
    s.session.onboarding = { step: 1, userId: id };
  });
}

export function chooseRole(role: Role) {
  update((s) => {
    const o = s.session.onboarding!;
    const u = s.db.users.find((x) => x.id === o.userId)!;
    u.role = role;
    o.step = role === 'visitor' ? 3 : 2;
  });
}

export const isValidBizNumber = (v: string) => /^\d{10}$/.test(v.replace(/-/g, ''));

export function submitBizNumber(bizNumber: string) {
  const uid = getState().session.onboarding?.userId;
  update((s) => {
    const u = s.db.users.find((x) => x.id === uid)!;
    u.bizNumber = bizNumber;
    u.verifyStatus = 'pending';
  });
  // 데모: 잠시 후 자동 승인
  setTimeout(() => {
    update((s) => {
      const u = s.db.users.find((x) => x.id === uid);
      if (u && u.verifyStatus === 'pending') u.verifyStatus = 'verified';
    });
  }, 2000);
}

export function goOnboardingStep(step: number) {
  update((s) => { if (s.session.onboarding) s.session.onboarding.step = step; });
}

export interface BrandDraft {
  name: string;
  intro: string;
  tags: ThemeTags;
  instagram?: string;
  igImported: boolean;
  availability: DateRange[];
}

export function finishOnboarding(input: { brand?: BrandDraft; landlord?: { name: string; intro: string }; visitor?: { nickname: string } }) {
  const uid = getState().session.onboarding!.userId!;
  let role: Role = 'visitor';
  update((s) => {
    const u = s.db.users.find((x) => x.id === uid)!;
    role = u.role;
    if (input.brand) {
      const bid = newId('b');
      const hue = Math.floor(Math.random() * 360);
      const imgs = input.brand.igImported ? makeLookbook(bid, hue, INSTAGRAM_SAMPLE_LABELS, true) : [];
      s.db.lookbookImages.push(...imgs);
      s.db.brands.push({
        id: bid, userId: uid, name: input.brand.name, intro: input.brand.intro, tags: input.brand.tags, instagram: input.brand.instagram,
        channels: input.brand.instagram ? [{ label: '인스타그램', url: `https://instagram.com/${input.brand.instagram}` }] : [],
        availability: input.brand.availability, lookbook: imgs.map((i) => i.id), followers: [], hearts: [], logoHue: hue,
      });
      u.name = input.brand.name;
      u.profileId = bid;
    }
    if (input.landlord) {
      const lid = newId('l');
      s.db.landlords.push({ id: lid, userId: uid, name: input.landlord.name, intro: input.landlord.intro, spaceIds: [] });
      u.name = input.landlord.name;
      u.profileId = lid;
    }
    if (input.visitor) {
      const vid = newId('v');
      s.db.visitors.push({ id: vid, userId: uid, nickname: input.visitor.nickname, following: [] });
      s.db.stamps.push({ userId: uid, popupIds: [], rewardClaimed: false });
      u.name = input.visitor.nickname;
      u.profileId = vid;
    }
    notify(s.db, uid, 'system', 'OFF STAGE에 오신 걸 환영해요! 둘러보기에서 마음에 드는 브랜드를 찾아보세요.');
  });
  switchRole(role, uid);
  toast('가입이 완료됐어요');
}

// ───────── 브랜드 프로필 ─────────
export function importInstagram(brandId: string, account: string) {
  update((s) => {
    const b = s.db.brands.find((x) => x.id === brandId)!;
    const imgs = makeLookbook(brandId, b.logoHue, INSTAGRAM_SAMPLE_LABELS, true).map((i) => ({ ...i, id: newId('img') }));
    s.db.lookbookImages.push(...imgs);
    b.instagram = account;
    b.lookbook = [...imgs.map((i) => i.id), ...b.lookbook];
    if (!b.channels.some((c) => c.label === '인스타그램')) b.channels.unshift({ label: '인스타그램', url: `https://instagram.com/${account}` });
  });
  toast('인스타그램 사진 9장을 룩북으로 가져왔어요 (데모)');
}

export function updateBrandProfile(brandId: string, patch: Partial<{ intro: string; tags: ThemeTags; availability: DateRange[] }>) {
  update((s) => {
    Object.assign(s.db.brands.find((b) => b.id === brandId)!, patch);
  });
  toast('프로필을 저장했어요');
}

export function toggleFollow(visitorUserId: string, brandId: string) {
  let following = false;
  update((s) => {
    const v = s.db.visitors.find((x) => x.userId === visitorUserId)!;
    const b = s.db.brands.find((x) => x.id === brandId)!;
    if (v.following.includes(brandId)) {
      v.following = v.following.filter((x) => x !== brandId);
      b.followers = b.followers.filter((x) => x !== visitorUserId);
    } else {
      v.following.push(brandId);
      b.followers.push(visitorUserId);
      following = true;
    }
  });
  toast(following ? '팔로우했어요. 다음 팝업이 열리면 알려드릴게요' : '팔로우를 취소했어요');
}

export function markAllRead(userId: string) {
  update((s) => s.db.notifications.forEach((n) => { if (n.userId === userId) n.read = true; }));
}

export function openNotification(id: string) {
  const n = getState().db.notifications.find((x) => x.id === id);
  update((s) => { const x = s.db.notifications.find((y) => y.id === id); if (x) x.read = true; });
  if (n?.link) navigate(n.link);
}

// ───────── 신고 ─────────
export function submitReport(r: { reporterId: string; targetType: 'profile' | 'post' | 'review' | 'chat'; targetId: string; targetLabel: string; reason: import('@/types').ReportReason; detail: string }) {
  update((s) => {
    s.db.reports.unshift({ id: newId('rp'), ...r, status: 'open', at: nowISO() });
    notify(s.db, 'u_admin', 'system', `새 신고가 접수됐어요: ${r.targetLabel}`, { name: 'tab', tab: 'reports' });
  });
  toast('신고가 접수됐어요. 운영팀이 확인할게요');
}

export function requestVerification(userId: string, bizNumber: string) {
  update((s) => {
    const u = s.db.users.find((x) => x.id === userId)!;
    u.bizNumber = bizNumber;
    u.verifyStatus = 'pending';
    notify(s.db, 'u_admin', 'system', `사업자 인증 요청: ${u.name}`, { name: 'tab', tab: 'verify' });
  });
  toast('인증을 요청했어요. 관리자 승인 후 모든 기능이 열려요');
}

// ───────── 채팅 ─────────
export function ensureRoom(db: DB, memberIds: string[], title: string, context?: import('@/types').ChatRoom['context']) {
  const key = [...memberIds].sort().join(',');
  let room = db.chatRooms.find((r) => [...r.memberIds].sort().join(',') === key && (!context || (r.context?.type === context.type && r.context.refId === context.refId)));
  if (!room) {
    room = { id: newId('ch'), title, memberIds, context, createdAt: nowISO() };
    db.chatRooms.unshift(room);
  }
  return room.id;
}

export function openDirectChat(otherUserId: string, title: string, context?: import('@/types').ChatRoom['context']) {
  const me = getState().session.userByRole[getState().session.role];
  let id = '';
  update((s) => { id = ensureRoom(s.db, [me, otherUserId], title, context); });
  navigate({ name: 'chat', id });
}

const AUTO_REPLIES = ['좋아요! 일정 한번 맞춰 봐요 🙂', '확인했어요. 자세한 건 내일 다시 얘기해요!', '네네, 저도 그렇게 생각했어요.', '사진 몇 장 더 보내 드릴게요.'];

export function sendMessage(roomId: string, text: string) {
  const s0 = getState();
  const me = s0.session.userByRole[s0.session.role];
  update((s) => { s.db.messages.push({ id: newId('m'), roomId, senderId: me, text, at: nowISO() }); });
  // 데모: 상대가 잠시 뒤 답장
  const room = s0.db.chatRooms.find((r) => r.id === roomId);
  const other = room?.memberIds.find((m) => m !== me);
  if (other) {
    setTimeout(() => {
      update((s) => {
        s.db.messages.push({ id: newId('m'), roomId, senderId: other, text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)] + ' (데모 자동 답장)', at: nowISO() });
      });
    }, 1200);
  }
}

// ───────── 같이 해요 제안 ─────────
const brandUser = (db: DB, brandId: string) => db.brands.find((b) => b.id === brandId)!.userId;
const brandName = (db: DB, brandId: string) => db.brands.find((b) => b.id === brandId)!.name;

export function sendProposal(p: Omit<import('@/types').Proposal, 'id' | 'status' | 'createdAt'>) {
  update((s) => {
    s.db.proposals.unshift({ ...p, id: newId('pr'), status: 'sent', createdAt: nowISO() });
    notify(s.db, brandUser(s.db, p.toBrandId), 'proposal', `${brandName(s.db, p.fromBrandId)}이(가) 같이 해요 제안을 보냈어요.`, { name: 'proposals' });
  });
  toast('제안서를 보냈어요');
}

export function respondProposal(id: string, accept: boolean, openChat = true) {
  let roomId = '';
  update((s) => {
    const p = s.db.proposals.find((x) => x.id === id)!;
    const from = brandUser(s.db, p.fromBrandId);
    const to = brandUser(s.db, p.toBrandId);
    if (accept) {
      p.status = 'accepted';
      roomId = ensureRoom(s.db, [from, to], `${brandName(s.db, p.fromBrandId)} × ${brandName(s.db, p.toBrandId)}`, { type: 'proposal', refId: p.id });
      p.chatRoomId = roomId;
      systemMessage(s.db, roomId, `제안서: ${p.period} · ${p.region} · 1인 분담 ${Math.round(p.budgetPerBrand / 10000)}만원 · ${p.teamSize}팀\n"${p.reason}"`);
      systemMessage(s.db, roomId, `${brandName(s.db, p.toBrandId)}이(가) "관심 있어요"를 눌렀어요. 대화를 시작해 보세요!`);
      notify(s.db, from, 'proposal', `${brandName(s.db, p.toBrandId)}이(가) 제안에 "관심 있어요"를 눌렀어요. 채팅방이 열렸어요.`, { name: 'chat', id: roomId });
    } else {
      p.status = 'declined';
      notify(s.db, from, 'proposal', `${brandName(s.db, p.toBrandId)}: "제안 감사해요! 이번에는 일정이 맞지 않아 어렵지만, 다음에 꼭 함께해요." (자동 발송)`, { name: 'brand', id: p.toBrandId });
    }
  });
  if (accept && openChat) navigate({ name: 'chat', id: roomId });
  else if (!accept) toast('정중한 거절 메시지를 자동으로 보냈어요');
}

// ───────── 관심 표시(하트) ─────────
export function toggleHeart(myBrandId: string, targetId: string) {
  let matched = false;
  let on = false;
  update((s) => {
    const me = s.db.brands.find((b) => b.id === myBrandId)!;
    const t = s.db.brands.find((b) => b.id === targetId)!;
    if (me.hearts.includes(targetId)) {
      me.hearts = me.hearts.filter((x) => x !== targetId);
      s.db.interests = s.db.interests.filter((i) => !(i.fromBrandId === myBrandId && i.toBrandId === targetId));
      return;
    }
    on = true;
    me.hearts.push(targetId);
    s.db.interests.push({ id: newId('i'), fromBrandId: myBrandId, toBrandId: targetId, createdAt: nowISO() });
    if (t.hearts.includes(myBrandId)) {
      matched = true;
      notify(s.db, me.userId, 'interest_match', `${t.name}와(과) 서로 관심을 표시했어요! 채팅을 시작해 보세요.`, { name: 'brand', id: t.id });
      notify(s.db, t.userId, 'interest_match', `${me.name}와(과) 서로 관심을 표시했어요! 채팅을 시작해 보세요.`, { name: 'brand', id: me.id });
      s.session.match = targetId;
    }
  });
  if (!matched) toast(on ? '관심을 표시했어요. 상대도 누르면 알려드릴게요' : '관심 표시를 취소했어요');
}

export function startMatchChat(myBrandId: string, targetId: string) {
  let roomId = '';
  update((s) => {
    const me = s.db.brands.find((b) => b.id === myBrandId)!;
    const t = s.db.brands.find((b) => b.id === targetId)!;
    roomId = ensureRoom(s.db, [me.userId, t.userId], `${me.name} × ${t.name}`, { type: 'interest', refId: targetId });
    if (!s.db.messages.some((m) => m.roomId === roomId)) systemMessage(s.db, roomId, '서로 관심을 표시해서 채팅방이 열렸어요 💛');
    s.session.match = undefined;
  });
  navigate({ name: 'chat', id: roomId });
}

// ───────── 모집글 ─────────
export interface RecruitDraft {
  title: string;
  intro: string;
  region: import('@/types').Region;
  period: DateRange;
  totalBudget: number;
  spaceConfirmed: boolean;
  spaceId?: string;
  slotMode: 'category' | 'hanger';
  categorySlots: { category: import('@/types').Category; count: number }[];
  hostCategory?: import('@/types').Category;
  hangerCount: number;
  hostHangers: number;
}

export function createRecruitment(hostBrandId: string, d: RecruitDraft) {
  const id = newId('r');
  update((s) => {
    const slots: import('@/types').Slot[] = [];
    if (d.slotMode === 'category') {
      let hostDone = false;
      d.categorySlots.forEach((c) => {
        for (let i = 0; i < c.count; i++) {
          const isHost = !hostDone && c.category === d.hostCategory;
          if (isHost) hostDone = true;
          slots.push({ id: newId('sl'), label: c.category, category: c.category, hangers: 1, status: isHost ? '모집자' : '비어 있음', brandId: isHost ? hostBrandId : undefined });
        }
      });
    } else {
      for (let i = 0; i < d.hangerCount; i++) {
        const isHost = i < d.hostHangers;
        slots.push({ id: newId('sl'), label: `행거 ${i + 1}`, hangers: 1, status: isHost ? '모집자' : '비어 있음', brandId: isHost ? hostBrandId : undefined });
      }
    }
    s.db.recruitments.unshift({
      id, hostBrandId, title: d.title, intro: d.intro, region: d.region, period: d.period, totalBudget: d.totalBudget,
      spaceConfirmed: d.spaceConfirmed, spaceId: d.spaceConfirmed ? d.spaceId : undefined, slotMode: d.slotMode, slots, status: '모집 중', createdAt: DEMO_TODAY,
    });
  });
  toast('모집글을 올렸어요');
  navigate({ name: 'recruit', id });
}

function refreshRecruitStatus(r: import('@/types').Recruitment) {
  if (r.teamId) { r.status = '마감'; return; }
  const empty = r.slots.some((x) => x.status === '비어 있음');
  const nego = r.slots.some((x) => x.status === '협의 중');
  r.status = empty ? '모집 중' : nego ? '협의 중' : '마감';
}

export function applyRecruitment(recruitmentId: string, brandId: string, slotId: string, message: string) {
  update((s) => {
    const r = s.db.recruitments.find((x) => x.id === recruitmentId)!;
    s.db.recruitApplications.unshift({ id: newId('ra'), recruitmentId, brandId, slotId, message, status: 'pending', createdAt: nowISO() });
    const slot = r.slots.find((x) => x.id === slotId)!;
    slot.status = '협의 중';
    slot.brandId = brandId;
    refreshRecruitStatus(r);
    notify(s.db, brandUser(s.db, r.hostBrandId), 'application_result', `${brandName(s.db, brandId)}이(가) "${r.title}"에 지원했어요.`, { name: 'recruit', id: r.id });
  });
  toast('지원했어요. 모집자가 프로필을 보고 결정해요');
}

/** 데모: 추천 점수 높은 브랜드들이 빈 자리에 지원한다 */
export function simulateApplicants(recruitmentId: string) {
  const db = getState().db;
  const r = db.recruitments.find((x) => x.id === recruitmentId)!;
  const taken = new Set(r.slots.map((x) => x.brandId).filter(Boolean));
  db.recruitApplications.filter((a) => a.recruitmentId === recruitmentId).forEach((a) => taken.add(a.brandId));
  const candidates = db.brands.filter((b) => !taken.has(b.id) && db.users.find((u) => u.id === b.userId)?.verifyStatus === 'verified');
  const empties = r.slots.filter((x) => x.status === '비어 있음');
  const msgs = ['프로필 보고 무드가 잘 맞을 것 같아 지원해요!', '저희 고객층이랑 겹쳐서 시너지가 날 것 같아요.', '이 일정 비어 있어요. 함께하고 싶습니다!'];
  empties.forEach((slot, i) => {
    const c = candidates.find((b) => (!slot.category || b.tags.categories.includes(slot.category)) && !taken.has(b.id)) ?? candidates.find((b) => !taken.has(b.id));
    if (!c) return;
    taken.add(c.id);
    applyRecruitment(recruitmentId, c.id, slot.id, msgs[i % msgs.length]);
  });
}

export function decideApplication(appId: string, accept: boolean) {
  let teamId: string | undefined;
  update((s) => {
    const a = s.db.recruitApplications.find((x) => x.id === appId)!;
    const r = s.db.recruitments.find((x) => x.id === a.recruitmentId)!;
    const slot = r.slots.find((x) => x.id === a.slotId)!;
    a.status = accept ? 'accepted' : 'rejected';
    if (accept) {
      slot.status = '확정';
      slot.brandId = a.brandId;
    } else {
      slot.status = '비어 있음';
      slot.brandId = undefined;
    }
    notify(s.db, brandUser(s.db, a.brandId), 'application_result', accept ? `"${r.title}" 지원이 수락됐어요!` : `"${r.title}" 지원이 이번에는 어렵게 됐어요.`, { name: 'recruit', id: r.id });
    refreshRecruitStatus(r);
    if (r.slots.every((x) => x.status === '확정' || x.status === '모집자')) teamId = createTeamFromRecruitment(s.db, r);
  });
  if (teamId) {
    toast('정원이 찼어요! 팀이 만들어졌어요 🎉');
    navigate({ name: 'team', id: teamId, sub: 'members' });
  } else toast(accept ? '수락했어요' : '거절했어요');
}

export function createTeamFromRecruitment(db: DB, r: import('@/types').Recruitment) {
  const teamId = newId('t');
  const byBrand = new Map<string, { labels: string[]; hangers: number }>();
  r.slots.forEach((sl) => {
    if (!sl.brandId) return;
    const cur = byBrand.get(sl.brandId) ?? { labels: [], hangers: 0 };
    cur.labels.push(sl.label);
    cur.hangers += sl.hangers;
    byBrand.set(sl.brandId, cur);
  });
  const members = [...byBrand.entries()].map(([brandId, v]) => ({
    brandId, slotLabel: v.labels.join(', '), role: brandId === r.hostBrandId ? '팀장' : '팀원', hangers: v.hangers,
  }));
  const hostName = brandName(db, r.hostBrandId);
  db.teams.unshift({
    id: teamId, name: `${hostName}와 친구들`, recruitmentId: r.id, leaderBrandId: r.hostBrandId, members, stage: '준비 중',
    region: r.region, period: r.period, spaceId: r.spaceConfirmed ? r.spaceId : undefined, round: 1, promoChecked: [], confirmed: false,
  });
  db.agreements.push({ teamId, items: { cost: '', space: '', hours: '', stock: '', setup: '', damage: '', cancel: '', promo: '', record: '' }, agreedBy: [], locked: false, updatedAt: nowISO() });
  db.costSplits.push({ teamId, mode: r.slotMode === 'hanger' ? 'hanger' : 'equal', spaceFee: r.totalBudget, commonItems: [], dueDate: r.period.start, paid: [] });
  const dates: string[] = [];
  const d = new Date(r.period.start + 'T00:00:00');
  const e = new Date(r.period.end + 'T00:00:00');
  while (d <= e) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  db.shifts.push({ teamId, dates, timeSlots: ['12:00-16:00', '16:00-20:00'], assign: {} });
  const picks: Record<string, string[]> = {};
  members.forEach((m) => { picks[m.brandId] = db.brands.find((b) => b.id === m.brandId)!.lookbook.slice(0, 3); });
  db.moodboards.push({ teamId, picks, headline: `${r.region}에서 만나는 ${members.length}개의 브랜드` });
  r.teamId = teamId;
  r.status = '마감';
  const memberUsers = members.map((m) => brandUser(db, m.brandId));
  const roomId = ensureRoom(db, memberUsers, `${hostName}와 친구들`, { type: 'team', refId: teamId });
  systemMessage(db, roomId, '팀이 만들어졌어요! 공동 약속서 9개 항목을 함께 채우고 전원 동의하면 팀이 확정돼요.');
  memberUsers.forEach((u) => notify(db, u, 'agreement_request', `팀 "${hostName}와 친구들"이 만들어졌어요. 공동 약속서에 동의해 주세요.`, { name: 'team', id: teamId, sub: 'agreement' }));
  return teamId;
}

// ───────── 팀 공간 ─────────
const teamMemberUsers = (db: DB, teamId: string) => db.teams.find((t) => t.id === teamId)!.members.map((m) => brandUser(db, m.brandId));
const teamRoom = (db: DB, teamId: string) => db.chatRooms.find((r) => r.context?.type === 'team' && r.context.refId === teamId);

export function renameTeam(teamId: string, name: string) {
  update((s) => {
    s.db.teams.find((t) => t.id === teamId)!.name = name;
    const room = teamRoom(s.db, teamId);
    if (room) room.title = name;
  });
}

export function updateAgreementItem(teamId: string, key: import('@/types').AgreementKey, text: string) {
  update((s) => {
    const a = s.db.agreements.find((x) => x.teamId === teamId)!;
    if (a.locked) return;
    if (a.items[key] === text) return;
    a.items[key] = text;
    if (a.agreedBy.length) {
      a.agreedBy = [];
      const room = teamRoom(s.db, teamId);
      if (room) systemMessage(s.db, room.id, '약속서 내용이 바뀌어서 동의 현황이 초기화됐어요. 다시 확인하고 동의해 주세요.');
    }
    a.updatedAt = nowISO();
  });
}

export const AGREEMENT_EXAMPLES: Record<import('@/types').AgreementKey, string> = {
  cost: '대관료+공통비를 행거 수에 비례해 나눠요. 오픈 7일 전까지 팀장에게 납부. 공통비: 청소비, 포스터 인쇄, 쇼핑백',
  space: '입구에서부터 브랜드별 구역을 나누고, 피팅룸·계산대·거울은 공용으로 써요',
  hours: '12:00~20:00 운영. 4시간 교대, 브랜드마다 하루 최소 1타임 근무',
  stock: '재고는 각자 관리·책임. 다른 브랜드 상품을 팔면 판매 장부에 적고 마감 때 정산',
  setup: '오픈 전날 저녁 설치, 마지막 날 마감 후 철거. 원상복구는 모두 함께, 비용은 균등',
  damage: '파손한 브랜드가 책임. 원인을 알 수 없으면 균등 분담',
  cancel: '14일 전까지 전액 환불, 7일 전까지 50%, 이후 환불 없음',
  promo: '오픈 3일 전 오후 7시에 모두 같이 공지. 공통 해시태그 사용',
  record: '현장 사진은 팀원 모두 자유롭게 사용. 매출은 공개하지 않음',
};

export function fillAgreementExamples(teamId: string) {
  update((s) => {
    const a = s.db.agreements.find((x) => x.teamId === teamId)!;
    if (a.locked) return;
    (Object.keys(a.items) as import('@/types').AgreementKey[]).forEach((k) => { if (!a.items[k]) a.items[k] = AGREEMENT_EXAMPLES[k]; });
    a.agreedBy = [];
  });
  toast('빈 항목을 예시 문구로 채웠어요');
}

function lockIfAllAgreed(db: DB, teamId: string) {
  const a = db.agreements.find((x) => x.teamId === teamId)!;
  const t = db.teams.find((x) => x.id === teamId)!;
  if (t.members.every((m) => a.agreedBy.includes(m.brandId))) {
    a.locked = true;
    t.confirmed = true;
    const room = teamRoom(db, teamId);
    if (room) systemMessage(db, room.id, '🎉 전원이 공동 약속서에 동의해서 팀이 확정됐어요! 이제 팀 단위로 공간에 지원할 수 있어요.');
    teamMemberUsers(db, teamId).forEach((u) => notify(db, u, 'agreement_request', `"${t.name}" 팀이 확정됐어요. 공간 지원을 시작해 보세요.`, { name: 'team', id: teamId, sub: 'space' }));
    return true;
  }
  return false;
}

export function agreeAgreement(teamId: string, brandId: string) {
  let locked = false;
  update((s) => {
    const a = s.db.agreements.find((x) => x.teamId === teamId)!;
    if (!a.agreedBy.includes(brandId)) a.agreedBy.push(brandId);
    locked = lockIfAllAgreed(s.db, teamId);
    if (!locked) {
      const t = s.db.teams.find((x) => x.id === teamId)!;
      t.members.filter((m) => !a.agreedBy.includes(m.brandId)).forEach((m) =>
        notify(s.db, brandUser(s.db, m.brandId), 'agreement_request', `"${t.name}" 약속서 동의 요청 (${a.agreedBy.length}/${t.members.length} 동의)`, { name: 'team', id: teamId, sub: 'agreement' }),
      );
    }
  });
  toast(locked ? '전원 동의 완료! 팀이 확정됐어요 🎉' : '동의했어요. 다른 팀원에게 알림을 보냈어요');
}

export function simulateOthersAgree(teamId: string, myBrandId: string) {
  let locked = false;
  update((s) => {
    const a = s.db.agreements.find((x) => x.teamId === teamId)!;
    const t = s.db.teams.find((x) => x.id === teamId)!;
    t.members.forEach((m) => { if (m.brandId !== myBrandId && !a.agreedBy.includes(m.brandId)) a.agreedBy.push(m.brandId); });
    locked = lockIfAllAgreed(s.db, teamId);
  });
  toast(locked ? '전원 동의 완료! 팀이 확정됐어요 🎉' : '다른 팀원들이 동의했어요. 내 동의만 남았어요');
}

export function updateCost(teamId: string, patch: Partial<import('@/types').CostSplit>) {
  update((s) => { Object.assign(s.db.costSplits.find((c) => c.teamId === teamId)!, patch); });
}
export function addCommonItem(teamId: string, label: string, amount: number) {
  update((s) => { s.db.costSplits.find((c) => c.teamId === teamId)!.commonItems.push({ id: newId('c'), label, amount }); });
}
export function removeCommonItem(teamId: string, id: string) {
  update((s) => { const c = s.db.costSplits.find((x) => x.teamId === teamId)!; c.commonItems = c.commonItems.filter((i) => i.id !== id); });
}
export function togglePaid(teamId: string, brandId: string) {
  update((s) => {
    const c = s.db.costSplits.find((x) => x.teamId === teamId)!;
    c.paid = c.paid.includes(brandId) ? c.paid.filter((x) => x !== brandId) : [...c.paid, brandId];
  });
}
export function setMemberHangers(teamId: string, brandId: string, hangers: number) {
  update((s) => { s.db.teams.find((t) => t.id === teamId)!.members.find((m) => m.brandId === brandId)!.hangers = Math.max(1, hangers); });
}
export function setMemberRole(teamId: string, brandId: string, role: string) {
  update((s) => { s.db.teams.find((t) => t.id === teamId)!.members.find((m) => m.brandId === brandId)!.role = role; });
}

export function toggleMoodPick(teamId: string, brandId: string, imgId: string) {
  update((s) => {
    const mb = s.db.moodboards.find((m) => m.teamId === teamId)!;
    const cur = mb.picks[brandId] ?? [];
    if (cur.includes(imgId)) mb.picks[brandId] = cur.filter((x) => x !== imgId);
    else if (cur.length < 3) mb.picks[brandId] = [...cur, imgId];
  });
}
export function setMoodHeadline(teamId: string, headline: string) {
  update((s) => { s.db.moodboards.find((m) => m.teamId === teamId)!.headline = headline; });
}

export function cycleShift(teamId: string, key: string) {
  update((s) => {
    const sh = s.db.shifts.find((x) => x.teamId === teamId)!;
    const t = s.db.teams.find((x) => x.id === teamId)!;
    const order = [undefined, ...t.members.map((m) => m.brandId)];
    const idx = order.indexOf(sh.assign[key]);
    sh.assign[key] = order[(idx + 1) % order.length];
  });
}
export function autoFillShifts(teamId: string) {
  update((s) => {
    const sh = s.db.shifts.find((x) => x.teamId === teamId)!;
    const t = s.db.teams.find((x) => x.id === teamId)!;
    let k = 0;
    sh.dates.forEach((d) => sh.timeSlots.forEach((ts) => { sh.assign[`${d}|${ts}`] = t.members[k++ % t.members.length].brandId; }));
  });
  toast('근무를 골고루 나눠 배정했어요');
}

export function togglePromo(teamId: string, brandId: string) {
  update((s) => {
    const t = s.db.teams.find((x) => x.id === teamId)!;
    t.promoChecked = t.promoChecked.includes(brandId) ? t.promoChecked.filter((x) => x !== brandId) : [...t.promoChecked, brandId];
  });
}

// ───────── 공간 ─────────
export interface SpaceDraft {
  name: string; region: import('@/types').Region; address: string; intro: string; areaM2: number; dailyFee: number; minDays: number;
  facilities: import('@/types').Facility[]; electricKw?: number; teamRental: boolean; fashionOnly: boolean; photoHues: number[];
}

export function saveSpace(landlordId: string, d: SpaceDraft, id?: string) {
  let sid = id ?? '';
  update((s) => {
    if (id) Object.assign(s.db.spaces.find((x) => x.id === id)!, d);
    else {
      sid = newId('s');
      s.db.spaces.unshift({ id: sid, landlordId, ...d, pastPopupIds: [] });
      s.db.landlords.find((l) => l.id === landlordId)!.spaceIds.unshift(sid);
    }
  });
  toast(id ? '공간 정보를 저장했어요' : '공간을 등록했어요. 이제 비는 날을 표시해 주세요');
  return sid;
}

export function toggleAvailability(spaceId: string, date: string) {
  update((s) => {
    const a = s.db.availability.find((x) => x.spaceId === spaceId && x.date === date);
    if (!a) s.db.availability.push({ spaceId, date, status: 'open' });
    else if (a.status === 'open') s.db.availability = s.db.availability.filter((x) => x !== a && !(x.spaceId === spaceId && x.date === date));
  });
}

export function openWeekendsOfMonth(spaceId: string, ym: string) {
  update((s) => {
    const d = new Date(ym + '-01T00:00:00');
    const m = d.getMonth();
    while (d.getMonth() === m) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dow = d.getDay();
      if ((dow === 0 || dow === 5 || dow === 6) && iso > DEMO_TODAY && !s.db.availability.some((x) => x.spaceId === spaceId && x.date === iso))
        s.db.availability.push({ spaceId, date: iso, status: 'open' });
      d.setDate(d.getDate() + 1);
    }
  });
  toast('이 달 금·토·일을 비는 날로 표시했어요');
}

export function askSpaceQuestion(spaceId: string, authorId: string, question: string) {
  update((s) => {
    s.db.spaceQnas.push({ id: newId('sq'), spaceId, authorId, question, createdAt: DEMO_TODAY });
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
    notify(s.db, ll.userId, 'system', `${sp.name}에 새 공개 질문이 올라왔어요.`, { name: 'space', id: spaceId });
  });
  toast('질문을 올렸어요');
}

export function answerSpaceQuestion(qid: string, answer: string) {
  update((s) => {
    const q = s.db.spaceQnas.find((x) => x.id === qid)!;
    q.answer = answer;
    notify(s.db, q.authorId, 'system', '공간 Q&A에 답변이 달렸어요.', { name: 'space', id: q.spaceId });
  });
  toast('답변을 등록했어요');
}

export function applySpace(teamId: string, spaceId: string, dates: DateRange, message: string) {
  update((s) => {
    s.db.spaceApplications.unshift({ id: newId('sa'), teamId, spaceId, dates, message, status: 'pending', direction: 'team', createdAt: nowISO() });
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
    const t = s.db.teams.find((x) => x.id === teamId)!;
    notify(s.db, ll.userId, 'space_application', `"${t.name}" 팀이 ${sp.name}에 지원했어요 (${dates.start.slice(5)}~${dates.end.slice(5)}).`, { name: 'tab', tab: 'inbox' });
  });
  toast('팀 단위로 지원했어요. 팀 소개 페이지가 함께 전달됐어요');
}

const REGION_XY: Record<string, [number, number]> = { 마포구: [24, 42], 종로구: [46, 24], 용산구: [46, 68], 성동구: [74, 50] };

export function decideSpaceApplication(appId: string, accept: boolean) {
  update((s) => {
    const a = s.db.spaceApplications.find((x) => x.id === appId)!;
    const t = s.db.teams.find((x) => x.id === a.teamId)!;
    const sp = s.db.spaces.find((x) => x.id === a.spaceId)!;
    const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
    const members = teamMemberUsers(s.db, t.id);
    a.status = accept ? 'accepted' : 'rejected';
    if (!accept) {
      members.forEach((u) => notify(s.db, u, 'application_result', `${sp.name} 지원이 이번에는 어렵게 됐어요. 다른 공간도 찾아보세요.`, { name: 'team', id: t.id, sub: 'space' }));
      return;
    }
    // 같은 팀의 다른 대기 지원은 자동 취소
    s.db.spaceApplications.forEach((x) => { if (x.teamId === t.id && x.id !== a.id && x.status === 'pending') x.status = 'rejected'; });
    t.spaceId = sp.id;
    t.period = a.dates;
    t.region = sp.region;
    s.db.availability.forEach((x) => { if (x.spaceId === sp.id && x.date >= a.dates.start && x.date <= a.dates.end) x.status = 'booked'; });
    const d = new Date(a.dates.start + 'T00:00:00');
    const e = new Date(a.dates.end + 'T00:00:00');
    while (d <= e) {
      const iso = d.toISOString().slice(0, 10);
      if (!s.db.availability.some((x) => x.spaceId === sp.id && x.date === iso)) s.db.availability.push({ spaceId: sp.id, date: iso, status: 'booked' });
      d.setDate(d.getDate() + 1);
    }
    const cost = s.db.costSplits.find((c) => c.teamId === t.id);
    if (cost) {
      const days = Math.round((new Date(a.dates.end).getTime() - new Date(a.dates.start).getTime()) / 86400000) + 1;
      cost.spaceFee = sp.dailyFee * days;
    }
    let pid = t.popupId && s.db.popups.find((p) => p.id === t.popupId && p.status !== '종료') ? t.popupId : undefined;
    const [x, y] = REGION_XY[sp.region] ?? [50, 50];
    if (!pid) {
      pid = newId('p');
      s.db.popups.unshift({
        id: pid, teamId: t.id, title: t.round > 1 ? `${t.name} ${t.round}회` : t.name, spaceId: sp.id, period: a.dates, hours: '12:00~20:00',
        code: String(100000 + Math.floor(Math.random() * 900000)), status: '예정', mapX: x + (Math.random() * 8 - 4), mapY: y + (Math.random() * 8 - 4),
      });
      t.popupId = pid;
    } else {
      const p = s.db.popups.find((pp) => pp.id === pid)!;
      p.spaceId = sp.id;
      p.period = a.dates;
    }
    if (!sp.pastPopupIds.includes(pid)) sp.pastPopupIds.unshift(pid);
    const roomId = ensureRoom(s.db, [...members, ll.userId], `${t.name} × ${sp.name}`, { type: 'space', refId: sp.id });
    systemMessage(s.db, roomId, `${sp.name} 이용이 확정됐어요 (${a.dates.start} ~ ${a.dates.end}). 입주·철거 시간과 집기를 여기서 맞춰 보세요.`);
    if (sp.fashionOnly) systemMessage(s.db, roomId, '업종 고정 공간이에요. 이전 팀의 집기·연출을 이어 쓸 수 있는지 확인해 보세요.');
    members.forEach((u) => notify(s.db, u, 'application_result', `🎉 ${sp.name}이(가) "${t.name}" 팀의 지원을 수락했어요!`, { name: 'team', id: t.id, sub: 'space' }));
    // 팔로워에게 새 팝업 알림
    const followers = new Set<string>();
    t.members.forEach((m) => s.db.brands.find((b) => b.id === m.brandId)!.followers.forEach((f) => followers.add(f)));
    followers.forEach((f) => notify(s.db, f, 'follow_popup', `팔로우한 브랜드가 참여하는 공동 팝업 "${t.name}"이(가) 열려요! (${a.dates.start.slice(5)}~)`, { name: 'popup', id: pid! }));
  });
  toast(accept ? '수락했어요. 팝업 일정이 등록됐어요' : '거절했어요');
}

/** 임대인이 모집 중인 팀(모집글)에 먼저 공간을 제안 */
export function proposeSpaceToRecruitment(recruitmentId: string, spaceId: string) {
  let roomId = '';
  update((s) => {
    const r = s.db.recruitments.find((x) => x.id === recruitmentId)!;
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
    const hostUser = brandUser(s.db, r.hostBrandId);
    roomId = ensureRoom(s.db, [ll.userId, hostUser], `${sp.name} 제안`, { type: 'space', refId: sp.id });
    systemMessage(s.db, roomId, `${ll.name}님이 "${r.title}" 모집글에 ${sp.name}(1일 ${Math.round(sp.dailyFee / 10000)}만원, ${sp.areaM2}㎡)을 제안했어요.`);
    notify(s.db, hostUser, 'space_application', `${ll.name}님이 "${r.title}"에 ${sp.name}을(를) 제안했어요.`, { name: 'chat', id: roomId });
  });
  toast('모집자에게 공간을 제안했어요');
  return roomId;
}

/** 임대인이 확정된 팀에게 먼저 공간을 제안 */
export function proposeSpaceToTeam(teamId: string, spaceId: string) {
  update((s) => {
    const t = s.db.teams.find((x) => x.id === teamId)!;
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    s.db.spaceApplications.unshift({ id: newId('sa'), teamId, spaceId, dates: t.period, message: `${sp.name}에서 팝업을 열어 보시면 어떨까요?`, status: 'pending', direction: 'landlord', createdAt: nowISO() });
    teamMemberUsers(s.db, teamId).forEach((u) => notify(s.db, u, 'space_application', `${sp.name}이(가) "${t.name}" 팀에 공간을 제안했어요.`, { name: 'team', id: teamId, sub: 'space' }));
  });
  toast('팀에게 공간을 제안했어요');
}

// ───────── 방문 인증 / 리뷰 / 스탬프 ─────────
export const STAMP_GOAL = 3;

export function checkIn(popupId: string, userId: string, code: string): boolean {
  const db = getState().db;
  const p = db.popups.find((x) => x.id === popupId)!;
  if (p.code !== code.trim()) {
    toast('코드가 맞지 않아요. 현장에 붙은 6자리 코드를 확인해 주세요');
    return false;
  }
  if (p.status !== '진행 중') {
    toast(p.status === '예정' ? '아직 팝업이 시작되지 않았어요' : '이미 끝난 팝업이에요');
    return false;
  }
  let reached = false;
  update((s) => {
    if (s.db.visits.some((v) => v.popupId === popupId && v.userId === userId)) return;
    s.db.visits.push({ id: newId('vc'), popupId, userId, at: nowISO() });
    let st = s.db.stamps.find((x) => x.userId === userId);
    if (!st) { st = { userId, popupIds: [], rewardClaimed: false }; s.db.stamps.push(st); }
    if (!st.popupIds.includes(popupId)) st.popupIds.push(popupId);
    if (st.popupIds.length === STAMP_GOAL) {
      reached = true;
      notify(s.db, userId, 'system', `🎉 서로 다른 공동 팝업 ${STAMP_GOAL}곳을 방문했어요! 스탬프 탭에서 혜택 배지를 받아 가세요.`, { name: 'tab', tab: 'stamps' });
    }
  });
  toast(reached ? `방문 인증 완료! 스탬프 ${STAMP_GOAL}개를 모아 혜택 배지가 열렸어요 🎉` : '방문 인증 완료! 스탬프 1개를 적립했어요');
  return true;
}

export function writeVisitorReview(popupId: string, kind: 'visitor_popup' | 'visitor_brand', targetId: string, rating: number, comment: string) {
  const me = getState().session.userByRole[getState().session.role];
  update((s) => {
    s.db.reviews.unshift({ id: newId('rv'), kind, authorId: me, targetId, popupId, scores: { 전체: rating }, comment, createdAt: DEMO_TODAY });
  });
  toast('리뷰를 남겼어요');
}

export function writeComboReview(popupId: string, good: boolean, pairs: [string, string][], rating: number, comment: string) {
  const me = getState().session.userByRole[getState().session.role];
  update((s) => {
    s.db.comboReviews.unshift({ id: newId('cr'), popupId, authorId: me, good, pairs, rating, comment, createdAt: DEMO_TODAY });
  });
  toast('조합 리뷰를 남겼어요. 브랜드 추천에 반영돼요');
}

export function claimStampReward(userId: string) {
  update((s) => { s.db.stamps.find((x) => x.userId === userId)!.rewardClaimed = true; });
  toast('"공동 팝업 탐험가" 배지를 받았어요 (데모)');
}

export function setPopupStatus(popupId: string, status: import('@/types').PopupStatus) {
  update((s) => {
    const p = s.db.popups.find((x) => x.id === popupId)!;
    p.status = status;
    const t = s.db.teams.find((x) => x.id === p.teamId)!;
    if (status === '진행 중') t.stage = '운영 중';
    if (status === '종료') {
      t.stage = '종료';
      const sp = s.db.spaces.find((x) => x.id === p.spaceId)!;
      const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
      const required = [...teamMemberUsers(s.db, t.id), ll.userId];
      if (!s.db.completions.some((c) => c.popupId === p.id)) s.db.completions.push({ teamId: t.id, popupId: p.id, required, confirmedBy: [], verified: false });
      required.forEach((u) => notify(s.db, u, 'completion_request', `"${p.title}" 팝업이 끝났어요. 성사 확인을 눌러 주세요.`, u === ll.userId ? { name: 'tab', tab: 'inbox' } : { name: 'team', id: t.id, sub: 'wrap' }));
    }
  });
  toast(status === '진행 중' ? '팝업이 시작됐어요' : '팝업이 끝났어요. 참여자 모두에게 성사 확인을 요청했어요');
}

// ───────── 성사 확인 / 업무 후기 ─────────
function verifyIfDone(db: DB, c: import('@/types').Completion) {
  if (!c.verified && c.required.every((u) => c.confirmedBy.includes(u))) {
    c.verified = true;
    const p = db.popups.find((x) => x.id === c.popupId)!;
    c.required.forEach((u) => notify(db, u, 'completion_request', `"${p.title}"이(가) 인증 공동 팝업으로 기록됐어요. 이제 후기를 남길 수 있어요.`));
    return true;
  }
  return false;
}

export function confirmCompletion(popupId: string, userId: string) {
  let done = false;
  update((s) => {
    const c = s.db.completions.find((x) => x.popupId === popupId)!;
    if (!c.confirmedBy.includes(userId)) c.confirmedBy.push(userId);
    done = verifyIfDone(s.db, c);
  });
  toast(done ? '모두 확인했어요! 인증 공동 팝업으로 기록됐어요 (신뢰 지수 +2)' : '성사 확인을 눌렀어요. 다른 참여자를 기다려요');
}

export function simulateOthersConfirm(popupId: string, me: string) {
  let done = false;
  update((s) => {
    const c = s.db.completions.find((x) => x.popupId === popupId)!;
    c.required.forEach((u) => { if (u !== me && !c.confirmedBy.includes(u)) c.confirmedBy.push(u); });
    done = verifyIfDone(s.db, c);
  });
  toast(done ? '모두 확인했어요! 인증 공동 팝업으로 기록됐어요' : '다른 참여자들이 확인했어요. 내 확인만 남았어요');
}

export function writeBizReview(r: { kind: 'brand_to_brand' | 'brand_to_space' | 'space_to_team'; authorId: string; targetId: string; teamId: string; popupId: string; scores: Record<string, number>; comment: string }) {
  update((s) => { s.db.reviews.unshift({ id: newId('rv'), ...r, createdAt: DEMO_TODAY }); });
  toast('후기를 남겼어요. 신뢰 지수에 반영돼요');
}

// ───────── 팝업자랑 / Q&A ─────────
export function createShowcase(p: Omit<import('@/types').ShowcasePost, 'id' | 'createdAt'>) {
  const id = newId('sc');
  update((s) => { s.db.showcases.unshift({ ...p, id, createdAt: DEMO_TODAY }); });
  toast('팝업자랑을 올렸어요');
  return id;
}

export function createQna(authorId: string, title: string, body: string, tag: import('@/types').QnaTag) {
  const id = newId('q');
  update((s) => { s.db.qnaPosts.unshift({ id, authorId, title, body, tag, createdAt: DEMO_TODAY }); });
  toast('질문을 올렸어요');
  return id;
}

export function answerQna(postId: string, authorId: string, body: string) {
  update((s) => {
    s.db.qnaAnswers.push({ id: newId('qa'), postId, authorId, body, createdAt: DEMO_TODAY });
    const p = s.db.qnaPosts.find((x) => x.id === postId)!;
    if (p.authorId !== authorId) notify(s.db, p.authorId, 'system', `"${p.title}"에 답변이 달렸어요.`, { name: 'qna', id: postId });
  });
  toast('답변을 등록했어요');
}

// ───────── 관리자 ─────────
export function decideVerification(userId: string, approve: boolean) {
  update((s) => {
    const u = s.db.users.find((x) => x.id === userId)!;
    u.verifyStatus = approve ? 'verified' : 'rejected';
    notify(s.db, userId, 'system', approve ? '사업자 인증이 완료됐어요! 이제 모집·제안·지원·채팅을 쓸 수 있어요.' : '사업자 인증이 반려됐어요. 사업자등록번호를 확인하고 다시 요청해 주세요.', { name: 'tab', tab: 'me' });
  });
  toast(approve ? '인증을 승인했어요' : '인증을 반려했어요');
}

function reportSubject(db: DB, r: import('@/types').Report): { userId?: string; subjectId?: string } {
  const byUser = (uid?: string) => ({ userId: uid, subjectId: db.brands.find((b) => b.userId === uid)?.id ?? db.landlords.find((l) => l.userId === uid)?.id });
  if (r.targetType === 'profile') {
    const b = db.brands.find((x) => x.id === r.targetId);
    return { userId: b?.userId, subjectId: b?.id };
  }
  if (r.targetType === 'review') return byUser(db.reviews.find((x) => x.id === r.targetId)?.authorId);
  if (r.targetType === 'post') return byUser(db.qnaPosts.find((x) => x.id === r.targetId)?.authorId ?? db.showcases.find((x) => x.id === r.targetId)?.authorId);
  return {};
}

export function resolveReport(id: string, action: 'warned' | 'hidden' | 'penalized' | 'dismissed') {
  update((s) => {
    const r = s.db.reports.find((x) => x.id === id)!;
    r.status = action;
    const { userId, subjectId } = reportSubject(s.db, r);
    if (action === 'warned' && userId) {
      const u = s.db.users.find((x) => x.id === userId)!;
      u.warnings = (u.warnings ?? 0) + 1;
      notify(s.db, userId, 'system', `운영 정책 위반으로 경고를 받았어요 (사유: ${r.reason}).`);
    }
    if (action === 'hidden') {
      if (r.targetType === 'review') s.db.reviews.forEach((x) => { if (x.id === r.targetId) x.hidden = true; });
      if (r.targetType === 'post') {
        s.db.qnaPosts.forEach((x) => { if (x.id === r.targetId) x.hidden = true; });
        s.db.showcases.forEach((x) => { if (x.id === r.targetId) x.hidden = true; });
      }
      if (r.targetType === 'profile' && userId) s.db.users.find((x) => x.id === userId)!.hidden = true;
    }
    if (action === 'penalized' && subjectId) {
      s.db.trustEvents.push({ id: newId('te'), subjectId, type: 'report', delta: -5, note: `신고 확정 (${r.reason})`, at: DEMO_TODAY });
      if (userId) notify(s.db, userId, 'system', `신고가 확정되어 신뢰 지수가 5점 차감됐어요 (사유: ${r.reason}).`);
    }
    if (r.reporterId) notify(s.db, r.reporterId, 'system', `신고하신 내용이 처리됐어요: ${r.targetLabel}`);
  });
  toast({ warned: '경고를 보냈어요', hidden: '숨김 처리했어요', penalized: '신뢰 지수 5점을 차감했어요', dismissed: '신고를 기각했어요' }[action]);
}

/** 데모: 공간 없는 확정 팀이 내 공간에 지원한다 (임대인 흐름 체험용) */
export function simulateTeamApplication(spaceId: string) {
  update((s) => {
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    let r = s.db.recruitments.find((x) => !x.teamId && x.status !== '마감');
    if (!r) return;
    const used = new Set(r.slots.map((x) => x.brandId).filter(Boolean));
    r.slots.forEach((sl) => {
      if (sl.status === '확정' || sl.status === '모집자') return;
      const c = s.db.brands.find((b) => !used.has(b.id) && s.db.users.find((u) => u.id === b.userId)?.verifyStatus === 'verified' && (!sl.category || b.tags.categories.includes(sl.category)))
        ?? s.db.brands.find((b) => !used.has(b.id) && s.db.users.find((u) => u.id === b.userId)?.verifyStatus === 'verified');
      if (!c) return;
      used.add(c.id);
      sl.status = '확정';
      sl.brandId = c.id;
    });
    s.db.recruitApplications.forEach((a) => { if (a.recruitmentId === r!.id && a.status === 'pending') a.status = 'accepted'; });
    const teamId = createTeamFromRecruitment(s.db, r);
    const t = s.db.teams.find((x) => x.id === teamId)!;
    const ag = s.db.agreements.find((a) => a.teamId === teamId)!;
    ag.items = { ...AGREEMENT_EXAMPLES };
    ag.agreedBy = t.members.map((m) => m.brandId);
    ag.locked = true;
    t.confirmed = true;
    // 비는 날 중 가장 이른 연속 구간
    const open = s.db.availability.filter((a) => a.spaceId === spaceId && a.status === 'open' && a.date > DEMO_TODAY).map((a) => a.date).sort();
    let dates = t.period;
    for (let i = 0; i < open.length; i++) {
      let j = i;
      while (j + 1 < open.length && (new Date(open[j + 1]).getTime() - new Date(open[j]).getTime()) === 86400000 && j - i + 1 < Math.max(sp.minDays, 2)) j++;
      if (j - i + 1 >= sp.minDays) { dates = { start: open[i], end: open[j] }; break; }
    }
    s.db.spaceApplications.unshift({ id: newId('sa'), teamId, spaceId, dates, message: `${t.name}입니다. ${sp.name}의 분위기가 우리 팀 무드와 잘 맞아서 지원해요!`, status: 'pending', direction: 'team', createdAt: nowISO() });
    const ll = s.db.landlords.find((l) => l.id === sp.landlordId)!;
    notify(s.db, ll.userId, 'space_application', `"${t.name}" 팀이 ${sp.name}에 지원했어요.`, { name: 'tab', tab: 'inbox' });
  });
  toast('데모 팀이 지원했어요');
}

// ───────── 렌탈 제휴 ─────────
export function requestRental(o: Omit<import('@/types').RentalOrder, 'id' | 'status' | 'createdAt'>) {
  const id = newId('ro');
  update((s) => {
    s.db.rentalOrders.unshift({ ...o, id, status: 'requested', createdAt: nowISO() });
    const partner = s.db.rentalPartners.find((p) => p.id === o.partnerId)!;
    const team = s.db.teams.find((t) => t.id === o.teamId);
    notify(s.db, partner.userId, 'rental', `${team ? `${team.name}(${brandName(s.db, o.brandId)})` : brandName(s.db, o.brandId)}이(가) 장비 대여를 요청했어요.`, { name: 'tab', tab: 'orders' });
    if (team) {
      const room = teamRoom(s.db, team.id);
      if (room) systemMessage(s.db, room.id, `${brandName(s.db, o.brandId)}님이 ${partner.name}에 장비 대여를 요청했어요 (${o.dates.start.slice(5)}~${o.dates.end.slice(5)}).`);
    }
  });
  toast('대여를 요청했어요. 업체가 확인하면 알려드릴게요');
  return id;
}

export function decideRental(id: string, accept: boolean) {
  update((s) => {
    const o = s.db.rentalOrders.find((x) => x.id === id)!;
    const partner = s.db.rentalPartners.find((p) => p.id === o.partnerId)!;
    o.status = accept ? 'confirmed' : 'rejected';
    const targets = o.teamId ? teamMemberUsers(s.db, o.teamId) : [brandUser(s.db, o.brandId)];
    targets.forEach((u) => notify(s.db, u, 'rental', accept ? `${partner.name}이(가) 장비 대여를 확정했어요.` : `${partner.name}: 요청하신 날짜에 재고가 없어 이번에는 어려워요.`, o.teamId ? { name: 'team', id: o.teamId, sub: 'rental' } : { name: 'rentals' }));
    if (accept && o.addToTeamCost && o.teamId) {
      const cost = s.db.costSplits.find((c) => c.teamId === o.teamId);
      if (cost) {
        const db = s.db;
        const days = Math.max(1, Math.round((new Date(o.dates.end).getTime() - new Date(o.dates.start).getTime()) / 86400000) + 1);
        let sum = 0;
        o.lines.forEach((l) => { const it = db.rentalItems.find((i) => i.id === l.itemId); if (it) sum += it.partnerPrice * l.qty * days; });
        if (o.delivery && sum < partner.freeDeliveryOver) sum += partner.deliveryFee;
        cost.commonItems.push({ id: newId('c'), label: `렌탈: ${partner.name}`, amount: sum });
      }
    }
  });
  toast(accept ? '예약을 확정했어요' : '예약을 거절했어요');
}

export function advanceRental(id: string) {
  update((s) => {
    const o = s.db.rentalOrders.find((x) => x.id === id)!;
    const partner = s.db.rentalPartners.find((p) => p.id === o.partnerId)!;
    if (o.status === 'confirmed') o.status = 'delivered';
    else if (o.status === 'delivered') {
      o.status = 'returned';
      notify(s.db, brandUser(s.db, o.brandId), 'rental', `${partner.name} 장비 반납이 확인됐어요. 별점을 남겨 주세요.`, o.teamId ? { name: 'team', id: o.teamId, sub: 'rental' } : { name: 'rentals' });
    }
  });
  toast('상태를 바꿨어요');
}

export function rateRental(id: string, rating: number, comment: string) {
  update((s) => {
    const o = s.db.rentalOrders.find((x) => x.id === id)!;
    o.rating = rating;
    o.ratingComment = comment;
  });
  toast('별점을 남겼어요');
}

export function saveRentalItem(partnerId: string, d: Omit<import('@/types').RentalItem, 'id' | 'partnerId'>, id?: string) {
  update((s) => {
    if (id) Object.assign(s.db.rentalItems.find((i) => i.id === id)!, d);
    else s.db.rentalItems.unshift({ ...d, id: newId('ri'), partnerId });
  });
  toast(id ? '장비 정보를 저장했어요' : '장비를 등록했어요. 브랜드들에게 바로 보여요');
}

export function toggleRentalItem(id: string) {
  update((s) => { const it = s.db.rentalItems.find((i) => i.id === id)!; it.active = !it.active; });
}

// ───────── 매거진 ─────────
export function toggleMagazineLike(id: string, userId: string) {
  update((s) => {
    const m = s.db.magazines.find((x) => x.id === id)!;
    m.likes = m.likes.includes(userId) ? m.likes.filter((x) => x !== userId) : [...m.likes, userId];
  });
}

export function publishMagazine(m: Omit<import('@/types').MagazinePost, 'id' | 'likes' | 'createdAt' | 'authorId'>) {
  const id = newId('mg');
  update((s) => {
    s.db.magazines.unshift({ ...m, id, likes: [], authorId: 'u_admin', createdAt: DEMO_TODAY });
    s.db.users.filter((u) => u.role === 'brand' || u.role === 'visitor').forEach((u) => notify(s.db, u.id, 'system', `📰 새 매거진: ${m.title}`, { name: 'magazine', id }));
  });
  toast('매거진을 발행했어요. 브랜드와 방문객에게 알림을 보냈어요');
  return id;
}

export function toggleMagazineHidden(id: string) {
  update((s) => { const m = s.db.magazines.find((x) => x.id === id)!; m.hidden = !m.hidden; });
}

// ───────── 오픈 알림 ─────────
export function toggleWaitlist(popupId: string, userId: string) {
  let on = false;
  update((s) => {
    const p = s.db.popups.find((x) => x.id === popupId)!;
    const w = p.waiters ?? (p.waiters = []);
    if (w.includes(userId)) p.waiters = w.filter((x) => x !== userId);
    else {
      w.push(userId);
      on = true;
    }
  });
  toast(on ? '오픈 알림을 신청했어요. 전날 저녁과 오픈 당일에 알려 드릴게요 (데모)' : '오픈 알림을 껐어요');
}

export function toggleSaveRecruit(brandId: string, recruitmentId: string) {
  let on = false;
  update((s) => {
    const b = s.db.brands.find((x) => x.id === brandId)!;
    const list = b.savedRecruits ?? (b.savedRecruits = []);
    if (list.includes(recruitmentId)) b.savedRecruits = list.filter((x) => x !== recruitmentId);
    else { list.push(recruitmentId); on = true; }
  });
  toast(on ? '찜했어요. 자리가 줄어들면 알려 드릴게요 (데모)' : '찜을 해제했어요');
}

// ───────── 다음 회차 ─────────
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** 끝난 팀을 그대로 이어 다음 회차 팀을 만든다. 약속서·분담 방식·무드보드를 복사하고 공간과 날짜는 새로 정한다. */
export function startNextRound(teamId: string, byBrandId: string) {
  let newTeamId = '';
  update((s) => {
    const db = s.db;
    const prev = db.teams.find((t) => t.id === teamId)!;
    if (db.teams.some((t) => t.name === prev.name && t.round === prev.round + 1)) {
      newTeamId = db.teams.find((t) => t.name === prev.name && t.round === prev.round + 1)!.id;
      return;
    }
    newTeamId = newId('t');
    const start = addDays(DEMO_TODAY, 28);
    const len = Math.max(0, Math.round((new Date(prev.period.end).getTime() - new Date(prev.period.start).getTime()) / 86400000));
    const period = { start, end: addDays(start, len) };
    db.teams.unshift({
      ...structuredClone(prev), id: newTeamId, stage: '준비 중', period, spaceId: undefined, popupId: undefined,
      round: prev.round + 1, promoChecked: [], confirmed: false, recruitmentId: undefined,
    });
    const ag = db.agreements.find((a) => a.teamId === teamId);
    db.agreements.push({ teamId: newTeamId, items: structuredClone(ag?.items ?? ({} as never)), agreedBy: [byBrandId], locked: false, updatedAt: nowISO() });
    const cs = db.costSplits.find((c) => c.teamId === teamId);
    db.costSplits.push({ teamId: newTeamId, mode: cs?.mode ?? 'equal', spaceFee: cs?.spaceFee ?? 0, commonItems: [], dueDate: addDays(start, -7), paid: [] });
    const dates: string[] = [];
    for (let i = 0; i <= len; i++) dates.push(addDays(start, i));
    db.shifts.push({ teamId: newTeamId, dates, timeSlots: ['12:00-16:00', '16:00-20:00'], assign: {} });
    const mb = db.moodboards.find((m) => m.teamId === teamId);
    if (mb) db.moodboards.push({ ...structuredClone(mb), teamId: newTeamId });
    const users = prev.members.map((m) => brandUser(db, m.brandId));
    const roomId = ensureRoom(db, users, `${prev.name} ${prev.round + 1}회`, { type: 'team', refId: newTeamId });
    systemMessage(db, roomId, `${prev.round + 1}회차 팀이 만들어졌어요. 지난 약속서를 그대로 가져왔으니 바뀐 점만 고치고 동의해 주세요.`);
    const me = brandUser(db, byBrandId);
    users.filter((u) => u !== me).forEach((u) =>
      notify(db, u, 'agreement_request', `"${prev.name}" ${prev.round + 1}회차를 같이 열자는 제안이 왔어요. 약속서를 확인해 주세요.`, { name: 'team', id: newTeamId, sub: 'agreement' }),
    );
  });
  toast('다음 회차 팀을 만들었어요. 지난 약속서와 무드보드를 그대로 가져왔어요');
  navigate({ name: 'team', id: newTeamId, sub: 'agreement' });
}

// ───────── 팔로워 소식 ─────────
export function sendFollowerNews(brandId: string, text: string) {
  let n = 0;
  update((s) => {
    const b = s.db.brands.find((x) => x.id === brandId)!;
    (b.news ?? (b.news = [])).unshift({ id: newId('nw'), text, at: nowISO() });
    b.followers.forEach((u) => notify(s.db, u, 'follow_popup', `${b.name}: ${text}`, { name: 'brand', id: b.id }));
    n = b.followers.length;
  });
  toast(n ? `팔로워 ${n}명에게 소식을 보냈어요` : '소식을 올렸어요. 팔로워가 생기면 바로 받아 볼 수 있어요');
}

// ───────── 막판 할인 ─────────
export function setLastMinute(spaceId: string, pct: number) {
  update((s) => {
    const sp = s.db.spaces.find((x) => x.id === spaceId)!;
    sp.lastMinutePct = pct || undefined;
  });
  toast(pct ? `2주 안에 비는 날을 ${pct}% 할인해요. 공간 목록에 할인 표시가 붙어요` : '막판 할인을 껐어요');
}

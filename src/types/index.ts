// OFF STAGE 데이터 모델
// 백엔드 없이 동작하지만, 실제 DB 테이블로 옮기기 쉽도록 엔티티별로 분리하고 id로만 참조한다.

export type ID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string;

// ───────── 공통 / 사용자 ─────────
export type Role = 'brand' | 'landlord' | 'visitor' | 'admin' | 'rental';
export type VerifyStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type LoginProvider = 'kakao' | 'naver';

export interface User {
  id: ID;
  name: string; // 표시 이름 (브랜드명 / 공간 운영자명 / 닉네임)
  role: Role;
  provider: LoginProvider;
  bizNumber?: string; // 사업자등록번호 10자리 (브랜드·임대인)
  verifyStatus: VerifyStatus;
  createdAt: ISODate;
  profileId?: ID; // BrandProfile | LandlordProfile | VisitorProfile
  hidden?: boolean; // 관리자 숨김 처리
  warnings?: number;
  mutedTypes?: NotificationType[]; // 알림 설정에서 끈 종류
}

// ───────── 테마 태그 ─────────
export const MOODS = ['미니멀', '빈티지', '스트릿', '페미닌', '캐주얼', '아웃도어', '아방가르드', '클래식', 'Y2K', '내추럴'] as const;
export const CATEGORIES = ['의류', '주얼리', '가방', '모자', '신발', '기타 액세서리'] as const;
export const PRICE_RANGES = ['3만원 미만', '3~7만원', '7~15만원', '15만원 이상'] as const;
export const AGE_GROUPS = ['10대', '20대 초반', '20대 후반', '30대', '40대 이상'] as const;
export const REGIONS = ['성동구', '마포구', '용산구', '종로구'] as const;

export type Mood = (typeof MOODS)[number];
export type Category = (typeof CATEGORIES)[number];
export type PriceRange = (typeof PRICE_RANGES)[number];
export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Region = (typeof REGIONS)[number];

export interface ThemeTags {
  moods: Mood[]; // 최대 3
  categories: Category[]; // 1개 이상
  price: PriceRange; // 1개
  ages: AgeGroup[]; // 최대 2
}

export interface LookbookImage {
  id: ID;
  brandId: ID;
  // 실제 이미지 대신 색 팔레트로 그리는 플레이스홀더
  hue: number;
  pattern: 'stripe' | 'dot' | 'grid' | 'wave' | 'solid' | 'circle';
  label: string;
  fromInstagram?: boolean;
}

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export interface BrandProfile {
  id: ID;
  userId: ID;
  name: string;
  intro: string;
  tags: ThemeTags;
  instagram?: string;
  channels: { label: string; url: string }[];
  availability: DateRange[]; // 팝업 가능 기간
  lookbook: ID[]; // LookbookImage id
  followers: ID[]; // 방문객 userId
  hearts: ID[]; // 내가 관심 표시한 brandId
  savedRecruits?: ID[]; // 찜한 모집글
  recruitAlertRegions?: Region[]; // 새 모집글 알림 받을 지역
  savedSpaces?: ID[]; // 찜한 공간
  news?: { id: ID; text: string; at: ISODateTime }[]; // 팔로워에게 보낸 소식 (최신이 앞)
  logoHue: number;
}

export interface LandlordProfile {
  id: ID;
  userId: ID;
  name: string;
  intro: string;
  spaceIds: ID[];
}

export interface VisitorProfile {
  id: ID;
  userId: ID;
  nickname: string;
  following: ID[]; // brandId
  regions?: Region[]; // 새 팝업 알림을 받을 동네
}

// ───────── 공간 ─────────
export type Facility = '행거' | '전신거울' | '피팅룸' | '조명' | '전기 용량' | '창고' | '화장실';
export const FACILITIES: Facility[] = ['행거', '전신거울', '피팅룸', '조명', '전기 용량', '창고', '화장실'];

export interface Space {
  id: ID;
  landlordId: ID; // LandlordProfile id
  name: string;
  region: Region;
  address: string;
  intro: string;
  areaM2: number;
  dailyFee: number;
  minDays: number;
  facilities: Facility[];
  electricKw?: number;
  teamRental: boolean; // 팀 단위 대관 가능
  fashionOnly: boolean; // 업종 고정(패션)
  photoHues: number[];
  pastPopupIds: ID[];
  lastMinutePct?: number; // 2주 안에 비는 날 할인율 (%)
}

export interface SpaceAvailability {
  spaceId: ID;
  date: ISODate;
  status: 'open' | 'booked';
}

export interface SpaceQna {
  id: ID;
  spaceId: ID;
  authorId: ID;
  question: string;
  answer?: string;
  createdAt: ISODate;
}

// ───────── 렌탈 제휴 ─────────
// 렌탈 업체는 비는 장비를 팝업에 빌려주고, 소규모 브랜드는 OFF STAGE 제휴가로 싸게 빌린다.
export const RENTAL_CATEGORIES = ['행거', '전신거울', '마네킹', '조명', '진열대', '피팅룸 텐트', '사이니지', 'POS·결제'] as const;
export type RentalCategory = (typeof RENTAL_CATEGORIES)[number];

export interface RentalPartner {
  id: ID;
  userId: ID;
  name: string;
  intro: string;
  regions: Region[]; // 배송 가능 지역
  deliveryFee: number; // 왕복 배송·설치비
  freeDeliveryOver: number; // 이 금액 이상이면 배송 무료
  hue: number;
}

export interface RentalItem {
  id: ID;
  partnerId: ID;
  name: string;
  category: RentalCategory;
  desc: string;
  dailyPrice: number; // 일반 대여가 (1일)
  partnerPrice: number; // OFF STAGE 제휴가 (1일)
  stock: number;
  hue: number;
  active: boolean;
}

export type RentalOrderStatus = 'requested' | 'confirmed' | 'delivered' | 'returned' | 'rejected';

export interface RentalOrder {
  id: ID;
  partnerId: ID;
  teamId?: ID; // 팀 단위 예약이면 팀
  brandId: ID; // 신청한 브랜드
  spaceId?: ID;
  lines: { itemId: ID; qty: number }[];
  dates: DateRange;
  delivery: boolean;
  addToTeamCost: boolean; // 팀 분담금 공통비로 넣기
  memo: string;
  status: RentalOrderStatus;
  rating?: number; // 반납 후 브랜드가 남긴 별점
  ratingComment?: string;
  createdAt: ISODateTime;
}

// ───────── 제안 / 관심 ─────────
export interface Proposal {
  id: ID;
  fromBrandId: ID;
  toBrandId: ID;
  period: string;
  region: Region | '상관없음';
  budgetPerBrand: number;
  teamSize: number;
  reason: string; // 200자
  status: 'sent' | 'accepted' | 'declined';
  chatRoomId?: ID;
  createdAt: ISODateTime;
}

export interface Interest {
  id: ID;
  fromBrandId: ID;
  toBrandId: ID;
  createdAt: ISODateTime;
}

// ───────── 모집 ─────────
export type RecruitStatus = '모집 중' | '협의 중' | '마감';
export type SlotStatus = '모집자' | '확정' | '협의 중' | '비어 있음';

export interface Slot {
  id: ID;
  label: string; // '의류' 또는 '행거 1'
  category?: Category;
  hangers: number; // 행거 단위 비례 계산용 (카테고리 슬롯은 1)
  status: SlotStatus;
  brandId?: ID;
}

export interface RecruitApplication {
  id: ID;
  recruitmentId: ID;
  brandId: ID;
  slotId: ID;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: ISODateTime;
}

export interface Recruitment {
  id: ID;
  hostBrandId: ID;
  title: string;
  intro: string;
  region: Region;
  period: DateRange;
  totalBudget: number;
  spaceConfirmed: boolean;
  spaceId?: ID;
  slotMode: 'category' | 'hanger';
  slots: Slot[];
  status: RecruitStatus;
  teamId?: ID;
  createdAt: ISODate;
}

// ───────── 팀 ─────────
export type TeamStage = '준비 중' | '운영 중' | '종료';

export interface TeamMember {
  brandId: ID;
  slotLabel: string;
  role: string; // 예: 팀장, 홍보 담당
  hangers: number;
}

export const AGREEMENT_ITEMS = [
  { key: 'cost', title: '분담금', hint: '금액, 납부 기한, 공통비 포함 범위' },
  { key: 'space', title: '공간', hint: '자리 수와 위치, 공용 공간 규칙' },
  { key: 'hours', title: '운영 시간과 근무', hint: '오픈·마감 시간, 근무 방식' },
  { key: 'stock', title: '재고와 결제', hint: '분실·도난 책임, 교차 판매 정산' },
  { key: 'setup', title: '설치와 철거', hint: '원상복구 분담' },
  { key: 'damage', title: '파손 책임', hint: '집기·공간 파손 시 처리' },
  { key: 'cancel', title: '취소와 환불', hint: '취소 시점별 환불 기준' },
  { key: 'promo', title: '홍보 의무', hint: '같은 날 공지, 공통 해시태그' },
  { key: 'record', title: '기록', hint: '사진 활용 동의, 매출 공개 여부' },
] as const;
export type AgreementKey = (typeof AGREEMENT_ITEMS)[number]['key'];

export interface Agreement {
  teamId: ID;
  items: Record<AgreementKey, string>;
  agreedBy: ID[]; // brandId
  locked: boolean; // 전원 동의 시 확정
  updatedAt: ISODateTime;
}

export interface CostItem {
  id: ID;
  label: string;
  amount: number;
}

export interface CostSplit {
  teamId: ID;
  mode: 'equal' | 'hanger';
  spaceFee: number;
  commonItems: CostItem[];
  dueDate: ISODate;
  paid: ID[]; // brandId
}

export interface ShiftSchedule {
  teamId: ID;
  dates: ISODate[];
  timeSlots: string[]; // '11:00-15:00'
  assign: Record<string, ID | undefined>; // key `${date}|${slot}` -> brandId
}

export interface TeamMoodboard {
  teamId: ID;
  picks: Record<ID, ID[]>; // brandId -> lookbook image ids (3장)
  headline: string;
}

export interface Team {
  id: ID;
  name: string;
  recruitmentId?: ID;
  leaderBrandId: ID;
  members: TeamMember[];
  stage: TeamStage;
  region: Region;
  period: DateRange;
  spaceId?: ID;
  popupId?: ID;
  round: number; // 회차
  promoChecked: ID[]; // 홍보 같은 날 게시 체크한 brandId
  confirmed: boolean; // 약속서 전원 동의로 팀 확정
}

export interface SpaceApplication {
  id: ID;
  teamId: ID;
  spaceId: ID;
  dates: DateRange;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  direction: 'team' | 'landlord'; // 팀 지원 / 임대인 먼저 제안
  createdAt: ISODateTime;
}

// ───────── 팝업 / 방문 ─────────
export type PopupStatus = '예정' | '진행 중' | '종료';

export interface Popup {
  id: ID;
  teamId: ID;
  title: string;
  spaceId: ID;
  period: DateRange;
  hours: string;
  code: string; // 6자리 방문 인증 코드
  status: PopupStatus;
  // 지도 표시용 (0~100 상대 좌표)
  mapX: number;
  mapY: number;
  waiters?: ID[]; // 오픈 알림을 신청한 userId
  waitBase?: number; // 목업용: 앱 밖에서 이미 신청한 사람 수
}

export interface VisitCheckIn {
  id: ID;
  popupId: ID;
  userId: ID;
  at: ISODateTime;
}

export interface Stamp {
  userId: ID;
  popupIds: ID[];
  rewardClaimed: boolean;
}

// ───────── 성사 확인 / 후기 ─────────
export interface Completion {
  teamId: ID;
  popupId?: ID;
  confirmedBy: ID[]; // userId (팀원 전원 + 임대인)
  required: ID[]; // userId
  verified: boolean;
}

export type ReviewKind = 'brand_to_brand' | 'brand_to_space' | 'space_to_team' | 'visitor_popup' | 'visitor_brand';

export const REVIEW_CRITERIA: Record<'brand_to_brand' | 'brand_to_space' | 'space_to_team', string[]> = {
  brand_to_brand: ['분담금 이행', '역할 이행', '소통'],
  brand_to_space: ['정보 정확성', '소통', '조건 투명성', '인수인계'],
  space_to_team: ['약속 이행', '이용 규칙', '원상복구', '일정 준수'],
};

export interface Review {
  id: ID;
  kind: ReviewKind;
  authorId: ID; // userId
  targetId: ID; // brandId | spaceId | teamId | popupId
  teamId?: ID;
  popupId?: ID;
  scores: Record<string, number>; // 항목 -> 1~5
  comment: string;
  createdAt: ISODate;
  hidden?: boolean;
}

export interface ComboReview {
  id: ID;
  popupId: ID;
  authorId: ID;
  good: boolean; // 이 조합 좋았어요
  pairs: [ID, ID][]; // 잘 어울린 브랜드 쌍
  rating: number; // 1~5
  comment: string;
  createdAt: ISODate;
}

export type TrustEventType = 'completion' | 'high_review' | 'low_review' | 'noshow' | 'cancel' | 'report';

export interface TrustEvent {
  id: ID;
  subjectId: ID; // brandId | landlordProfileId
  type: TrustEventType;
  delta: number;
  note: string;
  at: ISODate;
}

export type Grade = '새싹' | '브론즈' | '실버' | '골드';

export interface TrustScore {
  subjectId: ID;
  score: number;
  grade: Grade;
  verifiedPopups: number;
  avgRating: number | null;
  reviewCount: number;
}

// ───────── 팝업자랑 / Q&A ─────────
export interface ShowcasePost {
  id: ID;
  teamId: ID;
  popupId?: ID;
  title: string;
  period: DateRange;
  spaceId: ID;
  brandIds: ID[];
  photoHues: number[];
  tips: string;
  body: string;
  sales?: string; // 본인 공개 정보
  visitors?: number; // 본인 공개 정보
  authorId: ID;
  createdAt: ISODate;
  hidden?: boolean;
  helpful?: ID[]; // 운영 팁이 도움됐다고 누른 userId
}

export const QNA_TAGS = ['원상복구', '신고·허가', '비용', '계약', '운영', '홍보', '기타'] as const;
export type QnaTag = (typeof QNA_TAGS)[number];

export interface QnaPost {
  id: ID;
  authorId: ID;
  title: string;
  body: string;
  tag: QnaTag;
  createdAt: ISODate;
  hidden?: boolean;
}

export interface QnaAnswer {
  id: ID;
  postId: ID;
  authorId: ID;
  body: string;
  createdAt: ISODate;
}

// ───────── 매거진 (카드뉴스) ─────────
export const MAGAZINE_CATEGORIES = ['팝업 동향', '뜨는 지역', '운영 팁', '팀 인터뷰'] as const;
export type MagazineCategory = (typeof MAGAZINE_CATEGORIES)[number];

export interface MagazineCard {
  heading: string;
  body: string;
  stat?: string; // 큰 숫자 강조 (예: '3.4팀')
}

export interface MagazinePost {
  id: ID;
  title: string;
  subtitle: string;
  category: MagazineCategory;
  cards: MagazineCard[];
  hue: number;
  region?: Region;
  link?: Route; // 관련 화면 (공간, 팝업자랑 등)
  authorId: ID; // 운영팀
  likes: ID[];
  createdAt: ISODate;
  hidden?: boolean;
}

export const OFFICIAL_INSTAGRAM = 'o_f_f_stage';

// ───────── 채팅 / 알림 / 신고 ─────────
export interface ChatRoom {
  id: ID;
  title: string;
  memberIds: ID[]; // userId
  context?: { type: 'proposal' | 'interest' | 'team' | 'space' | 'recruit'; refId: ID };
  createdAt: ISODateTime;
  readAt?: Record<ID, ISODateTime>; // userId별 마지막으로 읽은 시각
}

export interface Message {
  id: ID;
  roomId: ID;
  senderId: ID | 'system';
  text: string;
  at: ISODateTime;
}

export type NotificationType =
  | 'proposal'
  | 'interest_match'
  | 'application_result'
  | 'agreement_request'
  | 'completion_request'
  | 'follow_popup'
  | 'space_application'
  | 'rental'
  | 'new_recruit'
  | 'system';

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  text: string;
  link?: Route;
  read: boolean;
  at: ISODateTime;
}

export const REPORT_REASONS = ['허위 정보', '노쇼·약속 불이행', '욕설·비방', '스팸·광고', '부적절한 사진', '기타'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: 'profile' | 'post' | 'review' | 'chat';
  targetId: ID;
  targetLabel: string;
  reason: ReportReason;
  detail: string;
  status: 'open' | 'warned' | 'hidden' | 'penalized' | 'dismissed';
  at: ISODateTime;
}

// ───────── 화면 라우트 ─────────
export type Route =
  | { name: 'tab'; tab: string; filter?: string } // filter: 탭을 열 때 미리 고를 필터(예: '찜')
  | { name: 'brand'; id: ID }
  | { name: 'propose'; toBrandId: ID }
  | { name: 'chatList' }
  | { name: 'chat'; id: ID }
  | { name: 'notifications' }
  | { name: 'recruit'; id: ID }
  | { name: 'recruitNew' }
  | { name: 'team'; id: ID; sub?: string }
  | { name: 'space'; id: ID }
  | { name: 'spaceEdit'; id?: ID }
  | { name: 'popup'; id: ID }
  | { name: 'showcase'; id: ID }
  | { name: 'showcaseNew'; teamId: ID }
  | { name: 'qna'; id: ID }
  | { name: 'qnaNew' }
  | { name: 'review'; teamId: ID }
  | { name: 'onboarding' }
  | { name: 'proposals' }
  | { name: 'rentals'; teamId?: ID }
  | { name: 'rentalPartner'; id: ID; teamId?: ID }
  | { name: 'rentalItemEdit'; id?: ID }
  | { name: 'magazine'; id: ID }
  | { name: 'magazineNew' };

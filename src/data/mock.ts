// 목업 데이터. 모든 브랜드·공간·사람 이름은 지어낸 예시다.
import type {
  Agreement,
  BrandProfile,
  ChatRoom,
  ComboReview,
  Completion,
  CostSplit,
  LandlordProfile,
  LookbookImage,
  Message,
  Notification,
  Popup,
  QnaAnswer,
  QnaPost,
  Recruitment,
  RecruitApplication,
  Report,
  Review,
  ShiftSchedule,
  ShowcasePost,
  Space,
  SpaceApplication,
  SpaceAvailability,
  SpaceQna,
  Stamp,
  Team,
  TeamMoodboard,
  ThemeTags,
  TrustEvent,
  User,
  VisitCheckIn,
  VisitorProfile,
  Proposal,
  Interest,
  RentalItem,
  RentalOrder,
  RentalPartner,
  MagazinePost,
} from '@/types';

export const DEMO_TODAY = '2026-10-25';

const PATTERNS: LookbookImage['pattern'][] = ['stripe', 'dot', 'grid', 'wave', 'solid', 'circle'];

type BrandSeed = {
  id: string;
  name: string;
  intro: string;
  tags: ThemeTags;
  hue: number;
  insta: string;
  labels: string[];
  availability: { start: string; end: string }[];
};

const brandSeeds: BrandSeed[] = [
  {
    id: 'b1', name: '오브제먼트', hue: 28, insta: 'objetment.studio',
    intro: '매일 입는 옷을 오래 입는 옷으로. 군더더기 없는 실루엣의 데일리웨어를 만듭니다.',
    tags: { moods: ['미니멀', '내추럴'], categories: ['의류'], price: '7~15만원', ages: ['20대 후반', '30대'] },
    labels: ['린넨 셔츠', '와이드 슬랙스', '울 베스트', '코튼 원피스', '니트 카디건', '트렌치'],
    availability: [{ start: '2026-11-01', end: '2026-11-30' }, { start: '2027-01-10', end: '2027-02-15' }],
  },
  {
    id: 'b2', name: '소금상점', hue: 190, insta: 'sogeum.shop',
    intro: '바닷가 작업실에서 손으로 두드려 만드는 은 주얼리. 모양이 조금씩 다른 것이 매력입니다.',
    tags: { moods: ['내추럴', '미니멀'], categories: ['주얼리'], price: '3~7만원', ages: ['20대 후반', '30대'] },
    labels: ['은 반지', '물결 귀걸이', '조약돌 목걸이', '체인 팔찌', '진주 링', '해초 브로치'],
    availability: [{ start: '2026-11-01', end: '2026-12-20' }],
  },
  {
    id: 'b3', name: '낮은달', hue: 40, insta: 'lowmoon.bag',
    intro: '오래된 가죽과 캔버스로 만드는 빈티지 무드의 가방. 한 번 고치면 십 년 쓰는 가방을 지향해요.',
    tags: { moods: ['빈티지', '내추럴', '클래식'], categories: ['가방'], price: '7~15만원', ages: ['20대 후반', '30대'] },
    labels: ['캔버스 토트', '가죽 크로스백', '버킷백', '미니 파우치', '숄더백', '북 커버'],
    availability: [{ start: '2026-11-05', end: '2026-12-31' }],
  },
  {
    id: 'b4', name: '크랙스튜디오', hue: 0, insta: 'crack.std',
    intro: '서울 골목 그래피티에서 영감을 받은 스트릿 모자와 그래픽 티.',
    tags: { moods: ['스트릿', '캐주얼'], categories: ['모자', '의류'], price: '3~7만원', ages: ['10대', '20대 초반'] },
    labels: ['볼캡', '비니', '그래픽 티', '버킷햇', '후드', '트러커캡'],
    availability: [{ start: '2026-10-20', end: '2026-12-31' }],
  },
  {
    id: 'b5', name: '플로라룸', hue: 330, insta: 'flora.room',
    intro: '꽃잎을 닮은 레진·비즈 주얼리. 선물하기 좋은 작은 것들을 만들어요.',
    tags: { moods: ['페미닌', '내추럴'], categories: ['주얼리', '기타 액세서리'], price: '3만원 미만', ages: ['20대 초반', '20대 후반'] },
    labels: ['비즈 반지', '레진 귀걸이', '헤어핀', '꽃 브로치', '참 키링', '진주 집게핀'],
    availability: [{ start: '2026-11-15', end: '2026-12-24' }],
  },
  {
    id: 'b6', name: '무드캠프', hue: 110, insta: 'moodcamp.kr',
    intro: '도시에서도 입는 아웃도어. 기능성 원단으로 만든 일상복입니다.',
    tags: { moods: ['아웃도어', '캐주얼'], categories: ['의류', '모자'], price: '7~15만원', ages: ['20대 후반', '30대'] },
    labels: ['플리스', '윈드 재킷', '카고 팬츠', '캠프캡', '패딩 베스트', '아노락'],
    availability: [{ start: '2026-11-20', end: '2027-01-31' }],
  },
  {
    id: 'b7', name: '은하수공방', hue: 260, insta: 'galaxy.atelier',
    intro: '반짝이는 Y2K 감성의 폰 스트랩, 키링, 헤어 액세서리.',
    tags: { moods: ['Y2K', '스트릿'], categories: ['기타 액세서리'], price: '3만원 미만', ages: ['10대', '20대 초반'] },
    labels: ['폰 스트랩', '비즈 키링', '나비 핀', '하트 참', '헤어밴드', '스티커 팩'],
    availability: [{ start: '2026-10-20', end: '2026-11-30' }],
  },
  {
    id: 'b8', name: '오래된정원', hue: 75, insta: 'oldgarden.wear',
    intro: '할머니 옷장에서 꺼낸 듯한 클래식 니트와 셔츠. 빈티지 단추를 하나하나 골라 답니다.',
    tags: { moods: ['클래식', '빈티지'], categories: ['의류'], price: '7~15만원', ages: ['30대', '40대 이상'] },
    labels: ['케이블 니트', '칼라 셔츠', '플리츠 스커트', '울 코트', '조끼', '머플러'],
    availability: [{ start: '2026-12-01', end: '2027-01-31' }],
  },
  {
    id: 'b9', name: '리프레시', hue: 160, insta: 'refresh.shoes',
    intro: '가볍고 편한 캐주얼 스니커즈와 슬립온. 걷는 게 즐거워지는 신발.',
    tags: { moods: ['캐주얼', '스트릿'], categories: ['신발'], price: '7~15만원', ages: ['20대 초반', '20대 후반'] },
    labels: ['캔버스 스니커즈', '슬립온', '러너', '뮬', '하이탑', '샌들'],
    availability: [{ start: '2026-10-20', end: '2026-12-15' }],
  },
  {
    id: 'b10', name: '아틀리에 해무', hue: 220, insta: 'atelier.haemu',
    intro: '비대칭 패턴과 해체적 재단. 실험적인 옷을 소량만 만듭니다.',
    tags: { moods: ['아방가르드', '미니멀'], categories: ['의류', '가방'], price: '15만원 이상', ages: ['20대 후반', '30대'] },
    labels: ['드레이프 탑', '비대칭 스커트', '랩 팬츠', '오버 코트', '구조 백', '레이어드 셔츠'],
    availability: [{ start: '2026-11-10', end: '2026-12-10' }],
  },
  {
    id: 'b11', name: '반짝임', hue: 290, insta: 'banjjak.im',
    intro: '오늘을 반짝이게 하는 Y2K 실버 주얼리. 큐빅과 체인 레이어링을 좋아해요.',
    tags: { moods: ['Y2K', '스트릿', '페미닌'], categories: ['주얼리'], price: '3만원 미만', ages: ['10대', '20대 초반'] },
    labels: ['체인 목걸이', '큐빅 링', '하트 귀걸이', '나비 팔찌', '레이어드 세트', '이어커프'],
    availability: [{ start: '2026-10-20', end: '2026-11-30' }],
  },
  {
    id: 'b12', name: '모래시계', hue: 35, insta: 'sandglass.leather',
    intro: '시간이 지날수록 멋이 드는 베지터블 가죽 가방과 지갑.',
    tags: { moods: ['클래식', '미니멀'], categories: ['가방', '기타 액세서리'], price: '15만원 이상', ages: ['30대', '40대 이상'] },
    labels: ['서류 가방', '반지갑', '카드 지갑', '클러치', '키 홀더', '벨트'],
    availability: [{ start: '2026-11-01', end: '2027-01-15' }],
  },
];

export function makeLookbook(brandId: string, baseHue: number, labels: string[], fromInstagram = false): LookbookImage[] {
  return labels.map((label, i) => ({
    id: `${brandId}_img${fromInstagram ? 'ig' : ''}${i + 1}`,
    brandId,
    hue: (baseHue + i * 17) % 360,
    pattern: PATTERNS[i % PATTERNS.length],
    label,
    fromInstagram,
  }));
}

export const INSTAGRAM_SAMPLE_LABELS = ['신상 착용컷', '디테일', '작업실', '스타일링', '패키지', '포토 데이', '팝업 현장', '컬러 칩', '룩 01'];

const lookbookImages: LookbookImage[] = brandSeeds.flatMap((b) => makeLookbook(b.id, b.hue, b.labels));

const brands: BrandProfile[] = brandSeeds.map((b) => ({
  id: b.id,
  userId: `u_${b.id}`,
  name: b.name,
  intro: b.intro,
  tags: b.tags,
  instagram: b.insta,
  channels: [
    { label: '인스타그램', url: `https://instagram.com/${b.insta}` },
    { label: '스마트스토어', url: `https://example.com/store/${b.id}` },
  ],
  availability: b.availability,
  lookbook: lookbookImages.filter((i) => i.brandId === b.id).map((i) => i.id),
  followers: [],
  hearts: [],
  logoHue: b.hue,
}));
// 팔로워 소식 예시
brands.find((b) => b.id === 'b4')!.news = [
  { id: 'nw1', text: '골목 옷장 마지막 주말! 현장에서 팔로워 10% 할인해요', at: '2026-10-24T18:00:00' },
  { id: 'nw2', text: '겨울 비니 신상 입고했어요. 팝업에서 먼저 보여 드릴게요', at: '2026-10-20T12:00:00' },
];
// 공간 찜 시드: 임대인이 막판 할인을 켜면 이 브랜드들에게 알림이 간다
brands.find((b) => b.id === 'b5')!.savedSpaces = ['s1'];
brands.find((b) => b.id === 'b6')!.savedSpaces = ['s1', 's3'];
brands.find((b) => b.id === 'b5')!.recruitAlertRegions = ['성동구'];
brands.find((b) => b.id === 'b6')!.recruitAlertRegions = ['성동구', '마포구'];
brands.find((b) => b.id === 'b3')!.recruitAlertRegions = ['마포구'];
// 관심(하트) 시드: b2가 이미 b1에게 하트를 눌러 둔 상태 → b1이 b2에게 하트하면 매칭
brands.find((b) => b.id === 'b2')!.hearts = ['b1'];
brands.find((b) => b.id === 'b4')!.followers = ['u_v1', 'u_v2'];
brands.find((b) => b.id === 'b8')!.followers = ['u_v1'];

// 인증 대기 중인 신규 브랜드 (관리자 승인 데모)
brands.push({
  id: 'b13', userId: 'u_b13', name: '초록양말', intro: '재생 원사로 만든 양말과 워머.',
  tags: { moods: ['내추럴', '캐주얼'], categories: ['기타 액세서리'], price: '3만원 미만', ages: ['20대 후반', '30대'] },
  channels: [], availability: [{ start: '2026-12-01', end: '2026-12-31' }],
  lookbook: [], followers: [], hearts: [], logoHue: 130,
});

const landlords: LandlordProfile[] = [
  { id: 'l1', userId: 'u_l1', name: '공간지기 해솔', intro: '성수동에서 팝업 공간 두 곳을 운영합니다. 팀 단위 팝업을 환영해요.', spaceIds: ['s1', 's6'] },
  { id: 'l2', userId: 'u_l2', name: '연남 다락', intro: '연남동 골목 1층 상가를 운영합니다.', spaceIds: ['s2'] },
  { id: 'l3', userId: 'u_l3', name: '한남 스페이스랩', intro: '전시와 쇼룸 중심의 공간을 운영합니다.', spaceIds: ['s3', 's4'] },
  { id: 'l4', userId: 'u_l4', name: '서촌 마루지기', intro: '한옥을 고쳐 만든 공간에서 작은 브랜드를 만납니다.', spaceIds: ['s5'] },
];

const spaces: Space[] = [
  {
    id: 's1', landlordId: 'l1', name: '성수 오픈룸 A', region: '성동구', address: '서울 성동구 성수이로 (예시) 12',
    intro: '통창이 있는 1층 코너 공간. 행거 8개와 피팅룸 2개가 기본 구비되어 있어요.',
    areaM2: 49, dailyFee: 800000, minDays: 2, facilities: ['행거', '전신거울', '피팅룸', '조명', '전기 용량', '화장실'], electricKw: 10,
    teamRental: true, fashionOnly: true, photoHues: [30, 200, 45], pastPopupIds: [],
  },
  {
    id: 's2', landlordId: 'l2', name: '연남 코너하우스', region: '마포구', address: '서울 마포구 연남로 (예시) 34',
    intro: '연트럴파크에서 한 블록. 주말 유동 인구가 많은 골목 1층입니다.',
    areaM2: 33, dailyFee: 500000, minDays: 3, facilities: ['행거', '전신거울', '조명', '화장실'], electricKw: 5,
    teamRental: true, fashionOnly: true, photoHues: [10, 50, 330], pastPopupIds: ['p1'], lastMinutePct: 20,
  },
  {
    id: 's3', landlordId: 'l3', name: '한남 화이트큐브', region: '용산구', address: '서울 용산구 한남대로 (예시) 56',
    intro: '층고 4.5m의 화이트 갤러리. 쇼룸·전시형 팝업에 어울려요.',
    areaM2: 99, dailyFee: 2000000, minDays: 3, facilities: ['조명', '전기 용량', '창고', '화장실', '전신거울'], electricKw: 20,
    teamRental: true, fashionOnly: false, photoHues: [0, 220, 240], pastPopupIds: [],
  },
  {
    id: 's4', landlordId: 'l3', name: '해방촌 계단집', region: '용산구', address: '서울 용산구 신흥로 (예시) 78',
    intro: '계단 위 작은 2층 공간. 작은 브랜드 3~4팀이 함께 쓰기 좋아요.',
    areaM2: 26, dailyFee: 300000, minDays: 2, facilities: ['행거', '전신거울', '조명'], electricKw: 3,
    teamRental: true, fashionOnly: true, photoHues: [80, 20, 160], pastPopupIds: ['p3'],
  },
  {
    id: 's5', landlordId: 'l4', name: '서촌 한옥마루', region: '종로구', address: '서울 종로구 자하문로 (예시) 90',
    intro: '대청마루와 작은 마당이 있는 한옥. 클래식·내추럴 무드 브랜드에게 추천해요.',
    areaM2: 59, dailyFee: 1200000, minDays: 2, facilities: ['조명', '창고', '화장실', '전신거울'], electricKw: 7,
    teamRental: true, fashionOnly: false, photoHues: [35, 100, 25], pastPopupIds: ['p4'],
  },
  {
    id: 's6', landlordId: 'l1', name: '서울숲 유리온실', region: '성동구', address: '서울 성동구 서울숲길 (예시) 21',
    intro: '유리 천장 아래 자연광이 가득한 공간. 사진이 잘 나오는 곳으로 유명해요.',
    areaM2: 66, dailyFee: 1500000, minDays: 2, facilities: ['행거', '전신거울', '피팅룸', '조명', '전기 용량', '창고', '화장실'], electricKw: 15,
    teamRental: false, fashionOnly: true, photoHues: [120, 90, 180], pastPopupIds: [],
  },
];

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  while (d <= e) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
export { datesBetween };

// 비는 날: 11~12월 중 공간별로 다른 날을 열어 둔다
const availability: SpaceAvailability[] = [];
spaces.forEach((s, idx) => {
  datesBetween('2026-10-26', '2026-12-31').forEach((date, i) => {
    const day = new Date(date + 'T00:00:00').getDay();
    const open = (i + idx * 3) % 7 < 5 || day === 6;
    availability.push({ spaceId: s.id, date, status: open ? 'open' : 'booked' });
  });
});
// 팀1(가을 산책단)이 잡은 날짜는 예약됨
availability.forEach((a) => {
  if (a.spaceId === 's1' && a.date >= '2026-11-07' && a.date <= '2026-11-09') a.status = 'booked';
});

const users: User[] = [
  ...brandSeeds.map<User>((b, i) => ({
    id: `u_${b.id}`, name: b.name, role: 'brand', provider: i % 2 ? 'naver' : 'kakao',
    bizNumber: `${120 + i}-81-${String(10000 + i * 731).slice(0, 5)}`, verifyStatus: 'verified',
    createdAt: i < 3 ? '2026-09-01' : '2025-03-10', profileId: b.id,
  })),
  { id: 'u_b13', name: '초록양말', role: 'brand', provider: 'kakao', bizNumber: '214-86-77123', verifyStatus: 'pending', createdAt: '2026-10-23', profileId: 'b13' },
  ...landlords.map<User>((l, i) => ({
    id: l.userId, name: l.name, role: 'landlord', provider: 'kakao', bizNumber: `30${i}-12-4567${i}`, verifyStatus: 'verified', createdAt: '2025-01-15', profileId: l.id,
  })),
  { id: 'u_l5', name: '망원 작은창고', role: 'landlord', provider: 'naver', bizNumber: '109-22-33445', verifyStatus: 'pending', createdAt: '2026-10-24' },
  { id: 'u_v1', name: '팝업탐험가', role: 'visitor', provider: 'kakao', verifyStatus: 'none', createdAt: '2026-05-01', profileId: 'v1' },
  { id: 'u_v2', name: '주말산책', role: 'visitor', provider: 'naver', verifyStatus: 'none', createdAt: '2026-04-01', profileId: 'v2' },
  { id: 'u_v3', name: '반지수집가', role: 'visitor', provider: 'kakao', verifyStatus: 'none', createdAt: '2026-03-01', profileId: 'v3' },
  { id: 'u_v4', name: '성수러버', role: 'visitor', provider: 'kakao', verifyStatus: 'none', createdAt: '2026-02-01', profileId: 'v4' },
  { id: 'u_admin', name: '운영팀', role: 'admin', provider: 'kakao', verifyStatus: 'verified', createdAt: '2025-01-01' },
];

const visitors: VisitorProfile[] = [
  { id: 'v1', userId: 'u_v1', nickname: '팝업탐험가', following: ['b4', 'b8'] },
  { id: 'v2', userId: 'u_v2', nickname: '주말산책', following: ['b4'] },
  { id: 'v3', userId: 'u_v3', nickname: '반지수집가', following: [] },
  { id: 'v4', userId: 'u_v4', nickname: '성수러버', following: [] },
];

const slot = (id: string, label: string, status: Recruitment['slots'][number]['status'], brandId?: string, hangers = 1, category?: any) => ({ id, label, status, brandId, hangers, category });

const recruitments: Recruitment[] = [
  {
    id: 'r1', hostBrandId: 'b6', title: '겨울 아웃도어 마켓, 같이 열 브랜드 찾아요',
    intro: '12월 첫 주말 마포에서 아웃도어·캠핑 무드 마켓을 열고 싶어요. 모자, 가방, 신발 브랜드 환영합니다!',
    region: '마포구', period: { start: '2026-12-05', end: '2026-12-07' }, totalBudget: 1800000, spaceConfirmed: false,
    slotMode: 'category', status: '모집 중', createdAt: '2026-10-18',
    slots: [slot('r1s1', '의류', '모집자', 'b6', 1, '의류'), slot('r1s2', '가방', '비어 있음', undefined, 1, '가방'), slot('r1s3', '신발', '협의 중', 'b9', 1, '신발'), slot('r1s4', '기타 액세서리', '비어 있음', undefined, 1, '기타 액세서리')],
  },
  {
    id: 'r2', hostBrandId: 'b10', title: '한남 쇼룸 행거 6개 나눠 쓰실 분',
    intro: '한남 화이트큐브를 3일 확정했어요. 실험적인 디자인을 하는 브랜드와 행거를 나누고 싶습니다.',
    region: '용산구', period: { start: '2026-11-20', end: '2026-11-22' }, totalBudget: 6000000, spaceConfirmed: true, spaceId: 's3',
    slotMode: 'hanger', status: '모집 중', createdAt: '2026-10-20',
    slots: [
      slot('r2s1', '행거 1', '모집자', 'b10'), slot('r2s2', '행거 2', '모집자', 'b10'), slot('r2s3', '행거 3', '확정', 'b12'),
      slot('r2s4', '행거 4', '비어 있음'), slot('r2s5', '행거 5', '비어 있음'), slot('r2s6', '행거 6', '비어 있음'),
    ],
  },
  {
    id: 'r3', hostBrandId: 'b5', title: '연말 선물 팝업 (주얼리·소품)',
    intro: '크리스마스 전 주말, 선물하기 좋은 작은 브랜드끼리 모여요.',
    region: '성동구', period: { start: '2026-12-18', end: '2026-12-20' }, totalBudget: 2400000, spaceConfirmed: false,
    slotMode: 'category', status: '협의 중', createdAt: '2026-10-12',
    slots: [slot('r3s1', '주얼리', '모집자', 'b5', 1, '주얼리'), slot('r3s2', '기타 액세서리', '협의 중', 'b7', 1, '기타 액세서리'), slot('r3s3', '가방', '협의 중', 'b3', 1, '가방')],
  },
  {
    id: 'r4', hostBrandId: 'b1', title: '성수 가을 산책 팝업',
    intro: '내추럴 무드의 옷·주얼리·가방을 한 공간에서.',
    region: '성동구', period: { start: '2026-11-07', end: '2026-11-09' }, totalBudget: 2400000, spaceConfirmed: true, spaceId: 's1',
    slotMode: 'category', status: '마감', teamId: 't1', createdAt: '2026-09-20',
    slots: [slot('r4s1', '의류', '모집자', 'b1', 1, '의류'), slot('r4s2', '주얼리', '확정', 'b2', 1, '주얼리'), slot('r4s3', '가방', '확정', 'b3', 1, '가방')],
  },
  {
    id: 'r5', hostBrandId: 'b4', title: '연남 스트릿 골목 팝업',
    intro: '10대·20대 초반 타깃 스트릿 브랜드 4팀.',
    region: '마포구', period: { start: '2026-10-22', end: '2026-10-28' }, totalBudget: 3500000, spaceConfirmed: true, spaceId: 's2',
    slotMode: 'hanger', status: '마감', teamId: 't2', createdAt: '2026-09-01',
    slots: [slot('r5s1', '행거 1', '모집자', 'b4'), slot('r5s2', '행거 2', '확정', 'b9'), slot('r5s3', '행거 3', '확정', 'b11'), slot('r5s4', '행거 4', '확정', 'b7')],
  },
];

const recruitApplications: RecruitApplication[] = [
  { id: 'ra1', recruitmentId: 'r1', brandId: 'b9', slotId: 'r1s3', message: '아웃도어 무드에 맞는 러너 라인이 있어요. 함께하고 싶습니다!', status: 'pending', createdAt: '2026-10-21T10:00:00' },
  { id: 'ra2', recruitmentId: 'r3', brandId: 'b7', slotId: 'r3s2', message: '연말 키링 신상 준비 중이에요.', status: 'pending', createdAt: '2026-10-15T10:00:00' },
];

const teams: Team[] = [
  {
    id: 't1', name: '가을 산책단', recruitmentId: 'r4', leaderBrandId: 'b1', stage: '준비 중', region: '성동구',
    period: { start: '2026-11-07', end: '2026-11-09' }, spaceId: 's1', popupId: 'p2', round: 1, promoChecked: [], confirmed: false,
    members: [
      { brandId: 'b1', slotLabel: '의류', role: '팀장 · 정산 담당', hangers: 2 },
      { brandId: 'b2', slotLabel: '주얼리', role: '홍보 담당', hangers: 1 },
      { brandId: 'b3', slotLabel: '가방', role: '설치·철거 담당', hangers: 1 },
    ],
  },
  {
    id: 't2', name: '골목 옷장', recruitmentId: 'r5', leaderBrandId: 'b4', stage: '운영 중', region: '마포구',
    period: { start: '2026-10-22', end: '2026-10-28' }, spaceId: 's2', popupId: 'p1', round: 1, promoChecked: ['b4', 'b9', 'b11', 'b7'], confirmed: true,
    members: [
      { brandId: 'b4', slotLabel: '행거 1', role: '팀장', hangers: 1 },
      { brandId: 'b9', slotLabel: '행거 2', role: '정산 담당', hangers: 1 },
      { brandId: 'b11', slotLabel: '행거 3', role: '홍보 담당', hangers: 1 },
      { brandId: 'b7', slotLabel: '행거 4', role: '디스플레이', hangers: 1 },
    ],
  },
  {
    id: 't3', name: '오래된 것들의 시간', leaderBrandId: 'b8', stage: '종료', region: '용산구',
    period: { start: '2026-10-10', end: '2026-10-13' }, spaceId: 's4', popupId: 'p3', round: 2, promoChecked: ['b8', 'b12', 'b5'], confirmed: true,
    members: [
      { brandId: 'b8', slotLabel: '의류', role: '팀장', hangers: 2 },
      { brandId: 'b12', slotLabel: '가방', role: '정산 담당', hangers: 1 },
      { brandId: 'b5', slotLabel: '주얼리', role: '홍보 담당', hangers: 1 },
    ],
  },
];

const emptyAgreement = (teamId: string): Agreement => ({
  teamId,
  items: { cost: '', space: '', hours: '', stock: '', setup: '', damage: '', cancel: '', promo: '', record: '' },
  agreedBy: [], locked: false, updatedAt: '2026-10-01T00:00:00',
});

const filledItems: Agreement['items'] = {
  cost: '1자리 80만원(행거 비례), 11/1까지 팀장 계좌로 납부. 대관료·청소비·포스터 인쇄비 포함',
  space: '입구 기준 왼쪽부터 의류-주얼리-가방. 피팅룸·계산대는 공용',
  hours: '12:00~20:00. 하루 2교대, 각 브랜드 최소 1타임 근무',
  stock: '각자 재고는 각자 책임. 교차 판매 시 판매 브랜드가 메모 후 마감 때 정산',
  setup: '전날 18시 설치, 마지막 날 20시 이후 철거. 원상복구 비용은 균등 분담',
  damage: '파손한 브랜드가 부담. 원인 불명은 균등 분담',
  cancel: '7일 전까지 전액 환불, 이후는 대관료 분담분 환불 불가',
  promo: '오픈 3일 전 같은 날 오후 7시 동시 공지, #가을산책단 #offstage',
  record: '현장 사진은 서로 자유롭게 사용. 매출은 비공개',
};

const agreements: Agreement[] = [
  { teamId: 't1', items: { ...filledItems }, agreedBy: ['b2'], locked: false, updatedAt: '2026-10-20T12:00:00' },
  { teamId: 't2', items: { ...filledItems, promo: '오픈 당일 오전 10시 동시 공지, #골목옷장', cost: '1자리 87.5만원 균등, 10/15까지 납부' }, agreedBy: ['b4', 'b9', 'b11', 'b7'], locked: true, updatedAt: '2026-10-10T12:00:00' },
  { teamId: 't3', items: { ...filledItems, promo: '#오래된것들의시간', cost: '행거 비례, 10/1까지 납부' }, agreedBy: ['b8', 'b12', 'b5'], locked: true, updatedAt: '2026-09-28T12:00:00' },
];
export { emptyAgreement };

const costSplits: CostSplit[] = [
  { teamId: 't1', mode: 'hanger', spaceFee: 2400000, commonItems: [{ id: 'c1', label: '청소비', amount: 100000 }, { id: 'c2', label: '포스터 인쇄', amount: 60000 }], dueDate: '2026-11-01', paid: ['b2'] },
  { teamId: 't2', mode: 'equal', spaceFee: 3500000, commonItems: [{ id: 'c3', label: '현수막', amount: 80000 }], dueDate: '2026-10-15', paid: ['b4', 'b9', 'b11', 'b7'] },
  { teamId: 't3', mode: 'hanger', spaceFee: 1200000, commonItems: [], dueDate: '2026-10-01', paid: ['b8', 'b12', 'b5'] },
];

const shifts: ShiftSchedule[] = [
  { teamId: 't1', dates: ['2026-11-07', '2026-11-08', '2026-11-09'], timeSlots: ['12:00-16:00', '16:00-20:00'], assign: { '2026-11-07|12:00-16:00': 'b1', '2026-11-07|16:00-20:00': 'b2' } },
  { teamId: 't2', dates: datesBetween('2026-10-22', '2026-10-28'), timeSlots: ['11:00-15:00', '15:00-19:00'], assign: {} },
  { teamId: 't3', dates: datesBetween('2026-10-10', '2026-10-13'), timeSlots: ['12:00-16:00', '16:00-20:00'], assign: {} },
];
// t2 근무표 채우기
(() => {
  const s = shifts[1];
  const ms = ['b4', 'b9', 'b11', 'b7'];
  let k = 0;
  s.dates.forEach((d) => s.timeSlots.forEach((t) => { s.assign[`${d}|${t}`] = ms[k++ % 4]; }));
})();

const moodboards: TeamMoodboard[] = [
  { teamId: 't1', picks: { b1: ['b1_img1', 'b1_img2', 'b1_img4'], b2: ['b2_img1', 'b2_img2', 'b2_img3'] }, headline: '천천히 걷다 만나는 내추럴 무드' },
  { teamId: 't2', picks: { b4: ['b4_img1', 'b4_img3', 'b4_img4'], b9: ['b9_img1', 'b9_img3', 'b9_img5'], b11: ['b11_img1', 'b11_img2', 'b11_img3'], b7: ['b7_img1', 'b7_img2', 'b7_img4'] }, headline: '골목에서 만나는 스트릿 옷장' },
  { teamId: 't3', picks: { b8: ['b8_img1', 'b8_img2', 'b8_img4'], b12: ['b12_img1', 'b12_img2', 'b12_img4'], b5: ['b5_img1', 'b5_img2', 'b5_img4'] }, headline: '시간이 쌓인 물건들' },
];

const spaceApplications: SpaceApplication[] = [
  { id: 'sa1', teamId: 't1', spaceId: 's1', dates: { start: '2026-11-07', end: '2026-11-09' }, message: '내추럴 무드 3팀이 함께 팝업을 열고 싶어요.', status: 'accepted', direction: 'team', createdAt: '2026-10-05T10:00:00' },
  { id: 'sa2', teamId: 't2', spaceId: 's2', dates: { start: '2026-10-22', end: '2026-10-28' }, message: '스트릿 브랜드 4팀입니다.', status: 'accepted', direction: 'team', createdAt: '2026-09-10T10:00:00' },
  { id: 'sa3', teamId: 't3', spaceId: 's4', dates: { start: '2026-10-10', end: '2026-10-13' }, message: '두 번째 회차 팝업입니다.', status: 'accepted', direction: 'team', createdAt: '2026-09-05T10:00:00' },
];

const popups: Popup[] = [
  { id: 'p1', teamId: 't2', title: '골목 옷장', spaceId: 's2', period: { start: '2026-10-22', end: '2026-10-28' }, hours: '11:00~19:00', code: '482913', status: '진행 중', mapX: 22, mapY: 40 },
  { id: 'p2', teamId: 't1', title: '가을 산책단', spaceId: 's1', period: { start: '2026-11-07', end: '2026-11-09' }, hours: '12:00~20:00', code: '731546', status: '예정', mapX: 74, mapY: 52, waiters: [], waitBase: 46 },
  { id: 'p3', teamId: 't3', title: '오래된 것들의 시간 2회', spaceId: 's4', period: { start: '2026-10-10', end: '2026-10-13' }, hours: '12:00~20:00', code: '205871', status: '종료', mapX: 48, mapY: 72 },
  { id: 'p4', teamId: 't3', title: '오래된 것들의 시간 1회', spaceId: 's5', period: { start: '2026-06-05', end: '2026-06-08' }, hours: '11:00~19:00', code: '664210', status: '종료', mapX: 42, mapY: 26 },
];

const completions: Completion[] = [
  { teamId: 't3', popupId: 'p4', required: ['u_b8', 'u_b12', 'u_b5', 'u_l4'], confirmedBy: ['u_b8', 'u_b12', 'u_b5', 'u_l4'], verified: true },
  { teamId: 't3', popupId: 'p3', required: ['u_b8', 'u_b12', 'u_b5', 'u_l3'], confirmedBy: ['u_b8', 'u_b12', 'u_b5', 'u_l3'], verified: true },
];

const r = (id: string, kind: Review['kind'], authorId: string, targetId: string, scores: Record<string, number>, comment: string, extra: Partial<Review> = {}): Review => ({
  id, kind, authorId, targetId, scores, comment, createdAt: '2026-10-15', ...extra,
});

const reviews: Review[] = [
  // p4 (1회)
  r('rv1', 'brand_to_brand', 'u_b8', 'b12', { '분담금 이행': 5, '역할 이행': 5, '소통': 5 }, '정산을 깔끔하게 맡아 주셔서 든든했어요.', { teamId: 't3', popupId: 'p4', createdAt: '2026-06-10' }),
  r('rv2', 'brand_to_brand', 'u_b12', 'b8', { '분담금 이행': 5, '역할 이행': 4, '소통': 5 }, '팀장님 덕분에 첫 공동 팝업이 수월했습니다.', { teamId: 't3', popupId: 'p4', createdAt: '2026-06-10' }),
  r('rv3', 'brand_to_brand', 'u_b5', 'b8', { '분담금 이행': 5, '역할 이행': 5, '소통': 4 }, '디스플레이 감각이 정말 좋으세요.', { teamId: 't3', popupId: 'p4', createdAt: '2026-06-11' }),
  r('rv4', 'brand_to_space', 'u_b8', 's5', { '정보 정확성': 5, '소통': 5, '조건 투명성': 4, '인수인계': 5 }, '사진과 실제가 똑같았어요. 마당 활용 팁도 주셨어요.', { teamId: 't3', popupId: 'p4', createdAt: '2026-06-10' }),
  r('rv5', 'space_to_team', 'u_l4', 't3', { '약속 이행': 5, '이용 규칙': 5, '원상복구': 5, '일정 준수': 4 }, '한옥을 아껴 써 주신 팀. 다음에도 환영합니다.', { teamId: 't3', popupId: 'p4', createdAt: '2026-06-12' }),
  // p3 (2회)
  r('rv6', 'brand_to_brand', 'u_b8', 'b12', { '분담금 이행': 5, '역할 이행': 5, '소통': 5 }, '두 번째도 역시 믿고 함께했습니다.', { teamId: 't3', popupId: 'p3' }),
  r('rv7', 'brand_to_brand', 'u_b8', 'b5', { '분담금 이행': 4, '역할 이행': 4, '소통': 3 }, '홍보 공지가 하루 늦었던 점만 아쉬웠어요.', { teamId: 't3', popupId: 'p3' }),
  r('rv8', 'brand_to_brand', 'u_b12', 'b5', { '분담금 이행': 4, '역할 이행': 3, '소통': 4 }, '근무 시간 조율이 조금 어려웠어요.', { teamId: 't3', popupId: 'p3' }),
  r('rv9', 'brand_to_space', 'u_b12', 's4', { '정보 정확성': 4, '소통': 5, '조건 투명성': 5, '인수인계': 4 }, '계단이 좁아 짐 옮기기가 힘들었지만 공간 분위기 최고.', { teamId: 't3', popupId: 'p3' }),
  r('rv10', 'space_to_team', 'u_l3', 't3', { '약속 이행': 5, '이용 규칙': 4, '원상복구': 5, '일정 준수': 5 }, '원상복구까지 완벽했습니다.', { teamId: 't3', popupId: 'p3' }),
  // 방문객 리뷰
  r('rv11', 'visitor_popup', 'u_v2', 'p3', { 전체: 5 }, '작지만 알찬 팝업. 니트랑 가죽 지갑 같이 샀어요.', { popupId: 'p3' }),
  r('rv12', 'visitor_brand', 'u_v3', 'b5', { 전체: 5 }, '선물용으로 귀걸이 샀는데 포장이 예뻐요.', { popupId: 'p3' }),
  r('rv13', 'visitor_popup', 'u_v4', 'p1', { 전체: 4 }, '골목 분위기랑 잘 어울려요. 주말엔 좀 붐벼요.', { popupId: 'p1', createdAt: '2026-10-24' }),
  r('rv14', 'visitor_popup', 'u_v1', 'p1', { 전체: 3 }, '구경은 즐거웠는데 피팅룸이 하나라 기다렸어요.', { popupId: 'p1', createdAt: '2026-10-23' }),
  r('rv15', 'visitor_brand', 'u_v4', 'b8', { 전체: 4 }, '빈티지 셔츠 상태가 좋아요. 가격도 적당해요.', { popupId: 'p3' }),
  r('rv16', 'visitor_brand', 'u_v2', 'b12', { 전체: 3 }, '물건은 좋은데 사이즈가 다양하지 않았어요.', { popupId: 'p3' }),
];

const comboReviews: ComboReview[] = [
  { id: 'cr1', popupId: 'p3', authorId: 'u_v2', good: true, pairs: [['b8', 'b12']], rating: 5, comment: '클래식 니트에 가죽 가방을 같이 걸어 둔 연출이 너무 좋았어요.', createdAt: '2026-10-13' },
  { id: 'cr2', popupId: 'p4', authorId: 'u_v3', good: true, pairs: [['b8', 'b5'], ['b12', 'b8']], rating: 5, comment: '한옥에 빈티지 옷과 주얼리가 찰떡.', createdAt: '2026-06-08' },
  { id: 'cr3', popupId: 'p1', authorId: 'u_v4', good: true, pairs: [['b4', 'b9']], rating: 4, comment: '모자랑 스니커즈 같이 코디해 보기 좋았어요.', createdAt: '2026-10-24' },
];

const visits: VisitCheckIn[] = [
  { id: 'vc1', popupId: 'p4', userId: 'u_v1', at: '2026-06-06T14:00:00' },
  { id: 'vc2', popupId: 'p3', userId: 'u_v1', at: '2026-10-11T15:00:00' },
  { id: 'vc3', popupId: 'p3', userId: 'u_v2', at: '2026-10-12T15:00:00' },
  { id: 'vc4', popupId: 'p3', userId: 'u_v3', at: '2026-10-12T16:00:00' },
  { id: 'vc5', popupId: 'p4', userId: 'u_v3', at: '2026-06-07T16:00:00' },
  { id: 'vc6', popupId: 'p1', userId: 'u_v4', at: '2026-10-23T16:00:00' },
];

const stamps: Stamp[] = [
  { userId: 'u_v1', popupIds: ['p4', 'p3'], rewardClaimed: false },
  { userId: 'u_v2', popupIds: ['p3'], rewardClaimed: false },
  { userId: 'u_v3', popupIds: ['p4', 'p3'], rewardClaimed: false },
  { userId: 'u_v4', popupIds: ['p1'], rewardClaimed: false },
];

// 플랫폼 밖에서 쌓인(베타 기간) 이력과 제재 이력. 실시간 계산되는 이벤트와 합쳐 신뢰 지수를 만든다.
const trustSeedEvents: TrustEvent[] = [
  { id: 'te1', subjectId: 'b4', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-04-10' },
  { id: 'te2', subjectId: 'b4', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-07-10' },
  { id: 'te3', subjectId: 'b9', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-04-10' },
  { id: 'te4', subjectId: 'b9', type: 'cancel', delta: -3, note: '일방적 취소', at: '2026-05-02' },
  { id: 'te5', subjectId: 'b11', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-04-10' },
  { id: 'te6', subjectId: 'b7', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-07-10' },
  { id: 'te7', subjectId: 'b10', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-03-10' },
  { id: 'te8', subjectId: 'b10', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-05-10' },
  { id: 'te9', subjectId: 'b10', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-08-10' },
  { id: 'te10', subjectId: 'b6', type: 'noshow', delta: -10, note: '근무 노쇼', at: '2026-06-20' },
  { id: 'te11', subjectId: 'b6', type: 'completion', delta: 2, note: '베타 기간 인증 공동 팝업', at: '2026-06-22' },
  { id: 'te12', subjectId: 'l1', type: 'completion', delta: 2, note: '베타 기간 인증 대관', at: '2026-05-10' },
  { id: 'te13', subjectId: 'l2', type: 'completion', delta: 2, note: '베타 기간 인증 대관', at: '2026-05-10' },
];

const showcases: ShowcasePost[] = [
  {
    id: 'sc1', helpful: ['u_b4', 'u_b6', 'u_v2'], teamId: 't3', popupId: 'p3', title: '오래된 것들의 시간 2회 후기', period: { start: '2026-10-10', end: '2026-10-13' }, spaceId: 's4',
    brandIds: ['b8', 'b12', 'b5'], photoHues: [75, 35, 330, 60], authorId: 'u_b8', createdAt: '2026-10-15',
    body: '해방촌 계단집에서 두 번째 회차를 마쳤어요. 1회 때 배운 걸 바탕으로 동선을 바꿨더니 체류 시간이 확 늘었습니다.',
    tips: '좁은 공간은 행거를 벽에 붙이지 말고 ㄷ자로 두면 동선이 생겨요. 계단 입구에 작은 입간판 필수!',
    sales: '3일 합산 약 620만원', visitors: 410,
  },
  {
    id: 'sc2', helpful: ['u_b2'], teamId: 't3', popupId: 'p4', title: '한옥에서 연 첫 공동 팝업', period: { start: '2026-06-05', end: '2026-06-08' }, spaceId: 's5',
    brandIds: ['b8', 'b12', 'b5'], photoHues: [35, 100, 25], authorId: 'u_b12', createdAt: '2026-06-12',
    body: '세 브랜드 모두 첫 공동 팝업이었어요. 대관료를 3분의 1로 나누니 부담이 확 줄었고, 서로의 손님이 서로의 손님이 됐어요.',
    tips: '약속서에 교차 판매 정산 방식을 꼭 적어 두세요. 마감 때 10분이면 끝납니다.',
  },
];

const qnaPosts: QnaPost[] = [
  { id: 'q1', authorId: 'u_b3', title: '원상복구 범위, 보통 어디까지 하나요?', body: '테이프 자국이나 바닥 긁힘까지 다 복구해야 하는지 궁금해요.', tag: '원상복구', createdAt: '2026-10-02' },
  { id: 'q2', authorId: 'u_b7', title: '팝업도 따로 신고해야 하나요?', body: '3일짜리 팝업인데 사업장 신고나 허가가 필요한지요.', tag: '신고·허가', createdAt: '2026-10-05' },
  { id: 'q3', authorId: 'u_b5', title: '공통비에 보통 뭘 넣으세요?', body: '대관료 말고 청소비, 인쇄비 정도 생각 중인데 빠뜨린 게 있을까요?', tag: '비용', createdAt: '2026-10-07' },
  { id: 'q4', authorId: 'u_b9', title: '카드 단말기 하나로 여러 브랜드 결제 받아도 되나요?', body: '교차 판매 정산을 어떻게 하는지 궁금합니다.', tag: '운영', createdAt: '2026-10-09' },
  { id: 'q5', authorId: 'u_b6', title: '대관 계약서에 꼭 넣어야 할 조항', body: '처음 대관해 보는데 놓치기 쉬운 조항이 있을까요?', tag: '계약', createdAt: '2026-10-11' },
  { id: 'q6', authorId: 'u_b11', title: '같은 날 동시 공지, 효과 있나요?', body: '다들 홍보 날짜 맞추시는지 궁금해요.', tag: '홍보', createdAt: '2026-10-14' },
  { id: 'q7', authorId: 'u_b2', title: '주얼리는 진열대를 따로 가져가야 하나요?', body: '행거 위주 공간이라 고민이에요.', tag: '운영', createdAt: '2026-10-18' },
  { id: 'q8', authorId: 'u_b10', title: '대관료 분할 납부 가능한가요?', body: '임대인분들께 여쭤봅니다. 보통 계약금/잔금으로 나누시나요?', tag: '비용', createdAt: '2026-10-21' },
];

const qnaAnswers: QnaAnswer[] = [
  { id: 'qa1', postId: 'q1', authorId: 'u_l3', body: '저희는 사진으로 입주 전 상태를 남기고 그 상태로만 돌려주시면 됩니다. 입주 전 사진을 꼭 같이 찍으세요.', createdAt: '2026-10-03' },
  { id: 'qa2', postId: 'q1', authorId: 'u_b8', body: '양면테이프 대신 마스킹테이프 + 케이블타이 조합 추천합니다.', createdAt: '2026-10-03' },
  { id: 'qa3', postId: 'q2', authorId: 'u_b4', body: '이미 사업자가 있으면 보통 별도 신고는 없지만, 지자체마다 달라서 구청에 한 번 문의해 보세요.', createdAt: '2026-10-06' },
  { id: 'qa4', postId: 'q3', authorId: 'u_b12', body: '쇼핑백, 현수막, 간식, 쓰레기봉투까지 넣었어요!', createdAt: '2026-10-08' },
  { id: 'qa5', postId: 'q4', authorId: 'u_b8', body: '단말기 하나로 받고 판매 장부에 브랜드명 적은 뒤 마감 때 나눴어요. 약속서 4번 항목에 적어 두면 편합니다.', createdAt: '2026-10-10' },
  { id: 'qa6', postId: 'q6', authorId: 'u_b11', body: '저희 팀은 동시 공지한 날 팔로워 유입이 평소 3배였어요.', createdAt: '2026-10-15' },
  { id: 'qa7', postId: 'q8', authorId: 'u_l1', body: '저희는 계약금 30% / 입주 3일 전 잔금으로 받습니다.', createdAt: '2026-10-22' },
];

const spaceQnas: SpaceQna[] = [
  { id: 'sq1', spaceId: 's1', authorId: 'u_b3', question: '전날 저녁 설치가 가능한가요?', answer: '네, 전날 18시부터 설치 가능합니다(추가 비용 없음).', createdAt: '2026-09-25' },
  { id: 'sq2', spaceId: 's1', authorId: 'u_b6', question: '주차 공간이 있나요?', answer: '건물 뒤편에 짐 내리는 동안 잠깐 정차 가능해요.', createdAt: '2026-10-01' },
  { id: 'sq3', spaceId: 's2', authorId: 'u_b9', question: '외부 입간판 설치 되나요?', answer: '골목 쪽 1개 가능합니다.', createdAt: '2026-09-11' },
  { id: 'sq4', spaceId: 's6', authorId: 'u_b10', question: '오후 몇 시쯤 빛이 제일 좋나요?', createdAt: '2026-10-20' },
];

const chatRooms: ChatRoom[] = [
  { id: 'ch1', title: '가을 산책단', memberIds: ['u_b1', 'u_b2', 'u_b3'], context: { type: 'team', refId: 't1' }, createdAt: '2026-10-01T10:00:00' },
  { id: 'ch2', title: '성수 오픈룸 A 문의', memberIds: ['u_b1', 'u_l1'], context: { type: 'space', refId: 's1' }, createdAt: '2026-10-04T10:00:00' },
  { id: 'ch3', title: '골목 옷장', memberIds: ['u_b4', 'u_b9', 'u_b11', 'u_b7'], context: { type: 'team', refId: 't2' }, createdAt: '2026-09-15T10:00:00' },
];

const messages: Message[] = [
  { id: 'm1', roomId: 'ch1', senderId: 'system', text: '팀 채팅방이 열렸어요. 공동 약속서부터 함께 채워 보세요.', at: '2026-10-01T10:00:00' },
  { id: 'm2', roomId: 'ch1', senderId: 'u_b2', text: '약속서 다 읽고 동의 눌렀어요! 홍보 문구는 제가 초안 잡아 볼게요.', at: '2026-10-20T12:05:00' },
  { id: 'm3', roomId: 'ch1', senderId: 'u_b3', text: '저는 철거 담당 맡을게요. 내일 마저 확인하고 동의할게요.', at: '2026-10-20T13:10:00' },
  { id: 'm4', roomId: 'ch2', senderId: 'u_b1', text: '혹시 이전 팀이 쓰던 행거 그대로 써도 될까요?', at: '2026-10-04T10:10:00' },
  { id: 'm5', roomId: 'ch2', senderId: 'u_l1', text: '네, 업종 고정 공간이라 행거와 조명은 그대로 쓰셔도 됩니다.', at: '2026-10-04T11:00:00' },
  { id: 'm6', roomId: 'ch3', senderId: 'u_b11', text: '오늘 손님 많았어요! 내일 오전 근무 누구죠?', at: '2026-10-24T20:00:00' },
];

const notifications: Notification[] = [
  { id: 'n1', userId: 'u_b1', type: 'agreement_request', text: '가을 산책단 공동 약속서에 동의해 주세요. (1/3 동의)', link: { name: 'team', id: 't1', sub: 'agreement' }, read: false, at: '2026-10-20T12:00:00' },
  { id: 'n2', userId: 'u_b1', type: 'proposal', text: '반짝임이 같이 해요 제안을 보냈어요.', link: { name: 'proposals' }, read: false, at: '2026-10-24T09:00:00' },
  { id: 'n3', userId: 'u_v1', type: 'follow_popup', text: '팔로우한 크랙스튜디오의 공동 팝업 "골목 옷장"이 진행 중이에요!', link: { name: 'popup', id: 'p1' }, read: false, at: '2026-10-22T09:00:00' },
  { id: 'n4', userId: 'u_l1', type: 'space_application', text: '성수 오픈룸 A 이용 확정: 가을 산책단 (11/7~11/9)', link: { name: 'tab', tab: 'inbox' }, read: true, at: '2026-10-05T12:00:00' },
  { id: 'n5', userId: 'u_admin', type: 'system', text: '사업자 인증 대기 2건이 있어요.', link: { name: 'tab', tab: 'verify' }, read: false, at: '2026-10-24T09:00:00' },
];

const proposals: Proposal[] = [
  { id: 'pr1', fromBrandId: 'b11', toBrandId: 'b1', period: '2026년 12월 중', region: '마포구', budgetPerBrand: 700000, teamSize: 3, reason: '미니멀한 옷에 저희 실버 주얼리를 레이어링하면 잘 어울릴 것 같아요. 연말에 함께 해 보고 싶어요!', status: 'sent', createdAt: '2026-10-24T09:00:00' },
];

const interests: Interest[] = [{ id: 'i1', fromBrandId: 'b2', toBrandId: 'b1', createdAt: '2026-10-19T09:00:00' }];

const reports: Report[] = [
  { id: 'rp1', reporterId: 'u_b12', targetType: 'review', targetId: 'rv8', targetLabel: '리뷰: "근무 시간 조율이 조금 어려웠어요."', reason: '허위 정보', detail: '실제와 다른 내용이라고 생각합니다.', status: 'open', at: '2026-10-16T10:00:00' },
  { id: 'rp2', reporterId: 'u_v2', targetType: 'profile', targetId: 'b6', targetLabel: '브랜드: 무드캠프', reason: '노쇼·약속 불이행', detail: '지난 팝업 근무 시간에 나타나지 않았어요.', status: 'open', at: '2026-10-20T10:00:00' },
  { id: 'rp3', reporterId: 'u_b5', targetType: 'post', targetId: 'q6', targetLabel: 'Q&A: 같은 날 동시 공지, 효과 있나요?', reason: '스팸·광고', detail: '', status: 'dismissed', at: '2026-10-15T10:00:00' },
];

// ───────── 렌탈 제휴 업체 (지어낸 예시) ─────────
const rentalPartners: RentalPartner[] = [
  { id: 'rp1', userId: 'u_r1', name: '행거앤코 렌탈', intro: '매장 집기 전문 렌탈. 팝업 철수한 행거·진열대를 놀리지 않고 다시 빌려드려요.', regions: ['성동구', '마포구', '용산구', '종로구'], deliveryFee: 60000, freeDeliveryOver: 300000, hue: 25 },
  { id: 'rp2', userId: 'u_r2', name: '빛나는조명', intro: '전시·촬영용 조명과 사이니지를 빌려드려요. 설치까지 해 드립니다.', regions: ['성동구', '용산구', '종로구'], deliveryFee: 80000, freeDeliveryOver: 400000, hue: 48 },
  { id: 'rp3', userId: 'u_r3', name: '팝업키트 서울', intro: '피팅룸 텐트, 거울, 카드 단말기까지 팝업에 필요한 것을 한 번에.', regions: ['마포구', '성동구'], deliveryFee: 50000, freeDeliveryOver: 250000, hue: 200 },
];

const ri = (id: string, partnerId: string, name: string, category: RentalItem['category'], desc: string, dailyPrice: number, partnerPrice: number, stock: number, hue: number): RentalItem => ({ id, partnerId, name, category, desc, dailyPrice, partnerPrice, stock, hue, active: true });

const rentalItems: RentalItem[] = [
  ri('ri1', 'rp1', '스테인리스 일자 행거 (120cm)', '행거', '바퀴 달린 기본 행거. 옷 20~25벌', 15000, 9000, 20, 25),
  ri('ri2', 'rp1', '원목 행거 (150cm)', '행거', '내추럴·빈티지 무드에 어울리는 원목 행거', 25000, 16000, 10, 35),
  ri('ri3', 'rp1', '3단 원목 진열대', '진열대', '주얼리·잡화 진열용. 폭 90cm', 20000, 12000, 8, 40),
  ri('ri4', 'rp1', '전신 마네킹 (여성/남성)', '마네킹', '대표 룩을 보여 주기 좋아요', 30000, 18000, 6, 15),
  ri('ri5', 'rp1', '아크릴 주얼리 진열장', '진열대', '잠금 가능한 유리 진열장', 35000, 22000, 4, 190),
  ri('ri6', 'rp2', 'LED 트랙 조명 세트 (4구)', '조명', '레일 없이 세우는 스탠드형. 색온도 조절', 40000, 26000, 8, 48),
  ri('ri7', 'rp2', '촬영용 소프트박스 2개', '조명', '룩북·라이브 방송용', 30000, 19000, 6, 55),
  ri('ri8', 'rp2', '네온 사이니지 (문구 맞춤)', '사이니지', '팀 이름 네온. 3일 전 주문', 60000, 39000, 3, 320),
  ri('ri9', 'rp2', 'A형 입간판', '사이니지', '분필·마커 겸용 입간판', 15000, 9000, 10, 30),
  ri('ri10', 'rp3', '접이식 피팅룸 텐트', '피팅룸 텐트', '10분 설치, 커튼·거울 포함', 35000, 21000, 6, 200),
  ri('ri11', 'rp3', '대형 전신거울 (180cm)', '전신거울', '받침대 포함', 20000, 12000, 10, 210),
  ri('ri12', 'rp3', '카드 단말기 + 영수증 프린터', 'POS·결제', '브랜드별 매출 분리 정산 메뉴 지원', 25000, 15000, 5, 230),
];

const rentalOrders: RentalOrder[] = [
  { id: 'ro1', partnerId: 'rp1', teamId: 't2', brandId: 'b4', spaceId: 's2', lines: [{ itemId: 'ri1', qty: 2 }, { itemId: 'ri4', qty: 1 }], dates: { start: '2026-10-22', end: '2026-10-28' }, delivery: true, addToTeamCost: true, memo: '오픈 전날 저녁 7시 설치 부탁드려요', status: 'delivered', createdAt: '2026-10-10T10:00:00' },
  { id: 'ro2', partnerId: 'rp3', teamId: 't2', brandId: 'b9', spaceId: 's2', lines: [{ itemId: 'ri10', qty: 1 }], dates: { start: '2026-10-22', end: '2026-10-28' }, delivery: true, addToTeamCost: true, memo: '', status: 'delivered', createdAt: '2026-10-11T10:00:00' },
  { id: 'ro3', partnerId: 'rp1', teamId: 't3', brandId: 'b8', spaceId: 's4', lines: [{ itemId: 'ri2', qty: 2 }, { itemId: 'ri3', qty: 1 }], dates: { start: '2026-10-10', end: '2026-10-13' }, delivery: true, addToTeamCost: true, memo: '', status: 'returned', rating: 5, ratingComment: '원목 행거가 공간이랑 너무 잘 어울렸어요', createdAt: '2026-09-25T10:00:00' },
  { id: 'ro4', partnerId: 'rp2', teamId: 't3', brandId: 'b12', spaceId: 's4', lines: [{ itemId: 'ri6', qty: 1 }, { itemId: 'ri9', qty: 1 }], dates: { start: '2026-10-10', end: '2026-10-13' }, delivery: true, addToTeamCost: true, memo: '', status: 'returned', rating: 4, ratingComment: '조명 덕분에 사진이 잘 나왔어요. 설치가 조금 늦었어요', createdAt: '2026-09-26T10:00:00' },
  { id: 'ro5', partnerId: 'rp1', teamId: 't1', brandId: 'b2', spaceId: 's1', lines: [{ itemId: 'ri5', qty: 1 }], dates: { start: '2026-11-07', end: '2026-11-09' }, delivery: true, addToTeamCost: false, memo: '주얼리용 진열장 하나 부탁드려요', status: 'requested', createdAt: '2026-10-24T10:00:00' },
];

users.push(
  ...rentalPartners.map<User>((r, i) => ({ id: r.userId, name: r.name, role: 'rental', provider: 'kakao', bizNumber: `41${i}-88-1234${i}`, verifyStatus: 'verified', createdAt: '2025-06-01', profileId: r.id })),
);
notifications.push({ id: 'n6', userId: 'u_r1', type: 'rental', text: '가을 산책단(소금상점)이 아크릴 주얼리 진열장 대여를 요청했어요.', link: { name: 'tab', tab: 'orders' }, read: false, at: '2026-10-24T10:00:00' });

// ───────── 매거진 카드뉴스 (수치는 데모용 예시) ─────────
const magazines: MagazinePost[] = [
  {
    id: 'mg1', category: '팝업 동향', title: '10월 팝업 동향: 혼자보다 팀으로', subtitle: '공동 팝업이 늘어난 이유를 숫자로 봤어요', hue: 18, authorId: 'u_admin', likes: ['u_v1', 'u_b2'], createdAt: '2026-10-24',
    cards: [
      { heading: '10월 팝업 동향', body: 'OFF STAGE에 올라온 팝업을 정리했어요. (데모 데이터)' },
      { heading: '공동 팝업 비중', stat: '62%', body: '이번 달 열린 팝업 10곳 중 6곳은 2개 이상 브랜드가 함께 열었어요.' },
      { heading: '평균 팀 규모', stat: '3.4팀', body: '3~4개 브랜드가 한 공간을 나눠 쓰는 구성이 가장 많았어요. 카테고리가 겹치지 않는 조합이 대부분이에요.' },
      { heading: '1자리 평균 분담금', stat: '72만원', body: '혼자 빌렸다면 평균 240만원. 대관료를 나누면 부담이 3분의 1로 줄어요.' },
      { heading: '기간은 짧게', stat: '3.2일', body: '금·토·일 3일 팝업이 가장 많았어요. 짧게 열고 자주 여는 흐름이에요.' },
    ],
  },
  {
    id: 'mg2', category: '뜨는 지역', title: '지금 뜨는 팝업 지역 TOP 4', subtitle: '성수만 있는 게 아니에요', hue: 150, authorId: 'u_admin', likes: ['u_b1'], createdAt: '2026-10-20', region: '용산구', link: { name: 'tab', tab: 'spaces' },
    cards: [
      { heading: '지금 뜨는 팝업 지역', body: 'OFF STAGE 공간 지원 수와 방문 인증 수로 골랐어요. (데모 데이터)' },
      { heading: '1. 해방촌 계단길 (용산구)', stat: '+48%', body: '지원 수가 한 달 새 크게 늘었어요. 1일 30만원대 작은 공간이 많아 3~4팀 공동 팝업에 딱이에요.' },
      { heading: '2. 서울숲 뒤편 (성동구)', stat: '+31%', body: '성수 메인 거리보다 대관료가 낮고, 주말 산책 인파가 그대로 들어와요.' },
      { heading: '3. 연남 골목 (마포구)', stat: '+22%', body: '10대·20대 초반 고객층 브랜드에게 인기. 입간판 하나가 유입을 크게 바꿔요.' },
      { heading: '4. 서촌 한옥 (종로구)', stat: '+15%', body: '클래식·내추럴 무드 브랜드에게 추천. 사진이 잘 나와서 홍보 효과가 좋아요.' },
    ],
  },
  {
    id: 'mg3', category: '운영 팁', title: '원상복구, 10분 만에 끝내는 법', subtitle: 'Q&A에서 가장 많이 나온 질문 정리', hue: 220, authorId: 'u_admin', likes: [], createdAt: '2026-10-15', link: { name: 'qna', id: 'q1' },
    cards: [
      { heading: '원상복구 10분 컷', body: '실무 Q&A에서 가장 많이 나온 질문을 모았어요.' },
      { heading: '입주 전 사진 찍기', body: '바닥, 벽, 조명을 같은 각도로 찍어 두면 분쟁이 없어요. 팀 채팅방에 올려 두세요.' },
      { heading: '양면테이프 대신', body: '마스킹테이프와 케이블타이 조합이면 자국이 남지 않아요.' },
      { heading: '약속서 5번 항목', body: '철거 시간과 비용 분담을 미리 적어 두면 마지막 날이 편해요.' },
    ],
  },
  {
    id: 'mg4', category: '팀 인터뷰', title: '"서로의 손님이 서로의 손님이 됐어요"', subtitle: '오래된 것들의 시간 팀 인터뷰', hue: 75, authorId: 'u_admin', likes: ['u_v2', 'u_v3'], createdAt: '2026-10-16', link: { name: 'showcase', id: 'sc1' },
    cards: [
      { heading: '오래된 것들의 시간', body: '두 번의 공동 팝업을 연 세 브랜드를 만났어요.' },
      { heading: '왜 팀이었나요?', body: '"혼자서는 엄두가 안 나던 한옥 대관을 셋이 나누니 가능했어요." — 오래된정원' },
      { heading: '가장 좋았던 순간', body: '"니트를 사러 온 손님이 가죽 지갑까지 사 갔을 때요." — 모래시계' },
      { heading: '다음 팀에게', body: '"교차 판매 정산 방식을 꼭 약속서에 적으세요. 마감 10분이면 끝나요." — 플로라룸' },
    ],
  },
];

export function createSeed() {
  return structuredClone({
    users, brands, landlords, visitors, lookbookImages, spaces, availability, spaceQnas,
    proposals, interests, recruitments, recruitApplications, teams, agreements, costSplits, shifts, moodboards,
    spaceApplications, popups, visits, stamps, completions, reviews, comboReviews, trustEvents: trustSeedEvents,
    showcases, qnaPosts, qnaAnswers, chatRooms, messages, notifications, reports,
    rentalPartners, rentalItems, rentalOrders, magazines,
  });
}
export type DB = ReturnType<typeof createSeed>;

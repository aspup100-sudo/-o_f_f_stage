# OFFSTAGE 프로토타입

작은 패션 브랜드들이 팀을 짜서 공동 팝업을 열고, 공간을 나눠 빌리고, 경험을 기록하는 앱의 클릭형 프로토타입입니다.
백엔드 없이 목업 데이터와 로컬 상태(localStorage)로 동작하며, 외부 연동(간편 로그인, 사업자 인증, 인스타그램, QR, 채팅)은 모두 "(데모)"로 표시된 목업입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/index.html 한 파일로 빌드
```

## 구조

- `src/types` 데이터 모델(User, BrandProfile, Space, Recruitment, Team, Agreement, Review, TrustScore 등). 실제 DB 테이블로 옮기기 쉽도록 엔티티별로 나누고 id로만 참조합니다.
- `src/data/mock.ts` 목업 데이터(브랜드 12곳, 임대인 4명·공간 6곳, 모집글 5개, 팀 3개, 팝업 4개, 후기, Q&A 8개). 이름은 모두 지어낸 예시입니다.
- `src/store` 전역 상태(`store.ts`), 상태 변경 동작(`actions.ts`, 나중에 API 호출로 교체), 계산 로직(`logic.ts`: 신뢰 지수, 추천 점수, 분담금)
- `src/screens` 화면, `src/components` 공용 UI

## 데모 팁

- 상단 "전환(데모)" 버튼으로 브랜드 / 임대인 / 방문객 / 관리자 시점과 계정을 바꾸고, 데이터를 초기화할 수 있습니다.
- 다른 사람이 해야 하는 행동(상대의 제안 수락, 팀원 동의, 지원자, 성사 확인)은 "(데모)" 버튼으로 대신 실행할 수 있습니다.

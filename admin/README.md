# QDM 로컬 관리자

## 실행 방법

1. Chrome 또는 Edge에서 `admin/index.html` 파일을 엽니다.
2. `홈페이지 폴더 선택 / 공유` 버튼을 눌러 홈페이지 루트 폴더인 `qdm-homepage-main`을 선택합니다.
3. `메인 홈페이지 수정`, `포트폴리오 수정`, `블로그 수정` 중 필요한 관리자를 선택합니다.
4. 각 관리자 화면은 공유된 폴더를 자동으로 불러옵니다.
5. 내용을 수정하고 저장합니다.
6. 변경된 파일을 GitHub에 올리면 Vercel 배포에 반영됩니다.

브라우저 보안 정책상 새 탭이나 새 실행 환경에서는 폴더 권한 확인 창이 다시 뜰 수 있습니다. 그래도 폴더 위치는 공유 저장되므로 같은 폴더를 매번 찾아 들어가는 과정은 줄어듭니다.

## 생성 / 수정되는 파일

- `data/portfolios.json`
- `data/portfolios.backup-날짜.json`
- `data/blog-posts.json`
- `data/blog-posts.backup-날짜.json`
- `index.html`
- `index.backup-날짜.html`
- `assets/portfolio/[분류]/[slug]/portfolio.html`
- `assets/portfolio/[분류]/[slug]/main.[확장자]`
- `assets/portfolio/[분류]/[slug]/[상세이미지파일]`
- `assets/blog/[블로그이미지파일]`

## 관리자 화면

- `admin/index.html`: 3단계 선택 화면
- `admin/admin-shared.js`: 관리자 화면 간 홈페이지 폴더 공유
- `admin/home-admin.html`: 전화번호, 이메일, 주소, 대표 블로그 링크 수정
- `admin/portfolio-admin.html`: 포트폴리오 생성/수정
- `admin/blog-admin.html`: 최신 기술자료 카드 이미지와 링크 수정

## 기존 상세 페이지 수정

기존 포트폴리오를 선택하면 상세 HTML에서 아래 내용을 자동으로 읽어옵니다.

- 상세 상단 한 줄 문구
- 프로젝트 개요
- 수행 내용
- 태그
- 현재 상세 이미지 경로

`현재 상세 이미지 경로`는 한 줄에 하나씩 관리합니다. 기존 이미지를 유지하려면 그대로 두고, 삭제하거나 순서를 바꾸려면 이 영역을 수정합니다. 새 이미지는 `상세 이미지 추가 등록`에서 선택하면 기존 목록 뒤에 추가됩니다.

상세 이미지는 파일을 선택한 뒤 `추가 확인`을 눌러야 저장 대기 목록에 들어갑니다. `파일 생성 / JSON 저장`을 누르면 실제 파일로 복사되고 상세 HTML에 반영됩니다.

상세 이미지 경로의 `삭제` 버튼은 실제 로컬 이미지 파일도 삭제합니다. 포트폴리오 상단의 `목록/파일 완전 삭제` 버튼은 `data/portfolios.json` 항목과 해당 `assets/portfolio/[분류]/[slug]` 프로젝트 폴더를 함께 삭제합니다.

## 이미지 권장 비율

- 대표 이미지: 16:9 또는 4:3, 가로 1200px 이상 권장
- 상세 이미지: 3~6장 권장

## 참고

현재 홈페이지 코드는 `data/portfolios.json`에서 `featured: true`인 항목을 메인 화면에 모두 표시합니다. 관리자 도구는 6개 초과 시 경고만 표시하며, 저장 자체는 막지 않습니다.

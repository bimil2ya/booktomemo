@AGENTS.md

## 배포
- GitHub push → Vercel 자동 배포 (main 브랜치)
- 배포 URL: https://booktomemo.vercel.app
- 배포 확인: 앱 좌측 상단 버전 번호로 확인
- 빌드 확인 필수: `npm run build` 성공 후 push

## 버전 표기
- 위치: src/app/page.tsx 상단 `VERSION` 상수
- 형식: `경호vX.X.X`
- 코드 변경 후 배포 시 패치 버전(마지막 숫자) +1

## 작업 방식
- 여러 수정이 있을 때는 하나씩 순서대로 처리 (한꺼번에 X)
- 우선순위: 버그 수정 → 찌꺼기 제거 → 리팩토링 순
- 각 수정 후 `npm run build`로 빌드 오류 없음 확인
- 배포 전 변경 내용 요약 설명 후 push

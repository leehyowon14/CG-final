# CG-final-game

Rift Aviator: Dimension Shift 기획 문서 루트입니다.

이 저장소는 기존 TheAviator의 Three.js 기반을 유지하되, Vite + ES modules 구조로 현대화하는 컴퓨터그래픽스 최종 과제용 웹 게임을 목표로 합니다. 현재 구현은 WASD 이동, Space 발사, 1/2/3 차원 전환, 차원 스택, 점수, 적/장애물/아이템, Mini Boss, DDGI debug/GI toggle을 포함합니다.

## 문서

- [최종 단일 리포트](./FINAL_REPORT.md)
- [제출용 리포트 인덱스](./report/README.md)
- [Ralph loop 구현 성공 조건](./report/09_ralph_success_criteria.md)
- [구현용 세부 성공 조건](./specs/README.md)
- [에셋 출처 기록](./ASSET_CREDITS.md)

## 구현 방향 요약

- 기존 TheAviator의 Three.js 게임 루프 개념을 재활용한다.
- 프로젝트 구조는 Vite + Three.js + ES modules로 정리한다.
- 게임은 GitHub Pages에서 실행 가능한 정적 웹 게임으로 만든다.
- 서버, DB, 로그인, 온라인 랭킹은 사용하지 않는다.
- 외부 에셋은 CC0 또는 명확한 무료 라이선스 위주로 사용한다.
- 모든 주요 구현 항목은 캡처와 함께 `report/` 문서에 남긴다.

## 예정 검증 명령

구현 후 완료 조건은 다음 계열 명령이 모두 통과하는 것입니다.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

현재 로컬 환경에는 전역 `pnpm`이 없어 `npx pnpm@10.12.1 install`로 의존성을 설치했습니다. 검증은 동일한 패키지 바이너리 기준으로 `eslint`, `tsc`, `vitest`, `vite build`를 실행했습니다.

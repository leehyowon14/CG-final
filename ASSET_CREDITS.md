# Asset Credits

외부 에셋은 CC0 또는 명확한 무료 라이선스가 확인된 자료만 사용한다. 현재 게임의 플레이어, 적, 장애물, 아이템은 Three.js geometry로 직접 생성한 저폴리 에셋이며, 외부 모델/텍스처 파일은 아직 사용하지 않았다.

| 에셋 이름 | 로컬 경로 | 출처 | 라이선스 | 사용 위치 | 수정 여부 |
|---|---|---|---|---|---|
| Procedural Player Fighter | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | 플레이어 기체 | Three.js geometry 조합 |
| Procedural Enemy Set | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Drone, Striker, Gunner, Mini Boss | Three.js geometry 조합 |
| Procedural Rift Obstacles | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Rift Crystal, Phase Wall, Rift Mine | Three.js geometry 조합 |
| Procedural Energy Pickups | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Health, Shield, Ammo | Three.js geometry 조합 |
| Dimension Field | `src/scene/DimensionEnvironment.js` | 직접 제작 | Original project asset | 차원 터널, grid, rift particles | Three.js geometry 조합 |

## 라이선스 원칙

- `무료`라는 표현만으로는 사용하지 않는다.
- CC0를 우선 사용한다.
- CC-BY를 사용할 경우 리포트와 이 파일에 출처 표기를 남긴다.
- CC-BY-NC, 불명확한 개인 배포 파일, 출처가 끊긴 파일은 사용하지 않는다.
- GitHub Pages 공개 배포 후에도 에셋 경로가 깨지지 않아야 한다.

# Asset Credits

외부 에셋은 CC0 또는 명확한 무료 라이선스가 확인된 자료만 사용한다. 현재 게임의 플레이어 기체와 ENV 조명/배경에는 외부 에셋을 사용하고, 적, 장애물, 아이템은 Three.js geometry로 직접 생성한다.

| 에셋 이름 | 로컬 경로 | 출처 | 라이선스 | 사용 위치 | 수정 여부 |
|---|---|---|---|---|---|
| Kenney Space Kit Craft Racer | `public/assets/models/player/kenney_craft_racer.obj`, `public/assets/models/player/kenney_craft_racer.mtl` | Kenney Space Kit, https://kenney.nl/assets/space-kit | Creative Commons CC0 | 플레이어 기체 | OBJ/MTL 원본 사용, 런타임 scale/center/PBR material 보강, 기존 procedural engine/core overlay 결합 |
| Procedural Player Fighter Fallback | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | 플레이어 기체 로딩 fallback, 엔진/코어 overlay | Three.js geometry 조합 |
| Procedural Enemy Set | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Drone, Striker, Gunner, Mini Boss | Three.js geometry 조합 |
| Procedural Rift Obstacles | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Rift Crystal, Phase Wall, Rift Mine | Three.js geometry 조합 |
| Procedural Energy Pickups | `src/gfx/ModelFactory.js` | 직접 제작 | Original project asset | Health, Shield, Ammo | Three.js geometry 조합 |
| Dimension Field | `src/scene/DimensionEnvironment.js` | 직접 제작 | Original project asset | 차원 터널, grid, rift particles | Three.js geometry 조합 |
| HDR Blue Local Star and Nebulae | `public/assets/env/HDR_blue_local_star_and_nebulae.hdr` | Space Spheremaps / TonyS, https://www.spacespheremaps.com/hdr-spheremaps/ | Creative Commons BY 4.0 계열 설명, attribution not necessary but appreciated, AI scraping/training 금지 조건 명시 | `scene.environment`, sky sphere 배경 | 원본 Radiance HDR 사용, 차원별 tint filter 적용 |

## 라이선스 원칙

- `무료`라는 표현만으로는 사용하지 않는다.
- CC0를 우선 사용하되, 명확한 무료 상업 사용 조건이 확인된 에셋은 출처와 조건을 기록한다.
- CC-BY를 사용할 경우 리포트와 이 파일에 출처 표기를 남긴다.
- CC-BY-NC, 불명확한 개인 배포 파일, 출처가 끊긴 파일은 사용하지 않는다.
- GitHub Pages 공개 배포 후에도 에셋 경로가 깨지지 않아야 한다.

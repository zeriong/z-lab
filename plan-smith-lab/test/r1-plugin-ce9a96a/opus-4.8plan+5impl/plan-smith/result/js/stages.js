/* stages.js — 10개 스테이지 "데이터".
 *
 * A4(데이터 주도 스테이지)의 구현: 엔진 코드는 이 배열을 읽을 뿐이며,
 * 스테이지 추가는 이 파일에 객체 하나를 더하는 것으로 끝난다(엔진 코드 0줄).
 * JSON 대신 .js 파일인 이유: file:// 로 열었을 때 fetch()가 CORS로 막히므로,
 * 같은 스키마를 스크립트 태그로 실어 로더 인터페이스를 동일하게 유지한다.
 *
 * 스키마
 *   { id, name, birds, slingshot:{x,y}, groundTop,
 *     blocks:[{x,y,w,h,material,angle?}], pigs:[{x,y,r}] }
 *   좌표는 캔버스 픽셀(y는 아래로 증가), x,y는 바디 중심.
 *
 * 저작 규칙
 *   1) 모든 블록 두께 >= CFG.MIN_BLOCK_THICKNESS(30px).
 *   2) 초기 겹침 금지 — 겹치면 t=0에 분리 충격량이 터져 구조물이 자폭한다.
 *   3) 기둥 사이에 반지름 r인 돼지를 넣으려면 기둥 중심 간격 > 2r + 30.
 */
(function (AB) {
  'use strict';

  var G = AB.CFG.GROUND_TOP;            // 660 — 모든 구조물이 올라서는 기준면
  var SLING = { x: 200, y: 540 };       // 새총 걸이 위치(고정)

  // ---- 저작 헬퍼: base = "이 블록이 올라서는 면의 y" ----
  function beam(x, base, material) {    // 세로 기둥 30x140
    return { x: x, y: base - 70, w: 30, h: 140, material: material };
  }
  function post(x, base, material) {    // 짧은 세로 기둥 30x80
    return { x: x, y: base - 40, w: 30, h: 80, material: material };
  }
  function plank(x, base, material, w) { // 가로 판자 (w)x30
    w = w || 160;
    return { x: x, y: base - 15, w: w, h: 30, material: material };
  }
  function cube(x, base, material) {    // 정육면 60x60
    return { x: x, y: base - 30, w: 60, h: 60, material: material };
  }
  function pig(x, base, r) {
    r = r || AB.CFG.PIG_RADIUS;
    return { x: x, y: base - r, r: r };
  }

  AB.STAGES = [
    // 01 — 첫 발사: 단순 오두막 1채, 돼지 1마리
    {
      id: 1, name: '첫 발사', birds: 3, slingshot: SLING, groundTop: G,
      blocks: [
        beam(900, G, 'wood'),
        beam(1000, G, 'wood'),
        plank(950, G - 140, 'wood', 160)
      ],
      pigs: [pig(950, G)]
    },

    // 02 — 얼음집: 얼음은 잘 깨진다. 노출된 돼지 하나 추가
    {
      id: 2, name: '얼음집', birds: 3, slingshot: SLING, groundTop: G,
      blocks: [
        beam(880, G, 'ice'),
        beam(980, G, 'ice'),
        plank(930, G - 140, 'ice', 160),
        cube(930, G - 170, 'wood')
      ],
      pigs: [pig(930, G, 22), pig(1120, G, 20)]
    },

    // 03 — 돌 기둥: 돌 1층 + 나무 2층, 옥상 돼지
    {
      id: 3, name: '돌 기둥', birds: 4, slingshot: SLING, groundTop: G,
      blocks: [
        beam(860, G, 'stone'),
        beam(960, G, 'stone'),
        plank(910, G - 140, 'stone', 160),
        beam(885, G - 170, 'wood'),
        beam(935, G - 170, 'wood'),
        plank(910, G - 310, 'wood', 160)
      ],
      // 2층 기둥 간격(50)은 돼지가 들어갈 수 없으므로 최상단 판자 위에 올린다.
      pigs: [pig(910, G, 22), pig(910, G - 340, 20)]
    },

    // 04 — 두 오두막: 좌우로 갈라진 목표, 궤적 각도 조절 연습
    {
      id: 4, name: '두 오두막', birds: 4, slingshot: SLING, groundTop: G,
      blocks: [
        beam(760, G, 'wood'),
        beam(840, G, 'wood'),
        plank(800, G - 140, 'ice', 120),
        beam(1010, G, 'ice'),
        beam(1090, G, 'ice'),
        plank(1050, G - 140, 'wood', 120)
      ],
      // 기둥 간격 80 > 2*20 + 30 = 70 → 돼지가 안쪽에 정상 배치
      pigs: [pig(800, G, 20), pig(1050, G, 20)]
    },

    // 05 — 피라미드: 돌 기단 위 얼음 상자, 최상단 돼지
    {
      id: 5, name: '피라미드', birds: 4, slingshot: SLING, groundTop: G,
      blocks: [
        cube(880, G, 'stone'),
        cube(1020, G, 'stone'),
        plank(950, G - 60, 'wood', 200),
        cube(910, G - 90, 'ice'),
        cube(990, G - 90, 'ice'),
        plank(950, G - 150, 'wood', 120)
      ],
      pigs: [pig(950, G, 26), pig(950, G - 180, 20)]
    },

    // 06 — 탑: 3층 수직 구조, 높은 곳의 돼지 + 지상 유격 돼지
    {
      id: 6, name: '탑', birds: 5, slingshot: SLING, groundTop: G,
      blocks: [
        beam(900, G, 'stone'),
        beam(1000, G, 'stone'),
        plank(950, G - 140, 'stone', 160),
        beam(910, G - 170, 'wood'),
        beam(990, G - 170, 'wood'),
        plank(950, G - 310, 'wood', 160),
        cube(950, G - 340, 'ice')
      ],
      pigs: [pig(950, G, 22), pig(950, G - 170, 20), pig(1140, G, 20)]
    },

    // 07 — 요새: 3열 기둥 + 얼음 상자 층 + 옥상 돼지
    {
      id: 7, name: '요새', birds: 5, slingshot: SLING, groundTop: G,
      blocks: [
        beam(820, G, 'stone'),
        beam(920, G, 'stone'),
        beam(1020, G, 'stone'),
        plank(870, G - 140, 'wood', 96),
        plank(970, G - 140, 'wood', 96),
        cube(870, G - 170, 'ice'),
        cube(970, G - 170, 'ice'),
        plank(920, G - 230, 'stone', 200)
      ],
      pigs: [pig(870, G, 20), pig(970, G, 20), pig(920, G - 260, 22)]
    },

    // 08 — 돌 벙커: 단단한 1층, 얼음 2층이 약점
    {
      id: 8, name: '돌 벙커', birds: 5, slingshot: SLING, groundTop: G,
      blocks: [
        beam(860, G, 'stone'),
        beam(960, G, 'stone'),
        beam(1060, G, 'stone'),
        plank(910, G - 140, 'stone', 96),
        plank(1010, G - 140, 'stone', 96),
        beam(910, G - 170, 'ice'),
        beam(1010, G - 170, 'ice'),
        plank(960, G - 310, 'wood', 200)
      ],
      pigs: [pig(910, G, 20), pig(1010, G, 20), pig(960, G - 340, 20)]
    },

    // 09 — 쌍둥이 탑과 다리: 다리를 끊으면 위가 한꺼번에 무너진다
    {
      id: 9, name: '쌍둥이 탑과 다리', birds: 5, slingshot: SLING, groundTop: G,
      blocks: [
        beam(800, G, 'wood'),
        beam(880, G, 'wood'),
        plank(840, G - 140, 'stone', 120),
        beam(1000, G, 'wood'),
        beam(1080, G, 'wood'),
        plank(1040, G - 140, 'stone', 120),
        plank(940, G - 170, 'wood', 260),
        cube(890, G - 200, 'ice')
      ],
      pigs: [pig(840, G, 20), pig(1040, G, 20), pig(940, G, 22), pig(990, G - 200, 20)]
    },

    // 10 — 왕의 성: 4열 돌 기둥, 나무 2층, 정상 돌 상자
    {
      id: 10, name: '왕의 성', birds: 6, slingshot: SLING, groundTop: G,
      blocks: [
        beam(780, G, 'stone'),
        beam(880, G, 'stone'),
        beam(980, G, 'stone'),
        beam(1080, G, 'stone'),
        plank(830, G - 140, 'stone', 96),
        plank(930, G - 140, 'stone', 96),
        plank(1030, G - 140, 'stone', 96),
        beam(830, G - 170, 'wood'),
        beam(930, G - 170, 'wood'),
        beam(1030, G - 170, 'wood'),
        plank(880, G - 310, 'wood', 96),
        plank(980, G - 310, 'wood', 96),
        cube(930, G - 340, 'stone'),
        post(1150, G, 'ice')
      ],
      // 2층 돼지는 기둥 830/930 사이(간격 100 > 70)에 배치 — 기둥과 겹치지 않는다.
      pigs: [
        pig(830, G, 20), pig(930, G, 20), pig(1030, G, 20), pig(880, G - 170, 20)
      ]
    }
  ];
})(window.AB);

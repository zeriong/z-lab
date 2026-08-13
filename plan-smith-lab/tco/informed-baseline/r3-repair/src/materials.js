// src/materials.js
// 재질(MAT)과 새 종류(BIRD) 테이블 (§10)
// 의존성: C

const MAT = {
  glass: {
    density: 0.6,
    hp: 30,
    e: 0.15,
    mu: 0.30,
    color: "#a8dced",
    border: "#6fb6d6",
    breakScore: 250
  },
  wood: {
    density: 1.0,
    hp: 60,
    e: 0.20,
    mu: 0.50,
    color: "#c98b4b",
    border: "#8a5a2b",
    breakScore: 500
  },
  stone: {
    density: 2.2,
    hp: 140,
    e: 0.10,
    mu: 0.60,
    color: "#9aa3ab",
    border: "#6b7178",
    breakScore: 750
  },
  pig: {
    density: 2.0,
    hp: 40,
    e: 0.25,
    mu: 0.40,
    color: "#7fc855",
    border: "#4e8f33",
    breakScore: 0  // 돼지는 피해로만 제거, breakScore는 SCORE_PIG 사용
  },
  bird: {
    density: 7.5,
    hp: Infinity,
    e: 0.35,
    mu: 0.40,
    color: "#e2483c",  // red 기본값
    border: "#000000",
    breakScore: 0
  },
  ground: {
    density: 0,  // 정적
    hp: Infinity,
    e: 0.20,
    mu: 0.80,
    color: "#6ab04c",
    border: null,
    breakScore: 0
  }
};

const BIRD = {
  red: {
    color: "#e2483c",
    radius: 16,
    ability: null  // 없음
  },
  yellow: {
    color: "#f2c327",
    radius: 14,
    ability: "accelerate"  // 속도 ×1.9
  },
  black: {
    color: "#2f3237",
    radius: 18,
    ability: "explode"  // 즉시 폭발
  }
};

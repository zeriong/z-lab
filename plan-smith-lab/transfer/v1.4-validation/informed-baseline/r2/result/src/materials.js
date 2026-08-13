// Material properties and bird types
window.MAT = {
  glass: {
    density: 0.6,
    hp: 30,
    e: 0.15,
    mu: 0.30,
    color: '#a8dced',
    border: '#6fb6d6',
    score: 250
  },
  wood: {
    density: 1.0,
    hp: 60,
    e: 0.20,
    mu: 0.50,
    color: '#c98b4b',
    border: '#8a5a2b',
    score: 500
  },
  stone: {
    density: 2.2,
    hp: 140,
    e: 0.10,
    mu: 0.60,
    color: '#9aa3ab',
    border: '#6b7178',
    score: 750
  },
  pig: {
    density: 2.0,
    hp: 40,
    e: 0.25,
    mu: 0.40,
    color: '#7fc855',
    border: '#4e8f33',
    score: 5000
  },
  bird: {
    density: 7.5,
    hp: Infinity,
    e: 0.35,
    mu: 0.40,
    color: '#e2483c',
    border: '#000000',
    score: 0
  },
  ground: {
    density: Infinity,
    hp: Infinity,
    e: 0.20,
    mu: 0.80,
    color: '#6ab04c',
    border: null,
    score: 0
  }
};

window.BIRD = {
  red: {
    color: '#e2483c',
    radius: 16,
    ability: 'none'
  },
  yellow: {
    color: '#f2c327',
    radius: 14,
    ability: 'speed'
  },
  black: {
    color: '#2f3237',
    radius: 18,
    ability: 'explode'
  }
};

const STAGES = [
  {
    id: 0,
    name: "Tutorial",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 500, y: 430, hp: 100 }
    ],
    blocks: [
      { x: 480, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 520, y: 430, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3
  },
  {
    id: 1,
    name: "Double Trouble",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 480, y: 400, hp: 100 },
      { x: 520, y: 400, hp: 100 }
    ],
    blocks: [
      { x: 500, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 460, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 540, y: 430, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3
  },
  {
    id: 2,
    name: "Tower Challenge",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 500, y: 350, hp: 100 },
      { x: 500, y: 380, hp: 100 }
    ],
    blocks: [
      { x: 500, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 470, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 530, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 360, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3
  },
  {
    id: 3,
    name: "Precision Required",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 450, y: 350, hp: 100 },
      { x: 550, y: 350, hp: 100 },
      { x: 500, y: 380, hp: 100 }
    ],
    blocks: [
      { x: 450, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 550, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 475, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 525, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 360, w: 40, h: 40, material: "stone", hp: 150 }
    ],
    maxMoves: 3
  },
  {
    id: 4,
    name: "Sky High",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 500, y: 250, hp: 100 },
      { x: 500, y: 300, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 500, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 470, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 530, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 470, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 530, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 300, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 270, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3
  },
  {
    id: 5,
    name: "Fortress",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 450, y: 300, hp: 100 },
      { x: 550, y: 300, hp: 100 },
      { x: 500, y: 250, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 450, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 550, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 425, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 475, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 525, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 575, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 450, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 550, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 330, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 2
  },
  {
    id: 6,
    name: "Ironclad",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 400, y: 300, hp: 100 },
      { x: 600, y: 300, hp: 100 },
      { x: 500, y: 250, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 400, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 375, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 450, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 550, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 625, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 400, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 450, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 550, y: 330, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 2
  },
  {
    id: 7,
    name: "Domino",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 400, y: 250, hp: 100 },
      { x: 600, y: 250, hp: 100 },
      { x: 500, y: 200, hp: 100 },
      { x: 500, y: 300, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 400, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 350, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 425, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 575, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 650, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 400, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 600, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 450, y: 330, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 550, y: 330, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 300, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 270, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 2
  },
  {
    id: 8,
    name: "Ultimate Challenge",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 350, y: 200, hp: 100 },
      { x: 650, y: 200, hp: 100 },
      { x: 500, y: 150, hp: 100 },
      { x: 500, y: 300, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 350, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 650, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 325, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 400, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 675, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 350, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 425, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 575, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 650, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 400, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 330, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 450, y: 300, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 550, y: 300, w: 40, h: 40, material: "stone", hp: 150 }
    ],
    maxMoves: 1
  },
  {
    id: 9,
    name: "The Final Showdown",
    slingshot: { x: 100, y: 500 },
    bird: { type: "red", x: 100, y: 500 },
    pigs: [
      { x: 300, y: 150, hp: 100 },
      { x: 700, y: 150, hp: 100 },
      { x: 500, y: 100, hp: 100 },
      { x: 400, y: 250, hp: 100 },
      { x: 600, y: 250, hp: 100 },
      { x: 500, y: 350, hp: 100 }
    ],
    blocks: [
      { x: 300, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 700, y: 420, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 275, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 350, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 450, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 550, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 650, y: 390, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 725, y: 390, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 300, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 400, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 500, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 600, y: 360, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 700, y: 360, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 350, y: 330, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 450, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 500, y: 330, w: 40, h: 40, material: "stone", hp: 150 },
      { x: 550, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 650, y: 330, w: 40, h: 40, material: "stone", hp: 150 }
    ],
    maxMoves: 1
  }
];

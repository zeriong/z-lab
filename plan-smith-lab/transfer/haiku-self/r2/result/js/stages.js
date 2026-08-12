/**
 * Stage definitions - 10 stages with increasing difficulty
 * Each stage defines slingshot position, bird, pigs, blocks, and max moves
 */
const STAGES = [
  {
    id: 1,
    name: "Tutorial",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 700, y: 400, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 430, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3,
    goal: "Destroy all pigs"
  },
  {
    id: 2,
    name: "Double Trouble",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 650, y: 350, radius: 16, hp: 100 },
      { x: 750, y: 350, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 700, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 650, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 430, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 3,
    goal: "Eliminate both pigs"
  },
  {
    id: 3,
    name: "Tower",
    slingshot: { x: 100, y: 480 },
    bird: { type: "yellow", x: 100, y: 480, radius: 13 },
    pigs: [
      { x: 700, y: 280, radius: 16, hp: 100 },
      { x: 750, y: 280, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 700, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 725, y: 330, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 3,
    goal: "Break the tower"
  },
  {
    id: 4,
    name: "Complex",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 650, y: 280, radius: 16, hp: 100 },
      { x: 750, y: 280, radius: 16, hp: 100 },
      { x: 700, y: 180, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 330, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 650, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 230, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 3,
    goal: "Destroy complex structure"
  },
  {
    id: 5,
    name: "High Tower",
    slingshot: { x: 100, y: 480 },
    bird: { type: "blue", x: 100, y: 480, radius: 12 },
    pigs: [
      { x: 700, y: 200, radius: 16, hp: 100 },
      { x: 750, y: 150, radius: 16, hp: 100 },
      { x: 720, y: 100, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 700, y: 250, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 250, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 300, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 300, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 720, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 720, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 430, w: 60, h: 40, material: "stone", hp: 150 }
    ],
    maxMoves: 3,
    goal: "Topple the tower"
  },
  {
    id: 6,
    name: "Fortress",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 650, y: 250, radius: 16, hp: 100 },
      { x: 750, y: 250, radius: 16, hp: 100 },
      { x: 700, y: 350, radius: 16, hp: 100 },
      { x: 720, y: 150, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 300, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 300, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 300, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 675, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 725, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 400, w: 60, h: 40, material: "stone", hp: 150 },
      { x: 650, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 720, y: 100, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 150, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 2,
    goal: "Conquer the fortress"
  },
  {
    id: 7,
    name: "Solid Structure",
    slingshot: { x: 100, y: 480 },
    bird: { type: "yellow", x: 100, y: 480, radius: 13 },
    pigs: [
      { x: 650, y: 200, radius: 16, hp: 100 },
      { x: 750, y: 200, radius: 16, hp: 100 },
      { x: 700, y: 280, radius: 16, hp: 100 },
      { x: 720, y: 100, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 625, y: 330, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 330, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 775, y: 330, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 400, w: 80, h: 40, material: "stone", hp: 180 },
      { x: 675, y: 150, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 725, y: 150, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 100, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 650, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 430, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 2,
    goal: "Break through the solid structure"
  },
  {
    id: 8,
    name: "Domino Chain",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 650, y: 150, radius: 16, hp: 100 },
      { x: 750, y: 150, radius: 16, hp: 100 },
      { x: 700, y: 250, radius: 16, hp: 100 },
      { x: 720, y: 80, radius: 16, hp: 100 },
      { x: 680, y: 200, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 750, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 625, y: 300, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 300, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 775, y: 300, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 350, w: 60, h: 40, material: "stone", hp: 150 },
      { x: 675, y: 100, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 725, y: 100, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 700, y: 50, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 650, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 600, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
      { x: 800, y: 200, w: 40, h: 40, material: "wood", hp: 80 }
    ],
    maxMoves: 2,
    goal: "Trigger the domino effect"
  },
  {
    id: 9,
    name: "Extreme Challenge",
    slingshot: { x: 100, y: 480 },
    bird: { type: "blue", x: 100, y: 480, radius: 12 },
    pigs: [
      { x: 650, y: 100, radius: 16, hp: 100 },
      { x: 750, y: 100, radius: 16, hp: 100 },
      { x: 700, y: 200, radius: 16, hp: 100 },
      { x: 720, y: 50, radius: 16, hp: 100 },
      { x: 680, y: 150, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 650, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 625, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 775, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 300, w: 80, h: 40, material: "stone", hp: 200 },
      { x: 675, y: 50, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 725, y: 50, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 20, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 600, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 800, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 650, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 380, w: 60, h: 40, material: "stone", hp: 180 },
      { x: 650, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 430, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 1,
    goal: "Extreme precision required"
  },
  {
    id: 10,
    name: "Final Boss",
    slingshot: { x: 100, y: 480 },
    bird: { type: "red", x: 100, y: 480, radius: 14 },
    pigs: [
      { x: 600, y: 100, radius: 16, hp: 100 },
      { x: 700, y: 100, radius: 16, hp: 100 },
      { x: 800, y: 100, radius: 16, hp: 100 },
      { x: 650, y: 50, radius: 16, hp: 100 },
      { x: 750, y: 50, radius: 16, hp: 100 },
      { x: 700, y: 200, radius: 16, hp: 100 }
    ],
    blocks: [
      { x: 600, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 800, y: 150, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 575, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 675, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 775, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 825, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 250, w: 60, h: 40, material: "stone", hp: 200 },
      { x: 625, y: 20, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 775, y: 20, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 300, w: 100, h: 40, material: "stone", hp: 250 },
      { x: 550, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 650, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 850, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 600, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 700, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 800, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 650, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
      { x: 750, y: 380, w: 40, h: 40, material: "stone", hp: 120 }
    ],
    maxMoves: 1,
    goal: "Defeat the final boss"
  }
];

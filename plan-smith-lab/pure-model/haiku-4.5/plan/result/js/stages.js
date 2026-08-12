export const stages = [
    {
        id: 1,
        name: "Tutorial",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 600, y: 450, hp: 100 }
        ],
        blocks: [
            { x: 580, y: 470, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 620, y: 470, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Destroy all pigs"
    },
    {
        id: 2,
        name: "Two Targets",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 550, y: 400, hp: 100 },
            { x: 650, y: 400, hp: 100 }
        ],
        blocks: [
            { x: 550, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 450, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Destroy all pigs"
    },
    {
        id: 3,
        name: "Medium Tower",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 600, y: 300, hp: 100 },
            { x: 600, y: 380, hp: 100 }
        ],
        blocks: [
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 630, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 630, y: 350, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 3,
        goal: "Destroy all pigs"
    },
    {
        id: 4,
        name: "Complex Structure",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 550, y: 300, hp: 100 },
            { x: 600, y: 300, hp: 100 },
            { x: 650, y: 300, hp: 100 }
        ],
        blocks: [
            { x: 550, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 380, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Destroy all pigs"
    },
    {
        id: 5,
        name: "Tall Tower",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 600, y: 250, hp: 100 },
            { x: 600, y: 150, hp: 100 },
            { x: 600, y: 350, hp: 100 }
        ],
        blocks: [
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 410, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 630, y: 410, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 280, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 630, y: 280, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 210, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 570, y: 180, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 3,
        goal: "Destroy all pigs"
    },
    {
        id: 6,
        name: "Composite Challenge",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 500, y: 350, hp: 100 },
            { x: 700, y: 350, hp: 100 },
            { x: 600, y: 300, hp: 100 },
            { x: 600, y: 200, hp: 100 }
        ],
        blocks: [
            { x: 500, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 570, y: 340, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 630, y: 340, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 260, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 580, y: 220, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 2,
        goal: "Destroy all pigs"
    },
    {
        id: 7,
        name: "Fortress",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 550, y: 300, hp: 100 },
            { x: 650, y: 300, hp: 100 },
            { x: 550, y: 200, hp: 100 },
            { x: 650, y: 200, hp: 100 }
        ],
        blocks: [
            { x: 550, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 520, y: 400, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 580, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 620, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 680, y: 400, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 350, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 350, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 250, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 160, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 2,
        goal: "Destroy all pigs"
    },
    {
        id: 8,
        name: "Domino Maze",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 500, y: 250, hp: 100 },
            { x: 700, y: 250, hp: 100 },
            { x: 600, y: 150, hp: 100 },
            { x: 600, y: 300, hp: 100 },
            { x: 550, y: 100, hp: 100 }
        ],
        blocks: [
            { x: 500, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 330, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 330, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 700, y: 350, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 250, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 630, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 100, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 60, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 2,
        goal: "Destroy all pigs"
    },
    {
        id: 9,
        name: "Extreme Challenge",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 450, y: 250, hp: 100 },
            { x: 600, y: 150, hp: 100 },
            { x: 750, y: 250, hp: 100 },
            { x: 550, y: 100, hp: 100 },
            { x: 650, y: 100, hp: 100 }
        ],
        blocks: [
            { x: 450, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 500, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 450, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 450, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 520, y: 320, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 340, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 680, y: 320, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 220, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 630, y: 220, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 160, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 130, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 160, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 575, y: 70, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 1,
        goal: "Destroy all pigs"
    },
    {
        id: 10,
        name: "Final Boss",
        slingshot: { x: 100, y: 500 },
        bird: { type: "red", x: 100, y: 500, size: 15 },
        pigs: [
            { x: 400, y: 200, hp: 100 },
            { x: 500, y: 150, hp: 100 },
            { x: 600, y: 100, hp: 100 },
            { x: 700, y: 150, hp: 100 },
            { x: 800, y: 200, hp: 100 },
            { x: 600, y: 280, hp: 100 }
        ],
        blocks: [
            { x: 400, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 450, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 500, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 700, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 430, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 800, y: 450, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 400, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 800, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 240, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 220, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 700, y: 240, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 450, y: 160, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 120, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 120, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 1,
        goal: "Destroy all pigs"
    }
];

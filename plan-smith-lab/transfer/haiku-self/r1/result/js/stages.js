const STAGES = [
    {
        id: 0,
        name: "Tutorial",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 550, y: 400, hp: 100 }
        ],
        blocks: [
            { x: 530, y: 430, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 570, y: 430, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Remove all pigs"
    },
    {
        id: 1,
        name: "Double Targets",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 500, y: 350, hp: 100 },
            { x: 600, y: 350, hp: 100 }
        ],
        blocks: [
            { x: 500, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 400, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Remove all pigs"
    },
    {
        id: 2,
        name: "Tower",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 550, y: 300, hp: 100 },
            { x: 550, y: 200, hp: 100 }
        ],
        blocks: [
            { x: 550, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 350, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 520, y: 350, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 580, y: 350, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 280, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Remove all pigs"
    },
    {
        id: 3,
        name: "Complex Structure",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 500, y: 250, hp: 100 },
            { x: 600, y: 280, hp: 100 },
            { x: 550, y: 350, hp: 100 }
        ],
        blocks: [
            { x: 500, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 400, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 400, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 280, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Remove all pigs"
    },
    {
        id: 4,
        name: "Tall Tower",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 550, y: 200, hp: 100 },
            { x: 550, y: 100, hp: 100 },
            { x: 550, y: 50, hp: 100 }
        ],
        blocks: [
            { x: 550, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 520, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 580, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 280, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 220, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 160, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 100, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 3,
        goal: "Remove all pigs"
    },
    {
        id: 5,
        name: "Composite",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 450, y: 320, hp: 100 },
            { x: 550, y: 250, hp: 100 },
            { x: 650, y: 320, hp: 100 },
            { x: 550, y: 400, hp: 100 }
        ],
        blocks: [
            { x: 450, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 260, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 520, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 580, y: 200, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 2,
        goal: "Remove all pigs"
    },
    {
        id: 6,
        name: "Sturdy",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 480, y: 280, hp: 100 },
            { x: 620, y: 280, hp: 100 },
            { x: 480, y: 120, hp: 100 },
            { x: 620, y: 120, hp: 100 }
        ],
        blocks: [
            { x: 480, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 620, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 480, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 620, y: 320, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 450, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 515, y: 140, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 585, y: 140, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 80, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 2,
        goal: "Remove all pigs"
    },
    {
        id: 7,
        name: "Very Complex",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 400, y: 200, hp: 100 },
            { x: 500, y: 150, hp: 100 },
            { x: 600, y: 200, hp: 100 },
            { x: 700, y: 200, hp: 100 },
            { x: 550, y: 80, hp: 100 }
        ],
        blocks: [
            { x: 400, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 450, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 500, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 380, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 700, y: 380, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 400, y: 310, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 310, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 310, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 450, y: 240, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 240, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 180, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 600, y: 180, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 120, w: 40, h: 40, material: "stone", hp: 120 }
        ],
        maxMoves: 2,
        goal: "Remove all pigs"
    },
    {
        id: 8,
        name: "Ultimate Challenge",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 380, y: 180, hp: 100 },
            { x: 550, y: 100, hp: 100 },
            { x: 720, y: 180, hp: 100 },
            { x: 450, y: 300, hp: 100 },
            { x: 650, y: 300, hp: 100 }
        ],
        blocks: [
            { x: 380, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 450, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 650, y: 420, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 720, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 380, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 720, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 400, y: 260, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 260, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 600, y: 260, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 700, y: 260, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 450, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 140, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 520, y: 80, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 580, y: 80, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 20, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 1,
        goal: "Remove all pigs"
    },
    {
        id: 9,
        name: "Final Boss",
        slingshot: { x: 100, y: 480 },
        bird: { type: "red", x: 100, y: 480 },
        pigs: [
            { x: 350, y: 150, hp: 150 },
            { x: 500, y: 80, hp: 150 },
            { x: 650, y: 150, hp: 150 },
            { x: 400, y: 280, hp: 100 },
            { x: 700, y: 280, hp: 100 },
            { x: 550, y: 350, hp: 100 }
        ],
        blocks: [
            { x: 350, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 430, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 670, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 420, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 350, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 500, y: 340, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 340, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 390, y: 260, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 550, y: 260, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 710, y: 260, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 350, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 200, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 750, y: 200, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 450, y: 140, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 650, y: 140, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 80, w: 40, h: 40, material: "stone", hp: 120 },
            { x: 470, y: 40, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 550, y: 20, w: 40, h: 40, material: "wood", hp: 80 },
            { x: 630, y: 40, w: 40, h: 40, material: "wood", hp: 80 }
        ],
        maxMoves: 1,
        goal: "Remove all pigs"
    }
];

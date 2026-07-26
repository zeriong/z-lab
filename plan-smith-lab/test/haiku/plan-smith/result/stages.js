// Stage definitions - 10 levels
const STAGES = [
    {
        id: 1,
        name: 'Stage 1: Beginner',
        bodies: [
            { type: 'wood_block', x: 250, y: 580, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 280, y: 540, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 2,
        name: 'Stage 2: Basic Structure',
        bodies: [
            { type: 'wood_block', x: 250, y: 580, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 300, y: 580, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 350, y: 540, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 250, y: 540, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 3,
        name: 'Stage 3: Double Layer',
        bodies: [
            { type: 'wood_block', x: 250, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 300, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 275, y: 550, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 275, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 350, y: 550, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 4,
        name: 'Stage 4: Complex',
        bodies: [
            { type: 'stone_block', x: 250, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 300, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 350, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 275, y: 550, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 325, y: 550, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 300, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 350, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 250, y: 510, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 5,
        name: 'Stage 5: Tower',
        bodies: [
            { type: 'wood_block', x: 300, y: 600, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 300, y: 550, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 300, y: 500, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 350, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'stone_block', x: 350, y: 550, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'pig', x: 300, y: 450, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 350, y: 450, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 380, y: 510, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 6,
        name: 'Stage 6: Advanced',
        bodies: [
            { type: 'wood_block', x: 250, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 300, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 350, y: 600, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 275, y: 550, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'stone_block', x: 325, y: 550, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 300, y: 500, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 250, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 300, y: 460, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 350, y: 510, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 7,
        name: 'Stage 7: Pyramid',
        bodies: [
            { type: 'stone_block', x: 250, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'stone_block', x: 300, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'stone_block', x: 350, y: 600, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 275, y: 550, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'wood_block', x: 325, y: 550, width: 50, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 300, y: 500, width: 50, height: 20, rotation: 0, color: '#808080' },
            { type: 'pig', x: 250, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 300, y: 460, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 350, y: 510, radius: 18, color: '#FF69B4' },
            { type: 'pig', x: 300, y: 360, radius: 18, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 8,
        name: 'Stage 8: Expert',
        bodies: [
            { type: 'wood_block', x: 220, y: 600, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 270, y: 600, width: 40, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 320, y: 600, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 370, y: 600, width: 40, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 245, y: 550, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 295, y: 550, width: 40, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 345, y: 550, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 270, y: 500, width: 40, height: 20, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 320, y: 500, width: 40, height: 20, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 220, y: 560, radius: 15, color: '#FF69B4' },
            { type: 'pig', x: 270, y: 560, radius: 15, color: '#FF69B4' },
            { type: 'pig', x: 320, y: 560, radius: 15, color: '#FF69B4' },
            { type: 'pig', x: 370, y: 560, radius: 15, color: '#FF69B4' },
            { type: 'pig', x: 295, y: 460, radius: 15, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 9,
        name: 'Stage 9: Master',
        bodies: [
            { type: 'stone_block', x: 200, y: 600, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 245, y: 600, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 290, y: 600, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 335, y: 600, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 380, y: 600, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 222, y: 550, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 267, y: 550, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 312, y: 550, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 357, y: 550, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 245, y: 500, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 290, y: 500, width: 35, height: 18, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 335, y: 500, width: 35, height: 18, rotation: 0, color: '#8B4513' },
            { type: 'pig', x: 200, y: 560, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 245, y: 560, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 290, y: 560, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 335, y: 560, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 380, y: 560, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 267, y: 460, radius: 14, color: '#FF69B4' },
            { type: 'pig', x: 312, y: 460, radius: 14, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    },
    {
        id: 10,
        name: 'Stage 10: Ultimate',
        bodies: [
            { type: 'stone_block', x: 180, y: 600, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 220, y: 600, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 260, y: 600, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 300, y: 600, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 340, y: 600, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 380, y: 600, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 200, y: 550, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 240, y: 550, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 280, y: 550, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 320, y: 550, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 360, y: 550, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 220, y: 500, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 260, y: 500, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'wood_block', x: 300, y: 500, width: 30, height: 15, rotation: 0, color: '#8B4513' },
            { type: 'stone_block', x: 340, y: 500, width: 30, height: 15, rotation: 0, color: '#808080' },
            { type: 'pig', x: 180, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 220, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 260, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 300, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 340, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 380, y: 560, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 240, y: 460, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 280, y: 460, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 320, y: 460, radius: 12, color: '#FF69B4' },
            { type: 'pig', x: 300, y: 400, radius: 12, color: '#FF69B4' }
        ],
        slingshot: { x: 100, y: 600 },
        camera: { x: 0, y: 0, zoom: 1 },
        maxTime: 120
    }
];

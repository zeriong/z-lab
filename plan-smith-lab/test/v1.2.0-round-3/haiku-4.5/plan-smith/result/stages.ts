import { Stage, Block, Pig } from './types';

export const STAGES: Stage[] = [
    {
        id: 1,
        name: 'Introduction',
        difficulty: 1,
        birds_available: 5,
        bird_types: ['basic'],
        blocks: [
            { id: 'b1', type: 'wood', x: 400, y: 450, width: 40, height: 40 },
            { id: 'b2', type: 'wood', x: 450, y: 450, width: 40, height: 40 },
            { id: 'b3', type: 'wood', x: 425, y: 400, width: 40, height: 40 },
            { id: 'b4', type: 'wood', x: 400, y: 350, width: 40, height: 40 },
            { id: 'b5', type: 'wood', x: 450, y: 350, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 425, y: 300 }
        ],
        background_asset: 'forest',
        star_thresholds: { three_stars: 2, two_stars: 4, one_star: 5 }
    },
    {
        id: 2,
        name: 'Basic Challenge',
        difficulty: 2,
        birds_available: 5,
        bird_types: ['basic'],
        blocks: [
            { id: 'b1', type: 'wood', x: 400, y: 450, width: 40, height: 40 },
            { id: 'b2', type: 'wood', x: 450, y: 450, width: 40, height: 40 },
            { id: 'b3', type: 'wood', x: 500, y: 450, width: 40, height: 40 },
            { id: 'b4', type: 'wood', x: 425, y: 400, width: 40, height: 40 },
            { id: 'b5', type: 'wood', x: 475, y: 400, width: 40, height: 40 },
            { id: 'b6', type: 'wood', x: 450, y: 350, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 300 }
        ],
        background_asset: 'forest',
        star_thresholds: { three_stars: 2, two_stars: 4, one_star: 5 }
    },
    {
        id: 3,
        name: 'Heavy Hitter',
        difficulty: 3,
        birds_available: 5,
        bird_types: ['basic', 'heavy'],
        blocks: [
            { id: 'b1', type: 'wood', x: 400, y: 480, width: 40, height: 40 },
            { id: 'b2', type: 'wood', x: 450, y: 480, width: 40, height: 40 },
            { id: 'b3', type: 'wood', x: 500, y: 480, width: 40, height: 40 },
            { id: 'b4', type: 'glass', x: 425, y: 430, width: 40, height: 40 },
            { id: 'b5', type: 'glass', x: 475, y: 430, width: 40, height: 40 },
            { id: 'b6', type: 'wood', x: 425, y: 380, width: 40, height: 40 },
            { id: 'b7', type: 'wood', x: 475, y: 380, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 320 },
            { id: 'p2', x: 425, y: 320 }
        ],
        background_asset: 'forest',
        star_thresholds: { three_stars: 2, two_stars: 4, one_star: 5 }
    },
    {
        id: 4,
        name: 'Speed Test',
        difficulty: 4,
        birds_available: 6,
        bird_types: ['basic', 'fast'],
        blocks: [
            { id: 'b1', type: 'wood', x: 380, y: 480, width: 40, height: 40 },
            { id: 'b2', type: 'glass', x: 430, y: 480, width: 40, height: 40 },
            { id: 'b3', type: 'wood', x: 480, y: 480, width: 40, height: 40 },
            { id: 'b4', type: 'glass', x: 530, y: 480, width: 40, height: 40 },
            { id: 'b5', type: 'concrete', x: 405, y: 430, width: 40, height: 40 },
            { id: 'b6', type: 'concrete', x: 505, y: 430, width: 40, height: 40 },
            { id: 'b7', type: 'glass', x: 455, y: 380, width: 40, height: 40 },
            { id: 'b8', type: 'wood', x: 455, y: 330, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 455, y: 270 },
            { id: 'p2', x: 380, y: 280 },
            { id: 'p3', x: 530, y: 280 }
        ],
        background_asset: 'plains',
        star_thresholds: { three_stars: 2, two_stars: 4, one_star: 6 }
    },
    {
        id: 5,
        name: 'Mixed Materials',
        difficulty: 5,
        birds_available: 6,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'wood', x: 350, y: 500, width: 40, height: 40 },
            { id: 'b2', type: 'glass', x: 400, y: 500, width: 40, height: 40 },
            { id: 'b3', type: 'concrete', x: 450, y: 500, width: 40, height: 40 },
            { id: 'b4', type: 'wood', x: 500, y: 500, width: 40, height: 40 },
            { id: 'b5', type: 'glass', x: 550, y: 500, width: 40, height: 40 },
            { id: 'b6', type: 'concrete', x: 375, y: 450, width: 40, height: 40 },
            { id: 'b7', type: 'wood', x: 525, y: 450, width: 40, height: 40 },
            { id: 'b8', type: 'glass', x: 450, y: 400, width: 40, height: 40 },
            { id: 'b9', type: 'concrete', x: 450, y: 350, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 280 },
            { id: 'p2', x: 350, y: 300 },
            { id: 'p3', x: 550, y: 300 },
            { id: 'p4', x: 450, y: 420 }
        ],
        background_asset: 'plains',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 6 }
    },
    {
        id: 6,
        name: 'Tower',
        difficulty: 6,
        birds_available: 7,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'wood', x: 440, y: 500, width: 40, height: 40 },
            { id: 'b2', type: 'wood', x: 460, y: 500, width: 40, height: 40 },
            { id: 'b3', type: 'glass', x: 440, y: 450, width: 40, height: 40 },
            { id: 'b4', type: 'glass', x: 460, y: 450, width: 40, height: 40 },
            { id: 'b5', type: 'concrete', x: 440, y: 400, width: 40, height: 40 },
            { id: 'b6', type: 'concrete', x: 460, y: 400, width: 40, height: 40 },
            { id: 'b7', type: 'wood', x: 440, y: 350, width: 40, height: 40 },
            { id: 'b8', type: 'wood', x: 460, y: 350, width: 40, height: 40 },
            { id: 'b9', type: 'glass', x: 450, y: 300, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 240 },
            { id: 'p2', x: 420, y: 450 },
            { id: 'p3', x: 480, y: 450 },
            { id: 'p4', x: 450, y: 380 }
        ],
        background_asset: 'mountains',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 7 }
    },
    {
        id: 7,
        name: 'Complex Structure',
        difficulty: 7,
        birds_available: 7,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'wood', x: 350, y: 500, width: 40, height: 40 },
            { id: 'b2', type: 'wood', x: 400, y: 500, width: 40, height: 40 },
            { id: 'b3', type: 'glass', x: 450, y: 500, width: 40, height: 40 },
            { id: 'b4', type: 'wood', x: 500, y: 500, width: 40, height: 40 },
            { id: 'b5', type: 'wood', x: 550, y: 500, width: 40, height: 40 },
            { id: 'b6', type: 'concrete', x: 375, y: 450, width: 40, height: 40 },
            { id: 'b7', type: 'glass', x: 450, y: 450, width: 40, height: 40 },
            { id: 'b8', type: 'concrete', x: 525, y: 450, width: 40, height: 40 },
            { id: 'b9', type: 'wood', x: 400, y: 400, width: 40, height: 40 },
            { id: 'b10', type: 'glass', x: 500, y: 400, width: 40, height: 40 },
            { id: 'b11', type: 'concrete', x: 450, y: 350, width: 40, height: 40 },
            { id: 'b12', type: 'wood', x: 450, y: 300, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 240 },
            { id: 'p2', x: 350, y: 450 },
            { id: 'p3', x: 550, y: 450 },
            { id: 'p4', x: 400, y: 380 },
            { id: 'p5', x: 500, y: 380 }
        ],
        background_asset: 'mountains',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 7 }
    },
    {
        id: 8,
        name: 'The Challenge',
        difficulty: 8,
        birds_available: 7,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'concrete', x: 380, y: 500, width: 40, height: 40 },
            { id: 'b2', type: 'concrete', x: 430, y: 500, width: 40, height: 40 },
            { id: 'b3', type: 'concrete', x: 480, y: 500, width: 40, height: 40 },
            { id: 'b4', type: 'concrete', x: 530, y: 500, width: 40, height: 40 },
            { id: 'b5', type: 'glass', x: 405, y: 450, width: 40, height: 40 },
            { id: 'b6', type: 'wood', x: 455, y: 450, width: 40, height: 40 },
            { id: 'b7', type: 'glass', x: 505, y: 450, width: 40, height: 40 },
            { id: 'b8', type: 'concrete', x: 430, y: 400, width: 40, height: 40 },
            { id: 'b9', type: 'glass', x: 480, y: 400, width: 40, height: 40 },
            { id: 'b10', type: 'wood', x: 380, y: 350, width: 40, height: 40 },
            { id: 'b11', type: 'glass', x: 530, y: 350, width: 40, height: 40 },
            { id: 'b12', type: 'concrete', x: 455, y: 300, width: 40, height: 40 },
            { id: 'b13', type: 'wood', x: 455, y: 250, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 455, y: 190 },
            { id: 'p2', x: 380, y: 450 },
            { id: 'p3', x: 530, y: 450 },
            { id: 'p4', x: 380, y: 320 },
            { id: 'p5', x: 530, y: 320 },
            { id: 'p6', x: 455, y: 380 }
        ],
        background_asset: 'mountains',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 7 }
    },
    {
        id: 9,
        name: 'Master Test',
        difficulty: 9,
        birds_available: 8,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'concrete', x: 350, y: 520, width: 40, height: 40 },
            { id: 'b2', type: 'concrete', x: 400, y: 520, width: 40, height: 40 },
            { id: 'b3', type: 'concrete', x: 450, y: 520, width: 40, height: 40 },
            { id: 'b4', type: 'concrete', x: 500, y: 520, width: 40, height: 40 },
            { id: 'b5', type: 'concrete', x: 550, y: 520, width: 40, height: 40 },
            { id: 'b6', type: 'glass', x: 375, y: 470, width: 40, height: 40 },
            { id: 'b7', type: 'wood', x: 425, y: 470, width: 40, height: 40 },
            { id: 'b8', type: 'glass', x: 475, y: 470, width: 40, height: 40 },
            { id: 'b9', type: 'wood', x: 525, y: 470, width: 40, height: 40 },
            { id: 'b10', type: 'concrete', x: 400, y: 420, width: 40, height: 40 },
            { id: 'b11', type: 'glass', x: 450, y: 420, width: 40, height: 40 },
            { id: 'b12', type: 'concrete', x: 500, y: 420, width: 40, height: 40 },
            { id: 'b13', type: 'wood', x: 350, y: 370, width: 40, height: 40 },
            { id: 'b14', type: 'glass', x: 550, y: 370, width: 40, height: 40 },
            { id: 'b15', type: 'concrete', x: 450, y: 320, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 450, y: 250 },
            { id: 'p2', x: 350, y: 470 },
            { id: 'p3', x: 550, y: 470 },
            { id: 'p4', x: 380, y: 340 },
            { id: 'p5', x: 520, y: 340 },
            { id: 'p6', x: 450, y: 390 },
            { id: 'p7', x: 450, y: 470 }
        ],
        background_asset: 'desert',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 8 }
    },
    {
        id: 10,
        name: 'Ultimate',
        difficulty: 10,
        birds_available: 8,
        bird_types: ['basic', 'heavy', 'fast'],
        blocks: [
            { id: 'b1', type: 'concrete', x: 320, y: 520, width: 40, height: 40 },
            { id: 'b2', type: 'concrete', x: 370, y: 520, width: 40, height: 40 },
            { id: 'b3', type: 'concrete', x: 420, y: 520, width: 40, height: 40 },
            { id: 'b4', type: 'concrete', x: 470, y: 520, width: 40, height: 40 },
            { id: 'b5', type: 'concrete', x: 520, y: 520, width: 40, height: 40 },
            { id: 'b6', type: 'concrete', x: 570, y: 520, width: 40, height: 40 },
            { id: 'b7', type: 'glass', x: 345, y: 470, width: 40, height: 40 },
            { id: 'b8', type: 'wood', x: 395, y: 470, width: 40, height: 40 },
            { id: 'b9', type: 'glass', x: 445, y: 470, width: 40, height: 40 },
            { id: 'b10', type: 'wood', x: 495, y: 470, width: 40, height: 40 },
            { id: 'b11', type: 'glass', x: 545, y: 470, width: 40, height: 40 },
            { id: 'b12', type: 'concrete', x: 370, y: 420, width: 40, height: 40 },
            { id: 'b13', type: 'glass', x: 420, y: 420, width: 40, height: 40 },
            { id: 'b14', type: 'concrete', x: 470, y: 420, width: 40, height: 40 },
            { id: 'b15', type: 'glass', x: 520, y: 420, width: 40, height: 40 },
            { id: 'b16', type: 'wood', x: 320, y: 370, width: 40, height: 40 },
            { id: 'b17', type: 'concrete', x: 570, y: 370, width: 40, height: 40 },
            { id: 'b18', type: 'glass', x: 445, y: 320, width: 40, height: 40 }
        ],
        pigs: [
            { id: 'p1', x: 445, y: 250 },
            { id: 'p2', x: 320, y: 470 },
            { id: 'p3', x: 570, y: 470 },
            { id: 'p4', x: 345, y: 340 },
            { id: 'p5', x: 545, y: 340 },
            { id: 'p6', x: 370, y: 380 },
            { id: 'p7', x: 520, y: 380 },
            { id: 'p8', x: 445, y: 390 }
        ],
        background_asset: 'desert',
        star_thresholds: { three_stars: 3, two_stars: 5, one_star: 8 }
    }
];

export function getStage(stageNum: number): Stage | undefined {
    return STAGES.find(s => s.id === stageNum);
}
